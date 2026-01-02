'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { API_ENDPOINTS } from '@/config/api';
import { useToast } from '@/hooks/useToast';

// Definimos los tipos de datos que esperamos de la API para mayor seguridad y autocompletado
interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeGoals?: number | null;
  awayGoals?: number | null;
  status?: string;
  matchday?: number;
}

interface Pick {
  team: Team;
  matchday: number;
  matchId: string;
  match?: {
    id: string;
    matchday: number;
    homeGoals?: number | null;
    awayGoals?: number | null;
    status?: string;
    homeTeam?: Team;
    awayTeam?: Team;
  };
}

interface Participant {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'ELIMINATED';
  user: {
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
  leagueId: string;
  configJson?: any;
  league?: {
    id: string;
    name: string;
    members?: Array<{
      userId: string;
      role: string;
    }>;
  };
  participants: Participant[];
  activeParticipants?: Participant[];
  eliminatedParticipants?: Participant[];
  totalParticipants?: number;
  activeCount?: number;
  eliminatedCount?: number;
}

export default function EditionDetailPage() {
  const { id: editionId } = useParams();
  const { token, user, setUser } = useAuthStore();
  const toast = useToast();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [previousMatches, setPreviousMatches] = useState<Record<number, Match[]>>({});
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [editionPoints, setEditionPoints] = useState(0);
  const [editionRank, setEditionRank] = useState<any>(null);

  // Usamos useCallback para evitar que la función se recree en cada renderizado
  const fetchEditionData = useCallback(async () => {
    if (!editionId) return;

    // Reiniciamos el estado de carga para mostrar el feedback al usuario
    setIsLoading(true);
    try {
      const editionRes = await fetch(API_ENDPOINTS.EDITIONS.DETAIL(editionId as string));
      if (!editionRes.ok) throw new Error('No se pudo encontrar la edición.');
      const editionData: Edition = await editionRes.json();
      setEdition(editionData);

      // Calcular jornada actual del participante
      const myParticipant = editionData.participants.find(p => p.userId === user?.id);
      let currentMatchday = editionData.startMatchday;
      if (myParticipant && myParticipant.picks.length > 0) {
        // La jornada actual es la siguiente después del último pick
        const lastPickMatchday = Math.max(...myParticipant.picks.map(p => p.matchday));
        currentMatchday = lastPickMatchday + 1;
      }

      // Cargar partidos de la jornada actual del participante (usar detailed para incluir equipos)
      try {
        const matchRes = await fetch(API_ENDPOINTS.MATCHES.DETAILED(currentMatchday));
        if (matchRes.ok) {
          const matchData: Match[] = await matchRes.json();
          console.log(`Cargados ${matchData?.length || 0} partidos para jornada ${currentMatchday}`, matchData);
          setMatches(matchData || []);
        } else {
          // Fallback a BY_MATCHDAY si detailed falla
          console.warn(`Detailed falló, intentando BY_MATCHDAY...`);
          const fallbackRes = await fetch(API_ENDPOINTS.MATCHES.BY_MATCHDAY(currentMatchday));
          if (fallbackRes.ok) {
            const fallbackData: Match[] = await fallbackRes.json();
            console.log(`Cargados ${fallbackData?.length || 0} partidos (fallback) para jornada ${currentMatchday}`, fallbackData);
            setMatches(fallbackData || []);
          } else {
            console.warn(`No se pudieron cargar los partidos de la jornada ${currentMatchday}:`, fallbackRes.status, fallbackRes.statusText);
            setMatches([]);
          }
        }
      } catch (err) {
        console.error('Error cargando partidos:', err);
        setMatches([]);
      }

      // myParticipant ya está definido arriba
      if (myParticipant && token) {
        try {
          const pointsRes = await fetch(API_ENDPOINTS.POINTS.EDITION(editionData.id), {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (pointsRes.ok) {
            const pointsData = await pointsRes.json();
            setEditionPoints(pointsData.points || 0);
          }

          // Cargar posición en ranking de edición
          const rankRes = await fetch(`${API_ENDPOINTS.RANKINGS.ME}?scope=edition&scopeId=${editionData.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (rankRes.ok) {
            const rankData = await rankRes.json();
            setEditionRank(rankData);
          }
        } catch (error) {
          // Silently fail
        }
      }

      // Cargar partidos de jornadas anteriores si el usuario tiene picks
      if (myParticipant && myParticipant.picks.length > 0) {
        const previousMatchdays = [...new Set(myParticipant.picks.map(p => p.matchday))].filter(md => md < currentMatchday);
        const previousMatchesData: Record<number, Match[]> = {};
        
        for (const matchday of previousMatchdays) {
          try {
            const prevMatchRes = await fetch(API_ENDPOINTS.MATCHES.BY_MATCHDAY(matchday));
            if (prevMatchRes.ok) {
              previousMatchesData[matchday] = await prevMatchRes.json();
            }
          } catch (err) {
            console.error(`Error cargando jornada ${matchday}:`, err);
          }
        }
        setPreviousMatches(previousMatchesData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Un error desconocido ocurrió');
    } finally {
      setIsLoading(false);
    }
  }, [editionId, user?.id, token]); // Dependencias de la función

  useEffect(() => {
    fetchEditionData();
  }, [fetchEditionData]); // El useEffect llama a la función memoizada

  // Recargar matches cuando cambie currentMatchday o edition
  useEffect(() => {
    if (!edition) return;
    
    // Calcular jornada actual
    const myParticipant = edition.participants.find(p => p.userId === user?.id);
    let matchday = edition.startMatchday;
    if (myParticipant && myParticipant.picks.length > 0) {
      const lastPickMatchday = Math.max(...myParticipant.picks.map(p => p.matchday));
      matchday = lastPickMatchday + 1;
    }

    const loadMatches = async () => {
      try {
        console.log(`Cargando partidos para jornada ${matchday}...`);
        const matchRes = await fetch(API_ENDPOINTS.MATCHES.DETAILED(matchday));
        if (matchRes.ok) {
          const matchData: Match[] = await matchRes.json();
          console.log(`✅ Cargados ${matchData?.length || 0} partidos para jornada ${matchday}`, matchData);
          setMatches(matchData || []);
        } else {
          console.warn(`⚠️ Detailed falló (${matchRes.status}), intentando BY_MATCHDAY...`);
          const fallbackRes = await fetch(API_ENDPOINTS.MATCHES.BY_MATCHDAY(matchday));
          if (fallbackRes.ok) {
            const fallbackData: Match[] = await fallbackRes.json();
            console.log(`✅ Cargados ${fallbackData?.length || 0} partidos (fallback) para jornada ${matchday}`, fallbackData);
            setMatches(fallbackData || []);
          } else {
            console.warn(`❌ No se pudieron cargar los partidos de la jornada ${matchday}:`, fallbackRes.status, fallbackRes.statusText);
            setMatches([]);
          }
        }
      } catch (err) {
        console.error('❌ Error cargando partidos:', err);
        setMatches([]);
      }
    };
    
    loadMatches();
  }, [edition?.id, edition?.startMatchday, edition?.participants, user?.id]);

  // Debug: verificar estado de matches (debe estar antes de los returns condicionales)
  useEffect(() => {
    if (edition) {
      const myParticipant = edition.participants.find(p => p.userId === user?.id);
      let currentMatchday = edition.startMatchday;
      if (myParticipant && myParticipant.picks.length > 0) {
        const lastPickMatchday = Math.max(...myParticipant.picks.map(p => p.matchday));
        currentMatchday = lastPickMatchday + 1;
      }
      
      console.log('Estado de matches actualizado:', {
        currentMatchday,
        matchesCount: matches.length,
        matches: matches,
        myParticipantRecord: !!myParticipant,
        editionStartMatchday: edition.startMatchday,
        isLoading,
        editionId: edition.id,
      });
    }
  }, [matches, edition, user?.id, isLoading]);

  const handleJoin = async () => {
    if (!token || !edition) return;
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.JOIN(editionId as string), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al unirse a la edición.');
      
      toast.success('¡Te has unido exitosamente a la edición!');

      await fetchEditionData(); // Recargamos los datos para actualizar la UI
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error');
    }
  };

  const handleMakePick = async () => {
    if (!selectedTeamId) {
      toast.error('Por favor, selecciona un equipo primero.');
      return;
    }
    
    if (!token) {
      toast.error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
      console.error('Token no disponible');
      return;
    }
    
    if (!editionId) {
      toast.error('No se pudo identificar la edición.');
      return;
    }
    
    console.log('Haciendo pick:', { editionId, teamId: selectedTeamId, tokenPresent: !!token });
    
    try {
      const url = API_ENDPOINTS.PICKS.CREATE(editionId as string);
      console.log('URL del pick:', url);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          teamId: selectedTeamId,
          skipDeadline: true // Modo pruebas: permitir picks aunque haya pasado el deadline
        }),
      });
      
      console.log('Respuesta del pick:', res.status, res.statusText);
      
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { message: `Error ${res.status}: ${res.statusText}` };
        }
        
        console.error('Error en respuesta:', errorData);
        
        if (res.status === 401) {
          toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
          // Limpiar auth y redirigir
          const { clearAuth } = useAuthStore.getState();
          clearAuth();
          window.location.href = '/login';
          return;
        }
        throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Pick creado exitosamente:', data);
      toast.success('¡Pick realizado con éxito!');
      await fetchEditionData(); // Recargamos para mostrar el pick confirmado
      setSelectedTeamId(''); // Limpiar selección
    } catch (err) {
      console.error('Error al hacer pick:', err);
      toast.error(err instanceof Error ? err.message : 'Ocurrió un error al realizar el pick');
    }
  };

  const isAdmin = () => {
    if (!edition?.league?.members || !user) {
      console.log('isAdmin check:', { 
        hasLeague: !!edition?.league, 
        hasMembers: !!edition?.league?.members, 
        hasUser: !!user,
        editionStatus: edition?.status 
      });
      return false;
    }
    const membership = edition.league.members.find(m => m.userId === user.id);
    const isAdminUser = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
    console.log('isAdmin check:', { 
      membership, 
      userRole: membership?.role, 
      isAdminUser,
      editionStatus: edition?.status 
    });
    return isAdminUser;
  };

  const handleProcessEdition = async () => {
    if (!token || !edition) return;
    
    setProcessing(true);
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.PROCESS(edition.id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al procesar edición');
      }

      toast.success('✅ Resultados procesados correctamente. Los puntos se han otorgado.');
      
      // Esperar un momento para que el backend procese todo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recargar datos de la edición
      await fetchEditionData();
      
      // Recargar puntos específicamente después de procesar (con retry)
      if (edition && token) {
        let retries = 3;
        while (retries > 0) {
          try {
            const pointsRes = await fetch(API_ENDPOINTS.POINTS.EDITION(edition.id), {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (pointsRes.ok) {
              const pointsData = await pointsRes.json();
              const points = pointsData.points || 0;
              setEditionPoints(points);
              console.log('✅ Puntos recargados después de procesar:', points);
              if (points > 0) {
                toast.success(`🎁 ¡Has ganado ${points} puntos!`);
              }
              break;
            }
          } catch (error) {
            console.error('Error recargando puntos (intento', 4 - retries, '):', error);
          }
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    } catch (err: any) {
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseEdition = async () => {
    if (!token || !edition) return;
    
    if (!confirm('¿Estás seguro de que quieres cerrar esta edición? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.CLOSE(edition.id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al cerrar edición');
      }

      toast.success('✅ Edición cerrada correctamente');
      await fetchEditionData();
    } catch (err: any) {
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAdvanceMatchday = async () => {
    if (!token || !edition) return;
    
    if (!confirm('¿Estás seguro de avanzar a la siguiente jornada? Esto no se puede deshacer.')) {
      return;
    }

    setAdvancing(true);
    try {
      const res = await fetch(API_ENDPOINTS.EDITIONS.ADVANCE_MATCHDAY(edition.id), {
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
      toast.success(`✅ Jornada avanzada a ${data.currentMatchday}`);
      await fetchEditionData();
    } catch (err: any) {
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setAdvancing(false);
    }
  };

  if (isLoading) return <main className="text-center mt-20"><p>Cargando datos de la edición...</p></main>;
  if (error) return <main className="text-center mt-20"><p className="text-red-500">{error}</p></main>;
  if (!edition) return <main className="text-center mt-20"><p>No se encontró la edición.</p></main>;

  const myParticipantRecord = edition.participants.find(p => p.userId === user?.id);
  
  // Calcular jornada actual del participante
  let currentMatchday = edition.startMatchday;
  if (myParticipantRecord && myParticipantRecord.picks.length > 0) {
    const lastPickMatchday = Math.max(...myParticipantRecord.picks.map(p => p.matchday));
    currentMatchday = lastPickMatchday + 1;
  }
  
  const myPick = myParticipantRecord?.picks.find(p => p.matchday === currentMatchday);
  
  // Obtener todos los equipos que ya ha elegido en jornadas anteriores
  const previousPicks = myParticipantRecord?.picks.filter(p => p.matchday < currentMatchday) || [];
  const previousTeamIds = previousPicks.map(p => p.team.id);
  
  // Verificar si la regla de no repetir equipo está habilitada
  const config = edition.configJson as any;
  const noRepeatTeam = config?.rules?.no_repeat_team !== false; // Por defecto true

  // Función para calcular si un pick fue correcto
  const isPickCorrect = (pick: Pick, matchday: number): boolean | null => {
    // Primero intentar usar el match del pick si está disponible
    let match: Pick['match'] | Match | undefined = pick.match;
    
    // Si no está disponible, buscar en los partidos cargados
    if (!match) {
      const foundMatch = previousMatches[matchday]?.find(m => m.id === pick.matchId);
      if (foundMatch) {
        match = {
          id: foundMatch.id,
          matchday: foundMatch.matchday ?? matchday,
          homeGoals: foundMatch.homeGoals,
          awayGoals: foundMatch.awayGoals,
          status: foundMatch.status,
          homeTeam: foundMatch.homeTeam,
          awayTeam: foundMatch.awayTeam,
        };
      }
    }
    
    // Si aún no lo encontramos, buscar por equipo
    if (!match) {
      const foundMatch = previousMatches[matchday]?.find(m => 
        m.homeTeam.id === pick.team.id || m.awayTeam.id === pick.team.id
      );
      if (foundMatch) {
        match = {
          id: foundMatch.id,
          matchday: foundMatch.matchday ?? matchday,
          homeGoals: foundMatch.homeGoals,
          awayGoals: foundMatch.awayGoals,
          status: foundMatch.status,
          homeTeam: foundMatch.homeTeam,
          awayTeam: foundMatch.awayTeam,
        };
      }
    }
    
    if (!match) return null;
    
    if (match.status !== 'FINISHED' || match.homeGoals === null || match.awayGoals === null) {
      return null; // Partido sin resultado
    }
    
    // Si es empate, todos los picks son incorrectos
    if (match.homeGoals === match.awayGoals) return false;
    
    // Determinar equipo ganador
    const winningTeamId = match.homeGoals > match.awayGoals 
      ? match.homeTeam!.id 
      : match.awayTeam!.id;
    
    return pick.team.id === winningTeamId;
  };

  // Obtener estadísticas de picks
  const pickStats = previousPicks.reduce((stats, pick) => {
    const result = isPickCorrect(pick, pick.matchday);
    if (result === true) stats.correct++;
    else if (result === false) stats.incorrect++;
    else stats.pending++;
    return stats;
  }, { correct: 0, incorrect: 0, pending: 0 });

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
      <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{edition.name}</h1>
            <p className="text-blue-100 mb-4">Jornada {currentMatchday}</p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-blue-100 text-sm">Participación</p>
                  <p className="text-xl font-bold">Gratuita</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="text-blue-100 text-sm">Participantes</p>
                  <p className="text-xl font-bold">{edition.participants.length}</p>
                </div>
              </div>
              {editionPoints > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="text-blue-100 text-sm">Tus Puntos</p>
                    <p className="text-xl font-bold">{editionPoints}</p>
                  </div>
                </div>
              )}
              {editionRank && editionRank.position > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="text-blue-100 text-sm">Tu Posición</p>
                    <p className="text-xl font-bold">#{editionRank.position}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>

        {/* Sección de participación */}
        <div className="mb-8">
      {!myParticipantRecord ? (
            // Vista para usuarios que NO participan
            <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
              <div className="max-w-md mx-auto">
                <span className="text-6xl mb-4 block">🎯</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Únete a esta edición</h2>
                <p className="text-gray-600 mb-6">
                  Participa en esta edición y compite por el bote de {(edition.potCents / 100).toFixed(2)}€
                </p>
          <button
            onClick={handleJoin}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
          >
                  ¡Unirme por {(edition.entryFeeCents / 100).toFixed(2)}€!
          </button>
              </div>
        </div>
      ) : !myPick ? (
            // Vista para participantes que NO han hecho su pick
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Elige tu equipo</h2>
                <p className="text-gray-600">Jornada {currentMatchday}</p>
              </div>
              
              <div className="space-y-4 mb-8">
            {matches && matches.length > 0 ? (
              matches.map(match => {
                const homeTeamAlreadyPicked = noRepeatTeam && previousTeamIds.includes(match.homeTeam.id);
                const awayTeamAlreadyPicked = noRepeatTeam && previousTeamIds.includes(match.awayTeam.id);
                
                return (
                  <div key={match.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <button 
                        onClick={() => {
                          if (!homeTeamAlreadyPicked) {
                            setSelectedTeamId(match.homeTeam.id);
                          }
                        }}
                        disabled={homeTeamAlreadyPicked}
                        className={`p-4 rounded-lg font-semibold transition-all duration-200 ${
                          homeTeamAlreadyPicked
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                            : selectedTeamId === match.homeTeam.id 
                              ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                              : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200 cursor-pointer'
                        }`}
                        title={homeTeamAlreadyPicked ? 'Ya elegiste este equipo en una jornada anterior' : `Seleccionar ${match.homeTeam.name}`}
                      >
                        {match.homeTeam.name}
                        {homeTeamAlreadyPicked && <span className="ml-2 text-xs">❌</span>}
                      </button>
                      <div className="text-center">
                        <span className="text-gray-500 font-medium">vs</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (!awayTeamAlreadyPicked) {
                            setSelectedTeamId(match.awayTeam.id);
                          }
                        }}
                        disabled={awayTeamAlreadyPicked}
                        className={`p-4 rounded-lg font-semibold transition-all duration-200 ${
                          awayTeamAlreadyPicked
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                            : selectedTeamId === match.awayTeam.id 
                              ? 'bg-blue-500 text-white shadow-lg transform scale-105' 
                              : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200 cursor-pointer'
                        }`}
                        title={awayTeamAlreadyPicked ? 'Ya elegiste este equipo en una jornada anterior' : `Seleccionar ${match.awayTeam.name}`}
                      >
                        {match.awayTeam.name}
                        {awayTeamAlreadyPicked && <span className="ml-2 text-xs">❌</span>}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800 font-medium">
                  {isLoading ? 'Cargando partidos...' : `No hay partidos disponibles para la jornada ${currentMatchday}`}
                </p>
                {!isLoading && (
                  <p className="text-yellow-600 text-sm mt-2">
                    Los partidos se cargarán automáticamente cuando estén disponibles.
                  </p>
                )}
              </div>
            )}
          </div>
              
              <button 
                onClick={handleMakePick} 
                disabled={!selectedTeamId} 
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-6 rounded-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                {selectedTeamId ? 'Confirmar Pick' : 'Selecciona un equipo'}
          </button>
        </div>
      ) : (
            // Vista para participantes que YA han hecho su pick
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-8 text-white text-center">
              <span className="text-6xl mb-4 block">✅</span>
              <h2 className="text-2xl font-bold mb-4">¡Pick Confirmado!</h2>
              <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-4">
                <p className="text-green-100 text-sm mb-2">Tu selección para la Jornada {currentMatchday}</p>
                <p className="text-4xl font-bold">{myPick.team.name}</p>
              </div>
              <p className="text-green-100">¡Mucha suerte en la competición!</p>
            </div>
          )}
        </div>

        {/* Historial de Picks (solo si el usuario tiene picks anteriores) */}
        {myParticipantRecord && previousPicks.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Tu Historial de Picks</h3>
            
            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm text-gray-600">Correctos</p>
                <p className="text-2xl font-bold text-green-600">{pickStats.correct}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">❌</div>
                <p className="text-sm text-gray-600">Incorrectos</p>
                <p className="text-2xl font-bold text-red-600">{pickStats.incorrect}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{pickStats.pending}</p>
              </div>
            </div>

            {/* Lista de picks anteriores */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {previousPicks
                  .sort((a, b) => b.matchday - a.matchday) // Más recientes primero
                  .map(pick => {
                    // Intentar obtener el match del pick o de los partidos cargados
                    let match = pick.match;
                    if (!match) {
                      match = previousMatches[pick.matchday]?.find(m => m.id === pick.matchId);
                    }
                    if (!match) {
                      match = previousMatches[pick.matchday]?.find(m => 
                        m.homeTeam.id === pick.team.id || m.awayTeam.id === pick.team.id
                      );
                    }
                    const result = isPickCorrect(pick, pick.matchday);
                    const hasResult = match && match.status === 'FINISHED' && 
                                     match.homeGoals !== null && match.homeGoals !== undefined &&
                                     match.awayGoals !== null && match.awayGoals !== undefined;
                    
                    return (
                      <div key={`${pick.matchday}-${pick.team.id}`} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                Jornada {pick.matchday}
                              </span>
                              {result === true && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                  ✅ Correcto
                                </span>
                              )}
                              {result === false && (
                                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                                  ❌ Incorrecto
                                </span>
                              )}
                              {result === null && hasResult && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                                  ⚠️ Empate
                                </span>
                              )}
                              {result === null && !hasResult && (
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                                  ⏳ Pendiente
                                </span>
                              )}
                            </div>
                            <p className="text-lg font-semibold text-gray-900 mb-1">
                              Tu pick: <span className="text-blue-600">{pick.team.name}</span>
                            </p>
                            {match && match.homeTeam && match.awayTeam && (
                              <>
                                {hasResult ? (
                                  <p className="text-sm text-gray-600">
                                    Resultado: <strong>{match.homeTeam.name}</strong> {match.homeGoals} - {match.awayGoals} <strong>{match.awayTeam.name}</strong>
                                    {match.homeGoals === match.awayGoals && (
                                      <span className="ml-2 text-gray-500">(Empate - Pick incorrecto)</span>
                                    )}
                                    {match.homeGoals !== match.awayGoals && (
                                      <span className="ml-2">
                                        (Ganador: <strong>{match.homeGoals! > match.awayGoals! ? match.homeTeam.name : match.awayTeam.name}</strong>)
                                      </span>
                                    )}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    ⏳ Partido: {match.homeTeam.name} vs {match.awayTeam.name} - Aún no finalizado
                                  </p>
                                )}
                              </>
                            )}
                            {!match && (
                              <p className="text-sm text-gray-500 italic">
                                ⚠️ Información del partido no disponible
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

        {/* Estadísticas de la edición */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Estadísticas de la Edición</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Total Participantes</h4>
              <p className="text-3xl font-bold text-gray-900">{edition.totalParticipants || edition.participants.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Activos</h4>
              <p className="text-3xl font-bold text-green-600">{edition.activeCount || edition.participants.filter(p => p.status === 'ACTIVE').length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-xl">❌</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Eliminados</h4>
              <p className="text-3xl font-bold text-red-600">{edition.eliminatedCount || edition.participants.filter(p => p.status === 'ELIMINATED').length}</p>
            </div>
          </div>
          
          {/* Botones de administración */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            {/* Mostrar botones si es admin O si el usuario es master (para pruebas) */}
            {/* Permitir en cualquier estado para pruebas y gestión manual */}
            {(isAdmin() || user?.email === 'master@pickandsurvive.com') && (
              <>
                <button
                  onClick={handleProcessEdition}
                  disabled={processing}
                  className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">⚽</span>
                  {processing ? 'Procesando...' : 'Procesar Resultados'}
                </button>
                <button
                  onClick={handleAdvanceMatchday}
                  disabled={advancing}
                  className="inline-flex items-center justify-center bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">➡️</span>
                  {advancing ? 'Avanzando...' : 'Siguiente Jornada'}
                </button>
                {edition?.status !== 'FINISHED' && (
                  <button
                    onClick={handleCloseEdition}
                    disabled={processing}
                    className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span className="mr-2">🏁</span>
                    {processing ? 'Cerrando...' : 'Cerrar Edición'}
                  </button>
                )}
              </>
            )}
            <Link
              href={`/editions/${editionId}/auto-status`}
              className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">🤖</span>
              Ver Estado Automático
            </Link>
          </div>
        </div>

        {/* Participantes Activos */}
        {edition.activeParticipants && edition.activeParticipants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">🏆 Participantes Activos</h3>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {edition.activeParticipants.map(p => {
                  // Solo mostrar el pick del usuario si ya ha elegido, o si es el propio usuario
                  const showPick = myPick || p.userId === user?.id;
                  
                  return (
                    <div key={p.userId} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-sm">
                              {p.user.alias?.charAt(0) || p.user.email?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.user.alias || 'Jugador Anónimo'}</p>
                            <p className="text-sm text-gray-500">{p.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            ACTIVO
                          </span>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Pick</p>
                            <p className="font-semibold text-gray-900">
                              {showPick ? (
                                p.picks[0] ? p.picks[0].team.name : 'Pendiente'
                              ) : (
                                <span className="text-gray-400 italic">Oculto</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Participantes Eliminados */}
        {edition.eliminatedParticipants && edition.eliminatedParticipants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">💀 Participantes Eliminados</h3>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {edition.eliminatedParticipants.map(p => {
                  // Solo mostrar el pick del usuario si ya ha elegido, o si es el propio usuario
                  const showPick = myPick || p.userId === user?.id;
                  
                  return (
                    <div key={p.userId} className="p-6 hover:bg-gray-50 transition-colors opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">
                              {p.user.alias?.charAt(0) || p.user.email?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-500 line-through">{p.user.alias || 'Jugador Anónimo'}</p>
                            <p className="text-sm text-gray-400">{p.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                            ELIMINADO
                          </span>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Pick</p>
                            <p className="font-semibold text-gray-500">
                              {showPick ? (
                                p.picks[0] ? p.picks[0].team.name : 'Sin pick'
                              ) : (
                                <span className="text-gray-400 italic">Oculto</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
      )}

        {/* Fallback para cuando no hay separación de participantes */}
        {(!edition.activeParticipants || !edition.eliminatedParticipants) && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard de la Edición</h3>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {edition.participants.map(p => {
                  // Solo mostrar el pick del usuario si ya ha elegido, o si es el propio usuario
                  const showPick = myPick || p.userId === user?.id;
                  
                  return (
                    <div key={p.userId} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            p.status === 'ACTIVE' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            <span className={`font-semibold text-sm ${
                              p.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {p.user.alias?.charAt(0) || p.user.email?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className={`font-semibold ${
                              p.status === 'ACTIVE' ? 'text-gray-900' : 'text-gray-500 line-through'
                            }`}>
                              {p.user.alias || 'Jugador Anónimo'}
                            </p>
                            <p className="text-sm text-gray-500">{p.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                            p.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {p.status === 'ACTIVE' ? 'ACTIVO' : 'ELIMINADO'}
                </span>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Pick</p>
                            <p className="font-semibold text-gray-900">
                              {showPick ? (
                                p.picks[0] ? p.picks[0].team.name : 'Pendiente'
                              ) : (
                                <span className="text-gray-400 italic">Oculto</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </div>
        )}
      </div>
    </div>
  );
}