'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';
import PointBadge from '@/components/PointBadge';
import AchievementCard from '@/components/AchievementCard';
import { useToast } from '@/hooks/useToast';

export default function ProfilePage() {
  const { token, user } = useAuth();
  const toast = useToast();
  const [userPoints, setUserPoints] = useState(0);
  const [userCoins, setUserCoins] = useState(0);
  const [pointsStats, setPointsStats] = useState<any>(null);
  const [coinsStats, setCoinsStats] = useState<any>(null);
  const [myRank, setMyRank] = useState<any>(null);
  const [myAchievements, setMyAchievements] = useState<any[]>([]);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadProfileData();
    }
  }, [token]);

  const loadProfileData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Cargar puntos
      const pointsRes = await fetch(API_ENDPOINTS.POINTS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (pointsRes.ok) {
        const pointsData = await pointsRes.json();
        setUserPoints(pointsData.totalPoints || 0);
        setPointsStats(pointsData.stats);
      }

      // Cargar monedas
      const coinsRes = await fetch(API_ENDPOINTS.COINS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (coinsRes.ok) {
        const coinsData = await coinsRes.json();
        setUserCoins(coinsData.totalCoins || 0);
        setCoinsStats(coinsData.stats);
      }

      // Cargar posición global
      const rankRes = await fetch(`${API_ENDPOINTS.RANKINGS.ME}?scope=global`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setMyRank(rankData);
      }

      // Cargar logros
      const achievementsRes = await fetch(API_ENDPOINTS.ACHIEVEMENTS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setMyAchievements(achievementsData);
      }

      // Cargar items comprados
      const itemsRes = await fetch(API_ENDPOINTS.SHOP.MY_ITEMS, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setMyItems(itemsData);
      }

      // Cargar historial de puntos
      const historyRes = await fetch(API_ENDPOINTS.POINTS.HISTORY, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setPointHistory(historyData);
      }

      // Cargar historial de monedas
      const coinHistoryRes = await fetch(API_ENDPOINTS.COINS.HISTORY, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (coinHistoryRes.ok) {
        const coinHistoryData = await coinHistoryRes.json();
        setCoinHistory(coinHistoryData);
      }
    } catch (error) {
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">👤 Mi Perfil</h1>
          <p className="text-gray-300">Estadísticas y configuración de tu cuenta</p>
        </div>

        {/* Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">⭐</div>
            <p className="text-sm opacity-90 mb-1">Puntos Totales</p>
            <p className="text-3xl font-bold">{userPoints}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">🪙</div>
            <p className="text-sm opacity-90 mb-1">Monedas</p>
            <p className="text-3xl font-bold">{userCoins}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm opacity-90 mb-1">Posición Global</p>
            <p className="text-3xl font-bold">#{myRank?.position || 'N/A'}</p>
          </div>
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">🎖️</div>
            <p className="text-sm opacity-90 mb-1">Logros</p>
            <p className="text-3xl font-bold">{myAchievements.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl mb-2">🛒</div>
            <p className="text-sm opacity-90 mb-1">Items Comprados</p>
            <p className="text-3xl font-bold">{myItems.length}</p>
          </div>
        </div>

        {/* Logros Recientes */}
        {myAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Logros Desbloqueados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myAchievements.slice(0, 8).map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={true}
                  unlockedAt={achievement.unlockedAt}
                />
              ))}
            </div>
          </div>
        )}

        {/* Historial de Monedas */}
        {coinHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Historial de Monedas</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Monedas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {coinHistory.slice(0, 20).map((transaction: any) => (
                      <tr key={transaction.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(transaction.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {transaction.type === 'MATCHDAY_WIN' && '⚽ Jornada Ganada'}
                          {transaction.type === 'SHOP_PURCHASE' && '🛒 Compra en Tienda'}
                          {transaction.type === 'BONUS' && '🎁 Bonus'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                          transaction.coins > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.coins > 0 ? '+' : ''}{transaction.coins}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {transaction.edition?.name || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Puntos */}
        {pointHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Historial de Puntos</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Puntos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {pointHistory.slice(0, 20).map((transaction: any) => (
                      <tr key={transaction.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(transaction.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {transaction.type === 'MATCHDAY_WIN' && '⚽ Jornada Ganada'}
                          {transaction.type === 'ACHIEVEMENT_UNLOCK' && '🏆 Logro Desbloqueado'}
                          {transaction.type === 'SHOP_PURCHASE' && '🛒 Compra en Tienda'}
                          {transaction.type === 'BONUS' && '🎁 Bonus'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                          transaction.points > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {transaction.edition?.name || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

