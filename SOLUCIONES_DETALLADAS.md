# SOLUCIONES DETALLADAS
## Guía de Implementación de Correcciones

**Fecha:** 03/12/2025  
**Basado en:** INFORME_EXHAUSTIVO_COMPLETO.md

---

## ÍNDICE

1. [Soluciones Críticas](#1-soluciones-críticas)
2. [Soluciones de Alta Prioridad](#2-soluciones-de-alta-prioridad)
3. [Soluciones de Prioridad Media](#3-soluciones-de-prioridad-media)
4. [Ejemplos de Código Completos](#4-ejemplos-de-código-completos)

---

## 1. SOLUCIONES CRÍTICAS

### 1.1 Limpiar Schema Prisma

**Problema:** Campos duplicados en `Edition` y modelos legacy no utilizados

**Solución Completa:**

**Archivo:** `prisma/schema.prisma`

```prisma
// ANTES (líneas 63-82):
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
  league_id     String?       @db.Uuid          // ELIMINAR
  config_json   Json          @default("{}")    // ELIMINAR
  end_matchday  Int?                              // ELIMINAR
  created_at    DateTime      @default(now()) @db.Timestamptz(6) // ELIMINAR
  league        League        @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  ledgerEntries Ledger[]
  participants  Participant[]
}

// DESPUÉS:
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
  league        League        @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  ledgerEntries Ledger[]
  participants  Participant[]
  
  @@index([leagueId])
  @@index([status])
}
```

**Eliminar modelos legacy (líneas 161-209):**
```prisma
// ELIMINAR COMPLETAMENTE estos 4 modelos:
// - league (línea 162)
// - league_invite (línea 172)
// - league_member (línea 184)
// - ledger (línea 194)
```

**Actualizar código que usa campos legacy:**

**Archivo:** `src/ledger/ledger.service.ts` línea 101

```typescript
// ANTES:
async getModeRollover(leagueId: string, mode: string): Promise<number> {
  const result = await this.prisma.$queryRaw<[{ rollover_cents: bigint }]>(
    Prisma.sql`
      SELECT SUM(CASE 
        WHEN type = 'ROLLOVER_IN' THEN amount_cents
        WHEN type = 'ROLLOVER_OUT' THEN -amount_cents
        ELSE 0 
      END) as rollover_cents
      FROM ledger ld
      JOIN edition e ON ld.edition_id = e.id
      WHERE e.league_id = ${leagueId}::uuid AND e.mode = ${mode}
        AND ld.type IN ('ROLLOVER_IN', 'ROLLOVER_OUT')
    `
  );
  return Number(result[0]?.rollover_cents || 0);
}

// DESPUÉS:
async getModeRollover(leagueId: string, mode: string): Promise<number> {
  const result = await this.prisma.$queryRaw<[{ rollover_cents: bigint }]>(
    Prisma.sql`
      SELECT SUM(CASE 
        WHEN type = 'ROLLOVER_IN' THEN amount_cents
        WHEN type = 'ROLLOVER_OUT' THEN -amount_cents
        ELSE 0 
      END) as rollover_cents
      FROM "Ledger" ld
      JOIN "Edition" e ON ld."editionId" = e.id
      WHERE e."leagueId" = ${leagueId}::text AND e.mode = ${mode}
        AND ld.type IN ('ROLLOVER_IN', 'ROLLOVER_OUT')
    `
  );
  return Number(result[0]?.rollover_cents || 0);
}
```

**Comandos:**
```bash
# 1. Hacer backup
pg_dump -U postgres -d picksurvive > backup_pre_cleanup.sql

# 2. Actualizar schema.prisma (eliminar campos y modelos)

# 3. Generar migración
cd pick-survive-backend
npx prisma migrate dev --name cleanup_duplicate_fields_and_legacy_models

# 4. Regenerar cliente
npx prisma generate

# 5. Actualizar código (ledger.service.ts)

# 6. Probar aplicación
npm run start:dev
```

### 1.2 Eliminar Código Duplicado

**Problema:** Controladores de autenticación duplicados

**Solución:**

**Archivos a eliminar:**
1. `src/simple-auth.controller.ts`
2. `src/simple-auth.module.ts`
3. `src/app-simple.module.ts`

**Verificar que no se importan:**

**Archivo:** `src/app.module.ts`
```typescript
// Verificar que NO importa:
// - SimpleAuthModule
// - AppSimpleModule
// - SimpleAuthController
```

**Comandos:**
```bash
# Eliminar archivos
rm pick-survive-backend/src/simple-auth.controller.ts
rm pick-survive-backend/src/simple-auth.module.ts
rm pick-survive-backend/src/app-simple.module.ts

# Verificar que no hay referencias
grep -r "simple-auth" pick-survive-backend/src
grep -r "app-simple" pick-survive-backend/src
```

### 1.3 Unificar Lógica `joinEdition`

**Problema:** `joinEdition` implementado en dos servicios

**Solución:** Mantener en `LeagueService`, eliminar de `EditionsService`

**Archivo:** `src/editions/editions.service.ts`

**Eliminar método completo (líneas 87-165 aproximadamente):**
```typescript
// ELIMINAR este método completo:
async joinEdition(editionId: string, userId: string) {
  // ... código completo ...
}
```

**Archivo:** `src/editions/editions.controller.ts`

**Cambiar:**
```typescript
// ANTES:
import { EditionsService } from './editions.service';

@Controller('editions')
export class EditionsController {
  constructor(
    private readonly editionsService: EditionsService,
    // ...
  ) {}

  @Post(':id/join')
  async join(@Param('id') editionId: string, @Req() req) {
    return this.editionsService.joinEdition(editionId, req.user.id);
  }
}

// DESPUÉS:
import { LeagueService } from '../leagues/leagues.service';

@Controller('editions')
export class EditionsController {
  constructor(
    private readonly editionsService: EditionsService,
    private readonly leagueService: LeagueService, // Agregar
    // ...
  ) {}

  @Post(':id/join')
  async join(@Param('id') editionId: string, @Req() req) {
    return this.leagueService.joinEdition(editionId, req.user.id);
  }
}
```

**Archivo:** `src/editions/editions.module.ts`

**Agregar:**
```typescript
import { LeaguesModule } from '../leagues/leagues.module';

@Module({
  imports: [
    LeaguesModule, // Agregar
    // ...
  ],
  // ...
})
export class EditionsModule {}
```

---

## 2. SOLUCIONES DE ALTA PRIORIDAD

### 2.1 Agregar Transacciones Faltantes

#### 2.1.1 LeagueService.joinEdition

**Archivo:** `src/leagues/leagues.service.ts`

**ANTES (líneas 370-430):**
```typescript
async joinEdition(editionId: string, userId: string) {
  // ... validaciones ...
  
  // Crear participante
  const participant = await this.prisma.participant.create({
    data: { userId, editionId, status: 'ACTIVE' },
  });

  // Registrar entrada en el ledger (FUERA de transacción)
  await this.ledgerService.recordEntryFee(userId, editionId, edition.entryFeeCents);

  return participant;
}
```

**DESPUÉS:**
```typescript
async joinEdition(editionId: string, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    // ... validaciones usando tx en lugar de this.prisma ...
    
    const edition = await tx.edition.findUnique({
      where: { id: editionId },
      include: { league: true },
    });
    
    // ... resto de validaciones ...
    
    // Crear participante
    const participant = await tx.participant.create({
      data: { userId, editionId, status: 'ACTIVE' },
    });

    // Registrar entrada en el ledger DENTRO de la transacción
    await tx.ledger.create({
      data: {
        userId,
        leagueId: edition.leagueId,
        editionId,
        type: 'ENTRY_FEE',
        amountCents: -edition.entryFeeCents,
        metaJson: {
          entryFee: edition.entryFeeCents,
          editionName: edition.name,
          leagueName: edition.league.name,
        },
      },
    });

    return participant;
  });
}
```

**Nota:** Esto requiere modificar `LedgerService.recordEntryFee` para aceptar un cliente de transacción opcional, o hacer la creación directamente aquí.

#### 2.1.2 PicksService.createPick

**Archivo:** `src/picks/picks.service.ts`

**ANTES:**
```typescript
async createPick(userId: string, editionId: string, teamId: string) {
  // ... validaciones ...
  
  // Crear el pick
  return this.prisma.pick.create({
    data: {
      participantId: participant.id,
      teamId: teamId,
      matchId: match.id,
      matchday: edition.startMatchday,
    },
  });
}
```

**DESPUÉS:**
```typescript
async createPick(userId: string, editionId: string, teamId: string) {
  return this.prisma.$transaction(async (tx) => {
    // ... todas las validaciones usando tx ...
    
    // Crear el pick dentro de la transacción
    return tx.pick.create({
      data: {
        participantId: participant.id,
        teamId: teamId,
        matchId: match.id,
        matchday: edition.startMatchday,
      },
    });
  });
}
```

### 2.2 Mover Valores Hardcodeados a Configuración

**Archivo:** `src/config/football-api.ts`

**ANTES:**
```typescript
export const FOOTBALL_API_CONFIG = {
  BASE_URL: 'https://api.football-data.org/v4',
  COMPETITIONS: {
    LALIGA: 'PD', // Primera División (LaLiga)
  },
  // ...
};
```

**DESPUÉS:**
```typescript
export const FOOTBALL_API_CONFIG = {
  BASE_URL: 'https://api.football-data.org/v4',
  DEFAULT_SEASON: parseInt(process.env.DEFAULT_SEASON || '2025'),
  DEFAULT_COMPETITION: process.env.DEFAULT_COMPETITION || 'PD',
  COMPETITIONS: {
    LALIGA: process.env.DEFAULT_COMPETITION || 'PD',
  },
  // ...
};
```

**Archivo:** `src/editions/edition-auto-manager.service.ts`

**Cambiar líneas 104-105 y 153-154:**
```typescript
// ANTES:
where: {
  season: 2025,
  competition: 'PD',
  // ...
}

// DESPUÉS:
import { FOOTBALL_API_CONFIG } from '../config/football-api';

where: {
  season: FOOTBALL_API_CONFIG.DEFAULT_SEASON,
  competition: FOOTBALL_API_CONFIG.DEFAULT_COMPETITION,
  // ...
}
```

**Archivo:** `.env` (backend)

**Agregar:**
```env
DEFAULT_SEASON=2025
DEFAULT_COMPETITION=PD
```

### 2.3 Eliminar Credenciales Hardcodeadas

**Archivo:** `src/email/email.service.ts`

**ANTES (líneas 9-18):**
```typescript
constructor() {
  this.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'picksurvive@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'MasterPick&survive',
    },
  });
}
```

**DESPUÉS:**
```typescript
constructor() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    throw new Error(
      'EMAIL_USER and EMAIL_PASSWORD environment variables are required. ' +
      'Please set them in your .env file.'
    );
  }
  
  this.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
  
  this.logger.log('Email service initialized successfully');
}
```

**Archivo:** `src/email/email.service.ts` líneas 27, 194, 224

**Cambiar URLs hardcodeadas:**
```typescript
// ANTES:
const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/leagues/${leagueId}/join`;

// DESPUÉS:
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error('FRONTEND_URL environment variable is required');
}
const invitationLink = `${frontendUrl}/leagues/${leagueId}/join`;
```

**Archivo:** `.env` (backend)

**Verificar/Agregar:**
```env
FRONTEND_URL=http://localhost:5174
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-app
```

### 2.4 Corregir CORS Hardcodeado

**Archivo:** `src/main.ts`

**ANTES (línea 7):**
```typescript
app.enableCors({
  origin: ['http://localhost:5174', 'http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
});
```

**DESPUÉS:**
```typescript
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5174'];

app.enableCors({
  origin: corsOrigins,
  credentials: true,
});
```

**Archivo:** `.env` (backend)

**Agregar:**
```env
CORS_ORIGINS=http://localhost:5174,http://localhost:3000
```

---

## 3. SOLUCIONES DE PRIORIDAD MEDIA

### 3.1 Implementar DTOs con Validación

#### 3.1.1 Instalar Dependencias

```bash
cd pick-survive-backend
npm install class-validator class-transformer
```

#### 3.1.2 Crear DTOs

**Archivo:** `src/auth/dto/signup.dto.ts` (nuevo)

```typescript
import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede tener más de 100 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El alias no puede tener más de 50 caracteres' })
  alias?: string;
}
```

**Archivo:** `src/auth/dto/login.dto.ts` (nuevo)

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;
}
```

**Archivo:** `src/matches/dto/update-result.dto.ts` (nuevo)

```typescript
import { IsInt, Min, Max } from 'class-validator';

export class UpdateMatchResultDto {
  @IsInt({ message: 'Los goles del equipo local deben ser un número entero' })
  @Min(0, { message: 'Los goles no pueden ser negativos' })
  @Max(50, { message: 'Los goles no pueden ser mayores a 50' })
  homeGoals: number;

  @IsInt({ message: 'Los goles del equipo visitante deben ser un número entero' })
  @Min(0, { message: 'Los goles no pueden ser negativos' })
  @Max(50, { message: 'Los goles no pueden ser mayores a 50' })
  awayGoals: number;
}
```

**Archivo:** `src/picks/dto/create-pick.dto.ts` (nuevo)

```typescript
import { IsString, IsUUID } from 'class-validator';

export class CreatePickDto {
  @IsUUID(4, { message: 'El ID del equipo debe ser un UUID válido' })
  teamId: string;
}
```

#### 3.1.3 Configurar ValidationPipe Global

**Archivo:** `src/main.ts`

```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Agregar ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  
  // ... resto del código ...
}
```

#### 3.1.4 Actualizar Controladores

**Archivo:** `src/auth/auth.controller.ts`

```typescript
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  // ...

  @Post('signup')
  async signUp(@Body() body: SignupDto) {
    // Validación automática por ValidationPipe
    return this.authService.signUp(body.email, body.password, body.alias);
  }

  @Post('login')
  signIn(@Body() body: LoginDto) {
    // Validación automática
    return this.authService.signIn(body.email, body.password);
  }
}
```

**Archivo:** `src/matches/matches.controller.ts`

```typescript
import { UpdateMatchResultDto } from './dto/update-result.dto';

@Controller('matches')
export class MatchesController {
  @Post(':matchId/result')
  updateMatchResult(
    @Param('matchId') matchId: string,
    @Body() body: UpdateMatchResultDto
  ) {
    return this.matchesService.updateMatchResult(
      matchId, 
      body.homeGoals, 
      body.awayGoals
    );
  }
}
```

**Archivo:** `src/picks/picks.controller.ts`

```typescript
import { CreatePickDto } from './dto/create-pick.dto';

@Controller('editions/:editionId/picks')
export class PicksController {
  @Post()
  @UseGuards(AuthGuard('jwt'))
  createPick(
    @Param('editionId') editionId: string,
    @Body() body: CreatePickDto,
    @Req() req
  ) {
    return this.picksService.createPick(
      req.user.id,
      editionId,
      body.teamId
    );
  }
}
```

### 3.2 Estandarizar Logging en Frontend

**Archivo:** `src/hooks/useLeagues.ts`

**ANTES (líneas 64, 71):**
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error('Error response:', response.status, errorText);
  throw new Error(`Error al cargar las ligas: ${response.status} ${errorText}`);
}

// ...

} catch (err) {
  console.error('Error en fetchLeagues:', err);
  setError(err instanceof Error ? err.message : 'Error desconocido');
}
```

**DESPUÉS:**
```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('useLeagues');

// ...

if (!response.ok) {
  const errorText = await response.text();
  logger.error('Error al cargar ligas', new Error(`${response.status}: ${errorText}`));
  throw new Error(`Error al cargar las ligas: ${response.status} ${errorText}`);
}

// ...

} catch (err) {
  logger.error('Error en fetchLeagues', err);
  setError(err instanceof Error ? err.message : 'Error desconocido');
}
```

**Aplicar mismo cambio en:**
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[userId]/route.ts`
- `src/app/(protected)/leagues/[id]/manage/page.tsx`
- `src/app/(protected)/leagues/[id]/page.tsx`

