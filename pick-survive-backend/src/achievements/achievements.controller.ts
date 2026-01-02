import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnlockAchievementDto } from './dto/unlock-achievement.dto';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  async getAllAchievements() {
    return this.achievementsService.getAllAchievements();
  }

  @Get('me')
  async getMyAchievements(@Req() req) {
    const userId = req.user.id;
    return this.achievementsService.getUserAchievements(userId);
  }

  @Post('check')
  async checkAchievements(@Req() req) {
    const userId = req.user.id;
    const unlocked = await this.achievementsService.checkAndUnlockAchievements(userId);
    return {
      unlocked,
      message: unlocked.length > 0 
        ? `Se desbloquearon ${unlocked.length} logros`
        : 'No hay nuevos logros para desbloquear',
    };
  }

  @Post('unlock')
  async unlockAchievement(@Req() req, @Body() dto: UnlockAchievementDto) {
    // Solo permitir que el usuario desbloquee logros para sí mismo (o admin)
    if (dto.userId !== req.user.id) {
      throw new Error('No puedes desbloquear logros para otros usuarios');
    }

    await this.achievementsService.unlockAchievementByCode(dto.userId, dto.achievementCode);
    return { success: true };
  }
}

