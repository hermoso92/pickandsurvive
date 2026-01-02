import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeagueService } from './leagues.service';
import { EditionsService } from '../editions/editions.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { CreateEditionDto } from './dto/create-edition.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinLeagueDto } from './dto/join-league.dto';

@Controller('leagues')
@UseGuards(JwtAuthGuard)
export class LeaguesController {
  constructor(
    private readonly leagueService: LeagueService,
    private readonly editionsService: EditionsService,
    private readonly ledgerService: LedgerService,
  ) {}

  @Post()
  async createLeague(@Request() req, @Body() dto: CreateLeagueDto) {
    return this.leagueService.createLeague(req.user.id, dto);
  }

  @Get('mine')
  async getMyLeagues(@Request() req) {
    return this.leagueService.getUserLeagues(req.user.id);
  }

  @Get(':leagueId/invite-code')
  async getInviteCode(@Param('leagueId') leagueId: string, @Request() req) {
    const code = await this.leagueService.getOrCreateInviteCode(leagueId, req.user.id);
    return { inviteCode: code };
  }

  @Get(':leagueId/stats')
  async getLeagueStats(@Param('leagueId') leagueId: string, @Request() req) {
    // Verificar que el usuario es miembro
    const isMember = await this.leagueService.isLeagueMember(req.user.id, leagueId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this league');
    }
    
    return this.leagueService.getLeagueStats(leagueId);
  }

  @Get(':leagueId')
  async getLeague(@Param('leagueId') leagueId: string, @Request() req) {
    // Verificar que el usuario es miembro
    const isMember = await this.leagueService.isLeagueMember(req.user.id, leagueId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this league');
    }
    
    return this.leagueService.getLeagueById(leagueId);
  }

  @Post(':leagueId/invites')
  async createInvite(
    @Param('leagueId') leagueId: string,
    @Body() dto: CreateInviteDto,
    @Request() req
  ) {
    return this.leagueService.createInvite(leagueId, dto.email, req.user.id);
  }

  @Post('join')
  async acceptInvite(@Body() dto: JoinLeagueDto, @Request() req) {
    // Si viene con código, usar el nuevo método
    if (dto.code) {
      return this.leagueService.acceptInviteByCode(dto.code, req.user.id);
    }
    // Si viene con token, usar el método antiguo
    if (dto.token) {
      return this.leagueService.acceptInvite(dto.token, req.user.id);
    }
    throw new BadRequestException('Se requiere código o token de invitación');
  }

  @Get(':leagueId/members')
  async getLeagueMembers(@Param('leagueId') leagueId: string, @Request() req) {
    // Verificar que el usuario es admin
    const isAdmin = await this.leagueService.isLeagueAdmin(req.user.id, leagueId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view members');
    }
    
    const league = await this.leagueService.getLeagueById(leagueId);
    return league.members;
  }

  @Post(':leagueId/editions')
  async createEdition(
    @Param('leagueId') leagueId: string,
    @Body() dto: CreateEditionDto,
    @Request() req
  ) {
    return this.leagueService.createEdition(leagueId, dto, req.user.id);
  }

  @Get(':leagueId/editions')
  async getLeagueEditions(@Param('leagueId') leagueId: string, @Request() req) {
    // Verificar que el usuario es miembro
    const isMember = await this.leagueService.isLeagueMember(req.user.id, leagueId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this league');
    }
    
    const league = await this.leagueService.getLeagueById(leagueId);
    return league.editions;
  }

  @Post(':leagueId/editions/:editionId/join')
  async joinEdition(
    @Param('leagueId') leagueId: string,
    @Param('editionId') editionId: string,
    @Request() req
  ) {
    return this.editionsService.joinEdition(editionId, req.user.id);
  }

  @Get(':leagueId/ledger')
  async getLeagueLedger(
    @Param('leagueId') leagueId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Request() req
  ) {
    // Verificar que el usuario es admin
    const isAdmin = await this.leagueService.isLeagueAdmin(req.user.id, leagueId);
    if (!isAdmin) {
      throw new Error('Forbidden: Only admins can view ledger');
    }
    
    return this.ledgerService.getLeagueLedger(
      leagueId,
      parseInt(limit),
      parseInt(offset)
    );
  }

  @Put(':leagueId')
  async updateLeague(
    @Param('leagueId') leagueId: string,
    @Body() body: { defaultConfigJson?: any; name?: string; visibility?: string },
    @Request() req
  ) {
    // Verificar que el usuario es admin
    const isAdmin = await this.leagueService.isLeagueAdmin(req.user.id, leagueId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update league settings');
    }
    
    return this.leagueService.updateLeague(leagueId, body);
  }
}

@Controller('editions')
@UseGuards(JwtAuthGuard)
export class EditionsController {
  constructor(
    private readonly leagueService: LeagueService,
    private readonly editionsService: EditionsService,
    private readonly ledgerService: LedgerService,
  ) {}

  @Get(':editionId')
  async getEdition(@Param('editionId') editionId: string, @Request() req) {
    // Obtener la edición y verificar membresía
    const edition = await this.leagueService.getEditionById(editionId);

    if (!edition) {
      throw new NotFoundException('Edition not found');
    }

    // Verificar que el usuario es miembro de la liga
    const isMember = await this.leagueService.isLeagueMember(req.user.id, edition.leagueId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this league');
    }

    return edition;
  }

  @Post(':editionId/join')
  async joinEdition(@Param('editionId') editionId: string, @Request() req) {
    return this.editionsService.joinEdition(editionId, req.user.id);
  }

  @Get(':editionId/pot')
  async getEditionPot(@Param('editionId') editionId: string, @Request() req) {
    // Verificar membresía
    const edition = await this.leagueService.getEditionById(editionId);

    if (!edition) {
      throw new NotFoundException('Edition not found');
    }

    const isMember = await this.leagueService.isLeagueMember(req.user.id, edition.leagueId);
    if (!isMember) {
      throw new ForbiddenException('Not a member of this league');
    }

    const potCents = await this.ledgerService.getEditionPot(editionId);
    return { editionId, potCents };
  }
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('balance')
  async getMyBalance(@Request() req) {
    const balanceCents = await this.ledgerService.getUserBalance(req.user.id);
    return { userId: req.user.id, balanceCents };
  }

  @Get('ledger')
  async getMyLedger(
    @Request() req,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    return this.ledgerService.getUserLedger(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );
  }
}
