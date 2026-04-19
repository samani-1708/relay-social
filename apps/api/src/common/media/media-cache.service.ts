import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, Bucket } from '@google-cloud/storage';
import axios from 'axios';
import { createHash } from 'crypto';

/**
 * MediaCacheService
 *
 * Downloads origin media ONCE at ingestion time and stores it to a durable
 * object store so every BroadcastJob for the same post shares the same copy —
 * no N × downloads, no race against expiring origin URLs.
 *
 * Backends (MEDIA_STORAGE_BACKEND env var):
 *   "none"  — pass-through, original URLs returned unchanged.
 *             Each BroadcastJob re-downloads individually. Fine for dev/low volume.
 *   "gcs"   — Google Cloud Storage.
 *             On Cloud Run: uses Application Default Credentials automatically.
 *             Local dev: set GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
 *
 * GCS env vars:
 *   GCS_BUCKET_NAME        — e.g. "relayman-media-tmp"
 *   GCS_PUBLIC_URL         — optional Cloud CDN / Firebase Hosting URL prefix.
 *                            If omitted, public storage.googleapis.com URL is used.
 *   GCS_KEY_FILE           — optional path to service account JSON (local dev only).
 *                            On Cloud Run leave empty — ADC kicks in automatically.
 *
 * Bucket setup (run once in GCP console or gcloud CLI):
 *   gcloud storage buckets create gs://relayman-media-tmp \
 *     --location=us-central1 \
 *     --uniform-bucket-level-access
 *
 *   # Allow public reads (needed for Instagram / TikTok URL-pull):
 *   gcloud storage buckets add-iam-policy-binding gs://relayman-media-tmp \
 *     --member=allUsers \
 *     --role=roles/storage.objectViewer
 *
 *   # Auto-delete after 2 days (media is only needed during the broadcast window):
 *   gcloud storage buckets update gs://relayman-media-tmp \
 *     --lifecycle-file=lifecycle.json
 *   # lifecycle.json: {"rule":[{"action":{"type":"Delete"},"condition":{"age":2}}]}
 */
export interface CachedMedia {
  originalUrl: string;
  /** Stable URL (GCS CDN or original when backend=none) */
  cachedUrl: string;
  mimeType: string;
  sizeMb: number;
}

@Injectable()
export class MediaCacheService implements OnModuleInit {
  private readonly logger = new Logger(MediaCacheService.name);

  private readonly backend: string;
  private readonly gcsBucketName: string;
  private readonly gcsPublicUrl: string;
  private readonly gcsKeyFile: string | undefined;

  private gcsBucket: Bucket | null = null;

  constructor(private readonly config: ConfigService) {
    this.backend       = config.get('MEDIA_STORAGE_BACKEND', 'none');
    this.gcsBucketName = config.get('GCS_BUCKET_NAME', 'relayman-media-tmp');
    this.gcsPublicUrl  = config.get('GCS_PUBLIC_URL', '');
    this.gcsKeyFile    = config.get<string | undefined>('GCS_KEY_FILE', undefined);
  }

  onModuleInit() {
    if (this.backend === 'gcs') {
      const storageOptions: ConstructorParameters<typeof Storage>[0] = {};
      if (this.gcsKeyFile) {
        storageOptions.keyFilename = this.gcsKeyFile;
      }
      // On Cloud Run, no keyFilename needed — ADC provides credentials automatically.
      const storage = new Storage(storageOptions);
      this.gcsBucket = storage.bucket(this.gcsBucketName);
      this.logger.log(`GCS media cache initialised → gs://${this.gcsBucketName}`);
    } else {
      this.logger.log('Media cache backend: none (each broadcast job re-downloads independently)');
    }
  }

  /**
   * Download all URLs once and return stable cached URLs.
   * Per-item failures are swallowed — partial results returned.
   *
   * When backend = "none", original URLs are returned immediately (no download here).
   */
  async storeAll(urls: string[], postId: string): Promise<CachedMedia[]> {
    if (!urls?.length) return [];

    if (this.backend === 'none') {
      return urls.map((url) => ({
        originalUrl: url,
        cachedUrl:   url,
        mimeType:    '',
        sizeMb:      0,
      }));
    }

    const results = await Promise.allSettled(
      urls.map((url) => this.storeOne(url, postId)),
    );

    const items: CachedMedia[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        items.push(r.value);
      } else {
        this.logger.warn(`Media cache failed for one item: ${(r.reason as Error)?.message}`);
      }
    }
    return items;
  }

  private async storeOne(url: string, postId: string): Promise<CachedMedia> {
    // HLS playlists can't be stored as a single file — pass through unchanged
    if (/\.m3u8(\?|$)/i.test(url)) {
      return { originalUrl: url, cachedUrl: url, mimeType: 'application/vnd.apple.mpegurl', sizeMb: 0 };
    }

    this.logger.debug(`Caching media for post ${postId}: ${url}`);

    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60_000,
      maxContentLength: 500 * 1024 * 1024,
      maxBodyLength:    500 * 1024 * 1024,
    });

    const mimeType = ((res.headers['content-type'] as string | undefined) ?? '')
      .split(';')[0].trim() || 'application/octet-stream';
    const buffer   = Buffer.from(res.data);
    const sizeMb   = buffer.byteLength / (1024 * 1024);

    const ext      = this.extForMime(mimeType);
    const hash     = createHash('sha256').update(url).digest('hex').slice(0, 16);
    const key      = `posts/${postId}/${hash}${ext}`;

    const cachedUrl = await this.uploadToGcs(buffer, key, mimeType);

    this.logger.log(`Cached ${sizeMb.toFixed(2)} MB (${mimeType}) → ${cachedUrl}`);
    return { originalUrl: url, cachedUrl, mimeType, sizeMb };
  }

  private async uploadToGcs(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    if (!this.gcsBucket) {
      throw new Error('GCS bucket not initialised — is MEDIA_STORAGE_BACKEND=gcs?');
    }

    const file = this.gcsBucket.file(key);

    await file.save(buffer, {
      contentType: mimeType,
      // 24 h CDN cache; GCS lifecycle rule handles permanent deletion
      metadata: { cacheControl: 'public, max-age=86400' },
      // With uniform bucket-level access + allUsers objectViewer IAM binding,
      // files are publicly readable without per-object ACLs.
      // If your bucket uses fine-grained ACLs instead, uncomment the line below:
      // public: true,
    });

    // Use Cloud CDN / Firebase Hosting prefix if configured; otherwise use the
    // public storage.googleapis.com URL (requires public bucket IAM as above).
    return this.gcsPublicUrl
      ? `${this.gcsPublicUrl.replace(/\/$/, '')}/${key}`
      : `https://storage.googleapis.com/${this.gcsBucketName}/${key}`;
  }

  private extForMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg':      '.jpg',
      'image/png':       '.png',
      'image/gif':       '.gif',
      'image/webp':      '.webp',
      'image/avif':      '.avif',
      'video/mp4':       '.mp4',
      'video/quicktime': '.mov',
      'video/webm':      '.webm',
    };
    return map[mimeType] ?? '';
  }
}
