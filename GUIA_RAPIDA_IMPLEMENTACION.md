# ⚡ GUÍA RÁPIDA DE IMPLEMENTACIÓN
## Correcciones Críticas - Pick & Survive

**Prioridad:** INMEDIATA  
**Tiempo estimado:** 2-4 horas  
**Impacto:** CRÍTICO para seguridad

---

## 🚀 INICIO RÁPIDO - PRIMEROS 30 MINUTOS

### Paso 1: Crear Archivo .env (5 minutos)

```bash
cd pick-survive-backend

# Crear .env
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://admin:supersecret@localhost:5432/picksurvive

# JWT (GENERAR NUEVO SECRETO)
JWT_SECRET=CAMBIAR_POR_SECRETO_ALEATORIO
JWT_EXPIRATION=60m

# Email
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
EMAIL_FROM=noreply@pickandsurvive.com

# Football API
FOOTBALL_DATA_TOKEN=tu-token-aqui

# App
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
FRONTEND_URL=http://localhost:3000
EOF
```

### Paso 2: Generar JWT Secret Seguro (2 minutos)

```bash
# Opción 1: Con OpenSSL
openssl rand -hex 32

# Opción 2: Con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiar el resultado y reemplazar en .env:
# JWT_SECRET=el_secreto_generado_aqui
```

### Paso 3: Actualizar jwt.strategy.ts (3 minutos)

```typescript
// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ✅ CAMBIO AQUÍ
      secretOrKey: process.env.JWT_SECRET || (() => {
        throw new Error('JWT_SECRET environment variable is required');
      })(),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.usersService.findOneByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### Paso 4: Actualizar auth.module.ts (2 minutos)

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      global: true,
      // ✅ CAMBIO AQUÍ
      secret: process.env.JWT_SECRET || (() => {
        throw new Error('JWT_SECRET environment variable is required');
      })(),
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '60m' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

### Paso 5: Actualizar email.service.ts (2 minutos)

```typescript
// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // ✅ CAMBIO AQUÍ - Validar que existan las variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('EMAIL_USER and EMAIL_PASSWORD environment variables are required');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // ... resto del código sin cambios
}
```

### Paso 6: Testear (5 minutos)

```bash
# Reiniciar servidor
npm run start:dev

# En otra terminal, probar login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu-usuario@test.com","password":"tu-password"}'

# Debe devolver un token JWT
```

---

## 🔧 SIGUIENTES 2 HORAS - REFACTORING PRISMA

### Problema: Múltiples Instancias de PrismaClient

Archivos afectados:
- `src/users/users.service.ts`
- `src/admin/admin.service.ts`
- `src/picks/picks.service.ts`
- `src/matches/matches.service.ts`

### Solución: Usar Inyección de Dependencias

#### Paso 1: Verificar que existe PrismaService (2 minutos)

```bash
# Verificar que existe src/prisma/prisma.service.ts
ls -la src/prisma/
```

Si **NO existe**, crear:

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

```typescript
// src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### Paso 2: Actualizar users.service.ts (10 minutos)

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';  // ✅ Importar

@Injectable()
export class UsersService {
  // ✅ CAMBIO: Usar inyección de dependencias
  constructor(private readonly prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(email: string, password: string, alias?: string): Promise<User> {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        alias,
      },
    });
  }
}
```

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';  // ✅ Importar

@Module({
  imports: [PrismaModule],  // ✅ Agregar
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

#### Paso 3: Actualizar admin.service.ts (10 minutos)

```typescript
// src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';  // ✅ Importar

@Injectable()
export class AdminService {
  // ✅ CAMBIO: Usar inyección de dependencias
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        alias: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        alias: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId }
    });
  }
}
```

```typescript
// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';  // ✅ Importar

@Module({
  imports: [PrismaModule],  // ✅ Agregar
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

#### Paso 4: Actualizar app.module.ts (5 minutos)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EditionsModule } from './editions/editions.module';
import { PicksModule } from './picks/picks.module';
import { MatchesModule } from './matches/matches.module';
import { FootballDataModule } from './football-data/football-data.module';
import { LeaguesModule } from './leagues/leagues.module';
import { LedgerModule } from './ledger/ledger.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';  // ✅ Importar

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,  // ✅ Agregar PRIMERO
    UsersModule, 
    AuthModule, 
    EditionsModule, 
    PicksModule, 
    MatchesModule,
    FootballDataModule,
    LeaguesModule,
    LedgerModule,
    AdminModule
  ], 
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

#### Paso 5: Testear Cambios (5 minutos)

```bash
# Reiniciar servidor
npm run start:dev

# Verificar que no hay errores
# Probar endpoints básicos
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## ⚡ SIGUIENTES 2 HORAS - VALIDACIÓN DE ENTRADA

### Instalar Dependencias (1 minuto)

```bash
cd pick-survive-backend
npm install class-validator class-transformer
```

### Crear DTOs (30 minutos)

#### 1. Auth DTOs

```typescript
// src/auth/dto/signup.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  password: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  alias?: string;
}
```

```typescript
// src/auth/dto/signin.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class SignInDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  password: string;
}
```

#### 2. Actualizar auth.controller.ts

```typescript
// src/auth/auth.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  UseGuards,
  Get,
  Req
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { SignUpDto } from './dto/signup.dto';  // ✅ Importar
import { SignInDto } from './dto/signin.dto';  // ✅ Importar

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signUp(@Body() signUpDto: SignUpDto) {  // ✅ Usar DTO
    return this.authService.signUp(
      signUpDto.email,
      signUpDto.password,
      signUpDto.alias
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {  // ✅ Usar DTO
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req) {
    const user = req.user;
    delete user.password;
    return user;
  }
}
```

#### 3. Configurar ValidationPipe Global (5 minutos)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';  // ✅ Importar

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ Agregar ValidationPipe global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              // Elimina propiedades no definidas en DTO
    forbidNonWhitelisted: true,   // Lanza error si hay propiedades extra
    transform: true,              // Transforma tipos automáticamente
  }));
  
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

#### 4. Testear Validación (10 minutos)

```bash
# Test 1: Email inválido (debe fallar)
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"password123","alias":"Test"}'

