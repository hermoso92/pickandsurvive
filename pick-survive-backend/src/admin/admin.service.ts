import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

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

  /**
   * Asigna créditos a un usuario (solo para usuarios maestros)
   */
  async addCreditsToUser(userId: string, amountCents: number, reason: string = 'Admin credit assignment'): Promise<{ success: boolean; newBalance: number }> {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, alias: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Crear entrada en el ledger directamente (sin liga)
    await this.prisma.ledger.create({
      data: {
        userId,
        type: 'ADJUSTMENT',
        amountCents,
        metaJson: {
          reason,
          adminAction: true,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Obtener el nuevo balance
    const newBalance = await this.ledgerService.getUserBalance(userId);

    return {
      success: true,
      newBalance
    };
  }
}
