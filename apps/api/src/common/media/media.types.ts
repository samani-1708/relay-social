/**
 * Represents a single piece of media that has been downloaded from
 * the origin platform and is ready to be re-uploaded to a target.
 */
export type MediaKind = 'image' | 'short_video' | 'long_video' | 'unknown';

export interface MediaItem {
  /** Original URL on the origin platform */
  originalUrl: string;
  /** Classified type — used to decide which upload API to call */
  kind: MediaKind;
  /** Full MIME type string e.g. "image/jpeg", "video/mp4" */
  mimeType: string;
  /** Raw file bytes */
  buffer: Buffer;
  /** File size in MB */
  sizeMb: number;
  /**
   * Public CDN URL after the item has been uploaded to object storage.
   * Set by StorageService.upload(). Used by URL-pull platforms (Instagram, TikTok).
   */
  publicUrl?: string;
}
