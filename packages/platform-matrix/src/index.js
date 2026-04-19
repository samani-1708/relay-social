"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_MATRIX = exports.CONTENT_TYPES = void 0;
exports.getPlatform = getPlatform;
exports.getPlatformBySlug = getPlatformBySlug;
exports.getAllPlatforms = getAllPlatforms;
exports.getCharLimit = getCharLimit;
exports.supportsThreading = supportsThreading;
exports.supportsImages = supportsImages;
exports.supportsShortVideo = supportsShortVideo;
exports.supportsLongVideo = supportsLongVideo;
exports.getCompatibleTypes = getCompatibleTypes;
exports.getCompatibleTargets = getCompatibleTargets;
exports.buildCompatibilityMatrix = buildCompatibilityMatrix;
exports.CONTENT_TYPES = [
    { id: 'text', label: 'Text posts', description: 'Short-form text status updates' },
    { id: 'long_text', label: 'Long-form text', description: 'Articles, newsletters, long posts' },
    { id: 'images', label: 'Image posts', description: 'Photos and image galleries' },
    { id: 'short_video', label: 'Short video (≤ 60 s)', description: 'Reels, Shorts, clips' },
    { id: 'long_video', label: 'Long video (> 60 s)', description: 'Full videos and documentaries' },
    { id: 'threads', label: 'Threaded posts', description: 'Multi-post reply chains' },
    { id: 'reposts', label: 'Reposts / shares', description: "Re-sharing another account's post" },
    { id: 'quote_posts', label: 'Quote posts', description: 'Sharing with added commentary' },
    { id: 'auto_split', label: 'Auto-split long posts', description: 'Automatically break long content into threads' },
];
exports.PLATFORM_MATRIX = {
    TWITTER: {
        id: 'TWITTER', slug: 'x', name: 'X (Twitter)',
        charLimit: 280, supportsThreads: true,
        media: {
            images: { supported: true, maxCount: 4 },
            shortVideo: { supported: true, maxDurationSecs: 140, maxSizeMb: 512 },
            longVideo: { supported: false },
        },
        requiresMedia: false,
        asOrigin: ['text', 'images', 'short_video', 'threads', 'reposts', 'quote_posts'],
        asTarget: ['text', 'images', 'short_video', 'threads', 'auto_split'],
    },
    BLUESKY: {
        id: 'BLUESKY', slug: 'bluesky', name: 'Bluesky',
        charLimit: 300, supportsThreads: true,
        media: {
            images: { supported: true, maxCount: 4 },
            shortVideo: { supported: false },
            longVideo: { supported: false },
        },
        requiresMedia: false,
        asOrigin: ['text', 'images', 'threads', 'reposts', 'quote_posts'],
        asTarget: ['text', 'images', 'threads', 'auto_split'],
    },
    THREADS: {
        id: 'THREADS', slug: 'threads', name: 'Threads',
        charLimit: 500, supportsThreads: true,
        media: {
            images: { supported: true, maxCount: 10 },
            shortVideo: { supported: true, maxDurationSecs: 90 },
            longVideo: { supported: false },
        },
        requiresMedia: false,
        asOrigin: ['text', 'long_text', 'images', 'short_video', 'threads', 'reposts'],
        asTarget: ['text', 'long_text', 'images', 'short_video', 'threads', 'auto_split'],
    },
    MASTODON: {
        id: 'MASTODON', slug: 'mastodon', name: 'Mastodon',
        charLimit: 500, supportsThreads: true,
        media: {
            images: { supported: true, maxCount: 4 },
            shortVideo: { supported: true, maxDurationSecs: 60 },
            longVideo: { supported: false },
        },
        requiresMedia: false,
        asOrigin: ['text', 'long_text', 'images', 'short_video', 'threads', 'reposts', 'quote_posts'],
        asTarget: ['text', 'long_text', 'images', 'short_video', 'threads', 'auto_split'],
    },
    LINKEDIN: {
        id: 'LINKEDIN', slug: 'linkedin', name: 'LinkedIn',
        charLimit: 3000, supportsThreads: false,
        media: {
            images: { supported: true, maxCount: 9 },
            shortVideo: { supported: true, maxDurationSecs: 600 },
            longVideo: { supported: true, maxDurationSecs: 3600 },
        },
        requiresMedia: false,
        asOrigin: ['text', 'long_text', 'images', 'short_video', 'long_video', 'reposts'],
        asTarget: ['text', 'long_text', 'images', 'short_video', 'long_video'],
    },
    INSTAGRAM: {
        id: 'INSTAGRAM', slug: 'instagram', name: 'Instagram',
        charLimit: 2200, supportsThreads: false,
        media: {
            images: { supported: true, maxCount: 10 },
            shortVideo: { supported: true, maxDurationSecs: 90 },
            longVideo: { supported: false },
        },
        requiresMedia: true,
        asOrigin: ['images', 'short_video'],
        asTarget: ['images', 'short_video'],
    },
    FACEBOOK: {
        id: 'FACEBOOK', slug: 'facebook', name: 'Facebook',
        charLimit: 63206, supportsThreads: false,
        media: {
            images: { supported: true, maxCount: 10 },
            shortVideo: { supported: true, maxDurationSecs: 240 },
            longVideo: { supported: true, maxDurationSecs: 14400 },
        },
        requiresMedia: false,
        asOrigin: ['text', 'long_text', 'images', 'short_video', 'long_video'],
        asTarget: ['text', 'long_text', 'images', 'short_video', 'long_video'],
    },
    YOUTUBE: {
        id: 'YOUTUBE', slug: 'youtube', name: 'YouTube',
        charLimit: 5000, supportsThreads: false,
        media: {
            images: { supported: false },
            shortVideo: { supported: true, maxDurationSecs: 60 },
            longVideo: { supported: true, maxDurationSecs: 43200, maxSizeMb: 128_000 },
        },
        requiresMedia: true,
        asOrigin: ['short_video', 'long_video'],
        asTarget: ['short_video', 'long_video'],
    },
    TIKTOK: {
        id: 'TIKTOK', slug: 'tiktok', name: 'TikTok',
        charLimit: 2200, supportsThreads: false,
        media: {
            images: { supported: false },
            shortVideo: { supported: true, maxDurationSecs: 600, maxSizeMb: 4096 },
            longVideo: { supported: false },
        },
        requiresMedia: true,
        asOrigin: ['short_video'],
        asTarget: ['short_video'],
    },
    SHARECHAT: {
        id: 'SHARECHAT', slug: 'sharechat', name: 'ShareChat',
        charLimit: 500, supportsThreads: false,
        media: {
            images: { supported: true, maxCount: 1 },
            shortVideo: { supported: true, maxDurationSecs: 60 },
            longVideo: { supported: false },
        },
        requiresMedia: false,
        asOrigin: ['text', 'images', 'short_video'],
        asTarget: ['text', 'images', 'short_video'],
    },
};
function getPlatform(platformId) {
    return exports.PLATFORM_MATRIX[platformId.toUpperCase()];
}
function getPlatformBySlug(slug) {
    const lower = slug.toLowerCase();
    return Object.values(exports.PLATFORM_MATRIX).find((p) => p.slug === lower);
}
function getAllPlatforms() {
    return Object.values(exports.PLATFORM_MATRIX).sort((a, b) => a.name.localeCompare(b.name));
}
function getCharLimit(platformId) {
    return getPlatform(platformId)?.charLimit ?? 500;
}
function supportsThreading(platformId) {
    return getPlatform(platformId)?.supportsThreads ?? false;
}
function supportsImages(platformId) {
    return getPlatform(platformId)?.media.images.supported ?? false;
}
function supportsShortVideo(platformId) {
    return getPlatform(platformId)?.media.shortVideo.supported ?? false;
}
function supportsLongVideo(platformId) {
    return getPlatform(platformId)?.media.longVideo.supported ?? false;
}
function getCompatibleTypes(originId, targetId) {
    const origin = getPlatform(originId);
    const target = getPlatform(targetId);
    if (!origin || !target)
        return [];
    return origin.asOrigin.filter((t) => target.asTarget.includes(t));
}
function getCompatibleTargets(originId) {
    const upper = originId.toUpperCase();
    return Object.keys(exports.PLATFORM_MATRIX).filter((targetId) => targetId !== upper && getCompatibleTypes(upper, targetId).length > 0);
}
function buildCompatibilityMatrix() {
    const platforms = Object.keys(exports.PLATFORM_MATRIX);
    const result = {};
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
//# sourceMappingURL=index.js.map