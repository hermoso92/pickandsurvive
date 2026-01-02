'use client';

import { useAuth } from '@/hooks/useAuth';

export default function ClearAuthButton() {
  const { clearAuth } = useAuth();

  const handleClearAuth = () => {
    if (confirm('¿Estás seguro de que quieres limpiar completamente la autenticación? Esto te cerrará la sesión.')) {
      clearAuth();
      window.location.href = '/login';
    }
  };

  return (
    <button 
      onClick={handleClearAuth}
      className="px-4 py-2 bg-red-800 rounded hover:bg-red-900 transition-colors text-sm"
    >
      🗑️ Limpiar Autenticación
    </button>
  );
}
