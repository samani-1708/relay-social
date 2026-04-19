import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { Platform } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** Returns accounts for display — no tokens */
  async getAccounts(userId: string) {
    return this.prisma.platformAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        platformAvatar: true,
        isOrigin: true,
        isTarget: true,
        instanceUrl: true,
        tokenExpiresAt: true,
        lastPolledAt: true,
      },
    });
  }

  /** Returns account with decrypted tokens — for internal use by adapters/poller */
  async getAccountWithTokens(accountId: string) {
    const account = await this.prisma.platformAccount.findUnique({ where: { id: accountId } });
    if (!account) return null;
    return this.decryptAccount(account);
  }

  /** Returns all active origin accounts with decrypted tokens — for poller */
  async getOriginAccountsWithTokens() {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { isOrigin: true, isActive: true },
    });
    return accounts.map((a) => this.decryptAccount(a));
  }

  /** Returns all active target accounts for a user with decrypted tokens — for broadcaster (poller path) */
  async getTargetAccountsWithTokens(userId: string) {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { userId, isTarget: true, isActive: true },
    });
    return accounts.map((a) => this.decryptAccount(a));
  }

  /** Returns ALL active accounts for a user with decrypted tokens — for editor broadcast */
  async getAllActiveAccountsWithTokens(userId: string) {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { userId, isActive: true },
    });
    return accounts.map((a) => this.decryptAccount(a));
  }

  async setOrigin(userId: string, accountId: string) {
    await this.prisma.platformAccount.updateMany({ where: { userId }, data: { isOrigin: false } });
    return this.prisma.platformAccount.update({
      where: { id: accountId },
      data: { isOrigin: true },
    });
  }

  async setTargets(userId: string, accountIds: string[]) {
    await this.prisma.platformAccount.updateMany({ where: { userId }, data: { isTarget: false } });
    if (accountIds.length > 0) {
      await this.prisma.platformAccount.updateMany({
        where: { id: { in: accountIds }, userId },
        data: { isTarget: true },
      });
    }
    return { updated: accountIds.length };
  }

  async disconnect(userId: string, accountId: string) {
    const account = await this.prisma.platformAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Account not found');
    await this.prisma.platformAccount.update({ where: { id: accountId }, data: { isActive: false } });
    return { disconnected: true };
  }

  async upsertAccount(data: {
    userId: string;
    platform: Platform;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    platformUserId: string;
    platformUsername: string;
    platformAvatar?: string;
    instanceUrl?: string;
    metadata?: any;
  }) {
    const encrypted = {
      ...data,
      accessToken: this.encryption.encrypt(data.accessToken),
      refreshToken: data.refreshToken ? this.encryption.encrypt(data.refreshToken) : undefined,
    };

    return this.prisma.platformAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId: data.userId,
          platform: data.platform,
          platformUserId: data.platformUserId,
        },
      },
      create: { ...encrypted, isActive: true, isTarget: true },
      update: {
        accessToken: encrypted.accessToken,
        refreshToken: encrypted.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        platformUsername: data.platformUsername,
        platformAvatar: data.platformAvatar,
        isActive: true,
        metadata: data.metadata,
      },
    });
  }

  async updateTokens(accountId: string, accessToken: string, refreshToken?: string, tokenExpiresAt?: Date) {
    return this.prisma.platformAccount.update({
      where: { id: accountId },
      data: {
        accessToken: this.encryption.encrypt(accessToken),
        refreshToken: refreshToken ? this.encryption.encrypt(refreshToken) : undefined,
        tokenExpiresAt,
      },
    });
  }

  async markInactive(accountId: string) {
    return this.prisma.platformAccount.update({ where: { id: accountId }, data: { isActive: false } });
  }

  private decryptAccount(account: any) {
    return {
      ...account,
      accessToken: this.encryption.decrypt(account.accessToken),
      refreshToken: account.refreshToken ? this.encryption.decrypt(account.refreshToken) : undefined,
    };
  }
}
