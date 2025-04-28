import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { initializeUserAchievements, ensureAllAchievementsExist } from '../services/achievements';

// Definir el tipo para el contexto
type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshSession: () => Promise<void>;
};

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tiempo mínimo entre verificaciones de sesión (en milisegundos)
const MIN_SESSION_CHECK_INTERVAL = 60000; // 1 minuto

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Usar una referencia para rastrear la última vez que se verificó la sesión
  const lastSessionCheckRef = useRef<number>(0);

  // Función para verificar la sesión con limitación de frecuencia
  const checkSession = async (force = false) => {
    const now = Date.now();

    // Si no es forzado y ha pasado menos tiempo que el intervalo mínimo, no verificar
    if (!force && now - lastSessionCheckRef.current < MIN_SESSION_CHECK_INTERVAL) {
      return;
    }

    // Actualizar el tiempo de la última verificación
    lastSessionCheckRef.current = now;

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error al verificar la sesión:', error);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user || null);
    } catch (error) {
      console.error('Error inesperado al verificar la sesión:', error);
    }
  };

  // Función para refrescar la sesión manualmente
  const refreshSession = async () => {
    try {
      setLoading(true);
      await checkSession(true);
    } finally {
      setLoading(false);
    }
  };

  // Verificar la sesión al montar el componente
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      try {
        // Verificar la sesión inicial
        await checkSession(true);

        // Suscribirse a cambios de autenticación
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event);
            setSession(newSession);
            setUser(newSession?.user || null);

            // Actualizar el tiempo de la última verificación
            lastSessionCheckRef.current = Date.now();

            // Si el usuario inició sesión, inicializar sus logros
            if (event === 'SIGNED_IN' && newSession?.user) {
              console.log('Usuario inició sesión, inicializando logros...');
              try {
                // Asegurarse de que todos los logros predefinidos existan
                await ensureAllAchievementsExist();
                // Inicializar los logros del usuario
                await initializeUserAchievements();
              } catch (error) {
                console.error('Error al inicializar logros después de iniciar sesión:', error);
              }
            }
          }
        );

        return () => {
          // Limpiar la suscripción al desmontar
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error al inicializar la autenticación:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Funciones de autenticación
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Intentando iniciar sesión con email:', email);
      // No podemos acceder directamente a supabaseUrl, es una propiedad protegida

      // Verificar si hay una sesión activa antes de intentar iniciar sesión
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Sesión actual antes de iniciar sesión:', sessionData.session ? 'Existe' : 'No existe');

      // Intentar iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Registrar el error detalladamente en la consola
        console.error('Error al iniciar sesión:', error);
        console.error('Detalles del error:', {
          code: error.code,
          message: error.message,
          status: error.status
        });

        // Mostrar el error completo para depuración
        console.error('Error de inicio de sesión:', JSON.stringify(error));
      } else {
        console.log('Inicio de sesión exitoso. Usuario:', data.user?.email);

        // Inicializar los logros del usuario
        try {
          console.log('Inicializando logros después de inicio de sesión manual...');
          // Asegurarse de que todos los logros predefinidos existan
          await ensureAllAchievementsExist();
          // Inicializar los logros del usuario
          await initializeUserAchievements();
        } catch (error) {
          console.error('Error al inicializar logros después de inicio de sesión manual:', error);
        }
      }

      return { error };
    } catch (error) {
      // Registrar errores inesperados
      console.error('Error inesperado al iniciar sesión:', error);
      console.error('Error de autenticación:', JSON.stringify(error));
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        // Registrar el error detalladamente en la consola
        console.error('Error al registrarse:', error);
        console.error('Detalles del error:', {
          code: error.code,
          message: error.message,
          status: error.status
        });
      } else if (data.user) {
        console.log('Registro exitoso. Usuario:', data.user.email);

        // Inicializar los logros del usuario
        try {
          console.log('Inicializando logros después de registro...');
          // Asegurarse de que todos los logros predefinidos existan
          await ensureAllAchievementsExist();
          // Inicializar los logros del usuario
          await initializeUserAchievements();
        } catch (initError) {
          console.error('Error al inicializar logros después de registro:', initError);
        }
      }
      return { error };
    } catch (error) {
      // Registrar errores inesperados
      console.error('Error inesperado al registrarse:', error);
      return { error };
    }
  };

  const signOutUser = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Registrar el error detalladamente en la consola
        console.error('Error al cerrar sesión:', error);
        console.error('Detalles del error:', {
          code: error.code,
          message: error.message,
          status: error.status
        });
      }
      return { error };
    } catch (error) {
      // Registrar errores inesperados
      console.error('Error inesperado al cerrar sesión:', error);
      return { error };
    }
  };

  // Proporcionar el contexto
  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut: signOutUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }

  return context;
};
