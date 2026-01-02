'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues } from '@/hooks/useLeagues';

export default function JoinLeaguePage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const { acceptInvite } = useLeagues();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Si no está autenticado, redirigir al login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Si está autenticado, procesar la invitación automáticamente
    if (isAuthenticated && user) {
      handleAcceptInvite();
    }
  }, [isAuthenticated, user]);

  const handleAcceptInvite = async () => {
    try {
      setLoading(true);
      setError('');

      // Obtener el token o código de la URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const code = urlParams.get('code');

      if (!token && !code) {
        setError('Token o código de invitación no válido');
        return;
      }

      // Usar el hook que ahora acepta código o token
      const league = await acceptInvite(token || code || '', code ? 'code' : 'token');
      setSuccess(true);
      
      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Error al aceptar la invitación');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="card-gradient hover-lift p-8">
          <div className="text-center">
            {loading && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Procesando Invitación</h1>
                <p className="text-gray-600">Uniéndote a la liga...</p>
              </>
            )}

            {success && (
              <>
                <div className="text-green-500 text-6xl mb-6">✅</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Bienvenido a la Liga!</h1>
                <p className="text-gray-600 mb-6">
                  Te has unido exitosamente a la liga. Serás redirigido al dashboard en unos segundos.
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </>
            )}

            {error && (
              <>
                <div className="text-red-500 text-6xl mb-6">❌</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Error al Unirse</h1>
                <p className="text-red-600 mb-6">{error}</p>
                <div className="space-y-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ir al Dashboard
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
