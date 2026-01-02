// Configuración de URLs del backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-production-api.com' 
    : 'http://localhost:9998');

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
  },
  EDITIONS: {
    LIST: `${API_BASE_URL}/editions`,
    DETAIL: (id: string) => `${API_BASE_URL}/editions/${id}`,
    JOIN: (id: string) => `${API_BASE_URL}/editions/${id}/join`,
    STATS: (id: string) => `${API_BASE_URL}/editions/${id}/stats`,
    PROCESS: (id: string) => `${API_BASE_URL}/editions/${id}/process`,
    ADVANCE_MATCHDAY: (id: string) => `${API_BASE_URL}/editions/${id}/advance-matchday`,
    CLOSE: (id: string) => `${API_BASE_URL}/editions/${id}/close`,
  },
  LEAGUES: {
    CREATE: `${API_BASE_URL}/leagues`,
    MINE: `${API_BASE_URL}/leagues/mine`,
    DETAIL: (id: string) => `${API_BASE_URL}/leagues/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/leagues/${id}`,
    STATS: (id: string) => `${API_BASE_URL}/leagues/${id}/stats`,
    INVITES: (id: string) => `${API_BASE_URL}/leagues/${id}/invites`,
    JOIN: `${API_BASE_URL}/leagues/join`,
    MEMBERS: (id: string) => `${API_BASE_URL}/leagues/${id}/members`,
    EDITIONS: (id: string) => `${API_BASE_URL}/leagues/${id}/editions`,
    LEDGER: (id: string) => `${API_BASE_URL}/leagues/${id}/ledger`,
  },
  PICKS: {
    CREATE: (editionId: string) => `${API_BASE_URL}/editions/${editionId}/picks`,
  },
  MATCHES: {
    BY_MATCHDAY: (matchday: number) => `${API_BASE_URL}/matches/jornada/${matchday}`,
    DETAILED: (matchday: number) => `${API_BASE_URL}/matches/jornada/${matchday}/detailed`,
    UPDATE_RESULT: (matchId: string) => `${API_BASE_URL}/matches/${matchId}/result`,
    MAX_MATCHDAY: `${API_BASE_URL}/matches/max-matchday`,
  },
  ME: {
    BALANCE: `${API_BASE_URL}/me/balance`,
    LEDGER: `${API_BASE_URL}/me/ledger`,
  },
  POINTS: {
    ME: `${API_BASE_URL}/points/me`,
    HISTORY: `${API_BASE_URL}/points/history`,
    EDITION: (editionId: string) => `${API_BASE_URL}/points/edition/${editionId}`,
    TRANSACTION: `${API_BASE_URL}/points/transaction`,
  },
  ACHIEVEMENTS: {
    ALL: `${API_BASE_URL}/achievements`,
    LIST: `${API_BASE_URL}/achievements`,
    ME: `${API_BASE_URL}/achievements/me`,
    CHECK: `${API_BASE_URL}/achievements/check`,
    UNLOCK: `${API_BASE_URL}/achievements/unlock`,
  },
  SHOP: {
    ITEMS: `${API_BASE_URL}/shop/items`,
    MY_ITEMS: `${API_BASE_URL}/shop/my-items`,
    PURCHASE: (itemId: string) => `${API_BASE_URL}/shop/purchase/${itemId}`,
    ITEM: (itemId: string) => `${API_BASE_URL}/shop/item/${itemId}`,
    SELECT_LOGO: (itemId: string) => `${API_BASE_URL}/shop/select-logo/${itemId}`,
    SELECTED_LOGO: `${API_BASE_URL}/shop/selected-logo`,
  },
  RANKINGS: {
    GLOBAL: `${API_BASE_URL}/rankings/global`,
    LEAGUE: (leagueId: string) => `${API_BASE_URL}/rankings/league/${leagueId}`,
    EDITION: (editionId: string) => `${API_BASE_URL}/rankings/edition/${editionId}`,
    ME: `${API_BASE_URL}/rankings/me`,
    HISTORY: `${API_BASE_URL}/rankings/history`,
  },
  COINS: {
    ME: `${API_BASE_URL}/coins/me`,
    HISTORY: `${API_BASE_URL}/coins/history`,
    EDITION: (editionId: string) => `${API_BASE_URL}/coins/edition/${editionId}`,
    TRANSACTION: `${API_BASE_URL}/coins/transaction`,
  },
};
