/**
 * @relayman/platform-matrix
 *
 * Single source of truth for every platform's capabilities.
 * Shared between the NestJS API (content adaptation, media routing)
 * and the Next.js web app (compatibility matrix UI, settings display).
 *
 * Platform IDs match the Prisma `Platform` enum exactly (UPPER_CASE).
 * Slugs are the lowercase, URL-safe identifiers used in the frontend.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentTypeId =
  | 'text'
  | 'long_text'
  | 'images'
  | 'short_video'
  | 'long_video'
  | 'threads'
  | 'reposts'
  | 'quote_posts'
  | 'auto_split';

export interface ContentTypeDef {
  id: ContentTypeId;
  label: string;
  description: string;
}

export interface MediaSpec {
  supported: boolean;
  /** Max number of attachments per post */
  maxCount?: number;
  /** Max video duration in seconds */
  maxDurationSecs?: number;
  /** Max file size in MB */
  maxSizeMb?: number;
}

export interface PlatformDef {
  /** Matches Prisma Platform enum key (e.g. "TWITTER") */
  id: string;
  /** URL-safe slug for frontend routing / display (e.g. "x") */
  slug: string;
  /** Human-readable display name */
  name: string;
  /** Character limit per post (0 = unlimited) */
  charLimit: number;
  /** Whether threading / reply-chains are supported as target */
  supportsThreads: boolean;
  media: {
    images: MediaSpec;
    shortVideo: MediaSpec;
    longVideo: MediaSpec;
  };
  /** If true, text-only posts cannot be broadcast here */
  requiresMedia: boolean;
  /** Content types this platform can produce as an origin */
  asOrigin: ContentTypeId[];
  /** Content types this platform can accept as a broadcast target */
  asTarget: ContentTypeId[];
}

// ─── Content type catalogue ───────────────────────────────────────────────────

export const CONTENT_TYPES: ContentTypeDef[] = [
  { id: 'text',        label: 'Text posts',            description: 'Short-form text status updates' },
  { id: 'long_text',   label: 'Long-form text',        description: 'Articles, newsletters, long posts' },
  { id: 'images',      label: 'Image posts',           description: 'Photos and image galleries' },
  { id: 'short_video', label: 'Short video (≤ 60 s)',  description: 'Reels, Shorts, clips' },
  { id: 'threads',     label: 'Threaded posts',        description: 'Multi-post reply chains' },
  { id: 'reposts',     label: 'Reposts / shares',      description: "Re-sharing another account's post" },
  { id: 'quote_posts', label: 'Quote posts',           description: 'Sharing with added commentary' },
  { id: 'auto_split',  label: 'Auto-split long posts', description: 'Automatically break long content into threads' },
];

// ─── Platform matrix ──────────────────────────────────────────────────────────

export const PLATFORM_MATRIX: Record<string, PlatformDef> = {
  TWITTER: {
    id: 'TWITTER', slug: 'x', name: 'X (Twitter)',
    charLimit: 280, supportsThreads: true,
    media: {
      images:     { supported: true,  maxCount: 4 },
      shortVideo: { supported: true,  maxDurationSecs: 140, maxSizeMb: 512 },
      longVideo:  { supported: false },
    },
    requiresMedia: false,
    asOrigin: ['text', 'images', 'short_video', 'threads', 'reposts', 'quote_posts'],
    asTarget: ['text', 'images', 'short_video', 'threads', 'auto_split'],
  },

  BLUESKY: {
    id: 'BLUESKY', slug: 'bluesky', name: 'Bluesky',
    charLimit: 300, supportsThreads: true,
    media: {
      images:     { supported: true, maxCount: 4 },
      shortVideo: { supported: false },
      longVideo:  { supported: false },
    },
    requiresMedia: false,
    asOrigin: ['text', 'images', 'threads', 'reposts', 'quote_posts'],
    asTarget: ['text', 'images', 'threads', 'auto_split'],
  },

  THREADS: {
    id: 'THREADS', slug: 'threads', name: 'Threads',
    charLimit: 500, supportsThreads: true,
    media: {
      images:     { supported: true, maxCount: 10 },
      shortVideo: { supported: true, maxDurationSecs: 90 },
      longVideo:  { supported: false },
    },
    requiresMedia: false,
    asOrigin: ['text', 'long_text', 'images', 'short_video', 'threads', 'reposts'],
    asTarget: ['text', 'long_text', 'images', 'short_video', 'threads', 'auto_split'],
  },

  MASTODON: {
    id: 'MASTODON', slug: 'mastodon', name: 'Mastodon',
    charLimit: 500, supportsThreads: true,
    media: {
      images:     { supported: true, maxCount: 4 },
      shortVideo: { supported: true, maxDurationSecs: 60 },
      longVideo:  { supported: false },
    },
    requiresMedia: false,
    asOrigin: ['text', 'long_text', 'images', 'short_video', 'threads', 'reposts', 'quote_posts'],
    asTarget: ['text', 'long_text', 'images', 'short_video', 'threads', 'auto_split'],
  },

  LINKEDIN: {
    id: 'LINKEDIN', slug: 'linkedin', name: 'LinkedIn',
    charLimit: 3000, supportsThreads: false,
    media: {
      images:     { supported: true, maxCount: 9 },
      shortVideo: { supported: true, maxDurationSecs: 600 },
      longVideo:  { supported: true, maxDurationSecs: 3600 },
    },
    requiresMedia: false,
    asOrigin: ['text', 'long_text', 'images', 'short_video', 'long_video', 'reposts'],
    asTarget: ['text', 'long_text', 'images', 'short_video', 'long_video'],
  },

  INSTAGRAM: {
    id: 'INSTAGRAM', slug: 'instagram', name: 'Instagram',
    charLimit: 2200, supportsThreads: false,
    media: {
      images:     { supported: true, maxCount: 10 },
      shortVideo: { supported: true, maxDurationSecs: 90 },
      longVideo:  { supported: false },
    },
    requiresMedia: true,
    asOrigin: ['images', 'short_video'],
    asTarget: ['images', 'short_video'],
  },

  FACEBOOK: {
    id: 'FACEBOOK', slug: 'facebook', name: 'Facebook',
    charLimit: 63206, supportsThreads: false,
    media: {
      images:     { supported: true, maxCount: 10 },
      shortVideo: { supported: true,  maxDurationSecs: 240 },
      longVideo:  { supported: true,  maxDurationSecs: 14400 },
    },
    requiresMedia: false,
    asOrigin: ['text', 'long_text', 'images', 'short_video', 'long_video'],
    asTarget: ['text', 'long_text', 'images', 'short_video', 'long_video'],
  },

  YOUTUBE: {
    id: 'YOUTUBE', slug: 'youtube', name: 'YouTube',
    charLimit: 5000, supportsThreads: false,
    media: {
      images:     { supported: false },
      shortVideo: { supported: true, maxDurationSecs: 60 },
      longVideo:  { supported: true, maxDurationSecs: 43200, maxSizeMb: 128_000 },
    },
    requiresMedia: true,
    asOrigin: ['short_video', 'long_video'],
    asTarget: ['short_video', 'long_video'],
  },

  TIKTOK: {
    id: 'TIKTOK', slug: 'tiktok', name: 'TikTok',
    charLimit: 2200, supportsThreads: false,
    media: {
      images:     { supported: false },
      shortVideo: { supported: true, maxDurationSecs: 600, maxSizeMb: 4096 },
      longVideo:  { supported: false },
    },
    requiresMedia: true,
    asOrigin: ['short_video'],
    asTarget: ['short_video'],
  },
};

