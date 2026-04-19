import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageProvider } from './providers/storage-provider.interface';
import { S3StorageProvider } from './providers/s3.provider';
import { GcsStorageProvider } from './providers/gcs.provider';

/**
 * StorageService — provider-agnostic facade.
 *
 * The active backend is selected by the STORAGE_PROVIDER env var:
 *
 *   STORAGE_PROVIDER=s3    MinIO (default) / AWS S3 / Cloudflare R2
 *   STORAGE_PROVIDER=gcs   Google Cloud Storage
 *
 * Switching from MinIO to GCS tomorrow:
 *   1. Set STORAGE_PROVIDER=gcs
 *   2. Set GCS_PROJECT_ID + GCS_BUCKET (+ GCS_KEY_FILE if not on GCE/Cloud Run)
 *   3. Restart — no code changes required.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private provider: IStorageProvider;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const name = (this.config.get<string>('STORAGE_PROVIDER') ?? 's3').toLowerCase();

    if (name === 'gcs') {
      const p = new GcsStorageProvider(this.config);
      await p.init();
      this.provider = p;
    } else {
      // 's3' covers MinIO, AWS S3, Cloudflare R2, etc.
      const p = new S3StorageProvider(this.config);
      await p.init();
      this.provider = p;
    }

    if (!this.provider.isReady) {
      this.logger.warn(
        `Storage provider "${name}" is not ready. ` +
        'Instagram and TikTok media uploads will be skipped.',
      );
    }
  }

  get isEnabled(): boolean {
    return this.provider?.isReady ?? false;
  }

  async upload(buffer: Buffer, mimeType: string, filename?: string): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Storage provider is not configured or not ready.');
    }
    return this.provider.upload(buffer, mimeType, filename);
  }
}
