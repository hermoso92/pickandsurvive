# PLAN DE MIGRACIÓN DE BASE DE DATOS
## Limpieza de Schema Prisma - Campos Duplicados y Modelos Legacy

**Fecha:** 03/12/2025  
**Objetivo:** Eliminar campos duplicados del modelo `Edition` y modelos legacy no utilizados

---

## 1. ANÁLISIS PRE-MIGRACIÓN

### 1.1 Campos Duplicados en `Edition`

**Campos a eliminar:**
- `league_id` (línea 75) - Duplicado de `leagueId` (línea 73)
- `config_json` (línea 76) - Duplicado de `configJson` (línea 70)
- `end_matchday` (línea 77) - Duplicado de `endMatchday` (línea 72)
- `created_at` (línea 78) - Duplicado de `createdAt` (línea 71)

**Campos a mantener:**
- `leagueId` (camelCase, con relación)
- `configJson` (camelCase)
- `endMatchday` (camelCase)
- `createdAt` (camelCase)

### 1.2 Modelos Legacy a Eliminar

1. **`league`** (líneas 162-169)
   - No tiene relaciones definidas
   - No se usa en ningún servicio
   - Usa `@db.Uuid` y `gen_random_uuid()`

2. **`league_invite`** (líneas 172-181)
   - No se usa
   - Usa `@db.Uuid` y `@db.Citext`

3. **`league_member`** (líneas 184-191)
   - No se usa
   - Usa `@db.Uuid`

4. **`ledger`** (líneas 194-209)
   - No se usa (se usa modelo `Ledger` con `String` ID)
   - Usa `BigInt` como ID

### 1.3 Referencias en Código

**Única referencia encontrada:**
- `ledger.service.ts` línea 101: Usa `e.league_id` en query SQL raw
  - **Acción:** Cambiar a `e.leagueId` o usar alias correcto

---

## 2. VERIFICACIÓN DE DATOS

### 2.1 Scripts de Verificación

**Antes de migrar, ejecutar:**

```sql
-- 1. Verificar si hay datos en campos legacy
SELECT COUNT(*) as total_legacy_leagues FROM league;
SELECT COUNT(*) as total_legacy_invites FROM league_invite;
SELECT COUNT(*) as total_legacy_members FROM league_member;
SELECT COUNT(*) as total_legacy_ledger FROM ledger;

-- 2. Verificar campos duplicados en Edition
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

-- 3. Verificar si hay datos importantes en campos legacy
SELECT * FROM league LIMIT 5;
SELECT * FROM league_invite LIMIT 5;
SELECT * FROM league_member LIMIT 5;
SELECT * FROM ledger LIMIT 5;
```

### 2.2 Decisión de Migración de Datos

**Si hay datos en campos legacy:**
- **Opción A:** Migrar datos a modelos principales (si son importantes)
- **Opción B:** Eliminar datos legacy (si no son importantes)

**Si hay datos en campos duplicados:**
- Copiar datos de campos snake_case a camelCase antes de eliminar

---

## 3. PLAN DE MIGRACIÓN PASO A PASO

### PASO 1: Backup Completo

```bash
# Backup completo de la base de datos
pg_dump -U postgres -d picksurvive -F c -f backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump

# O en formato SQL
pg_dump -U postgres -d picksurvive -f backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

**Verificar backup:**
```bash
# Verificar que el backup se creó correctamente
ls -lh backup_pre_migration_*.dump
```

### PASO 2: Migración de Datos (si es necesario)

**Solo ejecutar si hay datos en campos duplicados:**

```sql
-- Copiar datos de campos legacy a campos principales
-- IMPORTANTE: Solo si hay datos en campos legacy

-- Para league_id -> leagueId (si hay datos)
UPDATE "Edition" 
SET "leagueId" = "league_id"::text 
WHERE "leagueId" IS NULL 
  AND "league_id" IS NOT NULL;

-- Para config_json -> configJson (si hay datos)
UPDATE "Edition" 
SET "configJson" = "config_json" 
WHERE "configJson" = '{}'::jsonb 
  AND "config_json" IS NOT NULL 
  AND "config_json" != '{}'::jsonb;

