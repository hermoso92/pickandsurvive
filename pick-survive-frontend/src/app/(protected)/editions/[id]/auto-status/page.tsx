'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config/api';

interface Edition {
  id: string;
  name: string;
  status: string;
  startMatchday: number;
  endMatchday?: number; // Opcional - puede ser null
  mode: string;
  participants: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      alias: string;
      email: string;
    };
  }>;
}

interface AutoStats {
  edition: Edition;
  activeCount: number;
  eliminatedCount: number;
  currentMatchday: number;
  status: string;
}

export default function EditionAutoStatusPage() {
  const params = useParams();
  const { token } = useAuth();
  const editionId = params.id as string;

  const [autoStats, setAutoStats] = useState<AutoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (token && editionId) {
      fetchAutoStats();
    }
  }, [token, editionId]);

  const fetchAutoStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/editions/${editionId}/auto-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas automáticas');
      }

      const stats = await response.json();
      setAutoStats(stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessEdition = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/editions/${editionId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al procesar la edición');
      }

      // Recargar estadísticas después del procesamiento
      await fetchAutoStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas automáticas...</p>
        </div>
      </div>
    );
  }

  if (error && !autoStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/leagues"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a Mis Ligas
          </Link>
        </div>
      </div>
    );
  }

  if (!autoStats) return null;

  const { edition, activeCount, eliminatedCount, currentMatchday, status } = autoStats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/leagues" className="hover:text-blue-600">Mis Ligas</Link>
            <span>→</span>
            <Link href={`/editions/${editionId}`} className="hover:text-blue-600">{edition.name}</Link>
            <span>→</span>
            <span className="text-gray-900">Estado Automático</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">🤖 Estado Automático</h1>
              <p className="text-gray-600">Gestión automática de la edición "{edition.name}"</p>
            </div>
            
            <button
              onClick={handleProcessEdition}
              disabled={processing}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? 'Procesando...' : '🔄 Procesar Ahora'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Estadísticas Principales */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estado General */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Estado General</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{activeCount}</div>
                  <div className="text-sm text-gray-600">Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{eliminatedCount}</div>
                  <div className="text-sm text-gray-600">Eliminados</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{currentMatchday}</div>
                  <div className="text-sm text-gray-600">Jornada Actual</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    status === 'OPEN' ? 'text-yellow-600' :
                    status === 'IN_PROGRESS' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {status === 'OPEN' ? '⏳' : status === 'IN_PROGRESS' ? '🏃' : '🏆'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {status === 'OPEN' ? 'Abierta' : status === 'IN_PROGRESS' ? 'En Progreso' : 'Finalizada'}
                  </div>
                </div>
              </div>
            </div>

            {/* Progreso de Jornadas */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Progreso de Jornadas</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jornada de Inicio:</span>
                  <span className="font-semibold">J{edition.startMatchday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jornada Actual:</span>
                  <span className="font-semibold text-blue-600">J{currentMatchday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jornada de Fin:</span>
                  <span className="font-semibold text-purple-600">Automática</span>
                </div>
                
                {/* Barra de progreso */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progreso</span>
                    <span className="text-purple-600 font-semibold">Dinámico</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((currentMatchday - edition.startMatchday + 1) * 10))}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    La edición termina cuando todos los jugadores están eliminados
                  </p>
                </div>
              </div>
            </div>

            {/* Participantes */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Participantes</h2>
              
              <div className="space-y-3">
                {edition.participants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      participant.status === 'ACTIVE' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`text-2xl ${
                        participant.status === 'ACTIVE' ? '✅' : '❌'
                      }`}>
                        {participant.status === 'ACTIVE' ? '✅' : '❌'}
                      </span>
                      <div>
                        <div className="font-semibold">
                          {participant.user.alias || participant.user.email}
                        </div>
                        <div className="text-sm text-gray-600">
                          {participant.status === 'ACTIVE' ? 'Activo' : 'Eliminado'}
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1 text-xs font-medium rounded-full ${
                      participant.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {participant.status === 'ACTIVE' ? 'ACTIVO' : 'ELIMINADO'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel Lateral */}
          <div className="lg:col-span-1 space-y-6">
            {/* Información del Sistema */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 Sistema Automático</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">¿Cómo funciona?</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Detecta automáticamente la jornada actual</li>
                    <li>• Se adapta a jornadas nuevas de la API</li>
                    <li>• Compara resultados reales con predicciones</li>
                    <li>• Elimina jugadores que fallan</li>
                    <li>• Avanza automáticamente a la siguiente jornada</li>
                    <li>• Termina cuando todos están eliminados</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Frecuencia de Procesamiento</h4>
                  <p className="text-gray-600">Cada 5 minutos automáticamente</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Procesamiento Manual</h4>
                  <p className="text-gray-600">Puedes procesar manualmente usando el botón "Procesar Ahora"</p>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ Acciones Rápidas</h3>
              
              <div className="space-y-3">
                <Link
                  href={`/editions/${editionId}`}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                >
                  📊 Ver Edición Completa
                </Link>
                
                <button
                  onClick={fetchAutoStats}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🔄 Actualizar Estadísticas
                </button>
              </div>
            </div>

            {/* Estado del Sistema */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🔧 Estado del Sistema</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cron Job:</span>
                  <span className="text-green-600 font-semibold">✅ Activo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Procesamiento:</span>
                  <span className="text-blue-600 font-semibold">🔄 Automático</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Última Actualización:</span>
                  <span className="text-gray-600 text-sm">{new Date().toLocaleTimeString('es-ES')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
