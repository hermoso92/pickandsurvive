# 📖 ANÁLISIS COMPLETO DE LA APLICACIÓN
## Pick & Survive - Guía Completa para Nuevos Desarrolladores

**Fecha de Análisis:** $(Get-Date -Format "dd/MM/yyyy")  
**Versión del Proyecto:** 0.0.1  
**Estado:** En Desarrollo

---

## 🎯 ¿QUÉ ES ESTA APLICACIÓN?

### Concepto Principal

**Pick & Survive** es una **plataforma de predicciones deportivas** tipo "Survivor" donde:

1. **Los usuarios crean ligas privadas** con amigos/familia
2. **Cada liga tiene ediciones** (torneos por jornada de fútbol)
3. **Los jugadores predicen ganadores** de partidos
4. **Si aciertas, continúas** - **Si fallas, quedas eliminado**
5. **El último en pie gana el premio** (bote acumulado)

### Analogía Simple

Es como el juego de "Survivor" pero con fútbol:
- Empiezas con un grupo de jugadores
- Cada jornada predices quién ganará un partido
- Si aciertas, sigues jugando
- Si fallas, quedas eliminado
- El último que sobrevive gana todo el dinero

---

## 🎮 ¿CÓMO FUNCIONA EL JUEGO?

### Flujo Completo del Juego

```
1. CREAR LIGA
   └─> Usuario crea una liga privada
   └─> Configura reglas (monto de entrada, modo de juego)
   └─> Invita amigos por email

2. CREAR EDICIÓN
   └─> Dentro de la liga, se crea una "edición" (torneo)
   └─> Se define qué jornada de fútbol cubre
   └─> Se establece el monto de entrada (ej: 5€)

3. UNIRSE A EDICIÓN
   └─> Los jugadores se unen pagando la entrada
   └─> El dinero va al "bote" (pot) de la edición
   └─> Todos empiezan con status "ACTIVE"

4. HACER PREDICCIONES (PICKS)
   └─> Cada jugador elige qué equipo ganará en cada partido
   └─> Puede elegir solo equipos que jueguen en esa jornada
   └─> Una vez hecho el pick, no se puede cambiar

5. RESULTADOS DE PARTIDOS
   └─> Cuando termina un partido, se actualiza el resultado
   └─> El sistema verifica quién acertó y quién falló
   └─> Los que fallaron → status cambia a "ELIMINATED"
   └─> Los que acertaron → siguen "ACTIVE"

6. FINALIZACIÓN
   └─> Cuando queda solo 1 jugador activo → GANA
   └─> O cuando terminan todos los partidos de la jornada
   └─> El ganador recibe el bote completo
   └─> Si nadie gana, el bote se "rollover" (pasa a la siguiente edición)
```

### Ejemplo Práctico

**Liga:** "Amigos del Barrio"  
**Edición:** "Jornada 15 - LaLiga"  
**Entrada:** 5€ por jugador  
**Jugadores:** 10 personas = 50€ en el bote

**Jornada 15:**
- Partido 1: Real Madrid vs Barcelona
  - 8 jugadores predicen Real Madrid ✅
  - 2 jugadores predicen Barcelona ❌
  - **Resultado:** Real Madrid gana 2-1
  - **Eliminados:** Los 2 que predijeron Barcelona
  - **Activos:** 8 jugadores

- Partido 2: Atlético vs Sevilla
  - 5 jugadores predicen Atlético ✅
  - 3 jugadores predicen Sevilla ❌
  - **Resultado:** Atlético gana 1-0
  - **Eliminados:** Los 3 que predijeron Sevilla
  - **Activos:** 5 jugadores

- ... y así hasta que quede 1 ganador que se lleva los 50€

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico

