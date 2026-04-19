import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BroadcastStatus, Platform, Post } from '@prisma/client';
import { adaptContent } from './adapters/content-adapter';
import { BlueskyAdapter } from './adapters/bluesky.adapter';
import { MastodonAdapter } from './adapters/mastodon.adapter';
import { TwitterAdapter } from './adapters/twitter.adapter';
import { LinkedinAdapter } from './adapters/linkedin.adapter';
import { MetaAdapter } from './adapters/meta.adapter';
import { YoutubeAdapter } from './adapters/youtube.adapter';
import { TiktokAdapter } from './adapters/tiktok.adapter';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../../common/queues/queue.service';
import { BROADCAST_QUEUE_NAME } from '../../common/queues/queue.constants';
import { MediaService } from '../../common/media/media.service';
import { MediaItem } from '../../common/media/media.types';

@Injectable()
export class BroadcasterService {
  private readonly logger = new Logger(BroadcasterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly bluesky: BlueskyAdapter,
    private readonly mastodon: MastodonAdapter,
    private readonly twitter: TwitterAdapter,
    private readonly linkedin: LinkedinAdapter,
    private readonly meta: MetaAdapter,
    private readonly youtube: YoutubeAdapter,
    private readonly tiktok: TiktokAdapter,
    private readonly notifications: NotificationsService,
    private readonly queueService: QueueService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Fan out a post to all active target accounts.
   * Creates one BroadcastJob per platform and enqueues each to its dedicated queue.
   * Pass scheduledAt to delay the broadcast jobs until that time.
   */
  async dispatchBroadcast(post: Post, skipHashtag: string, scheduledAt?: Date) {
    if (this.shouldSkip(post.originContent, skipHashtag)) {
      this.logger.log(`Post ${post.id} has skip hashtag — skipping broadcast`);
      await this.prisma.post.update({ where: { id: post.id }, data: { status: 'DONE' } });
      return;
    }

    // Editor posts go to ALL connected platforms — the user explicitly chose to broadcast.
    // Poller-originated posts respect the origin/target distinction.
    const targets = post.source === 'editor'
      ? await this.accountsService.getAllActiveAccountsWithTokens(post.userId)
      : await this.accountsService.getTargetAccountsWithTokens(post.userId);
    if (targets.length === 0) {
      await this.prisma.post.update({ where: { id: post.id }, data: { status: 'DONE' } });
      return;
    }

    await this.prisma.post.update({ where: { id: post.id }, data: { status: 'PROCESSING' } });

    for (const target of targets) {
      const chunks = adaptContent(post.originContent, target.platform);
      const job = await this.prisma.broadcastJob.create({
        data: {
          postId: post.id,
          targetPlatform: target.platform,
          targetAccountId: target.id,
          adaptedContent: chunks.map((c) => c.text).join('\n---\n'),
          status: BroadcastStatus.QUEUED,
        },
      });

      const queueName = BROADCAST_QUEUE_NAME(target.platform);
      const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;
      try {
        await this.queueService.get(queueName).add(
          'broadcast',
          { broadcastJobId: job.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 10_000 }, delay },
        );
        this.logger.log(
          `BroadcastJob ${job.id} enqueued to ${queueName}${delay > 0 ? ` (delayed ${Math.round(delay / 1000)}s)` : ''}`,
        );
      } catch (queueErr) {
        await this.prisma.broadcastJob.update({
          where: { id: job.id },
          data: { status: BroadcastStatus.FAILED, errorMessage: 'Queue unavailable: ' + queueErr.message },
        });
        this.logger.error(`Failed to enqueue broadcast job ${job.id}: ${queueErr.message}`);
      }
    }
  }

