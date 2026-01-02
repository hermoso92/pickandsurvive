'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/MainLayout';
import UserIndependenceChecker from '@/components/UserIndependenceChecker';
import ToastContainer from '@/components/ToastContainer';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token, user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.push('/login');
    }
  }, [isClient, isAuthenticated, router]);

  // No mostramos nada hasta que la verificación esté completa
  if (!isClient || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si todo está bien, mostramos la página con el layout principal y verificador de independencia
  return (
    <UserIndependenceChecker>
      <MainLayout>{children}</MainLayout>
      <ToastContainer />
    </UserIndependenceChecker>
  );
}