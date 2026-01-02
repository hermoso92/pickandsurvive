'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';

interface League {
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

export default function LeaguesPage() {
  const { user, token } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.LEAGUES.MINE, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar las ligas');
      }

      const data = await response.json();
      setLeagues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (league: League) => {
    const membership = league.members.find(m => m.userId === user?.id);
    return membership?.role || 'PLAYER';
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      OWNER: { text: 'Propietario', class: 'bg-purple-100 text-purple-800' },
      ADMIN: { text: 'Admin', class: 'bg-blue-100 text-blue-800' },
      PLAYER: { text: 'Jugador', class: 'bg-green-100 text-green-800' },
    };
    
    const badge = badges[role as keyof typeof badges] || badges.PLAYER;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      OPEN: { text: 'Abierta', class: 'bg-green-100 text-green-800' },
      IN_PROGRESS: { text: 'En curso', class: 'bg-blue-100 text-blue-800' },
      FINISHED: { text: 'Finalizada', class: 'bg-gray-100 text-gray-800' },
    };
    
    const badge = badges[status as keyof typeof badges] || badges.OPEN;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando tus ligas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={fetchLeagues}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-gradient mb-2">Mis Ligas</h1>
              <p className="text-gray-300 text-lg">Gestiona tus ligas privadas y participa en ediciones</p>
            </div>
            <Link
              href="/leagues/create"
              className="btn-primary"
            >
              ➕ Crear Nueva Liga
            </Link>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-gradient hover-lift p-6">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <span className="text-3xl text-white">🏆</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Ligas</p>
                <p className="text-3xl font-bold text-gradient">{leagues.length}</p>
              </div>
            </div>
          </div>

          <div className="card-gradient hover-lift p-6">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                <span className="text-3xl text-white">👑</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Como Propietario</p>
                <p className="text-3xl font-bold text-gradient-danger">
                  {leagues.filter(l => getUserRole(l) === 'OWNER').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-gradient hover-lift p-6">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <span className="text-3xl text-white">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Ediciones Activas</p>
                <p className="text-3xl font-bold text-gradient-success">
                  {leagues.reduce((acc, l) => acc + l.editions.filter(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS').length, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Ligas */}
        {leagues.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-8xl mb-4 animate-float">🏆</div>
            <h3 className="text-2xl font-semibold text-white mb-2">No tienes ligas aún</h3>
            <p className="text-gray-300 mb-6">Crea tu primera liga para empezar a jugar con tus amigos</p>
            <Link
              href="/leagues/create"
              className="btn-primary"
            >
              Crear Mi Primera Liga
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {leagues.map((league) => {
              const userRole = getUserRole(league);
              const isOwner = userRole === 'OWNER';
              const isAdmin = userRole === 'ADMIN' || isOwner;
              
              return (
                <div key={league.id} className="card hover-lift">
                  {/* Header de la liga */}
                  <div className="bg-gradient-primary p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">{league.name}</h3>
                        <p className="text-blue-100 text-sm">Creada por {league.owner.alias || league.owner.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                          isOwner ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50' :
                          isAdmin ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50' :
                          'bg-green-500/30 text-green-200 border border-green-400/50'
                        }`}>
                          {isOwner ? 'Propietario' : isAdmin ? 'Admin' : 'Jugador'}
                        </span>
                        <p className="text-blue-100 text-xs mt-1">
                          {league.visibility === 'PRIVATE' ? '🔒 Privada' : '🌐 Pública'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-6">
                    {/* Estadísticas de la liga */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gradient">{league.members.length}</p>
                        <p className="text-sm text-gray-500">Miembros</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gradient">{league.editions.length}</p>
                        <p className="text-sm text-gray-500">Ediciones</p>
                      </div>
                    </div>

                    {/* Ediciones recientes */}
                    {league.editions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-200 mb-2">Ediciones Recientes</h4>
                        <div className="space-y-2">
                          {league.editions.slice(0, 3).map((edition) => (
                            <div key={edition.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-xl border border-gray-700/50">
                              <div>
                                <p className="text-sm font-medium text-white">{edition.name}</p>
                                <p className="text-xs text-gray-400">{edition.mode}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                edition.status === 'OPEN' ? 'badge-success' :
                                edition.status === 'IN_PROGRESS' ? 'badge-primary' :
                                'badge-warning'
                              }`}>
                                {edition.status === 'OPEN' ? 'Abierta' :
                                 edition.status === 'IN_PROGRESS' ? 'En curso' :
                                 'Finalizada'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex space-x-2">
                      <Link
                        href={`/leagues/${league.id}`}
                        className="flex-1 btn-primary text-center py-2 px-4 text-sm font-medium"
                      >
                        Ver Liga
                      </Link>
                      {isAdmin && (
                        <Link
                          href={`/leagues/${league.id}/manage`}
                          className="btn-secondary py-2 px-4 text-sm font-medium"
                        >
                          Gestionar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
