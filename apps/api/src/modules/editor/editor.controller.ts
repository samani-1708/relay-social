import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from '../posts/posts.service';
import { Platform } from '@prisma/client';
import { adaptContent } from '../broadcaster/adapters/content-adapter';

@ApiTags('editor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('editor')
export class EditorController {
  constructor(private readonly posts: PostsService) {}

  /**
   * Preview: returns adapted content per platform without posting.
   */
  @Post('preview')
  preview(@Body() body: { content: string }) {
    const platforms = [
      Platform.TWITTER, Platform.BLUESKY, Platform.THREADS,
      Platform.LINKEDIN, Platform.INSTAGRAM, Platform.FACEBOOK,
      Platform.MASTODON, Platform.YOUTUBE, Platform.TIKTOK,
    ];
    return {
      previews: platforms.map((platform) => ({
        platform,
        chunks: adaptContent(body.content, platform),
      })),
    };
  }

  /**
   * Publish from editor.
   * - Immediate: post is created and broadcast jobs are enqueued right away.
   * - Scheduled: pass scheduledAt (ISO string); broadcast jobs are delayed until that time.
   */
  @Post('publish')
  publish(
    @Request() req,
    @Body()
    body: {
      content: string;
      originPlatform?: Platform;
      mediaUrls?: string[];
      scheduledAt?: string; // ISO 8601 date string
    },
  ) {
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    return this.posts.ingestPost({
      userId: req.user.id,
      originContent: body.content,
      originPlatform: body.originPlatform ?? null,
      originMediaUrls: body.mediaUrls ?? [],
      source: 'editor',
      scheduledAt,
    });
  }
}
