# 💻 INFORME TÉCNICO PARA DEVELOPERS
## Pick & Survive - Technical Deep Dive

**Fecha:** 24 de Octubre, 2025  
**Para:** Equipo de Desarrollo  
**Nivel:** Técnico Avanzado

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Completo

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND: Next.js 15 + React 19 + TypeScript + Tailwind CSS   │
│  State: Zustand + localStorage persistence                      │
│  Port: 3000                                                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ HTTP/REST + JWT Bearer
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│  BACKEND: NestJS 10 + TypeScript + Prisma ORM                  │
│  Auth: Passport JWT + Bcrypt                                   │
│  Cron: @nestjs/schedule                                        │
│  Port: 3001                                                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ Prisma Client
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│  DATABASE: PostgreSQL 13                                        │
│  Container: Docker                                              │
│  Port: 5432                                                     │
└─────────────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│  EXTERNAL APIs                                                  │
│  • Football-Data.org (API REST)                                │
│  • Gmail SMTP (Email notifications)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 CONFIGURACIÓN DEL ENTORNO

### Requisitos del Sistema

```bash
Node.js: >= 18.x
npm: >= 9.x
Docker: >= 20.x
PostgreSQL: 13+ (via Docker)
```

### Setup Local - Paso a Paso

```bash
# 1. Clonar repositorio
git clone https://github.com/your-org/pickandsurvive.git
cd pickandsurvive

# 2. Setup Backend
cd pick-survive-backend
npm install

# 3. Crear .env (CRÍTICO - ver sección de variables)
cat > .env << 'EOF'
DATABASE_URL=postgresql://admin:supersecret@localhost:5432/picksurvive
JWT_SECRET=$(openssl rand -hex 32)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FOOTBALL_DATA_TOKEN=your-token-here
PORT=3001
NODE_ENV=development
EOF

# 4. Iniciar PostgreSQL
docker-compose up -d

# 5. Ejecutar migraciones
npx prisma migrate deploy
npx prisma generate

# 6. Seed (opcional)
npm run prisma:seed

# 7. Iniciar backend
npm run start:dev

# 8. Setup Frontend (nueva terminal)
cd ../pick-survive-frontend
npm install

# 9. Crear .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

# 10. Iniciar frontend
npm run dev
```

---

## 🗂️ ESTRUCTURA DEL PROYECTO

### Backend Structure

