import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LeagueAuthContext {
  userId: string;
  leagueId: string;
  userRole: string;
}

@Injectable()
export class LeagueAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extraer leagueId de los parámetros o del body
    let leagueId = request.params.leagueId;
    
    // Si no está en params, intentar obtenerlo de la edición
    if (!leagueId && request.params.editionId) {
      const edition = await this.prisma.edition.findUnique({
        where: { id: request.params.editionId },
        select: { leagueId: true },
      });
      
      if (edition) {
        leagueId = edition.leagueId;
      }
    }

    if (!leagueId) {
      throw new ForbiddenException('League ID not found');
    }

    // Verificar membresía
    const membership = await this.prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this league');
    }

    // Agregar información de autorización al request
    request.leagueAuth = {
      userId: user.id,
      leagueId,
      userRole: membership.role,
    };

    return true;
  }
}

@Injectable()
export class LeagueAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extraer leagueId de los parámetros o del body
    let leagueId = request.params.leagueId;
    
    // Si no está en params, intentar obtenerlo de la edición
    if (!leagueId && request.params.editionId) {
      const edition = await this.prisma.edition.findUnique({
        where: { id: request.params.editionId },
        select: { leagueId: true },
      });
      
      if (edition) {
        leagueId = edition.leagueId;
      }
    }

    if (!leagueId) {
      throw new ForbiddenException('League ID not found');
    }

    // Verificar membresía y rol de admin
    const membership = await this.prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this league');
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('Admin privileges required');
    }

    // Agregar información de autorización al request
    request.leagueAuth = {
      userId: user.id,
      leagueId,
      userRole: membership.role,
    };

    return true;
  }
}

// Decorador para obtener información de autorización de liga
export const LeagueAuth = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    // Este decorador se puede usar para inyectar LeagueAuthContext en métodos
    // La implementación real dependería del framework específico
  };
};
