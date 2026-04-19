import { Platform } from '@prisma/client';

export const QUEUES = {
  POST_INGESTION: 'post-ingestion',
  TOKEN_REFRESH: 'token-refresh',
} as const;

export const BROADCAST_QUEUE_NAME = (platform: Platform | string): string =>
  `broadcast-${String(platform).toLowerCase()}`;

export const ALL_BROADCAST_QUEUE_NAMES = [
  'broadcast-twitter',
  'broadcast-bluesky',
  'broadcast-threads',
  'broadcast-linkedin',
  'broadcast-instagram',
  'broadcast-facebook',
  'broadcast-mastodon',
  'broadcast-youtube',
  'broadcast-tiktok',
] as const;

/** Per-platform worker concurrency limits */
export const BROADCAST_CONCURRENCY: Record<string, number> = {
  'broadcast-twitter': 5,
  'broadcast-bluesky': 5,
  'broadcast-threads': 5,
  'broadcast-linkedin': 3,
  'broadcast-instagram': 5,
  'broadcast-facebook': 5,
  'broadcast-mastodon': 5,
  'broadcast-youtube': 1,  // uploads are slow
  'broadcast-tiktok': 3,
};
