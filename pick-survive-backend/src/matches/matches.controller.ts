import { Controller, Get, Param, ParseIntPipe, Post, Body, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateResultDto } from './dto/update-result.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('jornada/:matchday')
  findByMatchday(@Param('matchday', ParseIntPipe) matchday: number) {
    return this.matchesService.findByMatchday(matchday);
  }

  @Get('jornada/:matchday/detailed')
  getMatchesByMatchday(@Param('matchday', ParseIntPipe) matchday: number) {
    return this.matchesService.getMatchesByMatchday(matchday);
  }

  @Get('max-matchday')
  async getMaxMatchday() {
    return this.matchesService.getMaxMatchday();
  }

  /**
   * Endpoint para actualizar el resultado de un partido
   * Requiere autenticación (por ahora manual, pero protegido)
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':matchId/result')
  updateMatchResult(
    @Param('matchId') matchId: string,
    @Body() dto: UpdateResultDto
  ) {
    return this.matchesService.updateMatchResult(matchId, dto.homeGoals, dto.awayGoals);
  }
}