import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import {
  Achievement,
  UserAchievement,
  PlayerStats,
  getUserAchievements,
  initializeUserAchievements,
  checkMultipleAchievements,
  getPlayerStats,
  claimAchievementReward,
  shareAchievement,
  updatePlayerStats
} from '../services/achievements';
import AchievementNotification from '../components/AchievementNotification';
import { Share, Platform } from 'react-native';

type AchievementUpdate = {
  code: string;
  increment?: number;
};

type AchievementsContextType = {
  userAchievements: UserAchievement[];
  playerStats: PlayerStats | null;
  loading: boolean;
  error: string | null;
  showSecretAchievements: boolean;
  refreshAchievements: () => Promise<void>;
  trackAchievements: (updates: AchievementUpdate[]) => Promise<void>;
  claimReward: (achievementId: number) => Promise<boolean>;
  shareAchievementWithFriends: (achievementId: number) => Promise<boolean>;
  toggleShowSecretAchievements: () => void;
  updateStats: (stats: Partial<PlayerStats>) => Promise<void>;
};

const AchievementsContext = createContext<AchievementsContextType>({
  userAchievements: [],
  playerStats: null,
  loading: false,
  error: null,
  showSecretAchievements: false,
  refreshAchievements: async () => {},
  trackAchievements: async () => {},
  claimReward: async () => false,
  shareAchievementWithFriends: async () => false,
  toggleShowSecretAchievements: () => {},
  updateStats: async () => {},
});

export const useAchievements = () => useContext(AchievementsContext);

type AchievementsProviderProps = {
  children: ReactNode;
};

export const AchievementsProvider: React.FC<AchievementsProviderProps> = ({ children }) => {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [showSecretAchievements, setShowSecretAchievements] = useState(false);

  const fetchAchievements = async () => {
    try {
      setLoading(true);

      // Asegurarse de que los logros estén inicializados
      await initializeUserAchievements();

      // Obtener los logros del usuario (filtrar secretos según la configuración)
      const { userAchievements, error } = await getUserAchievements(showSecretAchievements);

      if (error) throw error;

      setUserAchievements(userAchievements || []);

      // Obtener estadísticas del jugador
      const { stats, error: statsError } = await getPlayerStats();

      if (statsError) {
        console.error('Error al cargar estadísticas:', statsError);
      } else {
        setPlayerStats(stats);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los logros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [showSecretAchievements]);

  const trackAchievements = async (updates: AchievementUpdate[]) => {
    try {
      const { unlockedAchievements } = await checkMultipleAchievements(updates);

      // Si se desbloqueó algún logro, mostrar notificación
      if (unlockedAchievements.length > 0) {
        // Buscar los detalles del primer logro desbloqueado
        const unlockedCode = unlockedAchievements[0].code;
        const achievement = userAchievements.find(
          ua => ua.achievement?.code === unlockedCode
        )?.achievement;

        if (achievement) {
          setUnlockedAchievement(achievement);

          // Actualizar la lista de logros
          await fetchAchievements();
        }
      }
    } catch (err: any) {
      console.error('Error al actualizar logros:', err);
    }
  };

  const handleCloseNotification = () => {
    setUnlockedAchievement(null);
  };

  // Función para reclamar recompensas
  const claimReward = async (achievementId: number): Promise<boolean> => {
    try {
      const { error } = await claimAchievementReward(achievementId);

      if (error) {
        console.error('Error al reclamar recompensa:', error);
        return false;
      }

      // Actualizar la lista de logros para reflejar que la recompensa fue reclamada
      await fetchAchievements();
      return true;
    } catch (err) {
      console.error('Error al reclamar recompensa:', err);
      return false;
    }
  };

  // Función para compartir logros
  const shareAchievementWithFriends = async (achievementId: number): Promise<boolean> => {
    try {
      const { shareUrl, error } = await shareAchievement(achievementId);

      if (error || !shareUrl) {
        console.error('Error al generar URL para compartir:', error);
        return false;
      }

      // Encontrar el logro para obtener su nombre y descripción
      const achievement = userAchievements.find(
        ua => ua.achievement?.id === achievementId
      )?.achievement;

      if (!achievement) {
        console.error('Logro no encontrado');
        return false;
      }

      // Compartir usando la API de Share
      const result = await Share.share({
        title: `¡He desbloqueado el logro "${achievement.name}" en Drink App!`,
        message: `¡He desbloqueado el logro "${achievement.name}" en Drink App!\n\n${achievement.description}\n\nDescarga la app y juega conmigo: ${shareUrl}`,
        url: shareUrl // Solo funciona en iOS
      });

      return result.action !== Share.dismissedAction;
    } catch (err) {
      console.error('Error al compartir logro:', err);
      return false;
    }
  };

  // Función para mostrar/ocultar logros secretos
  const toggleShowSecretAchievements = () => {
    setShowSecretAchievements(prev => !prev);
  };

  // Función para actualizar estadísticas
  const updateStats = async (stats: Partial<PlayerStats>) => {
    try {
      const { error } = await updatePlayerStats(stats);

      if (error) {
        console.error('Error al actualizar estadísticas:', error);
        return;
      }

      // Actualizar estadísticas locales
      setPlayerStats(prev => prev ? { ...prev, ...stats } : null);
    } catch (err) {
      console.error('Error al actualizar estadísticas:', err);
    }
  };

  return (
    <AchievementsContext.Provider
      value={{
        userAchievements,
        playerStats,
        loading,
        error,
        showSecretAchievements,
        refreshAchievements: fetchAchievements,
        trackAchievements,
        claimReward,
        shareAchievementWithFriends,
        toggleShowSecretAchievements,
        updateStats,
      }}
    >
      {children}

      {unlockedAchievement && (
        <AchievementNotification
          title={unlockedAchievement.name}
          description={unlockedAchievement.description}
          icon={unlockedAchievement.icon}
          reward={unlockedAchievement.reward_description}
          onClose={handleCloseNotification}
        />
      )}
    </AchievementsContext.Provider>
  );
};
