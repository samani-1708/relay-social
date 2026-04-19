-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TWITTER', 'BLUESKY', 'THREADS', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'MASTODON', 'SHARECHAT');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "platformUserId" TEXT NOT NULL,
    "platformUsername" TEXT NOT NULL,
    "platformAvatar" TEXT,
    "isOrigin" BOOLEAN NOT NULL DEFAULT false,
    "isTarget" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "instanceUrl" TEXT,
    "lastPolledAt" TIMESTAMP(3),
    "lastSeenPostId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originContent" TEXT NOT NULL,
    "originPlatform" "Platform" NOT NULL,
    "originPostId" TEXT,
    "originMediaUrls" TEXT[],
    "skipBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'origin',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_jobs" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "targetPlatform" "Platform" NOT NULL,
    "targetAccountId" TEXT NOT NULL,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "adaptedContent" TEXT,
    "sentPostIds" TEXT[],
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skipHashtag" TEXT NOT NULL DEFAULT '#nosync',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailOnFailureOnly" BOOLEAN NOT NULL DEFAULT true,
    "pollingIntervalSecs" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_accounts_userId_platform_platformUserId_key" ON "platform_accounts"("userId", "platform", "platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_jobs" ADD CONSTRAINT "broadcast_jobs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_jobs" ADD CONSTRAINT "broadcast_jobs_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "platform_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
