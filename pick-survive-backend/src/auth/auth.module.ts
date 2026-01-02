import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module'; // Importa UsersModule
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'; // <-- Importa esto
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule, // Hazlo disponible aquí
    PrismaModule, // Para acceder a PrismaService
    PassportModule,
    JwtModule.register({
      global: true,
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