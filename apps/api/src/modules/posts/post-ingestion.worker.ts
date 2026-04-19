import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { Platform } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { QueueService } from '../../common/queues/queue.service';
import { BROADCAST_QUEUE_NAME, QUEUES } from '../../common/queues/queue.constants';
import { adaptContent } from '../broadcaster/adapters/content-adapter';
import { MediaCacheService } from '../../common/media/media-cache.service';

export interface PostIngestionJobData {
  userId: string;
  originContent: string;
  originPlatform: Platform | null;
  originPostId: string | null;
  originMediaUrls: string[];
  source: 'origin' | 'editor';
  priority?: number;
}

@Injectable()
export class PostIngestionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostIngestionWorker.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly queueService: QueueService,
    private readonly mediaCache: MediaCacheService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<PostIngestionJobData>(
      QUEUES.POST_INGESTION,
      (job) => this.process(job),
      { connection: this.queueService.getConnection(), concurrency: 10 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Ingestion job ${job?.id} failed: ${err.message}`),
    );
    this.logger.log('PostIngestionWorker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<PostIngestionJobData>): Promise<void> {
    const { userId, originContent, originPlatform, originPostId, originMediaUrls, source } = job.data;

    // ── Idempotency ───────────────────────────────────────────────────────────
    if (originPostId) {
      const existing = await this.prisma.post.findFirst({ where: { originPostId, userId } });
      if (existing) {
        this.logger.debug(`Skipping duplicate post ${originPostId}`);
        return;
      }

      // Loop prevention: skip if we already sent this post ID from the editor
      const selfPosted = await this.prisma.broadcastJob.findFirst({
        where: { sentPostIds: { has: originPostId }, post: { userId } },
      });
      if (selfPosted) {
        this.logger.debug(`Skipping self-posted content ${originPostId}`);
        return;
      }
    }

    if (originContent.length > 100_000) {
      this.logger.warn(`Post ${originPostId ?? 'editor'} rejected — too long (${originContent.length} chars)`);
      return;
    }

    // ── Skip hashtag ──────────────────────────────────────────────────────────
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const skipHashtag = settings?.skipHashtag ?? '#nosync';
    if (skipHashtag?.trim() && originContent.toLowerCase().includes(skipHashtag.toLowerCase())) {
      this.logger.log(`Post skipped — contains skip hashtag "${skipHashtag}"`);
      return;
    }

    // ── Pre-cache media ───────────────────────────────────────────────────────
    // Download origin media ONCE here, before fan-out.
    // MediaCacheService stores to R2/GCS (if configured) and returns stable URLs.
    // All broadcast workers for this post share the same cached copy — no N×downloads.
    // When no backend is configured, returns the original URLs unchanged.
    const tmpPostId = originPostId ?? `editor-${Date.now()}`;
    const cachedMedia = await this.mediaCache.storeAll(originMediaUrls ?? [], tmpPostId);
    const stableMediaUrls = cachedMedia.map((m) => m.cachedUrl);

    // ── Create Post record ────────────────────────────────────────────────────
    const post = await this.prisma.post.create({
      data: {
        userId,
        originContent,
        originPlatform: originPlatform ?? undefined,
        originPostId:   originPostId ?? undefined,
        originMediaUrls: stableMediaUrls,  // stored with stable/cached URLs
        source:          source ?? 'origin',
        status:          'PENDING',
      },
    });

    // ── Fan out to targets ────────────────────────────────────────────────────
    const targets = await this.accounts.getTargetAccountsWithTokens(userId);
    if (targets.length === 0) {
      await this.prisma.post.update({ where: { id: post.id }, data: { status: 'DONE' } });
      return;
    }

    await this.prisma.post.update({ where: { id: post.id }, data: { status: 'PROCESSING' } });

    for (const target of targets) {
      const chunks = adaptContent(originContent, target.platform);
      const broadcastJob = await this.prisma.broadcastJob.create({
        data: {
          postId:          post.id,
          targetPlatform:  target.platform,
          targetAccountId: target.id,
          adaptedContent:  chunks.map((c) => c.text).join('\n---\n'),
          status:          'QUEUED',
        },
      });

      const queueName = BROADCAST_QUEUE_NAME(target.platform);
      try {
        await this.queueService.get(queueName).add(
          'broadcast',
          { broadcastJobId: broadcastJob.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 10_000 } },
        );
      } catch (queueErr) {
        await this.prisma.broadcastJob.update({
          where: { id: broadcastJob.id },
          data: { status: 'FAILED', errorMessage: 'Queue unavailable: ' + queueErr.message },
        });
        this.logger.error(`Failed to enqueue broadcast job ${broadcastJob.id}: ${queueErr.message}`);
      }
    }

    this.logger.log(`Post ${post.id} ingested (${stableMediaUrls.length} media) → ${targets.length} broadcast job(s) queued`);
  }
}
