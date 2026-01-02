'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserIndependenceChecker');

interface UserIndependenceCheckerProps {
  children: React.ReactNode;
}

export default function UserIndependenceChecker({ children }: UserIndependenceCheckerProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Solo verificar una vez cuando tengamos los datos básicos del usuario
    if (isAuthenticated && user && !hasChecked) {
      setHasChecked(true);
      
      // Por ahora, permitir acceso a todas las páginas sin verificar ligas
      // Esto evita el problema de redirección infinita
      // TODO: Implementar verificación de ligas de forma más robusta
      logger.info(`Usuario autenticado: ${user.email}`);
    }
  }, [isAuthenticated, user, hasChecked]);

  // Mostrar loading solo si estamos verificando autenticación
  if (!hasChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
