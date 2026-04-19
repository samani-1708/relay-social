import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { OAuthService } from '../accounts/oauth.service';
import { TokenRefreshService } from '../accounts/token-refresh.service';
import { QueueService } from '../../common/queues/queue.service';
import { QUEUES } from '../../common/queues/queue.constants';
import { PostIngestionJobData } from './post-ingestion.worker';
import { Platform } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class PollerService {
  private readonly logger = new Logger(PollerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly oauth: OAuthService,
    private readonly tokenRefresh: TokenRefreshService,
    private readonly queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async pollAllOrigins() {
    const origins = await this.accounts.getOriginAccountsWithTokens();
    for (const account of origins) {
      try {
        // Respect per-user polling settings
        const settings = await this.prisma.userSettings.findUnique({ where: { userId: account.userId } });
        if (settings && !settings.pollingEnabled) {
          this.logger.debug(`Polling disabled for user ${account.userId} — skipping`);
          continue;
        }

        const intervalSecs = settings?.pollingIntervalSecs ?? 60;
        if (account.lastPolledAt) {
          const elapsed = (Date.now() - new Date(account.lastPolledAt).getTime()) / 1000;
          if (elapsed < intervalSecs) {
            this.logger.debug(`Skipping ${account.platform} for user ${account.userId} — polled ${Math.round(elapsed)}s ago (interval: ${intervalSecs}s)`);
            continue;
          }
        }

        await this.pollAccount(account);
      } catch (err) {
        this.logger.error(`Polling failed for ${account.id} (${account.platform}): ${err.message}`);
      }
    }
  }

  private async pollAccount(account: any) {
    try {
      await this.doPoll(account);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        this.logger.warn(`Auth error polling ${account.platform} — attempting token refresh`);
        const refreshed = await this.tokenRefresh.refreshAccount(account);
        if (refreshed) {
          const fresh = await this.accounts.getAccountWithTokens(account.id);
          if (fresh) return this.doPoll(fresh);
        }
      }
      throw err;
    }
  }

  private async doPoll(account: any) {
    switch (account.platform) {
      case Platform.BLUESKY:   return this.pollBluesky(account);
      case Platform.MASTODON:  return this.pollMastodon(account);
      case Platform.TWITTER:   return this.pollTwitter(account);
      case Platform.LINKEDIN:  return this.pollLinkedIn(account);
      case Platform.THREADS:   return this.pollThreads(account);
      case Platform.FACEBOOK:  return this.pollFacebook(account);
      case Platform.INSTAGRAM: return this.pollInstagram(account);
    }
  }

  /** Enqueue a new post for ingestion. Job ID = originPostId for deduplication. */
  private async enqueue(
    account: any,
    text: string,
    platform: Platform,
    postId: string,
    mediaUrls: string[] = [],
  ) {
    const data: PostIngestionJobData = {
      userId: account.userId,
      originContent: text,
      originPlatform: platform,
      originPostId: postId,
      originMediaUrls: mediaUrls,
      source: 'origin',
      priority: 5,
    };
    // BullMQ forbids colons in custom job IDs
    const safeJobId = `origin-${postId.replace(/:/g, '-')}`;
    await this.queueService.get(QUEUES.POST_INGESTION).add('ingest', data, {
      jobId: safeJobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      priority: 5,
    });
  }

  private async bumpLastSeen(accountId: string, postId: string) {
    await this.prisma.platformAccount.update({
      where: { id: accountId },
      data: { lastSeenPostId: postId, lastPolledAt: new Date() },
    });
  }

  private static readonly POLL_TIMEOUT_MS = 15_000;

  private async pollBluesky(account: any) {
    const res = await axios.get('https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed', {
      params: { actor: account.platformUserId, limit: 10 },
      headers: { Authorization: `Bearer ${account.accessToken}` },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const feed: any[] = res.data.feed ?? [];
    const newItems = account.lastSeenPostId
      ? feed.filter((p) => p.post.uri > account.lastSeenPostId)
      : feed.slice(0, 1);

    for (const item of newItems.reverse()) {
      const mediaUrls = this.extractBlueskyMedia(item.post);
      await this.enqueue(account, item.post.record.text, Platform.BLUESKY, item.post.uri, mediaUrls);
    }
    if (feed.length) await this.bumpLastSeen(account.id, feed[0].post.uri);
  }

  private extractBlueskyMedia(post: any): string[] {
    const embed = post.embed;
    if (!embed) return [];

    // Standard images (JPEG/PNG/WebP/GIF that fit the image embed)
    if (embed.$type === 'app.bsky.embed.images#view') {
      return (embed.images ?? [])
        .map((img: any) => img.fullsize ?? img.thumb)
        .filter(Boolean);
    }

    // Video / animated GIF
    // Bluesky converts GIFs to MP4 internally and stores them as video embeds.
    // The `playlist` field is an HLS m3u8 URL which cannot be downloaded as a
    // single file. We use the `thumbnail` still-frame as a fallback image, and
    // also attempt to build the direct MP4 CDN URL from the post CID.
    if (embed.$type === 'app.bsky.embed.video#view') {
      const urls: string[] = [];
      // Direct MP4 URL: Bluesky CDN pattern is:
      //   https://video.bsky.app/watch/{did}/{cid}/video.mp4
      const did = post.author?.did;
      const cid = embed.cid;
      if (did && cid) {
        urls.push(`https://video.bsky.app/watch/${did}/${cid}/video.mp4`);
      }
      // Thumbnail as still-image fallback (always add for cross-posting as image)
      if (embed.thumbnail) {
        urls.push(embed.thumbnail);
      }
      return urls;
    }

    // Record + embed wrappers (quote posts, external links with preview images)
    if (embed.$type === 'app.bsky.embed.recordWithMedia#view') {
      return this.extractBlueskyMedia({ ...post, embed: embed.media });
    }

    return [];
  }

  private async pollMastodon(account: any) {
    const base = account.instanceUrl || 'https://mastodon.social';
    const params: any = { limit: 10 };
    if (account.lastSeenPostId) params.since_id = account.lastSeenPostId;

    const res = await axios.get(`${base}/api/v1/accounts/${account.platformUserId}/statuses`, {
      params,
      headers: { Authorization: `Bearer ${account.accessToken}` },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const statuses: any[] = res.data ?? [];
    for (const s of statuses.reverse()) {
      if (s.reblog) continue;
      const text = s.text || s.content.replace(/<[^>]+>/g, '');
      const mediaUrls: string[] = (s.media_attachments ?? [])
        .map((m: any) => m.url)
        .filter(Boolean);
      await this.enqueue(account, text, Platform.MASTODON, s.id, mediaUrls);
    }
    if (statuses.length) await this.bumpLastSeen(account.id, statuses[0].id);
  }

  private async pollTwitter(account: any) {
    const params: any = {
      max_results: 10,
      'tweet.fields': 'text,created_at,attachments',
      'media.fields': 'url,preview_image_url',
      expansions: 'attachments.media_keys',
    };
    if (account.lastSeenPostId) params.since_id = account.lastSeenPostId;

    const res = await axios.get(`https://api.twitter.com/2/users/${account.platformUserId}/tweets`, {
      params,
      headers: { Authorization: `Bearer ${account.accessToken}` },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const tweets: any[] = res.data?.data ?? [];
    const mediaMap: Record<string, string> = {};
    for (const m of res.data?.includes?.media ?? []) {
      if (m.url) mediaMap[m.media_key] = m.url;
    }

    for (const t of tweets.reverse()) {
      const mediaUrls = (t.attachments?.media_keys ?? [])
        .map((key: string) => mediaMap[key])
        .filter(Boolean);
      await this.enqueue(account, t.text, Platform.TWITTER, t.id, mediaUrls);
    }
    if (tweets.length) await this.bumpLastSeen(account.id, tweets[0].id);
  }

  private async pollLinkedIn(account: any) {
    const res = await axios.get('https://api.linkedin.com/v2/ugcPosts', {
      params: { q: 'authors', authors: `List(urn:li:person:${account.platformUserId})`, count: 10 },
      headers: { Authorization: `Bearer ${account.accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const posts: any[] = res.data?.elements ?? [];
    const newPosts = account.lastSeenPostId
      ? posts.filter((p) => p.id > account.lastSeenPostId)
      : posts.slice(0, 1);
    for (const p of newPosts.reverse()) {
      const text = p?.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text ?? '';
      if (text) await this.enqueue(account, text, Platform.LINKEDIN, p.id);
    }
    if (posts.length) await this.bumpLastSeen(account.id, posts[0].id);
  }

  private async pollThreads(account: any) {
    const res = await axios.get(`https://graph.threads.net/v1.0/${account.platformUserId}/threads`, {
      params: { fields: 'id,text,timestamp,media_url,media_type', access_token: account.accessToken },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const posts: any[] = res.data?.data ?? [];
    const newPosts = account.lastSeenPostId
      ? posts.filter((p) => p.id > account.lastSeenPostId)
      : posts.slice(0, 1);
    for (const p of newPosts.reverse()) {
      if (p.text) {
        const mediaUrls = p.media_url ? [p.media_url] : [];
        await this.enqueue(account, p.text, Platform.THREADS, p.id, mediaUrls);
      }
    }
    if (posts.length) await this.bumpLastSeen(account.id, posts[0].id);
  }

  private async pollFacebook(account: any) {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${account.platformUserId}/feed`, {
      params: { fields: 'id,message,created_time,attachments', access_token: account.accessToken, limit: 10 },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const posts: any[] = res.data?.data ?? [];
    const newPosts = account.lastSeenPostId
      ? posts.filter((p) => p.id > account.lastSeenPostId)
      : posts.slice(0, 1);
    for (const p of newPosts.reverse()) {
      if (p.message) {
        const mediaUrls: string[] = [];
        for (const att of p.attachments?.data ?? []) {
          const url = att.media?.image?.src;
          if (url) mediaUrls.push(url);
        }
        await this.enqueue(account, p.message, Platform.FACEBOOK, p.id, mediaUrls);
      }
    }
    if (posts.length) await this.bumpLastSeen(account.id, posts[0].id);
  }

  private async pollInstagram(account: any) {
    const res = await axios.get(`https://graph.facebook.com/v19.0/${account.platformUserId}/media`, {
      params: { fields: 'id,caption,timestamp,media_url,media_type', access_token: account.accessToken, limit: 10 },
      timeout: PollerService.POLL_TIMEOUT_MS,
    });
    const media: any[] = res.data?.data ?? [];
    const newMedia = account.lastSeenPostId
      ? media.filter((m) => m.id > account.lastSeenPostId)
      : media.slice(0, 1);
    for (const m of newMedia.reverse()) {
      if (m.caption) {
        const mediaUrls = m.media_url ? [m.media_url] : [];
        await this.enqueue(account, m.caption, Platform.INSTAGRAM, m.id, mediaUrls);
      }
    }
    if (media.length) await this.bumpLastSeen(account.id, media[0].id);
  }
}
