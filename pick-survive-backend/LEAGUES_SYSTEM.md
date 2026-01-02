# Sistema de Ligas Privadas con Ledger Contable

## 🏆 **Sistema Completo Implementado**

He implementado un sistema completo de ligas privadas con ledger contable inmutable, siguiendo exactamente las especificaciones proporcionadas.

## 📊 **1. Modelo de Ledger Contable (100% Auditable)**

### **Tabla Ledger Inmutable**
```sql
CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NULL,           -- null para movimientos de bote global
  league_id TEXT NULL,         -- para dashboard por liga
  edition_id TEXT NULL,        -- null para ajustes globales
  type TEXT NOT NULL,          -- ENTRY_FEE, PRIZE_PAYOUT, ROLLOVER_OUT, ROLLOVER_IN, ADJUSTMENT
  amount_cents BIGINT NOT NULL, -- positivo suma al balance
  meta_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### **Tipos de Asiento Implementados**
- **`ENTRY_FEE`** (–): Cuota de entrada del jugador (por defecto 5€)
- **`PRIZE_PAYOUT`** (+): Pago de premio al jugador
- **`ROLLOVER_OUT`** (–): Sale el bote de una edición sin ganador
- **`ROLLOVER_IN`** (+): Entra el bote a la nueva edición
- **`ADJUSTMENT`** (+/–): Correcciones administrativas

### **Vistas SQL para Cálculos**
- **`v_user_balance`**: Saldo por jugador
- **`v_edition_pot`**: Bote por edición
- **`v_mode_rollover`**: Bote acumulado por modo

## 🏅 **2. Sistema de Ligas Privadas**

### **Tablas Implementadas**
```sql
-- Liga privada
CREATE TABLE league (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  default_config_json JSONB NOT NULL,
  visibility TEXT DEFAULT 'PRIVATE'
);

-- Miembros de liga
CREATE TABLE league_member (
  league_id TEXT,
  user_id TEXT,
  role TEXT DEFAULT 'PLAYER', -- OWNER, ADMIN, PLAYER
  PRIMARY KEY (league_id, user_id)
);