# Debe devolver error 400

# Test 2: Contraseña corta (debe fallar)
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123","alias":"Test"}'

# Debe devolver error 400

# Test 3: Datos válidos (debe funcionar)
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","alias":"Test"}'

# Debe devolver 201 con usuario creado
```

---

## 🛡️ RATE LIMITING - 30 MINUTOS

### Instalar Throttler (1 minuto)

```bash
npm install @nestjs/throttler
```

### Configurar en app.module.ts (5 minutos)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';  // ✅ Importar
// ... otros imports

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ✅ Agregar ThrottlerModule
    ThrottlerModule.forRoot({
      ttl: 60,      // 60 segundos
      limit: 10,    // 10 requests por ttl
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    // ... resto de modules
  ], 
  controllers: [AppController],
  providers: [
    AppService,
    // ✅ Agregar ThrottlerGuard global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### Configurar Límites Específicos (10 minutos)

```typescript
// src/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';  // ✅ Importar
// ... otros imports

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Throttle(3, 60)  // ✅ Solo 3 registros por minuto
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(
      signUpDto.email,
      signUpDto.password,
      signUpDto.alias
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle(5, 60)  // ✅ Solo 5 intentos de login por minuto
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  // ... resto del código
}
```

### Testear Rate Limiting (10 minutos)

```bash
# Hacer 6 requests rápidos (debe bloquear el 6to)
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
  echo ""
done

# El último debe devolver 429 Too Many Requests
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

```
□ .env creado con todas las variables
□ JWT_SECRET generado aleatoriamente
□ jwt.strategy.ts actualizado
□ auth.module.ts actualizado
□ email.service.ts actualizado
□ Servidor reiniciado sin errores
□ Login funcionando con nuevo token

□ PrismaService verificado/creado
□ users.service.ts refactorizado
□ admin.service.ts refactorizado
□ app.module.ts con PrismaModule
□ Endpoints funcionando correctamente

□ class-validator instalado
□ DTOs creados para auth
□ auth.controller.ts actualizado
□ ValidationPipe configurado en main.ts
□ Validación testeada y funcionando

□ @nestjs/throttler instalado
□ ThrottlerModule configurado
□ ThrottlerGuard agregado
□ Límites específicos configurados
□ Rate limiting testeado
```

---

## 🚨 SI ALGO SALE MAL

### Error: JWT_SECRET not found
```bash
# Verificar que .env existe
ls -la pick-survive-backend/.env

# Verificar contenido
cat pick-survive-backend/.env | grep JWT_SECRET

# Reiniciar servidor
npm run start:dev
```

### Error: Cannot find module PrismaService
```bash
# Verificar que existe
ls -la src/prisma/prisma.service.ts

# Si no existe, crear usando código de Paso 1
```

### Error: Validation failed
```bash
# Verificar que ValidationPipe está en main.ts
grep -A 5 "ValidationPipe" src/main.ts

# Verificar que DTOs tienen decoradores
grep "@Is" src/auth/dto/*.ts
```

### Error: Too Many Requests (429) constante
```bash
# Aumentar límites temporalmente en app.module.ts
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,  // Aumentar a 100 temporalmente
}),
```

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisar logs del servidor
2. Verificar que .env tiene todas las variables
3. Reiniciar completamente el servidor
4. Limpiar node_modules si es necesario

```bash
rm -rf node_modules
npm install
npm run start:dev
```

---

## 🎯 SIGUIENTE PASO

Una vez completadas estas correcciones críticas:
1. ✅ Commit de cambios
2. ✅ Crear PR para review
3. ✅ Continuar con INFORME_PARA_DEVELOPERS.md
4. ✅ Implementar testing según INFORME_PARA_TESTERS.md

---

**Tiempo total estimado:** 2-4 horas  
**Impacto:** Resuelve las 3 vulnerabilidades más críticas  
**Siguiente:** FASE 2 - Testing (ver RESUMEN_EJECUTIVO_AUDITORIA.md)

---

*Guía creada: 24 de Octubre, 2025*

