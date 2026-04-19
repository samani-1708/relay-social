import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import type { Redis } from 'ioredis';

const TTL_SECONDS = 600; // 10 minutes

@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly useRedis: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis: Redis | null,
  ) {
    this.useRedis = !!redis;
    this.logger.log(this.useRedis ? 'Using Redis for OAuth state' : 'Using DB for OAuth state');
  }

  /** Store state payload, return opaque state token for the OAuth URL */
  async save(platform: string, userId: string, payload: Record<string, any>): Promise<string> {
    const key = crypto.randomBytes(32).toString('hex');

    if (this.useRedis) {
      await this.redis!.set(
        `oauth_state:${key}`,
        JSON.stringify({ userId, payload }),
        'EX',
        TTL_SECONDS,
      );
    } else {
      await this.prisma.oAuthState.create({
        data: {
          key,
          userId,
          platform,
          payload,
          expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
        },
      });
    }

    return key;
  }

  /** Retrieve and validate state. Returns null if expired or not found. */
  async get(stateToken: string): Promise<{ userId: string; payload: Record<string, any> } | null> {
    if (this.useRedis) {
      const raw = await this.redis!.get(`oauth_state:${stateToken}`);
      if (!raw) return null;
      return JSON.parse(raw);
    }

    const record = await this.prisma.oAuthState.findUnique({ where: { key: stateToken } });
    if (!record || record.expiresAt < new Date()) return null;
    return { userId: record.userId, payload: record.payload as Record<string, any> };
  }

  /** Delete after successful use to prevent replay */
  async delete(stateToken: string): Promise<void> {
    if (this.useRedis) {
      await this.redis!.del(`oauth_state:${stateToken}`);
    } else {
      await this.prisma.oAuthState.deleteMany({ where: { key: stateToken } });
    }
  }
}
