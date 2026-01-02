import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class MasterUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.email !== 'master@pickandsurvive.com') {
      throw new ForbiddenException('Only master user can access this endpoint');
    }

    return true;
  }
}

