'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues, useBalance } from '@/hooks/useLeagues';
import { API_ENDPOINTS } from '@/config/api';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Dashboard');

interface Team {
  id: string;
  name: string;
  shortName?: string;
  crest?: string;
}

interface Match {
  id: string;
  matchday: number;
  homeTeam: Team;
  awayTeam: Team;
  homeTeamId: string;
  awayTeamId: string;
  utcDate?: string;
  kickoffAt?: string;
  status?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

interface Pick {
  id: string;
  team: Team;
  match: Match;
}

interface Participant {
  id: string;
  userId: string;
  status: string;
  user: {
    id: string;
    alias: string | null;
    email: string;
  };
  picks: Pick[];
}

interface Edition {
  id: string;
  name: string;
  status: string;
  startMatchday: number;
  entryFeeCents: number;
  potCents: number;
  locksAt: string | null;
  participants: Participant[];
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { leagues, loading: leaguesLoading } = useLeagues();
  const { balance, loading: balanceLoading } = useBalance();
  
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [activeEdition, setActiveEdition] = useState<Edition | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [myPicks, setMyPicks] = useState<Record<string, Pick>>({});
  const [deadlineCountdown, setDeadlineCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [userPoints, setUserPoints] = useState(0);
  const [userCoins, setUserCoins] = useState(0);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);

  // Seleccionar primera liga por defecto
  useEffect(() => {
    if (leagues && leagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagues[0].id);
    }
  }, [leagues, selectedLeagueId]);

  // Cargar edición activa y datos relacionados
  useEffect(() => {
    if (selectedLeagueId && token) {
      loadActiveEdition();
    }
  }, [selectedLeagueId, token]);

  // Cargar puntos y logros
  useEffect(() => {
    if (token) {
      loadPointsAndAchievements();
    }
  }, [token]);

