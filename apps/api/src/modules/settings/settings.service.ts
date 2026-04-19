import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateSettings(userId: string, data: Partial<{
    skipHashtag: string;
    emailNotifications: boolean;
    emailOnFailureOnly: boolean;
    pollingIntervalSecs: number;
    pollingEnabled: boolean;
  }>) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
