import { Controller, Get, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rankings')
@UseGuards(JwtAuthGuard)
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('global')
  async getGlobalRanking(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.rankingsService.getGlobalRanking(limitNum, offsetNum);
  }

  @Get('league/:leagueId')
  async getLeagueRanking(
    @Param('leagueId') leagueId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.rankingsService.getLeagueRanking(leagueId, limitNum, offsetNum);
  }

  @Get('edition/:editionId')
  async getEditionRanking(@Param('editionId') editionId: string) {
    return this.rankingsService.getEditionRanking(editionId);
  }

  @Get('me')
  async getMyRank(
    @Req() req,
    @Query('scope') scope: 'global' | 'league' | 'edition' = 'global',
    @Query('scopeId') scopeId?: string,
  ) {
    const userId = req.user.id;
    return this.rankingsService.getUserRank(userId, scope, scopeId);
  }

  @Get('history')
  async getMyEditionHistory(@Req() req) {
    const userId = req.user.id;
    return this.rankingsService.getUserEditionHistory(userId);
  }
}

