import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
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

  const fetchUserLevel = async () => {
    try {
      setLoading(true);
      
      // Obtener el nivel del usuario
      const { userLevel, error } = await getUserLevel();
      
      if (error) throw error;
      
      setUserLevel(userLevel);
      
      // Actualizar el ranking del usuario
      await updateUserRanking();
      
      // Obtener la posición en el ranking
      const { position, error: rankError } = await getUserRankingPosition();
      
      if (!rankError && position) {
        setRankingPosition(position);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el nivel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLevel();
  }, []);

  const checkLevelUp = async (): Promise<boolean> => {
    try {
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