### 3.3 Sistema de Notificaciones (Reemplazar alert)

**Archivo:** `src/hooks/useToast.ts` (nuevo)

```typescript
'use client';

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000); // 5 segundos
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};
```

**Archivo:** `src/components/ToastContainer.tsx` (nuevo)

```typescript
'use client';

import { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => {
        const bgColor = {
          success: 'bg-green-500',
          error: 'bg-red-500',
          info: 'bg-blue-500',
          warning: 'bg-yellow-500',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-[500px] animate-slide-in`}
          >
            <p className="flex-1">{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

**Archivo:** `src/app/(protected)/editions/[id]/page.tsx`

**ANTES:**
```typescript
alert('¡Te has unido exitosamente a la edición!');
```

**DESPUÉS:**
```typescript
import { useToast } from '@/hooks/useToast';

export default function EditionDetailPage() {
  const { showToast } = useToast();
  
  // ...
  
  const handleJoin = async () => {
    // ...
    showToast('¡Te has unido exitosamente a la edición!', 'success');
    // ...
  };
}
```

**Archivo:** `src/app/layout.tsx` o `src/components/MainLayout.tsx`

**Agregar ToastContainer:**
```typescript
import { ToastContainer } from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';

// En el componente:
const { toasts, removeToast } = useToast();

return (
  <>
    {/* ... contenido ... */}
    <ToastContainer toasts={toasts} onRemove={removeToast} />
  </>
);
```

### 3.4 Rate Limiting

**Instalar:**
```bash
cd pick-survive-backend
npm install @nestjs/throttler
```

**Archivo:** `src/app.module.ts`

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // ... otros imports ...
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

**Archivo:** `src/auth/auth.controller.ts`

**Aplicar rate limiting más estricto a login/signup:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @Post('login')
  signIn(@Body() body: LoginDto) {
    return this.authService.signIn(body.email, body.password);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registros por minuto
  @Post('signup')
  async signUp(@Body() body: SignupDto) {
    return this.authService.signUp(body.email, body.password, body.alias);
  }
}
```

### 3.5 Implementar UserIndependenceChecker

**Archivo:** `src/components/UserIndependenceChecker.tsx`

**ANTES (línea 27):**
```typescript
// TODO: Implementar verificación de ligas de forma más robusta
```

**DESPUÉS:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues } from '@/hooks/useLeagues';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserIndependenceChecker');

interface UserIndependenceCheckerProps {
  children: React.ReactNode;
}

export default function UserIndependenceChecker({ children }: UserIndependenceCheckerProps) {
  const { user, isAuthenticated } = useAuth();
  const { leagues, loading } = useLeagues();
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (loading) {
      return; // Esperar a que carguen las ligas
    }

    setHasChecked(true);

    // Verificar si el usuario tiene al menos una liga
    // Si no tiene ligas, redirigir a welcome
    if (leagues.length === 0) {
      logger.info('Usuario sin ligas, redirigiendo a welcome');
      router.push('/welcome');
      return;
    }

    logger.info(`Usuario tiene ${leagues.length} liga(s)`);
  }, [isAuthenticated, user, leagues, loading, router]);

  if (!hasChecked || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## 4. EJEMPLOS DE CÓDIGO COMPLETOS

### 4.1 DTO Completo para Crear Liga

**Archivo:** `src/leagues/dto/create-league.dto.ts` (nuevo)

```typescript
import { IsString, IsObject, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PayoutSchemaDto {
  @IsIn(['winner_takes_all', 'table'])
  type: 'winner_takes_all' | 'table';

  @IsOptional()
  splits?: number[];
}

class RulesDto {
  picks_hidden?: boolean;
  no_repeat_team?: boolean;
  lifeline_enabled?: boolean;
  sudden_death?: boolean;
  pick_deadline?: string;
}

class DefaultConfigDto {
  entry_fee_cents?: number;
  timezone?: string;
  
  @ValidateNested()
  @Type(() => PayoutSchemaDto)
  payout_schema?: PayoutSchemaDto;
  
  @ValidateNested()
  @Type(() => RulesDto)
  rules?: RulesDto;
  
  modes_enabled?: ('ELIMINATORIO' | 'LIGA')[];
}

export class CreateLeagueDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DefaultConfigDto)
  defaultConfigJson?: DefaultConfigDto;

  @IsOptional()
  @IsIn(['PRIVATE', 'PUBLIC'])
  visibility?: 'PRIVATE' | 'PUBLIC';
}
```

### 4.2 Filtro Global de Excepciones

**Archivo:** `src/common/filters/http-exception.filter.ts` (nuevo)

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || message,
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json(errorResponse);
  }
}
```

