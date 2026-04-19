import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AdaptedChunk } from './content-adapter';
import { MediaItem } from '../../../common/media/media.types';
import { Platform } from '@prisma/client';

const GRAPH = 'https://graph.facebook.com/v19.0';
const THREADS_GRAPH = 'https://graph.threads.net/v1.0';

@Injectable()
export class MetaAdapter {
  private readonly logger = new Logger(MetaAdapter.name);

  async post(
    account: any,
    chunks: AdaptedChunk[],
    media: MediaItem[],
    platform: Platform,
  ): Promise<string[]> {
    switch (platform) {
      case Platform.THREADS:   return this.postThreads(account, chunks, media);
      case Platform.INSTAGRAM: return this.postInstagram(account, chunks, media);
      case Platform.FACEBOOK:  return this.postFacebook(account, chunks, media);
    }
    return [];
  }

  // ── Threads ────────────────────────────────────────────────────────────────

  private async postThreads(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const { accessToken, platformUserId } = account;
    const sentIds: string[] = [];
    let replyToId: string | null = null;

    // Threads supports one image per container (use first image only for now)
    const firstImage = media.find((m) => m.kind === 'image');

    for (const chunk of chunks) {
      const params: any = {
        text: chunk.text,
        reply_to_id: replyToId || undefined,
        access_token: accessToken,
      };

      // Attach image to the first chunk only
      if (firstImage && chunk.index === 0) {
        params.media_type = 'IMAGE';
        // Threads requires a public image URL — use originalUrl as-is (works if origin URL is still valid)
        params.image_url = firstImage.originalUrl;
      } else {
        params.media_type = 'TEXT';
      }

      // Step 1: create container
      const containerRes = await axios.post(
        `${THREADS_GRAPH}/${platformUserId}/threads`,
        null,
        { params },
      );
      const creationId = containerRes.data.id;

      // Step 2: publish
      const publishRes = await axios.post(
        `${THREADS_GRAPH}/${platformUserId}/threads_publish`,
        null,
        { params: { creation_id: creationId, access_token: accessToken } },
      );
      replyToId = publishRes.data.id;
      sentIds.push(publishRes.data.id);
    }
    return sentIds;
  }

  // ── Instagram ──────────────────────────────────────────────────────────────

  private async postInstagram(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const { accessToken, platformUserId } = account;
    const caption = chunks[0].text;

    const image = media.find((m) => m.kind === 'image');
    const video = media.find((m) => m.kind === 'short_video');

    if (!image && !video) {
      // Instagram requires media — text-only posts are not supported.
      // To enable Instagram image broadcasting, configure MEDIA_CDN_URL so
      // origin images can be served as publicly accessible URLs.
      this.logger.warn(
        'Instagram post skipped: requires image or video. ' +
        'Text-only posts are not supported by the Instagram API.',
      );
      return [];
    }

    // Instagram requires a public URL (it fetches the media itself).
    // Prefer publicUrl (uploaded to MinIO/object storage) so short-lived origin
    // URLs (e.g. Twitter) still work. Falls back to originalUrl for long-lived CDNs.
    const mediaUrl = (image?.publicUrl ?? image?.originalUrl) ?? (video?.publicUrl ?? video?.originalUrl);
    const mediaType = video ? 'REELS' : 'IMAGE';

    const params: any = {
      caption,
      media_type: mediaType,
      access_token: accessToken,
    };
    if (video) {
      params.video_url = mediaUrl;
    } else {
      params.image_url = mediaUrl;
    }

    // Step 1: create container
    const containerRes = await axios.post(
      `${GRAPH}/${platformUserId}/media`,
      null,
      { params },
    );

    // Step 2: publish
    const publishRes = await axios.post(
      `${GRAPH}/${platformUserId}/media_publish`,
      null,
      { params: { creation_id: containerRes.data.id, access_token: accessToken } },
    );
    return [publishRes.data.id];
  }

  // ── Facebook ───────────────────────────────────────────────────────────────

  private async postFacebook(account: any, chunks: AdaptedChunk[], media: MediaItem[]): Promise<string[]> {
    const { accessToken, platformUserId } = account;
    const message = chunks[0].text;

    const images = media.filter((m) => m.kind === 'image').slice(0, 10);

    if (images.length > 0) {
      return this.postFacebookWithImages(accessToken, platformUserId, message, images);
    }

    const res = await axios.post(
      `${GRAPH}/${platformUserId}/feed`,
      { message, access_token: accessToken },
    );
    return [res.data.id];
  }

  private async postFacebookWithImages(
    accessToken: string,
    platformUserId: string,
    message: string,
    images: MediaItem[],
  ): Promise<string[]> {
    // Upload each photo as an unpublished attachment first
    const photoIds = await Promise.all(
      images.map(async (img) => {
        const formData = new FormData();
        formData.append('source', new Blob([new Uint8Array(img.buffer)], { type: img.mimeType }), 'photo');
        formData.append('published', 'false');
        formData.append('access_token', accessToken);

        const res = await axios.post(`${GRAPH}/${platformUserId}/photos`, formData);
        return res.data.id as string;
      }),
    );

    // Create the feed post with attached photos
    const res = await axios.post(`${GRAPH}/${platformUserId}/feed`, {
      message,
      attached_media: photoIds.map((id) => ({ media_fbid: id })),
      access_token: accessToken,
    });
    return [res.data.id];
  }
}
