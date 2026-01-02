import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Función para buscar un usuario por su email
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // Nuevo método para crear un usuario con contraseña encriptada
  async createUser(email: string, password: string, alias?: string): Promise<User> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.findOneByEmail(email);
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

      const saltOrRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltOrRounds);

      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          alias: alias || null,
        },
      });

      // No devolver la contraseña
      delete (user as any).password;
      return user;
    } catch (error) {
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Error al crear usuario: ${error.message}`);
    }
  }
}