import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';

@Injectable()
export class MastodonAdapter {
  private readonly logger = new Logger(MastodonAdapter.name);

  async post(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const { accessToken, instanceUrl } = account;
    const base = instanceUrl || 'https://mastodon.social';

    // Upload images (Mastodon supports up to 4 media per status)
    const images = media.filter((m) => m.kind === 'image').slice(0, 4);
    const mediaIds = await Promise.all(images.map((img) => this.uploadMedia(base, accessToken, img)));

    const sentIds: string[] = [];
    let inReplyToId: string | null = null;

    for (const chunk of chunks) {
      const body: any = {
        status: chunk.text,
        in_reply_to_id: inReplyToId,
        visibility: 'public',
      };
      // Attach images only to the first chunk
      if (mediaIds.length > 0 && chunk.index === 0) {
        body.media_ids = mediaIds;
      }

      const res = await axios.post(`${base}/api/v1/statuses`, body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      inReplyToId = res.data.id;
      sentIds.push(res.data.id);
    }

    return sentIds;
  }

  /** Upload a single image to Mastodon's media attachment API. */
  private async uploadMedia(base: string, accessToken: string, item: MediaItem): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(item.buffer)], { type: item.mimeType }), 'media');

    const res = await axios.post(`${base}/api/v1/media`, formData, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    this.logger.debug(`Mastodon media uploaded: ${res.data.id}`);
    return res.data.id as string;
  }
}
