import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/modules/redis.module';
import { QueuesModule } from './common/queues/queues.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { PostsModule } from './modules/posts/posts.module';
import { BroadcasterModule } from './modules/broadcaster/broadcaster.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EditorModule } from './modules/editor/editor.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MediaModule } from './common/media/media.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Local dev: load from monorepo root .env; Docker: vars injected via compose
      envFilePath: ['../../.env', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    QueuesModule,
    StorageModule,
    MediaModule,
    AuthModule,
    AccountsModule,
    PostsModule,
    BroadcasterModule,
    NotificationsModule,
    EditorModule,
    SettingsModule,
  ],
})
export class AppModule {}
