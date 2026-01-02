'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_ENDPOINTS } from '@/config/api';
import { useToast } from '@/hooks/useToast';

interface Team {
  id: string;
  name: string;
  shortName: string;
}

interface Match {
  id: string;
  matchday: number;
  kickoffAt: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: Team;
  awayTeam: Team;
  picks: Array<{
    id: string;
    participant: {
      user: {
        alias: string | null;
        email: string;
      };
    };
    team: Team;
  }>;
}

export default function AdminPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchday, setSelectedMatchday] = useState<number>(1);
  const [maxMatchday, setMaxMatchday] = useState<number>(38);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingMatch, setUpdatingMatch] = useState<string | null>(null);

  useEffect(() => {
    fetchMaxMatchday();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [selectedMatchday]);

  const fetchMaxMatchday = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.MATCHES.MAX_MATCHDAY);
      if (response.ok) {
        const data = await response.json();
        setMaxMatchday(data.maxMatchday || 38);
        // Si la jornada seleccionada es mayor que la máxima, ajustarla
        if (selectedMatchday > data.maxMatchday) {
          setSelectedMatchday(data.maxMatchday || 1);
        }
      }
    } catch (err) {
      console.error('Error fetching max matchday:', err);
    }
  };

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.MATCHES.DETAILED(selectedMatchday));
      if (!res.ok) throw new Error('No se pudieron cargar los partidos.');
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMatchResult = async (matchId: string, homeGoals: number, awayGoals: number) => {
    if (!token) return;
    
    setUpdatingMatch(matchId);
    try {
      const res = await fetch(API_ENDPOINTS.MATCHES.UPDATE_RESULT(matchId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ homeGoals, awayGoals })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al actualizar resultado');
      }

      const result = await res.json();
      
      const message = `Resultado actualizado! ${result.match.homeTeam} ${result.match.homeGoals}-${result.match.awayGoals} ${result.match.awayTeam}. Ganador: ${result.winningTeam}. Eliminados: ${result.eliminatedParticipants.join(', ') || 'Ninguno'}. Participantes activos: ${result.activeParticipantsRemaining}`;
      toast.success(message);
      
      // Recargar los partidos
      await fetchMatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar resultado');
    } finally {
      setUpdatingMatch(null);
    }
  };

  if (isLoading) return <main className="text-center mt-20"><p>Cargando partidos...</p></main>;
  if (error) return <main className="text-center mt-20"><p className="text-red-500">{error}</p></main>;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">
            Gestiona resultados de partidos y estadísticas del juego
          </p>
        </div>

        {/* Selector de jornada */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <label htmlFor="matchday" className="block text-sm font-medium text-gray-700 mb-3">
              Seleccionar Jornada:
            </label>
            <select
              id="matchday"
              value={selectedMatchday}
              onChange={(e) => setSelectedMatchday(Number(e.target.value))}
              className="w-full max-w-xs px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: maxMatchday }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>Jornada {day}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Jornada máxima disponible: {maxMatchday}
            </p>
          </div>
        </div>

        {/* Lista de partidos */}
        <div className="space-y-6">
          {matches.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <span className="text-6xl mb-4 block">⚽</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay partidos</h3>
              <p className="text-gray-600">No hay partidos para la jornada {selectedMatchday}</p>
            </div>
          ) : (
            matches.map(match => (
              <div key={match.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header del partido */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                      match.status === 'FINISHED' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}>
                      {match.status === 'FINISHED' ? 'FINALIZADO' : 'PENDIENTE'}
                    </span>
                  </div>
                  
                  {/* Resultado actual */}
                  {match.status === 'FINISHED' && (
                    <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">
                        {match.homeGoals} - {match.awayGoals}
                      </p>
                    </div>
                  )}
                </div>

                {/* Contenido del partido */}
                <div className="p-6">
                  {/* Formulario para actualizar resultado */}
                  {match.status !== 'FINISHED' && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Actualizar Resultado:</h4>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700">{match.homeTeam.name}:</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            id={`${match.id}-home`}
                            className="w-20 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <span className="text-gray-500 font-medium">-</span>
                        <div className="flex items-center space-x-3">
                          <label className="text-sm font-medium text-gray-700">{match.awayTeam.name}:</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            id={`${match.id}-away`}
                            className="w-20 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const homeGoals = parseInt((document.getElementById(`${match.id}-home`) as HTMLInputElement)?.value || '0');
                            const awayGoals = parseInt((document.getElementById(`${match.id}-away`) as HTMLInputElement)?.value || '0');
                            updateMatchResult(match.id, homeGoals, awayGoals);
                          }}
                          disabled={updatingMatch === match.id}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                        >
                          {updatingMatch === match.id ? 'Actualizando...' : 'Actualizar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Picks de este partido */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Picks en este partido:</h4>
                    {match.picks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl mb-4 block">🎯</span>
                        <p>No hay picks para este partido</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {match.picks.map(pick => (
                          <div key={pick.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {pick.participant.user.alias || pick.participant.user.email}
                                </p>
                                <p className="text-sm text-gray-500">Participante</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-blue-600">{pick.team.name}</p>
                                <p className="text-sm text-gray-500">Selección</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
