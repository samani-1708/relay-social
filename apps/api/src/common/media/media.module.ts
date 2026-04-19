import { Module, Global } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaCacheService } from './media-cache.service';

@Global()
@Module({
  providers: [MediaService, MediaCacheService],
  exports: [MediaService, MediaCacheService],
})
export class MediaModule {}
