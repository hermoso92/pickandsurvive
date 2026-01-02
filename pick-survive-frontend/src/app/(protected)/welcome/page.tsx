'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues } from '@/hooks/useLeagues';

export default function WelcomePage() {
  const { user } = useAuth();
  const { leagues, loading } = useLeagues();
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!loading && leagues) {
      // Un usuario es nuevo si no tiene ligas o solo tiene ligas que él mismo creó
      const hasInvitedLeagues = leagues.some(league => {
        const userRole = league.members.find(m => m.userId === user?.id)?.role;
        return userRole !== 'OWNER';
      });
      
      setIsNewUser(!hasInvitedLeagues && leagues.length === 0);
    }
  }, [leagues, loading, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-white">🏆</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            ¡Bienvenido a Pick & Survive!
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            El juego de supervivencia futbolística donde cada pick cuenta
          </p>
        </div>

        {/* Estado del usuario */}
        {isNewUser ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-green-600">🆕</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Eres un usuario nuevo!</h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Como usuario nuevo, puedes crear tu propia liga privada e invitar a tus amigos. 
                Las ligas privadas requieren invitación, así que necesitarás que alguien te invite 
                para unirte a una liga existente.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">💡 ¿Cómo empezar?</h3>
                <ul className="text-left text-blue-800 space-y-1">
                  <li>• Crea tu primera liga privada</li>
                  <li>• Invita a tus amigos por email</li>
                  <li>• Configura las reglas de tu liga</li>
                  <li>• ¡Comienza a jugar!</li>
                </ul>
              </div>

              <Link
                href="/leagues/create"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🚀 Crear Mi Primera Liga
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-blue-600">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Ya formas parte de ligas!</h2>
              <p className="text-gray-600 mb-6">
                Tienes acceso a {leagues?.length || 0} liga(s) donde puedes participar en ediciones.
              </p>
              
              <Link
                href="/leagues"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🏆 Ver Mis Ligas
              </Link>
            </div>
          </div>
        )}

        {/* Información sobre el sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Ligas Privadas</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Solo puedes unirte a ligas donde hayas sido invitado. Cada liga tiene sus propias 
              reglas y configuración.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Picks Ocultos</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Los picks de otros jugadores permanecen ocultos hasta que hayas hecho tu elección. 
              Esto mantiene la competencia justa.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sistema Contable</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Cada movimiento de dinero se registra de forma inmutable. Tu saldo se calcula 
              automáticamente basado en tus transacciones.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Configuración Flexible</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Cada liga puede tener sus propias reglas: cuotas de entrada, esquemas de premios, 
              modos de juego y más.
            </p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Acciones Rápidas</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/leagues/create"
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              ➕ Crear Liga
            </Link>
            <Link
              href="/leagues"
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🏆 Mis Ligas
            </Link>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              📊 Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