  const loadPointsAndAchievements = async () => {
    if (!token) return;
    
    try {
      // Cargar puntos
      const pointsRes = await fetch(API_ENDPOINTS.POINTS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (pointsRes.ok) {
        const pointsData = await pointsRes.json();
        setUserPoints(pointsData.totalPoints || 0);
      }

      // Cargar monedas
      const coinsRes = await fetch(API_ENDPOINTS.COINS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (coinsRes.ok) {
        const coinsData = await coinsRes.json();
        setUserCoins(coinsData.totalCoins || 0);
      }

      // Cargar logros recientes
      const achievementsRes = await fetch(API_ENDPOINTS.ACHIEVEMENTS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setRecentAchievements(achievementsData.slice(0, 3)); // Top 3 más recientes
      }
    } catch (error) {
      // Silently fail - no es crítico para el dashboard
    }
  };

  // Refresco automático cada 30 segundos
  useEffect(() => {
    if (!selectedLeagueId || !token || !activeEdition) return;

    const interval = setInterval(() => {
      logger.debug('Refresco automático de datos');
      loadActiveEdition(true); // true = refresco silencioso
      setLastRefresh(new Date());
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [selectedLeagueId, token, activeEdition?.id]);

  // Actualizar countdown del deadline
  useEffect(() => {
    if (!activeEdition?.locksAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const deadline = new Date(activeEdition.locksAt!).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setDeadlineCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setDeadlineCountdown({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeEdition?.locksAt]);

  const loadActiveEdition = async (silent: boolean = false) => {
    if (!selectedLeagueId || !token) return;

    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      // Cargar en paralelo para optimizar
      const [editionsRes, ..._] = await Promise.all([
        fetch(API_ENDPOINTS.LEAGUES.EDITIONS(selectedLeagueId), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!editionsRes.ok) throw new Error('Error al cargar ediciones');

      const editions: Edition[] = await editionsRes.json();
      
      // Buscar edición activa (OPEN o IN_PROGRESS)
      const active = editions.find(e => e.status === 'OPEN' || e.status === 'IN_PROGRESS');
      
      if (active) {
        // Cargar detalles y partidos en paralelo
        const [editionDetailRes, matchesRes] = await Promise.all([
          fetch(API_ENDPOINTS.EDITIONS.DETAIL(active.id)),
          fetch(API_ENDPOINTS.MATCHES.DETAILED(active.startMatchday)).catch(() => 
            fetch(API_ENDPOINTS.MATCHES.BY_MATCHDAY(active.startMatchday))
          ),
        ]);

        if (editionDetailRes.ok) {
          const editionDetail: Edition = await editionDetailRes.json();
          setActiveEdition(editionDetail);
          
          // Encontrar mi participante y picks
          const myParticipant = editionDetail.participants.find(p => p.userId === user?.id);
          if (myParticipant) {
            const picksMap: Record<string, Pick> = {};
            myParticipant.picks.forEach(pick => {
              picksMap[pick.match.id] = pick;
            });
            setMyPicks(picksMap);
            
            // Calcular jornada actual del participante
            let currentMatchday = editionDetail.startMatchday;
            if (myParticipant.picks.length > 0) {
              const lastPickMatchday = Math.max(...myParticipant.picks.map(p => p.match.matchday));
              currentMatchday = lastPickMatchday + 1;
            }
            
            // Cargar partidos de la jornada actual del participante
            const currentMatchesRes = await fetch(API_ENDPOINTS.MATCHES.BY_MATCHDAY(currentMatchday)).catch(() => 
              fetch(API_ENDPOINTS.MATCHES.DETAILED(currentMatchday))
            );
            if (currentMatchesRes.ok) {
              const currentMatchesData: Match[] = await currentMatchesRes.json();
              setMatches(currentMatchesData);
            }
          } else if (matchesRes.ok) {
            // Si no es participante, usar los partidos de startMatchday
            const matchesData: Match[] = await matchesRes.json();
            setMatches(matchesData);
          }
        } else if (matchesRes.ok) {
          // Fallback si no se pudo cargar la edición
          const matchesData: Match[] = await matchesRes.json();
          setMatches(matchesData);
        }
      } else {
        setActiveEdition(null);
        setMatches([]);
        setMyPicks({});
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
      logger.error('Error al cargar edición activa', err);
      if (!silent) {
        setError(errorMessage);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const selectedLeague = leagues?.find(l => l.id === selectedLeagueId);
  const getUserRole = (league: any) => {
    const membership = league.members.find((m: any) => m.userId === user?.id);
    return membership?.role || 'PLAYER';
  };
  const userRole = selectedLeague ? getUserRole(selectedLeague) : 'PLAYER';
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  // Función para determinar si un pick es correcto
  const isPickCorrect = (pick: Pick, match: Match): boolean | null => {
    if (!match.homeGoals && match.homeGoals !== 0) return null; // Partido sin resultado
    if (match.status !== 'FINISHED') return null; // Partido no finalizado
    
    // Si es empate, todos los picks son incorrectos
    if (match.homeGoals === match.awayGoals) return false;
    
    // Determinar equipo ganador
    const winningTeamId = match.homeGoals! > match.awayGoals! 
      ? match.homeTeamId 
      : match.awayTeamId;
    
    return pick.team.id === winningTeamId;
  };

  // Calcular ranking (participantes ordenados por picks correctos)
  const ranking = activeEdition?.participants
    .filter(p => p.status === 'ACTIVE')
    .map(p => {
      // Contar picks correctos
      const correctPicks = p.picks.filter(pick => {
        const match = matches.find(m => m.id === pick.match.id);
        if (!match) return false;
        return isPickCorrect(pick, match) === true;
      }).length;
      
      return {
        user: p.user,
        points: correctPicks,
        totalPicks: p.picks.length,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 10) || [];

  // Estadísticas rápidas
  const activePlayers = activeEdition?.participants.filter(p => p.status === 'ACTIVE').length || 0;
  const eliminatedPlayers = activeEdition?.participants.filter(p => p.status === 'ELIMINATED').length || 0;
  const currentPot = activeEdition?.potCents || 0;

  // Componente Skeleton para carga
  const MatchSkeleton = () => (
    <div className="border border-gray-700 rounded-lg p-4 animate-pulse bg-gray-800/50">
      <div className="h-4 bg-gray-700 rounded w-24 mb-3"></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-8"></div>
          </div>
          <div className="h-4 bg-gray-700 rounded w-8"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-8"></div>
          </div>
        </div>
        <div className="h-8 bg-gray-700 rounded w-24"></div>
      </div>
    </div>
  );

  const RankingSkeleton = () => (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 animate-pulse border border-gray-700">
          <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-700 rounded w-12"></div>
        </div>
      ))}
    </div>
  );

  if (leaguesLoading || (loading && !activeEdition)) {
    return (
      <div className="p-6 bg-gray-700 min-h-screen relative z-10">
        <div className="max-w-[1920px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna izquierda skeleton */}
            <div className="lg:col-span-3 space-y-6">
              <div className="card animate-pulse">
                <div className="h-32 bg-gray-800 rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-full"></div>
                  <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                </div>
              </div>
            </div>
            {/* Columna central skeleton */}
            <div className="lg:col-span-6 space-y-6">
              <div className="card animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="h-8 bg-gray-800 rounded w-2/3"></div>
                  <div className="h-32 bg-gray-800 rounded-lg"></div>
                  <MatchSkeleton />
                  <MatchSkeleton />
                </div>
              </div>
            </div>
            {/* Columna derecha skeleton */}
            <div className="lg:col-span-3">
              <div className="card animate-pulse">
                <div className="p-4">
                  <div className="h-6 bg-gray-800 rounded w-32 mb-4"></div>
                  <RankingSkeleton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-700 min-h-screen relative z-10">
      <div className="max-w-[1920px] mx-auto">
        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-red-300">Error al cargar datos</p>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
            <button
              onClick={() => loadActiveEdition()}
              className="btn-primary text-sm py-2 px-4"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Indicador de última actualización */}
        {!loading && activeEdition && (
          <div className="mb-4 text-right">
            <p className="text-xs text-gray-500">
              Última actualización: {lastRefresh.toLocaleTimeString('es-ES')}
            </p>
          </div>
        )}

        {/* Layout 3 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA */}
          <div className="lg:col-span-3 space-y-6">
            {/* Mi Liga */}
            {selectedLeague && (
              <div className="card hover-lift">
                <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-5 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white text-lg drop-shadow-lg">Mi Liga</h3>
                      <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {leagues && leagues.length > 1 ? (
                      <select
                        value={selectedLeagueId || ''}
                        onChange={(e) => setSelectedLeagueId(e.target.value)}
                        className="w-full mt-2 px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                      >
                        {leagues.map(l => (
                          <option key={l.id} value={l.id} className="bg-gray-800 text-white">
                            {l.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-green-100 font-semibold text-sm mt-2">{selectedLeague.name}</p>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2 bg-gradient-to-b from-gray-800/60 to-gray-800/40">
                  <Link
                    href={`/leagues/${selectedLeague.id}`}
                    className="flex items-center space-x-2 w-full btn-secondary text-center py-2 text-sm text-gray-200 hover:text-white"
                  >
                    <span>🏆</span>
                    <span>Ver Liga</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 w-full btn-secondary text-center py-2 text-sm text-gray-200 hover:text-white"
                  >
                    <span>👤</span>
                    <span>Mi Perfil</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href={`/leagues/${selectedLeague.id}/manage`}
                      className="flex items-center space-x-2 w-full btn-secondary text-center py-2 text-sm text-gray-200 hover:text-white"
                    >
                      <span>⚙️</span>
                      <span>Gestionar Liga</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Próximo Deadline */}
            {activeEdition && activeEdition.locksAt && (
              <div className="card hover-lift">
                <div className="p-5 bg-gradient-to-br from-blue-900/40 to-purple-900/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <span className="text-2xl">⏰</span>
                        Próximo Deadline
                      </h3>
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="text-center mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30">
                      <div className="text-5xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent drop-shadow-lg">
                        {deadlineCountdown.hours}H {deadlineCountdown.minutes}M {deadlineCountdown.seconds}S
                      </div>
                      <p className="text-sm text-blue-200 mt-2 font-medium">hasta el cierre</p>
                    </div>
                    <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border-2 border-red-500/50 rounded-lg p-3 text-center backdrop-blur-sm">
                      <p className="text-sm font-semibold text-red-200 flex items-center justify-center gap-2">
                        <span className="text-lg">⚠️</span>
                        ¡Haz tu pick antes del primer partido!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Widget de Puntos */}
            <div className="card hover-lift">
              <div className="p-5 bg-gradient-to-br from-yellow-900/30 to-orange-900/30">
                <h3 className="font-bold text-white mb-4 text-lg flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  Mis Puntos
                </h3>
                <div className="text-center mb-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30">
                  <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
                    {userPoints}
                  </div>
                  <p className="text-sm text-yellow-200 mt-2 font-medium">puntos totales</p>
                </div>
                <Link
                  href="/rankings"
                  className="block w-full btn-secondary text-center py-2 text-sm"
                >
                  Ver Clasificación
                </Link>
              </div>
            </div>

            {/* Widget de Monedas */}
            <div className="card hover-lift">
              <div className="p-5 bg-gradient-to-br from-orange-900/30 to-amber-900/30">
                <h3 className="font-bold text-white mb-4 text-lg flex items-center gap-2">
                  <span className="text-2xl">🪙</span>
                  Mis Monedas
                </h3>
                <div className="text-center mb-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl p-4 border border-orange-400/30">
                  <div className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                    {userCoins}
                  </div>
                  <p className="text-sm text-orange-200 mt-2 font-medium">monedas totales</p>
                </div>
                <Link
                  href="/shop"
                  className="block w-full btn-secondary text-center py-2 text-sm"
                >
                  Ir a Tienda
                </Link>
              </div>
            </div>

            {/* Widget de Logros Recientes */}
            {recentAchievements.length > 0 && (
              <div className="card hover-lift">
                <div className="p-5 bg-gradient-to-br from-purple-900/30 to-pink-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <span className="text-2xl">🎖️</span>
                      Logros
                    </h3>
                    <Link href="/achievements" className="text-xs text-purple-300 hover:text-purple-200 font-semibold transition-colors">
                      Ver todos →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {recentAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center space-x-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                        <span className="text-2xl">{achievement.icon || '🏆'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{achievement.name}</p>
                          <p className="text-xs text-gray-300">
                            {new Date(achievement.unlockedAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Invitar Amigos */}
            {selectedLeague && (
              <Link href={`/leagues/${selectedLeague.id}/manage`} className="block">
                <button className="w-full btn-success py-3 px-4 font-medium flex items-center justify-center space-x-2">
                  <span>✉️</span>
                  <span>Invitar Amigos</span>
                </button>
              </Link>
            )}
          </div>

          {/* COLUMNA CENTRAL */}
          <div className="lg:col-span-6 space-y-6">
            {/* Edición Activa */}
            {activeEdition ? (
              <>
                <div className="card hover-lift">
                  <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                    <div className="mb-4">
                      <h2 className="text-3xl font-bold text-gradient mb-2 flex items-center gap-3">
                        <span className="text-4xl">⚽</span>
                        Edición Activa: {activeEdition.name}
                      </h2>
                      <p className="text-gray-300 text-lg font-medium">Elige tu Pick para hoy</p>
                    </div>
                    
                    {/* Banner decorativo con estadio */}
                    <div className="relative rounded-xl p-8 text-center mb-6 overflow-hidden bg-gradient-to-br from-green-600/20 to-blue-600/20 border border-green-500/30">
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 400'%3E%3Crect fill='%231e293b' width='1200' height='400'/%3E%3Ccircle cx='600' cy='200' r='150' fill='%2322c55e' opacity='0.1'/%3E%3Cellipse cx='600' cy='200' rx='300' ry='100' fill='%233b82f6' opacity='0.1'/%3E%3C/svg%3E")`
                        }}
                      ></div>
                      <div className="relative z-10">
                        <div className="text-6xl mb-2">⚽</div>
                        <p className="text-white font-medium">¡Confía en este!</p>
                      </div>
                    </div>

                    {/* Partidos */}
                    {matches.length > 0 ? (
                      <div className="space-y-4 mb-6">
                        {matches.map((match) => {
                          const myPick = myPicks[match.id];
                          const matchDate = match.utcDate ? new Date(match.utcDate) : (match.kickoffAt ? new Date(match.kickoffAt) : null);
                          const isToday = matchDate && matchDate.toDateString() === new Date().toDateString();
                          const isFinished = match.status === 'FINISHED';
                          const hasResult = match.homeGoals !== null && match.homeGoals !== undefined && match.awayGoals !== null && match.awayGoals !== undefined;
                          const pickResult = myPick ? isPickCorrect(myPick, match) : null;
                          
                          return (
                            <div 
                              key={match.id} 
                              className={`border rounded-lg p-4 hover:shadow-md transition-all duration-300 animate-fade-in ${
                                isFinished && pickResult === false 
                                  ? 'border-red-700 bg-red-900/20' 
                                  : isFinished && pickResult === true
                                  ? 'border-green-600 bg-green-900/20'
                                  : 'border-gray-700 bg-gray-800/50'
                              }`}
                              style={{ animationDelay: `${matches.indexOf(match) * 0.1}s` }}
                            >
                              <div className="text-sm text-gray-300 mb-3">
                                {isToday ? 'Hoy' : matchDate?.toLocaleDateString('es-ES')} {matchDate?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="text-center flex-1">
                                    <p className={`font-bold ${
                                      isFinished && hasResult && match.homeGoals! > match.awayGoals!
                                        ? 'text-green-400'
                                        : isFinished && hasResult && match.homeGoals! < match.awayGoals!
                                        ? 'text-gray-500'
                                        : 'text-white'
                                    }`}>
                                      {match.homeTeam.name}
                                    </p>
                                    {hasResult && (
                                      <p className="text-lg font-bold text-gray-300">{match.homeGoals}</p>
                                    )}
                                  </div>
                                  <span className="text-gray-400 font-bold">VS</span>
                                  <div className="text-center flex-1">
                                    <p className={`font-bold ${
                                      isFinished && hasResult && match.awayGoals! > match.homeGoals!
                                        ? 'text-green-400'
                                        : isFinished && hasResult && match.awayGoals! < match.homeGoals!
                                        ? 'text-gray-500'
                                        : 'text-white'
                                    }`}>
                                      {match.awayTeam.name}
                                    </p>
                                    {hasResult && (
                                      <p className="text-lg font-bold text-gray-300">{match.awayGoals}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  {myPick ? (
                                    <div className={`flex flex-col items-end space-y-1 ${
                                      pickResult === true ? 'text-green-400' : 
                                      pickResult === false ? 'text-red-400' : 
                                      'text-gray-200'
                                    }`}>
                                      <div className="flex items-center space-x-2">
                                        <span>{pickResult === true ? '✔' : pickResult === false ? '✗' : '⏳'}</span>
                                        <span className="text-sm font-medium">
                                          {pickResult === true ? '¡Ganaste!' : 
                                           pickResult === false ? 'Perdiste' : 
                                           'Tú elegiste: ' + myPick.team.name}
                                        </span>
                                      </div>
                                      {pickResult !== null && (
                                        <span className="text-xs">
                                          {myPick.team.name}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <Link
                                      href={`/editions/${activeEdition.id}`}
                                      className="btn-primary text-sm py-2 px-4"
                                    >
                                      Haz tu Pick &gt;
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        No hay partidos disponibles para esta jornada
                      </div>
                    )}

                    {/* Confirmar Pick */}
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center space-x-2 text-yellow-400">
                          <span>⚠️</span>
                          <span className="text-sm font-medium">Un error y estás fuera</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-300">Premio:</span>
                          <span className="text-lg font-bold text-yellow-400">{(currentPot / 100).toFixed(0)} PTS</span>
                        </div>
                      </div>
                      {Object.keys(myPicks).length > 0 ? (
                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 mb-3">
                          <p className="text-sm text-green-300 text-center">
                            ✅ Tienes {Object.keys(myPicks).length} pick{Object.keys(myPicks).length > 1 ? 's' : ''} confirmado{Object.keys(myPicks).length > 1 ? 's' : ''}
                          </p>
                        </div>
                      ) : (
                        <Link
                          href={`/editions/${activeEdition.id}`}
                          className="block w-full btn-success py-3 text-center font-medium hover:shadow-lg transition-all"
                        >
                          Confirmar Pick &gt;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Historial de Ediciones */}
                {selectedLeague && selectedLeague.editions.length > 0 && (
                  <div className="card hover-lift">
                    <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-white text-xl flex items-center gap-2">
                          <span className="text-3xl">📜</span>
                          Historial de Ediciones
                        </h3>
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="space-y-3">
                        {selectedLeague.editions.slice(0, 5).reverse().map((edition) => {
                          // Buscar ganador de esta edición específica
                          const editionParticipants = activeEdition?.id === edition.id 
                            ? activeEdition.participants 
                            : [];
                          const winner = editionParticipants
                            .filter(p => p.status === 'ACTIVE')
                            .sort((a, b) => {
                              const aCorrect = a.picks.filter(pick => {
                                const match = matches.find(m => m.id === pick.match.id);
                                return match && isPickCorrect(pick, match) === true;
                              }).length;
                              const bCorrect = b.picks.filter(pick => {
                                const match = matches.find(m => m.id === pick.match.id);
                                return match && isPickCorrect(pick, match) === true;
                              }).length;
                              return bCorrect - aCorrect;
                            })[0];
                          
                          const isMyEdition = edition.id === activeEdition?.id;
                          const myParticipant = editionParticipants.find(p => p.userId === user?.id);
                          
                          return (
                            <div 
                              key={edition.id} 
                              className={`p-3 rounded-lg border ${
                                isMyEdition 
                                  ? 'bg-blue-900/20 border-blue-700' 
                                  : 'bg-gray-800/50 border-gray-700'
                              }`}
                            >
                              <div className="flex items-start space-x-2">
                                <span className={`text-lg ${
                                  edition.status === 'FINISHED' ? 'text-yellow-400' : 
                                  edition.status === 'ELIMINATED' ? 'text-red-400' : 
                                  'text-gray-500'
                                }`}>
                                  {edition.status === 'FINISHED' ? '🏆' : 
                                   edition.status === 'ELIMINATED' ? '❌' : 
                                   edition.status === 'IN_PROGRESS' ? '⚡' : '⏳'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${
                                    isMyEdition ? 'text-blue-300' : 'text-white'
                                  }`}>
                                    {edition.name}
                                  </p>
                                  {edition.status === 'FINISHED' && winner && (
                                    <p className="text-xs text-gray-300 mt-1">
                                      Ganador: <span className="font-semibold text-white">{winner.user.alias || winner.user.email}</span>
                                    </p>
                                  )}
                                  {myParticipant && (
                                    <p className={`text-xs mt-1 ${
                                      myParticipant.status === 'ACTIVE' 
                                        ? 'text-green-400 font-semibold' 
                                        : 'text-red-400'
                                    }`}>
                                      {myParticipant.status === 'ACTIVE' ? '✅ Activo' : '❌ Eliminado'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card hover-lift">
                <div className="p-12 text-center">
                  <span className="text-6xl mb-4 block">🏆</span>
                  <h3 className="text-xl font-semibold text-white mb-2">No hay edición activa</h3>
                  <p className="text-gray-300 mb-4">
                    {selectedLeague 
                      ? 'No hay ediciones abiertas en esta liga en este momento.'
                      : 'Selecciona una liga para ver las ediciones activas.'}
                  </p>
                  {selectedLeague && (
                    <Link
                      href={`/leagues/${selectedLeague.id}/editions/create`}
                      className="btn-primary inline-block"
                    >
                      Crear Edición
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA */}
          <div className="lg:col-span-3 space-y-6">
            {/* Ranking de la Liga */}
            {selectedLeague && (
              <div className="card hover-lift">
                <div className="p-5 bg-gradient-to-br from-purple-900/30 to-blue-900/30">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <span className="text-2xl">🏆</span>
                      Ranking de la Liga
                    </h3>
                    <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {ranking.length > 0 ? (
                    <div className="space-y-2">
                      {ranking.map((entry, index) => (
                        <div
                          key={entry.user.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 animate-fade-in ${
                            entry.user.id === user?.id 
                              ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-500 shadow-md' 
                              : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700'
                          }`}
                          style={{ animationDelay: `${ranking.indexOf(entry) * 0.05}s` }}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold text-sm">
                            {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              entry.user.id === user?.id ? 'text-blue-300 font-bold' : 'text-white'
                            }`}>
                              {entry.user.alias || entry.user.email}
                            </p>
                            {entry.totalPicks > 0 && (
                              <p className="text-xs text-gray-300">
                                {entry.points}/{entry.totalPicks} correctos
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${
                              index === 0 ? 'text-yellow-400' : 
                              index === 1 ? 'text-gray-400' : 
                              index === 2 ? 'text-orange-400' : 
                              'text-green-400'
                            }`}>
                              {entry.points} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="text-4xl mb-2 block">📊</span>
                      <p className="text-sm text-gray-400">
                        No hay participantes aún
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estadísticas Rápidas */}
            {activeEdition && (
              <div className="card hover-lift">
                <div className="p-5 bg-gradient-to-br from-blue-900/30 to-cyan-900/30">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      <span className="text-2xl">📊</span>
                      Estadísticas Rápidas
                    </h3>
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>👥</span>
                        <span className="text-sm text-gray-200">Jugadores Activos</span>
                      </div>
                      <span className="font-bold text-green-400">{activePlayers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-400">❌</span>
                        <span className="text-sm text-gray-200">Eliminados</span>
                      </div>
                      <span className="font-bold text-red-400">{eliminatedPlayers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>💰</span>
                        <span className="text-sm text-gray-200">Pozo Actual</span>
                      </div>
                      <span className="font-bold text-yellow-400">{(currentPot / 100).toFixed(0)} PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}