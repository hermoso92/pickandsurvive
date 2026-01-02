'use client';

import UserAvatar from './UserAvatar';

interface RankingUser {
  id: string;
  email: string;
  alias?: string;
  selectedLogo?: {
    id: string;
    code: string;
    name: string;
    imageUrl?: string;
  } | null;
}

interface RankingEntry {
  position: number;
  user: RankingUser;
  totalPoints?: number;
  points?: number;
  correctPicks?: number;
  totalPicks?: number;
  status?: string;
  topAchievements?: Array<{
    code: string;
    name: string;
    icon?: string;
    rarity: string;
  }>;
}

interface RankingTableProps {
  data: RankingEntry[];
  showAchievements?: boolean;
  highlightUserId?: string;
}

export default function RankingTable({ data, showAchievements = false, highlightUserId }: RankingTableProps) {
  const getMedal = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">Posición</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Usuario</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Puntos</th>
              {showAchievements && (
                <th className="px-6 py-4 text-left text-sm font-semibold">Logros</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.map((entry) => {
              const isHighlighted = entry.user.id === highlightUserId;
              const medal = getMedal(entry.position);
              
              return (
                <tr
                  key={entry.user.id}
                  className={`
                    transition-colors
                    ${isHighlighted ? 'bg-yellow-900/30 border-l-4 border-yellow-500' : 'hover:bg-gray-800/50'}
                  `}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {medal && <span className="text-2xl">{medal}</span>}
                      <span className={`font-bold ${isHighlighted ? 'text-yellow-400' : 'text-white'}`}>
                        #{entry.position}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <UserAvatar user={entry.user} size="md" />
                      <div>
                        <p className="font-semibold text-white">
                          {entry.user.alias || entry.user.email}
                        </p>
                        {entry.user.alias && (
                          <p className="text-xs text-gray-400">{entry.user.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-blue-400">
                        {entry.totalPoints ?? entry.points ?? 0}
                      </span>
                      {entry.correctPicks !== undefined && (
                        <>
                          <p className="text-xs text-gray-400">
                            {entry.correctPicks}/{entry.totalPicks} correctos
                          </p>
                          {/* Mostrar aviso si hay picks correctos pero 0 puntos (resultados no procesados) */}
                          {(entry.totalPoints ?? entry.points ?? 0) === 0 && entry.correctPicks > 0 && (
                            <p className="text-xs text-amber-400 font-medium mt-1" title="Los puntos se otorgan al procesar los resultados de la jornada">
                              ⏳ Pendiente procesar
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  {showAchievements && entry.topAchievements && (
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {entry.topAchievements.slice(0, 3).map((achievement, idx) => (
                          <span key={idx} className="text-2xl" title={achievement.name}>
                            {achievement.icon || '🏆'}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

