import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MasterUserGuard } from '../auth/master-user.guard';
import { FootballDataService } from './football-data.service';
import { SyncService } from './sync.service';
import { FOOTBALL_API_CONFIG } from '../config/football-api';

@Controller('football-data')
@UseGuards(JwtAuthGuard, MasterUserGuard)
export class FootballDataController {
  constructor(
    private readonly footballDataService: FootballDataService,
    private readonly syncService: SyncService,
  ) {}

  @Get('competitions')
  async getCompetitions() {
    return this.footballDataService.getCompetitions();
  }

  @Get('competition/:code')
  async getCompetition(@Query('code') code: string) {
    return this.footballDataService.getCompetition(code);
  }

  @Get('matches/matchday')
  async getMatchesByMatchday(
    @Query('competition') competition: string,
    @Query('season') season: number,
    @Query('matchday') matchday: number
  ) {
    return this.footballDataService.getMatchesByMatchday(competition, season, matchday);
  }

  @Get('matches/upcoming')
  async getUpcomingMatches(
    @Query('competition') competition: string,
    @Query('days') days: number = 7
  ) {
    return this.footballDataService.getUpcomingMatches(competition, days);
  }

  @Get('matches/live')
  async getLiveMatches() {
    return this.footballDataService.getLiveMatches();
  }

  @Get('validate-token')
  async validateToken() {
    const isValid = await this.footballDataService.validateToken();
    return { valid: isValid };
  }

  @Get('config')
  async getConfig() {
    return {
      competitions: FOOTBALL_API_CONFIG.FOOTBALL_DATA.COMPETITIONS,
      timezone: FOOTBALL_API_CONFIG.TIMEZONE,
      hasToken: !!FOOTBALL_API_CONFIG.FOOTBALL_DATA.TOKEN,
    };
  }

  @Get('current-matchday')
  async getCurrentMatchday() {
    // Obtener la jornada máxima disponible en la base de datos
    const maxMatchday = await this.footballDataService.getCurrentMatchday();
    return { currentMatchday: maxMatchday || 1 };
  }

  // Endpoints de sincronización - Solo para usuario maestro
  @Post('sync/teams')
  async syncTeams(@Body() body: { competition: string; season?: number }) {
    const result = await this.syncService.syncTeams(body.competition, body.season);
    return { 
      message: 'Teams synced successfully',
      teamsCreated: result.teamsCreated,
      teamsUpdated: result.teamsUpdated,
      teamsSkipped: result.teamsSkipped,
      totalFromAPI: result.totalFromAPI
    };
  }

  @Post('sync/matchday')
  async syncMatchday(@Body() body: { 
    competition: string; 
    season: number; 
    matchday: number 
  }) {
    const result = await this.syncService.syncMatchday(
      body.competition,
      body.season,
      body.matchday
    );
    return result;
  }

  @Post('sync/date-range')
  async syncDateRange(@Body() body: { 
    competition: string; 
    dateFrom: string; 
    dateTo: string 
  }) {
    const result = await this.syncService.syncMatchesByDateRange(
      body.competition,
      body.dateFrom,
      body.dateTo
    );
    return result;
  }

  @Post('sync/live')
  async syncLiveMatches() {
    const result = await this.syncService.syncLiveMatches();
    return result;
  }

  @Post('sync/all-matchdays')
  async syncAllMatchdays(@Body() body: { 
    competition?: string; 
    season?: number;
    fromMatchday?: number;
    toMatchday?: number;
  }) {
    const competition = body.competition || FOOTBALL_API_CONFIG.DEFAULT_COMPETITION;
    const season = body.season || FOOTBALL_API_CONFIG.DEFAULT_SEASON;
    const fromMatchday = body.fromMatchday || 1;
    const toMatchday = body.toMatchday || 38;
    
    const result = await this.syncService.syncAllMatchdays(
      competition,
      season,
      fromMatchday,
      toMatchday
    );
    return result;
  }

  @Post('sync/edition-locks')
  async updateEditionLocks(@Body() body: { editionId: string }) {
    const locksAt = await this.syncService.updateEditionLocksAt(body.editionId);
    return { locksAt };
  }
}
