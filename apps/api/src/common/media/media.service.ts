import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MediaItem, MediaKind } from './media.types';
import { StorageService } from '../storage/storage.service';

/** Max single file we will buffer in memory — prevents OOM on large videos */
const MAX_DOWNLOAD_MB = 500;
const DOWNLOAD_TIMEOUT_MS = 60_000;

/**
 * URL patterns that hint at the media kind when content-type is ambiguous.
 * Order matters — first match wins.
 */
const URL_KIND_HINTS: Array<{ pattern: RegExp; kind: MediaKind }> = [
  // Bluesky video CDN (GIFs stored as MP4)
  { pattern: /video\.bsky\.app\/watch\//,               kind: 'short_video' },
  // Generic video CDN paths
  { pattern: /\/(video|videos|reel|reels|short|shorts)\//, kind: 'short_video' },
  // HLS playlists — we skip these (can't download as a single file)
  { pattern: /\.m3u8(\?|$)/,                            kind: 'unknown' },
  // Image extensions
  { pattern: /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i,  kind: 'image' },
  // Video extensions
  { pattern: /\.(mp4|mov|webm|avi|m4v|mkv)(\?|$)/i,   kind: 'short_video' },
];

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly storage: StorageService) {}

  /**
   * Download all URLs in parallel.  Per-item failures are swallowed so a
   * single bad URL doesn't abort the whole broadcast.
   */
  async fetchAll(urls: string[]): Promise<MediaItem[]> {
    if (!urls?.length) return [];

    const results = await Promise.allSettled(urls.map((url) => this.fetchOne(url)));

    const items: MediaItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        items.push(r.value);
      } else {
        this.logger.warn(`Media download failed: ${r.reason?.message ?? r.reason}`);
      }
    }
    return items;
  }

  /** Download a single URL.  Skips HLS playlists immediately (not downloadable as one file). */
  async fetchOne(url: string): Promise<MediaItem> {
    // Fast-reject HLS playlists — they can't be downloaded as a single binary
    if (/\.m3u8(\?|$)/i.test(url)) {
      throw new Error(`Skipping HLS playlist (not downloadable as single file): ${url}`);
    }

    this.logger.debug(`Downloading media: ${url}`);

    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT_MS,
      maxContentLength: MAX_DOWNLOAD_MB * 1024 * 1024,
      maxBodyLength:    MAX_DOWNLOAD_MB * 1024 * 1024,
    });

    const rawMime = ((res.headers['content-type'] as string | undefined) ?? '')
      .split(';')[0]
      .trim() || 'application/octet-stream';

    const buffer  = Buffer.from(res.data);
    const sizeMb  = buffer.byteLength / (1024 * 1024);
    const kind    = this.classifyMime(rawMime, url);
    const mimeType = kind === 'short_video' && rawMime === 'application/octet-stream'
      ? 'video/mp4'
      : rawMime;

    this.logger.debug(`Downloaded ${sizeMb.toFixed(2)} MB (${mimeType}) — kind: ${kind} — ${url}`);
    return { originalUrl: url, kind, mimeType, buffer, sizeMb };
  }

  /**
   * Upload all media items to object storage and populate `publicUrl` on each.
   * Items that fail to upload retain their original buffer (adapters that
   * don't need a public URL still work fine).
   */
  async uploadAllForPublicUrl(items: MediaItem[]): Promise<MediaItem[]> {
    if (!this.storage.isEnabled || !items.length) return items;

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const publicUrl = await this.storage.upload(item.buffer, item.mimeType);
        return { ...item, publicUrl };
      }),
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      this.logger.warn(`Storage upload failed for item ${i}: ${r.reason?.message ?? r.reason}`);
      return items[i];
    });
  }

  private classifyMime(mimeType: string, url: string): MediaKind {
    // MIME type is authoritative when specific
    if (mimeType.startsWith('image/'))                         return 'image';
    if (mimeType === 'video/mp4' || mimeType.startsWith('video/')) return 'short_video';

    // Fall back to URL pattern hints
    for (const { pattern, kind } of URL_KIND_HINTS) {
      if (pattern.test(url)) return kind;
    }

    return 'unknown';
  }
}
