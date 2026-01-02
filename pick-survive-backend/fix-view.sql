CREATE OR REPLACE VIEW v_mode_rollover AS
SELECT
    l.league_id,
    e.mode,
    COALESCE(SUM(CASE WHEN l.type = 'ROLLOVER_IN' THEN l.amount_cents ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN l.type = 'ROLLOVER_OUT' THEN l.amount_cents ELSE 0 END), 0) AS rollover_cents
FROM ledger l
JOIN "Edition" e ON l.edition_id::text = e.id
WHERE l.type IN ('ROLLOVER_IN', 'ROLLOVER_OUT')
GROUP BY l.league_id, e.mode;