```
┌─────────────────────────────────────────────────┐
│              FRONTEND (Cliente)                 │
│  Next.js 15 + React 19 + TypeScript            │
│  Tailwind CSS + Zustand (State Management)     │
│  Puerto: 5174                                   │
└─────────────────────────────────────────────────┘
                    ↕ HTTP/REST
┌─────────────────────────────────────────────────┐
│              BACKEND (Servidor)                 │
│  NestJS 10 + TypeScript                         │
│  Prisma ORM + PostgreSQL                        │
│  JWT Authentication                             │
│  Puerto: 9998                                   │
└─────────────────────────────────────────────────┘
                    ↕ SQL
┌─────────────────────────────────────────────────┐
│              BASE DE DATOS                      │
│  PostgreSQL 13 (Docker)                        │
│  Puerto: 5432                                   │
└─────────────────────────────────────────────────┘
                    ↕ API Externa
┌─────────────────────────────────────────────────┐
│         API EXTERNA DE FÚTBOL                  │
│  Football-Data.org                              │
│  (Equipos, partidos, resultados)                │
└─────────────────────────────────────────────────┘
```

### Estructura de Carpetas

```
pickandsurvive/
├── pick-survive-backend/          # API REST (NestJS)
│   ├── src/
│   │   ├── auth/                  # Autenticación JWT
│   │   ├── users/                 # Gestión de usuarios
│   │   ├── leagues/               # Sistema de ligas
│   │   ├── editions/              # Ediciones (torneos)
│   │   ├── picks/                 # Predicciones de usuarios
│   │   ├── matches/                # Partidos de fútbol
│   │   ├── ledger/                # Sistema de contabilidad (dinero)
│   │   ├── email/                 # Envío de emails
│   │   ├── football-data/         # Integración con API externa
│   │   └── prisma/                # Servicio de base de datos
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de datos
│   │   └── migrations/             # Migraciones SQL
│   └── docker-compose.yml         # PostgreSQL en Docker
│
└── pick-survive-frontend/         # Interfaz Web (Next.js)
    ├── src/
    │   ├── app/                   # Páginas (App Router)
    │   │   ├── (protected)/       # Páginas que requieren login
    │   │   │   ├── dashboard/      # Panel principal
    │   │   │   ├── leagues/        # Gestión de ligas
    │   │   │   └── editions/       # Ver ediciones
    │   │   ├── login/              # Página de login
    │   │   └── page.tsx            # Página de registro
    │   ├── components/             # Componentes React
    │   ├── hooks/                  # Custom hooks
    │   ├── config/                 # Configuración (API URLs)
    │   └── utils/                  # Utilidades (logger)
    └── public/                     # Archivos estáticos
```

---

## 🗄️ BASE DE DATOS - ESTRUCTURA COMPLETA

### Modelos Principales

La base de datos tiene **12 tablas** relacionadas:

#### 1. **User** (Usuarios)
```sql
- id: Identificador único
- email: Email (único, para login)
- alias: Nombre de usuario (opcional)
- password: Contraseña encriptada (bcrypt)
- createdAt: Fecha de registro
```

#### 2. **League** (Ligas)
```sql
- id: Identificador único
- name: Nombre de la liga
- ownerUserId: Usuario que creó la liga
- defaultConfigJson: Configuración (montos, reglas)
- visibility: PRIVATE o PUBLIC
- createdAt: Fecha de creación
```

#### 3. **LeagueMember** (Miembros de Liga)
```sql
- leagueId + userId: Clave compuesta
- role: OWNER, ADMIN, o PLAYER
- joinedAt: Fecha de unión
```

#### 4. **LeagueInvite** (Invitaciones)
```sql
- id: Identificador único
- leagueId: Liga a la que se invita
- email: Email del invitado
- status: PENDING, ACCEPTED, REVOKED, EXPIRED
- token: Token único para aceptar invitación
- expiresAt: Fecha de expiración
```