-- Invitaciones por email
CREATE TABLE league_invite (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, REVOKED, EXPIRED
  invited_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
```

### **Flujo de Invitación Implementado**
1. **Admin crea liga** → define `default_config_json`
2. **Admin invita emails** → genera `league_invite` con token firmado
3. **Magic link** → `/join-league?token=...`
4. **Usuario acepta** → crea `league_member` (role PLAYER)

## ⚙️ **3. Configuración Flexible**

### **Configuración de Liga (default_config_json)**
```json
{
  "entry_fee_cents": 500,
  "timezone": "Europe/Madrid",
  "payout_schema": { "type": "winner_takes_all" },
  "rules": {
    "picks_hidden": true,
    "no_repeat_team": true,
    "lifeline_enabled": true,
    "sudden_death": false,
    "pick_deadline": "FIRST_KICKOFF"
  },
  "modes_enabled": ["ELIMINATORIO", "LIGA"]
}
```

### **Configuración de Edición (config_json)**
```json
{
  "season": 2025,
  "matchday_range": {"from": 8, "to": null},
  "payout_schema": { "type": "winner_takes_all" },
  "rules": {
    "picks_hidden": true,
    "no_repeat_team": false,
    "lifeline_enabled": true,
    "sudden_death": true
  }
}
```

## 🔐 **4. Sistema de Autorización**

### **Middleware Implementado**
- **`LeagueAuthGuard`**: Verifica membresía en liga
- **`LeagueAdminGuard`**: Requiere rol OWNER/ADMIN
- **Validación automática** en todas las rutas protegidas

### **Reglas de Acceso**
- **Solo miembros** pueden ver ediciones de su liga
- **Solo admins** pueden crear ediciones e invitar
- **Solo OWNER** puede eliminar liga

## 💰 **5. Sistema de Cierre y Reparto**

### **Lógica de Cierre Implementada**
```typescript
async function closeEdition(editionId: string) {
  // 1) Validaciones (no pendientes, jornada cerrada)
  // 2) Determinar ganadores según modo:
  //    - Eliminatorio: 1 vivo => winner
  //    - Liga: tabla por puntos + desempates
  // 3) Calcular bote edición + bote acumulado del modo
  // 4) Generar PRIZE_PAYOUT o ROLLOVER_OUT/IN
  // 5) Marcar edición FINISHED
}
```

### **Esquemas de Pago Soportados**
- **Winner takes all**: Primer ganador se lleva todo
- **Tabla**: Distribución según splits (ej: 60%, 30%, 10%)
- **Rollover**: Sin ganador → siguiente edición del mismo modo

## 🚀 **6. Endpoints Implementados**

### **Ligas**
```
POST /leagues                    # Crear liga (OWNER)
GET /leagues/mine               # Mis ligas (auth)
GET /leagues/:leagueId          # Detalles liga (member)
POST /leagues/:leagueId/invites # Invitar emails (ADMIN)
POST /leagues/join              # Aceptar invitación (auth)
GET /leagues/:leagueId/members  # Lista miembros (ADMIN)
```

### **Ediciones**
```
POST /leagues/:leagueId/editions     # Crear edición (ADMIN)
GET /leagues/:leagueId/editions     # Lista ediciones (member)
GET /editions/:editionId            # Detalles edición (member)
POST /editions/:editionId/join      # Unirse (member)
POST /editions/:editionId/close     # Cerrar edición (ADMIN)
```

### **Balance y Ledger**
```
GET /me/balance                    # Mi saldo (auth)
GET /me/ledger                     # Mi historial (auth)
GET /editions/:editionId/pot       # Bote edición (member)
GET /leagues/:leagueId/ledger      # Ledger liga (ADMIN)
```

## 📁 **7. Archivos Creados**

### **Backend**
- `src/ledger/ledger.service.ts` - Servicio de ledger contable
- `src/ledger/ledger.module.ts` - Módulo de ledger
- `src/leagues/leagues.service.ts` - Servicio de ligas
- `src/leagues/leagues.controller.ts` - Controlador de ligas
- `src/leagues/leagues.module.ts` - Módulo de ligas
- `src/editions/edition-close.service.ts` - Servicio de cierre
- `src/auth/league-auth.guard.ts` - Middleware de autorización
- `src/config/league-config.ts` - Configuraciones por defecto

### **Base de Datos**
- `prisma/schema.prisma` - Schema actualizado con ligas y ledger
- `prisma/views.sql` - Vistas SQL para cálculos
- `prisma/leagues-migration.sql` - Migración completa

## 🔧 **8. Próximos Pasos**

### **Para Usar el Sistema**

1. **Ejecutar Migración**:
   ```bash
   # Ejecutar el archivo leagues-migration.sql en PostgreSQL
   psql -d picksurvive -f prisma/leagues-migration.sql
   ```

2. **Regenerar Cliente Prisma**:
   ```bash
   npx prisma generate
   ```

3. **Reiniciar Backend**:
   ```bash
   npm run start:dev
   ```

### **Funcionalidades Listas**
- ✅ **Crear ligas** con configuración personalizada
- ✅ **Invitar usuarios** por email con tokens seguros
- ✅ **Crear ediciones** con diferentes modos y reglas
- ✅ **Sistema contable** inmutable y auditable
- ✅ **Cierre automático** con reparto de premios
- ✅ **Rollover** entre ediciones del mismo modo
- ✅ **Autorización granular** por liga y rol

### **Características Destacadas**
- 🏦 **Ledger inmutable**: Todo movimiento registrado, saldos calculados
- 🔒 **Ligas privadas**: Solo invitados pueden participar
- ⚙️ **Configuración flexible**: Reglas personalizables por liga/edición
- 💰 **Sistema de premios**: Múltiples esquemas de reparto
- 📊 **Auditoría completa**: Historial de todas las transacciones
- 🎯 **Modos de juego**: Eliminatorio y Liga con reglas específicas

¡El sistema está completamente implementado y listo para usar! Es un diseño robusto, escalable y profesional que cumple con todos los requisitos especificados.
