import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Platform } from '@prisma/client';
import { BroadcasterService } from '../broadcaster/broadcaster.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcaster: BroadcasterService,
  ) {}

  async getPosts(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          broadcastJobs: {
            select: {
              id: true,
              targetPlatform: true,
              status: true,
              sentAt: true,
              errorMessage: true,
              sentPostIds: true,
              targetAccount: {
                select: {
                  platformUsername: true,
                  instanceUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.post.count({ where: { userId } }),
    ]);
    return { posts, total, page, pages: Math.ceil(total / limit) };
  }

  async getPostDetail(userId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, userId },
      include: {
        broadcastJobs: {
          select: {
            id: true,
            targetPlatform: true,
            status: true,
            adaptedContent: true,
            sentPostIds: true,
            errorMessage: true,
            retryCount: true,
            sentAt: true,
            createdAt: true,
            updatedAt: true,
            targetAccount: {
              select: {
                platformUsername: true,
                instanceUrl: true,
              },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async getAnalyticsSummary(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      recentPosts30d,
      recentPosts7d,
      broadcastStats,
      platformBreakdown,
    ] = await Promise.all([
      this.prisma.post.count({ where: { userId } }),
      this.prisma.post.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.post.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.broadcastJob.groupBy({
        by: ['status'],
        where: { post: { userId } },
        _count: { status: true },
      }),
      this.prisma.broadcastJob.groupBy({
        by: ['targetPlatform'],
        where: { post: { userId }, status: 'SENT' },
        _count: { targetPlatform: true },
        orderBy: { _count: { targetPlatform: 'desc' } },
      }),
    ]);

    const totalBroadcasts = broadcastStats.reduce((s, r) => s + r._count.status, 0);
    const sentCount = broadcastStats.find((r) => r.status === 'SENT')?._count.status ?? 0;
    const failedCount = broadcastStats.find((r) => r.status === 'FAILED')?._count.status ?? 0;
    const successRate = totalBroadcasts > 0 ? Math.round((sentCount / totalBroadcasts) * 100) : 0;

    return {
      totalPosts,
      recentPosts30d,
      recentPosts7d,
      totalBroadcasts,
      sentCount,
      failedCount,
      successRate,
      platformBreakdown: platformBreakdown.map((r) => ({
        platform: r.targetPlatform,
        count: r._count.targetPlatform,
      })),
    };
  }

  /**
   * Used by the editor (immediate + scheduled posts).
   * Creates the Post record synchronously (so the API can return it),
   * then BroadcasterService.dispatchBroadcast() enqueues the fan-out jobs.
   */
  async ingestPost(data: {
    userId: string;
    originContent: string;
    originPlatform?: Platform | null;
    originPostId?: string;
    originMediaUrls?: string[];
    source?: string;
    scheduledAt?: Date;
  }) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId: data.userId } });
    const skipHashtag = settings?.skipHashtag ?? '#nosync';

    if (data.originContent.length > 100_000) {
      throw new Error('Content too long (max 100,000 characters)');
    }

    // Editor posts have no originPostId, so no dedup check needed here.
    // Loop prevention lives in PostIngestionWorker for the poller path.
    const post = await this.prisma.post.create({
      data: {
        userId: data.userId,
        originContent: data.originContent,
        originPlatform: data.originPlatform ?? undefined,
        originPostId: data.originPostId,
        originMediaUrls: data.originMediaUrls ?? [],
        source: data.source ?? 'origin',
        scheduledAt: data.scheduledAt,
        status: 'PENDING',
      },
    });

    // Dispatch is now async — creates BroadcastJobs and enqueues them.
    // For scheduled posts the queue delay is applied inside dispatchBroadcast.
    await this.broadcaster.dispatchBroadcast(post, skipHashtag, data.scheduledAt);
    return post;
  }
}