#### 5. **Edition** (Ediciones/Torneos)
```sql
- id: Identificador único
- name: Nombre de la edición
- status: OPEN, IN_PROGRESS, FINISHED
- entryFeeCents: Monto de entrada en céntimos (ej: 500 = 5€)
- potCents: Bote acumulado en céntimos
- startMatchday: Jornada inicial
- endMatchday: Jornada final (opcional)
- mode: ELIMINATORIO o LIGA
- leagueId: Liga a la que pertenece
```

#### 6. **Participant** (Participantes)
```sql
- id: Identificador único
- userId: Usuario participante
- editionId: Edición en la que participa
- status: ACTIVE o ELIMINATED
```

#### 7. **Team** (Equipos de Fútbol)
```sql
- id: Identificador único
- name: Nombre del equipo (ej: "Real Madrid")
- shortName: Nombre corto (ej: "RMA")
- externalId: ID en la API externa
- crest: URL del escudo
```

#### 8. **Match** (Partidos)
```sql
- id: Identificador único
- matchday: Número de jornada
- kickoffAt: Fecha/hora del partido
- status: SCHEDULED, FINISHED, POSTPONED, IN_PLAY
- homeGoals: Goles del equipo local
- awayGoals: Goles del equipo visitante
- homeTeamId: Equipo local
- awayTeamId: Equipo visitante
- externalId: ID en la API externa
```

#### 9. **Pick** (Predicciones)
```sql
- id: Identificador único
- participantId: Participante que hizo la predicción
- matchId: Partido sobre el que se predice
- teamId: Equipo que se predice que ganará
- matchday: Jornada
```

#### 10. **Ledger** (Libro de Contabilidad)
```sql
- id: Identificador único
- userId: Usuario (null si es movimiento del bote)
- leagueId: Liga (opcional)
- editionId: Edición (opcional)
- type: ENTRY_FEE, PRIZE_PAYOUT, ROLLOVER_OUT, ROLLOVER_IN, ADJUSTMENT
- amountCents: Cantidad en céntimos
- metaJson: Metadatos adicionales
- createdAt: Fecha de la transacción
```

### Relaciones entre Tablas

```
User
 ├─> League (como owner)
 ├─> LeagueMember (membresías)
 ├─> Participant (participaciones)
 ├─> Pick (predicciones)
 └─> Ledger (transacciones)

League
 ├─> LeagueMember (miembros)
 ├─> LeagueInvite (invitaciones)
 ├─> Edition (ediciones)
 └─> Ledger (transacciones)

Edition
 ├─> Participant (participantes)
 ├─> Ledger (transacciones)
 └─> Pick (a través de Participant)

Participant
 └─> Pick (predicciones)

Match
 ├─> Team (homeTeam, awayTeam)
 └─> Pick (predicciones sobre este partido)
```

---

## 🔧 MÓDULOS DEL BACKEND

### 1. **Auth Module** (Autenticación)
**¿Qué hace?**
- Registro de usuarios
- Login con email/password
- Generación de tokens JWT
- Validación de tokens en requests

