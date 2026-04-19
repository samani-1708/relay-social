import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Job, Worker } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuthService } from './oauth.service';
import { AccountsService } from './accounts.service';
import { QueueService } from '../../common/queues/queue.service';
import { QUEUES } from '../../common/queues/queue.constants';
import { Platform } from '@prisma/client';

interface TokenRefreshJobData {
  accountId: string;
}

@Injectable()
export class TokenRefreshService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenRefreshService.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauth: OAuthService,
    private readonly accounts: AccountsService,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<TokenRefreshJobData>(
      QUEUES.TOKEN_REFRESH,
      (job) => this.processRefreshJob(job),
      { connection: this.queueService.getConnection(), concurrency: 5 },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Token refresh job ${job?.id} failed: ${err.message}`),
    );
    this.logger.log('TokenRefreshWorker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  /** Every 30 minutes: find tokens expiring within 1 hour and enqueue a refresh job per account */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshExpiringTokens() {
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    const expiring = await this.prisma.platformAccount.findMany({
      where: { isActive: true, tokenExpiresAt: { lte: soon } },
    });

    if (expiring.length === 0) return;

    this.logger.log(`Enqueueing refresh for ${expiring.length} expiring token(s)`);
    const queue = this.queueService.get(QUEUES.TOKEN_REFRESH);

    for (const account of expiring) {
      await queue.add(
        'refresh',
        { accountId: account.id },
        {
          jobId: `refresh-${account.id}`,  // dedup — won't double-enqueue the same account
          attempts: 2,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );
    }
  }

  /** Worker processor: refresh a single account's token */
  private async processRefreshJob(job: Job<TokenRefreshJobData>) {
    const decrypted = await this.accounts.getAccountWithTokens(job.data.accountId);
    if (!decrypted) return;

    const ok = await this.refreshAccount(decrypted);

    if (!ok) {
      const raw = await this.prisma.platformAccount.findUnique({ where: { id: job.data.accountId } });
      if (!raw) return;

      this.logger.warn(`Failed to refresh token for account ${raw.id} (${raw.platform})`);

      await this.prisma.notification.create({
        data: {
          userId: raw.userId,
          type: 'token_expired',
          title: `${raw.platform} token expired`,
          message: `Your ${raw.platform} account (@${raw.platformUsername}) needs to be reconnected.`,
        },
      });
      await this.accounts.markInactive(raw.id);
    }
  }

  async refreshAccount(account: any): Promise<boolean> {
    switch (account.platform as Platform) {
      case Platform.TWITTER:
        return this.oauth.refreshTwitterToken(account);
      case Platform.LINKEDIN:
        return this.oauth.refreshLinkedInToken(account);
      case Platform.FACEBOOK:
      case Platform.INSTAGRAM:
      case Platform.THREADS:
        return this.oauth.refreshMetaToken(account);
      case Platform.BLUESKY:
        return this.oauth.refreshBlueskyToken(account);
      case Platform.MASTODON:
        return true; // Mastodon tokens don't expire
      case Platform.YOUTUBE:
        return this.oauth.refreshYoutubeToken(account);
      case Platform.TIKTOK:
        return this.oauth.refreshTikTokToken(account);
      default:
        return false;
    }
  }
}