```
pick-survive-backend/
├── src/
│   ├── admin/                    # Gestión de usuarios (⚠️ sin auth)
│   │   ├── admin.controller.ts
│   │   ├── admin.module.ts
│   │   └── admin.service.ts      # ⚠️ Instancia propia de Prisma
│   │
│   ├── auth/                     # Autenticación JWT
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts        # 🔴 JWT_SECRET hardcodeado
│   │   ├── auth.service.ts
│   │   ├── jwt-auth.guard.ts     # Guard básico
│   │   ├── jwt.strategy.ts       # 🔴 SECRET hardcodeado
│   │   └── league-auth.guard.ts  # Guards de ligas
│   │
│   ├── config/                   # Configuraciones
│   │   ├── football-api.ts       # Config de APIs externas
│   │   └── league-config.ts      # Config de ligas
│   │
│   ├── editions/                 # Gestión de ediciones
│   │   ├── editions.controller.ts
│   │   ├── editions.module.ts
│   │   ├── editions.service.ts
│   │   ├── edition-auto-manager.service.ts  # Cron jobs
│   │   └── edition-close.service.ts
│   │
│   ├── email/                    # Servicio de emails
│   │   ├── email.controller.ts
│   │   ├── email.module.ts
│   │   └── email.service.ts      # 🔴 Credenciales hardcodeadas
│   │
│   ├── football-data/            # Integración Football-Data.org
│   │   ├── football-data.controller.ts
│   │   ├── football-data.module.ts
│   │   ├── football-data.service.ts
│   │   └── sync.service.ts       # Sincronización de partidos
│   │
│   ├── leagues/                  # Sistema de ligas privadas
│   │   ├── leagues.controller.ts
│   │   ├── leagues.module.ts
│   │   └── leagues.service.ts    # ✅ Bien estructurado
│   │
│   ├── ledger/                   # Contabilidad inmutable
│   │   ├── ledger.module.ts
│   │   └── ledger.service.ts     # ✅ Excelente diseño
│   │
│   ├── matches/                  # Gestión de partidos
│   │   ├── matches.controller.ts
│   │   ├── matches.module.ts
│   │   └── matches.service.ts    # ⚠️ Instancia de Prisma
│   │
│   ├── picks/                    # Predicciones
│   │   ├── picks.controller.ts
│   │   ├── picks.module.ts
│   │   └── picks.service.ts      # ⚠️ TODOs sin resolver
│   │
│   ├── prisma/                   # Servicio de Prisma
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts     # ✅ Singleton correcto
│   │
│   ├── users/                    # Gestión de usuarios
│   │   ├── users.controller.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts      # 🔴 Credenciales DB + Prisma
│   │
│   ├── app.module.ts             # Módulo principal
│   └── main.ts                   # Entry point
│
├── prisma/
│   ├── schema.prisma             # ✅ Excelente diseño
│   ├── seed.ts
│   ├── migrations/               # Historial de migraciones
│   └── views.sql                 # Views SQL
│
├── test/                         # ❌ Tests vacíos
├── docker-compose.yml            # ⚠️ Solo PostgreSQL
├── package.json
└── tsconfig.json                 # ⚠️ noImplicitAny: false
```

### Frontend Structure

```
pick-survive-frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (protected)/          # ✅ Rutas protegidas
│   │   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── editions/
│   │   │   ├── football-admin/
│   │   │   ├── leagues/
│   │   │   ├── welcome/
│   │   │   └── layout.tsx        # Layout con auth
│   │   │
│   │   ├── api/                  # API Routes (limitadas)
│   │   ├── login/
│   │   ├── page.tsx              # Homepage (signup)
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ...
│   │
│   ├── config/
│   │   └── api.ts                # ✅ Endpoints centralizados
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts            # ✅ Auth hook
│   │   └── useLeagues.ts         # ✅ Data fetching
│   │
│   └── store/
│       └── authStore.ts          # ✅ Zustand store
│
├── public/
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔑 VARIABLES DE ENTORNO

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# JWT Configuration
JWT_SECRET=<strong-random-string>  # openssl rand -hex 32
JWT_EXPIRATION=60m                  # 60 minutos

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<app-specific-password>
EMAIL_FROM=noreply@pickandsurvive.com

# Football Data API
FOOTBALL_DATA_TOKEN=<your-api-token>

# Application
PORT=3001
NODE_ENV=development  # development | production | test

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3002

# Frontend URL (for emails)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Application
NEXT_PUBLIC_APP_NAME=Pick & Survive

# Environment
NODE_ENV=development
```

### Generar Secretos Seguros

