'use client';

import { useAuth } from '@/hooks/useAuth';
import LogoutButton from './LogoutButton';

export default function UserInfo() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-white mb-2">Usuario Actual</h3>
      <div className="space-y-2">
        <p className="text-gray-300">
          <span className="font-medium">Email:</span> {user.email}
        </p>
        <p className="text-gray-300">
          <span className="font-medium">Alias:</span> {user.alias || 'Sin alias'}
        </p>
        <p className="text-gray-300">
          <span className="font-medium">ID:</span> {user.id}
        </p>
        {user.balanceCents !== undefined && (
          <p className="text-gray-300">
            <span className="font-medium">Saldo:</span> {(user.balanceCents / 100).toFixed(2)}€
          </p>
        )}
      </div>
      <div className="mt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
