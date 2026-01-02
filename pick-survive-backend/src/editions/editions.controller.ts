import { Controller, Get, Post, Param, UseGuards, Req, Body, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EditionsService } from './editions.service';
import { EditionAutoManagerService } from './edition-auto-manager.service';
import { EditionCloseService } from './edition-close.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('editions')
export class EditionsController {
  private readonly logger = new Logger(EditionsController.name);

  constructor(
    private readonly editionsService: EditionsService,
    private readonly editionAutoManager: EditionAutoManagerService,
    private readonly editionCloseService: EditionCloseService
  ) {}

  /**
   * GET /editions
   * Devuelve una lista de todas las ediciones que están abiertas.
   * Es un endpoint público.
   */
  @Get()
  findAll() {
    return this.editionsService.findAll();
  }

  /**
   * GET /editions/:id
   * Devuelve los detalles de una edición específica, incluyendo sus participantes.
   * Es un endpoint público.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.editionsService.findOne(id);
  }

  /**
   * POST /editions/:id/join
   * Permite a un usuario autenticado unirse a una edición.
   * Es un endpoint protegido por JWT.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/join')
  async join(@Param('id') editionId: string, @Req() req) {
    try {
      this.logger.log(`Intentando unirse a edición: ${editionId}`);
      this.logger.debug(`Usuario: ${req.user?.id}`);
      
      if (!req.user?.id) {
        throw new Error('Usuario no autenticado');
      }
      
      const result = await this.editionsService.joinEdition(editionId, req.user.id);
      this.logger.log(`Unirse exitoso: ${result.id}`);
      
      return {
        success: true,
        message: 'Te has unido exitosamente a la edición',
        participant: result
      };
    } catch (error) {
      this.logger.error(`Error al unirse: ${error.message}`, error.stack);
      
      // Mejorar mensajes de error para el usuario
      if (error instanceof ConflictException) {
        throw error; // Ya tiene un mensaje claro
      } else if (error instanceof NotFoundException) {
        throw error; // Ya tiene un mensaje claro
      } else if (error instanceof BadRequestException) {
        throw error; // Ya tiene un mensaje claro
      } else {
        // Error genérico - lanzar como BadRequestException con mensaje claro
        throw new BadRequestException(error.message || 'Error al unirse a la edición');
      }
    }
  }

  /**
   * GET /editions/:id/stats
   * Devuelve estadísticas detalladas de la edición incluyendo participantes activos y eliminados.
   * Es un endpoint público.
   */
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.editionsService.getEditionStats(id);
  }

  /**
   * POST /editions/:id/process
   * Procesa manualmente una edición específica (para testing)
   * Es un endpoint protegido por JWT.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/process')
  async processEdition(@Param('id') editionId: string) {
    await this.editionAutoManager.processSpecificEdition(editionId);
    return { message: 'Edición procesada correctamente' };
  }

  /**
   * GET /editions/:id/auto-stats
   * Devuelve estadísticas automáticas de la edición
   * Es un endpoint público.
   */
  @Get(':id/auto-stats')
  async getAutoStats(@Param('id') id: string) {
    return this.editionAutoManager.getEditionStats(id);
  }

  /**
   * POST /editions/:id/restore-participants
   * ENDPOINT DE EMERGENCIA: Restaura participantes eliminados incorrectamente
   * Solo para administradores
   */
  @Post(':id/restore-participants')
  @UseGuards(AuthGuard('jwt'))
  async restoreParticipants(
    @Param('id') editionId: string,
    @Body() body: { participantIds: string[] },
    @Req() req: any
  ) {
    // Verificar que el usuario es administrador (puedes ajustar esta lógica)
    if (req.user.email !== 'master@pickandsurvive.com') {
      throw new Error('Solo administradores pueden restaurar participantes');
    }

    const result = await this.editionAutoManager.restoreEliminatedParticipants(
      editionId,
      body.participantIds
    );

    return {
      message: `Restaurados ${result.count} participantes`,
      restoredCount: result.count
    };
  }

  /**
   * GET /editions/:id/test-matches
   * Obtiene todos los partidos de una edición con sus picks (para modo test)
   * Solo para administradores
   */
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/test-matches')
  async getTestMatches(@Param('id') editionId: string, @Req() req: any) {
    // Verificar que el usuario es administrador
    if (req.user.email !== 'master@pickandsurvive.com') {
      throw new Error('Solo administradores pueden acceder a modo test');
    }

    return this.editionsService.getEditionMatchesForTest(editionId);
  }

  /**
   * POST /editions/:id/advance-matchday
   * Avanza la jornada de una edición manualmente (modo test)
   * Solo para administradores
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/advance-matchday')
  async advanceMatchday(@Param('id') editionId: string, @Req() req: any) {
    // Verificar que el usuario es administrador
    if (req.user.email !== 'master@pickandsurvive.com') {
      throw new Error('Solo administradores pueden avanzar jornadas');
    }

    return this.editionsService.advanceMatchday(editionId);
  }

  /**
   * GET /editions/:id/test-teams
   * Obtiene equipos disponibles para hacer picks en la jornada actual (modo test)
   * Solo para administradores
   */
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/test-teams')
  async getTestTeams(@Param('id') editionId: string, @Req() req: any) {
    // Verificar que el usuario es administrador
    if (req.user.email !== 'master@pickandsurvive.com') {
      throw new Error('Solo administradores pueden acceder a modo test');
    }

    return this.editionsService.getAvailableTeamsForTest(editionId);
  }

  /**
   * POST /editions/:id/close
   * Cierra manualmente una edición (solo el creador/owner de la liga)
   * Es un endpoint protegido por JWT.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/close')
  async closeEdition(@Param('id') editionId: string, @Req() req: any) {
    const userId = req.user.id;
    
    // Verificar que el usuario es el owner de la liga de la edición
    const edition = await this.editionsService.findOne(editionId);
    if (!edition) {
      throw new NotFoundException(`Edición con ID ${editionId} no encontrada`);
    }

    // Obtener la liga para verificar ownership
    const league = await this.editionsService['prisma'].league.findUnique({
      where: { id: edition.leagueId },
      include: { members: true }
    });

    if (!league) {
      throw new NotFoundException('Liga no encontrada');
    }

    // Verificar que el usuario es OWNER o ADMIN de la liga
    const membership = league.members.find(m => m.userId === userId);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new BadRequestException('Solo el creador o administrador de la liga puede cerrar la edición');
    }

    // Cerrar la edición
    await this.editionCloseService.closeEdition(editionId, userId);
    
    return { 
      message: 'Edición cerrada correctamente',
      editionId,
      status: 'FINISHED'
    };
  }
}