import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get('RESEND_API_KEY');
    if (apiKey) this.resend = new Resend(apiKey);
  }

  async sendFailureEmail(user: { email: string; name?: string }, job: any) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: user['id'] ?? job.post?.userId,
        type: 'broadcast_failed',
        title: `Failed to post to ${job.targetPlatform}`,
        message: `Your post could not be broadcast to ${job.targetPlatform}. Error: ${job.errorMessage}`,
        metadata: { jobId: job.id, platform: job.targetPlatform },
      },
    });

    if (!this.resend) {
      this.logger.warn('Resend not configured — email notification skipped');
      return;
    }

    const appName = this.config.get('APP_NAME', 'relayman');
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');

    await this.resend.emails.send({
      from: this.config.get('EMAIL_FROM', `noreply@relayman.io`),
      to: user.email,
      subject: `[${appName}] Failed to post to ${job.targetPlatform}`,
      html: `
        <h2>Post broadcast failed</h2>
        <p>Hi ${user.name ?? 'there'},</p>
        <p>We were unable to broadcast your post to <strong>${job.targetPlatform}</strong>.</p>
        <p><strong>Error:</strong> ${job.errorMessage}</p>
        <p>
          <a href="${appUrl}/dashboard/posts">View post history</a> to retry or check the status.
        </p>
        <p>— The ${appName} team</p>
      `,
    });

    this.logger.log(`Failure email sent to ${user.email} for job ${job.id}`);
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
