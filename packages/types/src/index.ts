export type Platform =
  | "TWITTER"
  | "BLUESKY"
  | "THREADS"
  | "LINKEDIN"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "MASTODON"
  | "SHARECHAT";

export type BroadcastStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "FAILED"
  | "SKIPPED";

export type PostStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export interface PlatformAccount {
  id: string;
  platform: Platform;
  platformUsername: string;
  platformAvatar?: string;
  isOrigin: boolean;
  isTarget: boolean;
  instanceUrl?: string;
  tokenExpiresAt?: string;
  lastPolledAt?: string;
}

export interface BroadcastJob {
  id: string;
  targetPlatform: Platform;
  status: BroadcastStatus;
  sentAt?: string;
  errorMessage?: string;
  sentPostIds: string[];
}

export interface Post {
  id: string;
  originContent: string;
  originPlatform: Platform;
  status: PostStatus;
  source: string;
  createdAt: string;
  broadcastJobs: BroadcastJob[];
}
