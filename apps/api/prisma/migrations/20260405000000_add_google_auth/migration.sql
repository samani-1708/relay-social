-- Add googleId to users
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- Make originPlatform nullable (editor posts have no origin platform)
ALTER TABLE "posts" ALTER COLUMN "originPlatform" DROP NOT NULL;

-- Create oauth_states table
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_states_key_key" ON "oauth_states"("key");
