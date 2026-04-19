-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "pollingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "targetPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[];
