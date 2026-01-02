# 🧪 INFORME DE AUDITORÍA PARA TESTERS
## Pick & Survive - Testing Strategy & QA Report

**Fecha:** 24 de Octubre, 2025  
**Para:** Equipo de QA y Testing  
**Nivel:** Técnico

---

## 📊 ESTADO ACTUAL DEL TESTING

### ⚠️ Situación Crítica: COBERTURA 0%

```
Backend Tests:   0% cobertura  ❌
Frontend Tests:  0% cobertura  ❌
E2E Tests:       No existen    ❌
Integration:     No existen    ❌
Performance:     No existen    ❌
```

---

## 🎯 ÁREAS CRÍTICAS PARA TESTEAR

### 1. AUTENTICACIÓN Y AUTORIZACIÓN (Prioridad: CRÍTICA)

#### Casos de Prueba - Login
```
TC001: Login con credenciales válidas
  - Input: email válido + password correcto
  - Esperado: Token JWT + Redirect a /dashboard
  - Status: ❌ Sin automatizar

TC002: Login con credenciales inválidas
  - Input: email válido + password incorrecto
  - Esperado: Error 401 + Mensaje "Credenciales inválidas"
  - Status: ❌ Sin automatizar

TC003: Login con usuario no existente
  - Input: email no registrado + password
  - Esperado: Error 401 + Mensaje "Credenciales inválidas"
  - Status: ❌ Sin automatizar

TC004: Login sin email
  - Input: password solamente
  - Esperado: Error 400 + Mensaje de validación
  - Status: ❌ Sin automatizar

TC005: Login con email mal formado
  - Input: "notanemail" + password
  - Esperado: Error 400 + Mensaje de validación
  - Status: ❌ Sin automatizar

TC006: Rate limiting en login (>10 intentos)
  - Input: 11+ intentos en 1 minuto
  - Esperado: Error 429 + "Too Many Requests"
  - Status: ⚠️ Rate limiting NO implementado
```

#### Casos de Prueba - Registro
```
TC007: Registro con datos válidos
  - Input: email nuevo + password + alias
  - Esperado: Usuario creado + Redirect
  - Status: ❌ Sin automatizar

TC008: Registro con email duplicado
  - Input: email ya existente
  - Esperado: Error 409 + "Email ya registrado"
  - Status: ❌ Sin automatizar

TC009: Registro con contraseña débil
  - Input: password de 4 caracteres
  - Esperado: Error 400 + Requisitos de contraseña
  - Status: ⚠️ Validación NO implementada

TC010: Registro con SQL injection
  - Input: email = "admin' OR '1'='1"
  - Esperado: Input sanitizado o error de validación
  - Status: ⚠️ Validación NO implementada
```

#### Casos de Prueba - Tokens JWT
```
TC011: Acceso con token válido
  - Setup: Login previo
  - Input: GET /auth/profile con Bearer token
  - Esperado: 200 + Datos de usuario
  - Status: ❌ Sin automatizar

TC012: Acceso con token expirado
  - Setup: Token de hace >60 minutos
  - Input: GET /auth/profile con token expirado
  - Esperado: 401 + "Token expired"
  - Status: ❌ Sin automatizar

TC013: Acceso con token manipulado
  - Input: Token con payload modificado
  - Esperado: 401 + "Invalid token"
  - Status: ❌ Sin automatizar

TC014: Acceso sin token
  - Input: GET /auth/profile sin header Authorization
  - Esperado: 401 + "Unauthorized"
  - Status: ❌ Sin automatizar
```

---

### 2. SISTEMA DE LIGAS (Prioridad: ALTA)

#### Casos de Prueba - Crear Liga
```
TC020: Crear liga con datos válidos
  - Input: nombre + configuración
  - Esperado: Liga creada + Usuario es OWNER
  - Status: ❌ Sin automatizar

TC021: Crear liga sin autenticación
  - Input: POST /leagues sin token
  - Esperado: 401 + "Unauthorized"
  - Status: ❌ Sin automatizar

TC022: Crear liga con nombre vacío
  - Input: nombre = ""
  - Esperado: 400 + Error de validación
  - Status: ⚠️ Validación NO implementada

TC023: Listar mis ligas
  - Setup: Usuario con 3 ligas
  - Input: GET /leagues/mine
  - Esperado: Array con 3 ligas
  - Status: ❌ Sin automatizar
```

