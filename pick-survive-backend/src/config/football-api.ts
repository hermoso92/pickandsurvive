// Configuración para APIs de fútbol
export const FOOTBALL_API_CONFIG = {
  DEFAULT_SEASON: parseInt(process.env.DEFAULT_SEASON || '2025'),
  DEFAULT_COMPETITION: process.env.DEFAULT_COMPETITION || 'PD',
  FOOTBALL_DATA: {
    BASE_URL: 'https://api.football-data.org/v4',
    TOKEN: process.env.FOOTBALL_DATA_TOKEN || '', // Necesitarás registrarte y obtener un token
    COMPETITIONS: {
      LALIGA: process.env.DEFAULT_COMPETITION || 'PD', // Primera División (LaLiga)
      CHAMPIONS_LEAGUE: 'CL',
      EUROPA_LEAGUE: 'EL',
    },
    RATE_LIMIT: {
      REQUESTS_PER_MINUTE: 10, // Plan gratuito
      REQUESTS_PER_DAY: 100,
    }
  },
  API_FOOTBALL: {
    BASE_URL: 'https://v3.football.api-sports.io',
    TOKEN: process.env.API_FOOTBALL_TOKEN || '',
    LEAGUES: {
      LALIGA: 140, // ID de LaLiga en API-Football
    }
  },
  TIMEZONE: 'Europe/Madrid',
  CACHE_DURATION: {
    MATCHES: 60 * 60 * 1000, // 1 hora
    COMPETITIONS: 24 * 60 * 60 * 1000, // 24 horas
  }
};

export interface FootballMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED';
  matchday: number;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
  };
  score?: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface Competition {
  id: number;
  name: string;
  code: string;
  currentSeason: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
}