**Endpoints:**
- `POST /auth/signup` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/profile` - Obtener perfil (requiere token)

### 2. **Users Module** (Usuarios)
**¿Qué hace?**
- Gestión de perfiles de usuario
- Búsqueda de usuarios
- Actualización de datos

### 3. **Leagues Module** (Ligas)
**¿Qué hace?**
- Crear ligas privadas
- Invitar usuarios por email
- Gestionar miembros y roles
- Crear ediciones dentro de ligas
- Ver estadísticas de ligas

**Endpoints principales:**
- `POST /leagues` - Crear liga
- `GET /leagues/mine` - Mis ligas
- `GET /leagues/:id` - Detalles de liga
- `POST /leagues/:id/invites` - Invitar usuario
- `POST /leagues/:id/editions` - Crear edición

### 4. **Editions Module** (Ediciones)
**¿Qué hace?**
- Listar ediciones abiertas
- Unirse a una edición
- Ver participantes activos/eliminados
- Ver estadísticas de edición
- Procesar resultados automáticamente

**Endpoints principales:**
- `GET /editions` - Listar ediciones abiertas
- `GET /editions/:id` - Detalles de edición
- `POST /editions/:id/join` - Unirse a edición
- `GET /editions/:id/stats` - Estadísticas

### 5. **Picks Module** (Predicciones)
**¿Qué hace?**
- Crear predicciones (picks)
- Validar que el usuario está activo
- Validar que el partido existe
- Evitar picks duplicados

**Endpoints principales:**
- `POST /editions/:editionId/picks` - Hacer predicción

### 6. **Matches Module** (Partidos)
**¿Qué hace?**
- Obtener partidos por jornada
- Actualizar resultados de partidos
- Eliminar participantes cuando fallan
- Finalizar ediciones automáticamente

**Endpoints principales:**
- `GET /matches/jornada/:matchday` - Partidos de una jornada
- `PUT /matches/:id/result` - Actualizar resultado

### 7. **Ledger Module** (Contabilidad)
**¿Qué hace?**
- Registrar todas las transacciones (inmutable)
- Calcular balances de usuarios
- Calcular botes de ediciones
- Manejar rollover (bote que pasa a siguiente edición)
- Distribuir premios

**Funciones clave:**
- `createEntry()` - Registrar transacción
- `getUserBalance()` - Balance de usuario
- `getEditionPot()` - Bote de edición
- `distributePayouts()` - Pagar premios

### 8. **Email Module** (Emails)
**¿Qué hace?**
- Enviar invitaciones a ligas
- Notificar eventos importantes
- Usa Nodemailer con Gmail

### 9. **Football-Data Module** (API Externa)
**¿Qué hace?**
- Sincronizar equipos desde Football-Data.org
- Sincronizar partidos y resultados
- Actualizar datos automáticamente

### 10. **Admin Module** (Administración)
**¿Qué hace?**
- Gestión de usuarios (solo admin)
- Ver todos los usuarios
- Eliminar usuarios

---

## 🎨 MÓDULOS DEL FRONTEND

### Páginas Principales

#### 1. **Página de Registro** (`/`)
- Formulario de registro
- Campos: email, alias (opcional), password

#### 2. **Página de Login** (`/login`)
- Formulario de login
- Redirige a dashboard si es exitoso

#### 3. **Dashboard** (`/dashboard`)
- Panel principal después de login
- Muestra:
  - Saldo disponible
  - Ligas del usuario
  - Ediciones activas
  - Estadísticas rápidas

#### 4. **Ligas** (`/leagues`)
- Lista todas las ligas del usuario
- Botón para crear nueva liga

#### 5. **Crear Liga** (`/leagues/create`)
- Formulario para crear liga
- Configurar nombre y reglas

#### 6. **Detalle de Liga** (`/leagues/[id]`)
- Información de la liga
- Miembros
- Ediciones
- Estadísticas

#### 7. **Gestionar Liga** (`/leagues/[id]/manage`)
- Invitar usuarios
- Ver invitaciones pendientes
- Gestionar miembros

#### 8. **Crear Edición** (`/leagues/[id]/editions/create`)
- Formulario para crear nueva edición
- Seleccionar jornada
- Configurar monto de entrada

#### 9. **Detalle de Edición** (`/editions/[id]`)
- Participantes activos/eliminados
- Partidos de la jornada
- Hacer predicciones
- Ver estadísticas

---

## 🔄 FLUJO COMPLETO DE USO

### Escenario: Usuario Nuevo

```
1. REGISTRO
   Usuario → / → Registro → Email + Password
   Backend → Crea User en DB → Devuelve token JWT
   Frontend → Guarda token → Redirige a /dashboard

2. CREAR LIGA
   Usuario → /leagues/create → Nombre: "Liga de Amigos"
   Backend → Crea League → Crea LeagueMember (OWNER)
   Frontend → Redirige a /leagues/[id]