```bash
# JWT Secret
openssl rand -hex 32

# O usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. JWT Secret Hardcodeado

**Ubicación:** `src/auth/jwt.strategy.ts:12` y `src/auth/auth.module.ts:15`

**Código Actual:**
```typescript
// ❌ NUNCA hacer esto
secretOrKey: 'ESTO-ES-UN-SECRETO-CAMBIAME'
```

**Solución:**
```typescript
// ✅ Correcto
secretOrKey: process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable is required');
})()
```

**Impacto:** Cualquiera puede generar tokens válidos.

---

### 2. Credenciales de Base de Datos Hardcodeadas

**Ubicación:** `src/users/users.service.ts:13`, `src/admin/admin.service.ts:12`

**Código Actual:**
```typescript
// ❌ NUNCA hacer esto
constructor() {
  this.prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://admin:supersecret@localhost:5432/picksurvive?schema=public'
      }
    }
  });
}
```

**Soluciones:**

**Opción 1: Inyección de Dependencias (RECOMENDADO)**
```typescript
// ✅ Correcto
constructor(private readonly prisma: PrismaService) {}
```

**Opción 2: Variables de Entorno**
```typescript
// ✅ Aceptable si no puedes usar inyección
constructor() {
  this.prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
}
```

**Impacto:** Acceso completo a la base de datos si el código se filtra.

---

### 3. Sin Validación de Entrada

**Problema:** No se usa `class-validator` en DTOs.

**Instalación:**
```bash
npm install class-validator class-transformer
```

**Ejemplo de DTO Seguro:**
```typescript
// src/auth/dto/signup.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  alias: string;
}
```

**Uso en Controller:**
```typescript
@Post('signup')
signUp(@Body() signUpDto: SignUpDto) {
  return this.authService.signUp(
    signUpDto.email,
    signUpDto.password,
    signUpDto.alias
  );
}
```

**Configurar ValidationPipe Global:**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Elimina propiedades no definidas
    forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
    transform: true,        // Transforma tipos automáticamente
  }));

  await app.listen(3001);
}
```

---

### 4. Sin Rate Limiting

**Instalación:**
```bash
npm install @nestjs/throttler
```

**Configuración:**
```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // Time to live (segundos)
      limit: 10,    // Requests máximos por ttl
    }),
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

**Uso Específico:**
```typescript
// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Throttle(5, 60)  // 5 requests por 60 segundos
  @Post('login')
  signIn(@Body() body: { email: string; password: string }) {
    return this.authService.signIn(body.email, body.password);
  }
}
```

---

## 🏛️ PATRONES Y BEST PRACTICES

### 1. Inyección de Dependencias (DI)

**❌ Antipatrón Actual:**
```typescript
export class UsersService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();  // ❌ Crea nueva instancia
  }
}
```

**✅ Patrón Correcto:**
```typescript
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  // PrismaService es singleton, inyectado por NestJS
}
```

---

### 2. Exception Filters Globales

**Crear Exception Filter:**
```typescript
// common/filters/http-exception.filter.ts
import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException,
  HttpStatus 
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Log error (use logger service)
    console.error('Exception:', exception);

    response.status(status).json(errorResponse);
  }
}
```

**Registrar Globalmente:**
```typescript
// main.ts
app.useGlobalFilters(new AllExceptionsFilter());
```

---

### 3. Interceptors para Logging

**Crear Logging Interceptor:**
```typescript
// common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        this.logger.log(
          `← ${method} ${url} ${response.statusCode} ${delay}ms`
        );
      })
    );
  }
}
```

**Registrar:**
```typescript
// main.ts
app.useGlobalInterceptors(new LoggingInterceptor());
```

---

### 4. DTOs con Validación Completa

**Crear DTOs Robustos:**
```typescript
// leagues/dto/create-league.dto.ts
import { 
  IsString, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsEnum,
  IsObject,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class LeagueConfigDto {
  @IsNumber()
  @Min(0)
  entry_fee_cents: number;

  @IsString()
  timezone: string;
}

export class CreateLeagueDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsEnum(['PRIVATE', 'PUBLIC'])
  visibility: 'PRIVATE' | 'PUBLIC' = 'PRIVATE';

  @IsObject()
  @ValidateNested()
  @Type(() => LeagueConfigDto)
  defaultConfigJson: LeagueConfigDto;
}
```

---

### 5. Repository Pattern (Opcional pero Recomendado)

**Crear Repository:**
```typescript
// users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

---

## 🧪 TESTING ESTRATEGIA

### Setup Jest

