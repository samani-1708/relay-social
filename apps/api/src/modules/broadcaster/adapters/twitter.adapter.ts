import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';

/** Twitter v1.1 upload limits */
const CHUNK_SIZE = 5 * 1024 * 1024;   // 5 MB chunks for video uploads

@Injectable()
export class TwitterAdapter {
  private readonly logger = new Logger(TwitterAdapter.name);

  async post(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const { accessToken } = account;

    const images = media.filter((m) => m.kind === 'image').slice(0, 4);
    const video  = media.find((m) => m.kind === 'short_video');

    const mediaIds: string[] = [];

    // Upload images (base64 — max 5 MB each, fine for photos)
    for (const img of images) {
      if (img.sizeMb > 5) {
        this.logger.warn(`Twitter: image ${img.sizeMb.toFixed(2)} MB > 5 MB, skipping`);
        continue;
      }
      mediaIds.push(await this.uploadImageBase64(accessToken, img));
    }

    // Upload video via chunked INIT/APPEND/FINALIZE (required for >5 MB or video/*)
    if (video && mediaIds.length === 0) {
      const videoMediaId = await this.uploadVideoChunked(accessToken, video);
      mediaIds.push(videoMediaId);
    }

    const sentIds: string[] = [];
    let replyToId: string | null = null;

    for (const chunk of chunks) {
      const body: any = { text: chunk.text };
      if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
      if (mediaIds.length > 0 && chunk.index === 0) {
        body.media = { media_ids: mediaIds };
      }

      const res = await axios.post('https://api.twitter.com/2/tweets', body, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      replyToId = res.data.data.id;
      sentIds.push(res.data.data.id);
    }

    return sentIds;
  }

  /** Base64 upload — suitable for images ≤ 5 MB */
  private async uploadImageBase64(accessToken: string, item: MediaItem): Promise<string> {
    const params = new URLSearchParams();
    params.append('media_data', item.buffer.toString('base64'));
    params.append('media_type', item.mimeType);

    const res = await axios.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      params,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    this.logger.debug(`Twitter image uploaded: ${res.data.media_id_string}`);
    return res.data.media_id_string;
  }

  /**
   * Chunked video upload: INIT → N × APPEND → FINALIZE → poll until ready.
   * Required for video files of any size.
   */
  private async uploadVideoChunked(accessToken: string, item: MediaItem): Promise<string> {
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // ── INIT ──────────────────────────────────────────────────────────────────
    const initParams = new URLSearchParams();
    initParams.append('command', 'INIT');
    initParams.append('total_bytes', String(item.buffer.byteLength));
    initParams.append('media_type', item.mimeType || 'video/mp4');
    initParams.append('media_category', 'tweet_video');

    const initRes = await axios.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      initParams,
      { headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const mediaId = String(initRes.data.media_id_string);
    this.logger.debug(`Twitter video INIT: media_id=${mediaId}, size=${item.sizeMb.toFixed(2)} MB`);

    // ── APPEND ────────────────────────────────────────────────────────────────
    const totalChunks = Math.ceil(item.buffer.byteLength / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const slice = item.buffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);

      const appendForm = new FormData();
      appendForm.append('command', 'APPEND');
      appendForm.append('media_id', mediaId);
      appendForm.append('segment_index', String(i));
      appendForm.append('media', new Blob([new Uint8Array(slice)], { type: item.mimeType }));

      await axios.post('https://upload.twitter.com/1.1/media/upload.json', appendForm, {
        headers: { ...authHeader },
      });
      this.logger.debug(`Twitter video APPEND chunk ${i + 1}/${totalChunks}`);
    }

    // ── FINALIZE ──────────────────────────────────────────────────────────────
    const finalizeParams = new URLSearchParams();
    finalizeParams.append('command', 'FINALIZE');
    finalizeParams.append('media_id', mediaId);

    const finalizeRes = await axios.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      finalizeParams,
      { headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    // ── POLL until processing is complete ─────────────────────────────────────
    await this.pollVideoProcessing(accessToken, mediaId, finalizeRes.data);
    this.logger.log(`Twitter video upload complete: ${mediaId}`);
    return mediaId;
  }

  private async pollVideoProcessing(accessToken: string, mediaId: string, finalizeData: any): Promise<void> {
    let info = finalizeData?.processing_info;
    if (!info) return; // synchronous processing, done immediately

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    while (info.state === 'pending' || info.state === 'in_progress') {
      const waitMs = (info.check_after_secs ?? 5) * 1000;
      this.logger.debug(`Twitter video processing: state=${info.state}, waiting ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));

      const checkRes = await axios.get('https://upload.twitter.com/1.1/media/upload.json', {
        params: { command: 'STATUS', media_id: mediaId },
        headers: authHeader,
      });
      info = checkRes.data.processing_info;
    }

    if (info?.state === 'failed') {
      throw new Error(`Twitter video processing failed: ${JSON.stringify(info.error)}`);
    }
  }
}