-- Para end_matchday -> endMatchday (si hay datos)
UPDATE "Edition" 
SET "endMatchday" = "end_matchday" 
WHERE "endMatchday" IS NULL 
  AND "end_matchday" IS NOT NULL;

-- Para created_at -> createdAt (si hay datos)
UPDATE "Edition" 
SET "createdAt" = "created_at" 
WHERE "createdAt" IS NULL 
  AND "created_at" IS NOT NULL;
```

### PASO 3: Actualizar Código

**Archivo:** `src/ledger/ledger.service.ts`

**Línea 101 - Cambiar:**
```typescript
// ANTES:
WHERE e.league_id = ${leagueId}::uuid AND e.mode = ${mode}

// DESPUÉS:
WHERE e."leagueId" = ${leagueId}::text AND e.mode = ${mode}
```

**Nota:** Prisma usa camelCase en queries, pero en SQL raw puede necesitar comillas dobles.

### PASO 4: Actualizar Schema Prisma

**Archivo:** `prisma/schema.prisma`

**Cambios:**

1. **Eliminar campos duplicados del modelo `Edition` (líneas 75-78):**
```prisma
model Edition {
  id            String        @id @default(cuid())
  name          String
  status        String        @default("OPEN")
  startMatchday Int
  entryFeeCents Int           @default(500)
  potCents      Int           @default(0)
  configJson    Json          @default("{}")
  createdAt     DateTime      @default(now())
  endMatchday   Int?
  leagueId      String
  mode          String        @default("ELIMINATORIO")
  // ELIMINAR estas líneas:
  // league_id     String?       @db.Uuid
  // config_json   Json          @default("{}")
  // end_matchday  Int?
  // created_at    DateTime      @default(now()) @db.Timestamptz(6)
  league        League        @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  ledgerEntries Ledger[]
  participants  Participant[]
}
```

2. **Eliminar modelos legacy completos (líneas 161-209):**
```prisma
// ELIMINAR TODO ESTE BLOQUE:
/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
model league {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                String
  owner_user_id       String   @db.Uuid
  default_config_json Json     @default("{}")
  visibility          String   @default("PRIVATE")
  created_at          DateTime @default(now()) @db.Timestamptz(6)
}

/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
model league_invite {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  league_id  String   @db.Uuid
  email      String   @db.Citext
  status     String   @default("PENDING")
  invited_by String   @db.Uuid
  token      String
  expires_at DateTime @db.Timestamptz(6)
  created_at DateTime @default(now()) @db.Timestamptz(6)
}

/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
model league_member {
  league_id String   @db.Uuid
  user_id   String   @db.Uuid
  role      String   @default("PLAYER")
  joined_at DateTime @default(now()) @db.Timestamptz(6)

  @@id([league_id, user_id])
}

/// This table contains check constraints and requires additional setup for migrations. Visit https://pris.ly/d/check-constraints for more info.
model ledger {
  id           BigInt   @id @default(autoincrement())
  user_id      String?  @db.Uuid
  league_id    String?  @db.Uuid
  edition_id   String?  @db.Uuid
  type         String
  amount_cents BigInt
  meta_json    Json?    @default("{}")
  created_at   DateTime @default(now()) @db.Timestamptz(6)

  @@index([created_at], map: "idx_ledger_created_at")
  @@index([edition_id], map: "idx_ledger_edition_id")
  @@index([league_id], map: "idx_ledger_league_id")
  @@index([type], map: "idx_ledger_type")
  @@index([user_id], map: "idx_ledger_user_id")
}
```

### PASO 5: Generar Migración

```bash
cd pick-survive-backend

# Generar migración
npx prisma migrate dev --name cleanup_duplicate_fields_and_legacy_models

# Esto creará una nueva migración que:
# 1. Elimina columnas duplicadas de Edition
# 2. Elimina tablas legacy (league, league_invite, league_member, ledger)
```

### PASO 6: Verificar Migración

**Después de generar la migración, revisar el archivo SQL:**

```bash
# Ver la migración generada
cat prisma/migrations/[timestamp]_cleanup_duplicate_fields_and_legacy_models/migration.sql
```

**Verificar que:**
- Elimina columnas correctas
- No elimina datos importantes
- No rompe relaciones

### PASO 7: Aplicar Migración

```bash
# Aplicar migración
npx prisma migrate deploy

