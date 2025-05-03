import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { initializeUserAchievements, ensureAllAchievementsExist } from '../services/achievements';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Tiempo de expiración de la sesión (en milisegundos)
const SESSION_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 días

// Clave para almacenar la fecha de la última sesión
const LAST_SESSION_KEY = 'last_session_timestamp';

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
      // Obtener la sesión actual
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error al verificar la sesión:', error);
        return;
      }

      // Si hay una sesión activa
      if (data.session) {
        console.log('Sesión activa encontrada');

        // Guardar la marca de tiempo de la sesión actual
        await AsyncStorage.setItem(LAST_SESSION_KEY, now.toString());

        // Verificar si el token está por expirar (menos de 1 día para expirar)
        const expiresAt = data.session.expires_at ? data.session.expires_at * 1000 : 0;
        const timeToExpiry = expiresAt - now;

        // Si el token expira en menos de 1 día, refrescarlo
        if (timeToExpiry < 24 * 60 * 60 * 1000) {
          console.log('Token cerca de expirar, refrescando...');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
              console.error('Error al refrescar el token:', refreshError);
            } else if (refreshData.session) {
              console.log('Token refrescado correctamente');
              setSession(refreshData.session);
              setUser(refreshData.session.user);
              return;
            }
          } catch (refreshError) {
            console.error('Error inesperado al refrescar el token:', refreshError);
          }
        }
      } else {
        console.log('No se encontró sesión activa');

        // Verificar si hay una marca de tiempo de la última sesión
        const lastSessionStr = await AsyncStorage.getItem(LAST_SESSION_KEY);

        // Variable para controlar si ya se intentó recuperar la sesión
        const sessionRecoveryAttempted = await AsyncStorage.getItem('session_recovery_attempted');

        // Si ya se intentó recuperar la sesión y falló, no intentar de nuevo
        if (sessionRecoveryAttempted === 'true') {
          console.log('Ya se intentó recuperar la sesión anteriormente sin éxito, no se intentará de nuevo');
          // Limpiar la marca de tiempo de la última sesión para evitar futuros intentos
          await AsyncStorage.removeItem(LAST_SESSION_KEY);
          return;
        }

        if (lastSessionStr) {
          const lastSession = parseInt(lastSessionStr, 10);

          // Si la última sesión fue hace menos de 7 días, intentar refrescar
          if (now - lastSession < SESSION_EXPIRY_TIME) {
            console.log('Intentando recuperar sesión anterior...');

            // Marcar que se está intentando recuperar la sesión
            await AsyncStorage.setItem('session_recovery_attempted', 'true');

            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

              if (!refreshError && refreshData.session) {
                console.log('Sesión recuperada correctamente');
                setSession(refreshData.session);
                setUser(refreshData.session.user);
                await AsyncStorage.setItem(LAST_SESSION_KEY, now.toString());
                // Limpiar la marca de intento ya que fue exitoso
                await AsyncStorage.removeItem('session_recovery_attempted');
                return;
              } else {
                console.log('No se pudo recuperar la sesión, se requiere inicio de sesión manual');
                // Limpiar la marca de tiempo de la última sesión para evitar futuros intentos
                await AsyncStorage.removeItem(LAST_SESSION_KEY);
              }
            } catch (refreshError) {
              console.error('Error al recuperar sesión anterior:', refreshError);
              // Limpiar la marca de tiempo de la última sesión para evitar futuros intentos
              await AsyncStorage.removeItem(LAST_SESSION_KEY);
            }
          } else {
            console.log('La última sesión expiró (más de 7 días), se requiere inicio de sesión manual');
            // Limpiar la marca de tiempo de la última sesión
            await AsyncStorage.removeItem(LAST_SESSION_KEY);
          }
        }
      }

      // Actualizar el estado con la sesión actual (podría ser null)
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
      // Limpiar la bandera de intento de recuperación para permitir un nuevo intento
      await AsyncStorage.removeItem('session_recovery_attempted');
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

              // Guardar la marca de tiempo de la sesión actual para persistencia
              const now = Date.now();
              await AsyncStorage.setItem(LAST_SESSION_KEY, now.toString());
              // Limpiar la bandera de intento de recuperación ya que el inicio de sesión fue exitoso
              await AsyncStorage.removeItem('session_recovery_attempted');
              console.log('Marca de tiempo de sesión guardada:', new Date(now).toLocaleString());

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

        // Configurar un intervalo para verificar y refrescar la sesión periódicamente
        // Esto ayudará a mantener la sesión activa incluso si la app está en segundo plano
        const sessionRefreshInterval = setInterval(async () => {
          // Solo intentar refrescar si hay una sesión activa
          if (session) {
            console.log('Verificando y refrescando sesión periódicamente...');
            await checkSession(true);
          }
        }, 12 * 60 * 60 * 1000); // Cada 12 horas

        return () => {
          // Limpiar la suscripción y el intervalo al desmontar
          authListener.subscription.unsubscribe();
          clearInterval(sessionRefreshInterval);
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

        // Guardar la marca de tiempo de la sesión actual para persistencia
        const now = Date.now();
        await AsyncStorage.setItem(LAST_SESSION_KEY, now.toString());
        // Limpiar la bandera de intento de recuperación ya que el inicio de sesión fue exitoso
        await AsyncStorage.removeItem('session_recovery_attempted');
        console.log('Marca de tiempo de sesión guardada:', new Date(now).toLocaleString());

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
      // Eliminar la marca de tiempo de la sesión y la bandera de intento de recuperación
      await AsyncStorage.removeItem(LAST_SESSION_KEY);
      await AsyncStorage.removeItem('session_recovery_attempted');
      console.log('Marca de tiempo de sesión y bandera de recuperación eliminadas');

      const { error } = await supabase.auth.signOut();
      if (error) {
        // Registrar el error detalladamente en la consola
        console.error('Error al cerrar sesión:', error);
        console.error('Detalles del error:', {
          code: error.code,
          message: error.message,
          status: error.status
        });
      } else {
        console.log('Sesión cerrada correctamente');
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
