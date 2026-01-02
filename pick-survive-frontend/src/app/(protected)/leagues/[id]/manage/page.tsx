'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues, League } from '@/hooks/useLeagues';
import { API_ENDPOINTS } from '@/config/api';
import { createLogger } from '@/utils/logger';

const logger = createLogger('LeagueManage');

export default function LeagueManagePage() {
  const params = useParams();
  const leagueId = params.id as string;
  const { user, token } = useAuth();
  const { getLeagueById, inviteUser } = useLeagues();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingInviteCode, setLoadingInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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

  const loadInviteCode = async () => {
    if (!leagueId || !user || !token) return;
    
    try {
      setLoadingInviteCode(true);

      const res = await fetch(`${API_ENDPOINTS.LEAGUES.DETAIL(leagueId)}/invite-code`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.inviteCode);
      }
    } catch (err) {
      logger.error('Error cargando código de invitación', err);
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteCode) return;

    const inviteLink = `${window.location.origin}/leagues/join?code=${inviteCode}`;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (leagueId && isAdmin()) {
      loadInviteCode();
    }
  }, [leagueId]);

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

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">No tienes permisos para gestionar esta liga.</p>
          <Link
            href={`/leagues/${leagueId}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver a la Liga
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">Gestionar Liga</h1>
              <p className="text-gray-600 text-lg">{league.name}</p>
            </div>
            <div className="flex space-x-4">
              <Link
                href={`/leagues/${leagueId}`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Volver a la Liga
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invitar Usuarios */}
          <div className="card-gradient hover-lift p-8">
            <h2 className="text-2xl font-bold text-gradient mb-6">Invitar Usuarios</h2>
            
            {loadingInviteCode ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Generando enlace de invitación...</p>
              </div>
            ) : inviteCode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enlace de invitación
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/leagues/join?code=${inviteCode}`}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 whitespace-nowrap"
                    >
                      {copied ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Información</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Comparte este enlace con los jugadores que quieras invitar</li>
                    <li>• Deben tener una cuenta en la plataforma</li>
                    <li>• Al hacer clic en el enlace se unirán automáticamente a la liga</li>
                    <li>• El enlace no expira</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Error al cargar el enlace de invitación</p>
                <button
                  onClick={loadInviteCode}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>

          {/* Miembros Actuales */}
          <div className="card-gradient hover-lift p-8">
            <h2 className="text-2xl font-bold text-gradient mb-6">Miembros Actuales</h2>
            
            <div className="space-y-4">
              {league.members.map((member: any) => (
                <div key={member.userId} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {member.user.alias || member.user.email}
                    </h3>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {member.role === 'OWNER' ? 'Propietario' :
                       member.role === 'ADMIN' ? 'Admin' : 'Jugador'}
                    </span>
                    {member.userId === user?.id && (
                      <span className="text-xs text-gray-500">(Tú)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">📊 Estadísticas</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total miembros:</span>
                  <span className="font-semibold ml-2">{league.members.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ediciones:</span>
                  <span className="font-semibold ml-2">{league.editions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Adicionales */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gradient mb-6">Otras Acciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isOwner() && (
              <Link href={`/leagues/${leagueId}/editions/create`} className="group">
                <div className="card-gradient hover-lift p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gradient mb-2">Crear Edición</h3>
                      <p className="text-gray-600 text-sm">Iniciar una nueva edición de la liga</p>
                    </div>
                    <div className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">🏆</div>
                  </div>
                </div>
              </Link>
            )}

            <Link href={`/leagues/${leagueId}/ledger`} className="group">
              <div className="card-gradient hover-lift p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gradient mb-2">Ver Ledger</h3>
                    <p className="text-gray-600 text-sm">Historial de transacciones</p>
                  </div>
                  <div className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">📊</div>
                </div>
              </div>
            </Link>

            <Link href={`/leagues/${leagueId}/settings`} className="group">
              <div className="card-gradient hover-lift p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gradient mb-2">Configuración</h3>
                    <p className="text-gray-600 text-sm">Ajustar reglas y configuración de la liga</p>
                  </div>
                  <div className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity">⚙️</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
