import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePointTransactionDto } from './dto/create-point-transaction.dto';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene o crea el registro de puntos de un usuario
   */
  async getOrCreateUserPoints(userId: string) {
    let userPoints = await this.prisma.userPoints.findUnique({
      where: { userId },
    });

    if (!userPoints) {
      userPoints = await this.prisma.userPoints.create({
        data: {
          userId,
          totalPoints: 0,
        },
      });
      this.logger.log(`Created UserPoints for user ${userId}`);
    }

    return userPoints;
  }

  /**
   * Obtiene los puntos totales de un usuario
   */
  async getUserPoints(userId: string): Promise<number> {
    const userPoints = await this.getOrCreateUserPoints(userId);
    return userPoints.totalPoints;
  }

  /**
   * Crea una transacción de puntos
   */
  async createPointTransaction(dto: CreatePointTransactionDto): Promise<void> {
    // Asegurar que el usuario tiene UserPoints
    await this.getOrCreateUserPoints(dto.userId);

    // Crear la transacción
    await this.prisma.pointTransaction.create({
      data: {
        userId: dto.userId,
        points: dto.points,
        type: dto.type,
        editionId: dto.editionId,
        matchday: dto.matchday,
        metaJson: dto.metaJson || {},
      },
    });

    // Actualizar el total de puntos del usuario
    await this.prisma.userPoints.update({
      where: { userId: dto.userId },
      data: {
        totalPoints: {
          increment: dto.points,
        },
      },
    });

    this.logger.log(`Created point transaction: ${dto.points} points for user ${dto.userId} (type: ${dto.type})`);
  }

  /**
   * Otorga puntos por jornada ganada
   */
  async awardMatchdayPoints(userId: string, editionId: string, matchday: number, points: number = 10): Promise<void> {
    await this.createPointTransaction({
      userId,
      points,
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
   * Obtiene el historial de transacciones de puntos de un usuario
   */
  async getUserPointHistory(userId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.pointTransaction.findMany({
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
   * Calcula los puntos ganados en una edición específica
   */
  async calculatePointsForEdition(userId: string, editionId: string): Promise<number> {
    const transactions = await this.prisma.pointTransaction.findMany({
      where: {
        userId,
        editionId,
      },
      select: {
        points: true,
      },
    });

    return transactions.reduce((sum, t) => sum + t.points, 0);
  }

  /**
   * Obtiene estadísticas de puntos de un usuario
   */
  async getUserPointsStats(userId: string) {
    const userPoints = await this.getOrCreateUserPoints(userId);
    
    const totalTransactions = await this.prisma.pointTransaction.count({
      where: { userId },
    });

    const pointsByType = await this.prisma.pointTransaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: {
        points: true,
      },
    });

    const pointsByEdition = await this.prisma.pointTransaction.groupBy({
      by: ['editionId'],
      where: {
        userId,
        editionId: { not: null },
      },
      _sum: {
        points: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalPoints: userPoints.totalPoints,
      totalTransactions,
      pointsByType: pointsByType.map(p => ({
        type: p.type,
        points: p._sum.points || 0,
      })),
      pointsByEdition: pointsByEdition.map(p => ({
        editionId: p.editionId,
        points: p._sum.points || 0,
        transactions: p._count.id,
      })),
    };
  }
}

