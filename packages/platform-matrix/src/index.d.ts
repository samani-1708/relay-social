export type ContentTypeId = 'text' | 'long_text' | 'images' | 'short_video' | 'long_video' | 'threads' | 'reposts' | 'quote_posts' | 'auto_split';
export interface ContentTypeDef {
    id: ContentTypeId;
    label: string;
    description: string;
}
export interface MediaSpec {
    supported: boolean;
    maxCount?: number;
    maxDurationSecs?: number;
    maxSizeMb?: number;
}
export interface PlatformDef {
    id: string;
    slug: string;
    name: string;
    charLimit: number;
    supportsThreads: boolean;
    media: {
        images: MediaSpec;
        shortVideo: MediaSpec;
        longVideo: MediaSpec;
    };
    requiresMedia: boolean;
    asOrigin: ContentTypeId[];
    asTarget: ContentTypeId[];
}
export declare const CONTENT_TYPES: ContentTypeDef[];
export declare const PLATFORM_MATRIX: Record<string, PlatformDef>;
export declare function getPlatform(platformId: string): PlatformDef | undefined;
export declare function getPlatformBySlug(slug: string): PlatformDef | undefined;
export declare function getAllPlatforms(): PlatformDef[];
export declare function getCharLimit(platformId: string): number;
export declare function supportsThreading(platformId: string): boolean;
export declare function supportsImages(platformId: string): boolean;
export declare function supportsShortVideo(platformId: string): boolean;
export declare function supportsLongVideo(platformId: string): boolean;
export declare function getCompatibleTypes(originId: string, targetId: string): ContentTypeId[];
export declare function getCompatibleTargets(originId: string): string[];
export declare function buildCompatibilityMatrix(): Record<string, Record<string, ContentTypeId[]>>;
