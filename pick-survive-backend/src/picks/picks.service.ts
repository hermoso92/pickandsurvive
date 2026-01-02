import { 
  Injectable, 
  NotFoundException, 
  UnauthorizedException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PicksService {
  constructor(private readonly prisma: PrismaService) {}

  async createPick(userId: string, editionId: string, teamId: string, skipDeadline: boolean = false) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar que la edición existe y está en curso.
      const edition = await tx.edition.findUnique({ where: { id: editionId } });

      if (!edition) {
        throw new NotFoundException(`La edición con ID "${editionId}" no fue encontrada.`);
      }

      // Verificar que la edición está en un estado válido para hacer picks
      if (edition.status !== 'OPEN' && edition.status !== 'IN_PROGRESS') {
        throw new BadRequestException(`No puedes hacer picks en una edición con estado "${edition.status}".`);
      }

      // 2. Verificar que el usuario es un participante ACTIVO de esa edición.
      const participant = await tx.participant.findUnique({
        where: { userId_editionId: { userId, editionId } },
      });
      if (!participant) {
        throw new UnauthorizedException('No eres participante de esta edición.');
      }
      if (participant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Ya no estás activo en esta edición.');
      }

      // 3. Determinar la jornada actual para este participante
      // Si ya tiene picks, la próxima jornada es la siguiente después de su último pick
      // Si no tiene picks, empieza en startMatchday
      const existingPicks = await tx.pick.findMany({
        where: { participantId: participant.id },
        orderBy: { matchday: 'desc' },
        take: 1,
      });

      const currentMatchday = existingPicks.length > 0 
        ? existingPicks[0].matchday + 1 
        : edition.startMatchday;

      // Verificar que la jornada no exceda endMatchday si está definida
      if (edition.endMatchday && currentMatchday > edition.endMatchday) {
        throw new BadRequestException('Esta edición ya ha terminado. No puedes hacer más picks.');
      }

      // 4. Encontrar el partido del equipo seleccionado para la jornada actual
      const match = await tx.match.findFirst({
        where: {
          matchday: currentMatchday,
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        },
      });
      if (!match) {
        throw new NotFoundException(`El equipo seleccionado no juega en la jornada ${currentMatchday} de esta edición.`);
      }

      // 5. Validar que el deadline no haya pasado
      // Usar locksAt de la edición si existe, sino calcularlo
      let deadline: Date | null = null;
      if (edition.locksAt) {
        deadline = edition.locksAt;
      } else {
        // Buscar el primer partido de la jornada para calcular el deadline
        const firstMatch = await tx.match.findFirst({
          where: {
            matchday: currentMatchday,
            status: { not: 'POSTPONED' }
          },
          orderBy: {
            kickoffAt: 'asc'
          }
        });

        if (firstMatch) {
          // Deadline es 1 hora antes del primer partido
          deadline = new Date(firstMatch.kickoffAt.getTime() - 60 * 60 * 1000);
        }
      }

      // Validar deadline solo si no estamos en modo test
      // Añadir buffer de seguridad de 1 minuto para evitar problemas de sincronización
      if (!skipDeadline && deadline) {
        const now = new Date();
        const deadlineWithBuffer = new Date(deadline.getTime() + 60 * 1000); // 1 minuto de buffer
        
        if (now > deadlineWithBuffer) {
          const timeRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
          const minutes = Math.floor(timeRemaining / 60);
          const seconds = timeRemaining % 60;
          
          throw new BadRequestException(
            `El plazo para hacer picks ha expirado. El deadline era el ${deadline.toLocaleString('es-ES')}.${timeRemaining > 0 ? ` Faltaban ${minutes}m ${seconds}s.` : ''}`
          );
        }
      }

      // 6. Verificar si ya existe un pick para esta jornada
      const existingPick = await tx.pick.findFirst({
        where: { 
          participantId: participant.id, 
          matchday: currentMatchday
        },
      });
      if (existingPick) {
        throw new BadRequestException(`Ya has hecho un pick para la jornada ${currentMatchday}.`);
      }

      // 7. Validar que no se repita el equipo (si la regla está habilitada)
      const config = edition.configJson as any;
      const rules = config?.rules || {};
      const noRepeatTeam = rules.no_repeat_team !== false; // Por defecto true si no se especifica
      
      if (noRepeatTeam) {
        // Obtener todos los picks anteriores del participante
        const previousPicks = await tx.pick.findMany({
          where: { 
            participantId: participant.id,
            matchday: { lt: currentMatchday } // Solo picks de jornadas anteriores
          },
          select: { teamId: true },
        });
        
        const previousTeamIds = previousPicks.map(p => p.teamId);
        if (previousTeamIds.includes(teamId)) {
          const previousTeam = await tx.team.findUnique({ where: { id: teamId } });
          throw new BadRequestException(
            `No puedes elegir ${previousTeam?.name || 'este equipo'} porque ya lo elegiste en una jornada anterior.`
          );
        }
      }

      // 8. Crear el pick en la base de datos dentro de la transacción
      return tx.pick.create({
        data: {
          participantId: participant.id,
          teamId: teamId,
          matchId: match.id,
          matchday: currentMatchday,
        },
      });
    });
  }
}