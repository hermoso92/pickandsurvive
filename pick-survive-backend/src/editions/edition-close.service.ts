import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';

export interface Winner {
  userId: string;
  amountCents: number;
  position: number;
}

export interface PayoutSchema {
  type: 'winner_takes_all' | 'table';
  splits?: number[];
}

@Injectable()
export class EditionCloseService {
  private readonly logger = new Logger(EditionCloseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Cierra una edición y calcula ganadores
   */
  async closeEdition(editionId: string, closedBy: string): Promise<void> {
    this.logger.log(`Closing edition ${editionId} by user ${closedBy}`);

    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: {
        league: true,
        participants: {
          include: {
            user: true,
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
      throw new NotFoundException(`Edition ${editionId} not found`);
    }

    if (edition.status === 'FINISHED') {
      throw new Error('Edition is already closed');
    }

    // Validaciones
    await this.validateEditionCanBeClosed(edition);

    // Determinar ganadores según el modo
    const winners = await this.determineWinners(edition);

    // Calcular botes
    const potEdition = await this.ledgerService.getEditionPot(editionId);
    const rolloverAccum = await this.ledgerService.getModeRollover(
      edition.leagueId,
      edition.mode
    );

    const payoutTotal = potEdition + rolloverAccum;

    this.logger.log(`Edition pot: ${potEdition} cents, Rollover: ${rolloverAccum} cents, Total: ${payoutTotal} cents`);

    // Generar pagos o rollover
    if (winners.length > 0) {
      await this.distributePayouts(editionId, winners, payoutTotal, edition.configJson as any);
    } else {
      await this.handleRollover(editionId, potEdition, edition.leagueId, edition.mode);
    }

    // Marcar edición como finalizada
    await this.prisma.edition.update({
      where: { id: editionId },
      data: { status: 'FINISHED' },
    });

    this.logger.log(`Edition ${editionId} closed successfully`);
  }

  /**
   * Valida que una edición puede ser cerrada
   */
  private async validateEditionCanBeClosed(edition: any): Promise<void> {
    // Verificar que hay participantes
    if (edition.participants.length === 0) {
      throw new Error('Cannot close edition with no participants');
    }

    // Verificar que todos los partidos están finalizados
    const activeParticipants = edition.participants.filter((p: any) => p.status === 'ACTIVE');
    
    if (activeParticipants.length > 1 && edition.mode === 'ELIMINATORIO') {
      // En modo eliminatorio, debe haber solo un participante activo
      throw new Error('Cannot close eliminatorio edition with multiple active participants');
    }

    // Verificar que no hay picks pendientes
    const participantsWithPicks = edition.participants.filter((p: any) => p.picks.length > 0);
    if (participantsWithPicks.length !== edition.participants.length) {
      throw new Error('Cannot close edition with pending picks');
    }
  }

  /**
   * Determina los ganadores según el modo de la edición
   */
  private async determineWinners(edition: any): Promise<Winner[]> {
    const activeParticipants = edition.participants.filter((p: any) => p.status === 'ACTIVE');

    if (edition.mode === 'ELIMINATORIO') {
      // En eliminatorio, el último participante activo es el ganador
      if (activeParticipants.length === 1) {
        return [{
          userId: activeParticipants[0].userId,
          amountCents: 0, // Se calculará después
          position: 1,
        }];
      }
      return [];
    } else if (edition.mode === 'LIGA') {
      // En liga, calcular tabla de puntos
      return await this.calculateLeagueWinners(activeParticipants);
    }

    return [];
  }

  /**
   * Calcula ganadores en modo liga
   */
  private async calculateLeagueWinners(participants: any[]): Promise<Winner[]> {
    // Por ahora, implementación simple: todos los participantes activos son ganadores
    // En una implementación completa, aquí calcularías puntos basados en picks correctos
    return participants.map((participant, index) => ({
      userId: participant.userId,
      amountCents: 0, // Se calculará después
      position: index + 1,
    }));
  }

  /**
   * Distribuye los pagos según el esquema configurado
   */
  private async distributePayouts(
    editionId: string,
    winners: Winner[],
    totalAmount: number,
    config: any
  ): Promise<void> {
    const payoutSchema = config.payout_schema || { type: 'winner_takes_all' };
    
    let amounts: number[];
    
    if (payoutSchema.type === 'winner_takes_all') {
      // El primer ganador se lleva todo
      amounts = winners.map((_, index) => index === 0 ? totalAmount : 0);
    } else if (payoutSchema.type === 'table' && payoutSchema.splits) {
      // Distribución según splits
      amounts = payoutSchema.splits.map(split => Math.floor(totalAmount * split));
    } else {
      // Distribución equitativa
      const amountPerWinner = Math.floor(totalAmount / winners.length);
      amounts = winners.map(() => amountPerWinner);
    }

    // Registrar pagos en el ledger
    for (let i = 0; i < winners.length; i++) {
      if (amounts[i] > 0) {
        await this.ledgerService.recordPrizePayout(
          winners[i].userId,
          editionId,
          amounts[i],
          {
            position: winners[i].position,
            payoutSchema: payoutSchema.type,
            totalWinners: winners.length,
          }
        );
      }
    }

    this.logger.log(`Distributed ${totalAmount} cents among ${winners.length} winners`);
  }

  /**
   * Maneja el rollover cuando no hay ganadores
   */
  private async handleRollover(
    editionId: string,
    potAmount: number,
    leagueId: string,
    mode: string
  ): Promise<void> {
    if (potAmount <= 0) {
      this.logger.log(`No rollover needed for edition ${editionId} (pot: ${potAmount})`);
      return;
    }

    // Buscar la siguiente edición del mismo modo en la misma liga
    const nextEdition = await this.prisma.edition.findFirst({
      where: {
        leagueId,
        mode,
        status: 'OPEN',
        id: { not: editionId },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (nextEdition) {
      await this.ledgerService.recordRollover(editionId, nextEdition.id, potAmount);
      this.logger.log(`Rolled over ${potAmount} cents from ${editionId} to ${nextEdition.id}`);
    } else {
      // No hay siguiente edición, registrar como rollover pendiente
      await this.ledgerService.createEntry({
        leagueId,
        type: 'ROLLOVER_OUT',
        amountCents: -potAmount,
        metaJson: {
          reason: 'No next edition found',
          originalEdition: editionId,
        },
      });
      this.logger.log(`Recorded rollover pending for ${potAmount} cents from ${editionId}`);
    }
  }

  /**
   * Obtiene estadísticas de una edición antes del cierre
   */
  async getEditionCloseStats(editionId: string) {
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: {
        participants: {
          include: {
            user: true,
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
      throw new NotFoundException(`Edition ${editionId} not found`);
    }

    const potEdition = await this.ledgerService.getEditionPot(editionId);
    const rolloverAccum = await this.ledgerService.getModeRollover(
      edition.leagueId,
      edition.mode
    );

    const activeParticipants = edition.participants.filter(p => p.status === 'ACTIVE');
    const eliminatedParticipants = edition.participants.filter(p => p.status === 'ELIMINATED');

    return {
      edition: {
        id: edition.id,
        name: edition.name,
        mode: edition.mode,
        status: edition.status,
      },
      participants: {
        total: edition.participants.length,
        active: activeParticipants.length,
        eliminated: eliminatedParticipants.length,
      },
      finances: {
        potEdition,
        rolloverAccum,
        totalPayout: potEdition + rolloverAccum,
      },
      canClose: activeParticipants.length <= 1 || edition.mode === 'LIGA',
    };
  }
}
