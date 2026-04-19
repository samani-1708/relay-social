import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PollerService } from './poller.service';
import { PostIngestionWorker } from './post-ingestion.worker';
import { BroadcasterModule } from '../broadcaster/broadcaster.module';
import { AccountsModule } from '../accounts/accounts.module';
// OAuthService is exported from AccountsModule — no extra import needed

@Module({
  imports: [BroadcasterModule, AccountsModule],
  controllers: [PostsController],
  providers: [PostsService, PollerService, PostIngestionWorker],
  exports: [PostsService],
})
export class PostsModule {}
