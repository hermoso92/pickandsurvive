'use client';

import { useAuth } from '@/hooks/useAuth';
import ClearAuthButton from './ClearAuthButton';

export default function AuthDebug() {
  const { token, user, isAuthenticated } = useAuth();

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-4 text-sm">
      <h3 className="text-lg font-semibold text-yellow-400 mb-2">🔍 Debug de Autenticación</h3>
      <div className="space-y-1 text-gray-300">
        <p><span className="font-medium">Autenticado:</span> {isAuthenticated ? '✅ Sí' : '❌ No'}</p>
        <p><span className="font-medium">Token:</span> {token ? `✅ ${token.substring(0, 20)}...` : '❌ No hay token'}</p>
        <p><span className="font-medium">Usuario:</span> {user ? `✅ ${user.email}` : '❌ No hay usuario'}</p>
        <p><span className="font-medium">ID Usuario:</span> {user?.id || 'N/A'}</p>
        <p><span className="font-medium">Alias:</span> {user?.alias || 'N/A'}</p>
      </div>
      <div className="mt-4">
        <ClearAuthButton />
      </div>
    </div>
  );
}
