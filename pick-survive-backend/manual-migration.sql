-- Migration: Add external API fields to Team and Match tables
-- This migration adds fields to support external football data APIs

-- Add external API fields to Team table
ALTER TABLE "Team" ADD COLUMN "externalId" INTEGER;
ALTER TABLE "Team" ADD COLUMN "crest" TEXT;
ALTER TABLE "Team" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "Team" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Team" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add external API fields to Match table
ALTER TABLE "Match" ADD COLUMN "externalId" INTEGER;
ALTER TABLE "Match" ADD COLUMN "season" INTEGER;
ALTER TABLE "Match" ADD COLUMN "competition" TEXT;
ALTER TABLE "Match" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Match" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add unique constraints for external IDs
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");

-- Update existing records to have current timestamp
UPDATE "Team" SET "createdAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
UPDATE "Match" SET "createdAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