#### Casos de Prueba - Invitaciones
```
TC030: Enviar invitación válida
  - Setup: Usuario es OWNER de liga
  - Input: POST /leagues/:id/invites con email
  - Esperado: Invitación creada + Email enviado
  - Status: ❌ Sin automatizar

TC031: Enviar invitación sin ser admin
  - Setup: Usuario es PLAYER de liga
  - Input: POST /leagues/:id/invites
  - Esperado: 403 + "Forbidden"
  - Status: ❌ Sin automatizar

TC032: Enviar invitación a email ya invitado
  - Setup: Invitación pendiente existente
  - Input: POST /leagues/:id/invites con mismo email
  - Esperado: 409 + "Already invited"
  - Status: ❌ Sin automatizar

TC033: Aceptar invitación válida
  - Setup: Invitación PENDING + Usuario logueado
  - Input: POST /leagues/join con token
  - Esperado: Usuario agregado a liga
  - Status: ❌ Sin automatizar

TC034: Aceptar invitación expirada
  - Setup: Invitación de hace >7 días
  - Input: POST /leagues/join
  - Esperado: 409 + "Invitation expired"
  - Status: ❌ Sin automatizar
```

---

### 3. SISTEMA DE EDICIONES (Prioridad: ALTA)

#### Casos de Prueba - Unirse a Edición
```
TC040: Unirse a edición abierta
  - Setup: Edición con status OPEN
  - Input: POST /editions/:id/join
  - Esperado: Participante creado con status ACTIVE
  - Status: ❌ Sin automatizar
  - ⚠️ BUG CONOCIDO: No valida saldo suficiente

TC041: Unirse a edición cerrada
  - Setup: Edición con status IN_PROGRESS
  - Input: POST /editions/:id/join
  - Esperado: 400 + "Edition closed"
  - Status: ❌ Sin automatizar

TC042: Unirse a edición ya participando
  - Setup: Usuario ya es participante
  - Input: POST /editions/:id/join
  - Esperado: 409 + "Already participating"
  - Status: ❌ Sin automatizar

TC043: Listar ediciones abiertas
  - Setup: 3 ediciones OPEN, 2 IN_PROGRESS
  - Input: GET /editions
  - Esperado: Array con 3 ediciones OPEN
  - Status: ❌ Sin automatizar
```

#### Casos de Prueba - Picks
```
TC050: Crear pick válido
  - Setup: Usuario participante + Partido disponible
  - Input: POST /editions/:id/picks con teamId
  - Esperado: Pick creado + Estado 201
  - Status: ❌ Sin automatizar

TC051: Crear pick duplicado en misma jornada
  - Setup: Pick ya creado para jornada 1
  - Input: POST /editions/:id/picks (jornada 1)
  - Esperado: 409 + "Pick already exists"
  - Status: ❌ Sin automatizar

TC052: Crear pick con equipo que no juega
  - Input: teamId de equipo sin partido
  - Esperado: 404 + "Team not playing"
  - Status: ❌ Sin automatizar

TC053: Crear pick sin ser participante
  - Setup: Usuario NO participante
  - Input: POST /editions/:id/picks
  - Esperado: 401 + "Not a participant"
  - Status: ❌ Sin automatizar

TC054: Crear pick después de kickoff
  - Setup: Primer partido ya empezó
  - Input: POST /editions/:id/picks
  - Esperado: 400 + "Deadline passed"
  - Status: ⚠️ NO IMPLEMENTADO (TODO en código)
```

---

### 4. PROCESAMIENTO DE RESULTADOS (Prioridad: CRÍTICA)

#### Casos de Prueba - Auto Manager
```
TC060: Procesar resultado correcto
  - Setup: Partido FINISHED + Picks de 3 usuarios
  - Acción: Actualizar resultado + Esperar cron
  - Esperado: 1 participante ACTIVE, 2 ELIMINATED
  - Status: ❌ Sin automatizar
  - ⚠️ BUG REPORTADO: Eliminaciones prematuras

TC061: Procesar empate
  - Setup: Partido 1-1 + Picks
  - Esperado: TODOS los participantes ELIMINATED
  - Status: ❌ Sin automatizar

TC062: Finalizar edición con 1 ganador
  - Setup: 1 participante ACTIVE
  - Acción: Procesar último partido
  - Esperado: Edición status = FINISHED
  - Status: ❌ Sin automatizar

TC063: Finalizar edición sin ganadores
  - Setup: 0 participantes ACTIVE
  - Acción: Procesar último partido
  - Esperado: Edición status = FINISHED
  - Status: ❌ Sin automatizar
```

