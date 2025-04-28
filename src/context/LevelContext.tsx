import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import {
  LevelDefinition,
  UserLevel,
  getUserLevel,
  updateUserLevel,
  getLevelReward,
  addExperiencePoints
} from '../services/levels';
import {
  updateUserRanking,
  getUserRankingPosition,
  RankingEntry
} from '../services/ranking';
import { Alert, ToastAndroid, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';
import { cacheManager } from '../utils/cacheManager';
import { xpQueue } from '../utils/xpQueue';
import { syncManager } from '../utils/syncManager';

type LevelContextType = {
  userLevel: UserLevel | null;
  levelDefinitions: LevelDefinition[];
  loading: boolean;
  error: string | null;
  rankingPosition: number | null;
  refreshLevel: () => Promise<void>;
  checkLevelUp: () => Promise<boolean>;
  addXP: (amount: number, action: string) => Promise<boolean>;
  showXPToast: (amount: number, action: string) => void;
};

const LevelContext = createContext<LevelContextType>({
  userLevel: null,
  levelDefinitions: [],
  loading: false,
  error: null,
  rankingPosition: null,
  refreshLevel: async () => {},
  checkLevelUp: async () => false,
  addXP: async () => false,
  showXPToast: () => {},
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

  // Caché para evitar cargas repetidas
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 30000; // 30 segundos en milisegundos
  const [fetchAttempts, setFetchAttempts] = useState<number>(0);
  const MAX_FETCH_ATTEMPTS = 3; // Máximo número de intentos consecutivos

  const fetchUserLevel = useCallback(async (forceRefresh = false) => {
    try {
      // Verificar si debemos usar la caché
      const now = Date.now();
      if (!forceRefresh && userLevel && (now - lastFetchTime < CACHE_DURATION)) {
        logger.debug('Usando datos en caché para el nivel de usuario');
        return;
      }

      // Verificar si hemos excedido el número máximo de intentos
      if (fetchAttempts >= MAX_FETCH_ATTEMPTS) {
        logger.warning('Máximo número de intentos alcanzado, esperando antes de reintentar');
        // Reiniciar contador después de un tiempo
        setTimeout(() => {
          setFetchAttempts(0);
        }, 5000);
        return;
      }

      setLoading(true);
      setLastFetchTime(now);
      setFetchAttempts(prev => prev + 1);

      // Verificar autenticación antes de continuar
      const isAuthenticated = await checkAuthentication();

      if (!isAuthenticated) {
        // Si no está autenticado, no intentar refrescar la sesión automáticamente
        // para evitar bucles infinitos
        logger.warning('Usuario no autenticado, no se intentará refrescar la sesión automáticamente');
        throw new Error('Usuario no autenticado');
      }

      // Obtener el nivel del usuario
      const result = await logger.measureAsync('getUserLevel', async () => {
        return await getUserLevel();
      });

      const { userLevel: newUserLevel, error } = result;

      if (error) {
        // Registrar el error técnico en la consola
        logger.error('Error técnico al obtener nivel de usuario:', error);

        // Lanzar un error genérico para el usuario
        throw new Error('No se pudo cargar tu información de nivel');
      }

      // Reiniciar contador de intentos al tener éxito
      setFetchAttempts(0);
      setUserLevel(newUserLevel);

      // Actualizar el ranking del usuario
      try {
        await logger.measureAsync('updateUserRanking', async () => {
          await updateUserRanking();
        });
      } catch (rankUpdateErr) {
        // Solo registrar en consola, no interrumpir el flujo
        logger.error('Error al actualizar ranking:', rankUpdateErr);
      }

      // Obtener la posición en el ranking
      try {
        const { position, error: rankError } = await logger.measureAsync('getUserRankingPosition', async () => {
          return await getUserRankingPosition();
        });

        if (!rankError && position) {
          setRankingPosition(position);
        }
      } catch (rankPosErr) {
        // Solo registrar en consola, no interrumpir el flujo
        logger.error('Error al obtener posición en ranking:', rankPosErr);
      }

      setError(null);
    } catch (err: any) {
      // Registrar el error técnico completo en la consola
      logger.error('Error técnico en fetchUserLevel:', err);

      // Determinar un mensaje de error amigable para el usuario
      let userFriendlyMessage = 'No se pudo cargar tu información de nivel';

      if (err.message === 'Usuario no autenticado') {
        userFriendlyMessage = 'Necesitas iniciar sesión para ver tu nivel';
      }

      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  }, [user, refreshSession, userLevel, lastFetchTime, fetchAttempts]);

  // Efecto para cargar el nivel cuando cambia el usuario
  useEffect(() => {
    // Solo cargar si hay un usuario autenticado
    if (user) {
      fetchUserLevel();
    }
  }, [user, fetchUserLevel]);

  const checkLevelUp = async (): Promise<boolean> => {
    try {
      // Verificar autenticación antes de continuar
      const isAuthenticated = await checkAuthentication();

      if (!isAuthenticated) {
        console.log('Usuario no autenticado al verificar subida de nivel');
        return false;
      }

      // Actualizar el nivel del usuario
      const { leveledUp, newLevel, error } = await updateUserLevel();

      if (error) {
        console.error('Error al actualizar nivel:', error);
        return false;
      }

      // Si el usuario subió de nivel, mostrar notificación
      if (leveledUp && newLevel) {
        try {
          // Obtener la recompensa del nuevo nivel
          const { reward } = await getLevelReward(newLevel);

          // Mostrar alerta de subida de nivel
          Alert.alert(
            '¡Subiste de Nivel!',
            `Has alcanzado el nivel ${newLevel}${reward ? `\n\nRecompensa: ${reward}` : ''}`,
            [{ text: 'Genial!' }]
          );

          // Actualizar el nivel del usuario en el estado (forzar actualización)
          // Usar setTimeout para evitar posibles bucles
          setTimeout(() => {
            fetchUserLevel(true);
          }, 500);

          return true;
        } catch (rewardError) {
          console.error('Error al obtener recompensa de nivel:', rewardError);
          return true; // Aún así retornamos true porque el nivel subió
        }
      }

      return false;
    } catch (err: any) {
      console.error('Error al verificar subida de nivel:', err);
      return false;
    }
  };

  // Función para mostrar un toast con la XP ganada
  const showXPToast = useCallback((amount: number, action: string) => {
    const message = `+${amount} XP: ${action}`;

    if (Platform.OS === 'android') {
      ToastAndroid.showWithGravity(
        message,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM
      );
    } else {
      // En iOS podríamos usar una librería como react-native-toast-message
      logger.info(message);
      // Aquí podrías implementar una alerta visual para iOS
    }
  }, []);

  // Función para añadir XP y mostrar feedback visual
  const addXP = useCallback(async (amount: number, action: string): Promise<boolean> => {
    try {
      logger.info(`Añadiendo ${amount} XP por acción: ${action}`);

      const result = await logger.measureAsync(`addExperiencePoints(${amount}, ${action})`, async () => {
        return await addExperiencePoints(amount, action);
      });

      if (result.success) {
        // Mostrar feedback visual
        if (result.xpAwarded !== undefined) {
          showXPToast(result.xpAwarded, action);
        } else {
          showXPToast(amount, action); // Usar la cantidad original si no hay xpAwarded
        }

        // Actualizar el nivel del usuario después de un breve retraso
        setTimeout(() => {
          fetchUserLevel(true);
        }, 1000);

        return true;
      } else {
        // Manejar diferentes tipos de errores
        const errorObj = result as any; // Type assertion para acceder a propiedades opcionales

        if (errorObj.cooldown) {
          logger.info('Acción en cooldown, no se otorgó XP');
        } else if (errorObj.limitReached) {
          logger.info('Límite alcanzado, no se otorgó XP');
        } else {
          logger.error('Error al añadir XP:', result.error);
        }
        return false;
      }
    } catch (error) {
      logger.error('Error en addXP:', error);
      return false;
    }
  }, [fetchUserLevel, showXPToast]);

  return (
    <LevelContext.Provider
      value={{
        userLevel,
        levelDefinitions,
        loading,
        error,
        rankingPosition,
        refreshLevel: () => fetchUserLevel(true), // Forzar actualización cuando se llama explícitamente
        checkLevelUp,
        addXP,
        showXPToast,
      }}
    >
      {children}
    </LevelContext.Provider>
  );
};
