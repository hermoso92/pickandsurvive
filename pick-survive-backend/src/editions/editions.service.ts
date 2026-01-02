import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class EditionsService {
  private readonly logger = new Logger(EditionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}
  
  /**
   * Encuentra todas las ediciones que están actualmente abiertas.
   */
  async findAll() {
    return this.prisma.edition.findMany({
      where: { 
        status: {
          in: ['OPEN', 'IN_PROGRESS'] // Incluir ediciones abiertas y en progreso
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { startMatchday: 'asc' } // Opcional: ordenarlas por jornada
    });
  }

  /**
   * Encuentra una única edición por su ID, incluyendo sus participantes y los picks de estos.
   * @param id El ID de la edición a buscar.
   */
  async findOne(id: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id },
      include: {
        // Incluimos la liga con sus miembros para verificar permisos
        league: {
          include: {
            members: {
              select: {
                userId: true,
                role: true,
              }
            }
          }
        },
        // Incluimos los participantes para saber quién está jugando
        participants: {
          include: {
            // De cada participante, incluimos los datos de su usuario
            user: {
              select: { // Usamos 'select' para no exponer datos sensibles como la contraseña
                id: true,
                alias: true,
                email: true,
              }
            },
            // Y también incluimos los picks que ha hecho en esta edición
            picks: {
              include: {
                team: true, // De cada pick, incluimos los datos del equipo elegido
                match: {
                  include: {
                    homeTeam: true,
                    awayTeam: true
                  }
                }
              }
            }
          },
          orderBy: {
            status: 'asc' // Primero los activos, luego los eliminados
          }
        },
      },
    });

    if (!edition) {
      throw new NotFoundException(`La edición con ID "${id}" no fue encontrada.`);
    }

    // Separar participantes activos y eliminados para mejor organización
    const activeParticipants = edition.participants.filter(p => p.status === 'ACTIVE');
    const eliminatedParticipants = edition.participants.filter(p => p.status === 'ELIMINATED');

    return {
      ...edition,
      activeParticipants,
      eliminatedParticipants,
      totalParticipants: edition.participants.length,
      activeCount: activeParticipants.length,
      eliminatedCount: eliminatedParticipants.length
    };
  }

  /**
   * Permite que un usuario se una a una edición.
   * Realiza varias comprobaciones y ejecuta las operaciones en una transacción segura.
   * @param editionId El ID de la edición a la que unirse.
   * @param userId El ID del usuario que se une.
   */
  async joinEdition(editionId: string, userId: string) {
    this.logger.log(`joinEdition - Iniciando. EditionId: ${editionId}, UserId: ${userId}`);
    
    try {
      // Usamos una transacción para asegurar la atomicidad de las operaciones:
      // o todo se completa con éxito, o nada se guarda en la base de datos.
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.debug('Iniciando transacción...');
        
        // 1. Validar que la edición y el usuario existen.
        this.logger.debug('Verificando edición...');
        const edition = await tx.edition.findUnique({ 
          where: { id: editionId },
          include: { league: true }
        });
        if (!edition) {
          this.logger.warn(`Edición no encontrada: ${editionId}`);
          throw new NotFoundException('La edición no existe.');
        }
        this.logger.debug(`Edición encontrada: ${edition.name}`);
        
        if (edition.status !== 'OPEN') {
          this.logger.warn(`Edición no está abierta: ${edition.status}`);
          throw new BadRequestException('Esta edición ya no está abierta para unirse.');
        }
        this.logger.debug('Edición está abierta');

        this.logger.debug('Verificando usuario...');
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          this.logger.warn(`Usuario no encontrado: ${userId}`);
          throw new NotFoundException('El usuario no existe.');
        }
        this.logger.debug(`Usuario encontrado: ${user.email}`);

        // 2. Verificar si ya está participando
        this.logger.debug('Verificando participación existente...');
        const existingParticipant = await tx.participant.findFirst({
          where: { userId, editionId },
        });
        if (existingParticipant) {
          this.logger.warn(`Usuario ya está participando: ${userId} en ${editionId}`);
          throw new ConflictException('Ya estás participando en esta edición.');
        }
        this.logger.debug('Usuario no está participando aún');

        // 3. Verificar balance suficiente
        this.logger.debug('Verificando balance del usuario...');
        const userBalance = await this.ledgerService.getUserBalance(userId);
        if (userBalance < edition.entryFeeCents) {
          this.logger.warn(`Saldo insuficiente: ${userBalance} < ${edition.entryFeeCents}`);
          throw new ConflictException(`Saldo insuficiente. Necesitas ${edition.entryFeeCents} céntimos pero tienes ${userBalance}.`);
        }
        this.logger.debug(`Balance suficiente: ${userBalance} >= ${edition.entryFeeCents}`);

        // 4. Crear el registro del participante
        this.logger.debug('Creando participante...');
        const participant = await tx.participant.create({
          data: { userId, editionId, status: 'ACTIVE' },
        });
        this.logger.log(`Participante creado: ${participant.id}`);

        // 5. Registrar entrada en el ledger (cobrar entrada) dentro de la transacción
        this.logger.debug('Registrando entrada en ledger...');
        await tx.ledger.create({
          data: {
            userId,
            leagueId: edition.leagueId,
            editionId,
            type: 'ENTRY_FEE',
            amountCents: -edition.entryFeeCents, // Negativo porque es un gasto
            metaJson: {
              entryFee: edition.entryFeeCents,
              editionName: edition.name,
              leagueName: edition.league.name,
            },
          },
        });
        this.logger.debug('Entrada registrada en ledger');

        // 6. Actualizar el potCents de la edición
        this.logger.debug('Actualizando potCents de la edición...');
        await tx.edition.update({
          where: { id: editionId },
          data: {
            potCents: {
              increment: edition.entryFeeCents,
            },
          },
        });
        this.logger.debug(`PotCents actualizado: +${edition.entryFeeCents}`);
        
        return participant;
      });
      
      this.logger.log('Transacción completada exitosamente');
      return result;
    } catch (error) {
      this.logger.error(`Error en joinEdition: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas detalladas de una edición
   * @param id ID de la edición
   */
  async getEditionStats(id: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                alias: true,
                email: true
              }
            },
            picks: {
              include: {
                team: true,
                match: {
                  include: {
                    homeTeam: true,
                    awayTeam: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!edition) {
      throw new NotFoundException(`La edición con ID "${id}" no fue encontrada.`);
    }

    const activeParticipants = edition.participants.filter(p => p.status === 'ACTIVE');
    const eliminatedParticipants = edition.participants.filter(p => p.status === 'ELIMINATED');

    // Estadísticas adicionales
    const stats = {
      edition: {
        id: edition.id,
        name: edition.name,
        status: edition.status,
        entryFeeCents: edition.entryFeeCents,
        potCents: edition.potCents,
        startMatchday: edition.startMatchday
      },
      participants: {
        total: edition.participants.length,
        active: activeParticipants.length,
        eliminated: eliminatedParticipants.length
      },
      activeParticipants: activeParticipants.map(p => ({
        id: p.id,
        user: p.user,
        picks: p.picks.map(pick => ({
          id: pick.id,
          matchday: pick.matchday,
          team: pick.team,
          match: {
            id: pick.match.id,
            homeTeam: pick.match.homeTeam.name,
            awayTeam: pick.match.awayTeam.name,
            homeGoals: pick.match.homeGoals,
            awayGoals: pick.match.awayGoals,
            status: pick.match.status
          }
        }))
      })),
      eliminatedParticipants: eliminatedParticipants.map(p => ({
        id: p.id,
        user: p.user,
        picks: p.picks.map(pick => ({
          id: pick.id,
          matchday: pick.matchday,
          team: pick.team,
          match: {
            id: pick.match.id,
            homeTeam: pick.match.homeTeam.name,
            awayTeam: pick.match.awayTeam.name,
            homeGoals: pick.match.homeGoals,
            awayGoals: pick.match.awayGoals,
            status: pick.match.status
          }
        }))
      }))
    };

    return stats;
  }

  /**
   * Obtiene todos los partidos de una edición con sus picks (para modo test)
   */
  async getEditionMatchesForTest(editionId: string) {
    // Obtener la edición con su jornada de inicio
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      select: { startMatchday: true }
    });

    if (!edition) {
      throw new NotFoundException(`La edición con ID "${editionId}" no fue encontrada.`);
    }

    // Obtener todos los partidos de la jornada de inicio con sus picks
    const matches = await this.prisma.match.findMany({
      where: {
        matchday: edition.startMatchday
      },
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

    return {
      matchday: edition.startMatchday,
      matches: matches.map(match => ({
        id: match.id,
        matchday: match.matchday,
        homeTeam: {
          id: match.homeTeam.id,
          name: match.homeTeam.name,
          shortName: match.homeTeam.shortName
        },
        awayTeam: {
          id: match.awayTeam.id,
          name: match.awayTeam.name,
          shortName: match.awayTeam.shortName
        },
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        status: match.status,
        kickoffAt: match.kickoffAt,
        picks: match.picks.map(pick => ({
          id: pick.id,
          participant: {
            id: pick.participant.id,
            userId: pick.participant.userId,
            alias: pick.participant.user.alias || pick.participant.user.email,
            email: pick.participant.user.email,
            status: pick.participant.status
          },
          team: {
            id: pick.team.id,
            name: pick.team.name,
            shortName: pick.team.shortName
          }
        })),
        picksCount: match.picks.length
      }))
    };
  }

  /**
   * Avanza la jornada de una edición manualmente (modo test)
   */
  async advanceMatchday(editionId: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
    });

    if (!edition) {
      throw new NotFoundException(`La edición con ID "${editionId}" no fue encontrada.`);
    }

    // Avanzar la jornada
    const newMatchday = edition.startMatchday + 1;
    
    // Si la edición está finalizada, reactivarla al avanzar jornada
    const updateData: any = { startMatchday: newMatchday };
    if (edition.status === 'FINISHED' || edition.status === 'CLOSED') {
      updateData.status = 'IN_PROGRESS';
    }
    
    await this.prisma.edition.update({
      where: { id: editionId },
      data: updateData,
    });

    return {
      message: `Jornada avanzada a ${newMatchday}`,
      currentMatchday: newMatchday,
      status: updateData.status || edition.status,
    };
  }

  /**
   * Obtiene equipos disponibles para hacer picks en la jornada actual (modo test)
   */
  async getAvailableTeamsForTest(editionId: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      select: { startMatchday: true },
    });

    if (!edition) {
      throw new NotFoundException(`La edición con ID "${editionId}" no fue encontrada.`);
    }

    // Obtener todos los partidos de la jornada actual
    const matches = await this.prisma.match.findMany({
      where: {
        matchday: edition.startMatchday,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: {
        kickoffAt: 'asc',
      },
    });

    // Extraer todos los equipos únicos
    const teams = new Map<string, { id: string; name: string; shortName: string }>();
    
    matches.forEach(match => {
      teams.set(match.homeTeam.id, {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        shortName: match.homeTeam.shortName,
      });
      teams.set(match.awayTeam.id, {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        shortName: match.awayTeam.shortName,
      });
    });

    return {
      matchday: edition.startMatchday,
      teams: Array.from(teams.values()),
      matches: matches.map(m => ({
        id: m.id,
        homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name },
        awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name },
      })),
    };
  }
}