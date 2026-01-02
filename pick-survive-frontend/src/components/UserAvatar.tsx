'use client';

import { getUserLogo } from '@/utils/logoHelper';

interface UserAvatarProps {
  user: any;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const logo = getUserLogo(user);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  if (logo.type === 'image') {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center ${className}`}>
        <img 
          src={logo.value} 
          alt={user?.alias || user?.email || 'Usuario'} 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Si es emoji de logo o inicial
  const isLogoEmoji = ['⚪', '🔵', '🟢', '🟡', '🟣', '🔴', '🎨'].includes(logo.value);
  
  return (
    <div className={`
      ${sizeClasses[size]} 
      ${isLogoEmoji 
        ? 'bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg' 
        : 'bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg'
      }
      ${className}
    `}>
      <span className={`${isLogoEmoji ? 'text-2xl' : 'text-white font-semibold'}`}>
        {logo.value}
      </span>
    </div>
  );
}