**Archivo:** `src/main.ts`

**Agregar:**
```typescript
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Agregar filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // ... resto del código ...
}
```

---

## 5. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Críticas
- [ ] Backup de base de datos creado
- [ ] Schema Prisma limpiado
- [ ] Migración generada y aplicada
- [ ] Código actualizado (ledger.service.ts)
- [ ] Archivos duplicados eliminados
- [ ] Lógica joinEdition unificada
- [ ] Pruebas realizadas

### Fase 2: Alta Prioridad
- [ ] Transacciones agregadas
- [ ] Valores hardcodeados movidos a configuración
- [ ] Credenciales eliminadas de código
- [ ] CORS configurado con variables de entorno
- [ ] Pruebas realizadas

### Fase 3: Prioridad Media
- [ ] DTOs creados e implementados
- [ ] ValidationPipe configurado
- [ ] Logging estandarizado en frontend
- [ ] Sistema de notificaciones implementado
- [ ] Rate limiting configurado
- [ ] UserIndependenceChecker completado
- [ ] Pruebas realizadas

### Fase 4: Optimizaciones
- [ ] Índices agregados
- [ ] Consultas N+1 optimizadas
- [ ] Feedback visual mejorado
- [ ] Pruebas realizadas

---

**Fin de Soluciones Detalladas**