---

### 5. INTEGRACIONES EXTERNAS (Prioridad: MEDIA)

#### Casos de Prueba - Football API
```
TC070: Sincronizar equipos
  - Input: POST /football-data/sync/teams/PD
  - Esperado: Equipos creados en BD + Status 200
  - Status: ❌ Sin automatizar

TC071: Sincronizar partidos de jornada
  - Input: POST /football-data/sync/matchday?matchday=1
  - Esperado: Partidos creados + Status 200
  - Status: ❌ Sin automatizar

TC072: Manejar API limit exceeded
  - Setup: Simular error 429 de API
  - Esperado: Error manejado + Retry después
  - Status: ⚠️ Retry NO implementado

TC073: Manejar API token inválido
  - Setup: Token incorrecto
  - Esperado: Error claro + Log
  - Status: ❌ Sin automatizar
```

#### Casos de Prueba - Email Service
```
TC080: Enviar email de invitación
  - Setup: SMTP configurado correctamente
  - Input: Crear invitación a liga
  - Esperado: Email recibido en bandeja
  - Status: ❌ Sin automatizar (manual)

TC081: Manejar error de SMTP
  - Setup: Credenciales incorrectas
  - Esperado: Error logueado + Invitación creada
  - Status: ❌ Sin automatizar
```

---

## 🐛 BUGS CONOCIDOS

### BUG-001: Eliminaciones Prematuras
**Severidad:** CRÍTICA  
**Módulo:** Edition Auto Manager  
**Descripción:** Participantes eliminados antes de que termine el partido  
**Reproducir:**
1. Crear edición con jornada 1
2. Usuarios hacen picks
3. Actualizar resultado de partido
4. OBSERVAR: Eliminación inmediata (debería esperar >10min)

**Status:** ⚠️ Mitigado con validación temporal, pero no resuelto

---

### BUG-002: Sin Validación de Saldo
**Severidad:** ALTA  
**Módulo:** Editions Service  
**Descripción:** Usuarios pueden unirse a ediciones sin saldo suficiente  
**Reproducir:**
1. Usuario con 0 balance
2. POST /editions/:id/join (cuota: 500 céntimos)
3. OBSERVAR: Unión exitosa (debería fallar)

**Status:** ❌ NO RESUELTO (código comentado)

---

### BUG-003: Multiple PrismaClient Instances
**Severidad:** MEDIA  
**Módulo:** Múltiples servicios  
**Descripción:** Fuga de memoria por múltiples instancias  
**Impacto:** Degradación de performance en producción  
**Status:** ❌ NO RESUELTO

---

## 📋 CHECKLIST DE TESTING

### Tests Unitarios (Backend)
```
[ ] AuthService
  [ ] signUp()
  [ ] signIn()
  [ ] validateUser()
  
[ ] LeaguesService
  [ ] createLeague()
  [ ] getUserLeagues()
  [ ] createInvite()
  [ ] acceptInvite()
  
[ ] EditionsService
  [ ] findAll()
  [ ] joinEdition()
  [ ] getEditionStats()
  
[ ] PicksService
  [ ] createPick()
  [ ] validatePick()
  
[ ] LedgerService
  [ ] getUserBalance()
  [ ] recordEntryFee()
  [ ] recordPrizePayout()
  
[ ] MatchesService
  [ ] updateMatchResult()
  [ ] getMatchesByMatchday()
```

### Tests de Integración
```
[ ] Auth Flow Completo
  [ ] Signup → Login → Access Protected Route
  
[ ] League Flow Completo
  [ ] Create → Invite → Accept → Join Edition
  
[ ] Pick Flow Completo
  [ ] Join Edition → Make Pick → Process Result
  
[ ] Database Transactions
  [ ] Join Edition (rollback en error)
  [ ] Update Match Result (rollback en error)
```

### Tests E2E (Frontend + Backend)
```
[ ] Usuario se registra
[ ] Usuario hace login
[ ] Usuario crea liga
[ ] Usuario invita amigo
[ ] Amigo acepta invitación
[ ] Usuarios se unen a edición
[ ] Usuarios hacen picks
[ ] Admin actualiza resultado
[ ] Sistema procesa ganadores
[ ] Usuario ve balance actualizado
```

