/**
 * Re-exports platform data from @relayman/platform-matrix for the web app.
 *
 * All capability data lives in packages/platform-matrix/src/index.ts —
 * edit that file to change char limits, media support, compatible types, etc.
 */

export {
  PLATFORM_MATRIX,
  CONTENT_TYPES,
  getAllPlatforms,
  getPlatform,
  getPlatformBySlug,
  getCharLimit,
  supportsThreading,
  supportsImages,
  supportsShortVideo,
  supportsLongVideo,
  getCompatibleTypes,
  getCompatibleTargets,
  buildCompatibilityMatrix,
} from '@relayman/platform-matrix';

export type { PlatformDef, ContentTypeDef, ContentTypeId, MediaSpec } from '@relayman/platform-matrix';

// ─── Legacy shape kept for pages that used the old PLATFORMS / PLATFORM_SUPPORT arrays ──

import { getAllPlatforms, PLATFORM_MATRIX } from '@relayman/platform-matrix';



// ─── Icon map (slug/ID → display character or emoji) ─────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  TWITTER:   '𝕏',
  BLUESKY:   '🦋',
  THREADS:   '🧵',
  MASTODON:  '🐘',
  LINKEDIN:  'in',
  INSTAGRAM: '📸',
  FACEBOOK:  'f',
  YOUTUBE:   '▶',
  TIKTOK:    '♪',
};

/**
 * Ordered list of platforms for UI dropdowns and grids.
 * Matches the old `PLATFORMS` array shape.
 */
export const PLATFORMS = getAllPlatforms().map((p) => ({
  id: p.slug,
  name: p.name,
  icon: PLATFORM_ICONS[p.id] ?? p.slug[0].toUpperCase(),
}));

/**
 * Per-platform content-type support, keyed by slug (legacy format).
 * Maps e.g. "x" → ["text", "images", ...]
 */
export const PLATFORM_SUPPORT: Record<string, string[]> = Object.fromEntries(
  Object.values(PLATFORM_MATRIX).map((p) => [
    p.slug,
    Array.from(new Set([...p.asOrigin, ...p.asTarget])),
  ]),
);

/** Convenience: compatible types between two slug-keyed platforms. */
export function compatibleTypes(originSlug: string, targetSlug: string): string[] {
  const src = PLATFORM_SUPPORT[originSlug] ?? [];
  const dst = PLATFORM_SUPPORT[targetSlug] ?? [];
  return src.filter((t) => dst.includes(t));
}

