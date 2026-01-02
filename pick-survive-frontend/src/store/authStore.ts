import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Definimos la "forma" que tendrán los datos en nuestro cerebro
interface AuthState {
  token: string | null;
  user: { id: string; email: string; alias: string | null; balanceCents?: number } | null;
  isAuthenticated: boolean;
  login: (token: string, userData?: any) => void;
  logout: () => void;
  setUser: (user: any) => void;
  clearAuth: () => void;
}

// Creamos el store con Zustand
export const useAuthStore = create<AuthState>()(
  // 1. Usamos el middleware 'persist' para guardar en localStorage
  persist(
    // 2. La función 'set' es como Zustand actualiza el estado
    (set) => ({
      // --- ESTADO INICIAL ---
      token: null,
      user: null,
      isAuthenticated: false,

      // --- ACCIONES (las funciones que modifican el estado) ---
      
      // Acción para cuando el usuario inicia sesión
      login: (token, userData) => {
        set({
          token: token,
          user: userData || null,
          isAuthenticated: true,
        });
      },
      
      // Acción para cuando el usuario cierra sesión
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
        // Limpiar también el localStorage
        localStorage.removeItem('auth-storage');
      },

      // Acción para guardar los datos del perfil del usuario
      setUser: (userData) => {
        set({ user: userData });
      },

      // Acción para limpiar completamente la autenticación
      clearAuth: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      // 3. Configuración de la persistencia
      name: 'auth-storage', // Nombre de la clave en localStorage
    }
  )
);