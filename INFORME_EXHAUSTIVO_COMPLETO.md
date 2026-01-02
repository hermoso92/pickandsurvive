# INFORME EXHAUSTIVO COMPLETO
## Pick & Survive - Análisis Backend, Frontend y Base de Datos

**Fecha:** 03/12/2025  
**Versión del Proyecto:** 0.0.1  
**Estado:** En Desarrollo - Análisis Completo

---

## ÍNDICE

1. [Análisis del Backend](#1-análisis-del-backend)
2. [Análisis del Frontend](#2-análisis-del-frontend)
3. [Análisis de Base de Datos](#3-análisis-de-base-de-datos)
4. [Problemas Identificados](#4-problemas-identificados)
5. [Plan de Corrección Detallado](#5-plan-de-corrección-detallado)
6. [Plan de Migración de Base de Datos](#6-plan-de-migración-de-base-de-datos)
7. [Documentación de Soluciones](#7-documentación-de-soluciones)

---

## 1. ANÁLISIS DEL BACKEND

### 1.1 Estructura General

**Framework:** NestJS 10.0.0  
**Lenguaje:** TypeScript 5.1.3  
**ORM:** Prisma 5.15.0  
**Base de Datos:** PostgreSQL (local, puerto 5432)  
**Puerto:** 9998

### 1.2 Módulos Identificados (13 módulos)

1. **AppModule** - Módulo raíz
2. **PrismaModule** - Servicio global de Prisma
3. **UsersModule** - Gestión de usuarios
4. **AuthModule** - Autenticación JWT
5. **EditionsModule** - Gestión de ediciones
6. **PicksModule** - Gestión de predicciones
7. **MatchesModule** - Gestión de partidos
8. **FootballDataModule** - Integración con API externa
9. **LeaguesModule** - Gestión de ligas
10. **LedgerModule** - Sistema financiero
11. **AdminModule** - Administración
12. **EmailModule** - Envío de emails
13. **SimpleAuthModule** - ⚠️ NO UTILIZADO (duplicado)

### 1.3 Problemas de Estructura

#### 1.3.1 Duplicación de Controladores de Autenticación

**Archivos afectados:**
- `src/auth/auth.controller.ts` - Controlador principal (EN USO)
- `src/simple-auth.controller.ts` - Controlador duplicado (NO USO)
- `src/simple-auth.module.ts` - Módulo no utilizado
- `src/app-simple.module.ts` - Módulo no utilizado

**Problema:**
- Ambos controladores usan la ruta `/auth`
- `SimpleAuthController` devuelve datos falsos sin base de datos
- Confusión sobre cuál se está usando

**Impacto:** MEDIO - Código muerto que puede causar confusión

**Solución:** Eliminar `simple-auth.controller.ts`, `simple-auth.module.ts` y `app-simple.module.ts`

#### 1.3.2 Falta de Validación Global

**Problema:**
- No hay `ValidationPipe` global configurado
- Validaciones manuales en controladores
- Falta de DTOs con `class-validator`

**Impacto:** ALTO - Posibles errores de datos, falta de validación consistente

**Solución:** Configurar `ValidationPipe` global y crear DTOs

### 1.4 Análisis de Servicios (15 servicios)

#### 1.4.1 LedgerService (`ledger.service.ts`)

**Estado:** ✅ Parcialmente corregido

**Funcionalidades:**
- `getUserBalance()` - ✅ Corregido (UUID casting)
- `getEditionPot()` - ✅ Corregido (UUID casting)
- `getModeRollover()` - ✅ Corregido (UUID casting)
- `getMultipleUserBalances()` - ✅ Corregido (UUID casting)
- `createEntry()` - ⚠️ No valida estructura de `metaJson`
- `recordEntryFee()` - ⚠️ No está en transacción
- `recordPrizePayout()` - ⚠️ No está en transacción
- `recordRollover()` - ⚠️ No está en transacción

**Problemas:**
1. **Falta validación de tipos en `metaJson`**: Se acepta `any`, debería tener interfaz
2. **Operaciones no atómicas**: `recordEntryFee`, `recordPrizePayout`, `recordRollover` deberían estar en transacciones si se llaman desde fuera

**Líneas problemáticas:**
- Línea 11: `metaJson?: any;` - Debería ser interfaz tipada
- Línea 112-137: `recordEntryFee` no está en transacción
- Línea 142-167: `recordPrizePayout` no está en transacción

#### 1.4.2 EditionsService (`editions.service.ts`)

**Estado:** ✅ Mejorado recientemente

**Funcionalidades:**
- `findAll()` - ✅ Correcto
- `findOne()` - ✅ Correcto
- `joinEdition()` - ✅ Mejorado (validación de saldo, transacción)

**Problemas:**
1. **Duplicación con LeagueService**: Ambos tienen `joinEdition()`
2. **Falta validación de `configJson`**: No valida estructura

**Líneas problemáticas:**
- Línea 87-165: `joinEdition()` duplicado con `LeagueService.joinEdition()`
- Línea 70: `configJson` sin validación de estructura

#### 1.4.3 LeagueService (`leagues.service.ts`)

**Estado:** ✅ Funcional pero mejorable

**Funcionalidades:**
- `createLeague()` - ✅ Correcto
- `getUserLeagues()` - ✅ Correcto
- `joinEdition()` - ⚠️ No está en transacción completa
- `createInvite()` - ⚠️ Generación de token no segura
- `acceptInvite()` - ✅ Correcto

**Problemas:**
1. **`joinEdition()` no está en transacción**: Líneas 370-430, crea participante y luego llama a `ledgerService.recordEntryFee()` fuera de transacción
2. **Generación de token insegura**: Línea 435-442, usa `Math.random()` en lugar de `crypto.randomBytes()`

**Líneas problemáticas:**
- Línea 370-430: `joinEdition()` debería estar en transacción
- Línea 435-442: `generateInviteToken()` usa `Math.random()`

#### 1.4.4 MatchesService (`matches.service.ts`)

**Estado:** ✅ Bien implementado

**Funcionalidades:**
- `findByMatchday()` - ✅ Correcto
- `updateMatchResult()` - ✅ En transacción
- `getMatchesByMatchday()` - ✅ Correcto

**Problemas:**
1. **Lógica de eliminación puede fallar**: Línea 111, si `match.picks[0]` es undefined, falla
2. **No valida que el partido realmente terminó**: Solo verifica status, no tiempo transcurrido

**Líneas problemáticas:**
- Línea 111: `match.picks[0]?.participant.editionId` - Puede ser undefined si no hay picks
- Línea 54: Solo verifica `status === 'FINISHED'`, no valida tiempo

#### 1.4.5 PicksService (`picks.service.ts`)

**Estado:** ✅ Mejorado recientemente

**Funcionalidades:**
- `createPick()` - ✅ Validación de deadline agregada

**Problemas:**
1. **No está en transacción**: Línea 14-96, debería estar en transacción
2. **Falta validación de que el equipo juega en la jornada**: Ya se valida en línea 42-50, pero podría ser más explícito

**Líneas problemáticas:**
- Línea 14-96: `createPick()` no está en transacción
- Línea 42-50: Validación existe pero podría ser más robusta

#### 1.4.6 EditionAutoManagerService (`edition-auto-manager.service.ts`)

**Estado:** ⚠️ Funcional pero con problemas

**Funcionalidades:**
- `manageEditions()` - Cron job cada hora
- `processEdition()` - Procesa ediciones
- `processMatchResults()` - ⚠️ Validaciones mejoradas pero aún pueden fallar

**Problemas:**
1. **Hardcodeo de valores**: Líneas 104-105, 153-154
   - `season: 2025` hardcodeado
   - `competition: 'PD'` hardcodeado
2. **Validaciones temporales mejoradas pero no perfectas**: Líneas 159-193
3. **No maneja partidos postpuestos correctamente**: Solo los excluye, no los procesa después

**Líneas problemáticas:**
- Línea 104-105: `season: 2025, competition: 'PD'` hardcodeado
- Línea 153-154: Mismo hardcodeo
- Línea 159-193: Validaciones temporales pueden fallar en edge cases

#### 1.4.7 EmailService (`email.service.ts`)

**Estado:** ⚠️ Funcional pero con problemas de seguridad

**Funcionalidades:**
- `sendLeagueInvitation()` - ✅ Funcional
- `sendWelcomeEmail()` - ✅ Funcional

**Problemas:**
1. **Credenciales hardcodeadas como fallback**: Líneas 14-15
   - `user: process.env.EMAIL_USER || 'picksurvive@gmail.com'`
   - `pass: process.env.EMAIL_PASSWORD || 'MasterPick&survive'`
2. **No valida configuración al iniciar**: Constructor no verifica que las credenciales existan
3. **URLs hardcodeadas**: Líneas 27, 194, 224
   - `process.env.FRONTEND_URL || 'http://localhost:3000'`

**Líneas problemáticas:**
- Línea 14-15: Credenciales como fallback
- Línea 27: URL hardcodeada
- Línea 11-18: No valida configuración

### 1.5 Análisis de Controladores (11 controladores)

#### 1.5.1 Endpoints Totales Identificados

**Auth (3 endpoints):**
- `POST /auth/signup` - ✅ Con validación básica
- `POST /auth/login` - ⚠️ Sin validación DTO
- `GET /auth/profile` - ✅ Protegido

**Leagues (12 endpoints):**
- `POST /leagues` - ⚠️ Usa DTO pero sin validación
- `GET /leagues/mine` - ✅ Correcto
- `GET /leagues/:leagueId` - ✅ Correcto
- `GET /leagues/:leagueId/stats` - ✅ Correcto
- `POST /leagues/:leagueId/invites` - ⚠️ Sin validación DTO
- `POST /leagues/join` - ⚠️ Sin validación DTO
- `GET /leagues/:leagueId/members` - ✅ Correcto
- `POST /leagues/:leagueId/editions` - ⚠️ Usa DTO pero sin validación
- `GET /leagues/:leagueId/editions` - ✅ Correcto
- `POST /leagues/:leagueId/editions/:editionId/join` - ✅ Correcto
- `GET /leagues/:leagueId/ledger` - ✅ Correcto

**Editions (8 endpoints):**
- `GET /editions` - ✅ Público
- `GET /editions/:id` - ✅ Público
- `POST /editions/:id/join` - ✅ Protegido, mejorado
- `GET /editions/:id/stats` - ✅ Público
- `POST /editions/:id/process` - ✅ Protegido
- `GET /editions/:id/auto-stats` - ✅ Público
- `POST /editions/:id/restore-participants` - ✅ Protegido

**Matches (3 endpoints):**
- `GET /matches/jornada/:matchday` - ✅ Público
- `GET /matches/jornada/:matchday/detailed` - ✅ Público
- `POST /matches/:matchId/result` - ✅ Protegido

**Picks (1 endpoint):**
- `POST /editions/:editionId/picks` - ✅ Protegido

**Admin (2 endpoints):**
- `GET /admin/users` - ✅ Protegido, solo master
- `DELETE /admin/users/:userId` - ✅ Protegido, solo master

**Football-Data (11 endpoints):**
- Todos protegidos, solo master user
- ⚠️ Validación manual de master user en cada método

**Me (2 endpoints):**
- `GET /me/balance` - ✅ Protegido
- `GET /me/ledger` - ✅ Protegido

**Total: 42 endpoints**

#### 1.5.2 Problemas de Controladores

1. **Falta validación con DTOs**: La mayoría de endpoints usan `@Body() body: { ... }` en lugar de DTOs tipados
2. **Manejo de errores inconsistente**: Algunos usan excepciones NestJS, otros `Error` genérico
3. **Validación manual de master user**: `FootballDataController` tiene método `isMasterUser()` repetido

**Archivos afectados:**
- `auth.controller.ts` - Línea 24, 54: Sin DTOs
- `leagues.controller.ts` - Varios endpoints sin DTOs
- `matches.controller.ts` - Línea 27: Sin DTO
- `football-data.controller.ts` - Validación manual repetida

### 1.6 Seguridad

#### 1.6.1 Implementado Correctamente

- ✅ JWT authentication con Passport
- ✅ Bcrypt para contraseñas
- ✅ Guards en endpoints protegidos
- ✅ CORS configurado

#### 1.6.2 Problemas de Seguridad

1. **Rate Limiting**: No configurado
   - Falta `@nestjs/throttler`
   - No hay protección contra brute force

2. **Validación de Inputs**: Inconsistente
   - Algunos endpoints validan manualmente
   - Falta validación global

3. **CORS**: Múltiples orígenes hardcodeados
   - Línea 7 en `main.ts`: `['http://localhost:5174', 'http://localhost:3000', 'http://localhost:3002']`
   - Debería usar variable de entorno

4. **Credenciales en Código**: 
   - Email service tiene fallbacks hardcodeados
   - JWT_SECRET debería validarse al inicio

### 1.7 Logging

**Estado:** ✅ Mayormente correcto

- La mayoría de servicios usan `Logger` de NestJS
- No se encontraron `console.log` en backend
- Niveles de log apropiados (log, warn, error, debug)

**Mejoras sugeridas:**
- Agregar contexto a logs (request ID, user ID)
- Configurar formato de logs estructurado

---

## 2. ANÁLISIS DEL FRONTEND

### 2.1 Estructura General

**Framework:** Next.js 15.5.6  
**React:** 19.1.0  
**TypeScript:** 5.x  
**Estado:** Zustand 5.0.8  
**Estilos:** Tailwind CSS 4  
**Puerto:** 5174

### 2.2 Estructura de Páginas (18 páginas)

#### Páginas Públicas (2):
1. `/` - Signup page
2. `/login` - Login page

#### Páginas Protegidas (16):
1. `/dashboard` - Dashboard principal
2. `/leagues` - Lista de ligas
3. `/leagues/create` - Crear liga
4. `/leagues/[id]` - Detalle de liga
5. `/leagues/[id]/manage` - Gestionar liga
6. `/leagues/[id]/join` - Unirse a liga
7. `/leagues/[id]/editions/create` - Crear edición
8. `/editions` - Lista de ediciones
9. `/editions/[id]` - Detalle de edición
10. `/editions/[id]/auto-status` - Estado automático
11. `/welcome` - Página de bienvenida
12. `/admin` - Panel de administración
13. `/admin/users` - Gestión de usuarios
14. `/football-admin` - Administración de datos de fútbol

### 2.3 Componentes (7 componentes)

1. **MainLayout** - Layout principal con sidebar
2. **UserIndependenceChecker** - ⚠️ TODO pendiente
3. **UserRoleInfo** - Muestra roles de usuario
4. **UserInfo** - Información del usuario
5. **LogoutButton** - Botón de logout
6. **ClearAuthButton** - Limpiar autenticación
7. **AuthDebug** - Debug de autenticación

### 2.4 Hooks (2 hooks)

1. **useAuth** - ✅ Bien implementado
   - Maneja autenticación
   - Obtiene perfil del usuario
   - Usa logger correctamente

2. **useLeagues** - ⚠️ Mejorable
   - Manejo de errores básico
   - Falta retry logic
   - Usa `console.error` en lugar de logger (líneas 64, 71)

### 2.5 Estado Global (Zustand)

**authStore.ts:**
- ✅ Implementación correcta
- ✅ Persistencia con localStorage
- ✅ Tipado correcto

**Falta:**
- Store para ligas/ediciones (se usa estado local en componentes)

### 2.6 Problemas Identificados en Frontend

#### 2.6.1 Uso de `alert()` (5 instancias)

**Archivos afectados:**
- `editions/[id]/page.tsx` - Líneas 101, 105, 120, 123
- `admin/page.tsx` - Línea 80, 85

**Problema:** `alert()` bloquea la UI y no es accesible

**Solución:** Implementar sistema de notificaciones/toast

#### 2.6.2 Uso de `console.error` (4 instancias)

**Archivos afectados:**
- `api/admin/users/route.ts` - Línea 30
- `api/admin/users/[userId]/route.ts` - Línea 27
- `leagues/[id]/manage/page.tsx` - Línea 32
- `leagues/[id]/page.tsx` - Línea 26
- `hooks/useLeagues.ts` - Líneas 64, 71

**Problema:** Debería usar `logger` utility

**Solución:** Reemplazar por `logger.error()`

#### 2.6.3 Falta de Validación Client-Side

**Archivos afectados:**
- `page.tsx` (signup) - Validación básica, falta validación de email
- `login/page.tsx` - Sin validación de formulario

**Problema:** No valida antes de enviar al backend

**Solución:** Agregar validación con librería (ej: zod, yup)

#### 2.6.4 Manejo de Estados de Carga Inconsistente

**Problema:** Algunos componentes muestran loading, otros no

**Archivos con buen manejo:**
- `dashboard/page.tsx` - ✅ Muestra loading
- `leagues/[id]/manage/page.tsx` - ✅ Muestra loading

**Archivos sin loading:**
- `editions/[id]/page.tsx` - Solo muestra texto "Cargando..."
- `leagues/[id]/page.tsx` - Manejo básico

#### 2.6.5 Lógica Compleja en Componentes

**Problema:** Algunos componentes tienen mucha lógica que debería estar en hooks

**Archivos afectados:**
- `editions/[id]/page.tsx` - 439 líneas, lógica compleja
- `leagues/[id]/editions/create/page.tsx` - Lógica de formulario compleja

**Solución:** Extraer lógica a hooks personalizados

#### 2.6.6 UserIndependenceChecker Incompleto

**Archivo:** `components/UserIndependenceChecker.tsx`

**Problema:**
- Línea 27: TODO pendiente de implementación
- No verifica realmente si el usuario tiene ligas
- Solo permite acceso sin verificar

**Solución:** Implementar verificación real de ligas

### 2.7 Configuración

**API Endpoints:**
- ✅ Centralizados en `config/api.ts`
- ✅ Usa `API_BASE_URL` correctamente
- ⚠️ Algunos componentes aún usan URLs directas

**Archivos con URLs directas:**
- `football-admin/page.tsx` - Línea 29: Usa `API_BASE_URL` directamente en lugar de `API_ENDPOINTS`

### 2.8 Problemas de UX

1. **Feedback visual inconsistente**: Algunas acciones no muestran feedback
2. **Estados de error básicos**: Solo texto, sin diseño
3. **Falta de confirmaciones**: Algunas acciones críticas no piden confirmación
4. **Loading states inconsistentes**: Algunos usan spinner, otros texto

---

## 3. ANÁLISIS DE BASE DE DATOS

### 3.1 Schema de Prisma

#### 3.1.1 Modelos Principales (10 modelos)

1. **User** - ✅ Correcto
   - Campos: id, email, alias, createdAt, password
   - Relaciones: correctas
   - Índices: email único

2. **League** - ✅ Correcto
   - Campos: id, name, ownerUserId, defaultConfigJson, visibility, createdAt
   - Relaciones: correctas

3. **LeagueMember** - ✅ Correcto
   - Campos: leagueId, userId, role, joinedAt
   - Clave primaria compuesta: correcta
   - Relaciones: correctas con onDelete: Cascade

4. **LeagueInvite** - ✅ Correcto
   - Campos: id, leagueId, email, status, invitedBy, token, expiresAt, createdAt
   - Índices: token único, (leagueId, email) único

5. **Edition** - ⚠️ **CAMPOS DUPLICADOS**
   - **Problema CRÍTICO**: Líneas 64-82
   - Campos duplicados:
     - `leagueId` (línea 73) y `league_id` (línea 75)
     - `configJson` (línea 70) y `config_json` (línea 76)
     - `endMatchday` (línea 72) y `end_matchday` (línea 77)
     - `createdAt` (línea 71) y `created_at` (línea 78)
   - **Impacto**: Confusión, posibles errores de datos, migraciones problemáticas

6. **Participant** - ✅ Correcto
   - Campos: id, status, userId, editionId
   - Clave única: (userId, editionId)

7. **Ledger** - ✅ Correcto
   - Campos: id, amountCents, type, createdAt, userId, editionId, leagueId, metaJson
   - Índices: correctos

8. **Team** - ✅ Correcto
   - Campos: id, name, shortName, createdAt, crest, externalId, lastSyncedAt, updatedAt
   - Índices: name único, externalId único

9. **Match** - ✅ Correcto
   - Campos: id, matchday, kickoffAt, status, homeGoals, awayGoals, homeTeamId, awayTeamId, competition, createdAt, externalId, lastSyncedAt, season, updatedAt
   - Índices: externalId único

10. **Pick** - ✅ Correcto
    - Campos: id, matchday, participantId, teamId, matchId
    - Relaciones: correctas

#### 3.1.2 Modelos Legacy (4 modelos en snake_case)

**Problema:** Estos modelos existen en el schema pero NO SE USAN

1. **`league`** (línea 162)
   - Tabla legacy con campos snake_case
   - No tiene relaciones definidas
   - No se usa en ningún servicio

2. **`league_invite`** (línea 172)
   - Tabla legacy
   - No se usa

3. **`league_member`** (línea 184)
   - Tabla legacy
   - No se usa

4. **`ledger`** (línea 194)
   - Tabla legacy con `BigInt` como ID
   - No se usa (se usa modelo `Ledger` con `String` ID)

**Impacto:** Confusión, posible uso accidental, migraciones problemáticas

### 3.2 Relaciones

**Estado:** ✅ Correctas

- Todas las relaciones están bien definidas
- `onDelete: Cascade` configurado donde corresponde
- Foreign keys correctas

### 3.3 Índices

**Índices presentes:**
- ✅ User.email (único)
- ✅ LeagueInvite.token (único)
- ✅ LeagueInvite (leagueId, email) (único)
- ✅ Participant (userId, editionId) (único)
- ✅ Team.name (único)
- ✅ Team.externalId (único)
- ✅ Match.externalId (único)
- ✅ Ledger (userId, editionId, leagueId, type, createdAt)

**Índices faltantes (sugeridos):**
- ⚠️ Edition.leagueId - Consultas frecuentes
- ⚠️ Edition.status - Filtrado frecuente
- ⚠️ Match.matchday - Consultas por jornada
- ⚠️ Match.status - Filtrado frecuente
- ⚠️ Pick.participantId - Consultas frecuentes

### 3.4 Tipos de Datos

**Problema:** Mezcla de tipos

- Modelos principales usan `String @id @default(cuid())`
- Modelos legacy usan `@db.Uuid` con `gen_random_uuid()`
- Ledger legacy usa `BigInt @id @default(autoincrement())`

**Impacto:** Confusión, posible incompatibilidad

### 3.5 Migraciones

**Migraciones presentes:**
1. `20251018144402_initial_setup`
2. `20251018155358_add_user_password`
3. `20251018213833_init_with_editions`
4. `20251018220706_add_teams_matches_picks`

**Problema:** No hay migración para limpiar campos duplicados

---

## 4. PROBLEMAS IDENTIFICADOS

### 4.1 CRÍTICOS (Bloquean funcionalidad)

#### C1: Schema Prisma con Campos Duplicados
**Archivo:** `prisma/schema.prisma`  
**Líneas:** 64-82  
**Severidad:** CRÍTICA  
**Descripción:** Modelo `Edition` tiene campos duplicados (camelCase y snake_case)  
**Impacto:** Confusión, errores de datos, migraciones problemáticas  
**Estado:** PENDIENTE

#### C2: Tablas Legacy en Schema
**Archivo:** `prisma/schema.prisma`  
**Líneas:** 162, 172, 184, 194  
**Severidad:** CRÍTICA  
**Descripción:** 4 modelos legacy no utilizados pero presentes en schema  
**Impacto:** Confusión, posible uso accidental  
**Estado:** PENDIENTE

#### C3: Duplicación de Controladores Auth
**Archivos:** `simple-auth.controller.ts`, `simple-auth.module.ts`, `app-simple.module.ts`  
**Severidad:** MEDIA (pero crítico para limpieza)  
**Descripción:** Controladores duplicados que pueden causar confusión  
**Impacto:** Código muerto, confusión  
**Estado:** PENDIENTE

### 4.2 ALTOS (Afectan estabilidad)

#### A1: Falta Transacciones en Operaciones Críticas
**Archivos:**
- `leagues.service.ts` línea 370-430 (`joinEdition`)
- `picks.service.ts` línea 14-96 (`createPick`)
- `ledger.service.ts` líneas 112-137, 142-167, 172-214

**Severidad:** ALTA  
**Descripción:** Operaciones que modifican múltiples tablas no están en transacciones  
**Impacto:** Posible inconsistencia de datos si falla a mitad de proceso  
**Estado:** PENDIENTE

#### A2: Eliminaciones Prematuras
**Archivo:** `edition-auto-manager.service.ts`  
**Líneas:** 147-233  
**Severidad:** ALTA  
**Descripción:** Aunque mejorado, aún puede eliminar participantes prematuramente  
**Impacto:** Jugadores eliminados incorrectamente  
**Estado:** MITIGADO pero no resuelto

#### A3: Hardcodeo de Valores
**Archivos:**
- `edition-auto-manager.service.ts` líneas 104-105, 153-154
- `football-admin/page.tsx` líneas 57-58

**Severidad:** ALTA  
**Descripción:** `season: 2025` y `competition: 'PD'` hardcodeados  
**Impacto:** No funciona para otras temporadas/competiciones  
**Estado:** PENDIENTE

#### A4: Credenciales como Fallback
**Archivo:** `email.service.ts`  
**Líneas:** 14-15  
**Severidad:** ALTA (seguridad)  
**Descripción:** Credenciales de email hardcodeadas como fallback  
**Impacto:** Riesgo de seguridad si se expone código  
**Estado:** PENDIENTE

#### A5: Duplicación de Lógica `joinEdition`
**Archivos:**
- `editions.service.ts` línea 87-165
- `leagues.service.ts` línea 370-430

**Severidad:** MEDIA-ALTA  
**Descripción:** Misma funcionalidad implementada dos veces  
**Impacto:** Mantenimiento difícil, posibles inconsistencias  
**Estado:** PENDIENTE

### 4.3 MEDIOS (Mejoras de calidad)

#### M1: Falta Validación con DTOs
**Archivos:** Todos los controladores  
**Severidad:** MEDIA  
**Descripción:** La mayoría de endpoints no usan DTOs con `class-validator`  
**Impacto:** Validación inconsistente, posibles errores de datos  
**Estado:** PENDIENTE

#### M2: Logging Inconsistente en Frontend
**Archivos:**
- `api/admin/users/route.ts`
- `api/admin/users/[userId]/route.ts`
- `leagues/[id]/manage/page.tsx`
- `leagues/[id]/page.tsx`
- `hooks/useLeagues.ts`

**Severidad:** MEDIA  
**Descripción:** Uso de `console.error` en lugar de `logger`  
**Impacto:** Difícil debugging, inconsistencia  
**Estado:** PENDIENTE

#### M3: Manejo de Errores Inconsistente
**Archivos:** Varios controladores  
**Severidad:** MEDIA  
**Descripción:** Algunos usan excepciones NestJS, otros `Error` genérico  
**Impacto:** Respuestas de error inconsistentes  
**Estado:** PENDIENTE

#### M4: Falta Rate Limiting
**Archivo:** `main.ts`, `app.module.ts`  
**Severidad:** MEDIA  
**Descripción:** No hay protección contra brute force o rate limiting  
**Impacto:** Vulnerable a ataques  
**Estado:** PENDIENTE

#### M5: Uso de `alert()` en Frontend
**Archivos:**
- `editions/[id]/page.tsx` (4 instancias)
- `admin/page.tsx` (2 instancias)

**Severidad:** MEDIA  
**Descripción:** `alert()` bloquea UI y no es accesible  
**Impacto:** Mala UX, no accesible  
**Estado:** PENDIENTE

#### M6: Falta Tests
**Archivos:** Todos los `.spec.ts` están vacíos o no existen  
**Severidad:** MEDIA  
**Descripción:** 0% de cobertura de tests  
**Impacto:** Difícil detectar regresiones  
**Estado:** PENDIENTE

#### M7: URLs Hardcodeadas
**Archivos:**
- `main.ts` línea 7 (CORS)
- `email.service.ts` líneas 27, 194, 224

**Severidad:** MEDIA  
**Descripción:** URLs hardcodeadas en lugar de variables de entorno  
**Impacto:** No funciona en diferentes entornos  
**Estado:** PENDIENTE

#### M8: UserIndependenceChecker Incompleto
**Archivo:** `components/UserIndependenceChecker.tsx`  
**Línea:** 27  
**Severidad:** MEDIA  
**Descripción:** TODO pendiente, no verifica realmente ligas  
**Impacto:** Funcionalidad incompleta  
**Estado:** PENDIENTE

---

## 5. PLAN DE CORRECCIÓN DETALLADO

### FASE 1: Correcciones Críticas (4-6 horas)

#### 1.1 Limpiar Schema de Prisma

**Tareas:**
1. Eliminar campos duplicados del modelo `Edition`
2. Eliminar modelos legacy (`league`, `league_invite`, `league_member`, `ledger`)
3. Crear migración de limpieza
4. Verificar que no hay referencias a campos legacy en código

**Archivos a modificar:**
- `prisma/schema.prisma` - Eliminar líneas 75-78, 162-209
- Crear nueva migración

**Riesgos:**
- Si hay datos en campos legacy, necesitar migración de datos
- Verificar que ningún servicio usa campos legacy

#### 1.2 Eliminar Código Duplicado

**Tareas:**
1. Eliminar `simple-auth.controller.ts`
2. Eliminar `simple-auth.module.ts`
3. Eliminar `app-simple.module.ts`
4. Verificar que `AppModule` no importa módulos no utilizados

**Archivos a eliminar:**
- `src/simple-auth.controller.ts`
- `src/simple-auth.module.ts`
- `src/app-simple.module.ts`

#### 1.3 Unificar Lógica `joinEdition`

**Tareas:**
1. Decidir cuál servicio mantener (recomendado: `LeagueService`)
2. Eliminar `joinEdition` de `EditionsService`
3. Actualizar `EditionsController` para usar `LeagueService`
4. Asegurar que está en transacción completa

**Archivos a modificar:**
- `src/editions/editions.service.ts` - Eliminar método
- `src/editions/editions.controller.ts` - Usar `LeagueService`
- `src/leagues/leagues.service.ts` - Mejorar transacción

### FASE 2: Mejoras de Estabilidad (6-8 horas)

#### 2.1 Agregar Transacciones Faltantes

**Tareas:**
1. Envolver `LeagueService.joinEdition()` en transacción completa
2. Envolver `PicksService.createPick()` en transacción
3. Revisar `LedgerService` - algunos métodos ya están bien

**Archivos a modificar:**
- `src/leagues/leagues.service.ts` línea 370-430
- `src/picks/picks.service.ts` línea 14-96

#### 2.2 Mejorar Validaciones de Eliminaciones

**Tareas:**
1. Aumentar buffer de seguridad temporal (de 10 a 15 minutos)
2. Agregar validación de que el partido realmente terminó (verificar tiempo)
3. Mejorar logs de eliminación

**Archivos a modificar:**
- `src/editions/edition-auto-manager.service.ts` líneas 147-233

#### 2.3 Mover Valores Hardcodeados a Configuración

**Tareas:**
1. Crear archivo de configuración para season/competition
2. Usar variables de entorno
3. Actualizar todos los lugares donde se usan

**Archivos a modificar:**
- `src/config/football-api.ts` - Agregar configuración
- `src/editions/edition-auto-manager.service.ts`
- `pick-survive-frontend/src/app/(protected)/football-admin/page.tsx`

#### 2.4 Eliminar Credenciales de Código

**Tareas:**
1. Eliminar fallbacks hardcodeados de `EmailService`
2. Validar que las variables de entorno existen al iniciar
3. Lanzar error claro si faltan

**Archivos a modificar:**
- `src/email/email.service.ts` líneas 11-18

#### 2.5 Corregir URLs Hardcodeadas

**Tareas:**
1. Mover CORS origins a variable de entorno
2. Corregir URLs en `EmailService`
3. Verificar todas las URLs en código

**Archivos a modificar:**
- `src/main.ts` línea 7
- `src/email/email.service.ts` líneas 27, 194, 224

### FASE 3: Mejoras de Calidad (8-10 horas)

#### 3.1 Implementar DTOs con Validación

**Tareas:**
1. Crear DTOs para todos los endpoints
2. Usar `class-validator` para validación
3. Configurar `ValidationPipe` global

**DTOs a crear:**
- `SignupDto`, `LoginDto` (auth)
- `CreateLeagueDto`, `CreateEditionDto` (leagues)
- `UpdateMatchResultDto` (matches)
- `CreatePickDto` (picks)
- Y más...

**Archivos a crear:**
- `src/auth/dto/signup.dto.ts`
- `src/auth/dto/login.dto.ts`
- `src/leagues/dto/create-league.dto.ts`
- `src/leagues/dto/create-edition.dto.ts`
- `src/matches/dto/update-result.dto.ts`
- `src/picks/dto/create-pick.dto.ts`

**Archivos a modificar:**
- `src/main.ts` - Agregar `ValidationPipe` global
- Todos los controladores - Usar DTOs

#### 3.2 Estandarizar Logging en Frontend

**Tareas:**
1. Reemplazar todos los `console.error` por `logger.error`
2. Reemplazar `console.log` por `logger.log` donde corresponda
3. Verificar que todos usan el logger utility

**Archivos a modificar:**
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[userId]/route.ts`
- `src/app/(protected)/leagues/[id]/manage/page.tsx`
- `src/app/(protected)/leagues/[id]/page.tsx`
- `src/hooks/useLeagues.ts`

#### 3.3 Mejorar Manejo de Errores

**Tareas:**
1. Crear filtro global de excepciones
2. Estandarizar formato de respuestas de error
3. Reemplazar `Error` genérico por excepciones NestJS

**Archivos a crear:**
- `src/common/filters/http-exception.filter.ts`

**Archivos a modificar:**
- `src/main.ts` - Registrar filtro
- Todos los controladores - Usar excepciones apropiadas

#### 3.4 Implementar Rate Limiting

**Tareas:**
1. Instalar `@nestjs/throttler`
2. Configurar en `AppModule`
3. Aplicar a endpoints sensibles (login, signup)

**Archivos a modificar:**
- `src/app.module.ts`
- `src/main.ts` (si es necesario)
- `src/auth/auth.controller.ts` - Aplicar guard

#### 3.5 Reemplazar `alert()` por Sistema de Notificaciones

**Tareas:**
1. Crear componente de notificaciones/toast
2. Crear hook `useNotifications`
3. Reemplazar todos los `alert()`

**Archivos a crear:**
- `src/components/Toast.tsx` o similar
- `src/hooks/useNotifications.ts`

**Archivos a modificar:**
- `src/app/(protected)/editions/[id]/page.tsx`
- `src/app/(protected)/admin/page.tsx`

#### 3.6 Agregar Tests Básicos

**Tareas:**
1. Configurar Jest correctamente
2. Crear tests para servicios críticos
3. Crear tests para endpoints principales

**Archivos a modificar:**
- Tests existentes (están vacíos)

### FASE 4: Optimizaciones (4-6 horas)

#### 4.1 Optimizar Consultas N+1

**Tareas:**
1. Identificar consultas N+1
2. Usar `include` apropiadamente
3. Agregar `select` donde sea necesario

#### 4.2 Agregar Índices Faltantes

**Tareas:**
1. Agregar índice en `Edition.leagueId`
2. Agregar índice en `Edition.status`
3. Agregar índice en `Match.matchday`
4. Agregar índice en `Match.status`
5. Agregar índice en `Pick.participantId`

**Archivo a modificar:**
- `prisma/schema.prisma`

#### 4.3 Mejorar Feedback Visual

**Tareas:**
1. Estandarizar estados de carga
2. Mejorar mensajes de error visuales
3. Agregar confirmaciones para acciones críticas

---

## 6. PLAN DE MIGRACIÓN DE BASE DE DATOS

### 6.1 Análisis de Datos Existentes

**Antes de migrar, verificar:**
1. ¿Hay datos en campos legacy?
2. ¿Hay datos en campos duplicados de `Edition`?
3. ¿Qué campos se están usando realmente?

### 6.2 Pasos de Migración

#### Paso 1: Backup
```sql
-- Crear backup completo
pg_dump -U postgres -d picksurvive > backup_pre_migration.sql
```

#### Paso 2: Verificar Uso de Campos
```sql
-- Verificar si hay datos en campos legacy
SELECT COUNT(*) FROM league;
SELECT COUNT(*) FROM league_invite;
SELECT COUNT(*) FROM league_member;
SELECT COUNT(*) FROM ledger;

-- Verificar campos duplicados en Edition
SELECT id, leagueId, league_id, configJson, config_json 
FROM "Edition" 
WHERE league_id IS NOT NULL OR config_json IS NOT NULL;
```

#### Paso 3: Migración de Datos (si es necesario)
```sql
-- Si hay datos en campos legacy, migrarlos
-- (Este paso solo si hay datos)
```

#### Paso 4: Actualizar Schema
1. Eliminar campos duplicados de `Edition`
2. Eliminar modelos legacy
3. Generar migración: `npx prisma migrate dev --name cleanup_duplicate_fields`

#### Paso 5: Verificar
1. Ejecutar aplicación
2. Verificar que no hay errores
3. Probar funcionalidades principales

### 6.3 Script de Migración SQL

```sql
-- Script para limpiar campos duplicados (si hay datos)
-- IMPORTANTE: Ejecutar solo después de verificar que no hay datos importantes

-- Si hay datos en league_id pero no en leagueId, copiarlos
UPDATE "Edition" 
SET "leagueId" = "league_id"::text 
WHERE "leagueId" IS NULL AND "league_id" IS NOT NULL;

-- Similar para otros campos si es necesario
```

---

## 7. DOCUMENTACIÓN DE SOLUCIONES

### 7.1 Solución: Limpiar Schema Prisma

**Archivo:** `prisma/schema.prisma`

**Cambios:**
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
  // ELIMINAR: league_id, config_json, end_matchday, created_at
  league        League        @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  ledgerEntries Ledger[]
  participants  Participant[]
}

// ELIMINAR modelos legacy:
// - league (línea 162)
// - league_invite (línea 172)
// - league_member (línea 184)
// - ledger (línea 194)
```

### 7.2 Solución: Agregar Transacciones

**Archivo:** `src/leagues/leagues.service.ts`

**Cambio:**
```typescript
async joinEdition(editionId: string, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    // ... validaciones ...
    
    // Crear participante
    const participant = await tx.participant.create({
      data: { userId, editionId, status: 'ACTIVE' },
    });

    // Registrar entrada en el ledger dentro de la transacción
    await tx.ledger.create({
      data: {
        userId,
        leagueId: edition.leagueId,
        editionId,
        type: 'ENTRY_FEE',
        amountCents: -edition.entryFeeCents,
        metaJson: { /* ... */ },
      },
    });

    return participant;
  });
}
```

### 7.3 Solución: Crear DTOs

**Archivo:** `src/auth/dto/signup.dto.ts` (nuevo)

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  alias?: string;
}
```

**Archivo:** `src/auth/auth.controller.ts`

**Cambio:**
```typescript
@Post('signup')
async signUp(@Body() body: SignupDto) {
  // Validación automática por ValidationPipe
  return this.authService.signUp(body.email, body.password, body.alias);
}
```

### 7.4 Solución: Configurar ValidationPipe Global

**Archivo:** `src/main.ts`

**Cambio:**
```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Agregar ValidationPipe global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // ... resto del código
}
```

### 7.5 Solución: Sistema de Notificaciones

**Archivo:** `src/components/Toast.tsx` (nuevo)

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return { toasts, showToast };
};

// Componente ToastContainer para mostrar toasts
export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

### 7.6 Solución: Mover Valores a Configuración

**Archivo:** `src/config/football-api.ts`

**Cambio:**
```typescript
export const FOOTBALL_API_CONFIG = {
  BASE_URL: 'https://api.football-data.org/v4',
  DEFAULT_SEASON: parseInt(process.env.DEFAULT_SEASON || '2025'),
  DEFAULT_COMPETITION: process.env.DEFAULT_COMPETITION || 'PD',
  // ...
};
```

**Archivo:** `src/editions/edition-auto-manager.service.ts`

**Cambio:**
```typescript
import { FOOTBALL_API_CONFIG } from '../config/football-api';

// En getCurrentMatchday:
where: {
  season: FOOTBALL_API_CONFIG.DEFAULT_SEASON,
  competition: FOOTBALL_API_CONFIG.DEFAULT_COMPETITION,
  // ...
}
```

### 7.7 Solución: Eliminar Credenciales Hardcodeadas

**Archivo:** `src/email/email.service.ts`

**Cambio:**
```typescript
constructor() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD environment variables are required');
  }
  
  this.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}
```

### 7.8 Solución: Rate Limiting

**Archivo:** `src/app.module.ts`

**Cambio:**
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // ... otros imports
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto
      limit: 10, // 10 requests por minuto
    }]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

---

## 8. RESUMEN EJECUTIVO

### 8.1 Estadísticas

- **Total de problemas identificados:** 17
  - Críticos: 3
  - Altos: 5
  - Medios: 9

- **Archivos a modificar:** 35+
- **Archivos a eliminar:** 3
- **Archivos a crear:** 15+

### 8.2 Prioridades

**Inmediatas (esta semana):**
1. Limpiar schema Prisma
2. Eliminar código duplicado
3. Agregar transacciones faltantes

**Corto plazo (próximas 2 semanas):**
4. Implementar DTOs
5. Mejorar validaciones
6. Reemplazar alert()

**Medio plazo (próximo mes):**
7. Agregar tests
8. Optimizar consultas
9. Mejorar UX

### 8.3 Riesgos

**Alto riesgo:**
- Migración de schema puede romper datos existentes
- Eliminar código puede romper funcionalidad si hay referencias

**Medio riesgo:**
- Cambios en transacciones pueden afectar performance
- Agregar validaciones puede romper clientes existentes

**Bajo riesgo:**
- Mejoras de UX
- Agregar tests
- Optimizaciones

### 8.4 Recomendaciones

1. **Hacer backup completo** antes de cualquier cambio en schema
2. **Probar en entorno de desarrollo** antes de producción
3. **Implementar cambios gradualmente** (no todo a la vez)
4. **Documentar cada cambio** para facilitar rollback
5. **Comunicar cambios** a equipo si hay uno

---

**Fin del Informe Exhaustivo**

