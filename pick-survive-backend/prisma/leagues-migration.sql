-- Migration: Add leagues, ledger, and related tables
-- This migration implements the complete league and ledger system

-- Create League table
CREATE TABLE "League" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "defaultConfigJson" JSONB NOT NULL DEFAULT '{}',
  "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- Create LeagueMember table
CREATE TABLE "LeagueMember" (
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'PLAYER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("leagueId", "userId")
);

-- Create LeagueInvite table
CREATE TABLE "LeagueInvite" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "invitedBy" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeagueInvite_pkey" PRIMARY KEY ("id")
);

-- Update Edition table
ALTER TABLE "Edition" ADD COLUMN "endMatchday" INTEGER;
ALTER TABLE "Edition" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'ELIMINATORIO';
ALTER TABLE "Edition" ADD COLUMN "configJson" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Edition" ADD COLUMN "leagueId" TEXT NOT NULL DEFAULT '';

-- Update Ledger table
ALTER TABLE "Ledger" ADD COLUMN "leagueId" TEXT;
ALTER TABLE "Ledger" ADD COLUMN "metaJson" JSONB NOT NULL DEFAULT '{}';

-- Add foreign key constraints
ALTER TABLE "League" ADD CONSTRAINT "League_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeagueInvite" ADD CONSTRAINT "LeagueInvite_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueInvite" ADD CONSTRAINT "LeagueInvite_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Edition" ADD CONSTRAINT "Edition_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraints
CREATE UNIQUE INDEX "LeagueInvite_token_key" ON "LeagueInvite"("token");
CREATE UNIQUE INDEX "LeagueInvite_leagueId_email_key" ON "LeagueInvite"("leagueId", "email");

-- Add indexes for performance
CREATE INDEX "LeagueMember_userId_idx" ON "LeagueMember"("userId");
CREATE INDEX "LeagueMember_leagueId_idx" ON "LeagueMember"("leagueId");
CREATE INDEX "LeagueInvite_email_idx" ON "LeagueInvite"("email");
CREATE INDEX "LeagueInvite_status_idx" ON "LeagueInvite"("status");
CREATE INDEX "Edition_leagueId_idx" ON "Edition"("leagueId");
CREATE INDEX "Edition_mode_idx" ON "Edition"("mode");
CREATE INDEX "Ledger_userId_idx" ON "Ledger"("userId");
CREATE INDEX "Ledger_editionId_idx" ON "Ledger"("editionId");
CREATE INDEX "Ledger_leagueId_idx" ON "Ledger"("leagueId");
CREATE INDEX "Ledger_type_idx" ON "Ledger"("type");
CREATE INDEX "Ledger_createdAt_idx" ON "Ledger"("createdAt");

-- Create views for balance calculations
CREATE OR REPLACE VIEW v_user_balance AS
SELECT 
  user_id, 
  COALESCE(SUM(amount_cents), 0) AS balance_cents
FROM ledger
WHERE user_id IS NOT NULL
GROUP BY user_id;

CREATE OR REPLACE VIEW v_edition_pot AS
SELECT 
  edition_id,
  SUM(CASE 
    WHEN type = 'ENTRY_FEE' THEN amount_cents
    WHEN type = 'PRIZE_PAYOUT' THEN -amount_cents
    ELSE 0 
  END) AS pot_cents_net
FROM ledger
WHERE edition_id IS NOT NULL
GROUP BY edition_id;

CREATE OR REPLACE VIEW v_mode_rollover AS
SELECT 
  l.id as league_id,
  e.mode,
  SUM(CASE 
    WHEN type = 'ROLLOVER_IN' THEN amount_cents
    WHEN type = 'ROLLOVER_OUT' THEN -amount_cents
    ELSE 0 
  END) AS rollover_cents
FROM ledger ld
JOIN edition e ON ld.edition_id = e.id
JOIN league l ON e.league_id = l.id
WHERE ld.type IN ('ROLLOVER_IN', 'ROLLOVER_OUT')
GROUP BY l.id, e.mode;

-- Insert default league for existing data migration
INSERT INTO "League" (id, name, "ownerUserId", "defaultConfigJson", visibility, "createdAt")
SELECT 
  'default-league-' || id,
  'Default League',
  id,
  '{"entry_fee_cents": 500, "timezone": "Europe/Madrid", "payout_schema": {"type": "winner_takes_all"}, "rules": {"picks_hidden": true, "no_repeat_team": true, "lifeline_enabled": true, "sudden_death": false, "pick_deadline": "FIRST_KICKOFF"}, "modes_enabled": ["ELIMINATORIO", "LIGA"]}',
  'PRIVATE',
  NOW()
FROM "User"
WHERE id NOT IN (SELECT "ownerUserId" FROM "League");

-- Update existing editions to belong to default league
UPDATE "Edition" 
SET "leagueId" = 'default-league-' || (
  SELECT u.id FROM "User" u 
  WHERE u.id = (
    SELECT p."userId" FROM "Participant" p 
    WHERE p."editionId" = "Edition".id 
    LIMIT 1
  )
)
WHERE "leagueId" = '';

-- Add default league memberships for existing users
INSERT INTO "LeagueMember" ("leagueId", "userId", role, "joinedAt")
SELECT 
  'default-league-' || u.id,
  u.id,
  'OWNER',
  NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "LeagueMember" lm 
  WHERE lm."userId" = u.id
);

-- Initialize user balances with default amount
INSERT INTO "Ledger" (id, "userId", type, "amountCents", "metaJson", "createdAt")
SELECT 
  'initial-balance-' || id,
  id,
  'ADJUSTMENT',
  1000,
  '{"reason": "Initial balance", "migration": true}',
  NOW()
FROM "User"
WHERE id NOT IN (SELECT "userId" FROM "Ledger" WHERE "userId" IS NOT NULL);