```typescript
// jest.config.js (raíz del backend)
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Test Database Setup

```typescript
// test/setup.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_picksurvive';
  prisma = new PrismaClient();
  
  // Ejecutar migraciones
  await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
  await prisma.$executeRaw`CREATE SCHEMA public`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Limpiar todas las tablas
  const tables = ['User', 'League', 'Edition', 'Participant', 'Pick'];
  for (const table of tables) {
    await prisma[table.toLowerCase()].deleteMany();
  }
});
```

### Unit Test Example

```typescript
// auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('signIn', () => {
    it('should return JWT token for valid credentials', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        alias: 'TestUser',
        createdAt: new Date(),
      };

      usersService.findOneByEmail.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      // Act
      const result = await service.signIn('test@test.com', 'password123');

      // Assert
      expect(result).toEqual({ access_token: 'mock-jwt-token' });
      expect(usersService.findOneByEmail).toHaveBeenCalledWith('test@test.com');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '1',
        email: 'test@test.com',
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        alias: 'TestUser',
        createdAt: new Date(),
      };

      usersService.findOneByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.signIn('test@test.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      usersService.findOneByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.signIn('nonexistent@test.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signUp', () => {
    it('should create a new user', async () => {
      // Arrange
      const newUser = {
        id: '1',
        email: 'newuser@test.com',
        password: 'hashedPassword',
        alias: 'NewUser',
        createdAt: new Date(),
      };

      usersService.createUser.mockResolvedValue(newUser);

      // Act
      const result = await service.signUp(
        'newuser@test.com',
        'password123',
        'NewUser'
      );

      // Assert
      expect(result).toEqual(newUser);
      expect(usersService.createUser).toHaveBeenCalledWith(
        'newuser@test.com',
        'password123',
        'NewUser'
      );
    });
  });
});
```

### Integration Test Example

```typescript
// auth/auth.controller.spec.ts (E2E style)
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany();
  });

  describe('/auth/signup (POST)', () => {
    it('should create a new user with valid data', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@test.com',
          password: 'password123',
          alias: 'TestUser',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('test@test.com');
          expect(res.body.alias).toBe('TestUser');
          expect(res.body).not.toHaveProperty('password'); // No exponer password
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
          alias: 'TestUser',
        })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@test.com',
          password: '123',
          alias: 'TestUser',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create test user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@test.com',
          password: 'password123',
          alias: 'TestUser',
        });
    });

    it('should return JWT token for valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(typeof res.body.access_token).toBe('string');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    let token: string;

    beforeEach(async () => {
      // Create and login user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@test.com',
          password: 'password123',
          alias: 'TestUser',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123',
        });

      token = loginRes.body.access_token;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('test@test.com');
          expect(res.body.alias).toBe('TestUser');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
```

---

## 🐳 DOCKER Y DEPLOYMENT

### Dockerfile Backend

```dockerfile
# Dockerfile (pick-survive-backend)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main"]
```

### Dockerfile Frontend

```dockerfile
# Dockerfile (pick-survive-frontend)
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose Completo

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: pick-survive-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: pick-survive-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - app-network

  backend:
    build:
      context: ./pick-survive-backend
      dockerfile: Dockerfile
    container_name: pick-survive-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: redis://redis:6379
      PORT: 3001
    ports:
      - "3001:3001"
    networks:
      - app-network
    volumes:
      - ./pick-survive-backend/uploads:/app/uploads

  frontend:
    build:
      context: ./pick-survive-frontend
      dockerfile: Dockerfile
    container_name: pick-survive-frontend
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    ports:
      - "3000:3000"
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: pick-survive-nginx
    restart: unless-stopped
    depends_on:
      - frontend
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Nginx Configuration

```nginx
# nginx.conf
events {
  worker_connections 1024;
}

http {
  upstream backend {
    server backend:3001;
  }

  upstream frontend {
    server frontend:3000;
  }

  server {
    listen 80;
    server_name pickandsurvive.com www.pickandsurvive.com;
    return 301 https://$server_name$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name pickandsurvive.com www.pickandsurvive.com;

    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;

    # API Requests
    location /api {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
      proxy_pass http://frontend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
```

---

## 📊 PERFORMANCE OPTIMIZATION

### Database Query Optimization

```typescript
// ❌ N+1 Query Problem
async getLeaguesWithMembers(userId: string) {
  const leagues = await this.prisma.league.findMany({
    where: { members: { some: { userId } } }
  });

  for (const league of leagues) {
    league.members = await this.prisma.leagueMember.findMany({
      where: { leagueId: league.id }
    });
  }

  return leagues;
}

// ✅ Optimized with Prisma Include
async getLeaguesWithMembers(userId: string) {
  return this.prisma.league.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, email: true, alias: true }
          }
        }
      },
      editions: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });
}
```

### Caching Strategy con Redis

```bash
npm install cache-manager cache-manager-redis-yet redis
```

```typescript
// cache/cache.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
          },
        }),
        ttl: 60 * 60, // 1 hora en segundos
      }),
    }),
  ],
})
export class CacheConfigModule {}
```

**Uso en Service:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class MatchesService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  async getMatchesByMatchday(matchday: number) {
    const cacheKey = `matches:matchday:${matchday}`;
    
    // Intentar obtener del cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Si no está en cache, obtener de DB
    const matches = await this.prisma.match.findMany({
      where: { matchday },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { kickoffAt: 'asc' },
    });

    // Guardar en cache por 1 hora
    await this.cacheManager.set(cacheKey, matches, 60 * 60 * 1000);

    return matches;
  }

  async invalidateMatchdayCache(matchday: number) {
    const cacheKey = `matches:matchday:${matchday}`;
    await this.cacheManager.del(cacheKey);
  }
}
```

---

## 🔒 SECURITY HEADERS

```bash
npm install helmet
```

```typescript
// main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  await app.listen(3001);
}
```

---

## 📝 API DOCUMENTATION CON SWAGGER

```bash
npm install @nestjs/swagger
```

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Pick & Survive API')
    .setDescription('API for football prediction game with private leagues')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('leagues', 'League management')
    .addTag('editions', 'Edition management')
    .addTag('picks', 'User predictions')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3001);
}

// Ahora visita: http://localhost:3001/api-docs
```

