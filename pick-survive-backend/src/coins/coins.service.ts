import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoinTransactionDto } from './dto/create-coin-transaction.dto';

@Injectable()
export class CoinsService {
  private readonly logger = new Logger(CoinsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene o crea el registro de monedas de un usuario
   */
  async getOrCreateUserCoins(userId: string) {
    let userCoins = await this.prisma.userCoins.findUnique({
      where: { userId },
    });

    if (!userCoins) {
      userCoins = await this.prisma.userCoins.create({
        data: {
          userId,
          totalCoins: 0,
        },
      });
      this.logger.log(`Created UserCoins for user ${userId}`);
    }

    return userCoins;
  }

  /**
   * Obtiene las monedas totales de un usuario
   */
  async getUserCoins(userId: string): Promise<number> {
    const userCoins = await this.getOrCreateUserCoins(userId);
    return userCoins.totalCoins;
  }

  /**
   * Crea una transacción de monedas
   */
  async createCoinTransaction(dto: CreateCoinTransactionDto): Promise<void> {
    // Asegurar que el usuario tiene UserCoins
    await this.getOrCreateUserCoins(dto.userId);

    // Crear la transacción
    await this.prisma.coinTransaction.create({
      data: {
        userId: dto.userId,
        coins: dto.coins,
        type: dto.type,
        editionId: dto.editionId,
        matchday: dto.matchday,
        metaJson: dto.metaJson || {},
      },
    });

    // Actualizar el total de monedas del usuario
    await this.prisma.userCoins.update({
      where: { userId: dto.userId },
      data: {
        totalCoins: {
          increment: dto.coins,
        },
      },
    });

    this.logger.log(`Created coin transaction: ${dto.coins} coins for user ${dto.userId} (type: ${dto.type})`);
  }

  /**
   * Otorga monedas por jornada ganada
   */
  async awardMatchdayCoins(userId: string, editionId: string, matchday: number, coins: number = 10): Promise<void> {
    await this.createCoinTransaction({
      userId,
      coins,
      type: 'MATCHDAY_WIN',
      editionId,
      matchday,
      metaJson: {
        matchday,
        editionId,
        reason: 'Jornada ganada',
      },
    });
  }

  /**
   * Obtiene el historial de transacciones de monedas de un usuario
   */
  async getUserCoinHistory(userId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.coinTransaction.findMany({
      where: { userId },
      include: {
        edition: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Calcula las monedas ganadas en una edición específica
   */
  async calculateCoinsForEdition(userId: string, editionId: string): Promise<number> {
    const transactions = await this.prisma.coinTransaction.findMany({
      where: {
        userId,
        editionId,
      },
      select: {
        coins: true,
      },
    });

    return transactions.reduce((sum, t) => sum + t.coins, 0);
  }

  /**
   * Obtiene estadísticas de monedas de un usuario
   */
  async getUserCoinsStats(userId: string) {
    const userCoins = await this.getOrCreateUserCoins(userId);
    
    const totalTransactions = await this.prisma.coinTransaction.count({
      where: { userId },
    });

    const coinsByType = await this.prisma.coinTransaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: {
        coins: true,
      },
    });

    const coinsByEdition = await this.prisma.coinTransaction.groupBy({
      by: ['editionId'],
      where: {
        userId,
        editionId: { not: null },
      },
      _sum: {
        coins: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalCoins: userCoins.totalCoins,
      totalTransactions,
      coinsByType: coinsByType.map(c => ({
        type: c.type,
        coins: c._sum.coins || 0,
      })),
      coinsByEdition: coinsByEdition.map(c => ({
        editionId: c.editionId,
        coins: c._sum.coins || 0,
        transactions: c._count.id,
      })),
    };
  }
}

