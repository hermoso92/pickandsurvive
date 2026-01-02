import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerMetaJson } from './dto/ledger-entry.dto';

export interface LedgerEntry {
  userId?: string;
  leagueId?: string;
  editionId?: string;
  type: 'ENTRY_FEE' | 'PRIZE_PAYOUT' | 'ROLLOVER_OUT' | 'ROLLOVER_IN' | 'ADJUSTMENT';
  amountCents: number;
  metaJson?: LedgerMetaJson;
}

export interface UserBalance {
  userId: string;
  balanceCents: number;
}

export interface EditionPot {
  editionId: string;
  potCents: number;
}

export interface ModeRollover {
  leagueId: string;
  mode: string;
  rolloverCents: number;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una entrada en el ledger (inmutable)
   */
  async createEntry(entry: LedgerEntry): Promise<void> {
    this.logger.log(`Creating ledger entry: ${entry.type} for ${entry.userId || 'system'}`);
    
    await this.prisma.ledger.create({
      data: {
        userId: entry.userId,
        leagueId: entry.leagueId,
        editionId: entry.editionId,
        type: entry.type,
        amountCents: entry.amountCents,
        metaJson: (entry.metaJson || {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Obtiene el balance de un usuario
   */
  async getUserBalance(userId: string): Promise<number> {
    const result = await this.prisma.ledger.aggregate({
      where: { userId },
      _sum: {
        amountCents: true,
      },
    });
    
    return Number(result._sum.amountCents || 0);
  }

  /**
   * Obtiene el bote de una edición
   */
  async getEditionPot(editionId: string): Promise<number> {
    // Obtener todas las entradas de la edición
    const entries = await this.prisma.ledger.findMany({
      where: { 
        editionId,
        type: {
          in: ['ENTRY_FEE', 'PRIZE_PAYOUT']
        }
      },
      select: {
        type: true,
        amountCents: true,
      },
    });
    
    // Calcular el bote: ENTRY_FEE suma, PRIZE_PAYOUT resta
    const pot = entries.reduce((sum, entry) => {
      if (entry.type === 'ENTRY_FEE') {
        return sum + entry.amountCents;
      } else if (entry.type === 'PRIZE_PAYOUT') {
        return sum - entry.amountCents;
      }
      return sum;
    }, 0);
    
    return pot;
  }

  /**
   * Obtiene el rollover acumulado por modo
   */
  async getModeRollover(leagueId: string, mode: string): Promise<number> {
    // Obtener todas las ediciones de la liga con el modo especificado
    const editions = await this.prisma.edition.findMany({
      where: {
        leagueId,
        mode,
      },
      select: {
        id: true,
      },
    });
    
    if (editions.length === 0) {
      return 0;
    }
    
    const editionIds = editions.map(e => e.id);
    
    // Obtener todas las entradas de rollover para estas ediciones
    const entries = await this.prisma.ledger.findMany({
      where: {
        editionId: {
          in: editionIds,
        },
        type: {
          in: ['ROLLOVER_IN', 'ROLLOVER_OUT'],
        },
      },
      select: {
        type: true,
        amountCents: true,
      },
    });
    
    // Calcular el rollover: ROLLOVER_IN suma, ROLLOVER_OUT resta
    const rollover = entries.reduce((sum, entry) => {
      if (entry.type === 'ROLLOVER_IN') {
        return sum + entry.amountCents;
      } else if (entry.type === 'ROLLOVER_OUT') {
        return sum - entry.amountCents;
      }
      return sum;
    }, 0);
    
    return rollover;
  }

  /**
   * Registra el pago de entrada de un jugador
   */
  async recordEntryFee(userId: string, editionId: string, amountCents: number): Promise<void> {
    // Obtener la liga de la edición
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: { league: true },
    });

    if (!edition) {
      throw new NotFoundException(`Edition ${editionId} not found`);
    }

    await this.createEntry({
      userId,
      leagueId: edition.leagueId,
      editionId,
      type: 'ENTRY_FEE',
      amountCents: -amountCents, // Negativo porque es un gasto
      metaJson: {
        entryFee: amountCents,
        editionName: edition.name,
        leagueName: edition.league.name,
      },
    });

    this.logger.log(`Recorded entry fee: ${amountCents} cents for user ${userId} in edition ${editionId}`);
  }

  /**
   * Registra el pago de premio a un jugador
   */
  async recordPrizePayout(userId: string, editionId: string, amountCents: number, meta?: any): Promise<void> {
    const edition = await this.prisma.edition.findUnique({
      where: { id: editionId },
      include: { league: true },
    });

    if (!edition) {
      throw new NotFoundException(`Edition ${editionId} not found`);
    }

    await this.createEntry({
      userId,
      leagueId: edition.leagueId,
      editionId,
      type: 'PRIZE_PAYOUT',
      amountCents, // Positivo porque es un ingreso
      metaJson: {
        prizeAmount: amountCents,
        editionName: edition.name,
        leagueName: edition.league.name,
        ...meta,
      },
    });

    this.logger.log(`Recorded prize payout: ${amountCents} cents for user ${userId} in edition ${editionId}`);
  }

  /**
   * Registra rollover de bote (sin ganador)
   */
  async recordRollover(fromEditionId: string, toEditionId: string, amountCents: number): Promise<void> {
    const fromEdition = await this.prisma.edition.findUnique({
      where: { id: fromEditionId },
      include: { league: true },
    });

    const toEdition = await this.prisma.edition.findUnique({
      where: { id: toEditionId },
      include: { league: true },
    });

    if (!fromEdition || !toEdition) {
      throw new NotFoundException('Source or destination edition not found');
    }

    // ROLLOVER_OUT: sale el bote de la edición origen
    await this.createEntry({
      leagueId: fromEdition.leagueId,
      editionId: fromEditionId,
      type: 'ROLLOVER_OUT',
      amountCents: -amountCents,
      metaJson: {
        rolloverAmount: amountCents,
        fromEdition: fromEdition.name,
        toEdition: toEdition.name,
      },
    });

    // ROLLOVER_IN: entra el bote a la edición destino
    await this.createEntry({
      leagueId: toEdition.leagueId,
      editionId: toEditionId,
      type: 'ROLLOVER_IN',
      amountCents,
      metaJson: {
        rolloverAmount: amountCents,
        fromEdition: fromEdition.name,
        toEdition: toEdition.name,
      },
    });

    this.logger.log(`Recorded rollover: ${amountCents} cents from ${fromEditionId} to ${toEditionId}`);
  }

  /**
   * Registra un ajuste administrativo
   */
  async recordAdjustment(userId: string, leagueId: string, amountCents: number, reason: string, meta?: any): Promise<void> {
    await this.createEntry({
      userId,
      leagueId,
      type: 'ADJUSTMENT',
      amountCents,
      metaJson: {
        reason,
        ...meta,
      },
    });

    this.logger.log(`Recorded adjustment: ${amountCents} cents for user ${userId}, reason: ${reason}`);
  }

  /**
   * Obtiene el historial de transacciones de un usuario
   */
  async getUserLedger(userId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.ledger.findMany({
      where: { userId },
      include: {
        edition: {
          include: {
            league: true,
          },
        },
        league: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Obtiene el historial de transacciones de una liga (solo admins)
   */
  async getLeagueLedger(leagueId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.ledger.findMany({
      where: { leagueId },
      include: {
        user: true,
        edition: true,
        league: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Obtiene estadísticas de balance para múltiples usuarios
   */
  async getMultipleUserBalances(userIds: string[]): Promise<UserBalance[]> {
    if (userIds.length === 0) {
      return [];
    }
    
    // Obtener todas las entradas para estos usuarios
    const entries = await this.prisma.ledger.groupBy({
      by: ['userId'],
      where: {
        userId: {
          in: userIds,
        },
      },
      _sum: {
        amountCents: true,
      },
    });

    // Crear un mapa para acceso rápido
    const balanceMap = new Map<string, number>();
    entries.forEach(entry => {
      if (entry.userId) {
        balanceMap.set(entry.userId, Number(entry._sum.amountCents || 0));
      }
    });
    
    // Retornar balances para todos los usuarios solicitados (0 si no tienen entradas)
    return userIds.map(userId => ({
      userId,
      balanceCents: balanceMap.get(userId) || 0,
    }));
  }

  /**
   * Valida que un usuario tenga suficiente balance para una operación
   */
  async validateBalance(userId: string, requiredAmountCents: number): Promise<boolean> {
    const balance = await this.getUserBalance(userId);
    return balance >= requiredAmountCents;
  }
}
