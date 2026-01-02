import { Injectable, Logger } from '@nestjs/common';
import { FOOTBALL_API_CONFIG, FootballMatch, Competition } from '../config/football-api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FootballDataService {
  private readonly logger = new Logger(FootballDataService.name);
  private readonly baseUrl = FOOTBALL_API_CONFIG.FOOTBALL_DATA.BASE_URL;
  private readonly token = FOOTBALL_API_CONFIG.FOOTBALL_DATA.TOKEN;

  constructor(private readonly prisma: PrismaService) {}

  private async makeRequest<T>(endpoint: string): Promise<T> {
    if (!this.token) {
      throw new Error('Football Data API token not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'X-Auth-Token': this.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Si es rate limit, incluir información sobre cuándo se puede reintentar
        if (response.status === 429) {
          const retryAfter = response.headers.get('X-Requests-Available') || 'unknown';
          throw new Error(`API request failed: 429 Too Many Requests. Rate limit excedido. Requests disponibles: ${retryAfter}`);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene todas las competiciones disponibles
   */
  async getCompetitions(): Promise<Competition[]> {
    this.logger.log('Fetching competitions from Football Data API');
    const data = await this.makeRequest<{ competitions: Competition[] }>('/competitions');
    return data.competitions;
  }

  /**
   * Obtiene información de una competición específica
   */
  async getCompetition(competitionCode: string): Promise<Competition> {
    this.logger.log(`Fetching competition ${competitionCode}`);
    return await this.makeRequest<Competition>(`/competitions/${competitionCode}`);
  }

  /**
   * Obtiene equipos de una competición específica
   * Nota: La API de Football Data requiere un parámetro de temporada para obtener equipos
   */
  async getTeams(competitionCode: string, season?: number): Promise<{ teams: any[] }> {
    this.logger.log(`Fetching teams for competition ${competitionCode}${season ? ` season ${season}` : ''}`);
    
    // Si no se proporciona temporada, usar la temporada por defecto
    const seasonParam = season || FOOTBALL_API_CONFIG.DEFAULT_SEASON;
    const endpoint = `/competitions/${competitionCode}/teams?season=${seasonParam}`;
    
    try {
      const response = await this.makeRequest<{ teams: any[] }>(endpoint);
      this.logger.log(`Successfully fetched ${response?.teams?.length || 0} teams`);
      return response;
    } catch (error) {
      this.logger.error(`Error fetching teams:`, error);
      // Si falla con temporada, intentar sin temporada (algunas competiciones no la requieren)
      if (season) {
        this.logger.log(`Retrying without season parameter...`);
        return await this.makeRequest<{ teams: any[] }>(`/competitions/${competitionCode}/teams`);
      }
      throw error;
    }
  }

  /**
   * Obtiene partidos de una jornada específica
   */
  async getMatchesByMatchday(
    competitionCode: string,
    season: number,
    matchday: number
  ): Promise<FootballMatch[]> {
    this.logger.log(`Fetching matches for ${competitionCode} season ${season} matchday ${matchday}`);
    
    const params = new URLSearchParams({
      season: season.toString(),
      matchday: matchday.toString(),
    });

    const data = await this.makeRequest<{ matches: FootballMatch[] }>(
      `/competitions/${competitionCode}/matches?${params}`
    );

    return data.matches;
  }

  /**
   * Obtiene partidos de un rango de fechas
   */
  async getMatchesByDateRange(
    competitionCode: string,
    dateFrom: string,
    dateTo: string
  ): Promise<FootballMatch[]> {
    this.logger.log(`Fetching matches from ${dateFrom} to ${dateTo}`);
    
    const params = new URLSearchParams({
      dateFrom,
      dateTo,
    });

    const data = await this.makeRequest<{ matches: FootballMatch[] }>(
      `/competitions/${competitionCode}/matches?${params}`
    );

    return data.matches;
  }

  /**
   * Obtiene partidos en vivo
   */
  async getLiveMatches(): Promise<FootballMatch[]> {
    this.logger.log('Fetching live matches');
    const data = await this.makeRequest<{ matches: FootballMatch[] }>('/matches');
    return data.matches.filter(match => match.status === 'IN_PLAY');
  }

  /**
   * Obtiene la jornada actual máxima disponible en la base de datos
   */
  async getCurrentMatchday(): Promise<number | null> {
    const match = await this.prisma.match.findFirst({
      where: {
        season: FOOTBALL_API_CONFIG.DEFAULT_SEASON,
        competition: FOOTBALL_API_CONFIG.DEFAULT_COMPETITION,
      },
      orderBy: {
        matchday: 'desc'
      },
      select: {
        matchday: true
      }
    });

    return match?.matchday || null;
  }

  /**
   * Obtiene partidos de los próximos días
   */
  async getUpcomingMatches(competitionCode: string, days: number = 7): Promise<FootballMatch[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = futureDate.toISOString().split('T')[0];

    return this.getMatchesByDateRange(competitionCode, dateFrom, dateTo);
  }

  /**
   * Calcula el horario de cierre de picks para una jornada
   */
  calculateLocksAt(matches: FootballMatch[]): Date {
    if (matches.length === 0) {
      throw new Error('No matches provided to calculate locks at time');
    }

    const matchTimes = matches.map(match => new Date(match.utcDate).getTime());
    const earliestMatch = new Date(Math.min(...matchTimes));
    
    // Restamos 1 hora para cerrar picks antes del primer partido
    const locksAt = new Date(earliestMatch.getTime() - 60 * 60 * 1000);
    
    this.logger.log(`Calculated locks at: ${locksAt.toISOString()}`);
    return locksAt;
  }

  /**
   * Convierte fecha UTC a zona horaria de Madrid
   */
  convertToMadridTime(utcDate: string): Date {
    const date = new Date(utcDate);
    // Convertir a Madrid timezone (UTC+1 o UTC+2 dependiendo del horario de verano)
    return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  }

  /**
   * Valida si un token de API es válido
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getCompetitions();
      return true;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      return false;
    }
  }
}
