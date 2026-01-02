-- Script SQL para verificar estructura de la base de datos picksurvive
-- Ejecutar en pgAdmin o psql

-- 1. Verificar todas las tablas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Contar registros por tabla
SELECT 
    'User' as tabla, COUNT(*) as registros FROM "User"
UNION ALL
SELECT 'League', COUNT(*) FROM "League"
UNION ALL
SELECT 'LeagueMember', COUNT(*) FROM "LeagueMember"
UNION ALL
SELECT 'LeagueInvite', COUNT(*) FROM "LeagueInvite"
UNION ALL
SELECT 'Edition', COUNT(*) FROM "Edition"
UNION ALL
SELECT 'Participant', COUNT(*) FROM "Participant"
UNION ALL
SELECT 'Ledger', COUNT(*) FROM "Ledger"
UNION ALL
SELECT 'Team', COUNT(*) FROM "Team"
UNION ALL
SELECT 'Match', COUNT(*) FROM "Match"
UNION ALL
SELECT 'Pick', COUNT(*) FROM "Pick"
ORDER BY tabla;

-- 3. Verificar estructura de tabla User
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;

-- 4. Verificar estructura de tabla League
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'League'
ORDER BY ordinal_position;

-- 5. Verificar estructura de tabla Edition
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Edition'
ORDER BY ordinal_position;

-- 6. Verificar Foreign Keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 7. Verificar índices
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. Verificar migraciones de Prisma
SELECT 
    migration_name,
    finished_at,
    applied_steps_count
FROM _prisma_migrations
ORDER BY finished_at DESC;

-- 9. Verificar datos de ejemplo
SELECT 'Usuarios' as tipo, COUNT(*) as cantidad FROM "User"
UNION ALL
SELECT 'Ligas', COUNT(*) FROM "League"
UNION ALL
SELECT 'Ediciones', COUNT(*) FROM "Edition"
UNION ALL
SELECT 'Participantes', COUNT(*) FROM "Participant"
UNION ALL
SELECT 'Picks', COUNT(*) FROM "Pick"
UNION ALL
SELECT 'Partidos', COUNT(*) FROM "Match"
UNION ALL
SELECT 'Equipos', COUNT(*) FROM "Team"
UNION ALL
SELECT 'Transacciones Ledger', COUNT(*) FROM "Ledger";

-- 10. Verificar usuarios existentes (sin mostrar contraseñas)
SELECT 
    id,
    email,
    alias,
    "createdAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 10;

