import { supabase } from './supabase';
import { getUserAchievements } from './achievements';

// Tipos para los niveles
export type LevelDefinition = {
  id: number;
  level: number;
  xp_required: number;
  title: string;
  description: string;
  reward_description: string | null;
  created_at: string;
};

export type UserLevel = {
  id: number;
  user_id: string;
  level: number;
  total_xp: number;
  next_level_xp: number;
  created_at: string;
  updated_at: string;
  level_definitions?: LevelDefinition; // Para incluir los detalles del nivel
};

// Función para obtener todas las definiciones de niveles
export const getLevelDefinitions = async () => {
  const { data, error } = await supabase
    .from('level_definitions')
    .select('*')
    .order('level');

  return { levelDefinitions: data as LevelDefinition[], error };
};

// Función para obtener el nivel actual del usuario
export const getUserLevel = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userLevel: null, error: new Error('Usuario no autenticado') };
  }

  // Verificar si el usuario ya tiene un registro de nivel
  const { data, error } = await supabase
    .from('user_levels')
    .select('*, level_definitions(*)')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Si el error no es "no se encontró registro", es un error real
    return { userLevel: null, error };
  }

  // Si el usuario no tiene un registro de nivel, crearlo
  if (!data) {
    // Obtener el nivel 1
    const { data: levelOne, error: levelError } = await supabase
      .from('level_definitions')
      .select('*')
      .eq('level', 1)
      .single();

    if (levelError) {
      return { userLevel: null, error: levelError };
    }

    // Crear registro de nivel para el usuario
    const { data: newLevel, error: createError } = await supabase
      .from('user_levels')
      .insert({
        user_id: user.id,
        level: 1,
        total_xp: 0,
        next_level_xp: levelOne.xp_required
      })
      .select('*')
      .single();

    if (createError) {
      return { userLevel: null, error: createError };
    }

    // Obtener el nivel completo con la información
    const { data: fullLevel, error: fullError } = await supabase
      .from('user_levels')
      .select('*, level_definitions(*)')
      .eq('id', newLevel.id)
      .single();

    if (fullError) {
      return { userLevel: null, error: fullError };
    }

    return { userLevel: fullLevel as UserLevel, error: null };
  }

  return { userLevel: data as UserLevel, error: null };
};

// Función para calcular la experiencia basada en logros
export const calculateExperienceFromAchievements = async () => {
  // Obtener los logros del usuario
  const { userAchievements, error } = await getUserAchievements(true);

  if (error) {
    return { xp: 0, error };
  }

  // Calcular XP basado en logros desbloqueados
  // Cada logro desbloqueado otorga XP basado en su dificultad (required_count)
  let totalXP = 0;

  for (const ua of userAchievements) {
    if (ua.unlocked && ua.achievement) {
      // Logros más difíciles otorgan más XP
      const baseXP = ua.achievement.required_count * 10;

      // Logros secretos otorgan un 50% más de XP
      const secretBonus = ua.achievement.is_secret ? 1.5 : 1;

      totalXP += Math.round(baseXP * secretBonus);
    } else if (ua.achievement) {
      // Otorgar XP parcial por progreso
      const progressRatio = ua.progress / ua.achievement.required_count;
      const baseXP = ua.achievement.required_count * 10;
      const progressXP = Math.round(baseXP * progressRatio * 0.5); // 50% del XP por progreso

      totalXP += progressXP;
    }
  }

  return { xp: totalXP, error: null };
};

// Función para actualizar el nivel del usuario
export const updateUserLevel = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  try {
    // Calcular XP basado en logros
    const { xp, error: xpError } = await calculateExperienceFromAchievements();

    if (xpError) {
      throw xpError;
    }

    // Obtener todas las definiciones de niveles
    const { levelDefinitions, error: levelsError } = await getLevelDefinitions();

    if (levelsError) {
      throw levelsError;
    }

    // Ordenar niveles por XP requerido (descendente)
    const sortedLevels = [...levelDefinitions].sort((a, b) => b.xp_required - a.xp_required);

    // Encontrar el nivel actual basado en XP
    let currentLevel = 1;
    let nextLevelXP = 100;

    for (const level of sortedLevels) {
      if (xp >= level.xp_required) {
        currentLevel = level.level;

        // Encontrar el siguiente nivel
        const nextLevel = levelDefinitions.find(l => l.level === currentLevel + 1);
        nextLevelXP = nextLevel ? nextLevel.xp_required : level.xp_required;

        break;
      }
    }

    // Verificar si el usuario ya tiene un registro de nivel
    const { data: existingLevel, error: checkError } = await supabase
      .from('user_levels')
      .select('id, level')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (!existingLevel) {
      // Crear nuevo registro
      const { error: insertError } = await supabase
        .from('user_levels')
        .insert({
          user_id: user.id,
          level: currentLevel,
          total_xp: xp,
          next_level_xp: nextLevelXP,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }
    } else {
      // Actualizar registro existente
      const { error: updateError } = await supabase
        .from('user_levels')
        .update({
          level: currentLevel,
          total_xp: xp,
          next_level_xp: nextLevelXP,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLevel.id);

      if (updateError) {
        throw updateError;
      }

      // Verificar si el usuario subió de nivel
      const leveledUp = currentLevel > existingLevel.level;

      return { leveledUp, newLevel: currentLevel, error: null };
    }

    return { leveledUp: false, newLevel: currentLevel, error: null };
  } catch (error) {
    return { leveledUp: false, newLevel: 1, error };
  }
};

// Función para obtener la recompensa del nivel actual
export const getLevelReward = async (level: number) => {
  const { data, error } = await supabase
    .from('level_definitions')
    .select('reward_description')
    .eq('level', level)
    .single();

  if (error) {
    return { reward: null, error };
  }

  return { reward: data.reward_description, error: null };
};
