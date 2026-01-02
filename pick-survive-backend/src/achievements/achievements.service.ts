import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsService: PointsService,
  ) {}

  /**
   * Obtiene todos los logros disponibles
   */
  async getAllAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: [
        { rarity: 'asc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Obtiene los logros de un usuario
   */
  async getUserAchievements(userId: string) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: {
        unlockedAt: 'desc',
      },
    });

    return userAchievements.map(ua => ({
      ...ua.achievement,
      unlockedAt: ua.unlockedAt,
      unlocked: true,
    }));
  }

  /**
   * Verifica y desbloquea logros para un usuario
   */
  async checkAndUnlockAchievements(userId: string): Promise<string[]> {
    const unlockedCodes: string[] = [];

    // Asegurar que el usuario tiene UserPoints
    await this.pointsService.getOrCreateUserPoints(userId);

    // Obtener todos los logros disponibles
    const allAchievements = await this.getAllAchievements();
    
    // Obtener logros ya desbloqueados
    const unlockedAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));

    // Obtener datos del usuario para verificación
    const userPoints = await this.pointsService.getUserPoints(userId);
    const userStats = await this.pointsService.getUserPointsStats(userId);

    // Obtener participaciones del usuario
    const participations = await this.prisma.participant.findMany({
      where: { userId },
      include: {
        edition: true,
        picks: {
          include: {
            match: true,
          },
        },
      },
    });

    // Verificar cada logro
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) {
        continue; // Ya está desbloqueado
      }

      const shouldUnlock = await this.checkAchievementCondition(
        achievement.code,
        userId,
        userPoints,
        userStats,
        participations,
      );

      if (shouldUnlock) {
        await this.unlockAchievement(userId, achievement.id, achievement.code, achievement.pointsReward);
        unlockedCodes.push(achievement.code);
      }
    }

    return unlockedCodes;
  }

  /**
   * Verifica si se cumple la condición de un logro
   */
  private async checkAchievementCondition(
    code: string,
    userId: string,
    userPoints: number,
    userStats: any,
    participations: any[],
  ): Promise<boolean> {
    switch (code) {
      case 'FIRST_WIN':
        // Primera jornada ganada
        const firstWin = userStats.pointsByType.find((p: any) => p.type === 'MATCHDAY_WIN');
        return firstWin && firstWin.points >= 10;

      case 'WIN_STREAK_3':
        return await this.checkWinStreak(userId, 3);

      case 'WIN_STREAK_5':
        return await this.checkWinStreak(userId, 5);

      case 'WIN_STREAK_10':
        return await this.checkWinStreak(userId, 10);

      case 'PERFECT_WEEK':
        // 7 jornadas correctas en una semana (simplificado: 7 victorias seguidas)
        return await this.checkWinStreak(userId, 7);

      case 'PARTICIPANT_5':
        return participations.length >= 5;

      case 'PARTICIPANT_10':
        return participations.length >= 10;

      case 'PARTICIPANT_25':
        return participations.length >= 25;

      case 'POINTS_100':
        return userPoints >= 100;

      case 'POINTS_500':
        return userPoints >= 500;

      case 'POINTS_1000':
        return userPoints >= 1000;

      case 'CHAMPION':
        // Ganar una edición (participante activo cuando la edición termina)
        return participations.some((p: any) => 
          p.status === 'ACTIVE' && p.edition.status === 'FINISHED'
        );

      case 'UNDEFEATED':
        // Ganar edición sin fallar ninguna jornada
        return await this.checkUndefeated(userId, participations);

      case 'COMEBACK':
        // Volver a ganar después de 3 derrotas
        return await this.checkComeback(userId);

      default:
        return false;
    }
  }

  /**
   * Verifica si el usuario tiene una racha de victorias
   */
  private async checkWinStreak(userId: string, streakLength: number): Promise<boolean> {
    const transactions = await this.prisma.pointTransaction.findMany({
      where: {
        userId,
        type: 'MATCHDAY_WIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: streakLength,
    });

    if (transactions.length < streakLength) {
      return false;
    }

    // Verificar que sean consecutivas (mismo matchday o matchdays consecutivos)
    // Simplificado: si hay al menos streakLength transacciones, asumimos racha
    return true;
  }

  /**
   * Verifica si el usuario ganó una edición sin fallar
   */
  private async checkUndefeated(userId: string, participations: any[]): Promise<boolean> {
    for (const participation of participations) {
      if (participation.status === 'ACTIVE' && participation.edition.status === 'FINISHED') {
        // Verificar que todos los picks fueron correctos
        const allPicksCorrect = participation.picks.every((pick: any) => {
          if (!pick.match.homeGoals && pick.match.homeGoals !== 0) return false;
          if (pick.match.status !== 'FINISHED') return false;
          
          const winningTeamId = pick.match.homeGoals > pick.match.awayGoals
            ? pick.match.homeTeamId
            : pick.match.awayTeamId;
          
          return pick.teamId === winningTeamId;
        });

        if (allPicksCorrect && participation.picks.length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Verifica si el usuario hizo comeback (ganar después de 3 derrotas)
   */
  private async checkComeback(userId: string): Promise<boolean> {
    // Obtener transacciones ordenadas por fecha
    const transactions = await this.prisma.pointTransaction.findMany({
      where: {
        userId,
        type: 'MATCHDAY_WIN',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Buscar patrón: pérdida, pérdida, pérdida, victoria
    // Simplificado: si hay al menos una victoria después de varias jornadas sin puntos
    // Esto es una simplificación, en producción se necesitaría rastrear las derrotas
    return false; // Implementación simplificada
  }

  /**
   * Desbloquea un logro para un usuario
   */
  private async unlockAchievement(
    userId: string,
    achievementId: string,
    achievementCode: string,
    pointsReward: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Crear UserAchievement
      await tx.userAchievement.create({
        data: {
          userId,
          achievementId,
        },
      });

      // Otorgar puntos del logro si tiene recompensa
      if (pointsReward > 0) {
        await this.pointsService.createPointTransaction({
          userId,
          points: pointsReward,
          type: 'ACHIEVEMENT_UNLOCK',
          metaJson: {
            achievementCode,
            achievementId,
          },
        });
      }

      this.logger.log(`🏆 Logro desbloqueado: ${achievementCode} para usuario ${userId} (${pointsReward} puntos)`);
    });
  }

  /**
   * Desbloquea un logro específico (para uso administrativo)
   */
  async unlockAchievementByCode(userId: string, achievementCode: string): Promise<void> {
    const achievement = await this.prisma.achievement.findUnique({
      where: { code: achievementCode },
    });

    if (!achievement) {
      throw new NotFoundException(`Logro con código ${achievementCode} no encontrado`);
    }

    // Verificar si ya está desbloqueado
    const existing = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing) {
      return; // Ya está desbloqueado
    }

    await this.unlockAchievement(userId, achievement.id, achievementCode, achievement.pointsReward);
  }
}

