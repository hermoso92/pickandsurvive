import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { API_ENDPOINTS } from '@/config/api';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useLeagues');

export interface League {
  id: string;
  name: string;
  visibility: string;
  createdAt: string;
  owner: {
    id: string;
    alias: string;
    email: string;
  };
  members: Array<{
    userId: string;
    role: string;
    user: {
      id: string;
      alias: string;
      email: string;
    };
  }>;
  editions: Array<{
    id: string;
    name: string;
    status: string;
    mode: string;
  }>;
}

export interface LeagueStats {
  memberCount: number;
  editionCount: number;
  openEditions: number;
  activeEditions: number;
  finishedEditions: number;
}

export interface UserBalance {
  userId: string;
  balanceCents: number;
}

export const useLeagues = () => {
  const { token } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_ENDPOINTS.LEAGUES.MINE, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Error response:', new Error(`${response.status} ${errorText}`));
        throw new Error(`Error al cargar las ligas: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setLeagues(data);
    } catch (err) {
      logger.error('Error en fetchLeagues', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      // En caso de error, establecer ligas como array vacío para evitar undefined
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const createLeague = async (leagueData: {
    name: string;
    defaultConfigJson: any;
    visibility?: string;
  }) => {
    try {
      const response = await fetch(API_ENDPOINTS.LEAGUES.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(leagueData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la liga');
      }

      const newLeague = await response.json();
      setLeagues(prev => [newLeague, ...prev]);
      return newLeague;
    } catch (err) {
      throw err;
    }
  };

  const getLeagueById = async (leagueId: string): Promise<League> => {
    try {
      const response = await fetch(API_ENDPOINTS.LEAGUES.DETAIL(leagueId), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar la liga');
      }

      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const getLeagueStats = async (leagueId: string): Promise<LeagueStats> => {
    try {
      const response = await fetch(API_ENDPOINTS.LEAGUES.STATS(leagueId), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas de la liga');
      }

      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const inviteUser = async (leagueId: string, email: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.LEAGUES.INVITES(leagueId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar invitación');
      }

      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const acceptInvite = async (value: string, type: 'token' | 'code' = 'token') => {
    try {
      const body = type === 'code' ? { code: value } : { token: value };
      
      const response = await fetch(API_ENDPOINTS.LEAGUES.JOIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al aceptar invitación');
      }

      const league = await response.json();
      // Refrescar la lista de ligas
      await fetchLeagues();
      return league;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (token) {
      fetchLeagues();
    }
  }, [token]);

  return {
    leagues,
    loading,
    error,
    fetchLeagues,
    createLeague,
    getLeagueById,
    getLeagueStats,
    inviteUser,
    acceptInvite,
  };
};

export const useBalance = () => {
  const { token } = useAuth();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_ENDPOINTS.ME.BALANCE, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar el balance');
      }

      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBalance();
    }
  }, [token]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
  };
};
