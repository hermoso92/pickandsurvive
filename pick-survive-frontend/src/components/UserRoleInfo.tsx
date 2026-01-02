'use client';

import { useAuth } from '@/hooks/useAuth';
import { useLeagues } from '@/hooks/useLeagues';

interface UserRoleInfoProps {
  leagueId?: string;
  className?: string;
}

export default function UserRoleInfo({ leagueId, className = '' }: UserRoleInfoProps) {
  const { user } = useAuth();
  const { leagues } = useLeagues();

  if (!user || !leagues) {
    return null;
  }

  // Si se especifica una liga, mostrar el rol en esa liga
  if (leagueId) {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return null;

    const membership = league.members.find(m => m.userId === user.id);
    const role = membership?.role || 'PLAYER';

    const getRoleInfo = (role: string) => {
      switch (role) {
        case 'OWNER':
          return {
            text: 'Propietario',
            icon: '👑',
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
          };
        case 'ADMIN':
          return {
            text: 'Administrador',
            icon: '⚙️',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
          };
        case 'PLAYER':
        default:
          return {
            text: 'Jugador',
            icon: '🎮',
            color: 'text-green-600',
            bgColor: 'bg-green-100',
          };
      }
    };

    const roleInfo = getRoleInfo(role);

    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <span className="text-lg">{roleInfo.icon}</span>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleInfo.bgColor} ${roleInfo.color}`}>
          {roleInfo.text}
        </span>
      </div>
    );
  }

  // Mostrar resumen de roles en todas las ligas
  const roleCounts = leagues.reduce((acc, league) => {
    const membership = league.members.find(m => m.userId === user.id);
    const role = membership?.role || 'PLAYER';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalLeagues = leagues.length;
  const ownedLeagues = roleCounts.OWNER || 0;
  const adminLeagues = roleCounts.ADMIN || 0;
  const playerLeagues = roleCounts.PLAYER || 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700">Roles en Ligas</div>
      <div className="flex flex-wrap gap-2">
        {ownedLeagues > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-sm">👑</span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
              {ownedLeagues} Propietario{ownedLeagues > 1 ? 's' : ''}
            </span>
          </div>
        )}
        {adminLeagues > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-sm">⚙️</span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              {adminLeagues} Admin{adminLeagues > 1 ? 's' : ''}
            </span>
          </div>
        )}
        {playerLeagues > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-sm">🎮</span>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              {playerLeagues} Jugador{playerLeagues > 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Total: {totalLeagues} liga{totalLeagues !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// Componente para mostrar permisos específicos
interface UserPermissionsProps {
  leagueId: string;
  action: 'create_edition' | 'invite_members' | 'manage_league' | 'view_ledger';
  className?: string;
}

export function UserPermissions({ leagueId, action, className = '' }: UserPermissionsProps) {
  const { user } = useAuth();
  const { leagues } = useLeagues();

  if (!user || !leagues) {
    return null;
  }

  const league = leagues.find(l => l.id === leagueId);
  if (!league) return null;

  const membership = league.members.find(m => m.userId === user.id);
  const role = membership?.role || 'PLAYER';

  const hasPermission = () => {
    switch (action) {
      case 'create_edition':
      case 'invite_members':
      case 'manage_league':
      case 'view_ledger':
        return role === 'OWNER' || role === 'ADMIN';
      default:
        return false;
    }
  };

  if (!hasPermission()) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <span className="text-red-500">🚫</span> Sin permisos para esta acción
      </div>
    );
  }

  return (
    <div className={`text-sm text-green-600 ${className}`}>
      <span className="text-green-500">✅</span> Tienes permisos para esta acción
    </div>
  );
}