### Tests de Seguridad
```
[ ] SQL Injection en todos los inputs
[ ] XSS en campos de texto
[ ] CSRF en formularios
[ ] JWT manipulation
[ ] Rate limiting en login
[ ] Brute force protection
[ ] Authorization bypass
```

### Tests de Performance
```
[ ] 100 usuarios concurrentes haciendo login
[ ] 1000 picks simultáneos
[ ] Sincronización de 380 partidos
[ ] Procesamiento de edición con 100 participantes
[ ] Query performance con 10,000 ledger entries
```

---

## 🛠️ HERRAMIENTAS RECOMENDADAS

### Testing Frameworks
```bash
# Backend
npm install --save-dev @nestjs/testing jest supertest

# Frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### Test Data Factories
```bash
npm install --save-dev @faker-js/faker
```

### E2E Testing
```bash
npm install --save-dev playwright
```

### Performance Testing
```bash
npm install --save-dev k6
```

### Security Testing
```bash
npm install --save-dev @nestjs/throttler helmet
```

---

## 📝 EJEMPLOS DE TESTS

### Ejemplo 1: Test Unitario - AuthService
```typescript
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('signIn', () => {
    it('should return access token for valid credentials', async () => {
      // Arrange
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: await bcrypt.hash('password123', 10),
      };
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      const result = await service.signIn('test@test.com', 'password123');

      // Assert
      expect(result).toEqual({ access_token: 'mock-token' });
      expect(usersService.findOneByEmail).toHaveBeenCalledWith('test@test.com');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      // Arrange
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: await bcrypt.hash('password123', 10),
      };
      usersService.findOneByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.signIn('test@test.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### Ejemplo 2: Test E2E - League Creation
```typescript
describe('Leagues (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login para obtener token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    
    authToken = loginResponse.body.access_token;
  });

  it('/leagues (POST) should create a league', () => {
    return request(app.getHttpServer())
      .post('/leagues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test League',
        visibility: 'PRIVATE',
        defaultConfigJson: { entry_fee_cents: 500 },
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test League');
        expect(res.body.members).toHaveLength(1);
        expect(res.body.members[0].role).toBe('OWNER');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Ejemplo 3: Performance Test - K6
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% bajo 200ms
    http_req_failed: ['rate<0.01'],   // <1% de errores
  },
};

export default function () {
  const loginRes = http.post('http://localhost:3001/auth/login', {
    email: 'test@test.com',
    password: 'password123',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => r.json().access_token !== undefined,
  });

  const token = loginRes.json().access_token;

  const leaguesRes = http.get('http://localhost:3001/leagues/mine', {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(leaguesRes, {
    'leagues fetched': (r) => r.status === 200,
  });

  sleep(1);
}
```

---

## 📊 MÉTRICAS DE CALIDAD

### Objetivos de Cobertura
```
Backend:
- Servicios críticos: >90% (Auth, Leagues, Editions)
- Servicios normales: >70%
- Controladores: >60%
- Guards: 100%

Frontend:
- Componentes: >70%
- Hooks: >80%
- Utils: >90%
```

### Performance Benchmarks
```
API Endpoints:
- p50 < 50ms
- p95 < 200ms
- p99 < 500ms

Database Queries:
- Queries simples < 10ms
- Queries complejas < 50ms
- Agregaciones < 100ms
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Semana 1: Setup
- [ ] Configurar Jest y testing environment
- [ ] Configurar test database
- [ ] Crear factories para test data
- [ ] Escribir primeros 10 tests unitarios

### Semana 2: Tests Críticos
- [ ] Tests de autenticación (completo)
- [ ] Tests de autorización (guards)
- [ ] Tests de creación de ligas
- [ ] Tests de invitaciones

### Semana 3: Tests de Negocio
- [ ] Tests de ediciones
- [ ] Tests de picks
- [ ] Tests de procesamiento de resultados
- [ ] Tests de ledger

### Semana 4: Tests E2E y Performance
- [ ] Setup Playwright
- [ ] 5 flujos E2E principales
- [ ] Performance tests con K6
- [ ] Security tests

---

## 📞 CONTACTO

**QA Lead:** qa-lead@pickandsurvive.com  
**Slack:** #qa-testing  
**Jira:** Proyecto TEST-PS

---

*Documento generado: 24 de Octubre, 2025*

