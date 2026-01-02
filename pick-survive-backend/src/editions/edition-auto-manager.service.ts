import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FOOTBALL_API_CONFIG } from '../config/football-api';
import { EditionCloseService } from './edition-close.service';
import { PointsService } from '../points/points.service';
import { CoinsService } from '../coins/coins.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class EditionAutoManagerService {
  private readonly logger = new Logger(EditionAutoManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly editionCloseService: EditionCloseService,
    private readonly pointsService: PointsService,
    private readonly coinsService: CoinsService,
    private readonly achievementsService: AchievementsService,
  ) {}

  /**
   * Cron job que se ejecuta cada hora para gestionar ediciones automáticamente
   * MEJORADO: Frecuencia reducida para evitar eliminaciones prematuras
   */
  @Cron(CronExpression.EVERY_HOUR)
  async manageEditions() {
    this.logger.log('🔄 Iniciando gestión automática de ediciones...');
    
    try {
      // Obtener todas las ediciones activas
      const activeEditions = await this.prisma.edition.findMany({
        where: {
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
        include: {
          league: true,
          participants: {
            include: {
              user: true,
              picks: {
                include: {
                  match: {
                    include: {
                      homeTeam: true,
                      awayTeam: true,
                    }
                  }
                }
              }
            }
          }
        }
      });

      this.logger.log(`📊 Encontradas ${activeEditions.length} ediciones activas`);

      for (const edition of activeEditions) {
        await this.processEdition(edition);
      }

      this.logger.log('✅ Gestión automática de ediciones completada');
    } catch (error) {
      this.logger.error('❌ Error en gestión automática de ediciones:', error);
    }
  }

  /**
   * Procesa una edición específica
   */
  private async processEdition(edition: any) {
    this.logger.log(`🏆 Procesando edición: ${edition.name}`);

    try {
      // 1. Determinar la jornada actual
      const currentMatchday = await this.getCurrentMatchday(edition);
      this.logger.log(`📅 Jornada actual para ${edition.name}: ${currentMatchday}`);

      // 2. Si la edición está abierta y es hora de empezar
      if (edition.status === 'OPEN' && currentMatchday >= edition.startMatchday) {
        await this.startEdition(edition);
        return;
      }

      // 3. Si la edición está en progreso
      if (edition.status === 'IN_PROGRESS') {
        // Procesar todas las jornadas desde startMatchday hasta currentMatchday
        // Esto asegura que no se pierdan jornadas si el cron se ejecuta con retraso
        for (let matchday = edition.startMatchday; matchday <= currentMatchday; matchday++) {
          // Verificar si hay partidos de esta jornada que ya terminaron
          const finishedMatches = await this.getFinishedMatches(matchday);
          
          if (finishedMatches.length > 0) {
            this.logger.log(`⚽ Procesando jornada ${matchday}: ${finishedMatches.length} partidos terminados`);
            
            // Procesar resultados y eliminar jugadores SOLO para picks de esta jornada
            await this.processMatchResults(edition, finishedMatches, matchday);
          }
        }
        
        // Verificar si la edición debe terminar después de procesar todas las jornadas
        await this.checkEditionCompletion(edition);
      }

    } catch (error) {
      this.logger.error(`❌ Error procesando edición ${edition.name}:`, error);
    }
  }

  /**
   * Determina la jornada actual basándose en los partidos disponibles
   */
  private async getCurrentMatchday(edition: any): Promise<number> {
    // Obtener la jornada más reciente con partidos disponibles
    const latestMatch = await this.prisma.match.findFirst({
      where: {
        season: FOOTBALL_API_CONFIG.DEFAULT_SEASON,
        competition: FOOTBALL_API_CONFIG.DEFAULT_COMPETITION,
        kickoffAt: {
          lte: new Date(), // Partidos que ya han comenzado o terminado
        }
      },
      orderBy: {
        kickoffAt: 'desc'
      }
    });

    if (!latestMatch) {
      return edition.startMatchday;
    }

    // Si estamos antes de la jornada de inicio, devolver la jornada de inicio
    if (latestMatch.matchday < edition.startMatchday) {
      return edition.startMatchday;
    }

    // NO hay jornada de fin fija - el sistema se adapta automáticamente
    // a las jornadas que vayan apareciendo en la API
    return latestMatch.matchday;
  }

  /**
   * Inicia una edición automáticamente
   */
  private async startEdition(edition: any) {
    this.logger.log(`🚀 Iniciando edición: ${edition.name}`);
    
    await this.prisma.edition.update({
      where: { id: edition.id },
      data: { status: 'IN_PROGRESS' }
    });

    this.logger.log(`✅ Edición ${edition.name} iniciada automáticamente`);
  }

  /**
   * Obtiene partidos terminados de una jornada específica
   * MEJORADO: Validaciones más estrictas para evitar eliminaciones prematuras
   */
  private async getFinishedMatches(matchday: number) {
    const now = new Date();
    
    return await this.prisma.match.findMany({
      where: {
        matchday,
        season: FOOTBALL_API_CONFIG.DEFAULT_SEASON,
        competition: FOOTBALL_API_CONFIG.DEFAULT_COMPETITION,
        status: 'FINISHED',
        homeGoals: { not: null },
        awayGoals: { not: null },
        // VALIDACIÓN ADICIONAL: Solo procesar partidos que hayan terminado hace al menos 10 minutos
        // Esto evita procesar partidos que se marcaron como terminados por error
        kickoffAt: {
          lt: new Date(now.getTime() - 10 * 60 * 1000) // 10 minutos antes
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
  }

  /**
   * Procesa los resultados de los partidos y elimina jugadores
   * MEJORADO: Validaciones adicionales y procesamiento por jornada
   */
  private async processMatchResults(edition: any, finishedMatches: any[], matchday: number) {
    this.logger.log(`⚽ Procesando resultados para ${finishedMatches.length} partidos de jornada ${matchday}`);

    for (const match of finishedMatches) {
      // VALIDACIÓN ADICIONAL: Verificar que el partido realmente tenga un resultado válido
      if (match.homeGoals === null || match.awayGoals === null) {
        this.logger.warn(`⚠️ Saltando partido ${match.id} - Resultado incompleto`);
        continue;
      }

      // VALIDACIÓN ADICIONAL: Verificar que el partido haya terminado hace suficiente tiempo
      const matchEndTime = new Date(match.kickoffAt.getTime() + 90 * 60 * 1000); // Asumiendo 90 min de duración
      const now = new Date();
      const timeSinceEnd = now.getTime() - matchEndTime.getTime();
      
      if (timeSinceEnd < 5 * 60 * 1000) { // Menos de 5 minutos desde el final (buffer de seguridad)
        this.logger.warn(`⚠️ Saltando partido ${match.id} - Terminó hace menos de 5 minutos`);
        continue;
      }

      // CRÍTICO: Obtener SOLO las predicciones de esta jornada específica
      const picks = await this.prisma.pick.findMany({
        where: {
          matchId: match.id,
          matchday: matchday, // Solo picks de esta jornada
          participant: {
            editionId: edition.id,
            status: 'ACTIVE'
          }
        },
        include: {
          participant: {
            include: {
              user: true
            }
          }
        }
      });

      // Si no hay picks para este partido, saltar
      if (picks.length === 0) {
        this.logger.debug(`⏭️ No hay picks para partido ${match.id} en jornada ${matchday}`);
        continue;
      }

      this.logger.log(`🎯 Procesando ${picks.length} predicciones para ${match.homeTeam.name} vs ${match.awayTeam.name} (Jornada ${matchday})`);

      // Determinar el resultado correcto
      const correctResult = this.determineMatchResult(match);

      // Primero, eliminar jugadores que fallaron (en transacción para atomicidad)
      const winners: Array<{ userId: string; participantId: string; userAlias: string }> = [];
      
      await this.prisma.$transaction(async (tx) => {
        for (const pick of picks) {
          const pickResult = this.determinePickResult(pick, match);
          
          if (pickResult !== correctResult) {
            this.logger.log(`❌ Eliminando ${pick.participant.user.alias || pick.participant.user.email} - Predijo: ${pickResult}, Resultado: ${correctResult}`);
            
            await tx.participant.update({
              where: { id: pick.participant.id },
              data: { status: 'ELIMINATED' }
            });
          } else {
            this.logger.log(`✅ ${pick.participant.user.alias || pick.participant.user.email} sobrevive - Predijo correctamente: ${pickResult}`);
            
            // Guardar ganadores para otorgar recompensas después de la transacción
            if (pick.participant.status === 'ACTIVE') {
              winners.push({
                userId: pick.participant.userId,
                participantId: pick.participant.id,
                userAlias: pick.participant.user.alias || pick.participant.user.email,
              });
            }
          }
        }
      });

      // Otorgar recompensas a los ganadores (fuera de la transacción para evitar problemas)
      // Agrupar ganadores por usuario para evitar otorgar puntos múltiples veces por jornada
      const uniqueWinners = new Map<string, { userId: string; participantId: string; userAlias: string }>();
      for (const winner of winners) {
        if (!uniqueWinners.has(winner.userId)) {
          uniqueWinners.set(winner.userId, winner);
        }
      }

      this.logger.log(`🎁 Procesando recompensas para ${uniqueWinners.size} ganadores únicos de jornada ${matchday}`);

      for (const winner of uniqueWinners.values()) {
        try {
          // Verificar que el participante sigue activo (por si acaso cambió durante la transacción)
          const participant = await this.prisma.participant.findUnique({
            where: { id: winner.participantId },
            select: { status: true },
          });

          if (participant && participant.status === 'ACTIVE') {
            // Verificar si ya se otorgaron puntos para esta jornada (evitar duplicados)
            const existingPoints = await this.prisma.pointTransaction.findFirst({
              where: {
                userId: winner.userId,
                editionId: edition.id,
                matchday: matchday,
                type: 'MATCHDAY_WIN',
              },
            });

            if (existingPoints) {
              this.logger.log(`⚠️ Puntos ya otorgados a ${winner.userAlias} para jornada ${matchday}, omitiendo`);
              continue;
            }

            // Otorgar puntos (para clasificación)
            await this.pointsService.awardMatchdayPoints(
              winner.userId,
              edition.id,
              matchday,
              10 // 10 puntos por jornada ganada
            );
            this.logger.log(`🎁 Otorgados 10 puntos a ${winner.userAlias} por ganar jornada ${matchday}`);
            
            // Verificar si ya se otorgaron monedas para esta jornada (evitar duplicados)
            const existingCoins = await this.prisma.coinTransaction.findFirst({
              where: {
                userId: winner.userId,
                editionId: edition.id,
                matchday: matchday,
                type: 'MATCHDAY_WIN',
              },
            });

            if (!existingCoins) {
              // Otorgar monedas (para tienda)
              await this.coinsService.awardMatchdayCoins(
                winner.userId,
                edition.id,
                matchday,
                10 // 10 monedas por jornada ganada
              );
              this.logger.log(`💰 Otorgadas 10 monedas a ${winner.userAlias} por ganar jornada ${matchday}`);
            } else {
              this.logger.log(`⚠️ Monedas ya otorgadas a ${winner.userAlias} para jornada ${matchday}, omitiendo`);
            }
            
            // Verificar y desbloquear logros después de otorgar recompensas
            try {
              const unlocked = await this.achievementsService.checkAndUnlockAchievements(winner.userId);
              if (unlocked.length > 0) {
                this.logger.log(`🏆 Logros desbloqueados para ${winner.userAlias}: ${unlocked.join(', ')}`);
              }
            } catch (error) {
              this.logger.error(`Error verificando logros para usuario ${winner.userId}:`, error);
              // No fallar el proceso si hay error verificando logros
            }
          } else {
            this.logger.warn(`⚠️ Participante ${winner.userAlias} no está activo, no se otorgan recompensas`);
          }
        } catch (error) {
          this.logger.error(`❌ Error otorgando recompensas a usuario ${winner.userId}:`, error);
          // No fallar el proceso si hay error otorgando recompensas
        }
      }
    }
  }

  /**
   * Determina el resultado de un partido
   */
  private determineMatchResult(match: any): string {
    if (match.homeGoals > match.awayGoals) {
      return 'HOME_WIN';
    } else if (match.awayGoals > match.homeGoals) {
      return 'AWAY_WIN';
    } else {
      return 'DRAW';
    }
  }

  /**
   * Determina el resultado de una predicción
   */
  private determinePickResult(pick: any, match: any): string {
    // Si el jugador predijo el equipo local
    if (pick.teamId === match.homeTeamId) {
      return 'HOME_WIN';
    }
    // Si el jugador predijo el equipo visitante
    else if (pick.teamId === match.awayTeamId) {
      return 'AWAY_WIN';
    }
    // Si predijo empate (esto requeriría un campo adicional en el modelo Pick)
    else {
      return 'DRAW';
    }
  }

  /**
   * Verifica si la edición debe terminar y procesa premios si es necesario
   * NOTA: El cierre automático está desactivado. Solo el creador puede cerrar manualmente.
   */
  private async checkEditionCompletion(edition: any) {
    const activeParticipants = await this.prisma.participant.count({
      where: {
        editionId: edition.id,
        status: 'ACTIVE'
      }
    });

    this.logger.log(`👥 Participantes activos en ${edition.name}: ${activeParticipants}`);

    // Cierre automático desactivado - solo el creador puede cerrar manualmente
    // if (activeParticipants <= 1) {
    //   try {
    //     // Cerrar la edición y distribuir premios
    //     await this.editionCloseService.closeEdition(edition.id, 'system');
    //     this.logger.log(`🏆 Edición ${edition.name} cerrada y premios distribuidos`);
    //   } catch (error) {
    //     this.logger.error(`❌ Error cerrando edición ${edition.id}:`, error);
    //     // Si falla el cierre, al menos marcar como FINISHED
    //     await this.prisma.edition.update({
    //       where: { id: edition.id },
    //       data: { status: 'FINISHED' }
    //     });
    //   }
    // }
  }

  /**
   * MÉTODO DE EMERGENCIA: Restaura participantes eliminados incorrectamente
   * Solo usar cuando se confirme que fueron eliminados por error
   */
  async restoreEliminatedParticipants(editionId: string, participantIds: string[]) {
    this.logger.log(`🔄 Restaurando ${participantIds.length} participantes en edición ${editionId}`);
    
    try {
      const result = await this.prisma.participant.updateMany({
        where: {
          id: { in: participantIds },
          editionId: editionId,
          status: 'ELIMINATED'
        },
        data: {
          status: 'ACTIVE'
        }
      });

      this.logger.log(`✅ Restaurados ${result.count} participantes`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error restaurando participantes:`, error);
      throw error;
    }
  }

  /**
   * Método manual para procesar una edición específica
   */
  async processSpecificEdition(editionId: string) {
    this.logger.log(`🔧 Procesando edición específica: ${editionId}`);
    
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: {
        league: true,
        participants: {
          include: {
            user: true,
            picks: {
              include: {
                match: {
                  include: {
                    homeTeam: true,
                    awayTeam: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!edition) {
      throw new Error(`Edición ${editionId} no encontrada`);
    }

    await this.processEdition(edition);
  }

  /**
   * Obtiene estadísticas de una edición
   */
  async getEditionStats(editionId: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!edition) {
      throw new Error(`Edición ${editionId} no encontrada`);
    }

    const activeParticipants = edition.participants.filter(p => p.status === 'ACTIVE');
    const eliminatedParticipants = edition.participants.filter(p => p.status === 'ELIMINATED');

    return {
      edition,
      activeCount: activeParticipants.length,
      eliminatedCount: eliminatedParticipants.length,
      currentMatchday: await this.getCurrentMatchday(edition),
      status: edition.status
    };
  }
}
