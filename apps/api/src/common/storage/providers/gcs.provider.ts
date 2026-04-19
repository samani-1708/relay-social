import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { IStorageProvider } from './storage-provider.interface';

/**
 * Google Cloud Storage provider.
 *
 * Switching from MinIO → GCS requires only env var changes:
 *   STORAGE_PROVIDER=gcs
 *   GCS_BUCKET=relayman-media
 *   GCS_PROJECT_ID=my-gcp-project
 *
 * Authentication (pick one):
 *   - On a GCP Compute Engine / Cloud Run instance: Application Default Credentials (ADC)
 *     are used automatically — no key file needed.
 *   - Locally or on non-GCP hosts: set GCS_KEY_FILE=/path/to/service-account.json
 *
 * The bucket must already exist (create via GCP Console or `gcloud storage buckets create`).
 * Uploaded objects are made publicly readable (uniform bucket-level access must be OFF,
 * or the bucket must have allUsers objectViewer IAM binding).
 */
export class GcsStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(GcsStorageProvider.name);
  private gcs: Storage;
  private bucket: string;
  isReady = false;

  constructor(private readonly config: ConfigService) {}

  async init(): Promise<void> {
    const projectId = this.config.get<string>('GCS_PROJECT_ID');
    const keyFile   = this.config.get<string>('GCS_KEY_FILE');
    this.bucket     = this.config.get<string>('GCS_BUCKET') ?? 'relayman-media';

    if (!projectId) {
      this.logger.warn('GCS provider: missing GCS_PROJECT_ID — skipping.');
      return;
    }

    this.gcs = new Storage({
      projectId,
      ...(keyFile ? { keyFilename: keyFile } : {}),
      // No keyFile → uses Application Default Credentials (ADC).
      // On GCE/Cloud Run this resolves automatically via the metadata server.
    });

    // Verify the bucket is reachable
    try {
      const [exists] = await this.gcs.bucket(this.bucket).exists();
      if (!exists) {
        this.logger.warn(
          `GCS bucket "${this.bucket}" does not exist. ` +
          `Create it first: gcloud storage buckets create gs://${this.bucket}`,
        );
        return;
      }
    } catch (err) {
      this.logger.error(`GCS bucket check failed: ${err.message}`);
      return;
    }

    this.isReady = true;
    this.logger.log(`GCS provider ready — bucket: ${this.bucket}`);
  }

  async upload(buffer: Buffer, mimeType: string, filename?: string): Promise<string> {
    const ext = extFromMime(mimeType, filename);
    const key = `media/${randomUUID()}${ext}`;

    const file = this.gcs.bucket(this.bucket).file(key);

    await file.save(buffer, {
      contentType: mimeType,
      resumable: false,         // resumable adds overhead; fine for files < 5 MB
      // For large video files you may want resumable: true
    });

    // Make the object publicly readable.
    // Requires fine-grained access control on the bucket (not uniform).
    // Alternative: grant allUsers storage.objectViewer at the bucket level.
    try {
      await file.makePublic();
    } catch (err) {
      this.logger.warn(
        `Could not make object public (${key}): ${err.message}. ` +
        'Ensure the bucket has fine-grained access control or grant allUsers objectViewer.',
      );
    }

    return `https://storage.googleapis.com/${this.bucket}/${key}`;
  }
}

function extFromMime(mimeType: string, filename?: string): string {
  if (filename) {
    const ext = path.extname(filename);
    if (ext) return ext;
  }
  const map: Record<string, string> = {
    'image/jpeg':  '.jpg',
    'image/png':   '.png',
    'image/gif':   '.gif',
    'image/webp':  '.webp',
    'video/mp4':   '.mp4',
    'video/webm':  '.webm',
    'video/quicktime': '.mov',
  };
  return map[mimeType] ?? '';
}
