'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/api';
import AchievementCard from '@/components/AchievementCard';
import { useToast } from '@/hooks/useToast';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon?: string;
  pointsReward: number;
  category: string;
  rarity: string;
  unlocked?: boolean;
  unlockedAt?: string;
}

export default function AchievementsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [myAchievements, setMyAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (token) {
      loadAchievements();
    }
  }, [token]);

  const loadAchievements = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Cargar todos los logros
      const allRes = await fetch(API_ENDPOINTS.ACHIEVEMENTS.ALL || API_ENDPOINTS.ACHIEVEMENTS.LIST, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (allRes.ok) {
        const allData = await allRes.json();
        setAllAchievements(allData);
      }

      // Cargar mis logros
      const myRes = await fetch(API_ENDPOINTS.ACHIEVEMENTS.ME, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyAchievements(myData);
      }
    } catch (error) {
      toast.error('Error al cargar logros');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAchievements = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.ACHIEVEMENTS.CHECK, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.unlocked && data.unlocked.length > 0) {
          toast.success(`¡${data.unlocked.length} logro(s) desbloqueado(s)!`);
          loadAchievements();
        } else {
          toast.info('No hay nuevos logros para desbloquear');
        }
      }
    } catch (error) {
      toast.error('Error al verificar logros');
    }
  };

  // Combinar logros con estado de desbloqueo
  const achievementsWithStatus = allAchievements.map(achievement => {
    const unlocked = myAchievements.find(ma => ma.code === achievement.code);
    return {
      ...achievement,
      unlocked: !!unlocked,
      unlockedAt: unlocked?.unlockedAt,
    };
  });

  // Filtrar logros
  const filteredAchievements = achievementsWithStatus.filter(achievement => {
    if (filter === 'unlocked' && !achievement.unlocked) return false;
    if (filter === 'locked' && achievement.unlocked) return false;
    if (categoryFilter !== 'all' && achievement.category !== categoryFilter) return false;
    return true;
  });

  const unlockedCount = achievementsWithStatus.filter(a => a.unlocked).length;
  const totalCount = achievementsWithStatus.length;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🎖️ Logros</h1>
              <p className="text-gray-300">Desbloquea logros y gana puntos adicionales</p>
            </div>
            <button
              onClick={handleCheckAchievements}
              className="btn-primary px-6 py-3"
            >
              🔍 Verificar Logros
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm text-gray-300 mb-1">Total Logros</p>
            <p className="text-2xl font-bold text-white">{totalCount}</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-gray-300 mb-1">Desbloqueados</p>
            <p className="text-2xl font-bold text-green-400">{unlockedCount}</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm text-gray-300 mb-1">Progreso</p>
            <p className="text-2xl font-bold text-blue-400">
              {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Estado</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-800/90 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="unlocked">Desbloqueados</option>
              <option value="locked">Bloqueados</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800/90 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="WINNING">Victoria</option>
              <option value="STREAK">Rachas</option>
              <option value="PARTICIPATION">Participación</option>
              <option value="SPECIAL">Especiales</option>
            </select>
          </div>
        </div>

        {/* Grid de Logros */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Cargando logros...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={achievement.unlocked}
                unlockedAt={achievement.unlockedAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

