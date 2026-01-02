'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues, League } from '@/hooks/useLeagues';
import { API_ENDPOINTS } from '@/config/api';

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.id as string;
  const { user } = useAuth();
  const { getLeagueById } = useLeagues();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (leagueId) {
      fetchLeague();
    }
  }, [leagueId]);

  const getUserRole = () => {
    if (!league || !user) return 'PLAYER';
    const membership = league.members.find((m: any) => m.userId === user.id);
    return membership?.role || 'PLAYER';
  };

  const isAdmin = () => {
    const role = getUserRole();
    return role === 'OWNER' || role === 'ADMIN';
  };

  const isOwner = () => {
    const role = getUserRole();
    return role === 'OWNER';
  };

  const fetchLeague = async () => {
    try {
      setLoading(true);
      const leagueData = await getLeagueById(leagueId);
      setLeague(leagueData);
    } catch (err) {
      setError('Error al cargar la liga');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processEdition = async (editionId: string) => {
    if (!token) return;
    
    setProcessing(editionId);
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.PROCESS(editionId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al procesar edición');
      }

      alert('✅ Resultados procesados correctamente');
      await fetchLeague();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const advanceMatchday = async (editionId: string) => {
    if (!token) return;
    
    if (!confirm('¿Estás seguro de avanzar a la siguiente jornada? Esto no se puede deshacer.')) {
      return;
    }

    setAdvancing(editionId);
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.ADVANCE_MATCHDAY(editionId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al avanzar jornada');
      }

      const data = await res.json();
      alert(`✅ Jornada avanzada a ${data.currentMatchday}`);
      await fetchLeague();
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setAdvancing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando liga...</p>
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Liga no encontrada'}</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const userRole = getUserRole();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">{league.name}</h1>
              <p className="text-gray-600 text-lg">
                Creada por {league.owner.alias || league.owner.email}
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Volver
              </Link>
              {isAdmin() && (
                <Link
                  href={`/leagues/${leagueId}/manage`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Gestionar Liga
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-gradient hover-lift p-6">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <span className="text-3xl text-white">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Miembros</p>
                <p className="text-3xl font-bold text-gradient">{league.members.length}</p>
              </div>
            </div>
          </div>

          <div className="card-gradient hover-lift p-6">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <span className="text-3xl text-white">🏆</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ediciones</p>
                <p className="text-3xl font-bold text-gradient">{league.editions.length}</p>
              </div>
            </div>
          </div>

          <div className="card-gradient hover-lift p-6">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                <span className="text-3xl text-white">🎯</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tu Rol</p>
                <p className="text-3xl font-bold text-gradient">
                  {userRole === 'OWNER' ? 'Propietario' : 
                   userRole === 'ADMIN' ? 'Admin' : 'Jugador'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gradient mb-6">Miembros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {league.members.map((member: any) => (
              <div key={member.userId} className="card hover-lift p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {member.user.alias || member.user.email}
                    </h3>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                    member.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {member.role === 'OWNER' ? 'Propietario' :
                     member.role === 'ADMIN' ? 'Admin' : 'Jugador'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editions Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gradient">Ediciones</h2>
            {isOwner() && (
              <Link
                href={`/leagues/${leagueId}/editions/create`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Crear Edición
              </Link>
            )}
          </div>
          
          {league.editions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {league.editions.map((edition: any) => (
                <div key={edition.id} className="card hover-lift p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{edition.name}</h3>
                  <p className="text-gray-600 mb-2">Modo: {edition.mode}</p>
                  <p className="text-sm text-gray-500 mb-4">Jornada: {edition.startMatchday}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      edition.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                      edition.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {edition.status === 'OPEN' ? 'Abierta' :
                       edition.status === 'IN_PROGRESS' ? 'En Progreso' : 'Finalizada'}
                    </span>
                    <Link
                      href={`/editions/${edition.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver →
                    </Link>
                  </div>
                  {isAdmin() && edition.status === 'IN_PROGRESS' && (
                    <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => processEdition(edition.id)}
                        disabled={processing === edition.id}
                        className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        {processing === edition.id ? 'Procesando...' : '⚽ Procesar Resultados'}
                      </button>
                      <button
                        onClick={() => advanceMatchday(edition.id)}
                        disabled={advancing === edition.id}
                        className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                      >
                        {advancing === edition.id ? 'Avanzando...' : '➡️ Siguiente Jornada'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay ediciones</h3>
              <p className="text-gray-500 mb-6">Esta liga aún no tiene ediciones creadas.</p>
              {isOwner() && (
                <Link
                  href={`/leagues/${leagueId}/editions/create`}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Crear Primera Edición
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
