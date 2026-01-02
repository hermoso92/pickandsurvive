import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from '@/config/api';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAuth');

export const useAuth = () => {
  const { token, user, isAuthenticated, login, logout, setUser, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const handleLogin = async (token: string) => {
    try {
      logger.debug(`Obteniendo perfil del usuario con token: ${token.substring(0, 20)}...`);
      
      // Obtener información del usuario usando el token
      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      logger.debug(`Respuesta del perfil: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const userData = await response.json();
        logger.info('Datos del usuario obtenidos correctamente');
        login(token, userData);
      } else {
        const errorText = await response.text();
        logger.error(`Error al obtener perfil: ${response.status}`, new Error(errorText));
        login(token);
      }
    } catch (error) {
      logger.error('Error al obtener perfil del usuario', error);
      login(token);
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    setUser,
    clearAuth,
  };
};
