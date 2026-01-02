import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from '../points/points.service';

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsService: PointsService,
  ) {}

  /**
   * Helper para obtener el logo seleccionado de un usuario
   */
  private async getUserSelectedLogo(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { selectedLogo: true },
    });

    if (!profile?.selectedLogo) {
      return null;
    }

    const logoItem = await this.prisma.shopItem.findUnique({
      where: { id: profile.selectedLogo },
      select: {
        id: true,
        code: true,
        name: true,
        imageUrl: true,
      },
    });

    return logoItem;
  }

  /**
   * Obtiene el ranking global por puntos
   * Suma los puntos de TODAS las ediciones para cada usuario
   */
  async getGlobalRanking(limit: number = 50, offset: number = 0) {
    // Obtener todos los usuarios que tienen transacciones de puntos
    // Calcular la suma de puntos de TODAS las ediciones para cada usuario
    const usersWithTotalPoints = await this.prisma.pointTransaction.groupBy({
      by: ['userId'],
      _sum: {
        points: true,
      },
    });

    // Obtener información de usuarios y ordenar por puntos totales
    const rankingData = await Promise.all(
      usersWithTotalPoints.map(async (item) => {
        const totalPoints = item._sum.points || 0;
        const userPoints = await this.prisma.userPoints.findUnique({
          where: { userId: item.userId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                alias: true,
              },
            },
            achievements: {
              include: {
                achievement: true,
              },
              take: 3,
            },
          },
        });

        if (!userPoints) {
          return null;
        }

        return {
          userId: item.userId,
          totalPoints, // Suma de TODAS las ediciones
          user: userPoints.user,
          achievements: userPoints.achievements,
        };
      })
    );

    // Filtrar nulos y ordenar por puntos totales (descendente)
    const sortedRanking = rankingData
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Calcular posición total
    const totalUsers = sortedRanking.length;

    // Paginar
    const paginatedRanking = sortedRanking.slice(offset, offset + limit);

    // Obtener logos seleccionados para todos los usuarios
    const rankingWithLogos = await Promise.all(
      paginatedRanking.map(async (item, index) => {
        const selectedLogo = await this.getUserSelectedLogo(item.user.id);
        return {
          position: offset + index + 1,
          user: {
            ...item.user,
            selectedLogo,
          },
          totalPoints: item.totalPoints, // Suma de TODAS las ediciones
          topAchievements: item.achievements.map(ua => ({
            code: ua.achievement.code,
            name: ua.achievement.name,
            icon: ua.achievement.icon,
            rarity: ua.achievement.rarity,
          })),
        };
      })
    );
    
    return {
      ranking: rankingWithLogos,
      total: totalUsers,
      limit,
      offset,
    };
  }

  /**
   * Obtiene el ranking de una liga específica
   */
  async getLeagueRanking(leagueId: string, limit: number = 50, offset: number = 0) {
    // Verificar que la liga existe
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundException(`Liga con ID ${leagueId} no encontrada`);
    }

    // Obtener todos los miembros de la liga
    const members = await this.prisma.leagueMember.findMany({
      where: { leagueId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            alias: true,
          },
        },
      },
    });

    const userIds = members.map(m => m.user.id);

    // Obtener puntos de estos usuarios
    const userPoints = await this.prisma.userPoints.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            alias: true,
          },
        },
        achievements: {
          include: {
            achievement: true,
          },
          take: 3,
        },
      },
      orderBy: {
        totalPoints: 'desc',
      },
    });

    // Ordenar y paginar
    const sorted = userPoints
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(offset, offset + limit);

    // Obtener logos seleccionados para todos los usuarios
    const rankingWithLogos = await Promise.all(
      sorted.map(async (up, index) => {
        const selectedLogo = await this.getUserSelectedLogo(up.user.id);
        return {
          position: offset + index + 1,
          user: {
            ...up.user,
            selectedLogo,
          },
          totalPoints: up.totalPoints,
          topAchievements: up.achievements.map(ua => ({
            code: ua.achievement.code,
            name: ua.achievement.name,
            icon: ua.achievement.icon,
            rarity: ua.achievement.rarity,
          })),
        };
      })
    );

    return {
      ranking: rankingWithLogos,
      total: userPoints.length,
      limit,
      offset,
      league: {
        id: league.id,
        name: league.name,
      },
    };
  }

  /**
   * Obtiene el ranking de una edición específica
   */
  async getEditionRanking(editionId: string) {
    // Verificar que la edición existe
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                alias: true,
              },
            },
            picks: {
              include: {
                match: true,
                team: true,
              },
            },
          },
        },
      },
    });

    if (!edition) {
      throw new NotFoundException(`Edición con ID ${editionId} no encontrada`);
    }

    // Calcular puntos por participante en esta edición
    const participantsWithPoints = await Promise.all(
      edition.participants.map(async (participant) => {
        const points = await this.pointsService.calculatePointsForEdition(
          participant.userId,
          editionId,
        );

        // Contar picks correctos
        const correctPicks = participant.picks.filter(pick => {
          const match = pick.match;
          if (!match || match.status !== 'FINISHED' || match.homeGoals === null || match.awayGoals === null) {
            return false;
          }

          const winningTeamId = match.homeGoals > match.awayGoals
            ? match.homeTeamId
            : match.awayTeamId;

          return pick.teamId === winningTeamId;
        }).length;

        return {
          participant,
          points,
          correctPicks,
          totalPicks: participant.picks.length,
          status: participant.status,
        };
      })
    );

    // Ordenar por puntos (descendente), luego por picks correctos
    participantsWithPoints.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.correctPicks - a.correctPicks;
    });

    // Obtener logos seleccionados para todos los participantes
    const rankingWithLogos = await Promise.all(
      participantsWithPoints.map(async (p, index) => {
        const selectedLogo = await this.getUserSelectedLogo(p.participant.user.id);
        return {
          position: index + 1,
          user: {
            ...p.participant.user,
            selectedLogo,
          },
          points: p.points,
          correctPicks: p.correctPicks,
          totalPicks: p.totalPicks,
          status: p.status,
        };
      })
    );

    return {
      ranking: rankingWithLogos,
      edition: {
        id: edition.id,
        name: edition.name,
        status: edition.status,
      },
    };
  }

  /**
   * Obtiene la posición de un usuario en los rankings
   */
  async getUserRank(userId: string, scope: 'global' | 'league' | 'edition', scopeId?: string) {
    let position = 0;
    let total = 0;
    let totalPoints = 0;

    if (scope === 'global') {
      // Calcular puntos totales del usuario (suma de TODAS las ediciones)
      const userTransactions = await this.prisma.pointTransaction.groupBy({
        by: ['userId'],
        where: { userId },
        _sum: {
          points: true,
        },
      });

      totalPoints = userTransactions[0]?._sum.points || 0;

      // Contar cuántos usuarios tienen más puntos (sumando todas sus ediciones)
      const allUsersPoints = await this.prisma.pointTransaction.groupBy({
        by: ['userId'],
        _sum: {
          points: true,
        },
      });

      const usersAbove = allUsersPoints.filter(
        (item) => (item._sum.points || 0) > totalPoints
      ).length;

      position = usersAbove + 1;
      total = allUsersPoints.length;
    } else if (scope === 'league' && scopeId) {
      const leagueRanking = await this.getLeagueRanking(scopeId, 1000, 0);
      const userIndex = leagueRanking.ranking.findIndex(r => r.user.id === userId);
      position = userIndex >= 0 ? userIndex + 1 : 0;
      total = leagueRanking.total;
      // Para liga, usar totalPoints del UserPoints (suma de todas las ediciones)
      totalPoints = await this.pointsService.getUserPoints(userId);
    } else if (scope === 'edition' && scopeId) {
      const editionRanking = await this.getEditionRanking(scopeId);
      const userIndex = editionRanking.ranking.findIndex(r => r.user.id === userId);
      position = userIndex >= 0 ? userIndex + 1 : 0;
      total = editionRanking.ranking.length;
      // Para edición, usar solo puntos de esa edición
      totalPoints = await this.pointsService.calculatePointsForEdition(userId, scopeId);
    }
    
    return {
      position,
      total,
      scope,
      scopeId,
      totalPoints,
    };
  }

  /**
   * Obtiene el histórico de ediciones finalizadas en las que el usuario ha participado
   */
  async getUserEditionHistory(userId: string) {
    // Obtener todas las ediciones finalizadas en las que el usuario participó
    const participations = await this.prisma.participant.findMany({
      where: {
        userId,
        edition: {
          status: 'FINISHED',
        },
      },
      include: {
        edition: {
          include: {
            league: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        picks: {
          include: {
            match: true,
          },
        },
      },
      orderBy: {
        edition: {
          createdAt: 'desc',
        },
      },
    });

    // Calcular puntos y estadísticas para cada edición
    const history = await Promise.all(
      participations.map(async (participation) => {
        const points = await this.pointsService.calculatePointsForEdition(
          userId,
          participation.editionId
        );

        // Contar picks correctos
        const correctPicks = participation.picks.filter(pick => {
          const match = pick.match;
          if (!match || match.status !== 'FINISHED' || match.homeGoals === null || match.awayGoals === null) {
            return false;
          }

          const winningTeamId = match.homeGoals > match.awayGoals
            ? match.homeTeamId
            : match.awayTeamId;

          return pick.teamId === winningTeamId;
        }).length;

        // Obtener posición en el ranking de esa edición
        const editionRanking = await this.getEditionRanking(participation.editionId);
        const userPosition = editionRanking.ranking.findIndex(r => r.user.id === userId) + 1;

        return {
          edition: {
            id: participation.edition.id,
            name: participation.edition.name,
            status: participation.edition.status,
            createdAt: participation.edition.createdAt,
            league: participation.edition.league,
          },
          points,
          correctPicks,
          totalPicks: participation.picks.length,
          position: userPosition > 0 ? userPosition : null,
          totalParticipants: editionRanking.ranking.length,
          status: participation.status,
        };
      })
    );

    return {
      history,
      total: history.length,
    };
  }
}

