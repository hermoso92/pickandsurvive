'use client';

import { useAuth } from '@/hooks/useAuth';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function LogoutButton({ className = '', children = 'Cerrar Sesión' }: LogoutButtonProps) {
  const { logout } = useAuth();

  return (
    <button 
      onClick={logout}
      className={`px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
