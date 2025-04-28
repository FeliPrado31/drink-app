import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import {
  LevelDefinition,
  UserLevel,
  getUserLevel,
  updateUserLevel,
  getLevelReward
} from '../services/levels';
import {
  updateUserRanking,
  getUserRankingPosition,
  RankingEntry
} from '../services/ranking';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

type LevelContextType = {
  userLevel: UserLevel | null;
  levelDefinitions: LevelDefinition[];
  loading: boolean;
  error: string | null;
  rankingPosition: number | null;
  refreshLevel: () => Promise<void>;
  checkLevelUp: () => Promise<boolean>;
};

const LevelContext = createContext<LevelContextType>({
  userLevel: null,
  levelDefinitions: [],
  loading: false,
  error: null,
  rankingPosition: null,
  refreshLevel: async () => {},
  checkLevelUp: async () => false,
});

export const useLevel = () => useContext(LevelContext);

type LevelProviderProps = {
  children: ReactNode;
};

export const LevelProvider: React.FC<LevelProviderProps> = ({ children }) => {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [levelDefinitions, setLevelDefinitions] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingPosition, setRankingPosition] = useState<number | null>(null);

  // Usar el contexto de autenticación para acceder a la sesión y funciones de autenticación
  const { user, refreshSession } = useAuth();

  // Verificar si el usuario está autenticado
  const checkAuthentication = async (): Promise<boolean> => {
    try {
      // Verificar si hay un usuario en el contexto
      if (user) return true;

      // Si no hay usuario en el contexto, intentar obtenerlo directamente
      const { data } = await supabase.auth.getUser();
      return !!data.user;
    } catch (err) {
      console.error('Error al verificar autenticación:', err);
      return false;
    }
  };

  const fetchUserLevel = useCallback(async () => {
    try {
      setLoading(true);

      // Verificar autenticación antes de continuar
      const isAuthenticated = await checkAuthentication();

      if (!isAuthenticated) {
        // Si no está autenticado, intentar refrescar la sesión
        await refreshSession();

        // Verificar nuevamente después de refrescar
        const isAuthenticatedAfterRefresh = await checkAuthentication();

        if (!isAuthenticatedAfterRefresh) {
          throw new Error('Usuario no autenticado');
        }
      }

      // Obtener el nivel del usuario
      const { userLevel, error } = await getUserLevel();

      if (error) {
        // Registrar el error técnico en la consola
        console.error('Error técnico al obtener nivel de usuario:', error);

        // Lanzar un error genérico para el usuario
        throw new Error('No se pudo cargar tu información de nivel');
      }

      setUserLevel(userLevel);

      // Actualizar el ranking del usuario
      try {
        await updateUserRanking();
      } catch (rankUpdateErr) {
        // Solo registrar en consola, no interrumpir el flujo
        console.error('Error al actualizar ranking:', rankUpdateErr);
      }

      // Obtener la posición en el ranking
      try {
        const { position, error: rankError } = await getUserRankingPosition();

        if (!rankError && position) {
          setRankingPosition(position);
        }
      } catch (rankPosErr) {
        // Solo registrar en consola, no interrumpir el flujo
        console.error('Error al obtener posición en ranking:', rankPosErr);
      }

      setError(null);
    } catch (err: any) {
      // Registrar el error técnico completo en la consola
      console.error('Error técnico en fetchUserLevel:', err);

      // Determinar un mensaje de error amigable para el usuario
      let userFriendlyMessage = 'No se pudo cargar tu información de nivel';

      if (err.message === 'Usuario no autenticado') {
        userFriendlyMessage = 'Necesitas iniciar sesión para ver tu nivel';
      }

      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  }, [user, refreshSession]);

  // Efecto para cargar el nivel cuando cambia el usuario
  useEffect(() => {
    fetchUserLevel();
  }, [user, fetchUserLevel]);

  const checkLevelUp = async (): Promise<boolean> => {
    try {
      // Verificar autenticación antes de continuar
      const isAuthenticated = await checkAuthentication();

      if (!isAuthenticated) {
        // Si no está autenticado, intentar refrescar la sesión
        await refreshSession();

        // Verificar nuevamente después de refrescar
        const isAuthenticatedAfterRefresh = await checkAuthentication();

        if (!isAuthenticatedAfterRefresh) {
          throw new Error('Usuario no autenticado');
        }
      }

      // Actualizar el nivel del usuario
      const { leveledUp, newLevel, error } = await updateUserLevel();

      if (error) throw error;

      // Si el usuario subió de nivel, mostrar notificación
      if (leveledUp && newLevel) {
        // Obtener la recompensa del nuevo nivel
        const { reward } = await getLevelReward(newLevel);

        // Mostrar alerta de subida de nivel
        Alert.alert(
          '¡Subiste de Nivel!',
          `Has alcanzado el nivel ${newLevel}${reward ? `\n\nRecompensa: ${reward}` : ''}`,
          [{ text: 'Genial!' }]
        );

        // Actualizar el nivel del usuario en el estado
        await fetchUserLevel();

        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error al verificar subida de nivel:', err);
      return false;
    }
  };

  return (
    <LevelContext.Provider
      value={{
        userLevel,
        levelDefinitions,
        loading,
        error,
        rankingPosition,
        refreshLevel: fetchUserLevel,
        checkLevelUp,
      }}
    >
      {children}
    </LevelContext.Provider>
  );
};