3. INVITAR AMIGOS
   Usuario → /leagues/[id]/manage → Invitar → Email: "amigo@email.com"
   Backend → Crea LeagueInvite → Envía email con token
   Amigo → Click en email → Acepta invitación → Se une a liga

4. CREAR EDICIÓN
   Usuario → /leagues/[id]/editions/create
   → Nombre: "Jornada 15"
   → Jornada: 15
   → Entrada: 5€
   Backend → Crea Edition → Status: OPEN

5. UNIRSE A EDICIÓN
   Usuarios → /editions → Ver ediciones abiertas
   → Click "Unirse" → Backend valida saldo
   → Crea Participant → Status: ACTIVE
   → Registra ENTRY_FEE en Ledger (resta del balance)
   → Suma al potCents de Edition

6. HACER PREDICCIÓN
   Usuario → /editions/[id] → Ver partidos jornada 15
   → Selecciona partido → Elige equipo ganador
   → Backend crea Pick → Guarda en DB

7. ACTUALIZAR RESULTADO
   Admin → /admin → Actualizar resultado partido
   → Backend procesa:
     a. Busca todos los Picks de ese partido
     b. Compara con resultado real
     c. Si pick != resultado → Participant.status = ELIMINATED
     d. Si solo queda 1 activo → Edition.status = FINISHED

8. FINALIZAR EDICIÓN
   Sistema automático o manual:
   → Calcula ganador (último activo)
   → Calcula bote total (pot + rollover)
   → Distribuye premio → Ledger: PRIZE_PAYOUT
   → Edition.status = FINISHED
```

---

## 💰 SISTEMA DE DINERO (LEDGER)

### Concepto

El **Ledger** es un libro de contabilidad **inmutable** que registra TODAS las transacciones.

### Tipos de Transacciones

1. **ENTRY_FEE** (Cuota de entrada)
   - Usuario paga para unirse a edición
   - `amountCents` = negativo (resta del balance)
   - Se suma al `potCents` de la edición

2. **PRIZE_PAYOUT** (Pago de premio)
   - Ganador recibe el bote
   - `amountCents` = positivo (suma al balance)
   - Se resta del `potCents` de la edición

3. **ROLLOVER_OUT** (Bote que sale)
   - Bote que no se repartió pasa a siguiente edición
   - Se resta del `potCents` actual

4. **ROLLOVER_IN** (Bote que entra)
   - Bote de edición anterior se suma a nueva edición
   - Se suma al `potCents` de nueva edición

5. **ADJUSTMENT** (Ajuste manual)
   - Correcciones manuales por admin
   - Puede ser positivo o negativo

### Ejemplo de Flujo de Dinero

```
Edición "Jornada 15" - Entrada: 5€

1. 10 usuarios se unen
   → 10 × ENTRY_FEE (-5€ cada uno)
   → potCents = 50€

2. Todos fallan, nadie gana
   → ROLLOVER_OUT (-50€ de esta edición)
   → ROLLOVER_IN (+50€ a siguiente edición)

3. Siguiente edición "Jornada 16"
   → potCents inicial = 50€ (del rollover)
   → 5 usuarios se unen (5€ cada uno)
   → potCents = 50€ + 25€ = 75€

4. Usuario X gana
   → PRIZE_PAYOUT (+75€ a usuario X)
   → potCents = 0€
```

---

## 🔐 SEGURIDAD Y AUTENTICACIÓN

### Flujo de Autenticación

```
1. Usuario hace login
   → POST /auth/login
   → Backend valida email/password
   → Genera JWT token (válido 60 minutos)

2. Frontend guarda token
   → localStorage o cookie
   → Incluye en headers: Authorization: Bearer <token>

3. Requests protegidos
   → Backend valida token con JwtStrategy
   → Si válido → permite acceso
   → Si inválido → 401 Unauthorized

4. Guards (Protección de rutas)
   → @UseGuards(AuthGuard('jwt'))
   → Solo usuarios autenticados pueden acceder
