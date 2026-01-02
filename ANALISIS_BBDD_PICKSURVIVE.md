# 🔍 ANÁLISIS DE BASE DE DATOS PICKSURVIVE
## Verificación Completa de Estructura y Datos

**Base de datos:** picksurvive  
**Usuario:** postgres  
**Contraseña:** cosigein  
**Host:** localhost  
**Puerto:** 5432

---

## 📋 TABLAS ESPERADAS (Según schema.prisma)

La base de datos debe tener **10 tablas principales**:

1. ✅ **User** - Usuarios del sistema
2. ✅ **League** - Ligas privadas
3. ✅ **LeagueMember** - Miembros de ligas
4. ✅ **LeagueInvite** - Invitaciones a ligas
5. ✅ **Edition** - Ediciones/torneos
6. ✅ **Participant** - Participantes en ediciones
7. ✅ **Ledger** - Sistema de contabilidad
8. ✅ **Team** - Equipos de fútbol
9. ✅ **Match** - Partidos
10. ✅ **Pick** - Predicciones de usuarios

**Tabla adicional:**
- ✅ **_prisma_migrations** - Historial de migraciones

---

## 🔍 CONSULTAS PARA VERIFICAR EN PGADMIN

### 1. Verificar todas las tablas existentes

```sql
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Resultado esperado:** Debe mostrar las 10 tablas + _prisma_migrations

---

### 2. Contar registros por tabla

```sql
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
```

**Interpretación:**
- Si todas tienen 0 → Base de datos vacía (estructura correcta)
- Si hay números > 0 → Hay datos importados

---

### 3. Verificar estructura de tabla User

```sql
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;
```

**Columnas esperadas:**
- `id` (text/varchar) - NOT NULL
- `email` (text/varchar) - NOT NULL, UNIQUE
- `alias` (text/varchar) - NULLABLE
- `password` (text/varchar) - NOT NULL
- `createdAt` (timestamp) - NOT NULL

---

### 4. Verificar estructura de tabla League

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'League'
ORDER BY ordinal_position;
```

**Columnas esperadas:**
- `id` (text/varchar)
- `name` (text/varchar)
- `ownerUserId` (text/varchar)
- `defaultConfigJson` (jsonb)
- `visibility` (text/varchar)
- `createdAt` (timestamp)

---

### 5. Verificar estructura de tabla Edition

```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Edition'
ORDER BY ordinal_position;
```

**Columnas esperadas:**
- `id` (text/varchar)
- `name` (text/varchar)
- `status` (text/varchar)
- `entryFeeCents` (integer)
- `potCents` (integer)
- `startMatchday` (integer)
- `endMatchday` (integer, nullable)
- `mode` (text/varchar)
- `configJson` (jsonb)
- `leagueId` (text/varchar)
- `createdAt` (timestamp)

---

### 6. Verificar Foreign Keys (Relaciones)

```sql
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
```

**Relaciones esperadas:**
- League.ownerUserId → User.id
- LeagueMember.leagueId → League.id
- LeagueMember.userId → User.id
- Edition.leagueId → League.id
- Participant.userId → User.id
- Participant.editionId → Edition.id
- Pick.participantId → Participant.id
- Pick.teamId → Team.id
- Pick.matchId → Match.id
- Match.homeTeamId → Team.id
- Match.awayTeamId → Team.id
- Ledger.userId → User.id (nullable)
- Ledger.leagueId → League.id (nullable)
- Ledger.editionId → Edition.id (nullable)

---

### 7. Verificar índices

```sql
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Índices esperados:**
- Primary keys en todas las tablas (id)
- Unique en User.email
- Unique en LeagueInvite.token
- Unique en Team.name
- Unique en Team.externalId
- Unique en Match.externalId
- Unique en Participant(userId, editionId)
- Unique en LeagueInvite(leagueId, email)
- Índices en Ledger: userId, editionId, leagueId, type, createdAt

---

### 8. Verificar migraciones de Prisma

```sql
SELECT 
    migration_name,
    finished_at,
    applied_steps_count
FROM _prisma_migrations
ORDER BY finished_at DESC;
```

**Resultado esperado:** Debe mostrar las migraciones aplicadas

---

### 9. Verificar datos de ejemplo

```sql
-- Ver usuarios (sin contraseñas)
SELECT 
    id,
    email,
    alias,
    "createdAt"
FROM "User"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Ver ligas
SELECT 
    id,
    name,
    "ownerUserId",
    visibility,
    "createdAt"
FROM "League"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Ver ediciones
SELECT 
    id,
    name,
    status,
    "entryFeeCents",
    "potCents",
    "startMatchday",
    mode,
    "leagueId"
FROM "Edition"
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Estructura

- [ ] Las 10 tablas principales existen
- [ ] Tabla _prisma_migrations existe
- [ ] Todas las columnas esperadas están presentes
- [ ] Foreign keys están configuradas correctamente
- [ ] Índices están creados
- [ ] Constraints (UNIQUE, NOT NULL) están aplicados

### Datos

- [ ] Hay usuarios (o está vacía pero lista para usar)
- [ ] Las relaciones funcionan correctamente
- [ ] No hay datos corruptos

---

## 🔧 SI FALTAN TABLAS O COLUMNAS

### Opción 1: Ejecutar migraciones de Prisma

```powershell
cd pick-survive-backend

# Actualizar .env con tus credenciales
# DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public

# Generar Prisma Client
npx prisma generate

# Aplicar migraciones
npx prisma migrate deploy
```

### Opción 2: Crear desde schema

```powershell
cd pick-survive-backend

# Actualizar .env
# DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public

# Crear base de datos desde schema
npx prisma db push
```

---

## 📝 ACTUALIZAR CONFIGURACIÓN DEL PROYECTO

Una vez verificado que la base de datos está correcta, actualiza el `.env`:

**Archivo:** `pick-survive-backend/.env`

```env
DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public
```

Luego:

```powershell
cd pick-survive-backend
npx prisma generate
```

---

## 🚨 PROBLEMAS COMUNES

### Error: "relation does not exist"

**Causa:** Falta la tabla

**Solución:** Ejecutar migraciones:
```powershell
npx prisma migrate deploy
```

### Error: "column does not exist"

**Causa:** Falta la columna o nombre incorrecto

**Solución:** Verificar schema.prisma y ejecutar:
```powershell
npx prisma db push
```

### Error: "foreign key constraint fails"

**Causa:** Datos inconsistentes o falta relación

**Solución:** Verificar datos o recrear base de datos limpia

---

## 📊 RESUMEN

Ejecuta estas consultas en pgAdmin para verificar:

1. ✅ **Tablas existentes** - Debe haber 10 + _prisma_migrations
2. ✅ **Estructura correcta** - Columnas según schema.prisma
3. ✅ **Relaciones** - Foreign keys configuradas
4. ✅ **Índices** - Optimizaciones aplicadas
5. ✅ **Datos** - Si hay datos o está vacía

**Si todo está correcto:**
- Actualiza `.env` con tus credenciales
- Ejecuta `npx prisma generate`
- La aplicación debería funcionar

---

**Documento creado:** $(Get-Date -Format "dd/MM/yyyy HH:mm")

