-- Vistas SQL para cálculos de balance y botes
-- Estas vistas proporcionan cálculos en tiempo real basados en el ledger inmutable

-- Vista: saldo por jugador
CREATE OR REPLACE VIEW v_user_balance AS
SELECT 
  user_id, 
  COALESCE(SUM(amount_cents), 0) AS balance_cents
FROM ledger
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Vista: bote por edición (solo ENTRY_FEE - PRIZE_PAYOUT)
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

-- Vista: bote acumulado por modo y liga
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

-- Vista: estadísticas de liga
CREATE OR REPLACE VIEW v_league_stats AS
SELECT 
  l.id as league_id,
  l.name as league_name,
  COUNT(DISTINCT lm.user_id) as member_count,
  COUNT(DISTINCT e.id) as edition_count,
  COUNT(DISTINCT CASE WHEN e.status = 'OPEN' THEN e.id END) as open_editions,
  COUNT(DISTINCT CASE WHEN e.status = 'IN_PROGRESS' THEN e.id END) as active_editions,
  COUNT(DISTINCT CASE WHEN e.status = 'FINISHED' THEN e.id END) as finished_editions
FROM league l
LEFT JOIN league_member lm ON l.id = lm.league_id
LEFT JOIN edition e ON l.id = e.league_id
GROUP BY l.id, l.name;

-- Vista: historial de transacciones por usuario
CREATE OR REPLACE VIEW v_user_ledger AS
SELECT 
  ld.id,
  ld.user_id,
  ld.edition_id,
  ld.type,
  ld.amount_cents,
  ld.meta_json,
  ld.created_at,
  e.name as edition_name,
  l.name as league_name
FROM ledger ld
LEFT JOIN edition e ON ld.edition_id = e.id
LEFT JOIN league l ON e.league_id = l.id
WHERE ld.user_id IS NOT NULL
ORDER BY ld.created_at DESC;

-- Vista: resumen de edición con estadísticas
CREATE OR REPLACE VIEW v_edition_summary AS
SELECT 
  e.id,
  e.name,
  e.status,
  e.mode,
  e.start_matchday,
  e.end_matchday,
  e.entry_fee_cents,
  l.name as league_name,
  l.id as league_id,
  COUNT(DISTINCT p.id) as participant_count,
  COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) as active_participants,
  COUNT(DISTINCT CASE WHEN p.status = 'ELIMINATED' THEN p.id END) as eliminated_participants,
  COALESCE(vp.pot_cents_net, 0) as pot_cents,
  e.created_at
FROM edition e
JOIN league l ON e.league_id = l.id
LEFT JOIN participant p ON e.id = p.edition_id
LEFT JOIN v_edition_pot vp ON e.id = vp.edition_id
GROUP BY e.id, e.name, e.status, e.mode, e.start_matchday, e.end_matchday, 
         e.entry_fee_cents, l.name, l.id, vp.pot_cents_net, e.created_at;
