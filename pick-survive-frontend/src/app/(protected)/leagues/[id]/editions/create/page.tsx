'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';
import { API_BASE_URL } from '@/config/api';

const logger = createLogger('CreateEdition');

interface League {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  members: Array<{
    userId: string;
    user: {
      id: string;
      alias: string | null;
      email: string;
    };
  }>;
}

export default function CreateEditionPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const leagueId = params.id as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    name: '',
    mode: 'ELIMINATORIO' as 'ELIMINATORIO' | 'LIGA',
    startMatchday: 1,
  });
  const [maxMatchday, setMaxMatchday] = useState<number>(38);

  useEffect(() => {
    if (token && leagueId) {
      fetchLeague();
      fetchMaxMatchday();
    }
  }, [token, leagueId]);

  const fetchMaxMatchday = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/matches/max-matchday`);
      if (response.ok) {
        const data = await response.json();
        setMaxMatchday(data.maxMatchday || 38);
        // Establecer la jornada actual como valor por defecto
        setFormData(prev => ({ ...prev, startMatchday: Math.min(data.maxMatchday || 1, prev.startMatchday) }));
      }
    } catch (err) {
      logger.error('Error fetching max matchday:', err);
    }
  };

  const fetchLeague = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar la liga');
      }

      const leagueData = await response.json();
      setLeague(leagueData);

      // Verificar que el usuario es el OWNER
      if (user && leagueData.ownerUserId !== user.id) {
        setError('Solo el creador de la liga puede crear ediciones');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!league) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/leagues/${leagueId}/editions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          mode: formData.mode,
          startMatchday: formData.startMatchday,
          // Sin cuota de entrada - participación gratuita
          configJson: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la edición');
      }

      const edition = await response.json();
      logger.info(`Edición creada exitosamente: ${edition.id}`);
      
      // Redirigir a la liga
      router.push(`/leagues/${leagueId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !league) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/leagues" className="hover:text-blue-600">Mis Ligas</Link>
            <span>→</span>
            <Link href={`/leagues/${leagueId}`} className="hover:text-blue-600">{league?.name}</Link>
            <span>→</span>
            <span className="text-gray-900">Crear Edición</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-gradient mb-2">Crear Nueva Edición</h1>
          <p className="text-gray-600">Configura una nueva edición para la liga "{league?.name}"</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre de la edición */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Edición
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Temporada 2025-2026"
                    required
                  />
                </div>

                {/* Modo de juego */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de Juego
                  </label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'ELIMINATORIO' | 'LIGA' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ELIMINATORIO">Eliminatorio</option>
                    <option value="LIGA">Liga</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.mode === 'ELIMINATORIO' 
                      ? 'Los participantes son eliminados cuando fallan una predicción'
                      : 'Todos los participantes compiten durante toda la temporada'
                    }
                  </p>
                </div>

                {/* Jornada de inicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jornada de Inicio
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxMatchday}
                    value={formData.startMatchday}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 1 && value <= maxMatchday) {
                        setFormData({ ...formData, startMatchday: value });
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    La edición comenzará en esta jornada y continuará automáticamente. 
                    Jornada máxima disponible: {maxMatchday}
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? 'Creando...' : 'Crear Edición'}
                  </button>
                  <Link
                    href={`/leagues/${leagueId}`}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Información de la liga */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Información de la Liga</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{league?.name}</h4>
                  <p className="text-sm text-gray-600">{league?.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Miembros ({league?.members?.length || 0})</h4>
                  <div className="space-y-1">
                    {league?.members && league.members.length > 0 ? (
                      league.members.map((member) => (
                        <div key={member.userId || member.user?.id} className="text-sm text-gray-600">
                          {member.user?.alias || member.user?.email || 'Usuario sin nombre'}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">No hay miembros</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Información sobre jornadas */}
            <div className="card p-6 mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Sistema Dinámico</h3>
              <p className="text-sm text-gray-600 mb-4">
                El sistema se adapta automáticamente a las jornadas disponibles:
              </p>
              <div className="space-y-2 text-sm">
                {[
                  { id: 'available', icon: '✅', color: 'text-green-600', text: 'Actualmente disponibles: Jornadas 1-11' },
                  { id: 'auto-release', icon: '🔄', color: 'text-blue-600', text: 'Se irán liberando más jornadas automáticamente' },
                  { id: 'end-condition', icon: '🏆', color: 'text-purple-600', text: 'La edición termina cuando todos están eliminados' },
                  { id: 'free', icon: '💰', color: 'text-yellow-600', text: 'Participación completamente gratuita' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <span className={item.color}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
