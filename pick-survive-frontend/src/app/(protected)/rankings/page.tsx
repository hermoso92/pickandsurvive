'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';
import RankingTable from '@/components/RankingTable';
import PointBadge from '@/components/PointBadge';
import { useToast } from '@/hooks/useToast';

interface RankingEntry {
  position: number;
  user: {
    id: string;
    email: string;
    alias?: string;
  };
  totalPoints?: number; // Para ranking global (suma de todas las ediciones)
  points?: number; // Para ranking por edición (solo esa edición)
  correctPicks?: number; // Para ranking por edición
  totalPicks?: number; // Para ranking por edición
  status?: string; // Para ranking por edición
  topAchievements?: Array<{
    code: string;
    name: string;
    icon?: string;
    rarity: string;
  }>;
}

interface Edition {
  id: string;
  name: string;
  status: string;
  startMatchday: number;
}

interface EditionHistoryEntry {
  edition: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    league: {
      id: string;
      name: string;
    };
  };
  points: number;
  correctPicks: number;
  totalPicks: number;
  position: number | null;
  totalParticipants: number;
  status: string;
}

export default function RankingsPage() {
  const { token, user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'global' | 'league' | 'edition' | 'history'>('global');
  const [globalRanking, setGlobalRanking] = useState<RankingEntry[]>([]);
  const [leagueRanking, setLeagueRanking] = useState<RankingEntry[]>([]);
  const [editionRanking, setEditionRanking] = useState<RankingEntry[]>([]);
  const [editionHistory, setEditionHistory] = useState<EditionHistoryEntry[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [editions, setEditions] = useState<Edition[]>([]);

  useEffect(() => {
    if (token) {
      if (activeTab === 'edition') {
        loadEditions();
      }
      if (activeTab === 'history') {
        loadHistory();
      } else {
        loadRankings();
      }
    }
  }, [token, activeTab, selectedLeagueId, selectedEditionId]);

  const loadEditions = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.LIST, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEditions(data);
      }
    } catch (error) {
      // Silently fail, editions will be empty
    }
  };

  const loadHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.RANKINGS.HISTORY, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEditionHistory(data.history || []);
      }
    } catch (error) {
      toast.error('Error al cargar histórico');
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      if (activeTab === 'global') {
        const res = await fetch(API_ENDPOINTS.RANKINGS.GLOBAL, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGlobalRanking(data.ranking || []);
        }
      } else if (activeTab === 'league' && selectedLeagueId) {
        const res = await fetch(API_ENDPOINTS.RANKINGS.LEAGUE(selectedLeagueId), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLeagueRanking(data.ranking || []);
        }
      } else if (activeTab === 'edition' && selectedEditionId) {
        const res = await fetch(API_ENDPOINTS.RANKINGS.EDITION(selectedEditionId), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEditionRanking(data.ranking || []);
        }
      }

      // Cargar mi posición
      const rankRes = await fetch(`${API_ENDPOINTS.RANKINGS.ME}?scope=${activeTab}${selectedLeagueId ? `&scopeId=${selectedLeagueId}` : ''}${selectedEditionId ? `&scopeId=${selectedEditionId}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setMyRank(rankData);
      }
    } catch (error) {
      toast.error('Error al cargar clasificaciones');
    } finally {
      setLoading(false);
    }
  };

  const currentRanking = activeTab === 'global' ? globalRanking : activeTab === 'league' ? leagueRanking : editionRanking;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📊 Clasificación</h1>
          <p className="text-gray-300">
            {activeTab === 'global' && '🌍 Ranking global: Suma de puntos de TODAS las ediciones'}
            {activeTab === 'league' && '🏆 Ranking por liga: Puntos totales de todos los miembros de la liga'}
            {activeTab === 'edition' && '📅 Ranking por edición: Solo puntos de esta edición específica'}
            {activeTab === 'history' && '📜 Histórico: Ediciones finalizadas en las que has participado'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-2 border-b border-gray-600">
            {[
              { id: 'global', label: '🌍 Global', icon: '🌍' },
              { id: 'league', label: '🏆 Por Liga', icon: '🏆' },
              { id: 'edition', label: '📅 Por Edición', icon: '📅' },
              { id: 'history', label: '📜 Histórico', icon: '📜' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-6 py-3 font-semibold transition-all duration-200 border-b-2
                  ${activeTab === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de Edición */}
        {activeTab === 'edition' && (
          <div className="mb-6 card p-4">
            <label htmlFor="edition-select" className="block text-sm font-medium text-gray-200 mb-2">
              Selecciona una edición:
            </label>
            <select
              id="edition-select"
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              className="w-full max-w-md px-4 py-2 bg-gray-800/90 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- Selecciona una edición --</option>
              {editions.map(edition => (
                <option key={edition.id} value={edition.id}>
                  {edition.name} ({edition.status}) - Jornada {edition.startMatchday}
                </option>
              ))}
            </select>
            {!selectedEditionId && (
              <p className="text-sm text-gray-400 mt-2">
                Selecciona una edición para ver su ranking específico
              </p>
            )}
          </div>
        )}

        {/* Aviso informativo para ranking por edición */}
        {activeTab === 'edition' && selectedEditionId && (
          <div className="mb-6 bg-blue-900/30 border-l-4 border-blue-500 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-300">Información sobre los puntos</h3>
                <div className="mt-2 text-sm text-blue-200">
                  <p>
                    Los puntos se otorgan automáticamente cuando se procesan los resultados de los partidos.
                    Si ves picks correctos pero 0 puntos, significa que los resultados aún no se han procesado.
                  </p>
                  <p className="mt-2">
                    Para procesar los resultados y otorgar puntos, ve a la página de la edición y usa el botón "Procesar Resultados".
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mi Posición */}
        {myRank && myRank.position > 0 && (
          <div className="mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tu Posición</p>
                <p className="text-3xl font-bold">#{myRank.position}</p>
                <p className="text-sm opacity-75">de {myRank.total} jugadores</p>
              </div>
              <div className="text-right">
                <PointBadge points={myRank.totalPoints || 0} size="lg" />
              </div>
            </div>
          </div>
        )}

        {/* Ranking Table o Histórico */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Cargando clasificación...</p>
          </div>
        ) : activeTab === 'history' ? (
          editionHistory.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Edición</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Liga</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Puntos</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Picks</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Posición</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {editionHistory.map((entry) => (
                      <tr key={entry.edition.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-white">{entry.edition.name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(entry.edition.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-300">{entry.edition.league.name}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-lg font-bold text-blue-400">{entry.points}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-300">
                            {entry.correctPicks}/{entry.totalPicks}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {entry.position ? (
                            <span className="font-bold text-white">
                              #{entry.position} / {entry.totalParticipants}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'ACTIVE' 
                              ? 'bg-green-500/30 text-green-300 border border-green-500/50' 
                              : 'bg-red-500/30 text-red-300 border border-red-500/50'
                          }`}>
                            {entry.status === 'ACTIVE' ? 'Activo' : 'Eliminado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 card">
              <p className="text-gray-400">No has participado en ediciones finalizadas aún</p>
            </div>
          )
        ) : currentRanking.length > 0 ? (
          <RankingTable
            data={currentRanking}
            showAchievements={true}
            highlightUserId={user?.id}
          />
        ) : (
          <div className="text-center py-12 card">
            <p className="text-gray-400">No hay datos de clasificación disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}

