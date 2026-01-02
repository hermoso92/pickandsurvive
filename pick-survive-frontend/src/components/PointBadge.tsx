'use client';

interface PointBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function PointBadge({ points, size = 'md', showLabel = false }: PointBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  return (
    <div className={`inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full font-bold shadow-lg ${sizeClasses[size]}`}>
      <span>⭐</span>
      <span>{points}</span>
      {showLabel && <span className="ml-1">PTS</span>}
    </div>
  );
}

