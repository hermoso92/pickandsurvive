import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { EmailService } from '../email/email.service';
import { LeagueConfig, validateLeagueConfig, validateEditionConfig } from '../config/league-config';
import { CreateLeagueDto } from './dto/create-league.dto';
import { CreateEditionDto } from './dto/create-edition.dto';

@Injectable()
export class LeagueService {
  private readonly logger = new Logger(LeagueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Crea una nueva liga
   */
  async createLeague(ownerId: string, dto: CreateLeagueDto) {
    this.logger.log(`Creating league: ${dto.name} by user ${ownerId}`);

    // Validar configuración
    if (!validateLeagueConfig(dto.defaultConfigJson)) {
      throw new BadRequestException('La configuración de la liga no es válida');
    }

    const league = await this.prisma.league.create({
      data: {
        name: dto.name,
        ownerUserId: ownerId,
        defaultConfigJson: dto.defaultConfigJson,
        visibility: dto.visibility || 'PRIVATE',
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
          },
        },
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    this.logger.log(`League created: ${league.id}`);
    return league;
  }

  /**
   * Obtiene las ligas de un usuario
   */
  async getUserLeagues(userId: string) {
    try {
      const memberships = await this.prisma.leagueMember.findMany({
        where: { userId },
        include: {
          league: {
            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  alias: true,
                },
              },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      alias: true,
                    },
                  },
                },
              },
              editions: {
                orderBy: { createdAt: 'desc' },
                take: 5, // Últimas 5 ediciones
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });

      return memberships.map(membership => membership.league);
    } catch (error) {
      this.logger.error(`Error obteniendo ligas del usuario ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene una liga por ID
   */
  async getLeagueById(leagueId: string) {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        editions: {
          orderBy: { createdAt: 'desc' },
        },
        invites: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }

    return league;
  }

  /**
   * Verifica si un usuario es miembro de una liga
   */
  async isLeagueMember(userId: string, leagueId: string): Promise<boolean> {
    const membership = await this.prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId,
        },
      },
    });

    return !!membership;
  }

  /**
   * Obtiene el rol de un usuario en una liga
   */
  async getUserRole(userId: string, leagueId: string): Promise<string | null> {
    const membership = await this.prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId,
        },
      },
    });

    return membership?.role || null;
  }

  /**
   * Verifica si un usuario tiene permisos de admin en una liga
   */
  async isLeagueAdmin(userId: string, leagueId: string): Promise<boolean> {
    const role = await this.getUserRole(userId, leagueId);
    return role === 'OWNER' || role === 'ADMIN';
  }

  /**
   * Crea una invitación a la liga y envía email
   */
  async createInvite(leagueId: string, email: string, invitedBy: string) {
    this.logger.log(`Creating invite for ${email} to league ${leagueId}`);

    // Verificar que el invitador es admin
    const isAdmin = await this.isLeagueAdmin(invitedBy, leagueId);
    if (!isAdmin) {
      throw new ForbiddenException('Only league admins can invite members');
    }

    // Verificar que el email no esté ya invitado
    const existingInvite = await this.prisma.leagueInvite.findUnique({
      where: {
        leagueId_email: {
          leagueId,
          email,
        },
      },
    });

    if (existingInvite && existingInvite.status === 'PENDING') {
      throw new ConflictException('User already has a pending invitation');
    }

    // Generar token único
    const token = this.generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

    const invite = await this.prisma.leagueInvite.create({
      data: {
        leagueId,
        email,
        invitedBy,
        token,
        expiresAt,
      },
      include: {
        league: true,
        inviter: true,
      },
    });

    // Enviar email de invitación
    try {
      const emailSent = await this.emailService.sendLeagueInvitation(
        email,
        invite.league.name,
        invite.inviter.alias || invite.inviter.email,
        leagueId
      );

      if (emailSent) {
        this.logger.log(`Invitation email sent to ${email} for league ${leagueId}`);
      } else {
        this.logger.warn(`Failed to send invitation email to ${email} for league ${leagueId}`);
      }
    } catch (error) {
      this.logger.error(`Error sending invitation email to ${email}:`, error);
      // No lanzamos error aquí para que la invitación se cree aunque falle el email
    }

    this.logger.log(`Invite created: ${invite.id}`);
    return invite;
  }

  /**
   * Acepta una invitación a la liga
   */
  async acceptInvite(token: string, userId: string) {
    this.logger.log(`Accepting invite with token: ${token}`);

    const invite = await this.prisma.leagueInvite.findUnique({
      where: { token },
      include: {
        league: true,
        inviter: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invite.status !== 'PENDING') {
      throw new ConflictException('Invitation is no longer valid');
    }

    if (invite.expiresAt < new Date()) {
      throw new ConflictException('Invitation has expired');
    }

    // Verificar que el usuario existe y coincide con el email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invite.email) {
      throw new ForbiddenException('User email does not match invitation');
    }

    // Verificar que no es ya miembro
    const existingMembership = await this.prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId: invite.leagueId,
          userId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this league');
    }

    // Crear membresía
    await this.prisma.leagueMember.create({
      data: {
        leagueId: invite.leagueId,
        userId,
        role: 'PLAYER',
      },
    });

    // Marcar invitación como aceptada
    await this.prisma.leagueInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    this.logger.log(`Invite accepted: user ${userId} joined league ${invite.leagueId}`);
    return invite.league;
  }

  /**
   * Obtiene una edición por ID con información completa
   */
  async getEditionById(editionId: string) {
    return this.prisma.edition.findUnique({
      where: { id: editionId },
      include: {
        league: true,
        participants: {
          include: {
            user: true,
            picks: {
              include: {
                team: true,
                match: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Crea una nueva edición en una liga
   */
  async createEdition(leagueId: string, dto: CreateEditionDto, creatorId: string) {
    this.logger.log(`Creating edition: ${dto.name} in league ${leagueId}`);

    // Verificar que el usuario es el OWNER de la liga
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { ownerUserId: true },
    });

    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }

    if (league.ownerUserId !== creatorId) {
      throw new ForbiddenException('Only the league owner can create editions');
    }

    // Obtener configuración por defecto de la liga (ya la tenemos de la verificación anterior)
    const leagueWithConfig = await this.prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!leagueWithConfig) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }

    const defaultConfig = leagueWithConfig.defaultConfigJson as unknown as LeagueConfig;
    
    // Si la configuración por defecto está vacía o no es válida, usar configuración por defecto
    let editionConfig: any;
    if (!defaultConfig || Object.keys(defaultConfig).length === 0 || !validateLeagueConfig(defaultConfig)) {
      // Usar configuración por defecto de edición
      editionConfig = {
        season: new Date().getFullYear(),
        matchday_range: {
          from: dto.startMatchday,
          to: dto.endMatchday || null,
        },
        payout_schema: {
          type: 'winner_takes_all' as const,
        },
        rules: {
          picks_hidden: true,
          no_repeat_team: false,
          lifeline_enabled: true,
          sudden_death: true,
        },
        ...dto.configJson,
      };
    } else {
      // Fusionar configuración de liga con la de la edición
      editionConfig = {
        season: new Date().getFullYear(),
        matchday_range: {
          from: dto.startMatchday,
          to: dto.endMatchday || null,
        },
        payout_schema: defaultConfig.payout_schema || { type: 'winner_takes_all' },
        rules: defaultConfig.rules || {
          picks_hidden: true,
          no_repeat_team: true,
          lifeline_enabled: true,
          sudden_death: false,
        },
        ...dto.configJson,
      };
    }

    // Validar configuración de edición
    if (!validateEditionConfig(editionConfig)) {
      throw new BadRequestException('La configuración de la edición no es válida');
    }

    // Determinar entryFeeCents: prioridad a dto.configJson, luego defaultConfig, luego 0 (gratis)
    let entryFeeCents = 0; // Por defecto: participación gratuita
    if (dto.configJson && typeof dto.configJson.entry_fee_cents === 'number') {
      entryFeeCents = dto.configJson.entry_fee_cents;
    } else if (defaultConfig && typeof defaultConfig.entry_fee_cents === 'number') {
      entryFeeCents = defaultConfig.entry_fee_cents;
    }

    const edition = await this.prisma.edition.create({
      data: {
        name: dto.name,
        mode: dto.mode,
        startMatchday: dto.startMatchday,
        endMatchday: dto.endMatchday,
        entryFeeCents: entryFeeCents,
        configJson: editionConfig,
        leagueId,
      },
      include: {
        league: true,
      },
    });

    this.logger.log(`Edition created: ${edition.id}`);
    return edition;
  }

  /**
   * Unirse a una edición
   * NOTA: Este método está deprecado. Usar EditionsService.joinEdition en su lugar.
   * Se mantiene por compatibilidad pero delega a EditionsService.
   */
  async joinEdition(editionId: string, userId: string) {
    this.logger.warn('LeagueService.joinEdition está deprecado. Usar EditionsService.joinEdition');
    // Delegar a EditionsService - esto requiere inyectar EditionsService
    // Por ahora, lanzar error para forzar migración
    throw new Error('Este método está deprecado. Usar EditionsService.joinEdition directamente.');
  }

  /**
   * Genera un token único para invitaciones usando crypto seguro
   */
  private generateInviteToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Genera un código de invitación compartible para la liga
   */
  private generateInviteCode(): string {
    const crypto = require('crypto');
    // Generar un código corto y fácil de compartir (8 caracteres alfanuméricos)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 0, 1 para evitar confusión
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(crypto.randomBytes(1)[0] % chars.length));
    }
    return code;
  }

  /**
   * Obtiene o genera el código de invitación compartible de la liga
   */
  async getOrCreateInviteCode(leagueId: string, userId: string): Promise<string> {
    // Verificar que el usuario es admin
    const isAdmin = await this.isLeagueAdmin(userId, leagueId);
    if (!isAdmin) {
      throw new ForbiddenException('Only league admins can get invite codes');
    }

    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { inviteCode: true },
    });

    if (!league) {
      throw new NotFoundException(`Liga con ID ${leagueId} no encontrada`);
    }

    // Si ya tiene código, devolverlo
    if (league.inviteCode) {
      return league.inviteCode;
    }

    // Generar nuevo código único
    let code: string = '';
    let exists = true;
    while (exists) {
      code = this.generateInviteCode();
      const existing = await this.prisma.league.findUnique({
        where: { inviteCode: code },
        select: { id: true },
      });
      exists = !!existing;
    }
    
    // Asegurar que code tiene un valor
    if (!code) {
      code = this.generateInviteCode();
    }

    // Guardar el código
    await this.prisma.league.update({
      where: { id: leagueId },
      data: { inviteCode: code },
    });

    this.logger.log(`Generated invite code ${code} for league ${leagueId}`);
    return code;
  }

  /**
   * Acepta una invitación usando el código de invitación
   */
  async acceptInviteByCode(inviteCode: string, userId: string) {
    this.logger.log(`Accepting invite with code: ${inviteCode}`);

    const league = await this.prisma.league.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!league) {
      throw new NotFoundException('Código de invitación no válido');
    }

    // Verificar que no es ya miembro
    const existingMembership = league.members.find(m => m.userId === userId);
    if (existingMembership) {
      throw new ConflictException('Ya eres miembro de esta liga');
    }

    // Crear membresía
    await this.prisma.leagueMember.create({
      data: {
        leagueId: league.id,
        userId,
        role: 'PLAYER',
      },
    });

    this.logger.log(`User ${userId} joined league ${league.id} using invite code`);
    return league;
  }

  /**
   * Actualiza una liga
   */
  async updateLeague(leagueId: string, data: { defaultConfigJson?: any; name?: string; visibility?: string }) {
    this.logger.log(`Updating league: ${leagueId}`);

    // Verificar que la liga existe
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      throw new NotFoundException(`Liga con ID ${leagueId} no encontrada`);
    }

    // Validar configuración si se proporciona
    if (data.defaultConfigJson && !validateLeagueConfig(data.defaultConfigJson)) {
      throw new BadRequestException('La configuración de la liga no es válida');
    }

    // Actualizar la liga
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.visibility) updateData.visibility = data.visibility;
    if (data.defaultConfigJson) updateData.defaultConfigJson = data.defaultConfigJson;

    const updatedLeague = await this.prisma.league.update({
      where: { id: leagueId },
      data: updateData,
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    this.logger.log(`League updated: ${leagueId}`);
    return updatedLeague;
  }

  /**
   * Obtiene estadísticas de una liga
   */
  async getLeagueStats(leagueId: string) {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        members: true,
        editions: true,
      },
    });

    if (!league) {
      throw new NotFoundException(`League ${leagueId} not found`);
    }

    const stats = {
      memberCount: league.members.length,
      editionCount: league.editions.length,
      openEditions: league.editions.filter(e => e.status === 'OPEN').length,
      activeEditions: league.editions.filter(e => e.status === 'IN_PROGRESS').length,
      finishedEditions: league.editions.filter(e => e.status === 'FINISHED').length,
    };

    return stats;
  }
}
