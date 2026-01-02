import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMatchday(matchday: number) {
    return this.prisma.match.findMany({
      where: { matchday },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        kickoffAt: 'asc'
      }
    });
  }

  /**
   * Actualiza el resultado de un partido y evalúa todos los picks relacionados
   * @param matchId ID del partido
   * @param homeGoals Goles del equipo local
   * @param awayGoals Goles del equipo visitante
   */
  async updateMatchResult(matchId: string, homeGoals: number, awayGoals: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar que el partido existe
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true,
          picks: {
            include: {
              participant: {
                include: {
                  user: true,
                  edition: true
                }
              },
              team: true
            }
          }
        }
      });

      if (!match) {
        throw new NotFoundException('Partido no encontrado');
      }

      // 2. Verificar que el partido no tenga resultado previo
      if (match.status === 'FINISHED') {
        throw new BadRequestException('Este partido ya tiene resultado');
      }

      // 3. Actualizar el resultado del partido
      await tx.match.update({
        where: { id: matchId },
        data: {
          homeGoals,
          awayGoals,
          status: 'FINISHED'
        }
      });

      // 4. Determinar el equipo ganador
      let winningTeamId: string | null = null;
      if (homeGoals > awayGoals) {
        winningTeamId = match.homeTeamId;
      } else if (awayGoals > homeGoals) {
        winningTeamId = match.awayTeamId;
      }
      // Si es empate, winningTeamId queda null

      // 5. Evaluar cada pick y actualizar participantes
      const eliminatedParticipants: string[] = [];
      
      for (const pick of match.picks) {
        const participant = pick.participant;
        
        // Solo evaluar participantes activos
        if (participant.status === 'ACTIVE') {
          // Si hay empate, todos los picks de este partido pierden
          if (winningTeamId === null) {
            await tx.participant.update({
              where: { id: participant.id },
              data: { status: 'ELIMINATED' }
            });
            eliminatedParticipants.push(participant.user.alias || participant.user.email);
          } 
          // Si el pick coincide con el equipo ganador, continúa activo
          else if (pick.teamId === winningTeamId) {
            // El participante continúa activo, no hacer nada
          } 
          // Si el pick no coincide con el equipo ganador, eliminar
          else {
            await tx.participant.update({
              where: { id: participant.id },
              data: { status: 'ELIMINATED' }
            });
            eliminatedParticipants.push(participant.user.alias || participant.user.email);
          }
        }
      }

      // 6. Verificar si la edición debe terminar (todos eliminados o solo uno activo)
      const activeParticipants = await tx.participant.count({
        where: {
          editionId: match.picks[0]?.participant.editionId,
          status: 'ACTIVE'
        }
      });

      let editionStatus: string | null = null;
      if (activeParticipants <= 1) {
        editionStatus = 'FINISHED';
        await tx.edition.update({
          where: { id: match.picks[0]?.participant.editionId },
          data: { status: 'FINISHED' }
        });
      }

      return {
        match: {
          id: match.id,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          homeGoals,
          awayGoals,
          status: 'FINISHED'
        },
        winningTeam: winningTeamId ? 
          (winningTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name) : 
          'EMPATE',
        eliminatedParticipants,
        editionFinished: editionStatus === 'FINISHED',
        activeParticipantsRemaining: activeParticipants
      };
    });
  }

  /**
   * Obtiene la jornada máxima disponible en la base de datos
   */
  async getMaxMatchday(): Promise<{ maxMatchday: number }> {
    const match = await this.prisma.match.findFirst({
      orderBy: {
        matchday: 'desc'
      },
      select: {
        matchday: true
      }
    });

    return { maxMatchday: match?.matchday || 1 };
  }

  /**
   * Obtiene todos los partidos de una jornada específica
   */
  async getMatchesByMatchday(matchday: number) {
    return this.prisma.match.findMany({
      where: { matchday },
      include: {
        homeTeam: true,
        awayTeam: true,
        picks: {
          include: {
            participant: {
              include: {
                user: {
                  select: {
                    id: true,
                    alias: true,
                    email: true
                  }
                }
              }
            },
            team: true
          }
        }
      },
      orderBy: {
        kickoffAt: 'asc'
      }
    });
  }
}