```

### Roles en Ligas

- **OWNER**: Creador de la liga, control total
- **ADMIN**: Puede invitar y gestionar (asignado por owner)
- **PLAYER**: Solo puede participar en ediciones

---

## 📊 INTEGRACIÓN CON API EXTERNA

### Football-Data.org

La aplicación se conecta a una API externa para obtener:

- **Equipos**: Lista de equipos de LaLiga
- **Partidos**: Calendario de partidos por jornada
- **Resultados**: Resultados actualizados

### Sincronización

- **Equipos**: Se sincronizan una vez y se actualizan periódicamente
- **Partidos**: Se sincronizan por jornada
- **Resultados**: Se actualizan cuando terminan los partidos

---

## 🚀 CÓMO INICIAR EL PROYECTO

### Requisitos Previos

1. Node.js >= 18
2. Docker Desktop (para PostgreSQL)
3. npm

### Pasos

1. **Instalar dependencias**
   ```powershell
   cd pick-survive-backend
   npm install
   
   cd ..\pick-survive-frontend
   npm install
   ```

2. **Configurar variables de entorno**
   - Crear `pick-survive-backend/.env` (ver SETUP_COMPLETO.md)
   - Crear `pick-survive-frontend/.env.local`

3. **Iniciar base de datos**
   ```powershell
   cd pick-survive-backend
   docker-compose up -d
   ```

4. **Ejecutar migraciones**
   ```powershell
   npx prisma generate
   npx prisma migrate deploy
   ```

5. **Iniciar aplicación**
   ```powershell
   # Desde la raíz del proyecto
   .\iniciar.ps1
   ```

   O manualmente:
   ```powershell
   # Terminal 1: Backend
   cd pick-survive-backend
   npm run start:dev
   
   # Terminal 2: Frontend
   cd pick-survive-frontend
   npm run dev -- -p 5174
   ```

6. **Abrir navegador**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:9998

---

## 📝 NOTAS IMPORTANTES

### Estado Actual del Proyecto

- ✅ **Funcionalidad**: Completa y operativa
- ⚠️ **Seguridad**: Tiene vulnerabilidades (ver RESUMEN_EJECUTIVO_AUDITORIA.md)
- ❌ **Testing**: Sin tests implementados
- ⚠️ **Producción**: NO listo para producción sin correcciones

### Archivos Clave para Entender

1. **`prisma/schema.prisma`** - Estructura completa de la base de datos
2. **`src/editions/edition-auto-manager.service.ts`** - Lógica de eliminación
3. **`src/ledger/ledger.service.ts`** - Sistema de dinero
4. **`src/leagues/leagues.service.ts`** - Gestión de ligas

### Documentación Adicional

- **SETUP_COMPLETO.md** - Guía de instalación detallada
- **RESUMEN_EJECUTIVO_AUDITORIA.md** - Estado del proyecto y vulnerabilidades
- **AUDITORIA_COMPLETA_PICK_SURVIVE.md** - Análisis técnico completo

---

## 🎓 RESUMEN EN 30 SEGUNDOS

**Pick & Survive** es un juego de predicciones de fútbol donde:
- Los usuarios crean **ligas privadas** con amigos
- Cada liga tiene **ediciones** (torneos por jornada)
- Los jugadores **predicen ganadores** de partidos
- Si **aciertas, continúas** - Si **fallas, quedas eliminado**
- El **último en pie gana el bote** de dinero

**Tecnologías:**
- Frontend: Next.js + React + TypeScript
- Backend: NestJS + TypeScript
- Base de datos: PostgreSQL (Docker)
- Autenticación: JWT

**Estado:** Funcional pero necesita correcciones de seguridad antes de producción.

---

**Documento creado:** $(Get-Date -Format "dd/MM/yyyy HH:mm")  
**Última actualización:** $(Get-Date -Format "dd/MM/yyyy HH:mm")

