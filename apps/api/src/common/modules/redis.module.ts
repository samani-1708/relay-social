import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;
        const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
        client.on('error', () => {}); // swallow connection errors silently
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
