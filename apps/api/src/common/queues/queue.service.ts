import { Global, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { ALL_BROADCAST_QUEUE_NAMES, QUEUES } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly connectionOpts: { url: string };

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.connectionOpts = { url };

    const allNames = [
      QUEUES.POST_INGESTION,
      QUEUES.TOKEN_REFRESH,
      ...ALL_BROADCAST_QUEUE_NAMES,
    ];

    for (const name of allNames) {
      this.queues.set(name, new Queue(name, { connection: { ...this.connectionOpts } }));
    }

    this.logger.log(`Initialized ${allNames.length} BullMQ queue(s)`);
  }

  /** Get a queue by name — throws if the name is unknown */
  get(name: string): Queue {
    const q = this.queues.get(name);
    if (!q) throw new Error(`Queue "${name}" is not registered`);
    return q;
  }

  /** Connection options to pass to new Worker instances */
  getConnection() {
    return { ...this.connectionOpts };
  }

  async onModuleDestroy() {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.logger.log('All queues closed');
  }
}
