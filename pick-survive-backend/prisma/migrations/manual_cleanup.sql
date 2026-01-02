-- Script SQL manual para limpiar campos duplicados y tablas legacy
-- Ejecutar manualmente en pgAdmin o psql después de hacer backup

-- ============================================
-- PASO 1: Verificar datos en campos legacy
-- ============================================

-- Verificar si hay datos en campos duplicados de Edition
SELECT 
  id, 
  name,
  "leagueId", 
  "league_id",
  "configJson" IS NOT NULL as has_config_json,
  "config_json" IS NOT NULL as has_config_json_legacy,
  "endMatchday",
  "end_matchday",
  "createdAt",
  "created_at"
FROM "Edition"
WHERE "league_id" IS NOT NULL 
   OR "config_json" IS NOT NULL 
   OR "end_matchday" IS NOT NULL
   OR "created_at" IS NOT NULL;

-- Verificar si hay datos en tablas legacy
SELECT COUNT(*) as total_legacy_leagues FROM league;
SELECT COUNT(*) as total_legacy_invites FROM league_invite;
SELECT COUNT(*) as total_legacy_members FROM league_member;
SELECT COUNT(*) as total_legacy_ledger FROM ledger;

-- ============================================
-- PASO 2: Migrar datos si es necesario
-- ============================================

-- Si hay datos en league_id pero no en leagueId, copiarlos
-- (Normalmente no debería ser necesario porque leagueId ya existe)
-- UPDATE "Edition" 
-- SET "leagueId" = "league_id"::text 
-- WHERE "leagueId" IS NULL AND "league_id" IS NOT NULL;

-- ============================================
-- PASO 3: Eliminar columnas duplicadas de Edition
-- ============================================

-- Eliminar columnas duplicadas (solo si no hay datos importantes)
ALTER TABLE "Edition" DROP COLUMN IF EXISTS "league_id";
ALTER TABLE "Edition" DROP COLUMN IF EXISTS "config_json";
ALTER TABLE "Edition" DROP COLUMN IF EXISTS "end_matchday";
ALTER TABLE "Edition" DROP COLUMN IF EXISTS "created_at";

-- ============================================
-- PASO 4: Eliminar tablas legacy
-- ============================================

-- Eliminar tablas legacy (solo si no tienen datos importantes)
DROP TABLE IF EXISTS league CASCADE;
DROP TABLE IF EXISTS league_invite CASCADE;
DROP TABLE IF EXISTS league_member CASCADE;
DROP TABLE IF EXISTS ledger CASCADE;

-- ============================================
-- PASO 5: Agregar índices faltantes
-- ============================================

-- Agregar índices a Edition
CREATE INDEX IF NOT EXISTS "Edition_leagueId_idx" ON "Edition"("leagueId");
CREATE INDEX IF NOT EXISTS "Edition_status_idx" ON "Edition"("status");

-- Agregar índices a Match
CREATE INDEX IF NOT EXISTS "Match_matchday_idx" ON "Match"("matchday");
CREATE INDEX IF NOT EXISTS "Match_status_idx" ON "Match"("status");

-- Agregar índice a Pick
CREATE INDEX IF NOT EXISTS "Pick_participantId_idx" ON "Pick"("participantId");

-- ============================================
-- PASO 6: Verificar cambios
-- ============================================

-- Verificar que las columnas fueron eliminadas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Edition' 
  AND column_name IN ('league_id', 'config_json', 'end_matchday', 'created_at');
-- Debe retornar 0 filas

-- Verificar que las tablas legacy fueron eliminadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('league', 'league_invite', 'league_member', 'ledger');
-- Debe retornar 0 filas (o solo 'League', 'LeagueInvite', etc. con mayúscula)

-- Verificar índices
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('Edition', 'Match', 'Pick')
  AND indexname LIKE '%_idx';

