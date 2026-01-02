'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';

interface Edition {
  id: string;
  name: string;
  status: string;
  startMatchday: number;
  mode: string;
  activeCount?: number;
  eliminatedCount?: number;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
}

interface Match {
  id: string;
  matchday: number;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
  };
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  kickoffAt: string;
  picks: Array<{
    id: string;
    participant: {
      id: string;
      userId: string;
      alias: string;
      email: string;
      status: string;
    };
    team: {
      id: string;
      name: string;
      shortName: string;
    };
  }>;
  picksCount: number;
}

interface EditionMatches {
  matchday: number;
  matches: Match[];
}

interface AvailableTeams {
  matchday: number;
  teams: Team[];
  matches: Array<{
    id: string;
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
  }>;
}

export default function TestPage() {
  const { token } = useAuthStore();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [matches, setMatches] = useState<EditionMatches | null>(null);
  const [availableTeams, setAvailableTeams] = useState<AvailableTeams | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    if (selectedEdition) {
      fetchEditionMatches();
      fetchAvailableTeams();
    } else {
      setMatches(null);
      setAvailableTeams(null);
    }
  }, [selectedEdition]);

  const fetchEditions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_ENDPOINTS.EDITIONS.LIST);
      if (response.ok) {
        const data = await response.json();
        const editionsWithStats = data.map((edition: any) => ({
          ...edition,
          activeCount: edition.participants?.filter((p: any) => p.status === 'ACTIVE').length || 0,
          eliminatedCount: edition.participants?.filter((p: any) => p.status === 'ELIMINATED').length || 0
        }));
        setEditions(editionsWithStats);
        
        if (editionsWithStats.length === 0) {
          setError('No hay ediciones disponibles. Crea una edición primero.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error al cargar ediciones' }));
        setError(errorData.message || 'Error al cargar ediciones');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar ediciones');
      console.error('Error fetching editions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditionMatches = async () => {
    if (!selectedEdition || !token) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/editions/${selectedEdition}/test-matches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar partidos');
      }
      
      const data = await response.json();
      setMatches(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeams = async () => {
    if (!selectedEdition || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/editions/${selectedEdition}/test-teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTeams(data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const makePick = async () => {
    if (!selectedEdition || !selectedTeam || !token) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(API_ENDPOINTS.PICKS.CREATE(selectedEdition), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          teamId: selectedTeam,
          skipDeadline: true // Modo test: saltarse deadline
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al hacer pick');
      }
      
      setSuccess('Pick realizado correctamente');
      setSelectedTeam('');
      
      // Recargar datos
      await fetchEditionMatches();
      await fetchAvailableTeams();
    } catch (err: any) {
      setError(err.message || 'Error al hacer pick');
    } finally {
      setLoading(false);
    }
  };

  const simulateMatchResult = async (matchId: string, homeGoals: number, awayGoals: number) => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(API_ENDPOINTS.MATCHES.UPDATE_RESULT(matchId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ homeGoals, awayGoals }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al simular resultado');
      }
      
      const data = await response.json();
      setSuccess(`Resultado simulado: ${data.winningTeam || 'Empate'}. ${data.eliminatedParticipants?.length || 0} participantes eliminados.`);
      
      // Recargar partidos
      await fetchEditionMatches();
      await fetchEditions();
    } catch (err: any) {
      setError(err.message || 'Error al simular resultado');
    } finally {
      setLoading(false);
    }
  };

  const finishMatchday = async () => {
    if (!selectedEdition || !token) return;
    
    setProcessing(true);
    setError('');
    setSuccess('');
    
    try {
      // 1. Procesar la edición (evaluar partidos terminados)
      const processResponse = await fetch(`${API_BASE_URL}/editions/${selectedEdition}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.message || 'Error al procesar edición');
      }
      
      // 2. Avanzar a la siguiente jornada
      const advanceResponse = await fetch(`${API_BASE_URL}/editions/${selectedEdition}/advance-matchday`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!advanceResponse.ok) {
        const errorData = await advanceResponse.json();
        throw new Error(errorData.message || 'Error al avanzar jornada');
      }
      
      const advanceData = await advanceResponse.json();
      setSuccess(`Jornada terminada y avanzada a jornada ${advanceData.currentMatchday}`);
      
      // Recargar datos
      await fetchEditionMatches();
      await fetchAvailableTeams();
      await fetchEditions();
    } catch (err: any) {
      setError(err.message || 'Error al terminar jornada');
    } finally {
      setProcessing(false);
    }
  };

  const selectedEditionData = editions.find(e => e.id === selectedEdition);
  const allMatchesFinished = matches?.matches.every(m => m.status === 'FINISHED') || false;
  const hasUnfinishedMatches = matches?.matches.some(m => m.status !== 'FINISHED') || false;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Modo de Simulación Completo</h1>
          <p className="text-gray-600">
            Simula el flujo completo del juego: haz picks, simula resultados y avanza jornadas manualmente
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Selector de edición */}
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="edition" className="block text-sm font-medium text-gray-700">
              Seleccionar Edición:
            </label>
            <button
              onClick={fetchEditions}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
            >
              {loading ? 'Cargando...' : '🔄 Actualizar'}
            </button>
          </div>
          <select
            id="edition"
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
            disabled={loading || editions.length === 0}
            className="w-full max-w-md px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Selecciona una edición --</option>
            {editions.map(edition => (
              <option key={edition.id} value={edition.id}>
                {edition.name} ({edition.status}) - Jornada {edition.startMatchday}
              </option>
            ))}
          </select>
          {editions.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mt-2">
              No hay ediciones disponibles. Ve a "Mis Ligas" para crear una edición.
            </p>
          )}
        </div>

        {selectedEditionData && (
          <>
            {/* Información de la edición */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Estado de la Edición</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Estado:</span>
                  <span className="ml-2 text-blue-900">{selectedEditionData.status}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Modo:</span>
                  <span className="ml-2 text-blue-900">{selectedEditionData.mode}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Jornada Actual:</span>
                  <span className="ml-2 text-blue-900 font-bold">{selectedEditionData.startMatchday}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Activos:</span>
                  <span className="ml-2 text-green-700 font-bold">{selectedEditionData.activeCount || 0}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Eliminados:</span>
                  <span className="ml-2 text-red-700 font-bold">{selectedEditionData.eliminatedCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Hacer Pick */}
            {availableTeams && availableTeams.teams.length > 0 && (
              <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Hacer Pick (Jornada {availableTeams.matchday})</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecciona un equipo:
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Selecciona un equipo --</option>
                      {availableTeams.teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} ({team.shortName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={makePick}
                    disabled={!selectedTeam || loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Haciendo pick...' : '✅ Hacer Pick'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  💡 En modo test puedes hacer picks incluso si la jornada ya empezó
                </p>
              </div>
            )}

            {/* Botón para terminar jornada */}
            {hasUnfinishedMatches && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 mb-2">
                  ⚠️ Hay partidos sin resultados. Simula los resultados antes de terminar la jornada.
                </p>
              </div>
            )}

            {allMatchesFinished && (
              <div className="mb-6">
                <button
                  onClick={finishMatchday}
                  disabled={processing || advancing}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
                >
                  {processing || advancing ? 'Procesando...' : '🏁 Terminar Jornada y Avanzar'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Esto procesará todos los resultados, eliminará participantes que fallaron y avanzará a la siguiente jornada
                </p>
              </div>
            )}

            {/* Lista de partidos */}
            {loading && <p className="text-center py-8">Cargando partidos...</p>}
            
            {matches && matches.matches.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  ⚽ Partidos de la Jornada {matches.matchday}
                </h2>
                
                {matches.matches.map(match => (
                  <div key={match.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="text-center flex-1">
                            <p className="font-semibold text-gray-900">{match.homeTeam.name}</p>
                            <p className="text-sm text-gray-500">{match.homeTeam.shortName}</p>
                          </div>
                          <div className="text-2xl font-bold text-gray-700">
                            {match.homeGoals !== null ? match.homeGoals : '-'}
                            <span className="mx-2">-</span>
                            {match.awayGoals !== null ? match.awayGoals : '-'}
                          </div>
                          <div className="text-center flex-1">
                            <p className="font-semibold text-gray-900">{match.awayTeam.name}</p>
                            <p className="text-sm text-gray-500">{match.awayTeam.shortName}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          Estado: {match.status} | Picks: {match.picksCount}
                        </p>
                      </div>
                    </div>

                    {/* Picks del partido */}
                    {match.picks.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Predicciones:</p>
                        <div className="space-y-1">
                          {match.picks.map(pick => (
                            <div key={pick.id} className="text-sm">
                              <span className={`font-medium ${pick.participant.status === 'ACTIVE' ? 'text-green-700' : 'text-red-700'}`}>
                                {pick.participant.alias}
                              </span>
                              <span className="text-gray-600"> predijo </span>
                              <span className="font-medium text-gray-900">{pick.team.name}</span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${pick.participant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {pick.participant.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Simular resultado */}
                    {match.status !== 'FINISHED' && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Simular Resultado:</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Local"
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                            id={`home-${match.id}`}
                          />
                          <span className="self-center">-</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Visitante"
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                            id={`away-${match.id}`}
                          />
                          <button
                            onClick={() => {
                              const homeInput = document.getElementById(`home-${match.id}`) as HTMLInputElement;
                              const awayInput = document.getElementById(`away-${match.id}`) as HTMLInputElement;
                              const homeGoals = parseInt(homeInput.value) || 0;
                              const awayGoals = parseInt(awayInput.value) || 0;
                              simulateMatchResult(match.id, homeGoals, awayGoals);
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
                          >
                            Simular
                          </button>
                        </div>
                      </div>
                    )}

                    {match.status === 'FINISHED' && (
                      <div className="border-t pt-4">
                        <p className="text-sm text-green-700 font-medium">✓ Partido finalizado</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {matches && matches.matches.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">No hay partidos para esta jornada</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
