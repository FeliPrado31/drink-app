import { supabase } from './supabase';
import { getUserAchievements } from './achievements';
import { getPlayerStats, PlayerStats } from './achievements';

// Tipos para el ranking
export type RankingEntry = {
  id: number;
  user_id: string;
  username: string;
  total_score: number;
  achievements_score: number;
  games_score: number;
  social_score: number;
  last_updated: string;
  created_at: string;
  rank?: number; // Posición en el ranking
};

// Función para calcular la puntuación del usuario
export const calculateUserScore = async () => {
  try {
    // Obtener los logros del usuario
    const { userAchievements, error: achievementsError } = await getUserAchievements(true);
    
    if (achievementsError) {
      throw achievementsError;
    }
    
    // Obtener estadísticas del jugador
    const { stats, error: statsError } = await getPlayerStats();
    
    if (statsError) {
      throw statsError;
    }
    
    // Calcular puntuación basada en logros
    let achievementsScore = 0;
    for (const ua of userAchievements) {
      if (ua.unlocked && ua.achievement) {
        // Logros más difíciles otorgan más puntos
        const basePoints = ua.achievement.required_count * 5;
        
        // Logros secretos otorgan un 100% más de puntos
        const secretBonus = ua.achievement.is_secret ? 2 : 1;
        
        achievementsScore += Math.round(basePoints * secretBonus);
      }
    }
    
    // Calcular puntuación basada en juegos
    const gamesScore = calculateGamesScore(stats);
    
    // Calcular puntuación social
    const socialScore = calculateSocialScore(stats);
    
    // Calcular puntuación total
    const totalScore = achievementsScore + gamesScore + socialScore;
    
    return {
      totalScore,
      achievementsScore,
      gamesScore,
      socialScore,
      error: null
    };
  } catch (error) {
    return {
      totalScore: 0,
      achievementsScore: 0,
      gamesScore: 0,
      socialScore: 0,
      error
    };
  }
};

// Función auxiliar para calcular puntuación de juegos
const calculateGamesScore = (stats: PlayerStats | null): number => {
  if (!stats) return 0;
  
  // Puntos por partidas jugadas
  const gamesPoints = stats.total_games * 10;
  
  // Puntos por verdades y retos
  const truthPoints = stats.truth_count * 2;
  const darePoints = stats.dare_count * 3;
  
  // Puntos por shots (menos puntos porque es "fallar")
  const shotPoints = stats.shots_taken * 1;
  
  return gamesPoints + truthPoints + darePoints + shotPoints;
};

// Función auxiliar para calcular puntuación social
const calculateSocialScore = (stats: PlayerStats | null): number => {
  if (!stats) return 0;
  
  // Puntos por sugerencias creadas
  const suggestionsPoints = stats.suggestions_created * 5;
  
  // Puntos por sugerencias aprobadas (más valiosas)
  const approvedPoints = stats.suggestions_approved * 20;
  
  // Puntos por votos
  const votesPoints = stats.votes_given * 2;
  
  return suggestionsPoints + approvedPoints + votesPoints;
};

// Función para actualizar el ranking del usuario
export const updateUserRanking = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  try {
    // Calcular puntuación
    const {
      totalScore,
      achievementsScore,
      gamesScore,
      socialScore,
      error: scoreError
    } = await calculateUserScore();
    
    if (scoreError) {
      throw scoreError;
    }
    
    // Obtener el nombre de usuario (email si no hay nombre)
    const username = user.user_metadata?.name || user.email || 'Usuario';
    
    // Verificar si el usuario ya tiene un registro en el ranking
    const { data: existingRanking, error: checkError } = await supabase
      .from('global_ranking')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (!existingRanking) {
      // Crear nuevo registro
      const { error: insertError } = await supabase
        .from('global_ranking')
        .insert({
          user_id: user.id,
          username,
          total_score: totalScore,
          achievements_score: achievementsScore,
          games_score: gamesScore,
          social_score: socialScore,
          last_updated: new Date().toISOString()
        });
        
      if (insertError) {
        throw insertError;
      }
    } else {
      // Actualizar registro existente
      const { error: updateError } = await supabase
        .from('global_ranking')
        .update({
          username,
          total_score: totalScore,
          achievements_score: achievementsScore,
          games_score: gamesScore,
          social_score: socialScore,
          last_updated: new Date().toISOString()
        })
        .eq('id', existingRanking.id);
        
      if (updateError) {
        throw updateError;
      }
    }
    
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Función para obtener el ranking global
export const getGlobalRanking = async (
  limit: number = 100,
  category: 'total' | 'achievements' | 'games' | 'social' = 'total'
) => {
  try {
    // Determinar la columna de ordenamiento
    let orderColumn = 'total_score';
    switch (category) {
      case 'achievements':
        orderColumn = 'achievements_score';
        break;
      case 'games':
        orderColumn = 'games_score';
        break;
      case 'social':
        orderColumn = 'social_score';
        break;
    }
    
    // Obtener el ranking
    const { data, error } = await supabase
      .from('global_ranking')
      .select('*')
      .order(orderColumn, { ascending: false })
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    // Añadir el rango a cada entrada
    const rankingWithPosition = data.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
    
    return { ranking: rankingWithPosition as RankingEntry[], error: null };
  } catch (error) {
    return { ranking: [], error };
  }
};

// Función para obtener la posición del usuario en el ranking
export const getUserRankingPosition = async (
  category: 'total' | 'achievements' | 'games' | 'social' = 'total'
) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { position: null, error: new Error('Usuario no autenticado') };
  }

  try {
    // Determinar la columna de ordenamiento
    let orderColumn = 'total_score';
    switch (category) {
      case 'achievements':
        orderColumn = 'achievements_score';
        break;
      case 'games':
        orderColumn = 'games_score';
        break;
      case 'social':
        orderColumn = 'social_score';
        break;
    }
    
    // Obtener todos los usuarios con puntuación mayor que el usuario actual
    const { data: userRanking, error: userError } = await supabase
      .from('global_ranking')
      .select(orderColumn)
      .eq('user_id', user.id)
      .single();
      
    if (userError) {
      throw userError;
    }
    
    const userScore = userRanking[orderColumn];
    
    // Contar cuántos usuarios tienen una puntuación mayor
    const { count, error: countError } = await supabase
      .from('global_ranking')
      .select('*', { count: 'exact', head: true })
      .gt(orderColumn, userScore);
      
    if (countError) {
      throw countError;
    }
    
    // La posición es el número de usuarios con mayor puntuación + 1
    const position = (count || 0) + 1;
    
    return { position, error: null };
  } catch (error) {
    return { position: null, error };
  }
};
