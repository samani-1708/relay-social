import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';

/** Bluesky image blob size limit per their lexicon */
const BSKY_IMAGE_LIMIT_MB = 1;
/** Max images per post */
const BSKY_MAX_IMAGES = 4;

@Injectable()
export class BlueskyAdapter {
  private readonly logger = new Logger(BlueskyAdapter.name);

  async post(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const token = account.accessToken;
    const did   = account.platformUserId;

    // Separate images from videos.
    // Images that exceed the 1 MB limit are skipped with a warning.
    const images = media
      .filter((m) => m.kind === 'image')
      .filter((m) => {
        if (m.sizeMb > BSKY_IMAGE_LIMIT_MB) {
          this.logger.warn(
            `Bluesky: image ${m.originalUrl} is ${m.sizeMb.toFixed(2)} MB — exceeds 1 MB limit, skipping`,
          );
          return false;
        }
        return true;
      })
      .slice(0, BSKY_MAX_IMAGES);

    const videos = media
      .filter((m) => m.kind === 'short_video')
      .slice(0, 1); // Bluesky supports 1 video per post

    // Upload blobs
    const imageBlobRefs = await Promise.all(images.map((img) => this.uploadBlob(token, img)));
    const videoBlobRef  = videos.length ? await this.uploadVideoBlob(token, videos[0]) : null;

    const sentUris: string[] = [];
    let parentRef: { uri: string; cid: string } | null = null;
    let rootRef:   { uri: string; cid: string } | null = null;

    for (const chunk of chunks) {
      const record: any = {
        $type:     'app.bsky.feed.post',
        text:      chunk.text,
        createdAt: new Date().toISOString(),
        langs:     ['en'],
      };

      if (chunk.isThread && parentRef) {
        record.reply = { root: rootRef ?? parentRef, parent: parentRef };
      }

      // Attach media to the first chunk only
      if (chunk.index === 0) {
        if (imageBlobRefs.length > 0) {
          record.embed = {
            $type:  'app.bsky.embed.images',
            images: imageBlobRefs.map((ref) => ({ image: ref, alt: '' })),
          };
        } else if (videoBlobRef) {
          record.embed = {
            $type:  'app.bsky.embed.video',
            video:  videoBlobRef,
          };
        }
      }

      const res = await axios.post(
        'https://bsky.social/xrpc/com.atproto.repo.createRecord',
        { repo: did, collection: 'app.bsky.feed.post', record },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const ref = { uri: res.data.uri, cid: res.data.cid };
      if (!rootRef) rootRef = ref;
      parentRef = ref;
      sentUris.push(res.data.uri);
    }

    return sentUris;
  }

  private async uploadBlob(token: string, item: MediaItem): Promise<object> {
    const res = await axios.post(
      'https://bsky.social/xrpc/com.atproto.repo.uploadBlob',
      item.buffer,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': item.mimeType } },
    );
    this.logger.debug(`Bluesky image blob uploaded`);
    return res.data.blob;
  }

  private async uploadVideoBlob(token: string, item: MediaItem): Promise<object> {
    // Bluesky video upload uses the same blob endpoint
    const res = await axios.post(
      'https://bsky.social/xrpc/com.atproto.repo.uploadBlob',
      item.buffer,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': item.mimeType || 'video/mp4' } },
    );
    this.logger.debug(`Bluesky video blob uploaded (${item.sizeMb.toFixed(2)} MB)`);
    return res.data.blob;
  }
}