**Decorar Controllers:**
```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  signIn(@Body() body: { email: string; password: string }) {
    return this.authService.signIn(body.email, body.password);
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Returns user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Req() req) {
    return req.user;
  }
}
```

---

## 🚀 CI/CD PIPELINE

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd pick-survive-backend
          npm ci
          
      - name: Run linter
        run: |
          cd pick-survive-backend
          npm run lint

  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_picksurvive
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd pick-survive-backend
          npm ci
          
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_picksurvive
        run: |
          cd pick-survive-backend
          npx prisma migrate deploy
          
      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_picksurvive
          JWT_SECRET: test-secret-key
        run: |
          cd pick-survive-backend
          npm run test
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./pick-survive-backend/coverage/lcov.info

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
          
      - name: Build and push Backend
        uses: docker/build-push-action@v4
        with:
          context: ./pick-survive-backend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/picksurvive-backend:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKERHUB_USERNAME }}/picksurvive-backend:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKERHUB_USERNAME }}/picksurvive-backend:buildcache,mode=max
          
      - name: Build and push Frontend
        uses: docker/build-push-action@v4
        with:
          context: ./pick-survive-frontend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/picksurvive-frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USERNAME }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /app/pickandsurvive
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

---

## 📞 SUPPORT Y CONTACTO

**Tech Lead:** tech-lead@pickandsurvive.com  
**Slack:** #backend-dev, #frontend-dev  
**Jira:** Proyecto DEV-PS  
**Docs:** https://docs.pickandsurvive.com

---

*Documento generado: 24 de Octubre, 2025*  
*Mantenido por: Equipo de Desarrollo*