# O en desarrollo:
npx prisma migrate dev
```

### PASO 8: Regenerar Prisma Client

```bash
# Regenerar cliente Prisma
npx prisma generate
```

### PASO 9: Verificar Aplicación

1. **Iniciar backend:**
```bash
npm run start:dev
```

2. **Verificar que no hay errores:**
   - Revisar logs del backend
   - Probar endpoints principales
   - Verificar que las consultas funcionan

3. **Probar funcionalidades:**
   - Crear liga
   - Crear edición
   - Unirse a edición
   - Hacer pick
   - Ver balance

---

## 4. ROLLBACK PLAN

### Si algo sale mal:

```bash
# 1. Restaurar backup
pg_restore -U postgres -d picksurvive backup_pre_migration_[timestamp].dump

# 2. Revertir migración de Prisma
npx prisma migrate resolve --rolled-back [migration_name]

# 3. Restaurar schema anterior
git checkout HEAD -- prisma/schema.prisma
npx prisma generate
```

---

## 5. VERIFICACIÓN POST-MIGRACIÓN

### 5.1 Verificar Schema

```sql
-- Verificar que los campos duplicados fueron eliminados
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
```

### 5.2 Verificar Funcionalidad

**Endpoints a probar:**
1. `GET /editions` - Debe funcionar
2. `GET /editions/:id` - Debe funcionar
3. `POST /editions/:id/join` - Debe funcionar
4. `GET /me/balance` - Debe funcionar
5. `GET /leagues/:id/ledger` - Debe funcionar

### 5.3 Verificar Logs

**Buscar errores relacionados con:**
- `league_id` (no debe aparecer)
- `config_json` (no debe aparecer)
- `end_matchday` (no debe aparecer)
- `created_at` en Edition (no debe aparecer)
- Referencias a tablas legacy

---

## 6. RIESGOS Y MITIGACIÓN

### 6.1 Riesgos Identificados

1. **Pérdida de datos en campos legacy**
   - **Mitigación:** Verificar antes de eliminar, hacer backup

2. **Ruptura de código que usa campos legacy**
   - **Mitigación:** Buscar referencias antes de eliminar (ya hecho)

3. **Problemas con migración de Prisma**
   - **Mitigación:** Revisar SQL generado antes de aplicar

4. **Problemas de performance**
   - **Mitigación:** Agregar índices si es necesario después

### 6.2 Checklist Pre-Migración

- [ ] Backup completo creado
- [ ] Verificación de datos ejecutada
- [ ] Código actualizado (ledger.service.ts)
- [ ] Schema actualizado
- [ ] Migración generada y revisada
- [ ] Plan de rollback preparado
- [ ] Entorno de desarrollo listo para pruebas

### 6.3 Checklist Post-Migración

- [ ] Migración aplicada sin errores
- [ ] Prisma Client regenerado
- [ ] Backend inicia sin errores
- [ ] Endpoints principales funcionan
- [ ] No hay referencias a campos legacy en logs
- [ ] Funcionalidades críticas probadas

---

## 7. NOTAS ADICIONALES

### 7.1 Índices Faltantes (Agregar después)

Después de la migración, considerar agregar estos índices:

```prisma
model Edition {
  // ... campos ...
  
  @@index([leagueId])
  @@index([status])
}

model Match {
  // ... campos ...
  
  @@index([matchday])
  @@index([status])
}

model Pick {
  // ... campos ...
  
  @@index([participantId])
}
```

### 7.2 Migración de Datos Legacy (si es necesario)

Si hay datos importantes en tablas legacy, crear script de migración:

```sql
-- Ejemplo: Migrar datos de league legacy a League
INSERT INTO "League" (id, name, "ownerUserId", "defaultConfigJson", visibility, "createdAt")
SELECT 
  id::text,
  name,
  owner_user_id::text,
  default_config_json,
  visibility,
  created_at
FROM league
WHERE id NOT IN (SELECT id FROM "League");
```

---

**Fin del Plan de Migración**

