'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';

interface SyncResult {
  matchesCreated?: number;
  matchesUpdated?: number;
  matchesSkipped?: number;
  totalFromAPI?: number;
  teamsCreated?: number;
  teamsUpdated?: number;
  teamsSkipped?: number;
  message?: string;
  locksAt?: string;
  totalMatchdays?: number;
  successful?: number;
  failed?: number;
  errors?: Array<{ matchday: number; error: string }>;
}

export default function FootballDataAdmin() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');
  const [currentMatchday, setCurrentMatchday] = useState<number>(15);
  const [selectedMatchday, setSelectedMatchday] = useState<number>(15);
  const [season, setSeason] = useState<number>(2025);

  // Verificar si es usuario maestro
  const isMasterUser = user?.email === 'master@pickandsurvive.com';

  // Cargar jornada actual al montar el componente
  useEffect(() => {
    if (isMasterUser && token) {
      fetch(`${API_BASE_URL}/football-data/current-matchday`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.currentMatchday) {
            setCurrentMatchday(data.currentMatchday);
            setSelectedMatchday(data.currentMatchday);
          }
        })
        .catch(err => console.error('Error loading current matchday:', err));
    }
  }, [isMasterUser, token]);

  const apiCall = async (endpoint: string, body?: any) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/football-data${endpoint}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const syncTeams = () => {
    apiCall('/sync/teams', { competition: 'PD' });
  };

  const syncMatchday = () => {
    apiCall('/sync/matchday', { competition: 'PD', season, matchday: selectedMatchday });
  };

  const syncLiveMatches = () => {
    apiCall('/sync/live', {}); // Enviar body vacío para que sea POST
  };

  const syncAllMatchdays = () => {
    if (!confirm('¿Estás seguro de que quieres sincronizar TODAS las jornadas? Esto puede tardar varios minutos.')) {
      return;
    }
    apiCall('/sync/all-matchdays', { 
      competition: 'PD', 
      season, 
      fromMatchday: 1, 
      toMatchday: 38 
    });
  };

  const validateToken = () => {
    apiCall('/validate-token');
  };

  const getConfig = () => {
    apiCall('/config');
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Verificación de acceso */}
        {!isMasterUser ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">🚫</div>
              <h1 className="text-2xl font-bold text-white mb-4">Acceso Denegado</h1>
              <p className="text-gray-300 mb-6">Solo el usuario maestro puede acceder a esta página.</p>
              <a
                href="/dashboard"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Volver al Dashboard
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gradient mb-2">⚽ Administración de Datos de Fútbol</h1>
                  <p className="text-gray-300 text-lg">
                    Sincroniza equipos y partidos desde Football-Data.org
                  </p>
                </div>
                <div className="flex space-x-4">
                  <a
                    href="/dashboard"
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    ← Volver al Dashboard
                  </a>
                </div>
              </div>
            </div>

        {/* Configuración */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Configuración</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={getConfig}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                Ver Configuración
              </button>
              <button
                onClick={validateToken}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
              >
                Validar Token
              </button>
            </div>
          </div>
        </div>

        {/* Sincronización */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Sincronización</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Equipos</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Sincroniza equipos de LaLiga desde la API
                </p>
                <button
                  onClick={syncTeams}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Sincronizar Equipos
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Sincronizar Jornada</h4>
                <div className="mb-3 space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Temporada:</label>
                    <input
                      type="number"
                      value={season}
                      onChange={(e) => setSeason(Number(e.target.value))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      min="2020"
                      max="2030"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Jornada:</label>
                    <input
                      type="number"
                      value={selectedMatchday}
                      onChange={(e) => setSelectedMatchday(Number(e.target.value))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      min="1"
                      max="38"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Jornada actual en BD: {currentMatchday}
                    </p>
                  </div>
                </div>
                <button
                  onClick={syncMatchday}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
                >
                  Sincronizar Jornada {selectedMatchday}
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Partidos en Vivo</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Actualiza resultados de partidos en curso
                </p>
                <button
                  onClick={syncLiveMatches}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                >
                  Sincronizar En Vivo
                </button>
              </div>
            </div>

            {/* Botón para sincronizar todas las jornadas */}
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">🚀 Sincronización Completa</h4>
              <p className="text-sm text-gray-600 mb-3">
                Sincroniza todas las jornadas (1-38) y actualiza todos los resultados. 
                <strong className="text-yellow-700"> Esto puede tardar varios minutos.</strong>
              </p>
              <button
                onClick={syncAllMatchdays}
                disabled={loading}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 font-semibold"
              >
                {loading ? 'Sincronizando...' : 'Sincronizar Todas las Jornadas (1-38)'}
              </button>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {(result || error) && (
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Resultado</h3>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  {result.teamsCreated !== undefined ? (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-900 mb-3">📊 Estadísticas de Sincronización de Equipos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Total desde API</p>
                          <p className="text-lg font-bold text-purple-800">{result.totalFromAPI || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Equipos Creados</p>
                          <p className="text-lg font-bold text-green-800">{result.teamsCreated || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Equipos Actualizados</p>
                          <p className="text-lg font-bold text-blue-800">{result.teamsUpdated || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Equipos Omitidos</p>
                          <p className="text-lg font-bold text-yellow-800">{result.teamsSkipped || 0}</p>
                          {result.teamsSkipped > 0 && (
                            <p className="text-xs text-yellow-600">(campos faltantes o errores)</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Total procesados:</strong> {(result.teamsCreated || 0) + (result.teamsUpdated || 0)} de {result.totalFromAPI || 0} equipos
                        </p>
                      </div>
                    </div>
                  ) : result.totalMatchdays ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Total Jornadas</p>
                          <p className="text-lg font-bold text-green-800">{result.totalMatchdays}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Exitosas</p>
                          <p className="text-lg font-bold text-green-800">{result.successful}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Fallidas</p>
                          <p className="text-lg font-bold text-red-800">{result.failed}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Partidos Creados</p>
                          <p className="text-lg font-bold text-green-800">{result.matchesCreated}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Partidos Actualizados</p>
                          <p className="text-lg font-bold text-blue-800">{result.matchesUpdated}</p>
                        </div>
                        {result.matchesSkipped !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Partidos Omitidos</p>
                            <p className="text-lg font-bold text-yellow-800">{result.matchesSkipped}</p>
                            <p className="text-xs text-yellow-600">(equipos no encontrados)</p>
                          </div>
                        )}
                        {result.totalFromAPI !== undefined && (
                          <div>
                            <p className="text-xs text-gray-600">Total desde API</p>
                            <p className="text-lg font-bold text-purple-800">{result.totalFromAPI}</p>
                          </div>
                        )}
                      </div>
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-red-800 mb-2">Errores:</p>
                          <div className="bg-red-50 border border-red-200 rounded p-2 max-h-40 overflow-auto">
                            {result.errors.map((err, idx) => (
                              <p key={idx} className="text-xs text-red-700">
                                Jornada {err.matchday}: {err.error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <pre className="text-green-800 text-sm overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-900">Sincronizando datos...</p>
            </div>
          </div>
        )}

            {/* Información */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Información</h3>
              <div className="text-blue-800 text-sm space-y-2">
                <p>• <strong>Equipos:</strong> Sincroniza todos los equipos de LaLiga</p>
                <p>• <strong>Jornada:</strong> Importa partidos de una jornada específica</p>
                <p>• <strong>En Vivo:</strong> Actualiza resultados de partidos en curso</p>
                <p>• <strong>Token:</strong> Configurado con tu cuenta de Football-Data.org</p>
                <p>• <strong>Usuario:</strong> jose-4-9@hotmail.com</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
