import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { IStorageProvider } from './storage-provider.interface';

/**
 * S3-compatible storage provider.
 *
 * Works with:
 *   - MinIO (self-hosted, monolith)       STORAGE_ENDPOINT=http://minio:9000
 *   - AWS S3                              STORAGE_ENDPOINT omitted (defaults to AWS)
 *   - Cloudflare R2                       STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
 *   - Any other S3-compatible backend
 *
 * Required env vars:
 *   STORAGE_ACCESS_KEY
 *   STORAGE_SECRET_KEY
 *   STORAGE_BUCKET            (default: relayman-media)
 *
 * Optional env vars:
 *   STORAGE_ENDPOINT          omit for real AWS S3
 *   STORAGE_REGION            default: us-east-1
 *   STORAGE_PUBLIC_BASE_URL   default: derived from endpoint + bucket
 */
export class S3StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;
  isReady = false;

  constructor(private readonly config: ConfigService) {}

  async init(): Promise<void> {
    const endpoint  = this.config.get<string>('STORAGE_ENDPOINT');
    const accessKey = this.config.get<string>('STORAGE_ACCESS_KEY');
    const secretKey = this.config.get<string>('STORAGE_SECRET_KEY');
    const region    = this.config.get<string>('STORAGE_REGION') ?? 'us-east-1';
    this.bucket     = this.config.get<string>('STORAGE_BUCKET') ?? 'relayman-media';
    this.publicBaseUrl = this.config.get<string>('STORAGE_PUBLIC_BASE_URL') ?? '';

    if (!accessKey || !secretKey) {
      this.logger.warn('S3 provider: missing STORAGE_ACCESS_KEY or STORAGE_SECRET_KEY — skipping.');
      return;
    }

    this.client = new S3Client({
      ...(endpoint ? { endpoint } : {}),
      region,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: !!endpoint, // required for MinIO; harmless for AWS
    });

    if (!this.publicBaseUrl) {
      this.publicBaseUrl = endpoint
        ? `${endpoint}/${this.bucket}`
        : `https://${this.bucket}.s3.${region}.amazonaws.com`;
    }

    await this.ensureBucket();
    this.isReady = true;
    this.logger.log(`S3 provider ready — bucket: ${this.bucket} | public: ${this.publicBaseUrl}`);
  }

  async upload(buffer: Buffer, mimeType: string, filename?: string): Promise<string> {
    const ext = extFromMime(mimeType, filename);
    const key = `media/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return `${this.publicBaseUrl}/${key}`;
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket: ${this.bucket}`);
    }

    // Public-read policy (MinIO + generic S3). GCS handles ACLs differently.
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    });
    try {
      await this.client.send(
        new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: policy }),
      );
    } catch (err) {
      // Non-fatal: some S3-compatible backends don't support bucket policies.
      this.logger.warn(`Could not set bucket public policy: ${err.message}`);
    }
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
