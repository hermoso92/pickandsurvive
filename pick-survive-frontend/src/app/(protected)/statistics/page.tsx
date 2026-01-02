'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues, useBalance } from '@/hooks/useLeagues';
import { API_ENDPOINTS } from '@/config/api';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Statistics');

interface LeagueStats {
  memberCount: number;
  editionCount: number;
  openEditions: number;
  activeEditions: number;
  finishedEditions: number;
}

interface LedgerEntry {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  createdAt: string;
  leagueId?: string;
  editionId?: string;
}

export default function StatisticsPage() {
  const { user, token } = useAuth();
  const { leagues, loading: leaguesLoading } = useLeagues();
  const { balance, loading: balanceLoading } = useBalance();
  
  const [leagueStats, setLeagueStats] = useState<Record<string, LeagueStats>>({});
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calcular estadísticas generales
  const totalLeagues = leagues?.length || 0;
  const totalEditions = leagues?.reduce((acc, l) => acc + l.editions.length, 0) || 0;
  const activeEditions = leagues?.reduce((acc, l) => 
    acc + l.editions.filter(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS').length, 0
  ) || 0;

  useEffect(() => {
    if (token && leagues) {
      fetchAllStats();
    }
  }, [token, leagues]);

  const fetchAllStats = async () => {
    try {
      setLoadingStats(true);
      setError(null);

      // Cargar estadísticas de cada liga
      const statsPromises = leagues.map(async (league) => {
        try {
          const response = await fetch(API_ENDPOINTS.LEAGUES.STATS(league.id), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const stats = await response.json();
            return { leagueId: league.id, stats };
          }
          return null;
        } catch (err) {
          logger.error(`Error al cargar stats de liga ${league.id}`, err);
          return null;
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, LeagueStats> = {};
      statsResults.forEach(result => {
        if (result) {
          statsMap[result.leagueId] = result.stats;
        }
      });
      setLeagueStats(statsMap);

      // Cargar historial de transacciones
      try {
        const ledgerResponse = await fetch(API_ENDPOINTS.ME.LEDGER, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (ledgerResponse.ok) {
          const ledgerData = await ledgerResponse.json();
          setLedger(ledgerData);
        }
      } catch (err) {
        logger.error('Error al cargar ledger', err);
      }

    } catch (err) {
      logger.error('Error al cargar estadísticas', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoadingStats(false);
    }
  };

  // Calcular estadísticas de transacciones
  const totalEarnings = ledger
    .filter(e => e.amountCents > 0)
    .reduce((acc, e) => acc + e.amountCents, 0);
  const totalSpent = Math.abs(ledger
    .filter(e => e.amountCents < 0)
    .reduce((acc, e) => acc + e.amountCents, 0));

  if (loadingStats || leaguesLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-gradient mb-3 flex items-center gap-3">
            <span className="text-6xl">📊</span>
            Estadísticas
          </h1>
          <p className="text-gray-200 text-xl font-medium">
            Visualiza tu rendimiento y actividad en Pick & Survive
          </p>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="card hover-lift p-6 bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-2 border-blue-500/30">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl">
                <span className="text-4xl text-white">🏆</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Mis Ligas</p>
                <p className="text-4xl font-bold text-green-400 mt-1">{totalLeagues}</p>
              </div>
            </div>
          </div>

          <div className="card hover-lift p-6 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-500/30">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl">
                <span className="text-4xl text-white">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Ediciones Activas</p>
                <p className="text-4xl font-bold text-green-400 mt-1">{activeEditions}</p>
              </div>
            </div>
          </div>

          <div className="card hover-lift p-6 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/30">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-xl">
                <span className="text-4xl text-white">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Total Ediciones</p>
                <p className="text-4xl font-bold text-red-400 mt-1">{totalEditions}</p>
              </div>
            </div>
          </div>

          <div className="card hover-lift p-6 bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border-2 border-orange-500/30">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl shadow-xl">
                <span className="text-4xl text-white">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Saldo Actual</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">
                  {balanceLoading ? '...' : balance ? `${(balance.balanceCents / 100).toFixed(0)} PTS` : '0 PTS'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas de Transacciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="card hover-lift p-8 bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-2 border-green-500/40">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <span className="text-4xl">💰</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Ingresos Totales</h3>
            </div>
            <p className="text-5xl font-bold text-green-400 mb-3 drop-shadow-lg">
              {(totalEarnings / 100).toFixed(2)}€
            </p>
            <p className="text-base text-gray-200 font-medium">
              {ledger.filter(e => e.amountCents > 0).length} transacciones positivas
            </p>
          </div>

          <div className="card hover-lift p-8 bg-gradient-to-br from-red-900/50 to-orange-900/50 border-2 border-red-500/40">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl shadow-lg">
                <span className="text-4xl">💸</span>
              </div>
              <h3 className="text-2xl font-bold text-white">Gastos Totales</h3>
            </div>
            <p className="text-5xl font-bold text-red-400 mb-3 drop-shadow-lg">
              {(totalSpent / 100).toFixed(2)}€
            </p>
            <p className="text-base text-gray-200 font-medium">
              {ledger.filter(e => e.amountCents < 0).length} transacciones negativas
            </p>
          </div>
        </div>

        {/* Estadísticas por Liga */}
        {leagues && leagues.length > 0 && (
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-gradient mb-8 flex items-center gap-3">
              <span className="text-5xl">🏆</span>
              Estadísticas por Liga
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {leagues.map((league) => {
                const stats = leagueStats[league.id];
                if (!stats) return null;

                return (
                  <div key={league.id} className="card hover-lift border-2 border-blue-500/30">
                    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-6 text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold mb-1">{league.name}</h3>
                            <p className="text-blue-100 text-sm font-medium">Creada por {league.owner.alias || league.owner.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/20">
                          <p className="text-3xl font-bold text-green-400 mb-1">{stats.memberCount}</p>
                          <p className="text-sm text-gray-200 font-medium">Miembros</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/20">
                          <p className="text-3xl font-bold text-purple-400 mb-1">{stats.editionCount}</p>
                          <p className="text-sm text-gray-200 font-medium">Ediciones</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl border border-green-500/20">
                          <p className="text-3xl font-bold text-green-400 mb-1">{stats.activeEditions}</p>
                          <p className="text-sm text-gray-200 font-medium">Activas</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl border border-blue-500/20">
                          <p className="text-3xl font-bold text-blue-400 mb-1">{stats.finishedEditions}</p>
                          <p className="text-sm text-gray-200 font-medium">Finalizadas</p>
                        </div>
                      </div>
                      
                      <Link
                        href={`/leagues/${league.id}`}
                        className="block w-full btn-primary text-center py-3 px-4 font-semibold"
                      >
                        Ver Liga →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Historial de Transacciones */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gradient mb-8 flex items-center gap-3">
            <span className="text-5xl">💳</span>
            Historial de Transacciones
          </h2>
          {ledger.length === 0 ? (
            <div className="card hover-lift p-12 text-center bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-gray-600/30">
              <span className="text-7xl mb-6 block">📝</span>
              <h3 className="text-2xl font-bold text-white mb-3">No hay transacciones</h3>
              <p className="text-gray-300 text-lg">Tus transacciones aparecerán aquí cuando participes en ediciones</p>
            </div>
          ) : (
            <div className="card overflow-hidden border-2 border-blue-500/30">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Descripción</th>
                      <th className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wider">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 divide-y divide-gray-700/50">
                    {ledger.slice(0, 20).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">
                          {new Date(entry.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${
                            entry.amountCents > 0 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">{entry.description || '-'}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                          entry.amountCents > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {entry.amountCents > 0 ? '+' : ''}{(entry.amountCents / 100).toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ledger.length > 20 && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 text-center text-sm text-gray-300 font-medium border-t border-gray-700">
                  Mostrando las últimas 20 transacciones de {ledger.length} totales
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="card p-8 text-center bg-gradient-to-br from-red-900/40 to-orange-900/40 border-2 border-red-500/50">
            <span className="text-6xl mb-4 block">⚠️</span>
            <h3 className="text-xl font-bold text-red-300 mb-3">Error al cargar estadísticas</h3>
            <p className="text-red-200 text-lg">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