// ─── Query helpers ────────────────────────────────────────────────────────────

/** Look up platform by Prisma enum key (case-insensitive). */
export function getPlatform(platformId: string): PlatformDef | undefined {
  return PLATFORM_MATRIX[platformId.toUpperCase()];
}

/** Look up platform by its URL slug (e.g. "x" → TWITTER). */
export function getPlatformBySlug(slug: string): PlatformDef | undefined {
  const lower = slug.toLowerCase();
  return Object.values(PLATFORM_MATRIX).find((p) => p.slug === lower);
}

/** All platform definitions as an ordered array (alphabetical by name). */
export function getAllPlatforms(): PlatformDef[] {
  return Object.values(PLATFORM_MATRIX).sort((a, b) => a.name.localeCompare(b.name));
}

/** Character limit for a platform (falls back to 500 if unknown). */
export function getCharLimit(platformId: string): number {
  return getPlatform(platformId)?.charLimit ?? 500;
}

/** Whether the platform supports threaded reply-chains as a broadcast target. */
export function supportsThreading(platformId: string): boolean {
  return getPlatform(platformId)?.supportsThreads ?? false;
}

/** Whether the platform supports image uploads as a broadcast target. */
export function supportsImages(platformId: string): boolean {
  return getPlatform(platformId)?.media.images.supported ?? false;
}

/** Whether the platform supports short-video uploads as a broadcast target. */
export function supportsShortVideo(platformId: string): boolean {
  return getPlatform(platformId)?.media.shortVideo.supported ?? false;
}

/** Whether the platform supports long-video uploads as a broadcast target. */
export function supportsLongVideo(platformId: string): boolean {
  return getPlatform(platformId)?.media.longVideo.supported ?? false;
}

/**
 * Content types that can flow from `originId` to `targetId`.
 * Returns the intersection of what origin produces and target accepts.
 */
export function getCompatibleTypes(originId: string, targetId: string): ContentTypeId[] {
  const origin = getPlatform(originId);
  const target = getPlatform(targetId);
  if (!origin || !target) return [];
  return origin.asOrigin.filter((t): t is ContentTypeId => (target.asTarget as string[]).includes(t));
}

/**
 * All platform IDs that a given origin can broadcast to
 * (i.e. at least one compatible content type exists).
 */
export function getCompatibleTargets(originId: string): string[] {
  const upper = originId.toUpperCase();
  return Object.keys(PLATFORM_MATRIX).filter(
    (targetId) => targetId !== upper && getCompatibleTypes(upper, targetId).length > 0,
  );
}

/**
 * Build the full N×N compatibility matrix as a 2-D map:
 *   result[originId][targetId] = ContentTypeId[]
 *
 * Useful for rendering a table in the UI.
 */
export function buildCompatibilityMatrix(): Record<string, Record<string, ContentTypeId[]>> {
  const platforms = Object.keys(PLATFORM_MATRIX);
  const result: Record<string, Record<string, ContentTypeId[]>> = {};
  for (const origin of platforms) {
    result[origin] = {};
    for (const target of platforms) {
      if (origin !== target) {
        result[origin][target] = getCompatibleTypes(origin, target);
      }
    }
  }
  return result;
}