  /**
   * Execute a single BroadcastJob. Called by BroadcasterWorkerService.
   * BullMQ handles retries — this method throws on failure so BullMQ can retry.
   */
  async executeBroadcastJob(jobId: string, attemptsMade = 1) {
    const job = await this.prisma.broadcastJob.findUnique({
      where: { id: jobId },
      include: {
        post: { include: { user: { include: { settings: true } } } },
      },
    });
    if (!job) return;

    const account = await this.accountsService.getAccountWithTokens(job.targetAccountId);
    if (!account) {
      await this.prisma.broadcastJob.update({
        where: { id: jobId },
        data: { status: BroadcastStatus.FAILED, errorMessage: 'Account not found or inactive' },
      });
      await this.updatePostStatus(job.postId);
      return;
    }

    const chunks = adaptContent(job.post.originContent, job.targetPlatform);

    // Download origin media (best-effort — failures per-item are swallowed inside fetchAll)
    let media: MediaItem[] = [];
    if (job.post.originMediaUrls?.length > 0) {
      media = await this.mediaService.fetchAll(job.post.originMediaUrls);
      if (media.length < job.post.originMediaUrls.length) {
        this.logger.warn(
          `${job.post.originMediaUrls.length - media.length} media item(s) failed to download for job ${jobId}`,
        );
      }
    }

    // URL-pull platforms (Instagram, TikTok) need a publicly accessible URL.
    // Upload to object storage so we can serve a stable URL regardless of origin.
    const urlPullPlatforms: Platform[] = [Platform.INSTAGRAM, Platform.TIKTOK];
    if (media.length > 0 && urlPullPlatforms.includes(job.targetPlatform)) {
      media = await this.mediaService.uploadAllForPublicUrl(media);
    }

    try {
      const sentIds = await this.sendToAdapter(job.targetPlatform, account, chunks, media);
      await this.prisma.broadcastJob.update({
        where: { id: jobId },
        data: { status: BroadcastStatus.SENT, sentPostIds: sentIds, sentAt: new Date() },
      });
      await this.updatePostStatus(job.postId);
    } catch (err) {
      const finalFailure = attemptsMade >= 3;
      const safeError = String(err.message ?? 'Unknown error').slice(0, 500);

      await this.prisma.broadcastJob.update({
        where: { id: jobId },
        data: {
          errorMessage: safeError,
          retryCount: attemptsMade,
          status: finalFailure ? BroadcastStatus.FAILED : BroadcastStatus.QUEUED,
        },
      });

      if (finalFailure) {
        await this.updatePostStatus(job.postId);
        if (job.post.user.settings?.emailNotifications) {
          await this.notifications.sendFailureEmail(job.post.user, { ...job, errorMessage: safeError });
        }
      }

      throw err;
    }
  }

  /** Dispatches to the correct platform adapter with downloaded media. */
  async sendToAdapter(
    platform: Platform,
    account: any,
    chunks: any[],
    media: MediaItem[],
  ): Promise<string[]> {
    switch (platform) {
      case Platform.BLUESKY:   return this.bluesky.post(account, chunks, media);
      case Platform.MASTODON:  return this.mastodon.post(account, chunks, media);
      case Platform.TWITTER:   return this.twitter.post(account, chunks, media);
      case Platform.LINKEDIN:  return this.linkedin.post(account, chunks, media);
      case Platform.FACEBOOK:
      case Platform.INSTAGRAM:
      case Platform.THREADS:   return this.meta.post(account, chunks, media, platform);
      case Platform.YOUTUBE:   return this.youtube.post(account, chunks, media);
      case Platform.TIKTOK:    return this.tiktok.post(account, chunks, media);
      default: throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private shouldSkip(content: string, skipHashtag: string): boolean {
    if (!skipHashtag?.trim()) return false;
    return content.toLowerCase().includes(skipHashtag.toLowerCase());
  }

  private async updatePostStatus(postId: string) {
    const jobs = await this.prisma.broadcastJob.findMany({ where: { postId } });
    const allDone = jobs.every(
      (j) => j.status === BroadcastStatus.SENT || j.status === BroadcastStatus.SKIPPED,
    );
    const anyFailed = jobs.some((j) => j.status === BroadcastStatus.FAILED);
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: allDone ? 'DONE' : anyFailed ? 'FAILED' : 'PROCESSING',
        processedAt: allDone || anyFailed ? new Date() : undefined,
      },
    });
  }
}
