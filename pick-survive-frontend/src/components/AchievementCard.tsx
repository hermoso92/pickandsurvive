'use client';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon?: string;
  pointsReward: number;
  category: string;
  rarity: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  unlocked?: boolean;
  unlockedAt?: string;
}

export default function AchievementCard({ achievement, unlocked = false, unlockedAt }: AchievementCardProps) {
  const rarityColors = {
    COMMON: 'from-gray-400 to-gray-500',
    RARE: 'from-blue-400 to-blue-600',
    EPIC: 'from-purple-400 to-purple-600',
    LEGENDARY: 'from-yellow-400 to-orange-500',
  };

  const rarityBorder = {
    COMMON: 'border-gray-300',
    RARE: 'border-blue-300',
    EPIC: 'border-purple-300',
    LEGENDARY: 'border-yellow-300',
  };

  return (
    <div className={`
      relative p-6 rounded-xl border-2 transition-all duration-300
      ${unlocked 
        ? `bg-gradient-to-br ${rarityColors[achievement.rarity as keyof typeof rarityColors]} text-white shadow-lg ${rarityBorder[achievement.rarity as keyof typeof rarityBorder]}`
        : 'bg-gray-100 border-gray-200 text-gray-500 opacity-60'
      }
      hover:scale-105 hover:shadow-xl
    `}>
      {unlocked && (
        <div className="absolute top-2 right-2">
          <span className="text-2xl">✅</span>
        </div>
      )}
      
      <div className="text-center">
        <div className="text-6xl mb-4">
          {achievement.icon || '🏆'}
        </div>
        <h3 className="text-xl font-bold mb-2">{achievement.name}</h3>
        <p className="text-sm mb-4 opacity-90">{achievement.description}</p>
        
        <div className="flex items-center justify-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            unlocked ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {achievement.rarity}
          </span>
          {achievement.pointsReward > 0 && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              unlocked ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              +{achievement.pointsReward} pts
            </span>
          )}
        </div>

        {unlocked && unlockedAt && (
          <p className="text-xs mt-4 opacity-75">
            Desbloqueado: {new Date(unlockedAt).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>
    </div>
  );
}

