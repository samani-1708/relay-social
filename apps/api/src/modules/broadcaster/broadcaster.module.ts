import { Module } from '@nestjs/common';
import { BroadcasterService } from './broadcaster.service';
import { BroadcasterWorkerService } from './broadcaster-worker.service';
import { BlueskyAdapter } from './adapters/bluesky.adapter';
import { MastodonAdapter } from './adapters/mastodon.adapter';
import { TwitterAdapter } from './adapters/twitter.adapter';
import { LinkedinAdapter } from './adapters/linkedin.adapter';
import { MetaAdapter } from './adapters/meta.adapter';
import { YoutubeAdapter } from './adapters/youtube.adapter';
import { TiktokAdapter } from './adapters/tiktok.adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountsModule } from '../accounts/accounts.module';
import { MediaModule } from '../../common/media/media.module';

// QueueService is global (provided by QueuesModule in AppModule) — no need to import here.

@Module({
  imports: [NotificationsModule, AccountsModule, MediaModule],
  providers: [
    BroadcasterService,
    BroadcasterWorkerService,
    BlueskyAdapter,
    MastodonAdapter,
    TwitterAdapter,
    LinkedinAdapter,
    MetaAdapter,
    YoutubeAdapter,
    TiktokAdapter,
  ],
  exports: [BroadcasterService],
})
export class BroadcasterModule {}
