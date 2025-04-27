import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return { error };
    }
  };
  
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      console.error('Error al registrarse:', error);
      return { error };
    }
  };
  
  const signOutUser = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
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
