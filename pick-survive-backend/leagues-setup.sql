-- Crear tablas del sistema de ligas
CREATE TABLE IF NOT EXISTS ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL,
  league_id UUID NULL,
  edition_id UUID NULL,
  type TEXT NOT NULL CHECK (type IN ('ENTRY_FEE','PRIZE_PAYOUT','ROLLOVER_OUT','ROLLOVER_IN','ADJUSTMENT')),
  amount_cents BIGINT NOT NULL,
  meta_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  default_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE','PUBLIC')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_member (
  league_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('OWNER','ADMIN','PLAYER')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS league_invite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL,
  email CITEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  invited_by UUID NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columnas a Edition si no existen
ALTER TABLE "Edition" ADD COLUMN IF NOT EXISTS league_id UUID;
ALTER TABLE "Edition" ADD COLUMN IF NOT EXISTS config_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Edition" ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'ELIMINATORIO' CHECK (mode IN ('ELIMINATORIO','LIGA'));
ALTER TABLE "Edition" ADD COLUMN IF NOT EXISTS end_matchday INTEGER;
ALTER TABLE "Edition" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_edition_id ON ledger(edition_id);
CREATE INDEX IF NOT EXISTS idx_ledger_league_id ON ledger(league_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger(type);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at);

-- Crear vistas
CREATE OR REPLACE VIEW v_user_balance AS
SELECT user_id, COALESCE(SUM(amount_cents),0) AS balance_cents
FROM ledger
WHERE user_id IS NOT NULL
GROUP BY user_id;

CREATE OR REPLACE VIEW v_edition_pot AS
SELECT edition_id,
  SUM(CASE WHEN type='ENTRY_FEE' THEN amount_cents
           WHEN type='PRIZE_PAYOUT' THEN -amount_cents
           ELSE 0 END) AS pot_cents_net
FROM ledger
WHERE edition_id IS NOT NULL
GROUP BY edition_id;

CREATE OR REPLACE VIEW v_mode_rollover AS
SELECT
    l.league_id,
    e.mode,
    COALESCE(SUM(CASE WHEN l.type = 'ROLLOVER_IN' THEN l.amount_cents ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN l.type = 'ROLLOVER_OUT' THEN l.amount_cents ELSE 0 END), 0) AS rollover_cents
FROM ledger l
JOIN "Edition" e ON l.edition_id = e.id
WHERE l.type IN ('ROLLOVER_IN', 'ROLLOVER_OUT')
GROUP BY l.league_id, e.mode;
