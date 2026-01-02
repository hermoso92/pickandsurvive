import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FootballDataService } from './football-data.service';
import { FOOTBALL_API_CONFIG } from '../config/football-api';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly footballDataService: FootballDataService,
  ) {}

  /**
   * Sincroniza equipos de una competición
   */
  async syncTeams(competitionCode: string, season?: number): Promise<{ teamsCreated: number; teamsUpdated: number; teamsSkipped: number; totalFromAPI: number }> {
    this.logger.log(`Syncing teams for competition ${competitionCode}${season ? ` season ${season}` : ''}`);
    
    try {
      // Obtener equipos directamente del endpoint de equipos
      const teamsResponse = await this.footballDataService.getTeams(competitionCode, season);
      
      if (!teamsResponse || !teamsResponse.teams || !Array.isArray(teamsResponse.teams)) {
        this.logger.error(`Invalid response structure from API:`, teamsResponse);
        throw new Error('Invalid response structure from Football Data API');
      }

      this.logger.log(`Received ${teamsResponse.teams.length} teams from API`);
      
      let teamsCreated = 0;
      let teamsUpdated = 0;
      let teamsSkipped = 0;
      
      // Crear o actualizar equipos en la base de datos
      for (const teamData of teamsResponse.teams) {
        try {
          // Validar que el equipo tenga los campos necesarios
          if (!teamData.id || !teamData.name) {
            this.logger.warn(`Skipping team with missing required fields:`, teamData);
            teamsSkipped++;
            continue;
          }

          // Buscar equipo por externalId primero
          let existing = await this.prisma.team.findUnique({
            where: { externalId: teamData.id }
          });
          
          // Si no existe por externalId, buscar por nombre (puede haber sido creado manualmente)
          if (!existing) {
            existing = await this.prisma.team.findUnique({
              where: { name: teamData.name }
            });
            
            // Si existe por nombre pero sin externalId, actualizar el externalId
            if (existing && !existing.externalId) {
              await this.prisma.team.update({
                where: { id: existing.id },
                data: {
                  externalId: teamData.id,
                  shortName: teamData.shortName || teamData.name.substring(0, 3).toUpperCase(),
                  crest: teamData.crest || null,
                  lastSyncedAt: new Date(),
                },
              });
              teamsUpdated++;
              this.logger.log(`✅ Actualizado equipo ${teamData.name} con externalId ${teamData.id}`);
              continue;
            }
          }
          
          const wasNew = !existing;
          
          // Si existe, actualizar; si no, crear
          if (existing) {
            await this.prisma.team.update({
              where: { id: existing.id },
              data: {
                name: teamData.name,
                shortName: teamData.shortName || teamData.name.substring(0, 3).toUpperCase(),
                crest: teamData.crest || null,
                lastSyncedAt: new Date(),
              },
            });
            teamsUpdated++;
          } else {
            await this.prisma.team.create({
              data: {
                externalId: teamData.id,
                name: teamData.name,
                shortName: teamData.shortName || teamData.name.substring(0, 3).toUpperCase(),
                crest: teamData.crest || null,
                lastSyncedAt: new Date(),
              },
            });
            teamsCreated++;
          }
        } catch (teamError: any) {
          // Si el error es de constraint único en name, intentar buscar y actualizar
          if (teamError.code === 'P2002' && teamError.meta?.target?.includes('name')) {
            this.logger.warn(`⚠️ Equipo con nombre duplicado: ${teamData.name}, intentando actualizar por nombre...`);
            try {
              const existingByName = await this.prisma.team.findUnique({
                where: { name: teamData.name }
              });
              
              if (existingByName) {
                // Actualizar el equipo existente con el externalId si no lo tiene
                await this.prisma.team.update({
                  where: { id: existingByName.id },
                  data: {
                    externalId: existingByName.externalId || teamData.id,
                    shortName: teamData.shortName || teamData.name.substring(0, 3).toUpperCase(),
                    crest: teamData.crest || null,
                    lastSyncedAt: new Date(),
                  },
                });
                teamsUpdated++;
                this.logger.log(`✅ Actualizado equipo existente ${teamData.name} con externalId ${teamData.id}`);
              } else {
                this.logger.error(`❌ No se pudo encontrar equipo ${teamData.name} para actualizar`);
                teamsSkipped++;
              }
            } catch (updateError) {
              this.logger.error(`❌ Error actualizando equipo ${teamData.name} por nombre:`, updateError);
              teamsSkipped++;
            }
          } else {
            this.logger.error(`❌ Error syncing team ${teamData.id} (${teamData.name}):`, teamError);
            teamsSkipped++;
          }
        }
      }

      this.logger.log(
        `Synced teams for ${competitionCode}: ${teamsCreated} created, ${teamsUpdated} updated, ${teamsSkipped} skipped`
      );
      
      return {
        teamsCreated,
        teamsUpdated,
        teamsSkipped,
        totalFromAPI: teamsResponse.teams.length
      };
    } catch (error) {
      this.logger.error(`Error syncing teams for ${competitionCode}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza partidos de una jornada específica
   */
  async syncMatchday(
    competitionCode: string,
    season: number,
    matchday: number
  ): Promise<{ matchesCreated: number; matchesUpdated: number; matchesSkipped: number; totalFromAPI: number }> {
    this.logger.log(`Syncing matchday ${matchday} for ${competitionCode} season ${season}`);
    
    try {
      const externalMatches = await this.footballDataService.getMatchesByMatchday(
        competitionCode,
        season,
        matchday
      );

      let matchesCreated = 0;
      let matchesUpdated = 0;

      this.logger.log(`Found ${externalMatches.length} matches from API for matchday ${matchday}`);
      
      let skippedMatches = 0;
      for (const externalMatch of externalMatches) {
        // Buscar equipos por externalId
        const homeTeam = await this.prisma.team.findUnique({
          where: { externalId: externalMatch.homeTeam.id }
        });
        const awayTeam = await this.prisma.team.findUnique({
          where: { externalId: externalMatch.awayTeam.id }
        });

        if (!homeTeam || !awayTeam) {
          this.logger.warn(
            `Teams not found for match ${externalMatch.id}: ` +
            `homeTeam=${externalMatch.homeTeam.name} (id: ${externalMatch.homeTeam.id}), ` +
            `awayTeam=${externalMatch.awayTeam.name} (id: ${externalMatch.awayTeam.id}). ` +
            `Skipping match. Please sync teams first.`
          );
          skippedMatches++;
          continue;
        }

        const kickoffAt = new Date(externalMatch.utcDate);
        const homeGoals = externalMatch.score?.fullTime?.home ?? null;
        const awayGoals = externalMatch.score?.fullTime?.away ?? null;

        const matchData = {
          externalId: externalMatch.id,
          matchday: externalMatch.matchday,
          kickoffAt,
          status: externalMatch.status,
          homeGoals,
          awayGoals,
          season,
          competition: competitionCode,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          lastSyncedAt: new Date(),
        };

        const existingMatch = await this.prisma.match.findUnique({
          where: { externalId: externalMatch.id }
        });

        if (existingMatch) {
          await this.prisma.match.update({
            where: { id: existingMatch.id },
            data: matchData,
          });
          matchesUpdated++;
        } else {
          await this.prisma.match.create({
            data: matchData,
          });
          matchesCreated++;
        }
      }

      this.logger.log(
        `Synced matchday ${matchday}: ${matchesCreated} created, ${matchesUpdated} updated, ${skippedMatches} skipped (teams not found)`
      );
      return { 
        matchesCreated, 
        matchesUpdated,
        matchesSkipped: skippedMatches,
        totalFromAPI: externalMatches.length
      };
    } catch (error) {
      this.logger.error(`Error syncing matchday ${matchday}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza partidos de un rango de fechas
   */
  async syncMatchesByDateRange(
    competitionCode: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{ matchesCreated: number; matchesUpdated: number }> {
    this.logger.log(`Syncing matches from ${dateFrom} to ${dateTo}`);
    
    try {
      const externalMatches = await this.footballDataService.getMatchesByDateRange(
        competitionCode,
        dateFrom,
        dateTo
      );

      let matchesCreated = 0;
      let matchesUpdated = 0;

      for (const externalMatch of externalMatches) {
        const homeTeam = await this.prisma.team.findUnique({
          where: { externalId: externalMatch.homeTeam.id }
        });
        const awayTeam = await this.prisma.team.findUnique({
          where: { externalId: externalMatch.awayTeam.id }
        });

        if (!homeTeam || !awayTeam) {
          this.logger.warn(`Teams not found for match ${externalMatch.id}, skipping`);
          continue;
        }

        const kickoffAt = new Date(externalMatch.utcDate);
        const homeGoals = externalMatch.score?.fullTime?.home ?? null;
        const awayGoals = externalMatch.score?.fullTime?.away ?? null;

        const matchData = {
          externalId: externalMatch.id,
          matchday: externalMatch.matchday,
          kickoffAt,
          status: externalMatch.status,
          homeGoals,
          awayGoals,
          season: new Date(externalMatch.utcDate).getFullYear(),
          competition: competitionCode,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          lastSyncedAt: new Date(),
        };

        const existingMatch = await this.prisma.match.findUnique({
          where: { externalId: externalMatch.id }
        });

        if (existingMatch) {
          await this.prisma.match.update({
            where: { id: existingMatch.id },
            data: matchData,
          });
          matchesUpdated++;
        } else {
          await this.prisma.match.create({
            data: matchData,
          });
          matchesCreated++;
        }
      }

      this.logger.log(`Synced date range: ${matchesCreated} created, ${matchesUpdated} updated`);
      return { matchesCreated, matchesUpdated };
    } catch (error) {
      this.logger.error(`Error syncing date range:`, error);
      throw error;
    }
  }

  /**
   * Calcula y actualiza el horario de cierre de picks para una edición
   */
  async updateEditionLocksAt(editionId: string): Promise<Date | null> {
    this.logger.log(`Updating locks at time for edition ${editionId}`);
    
    try {
      const edition = await this.prisma.edition.findUnique({
        where: { id: editionId },
        include: {
          participants: {
            include: {
              picks: {
                include: {
                  match: true
                }
              }
            }
          }
        }
      });

      if (!edition) {
        throw new Error(`Edition ${editionId} not found`);
      }

      // Obtener todos los partidos de la jornada de inicio
      const matches = await this.prisma.match.findMany({
        where: {
          matchday: edition.startMatchday,
          status: { not: 'POSTPONED' }
        }
      });

      if (matches.length === 0) {
        this.logger.warn(`No matches found for matchday ${edition.startMatchday}`);
        return null;
      }

      // Calcular el horario de cierre (1 hora antes del primer partido)
      const matchTimes = matches.map(match => match.kickoffAt.getTime());
      const earliestMatch = new Date(Math.min(...matchTimes));
      const locksAt = new Date(earliestMatch.getTime() - 60 * 60 * 1000);

      this.logger.log(`Calculated locks at: ${locksAt.toISOString()}`);
      return locksAt;
    } catch (error) {
      this.logger.error(`Error updating locks at for edition ${editionId}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza todas las jornadas de una temporada
   */
  async syncAllMatchdays(
    competitionCode: string,
    season: number,
    fromMatchday: number = 1,
    toMatchday: number = 38
  ): Promise<{ 
    totalMatchdays: number;
    successful: number;
    failed: number;
    matchesCreated: number;
    matchesUpdated: number;
    errors: Array<{ matchday: number; error: string }>;
  }> {
    this.logger.log(`Syncing all matchdays from ${fromMatchday} to ${toMatchday} for ${competitionCode} season ${season}`);
    
    let totalMatchesCreated = 0;
    let totalMatchesUpdated = 0;
    let successful = 0;
    let failed = 0;
    const errors: Array<{ matchday: number; error: string }> = [];

    for (let matchday = fromMatchday; matchday <= toMatchday; matchday++) {
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          const attempt = 4 - retries;
          if (attempt > 1) {
            this.logger.log(`Syncing matchday ${matchday}/${toMatchday}... (Intento ${attempt})`);
          } else {
            this.logger.log(`Syncing matchday ${matchday}/${toMatchday}...`);
          }
          
          const result = await this.syncMatchday(competitionCode, season, matchday);
          totalMatchesCreated += result.matchesCreated;
          totalMatchesUpdated += result.matchesUpdated;
          successful++;
          success = true;
          
          // Pausa más larga para respetar rate limiting (10 requests/minuto = 6 segundos mínimo)
          // Usamos 7 segundos para estar seguros de no exceder el límite
          if (matchday < toMatchday) {
            this.logger.log(`Esperando 7 segundos antes de la siguiente jornada (rate limiting)...`);
            await new Promise(resolve => setTimeout(resolve, 7000));
          }
        } catch (error: any) {
          const errorMessage = error.message || 'Unknown error';
          
          // Si es error 429 (rate limit), esperar más tiempo y reintentar
          if (errorMessage.includes('429') && retries > 1) {
            const waitTime = (4 - retries) * 15; // 15, 30, 45 segundos
            this.logger.warn(`⚠️ Rate limit alcanzado (429) para jornada ${matchday}. Esperando ${waitTime} segundos antes de reintentar...`);
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            retries--;
            continue;
          }
          
          // Si no es 429 o se agotaron los reintentos, registrar error
          if (retries === 1 || !errorMessage.includes('429')) {
            failed++;
            errors.push({ matchday, error: errorMessage });
            this.logger.error(`❌ Error syncing matchday ${matchday}:`, errorMessage);
            success = true; // Salir del loop de reintentos
          } else {
            retries--;
          }
        }
      }
    }

    this.logger.log(`Completed sync: ${successful} successful, ${failed} failed`);
    
    return {
      totalMatchdays: toMatchday - fromMatchday + 1,
      successful,
      failed,
      matchesCreated: totalMatchesCreated,
      matchesUpdated: totalMatchesUpdated,
      errors
    };
  }

  /**
   * Sincroniza partidos en vivo y actualiza resultados
   */
  async syncLiveMatches(): Promise<{ matchesUpdated: number }> {
    this.logger.log('Syncing live matches');
    
    try {
      const liveMatches = await this.footballDataService.getLiveMatches();
      let matchesUpdated = 0;

      for (const liveMatch of liveMatches) {
        const existingMatch = await this.prisma.match.findUnique({
          where: { externalId: liveMatch.id }
        });

        if (existingMatch) {
          const homeGoals = liveMatch.score?.fullTime?.home ?? null;
          const awayGoals = liveMatch.score?.fullTime?.away ?? null;

          await this.prisma.match.update({
            where: { id: existingMatch.id },
            data: {
              status: liveMatch.status,
              homeGoals,
              awayGoals,
              lastSyncedAt: new Date(),
            }
          });

          matchesUpdated++;
        }
      }

      this.logger.log(`Updated ${matchesUpdated} live matches`);
      return { matchesUpdated };
    } catch (error) {
      this.logger.error('Error syncing live matches:', error);
      throw error;
    }
  }
}
