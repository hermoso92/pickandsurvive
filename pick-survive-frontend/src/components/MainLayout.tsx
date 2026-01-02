'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLeagues } from '@/hooks/useLeagues';
import { usePoints } from '@/hooks/usePoints';
import { API_ENDPOINTS } from '@/config/api';
import LogoutButton from '@/components/LogoutButton';
import UserAvatar from '@/components/UserAvatar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Navegación administrativa (solo visible en sidebar para móvil o usuarios admin)
  const adminNavigation = [
    { name: 'Administración', href: '/admin', icon: '⚙️' },
    { name: 'Datos de Fútbol', href: '/football-admin', icon: '⚽' },
    { name: 'Modo Test', href: '/test', icon: '🧪' },
  ];

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - Solo para móvil o navegación administrativa */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 via-blue-900 to-purple-900 transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:hidden
      `}>
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">PS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Pick & Survive</h1>
                <p className="text-blue-200 text-xs">Fútbol Fantasy</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navegación administrativa */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                        ${isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer del sidebar */}
          <div className="p-6 border-t border-white/10">
            <LogoutButton className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl" />
          </div>
        </div>
      </div>
    </>
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeEditionId, setActiveEditionId] = useState<string | null>(null);
  const pathname = usePathname();
  const { user, token } = useAuth();
  const { leagues } = useLeagues();
  const { pointsData, loading: pointsLoading, fetchPoints } = usePoints(activeEditionId);
  const fetchPointsRef = useRef(fetchPoints);
  
  // Mantener referencia actualizada de fetchPoints
  useEffect(() => {
    fetchPointsRef.current = fetchPoints;
  }, [fetchPoints]);

  // Navegación principal según diseño esperado
  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Mi Liga', href: '/leagues', icon: '🏆' },
    { name: 'Ediciones', href: '/editions', icon: '📅' },
    { name: 'Clasificación', href: '/rankings', icon: '📊' },
    { name: 'Logros', href: '/achievements', icon: '🎖️' },
    { name: 'Tienda', href: '/shop', icon: '🛒' },
    { name: 'Estadísticas', href: '/statistics', icon: '📈' },
  ];

  // Contador de notificaciones (placeholder - se implementará después)
  const notificationCount = 2;

  // Cargar edición activa
  useEffect(() => {
    const loadActiveEdition = async () => {
      if (!token || !leagues || leagues.length === 0) return;

      try {
        // Usar la primera liga para buscar edición activa
        const firstLeague = leagues[0];
        const editionsRes = await fetch(API_ENDPOINTS.LEAGUES.EDITIONS(firstLeague.id), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (editionsRes.ok) {
          const editions = await editionsRes.json();
          // Buscar edición activa (OPEN o IN_PROGRESS)
          const active = editions.find((e: any) => e.status === 'OPEN' || e.status === 'IN_PROGRESS');
          if (active) {
            setActiveEditionId(active.id);
          } else {
            setActiveEditionId(null);
          }
        }
      } catch (error) {
        // Silently fail
      }
    };

    if (token && leagues && leagues.length > 0) {
      loadActiveEdition();
    }
  }, [token, leagues]);

  // Actualizar puntos periódicamente
  useEffect(() => {
    if (!token) return;

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      fetchPointsRef.current();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header superior principal - Tema Oscuro Mejorado */}
      <header className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-b-2 border-green-500/30 text-white shadow-2xl z-30 relative backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5"></div>
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between h-20">
            {/* Logo y nombre */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3 group">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/50 to-transparent animate-shimmer"></div>
                  <span className="text-white font-bold text-xl relative z-10">🏆</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">Pick & Survive</h1>
                  <p className="text-xs text-green-400 font-medium">Fútbol Fantasy</p>
                </div>
              </Link>
            </div>

            {/* Navegación principal - Desktop */}
            <nav className="hidden md:flex items-center space-x-2">
              {mainNavigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === '/leagues' && pathname?.startsWith('/leagues')) ||
                  (item.href === '/editions' && pathname?.startsWith('/editions'));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      px-3 py-2 rounded-xl transition-all duration-300 font-semibold text-sm relative overflow-hidden group
                      ${isActive 
                        ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white shadow-2xl shadow-green-500/50 scale-105' 
                        : 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-800/80 hover:to-gray-700/80 hover:text-white hover:shadow-lg hover:scale-105 border border-gray-600/30'
                      }
                    `}
                  >
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-emerald-400/30"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-400"></div>
                      </>
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Información del usuario y acciones - Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Puntos */}
              <div className="flex flex-col items-end space-y-1 px-5 py-3 bg-gradient-to-r from-gray-800/90 via-gray-900/90 to-gray-800/90 rounded-xl border-2 border-yellow-500/40 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex items-center space-x-2">
                  <span className="text-sm text-gray-200 font-semibold">⭐ Puntos:</span>
                  <span className="font-bold text-yellow-400 text-lg drop-shadow-lg">
                    {pointsLoading ? '...' : pointsData.totalPoints}
                  </span>
                </div>
                {activeEditionId && pointsData.editionPoints > 0 && (
                  <div className="relative z-10 flex items-center space-x-1">
                    <span className="text-xs text-gray-400">
                      {pointsData.activeEditionName ? `${pointsData.activeEditionName}: ` : 'Edición: '}
                    </span>
                    <span className="text-xs font-semibold text-yellow-300">
                      {pointsData.editionPoints} pts
                    </span>
                  </div>
                )}
              </div>

              {/* Notificaciones */}
              <button className="relative p-3 hover:bg-gray-800/80 rounded-xl transition-all duration-300 group border border-gray-600/30 hover:border-green-500/50">
                <svg className="w-6 h-6 text-gray-300 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Menú de usuario */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-800/80 rounded-xl transition-all duration-300 border border-gray-600/30 hover:border-green-500/50 group"
                >
                  <div className="relative">
                    <UserAvatar user={user} size="sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                  </div>
                  <span className="font-semibold text-gray-100 group-hover:text-white transition-colors">{user?.alias || user?.email || 'Usuario'}</span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 group-hover:text-green-400 transition-all ${userMenuOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown del menú de usuario */}
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl z-20 border-2 border-gray-600/50 backdrop-blur-xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
                      <div className="relative py-2">
                        <Link
                          href="/profile"
                          className="block px-4 py-3 text-sm text-gray-100 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-blue-500/20 transition-all duration-200 font-medium flex items-center gap-2"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg">👤</span>
                          <span>Mi Perfil</span>
                        </Link>
                        <Link
                          href="/ledger"
                          className="block px-4 py-3 text-sm text-gray-100 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-blue-500/20 transition-all duration-200 font-medium flex items-center gap-2"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg">💰</span>
                          <span>Historial</span>
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-3 text-sm text-gray-100 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-blue-500/20 transition-all duration-200 font-medium flex items-center gap-2"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg">⚙️</span>
                          <span>Configuración</span>
                        </Link>
                        <div className="border-t border-gray-600/50 my-2 mx-2" />
                        <Link
                          href="/leagues"
                          className="block px-4 py-3 text-sm text-gray-100 hover:bg-gradient-to-r hover:from-green-500/20 hover:to-blue-500/20 transition-all duration-200 font-medium flex items-center gap-2"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <span className="text-lg">🏆</span>
                          <span>Mis Ligas</span>
                        </Link>
                        <div className="border-t border-gray-600/50 my-2 mx-2" />
                        <div className="px-4 py-2">
                          <LogoutButton className="w-full text-left text-sm text-red-400 hover:text-red-300 font-medium transition-colors" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Botón menú móvil */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar móvil */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="min-h-full bg-particles relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-800/20 to-gray-900/40 pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
