import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { BroadcasterService } from './broadcaster.service';
import { QueueService } from '../../common/queues/queue.service';
import { ALL_BROADCAST_QUEUE_NAMES, BROADCAST_CONCURRENCY } from '../../common/queues/queue.constants';

interface BroadcastJobData {
  broadcastJobId: string;
}

@Injectable()
export class BroadcasterWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BroadcasterWorkerService.name);
  private readonly workers: Worker[] = [];

  constructor(
    private readonly broadcaster: BroadcasterService,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    const connection = this.queueService.getConnection();

    for (const queueName of ALL_BROADCAST_QUEUE_NAMES) {
      const concurrency = BROADCAST_CONCURRENCY[queueName] ?? 5;

      const worker = new Worker<BroadcastJobData>(
        queueName,
        async (job: Job<BroadcastJobData>) => {
          await this.broadcaster.executeBroadcastJob(job.data.broadcastJobId, job.attemptsMade);
        },
        { connection: { ...connection }, concurrency },
      );

      worker.on('completed', (job) =>
        this.logger.log(`[${queueName}] job ${job.id} completed`),
      );
      worker.on('failed', (job, err) => {
        const detail = (err as any)?.response?.data
          ? JSON.stringify((err as any).response.data)
          : err.message;
        this.logger.error(`[${queueName}] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${detail}`);
      });

      this.workers.push(worker);
    }

    this.logger.log(`Started ${this.workers.length} broadcast worker(s) across ${ALL_BROADCAST_QUEUE_NAMES.length} platform queues`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    this.logger.log('All broadcast workers closed');
  }
}
