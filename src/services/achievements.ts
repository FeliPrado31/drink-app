import { supabase } from './supabase';

// Tipos para los logros
export type Achievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  required_count: number;
  created_at: string;
  is_secret?: boolean;
  reward_description?: string;
};

export type UserAchievement = {
  id: number;
  user_id: string;
  achievement_id: number;
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
  created_at: string;
  achievement?: Achievement; // Para incluir los detalles del logro
  reward_claimed?: boolean;
};

// Tipo para estadísticas del jugador
export type PlayerStats = {
  total_games: number;
  truth_count: number;
  dare_count: number;
  shots_taken: number;
  suggestions_created: number;
  suggestions_approved: number;
  votes_given: number;
  achievements_unlocked: number;
  last_played_at: string | null;
};

// Función para obtener todos los logros
export const getAchievements = async (includeSecret: boolean = false) => {
  let query = supabase
    .from('achievements')
    .select('*')
    .order('id');

  if (!includeSecret) {
    query = query.eq('is_secret', false);
  }

  const { data, error } = await query;
  return { achievements: data as Achievement[], error };
};

// Función para obtener los logros del usuario actual
export const getUserAchievements = async (includeSecret: boolean = true) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userAchievements: [], error: new Error('Usuario no autenticado') };
  }

  // Obtener todos los logros del usuario
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', user.id);

  if (error) {
    return { userAchievements: [], error };
  }

  // Filtrar logros secretos si es necesario
  let userAchievements = data as UserAchievement[];

  if (!includeSecret) {
    userAchievements = userAchievements.filter(ua =>
      !ua.achievement?.is_secret || (ua.achievement?.is_secret && ua.unlocked)
    );
  }

  return { userAchievements, error: null };
};

// Función para obtener estadísticas del jugador
export const getPlayerStats = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { stats: null, error: new Error('Usuario no autenticado') };
  }

  try {
    // Obtener logros desbloqueados
    const { userAchievements, error: achievementsError } = await getUserAchievements(true);

    if (achievementsError) {
      throw achievementsError;
    }

    const unlockedAchievements = userAchievements.filter(ua => ua.unlocked);

    // Obtener estadísticas de la base de datos (si existe una tabla para ello)
    // Por ahora, usaremos valores predeterminados
    const defaultStats: PlayerStats = {
      total_games: 0,
      truth_count: 0,
      dare_count: 0,
      shots_taken: 0,
      suggestions_created: 0,
      suggestions_approved: 0,
      votes_given: 0,
      achievements_unlocked: unlockedAchievements.length,
      last_played_at: null
    };

    // Intentar obtener estadísticas reales de la base de datos
    // Esto es un ejemplo, deberías adaptar esto a tu estructura de datos real
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      // Si el error no es "no se encontró registro", es un error real
      throw statsError;
    }

    // Combinar estadísticas predeterminadas con las reales (si existen)
    const stats: PlayerStats = {
      ...defaultStats,
      ...(statsData || {}),
      achievements_unlocked: unlockedAchievements.length // Siempre usar el valor real
    };

    return { stats, error: null };
  } catch (error) {
    return { stats: null, error };
  }
};

// Función para inicializar los logros de un usuario
export const initializeUserAchievements = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  // Obtener todos los logros (incluyendo secretos)
  const { achievements, error: achievementsError } = await getAchievements(true);

  if (achievementsError) {
    return { error: achievementsError };
  }

  // Verificar si el usuario ya tiene logros inicializados
  const { data: existingAchievements, error: checkError } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', user.id);

  if (checkError) {
    return { error: checkError };
  }

  // Crear un conjunto de IDs de logros que el usuario ya tiene
  const existingAchievementIds = new Set(
    (existingAchievements || []).map(item => item.achievement_id)
  );

  // Filtrar solo los logros que el usuario no tiene aún
  const achievementsToAdd = achievements.filter(
    achievement => !existingAchievementIds.has(achievement.id)
  );

  if (achievementsToAdd.length === 0) {
    return { error: null }; // Usuario ya tiene todos los logros inicializados
  }

  // Preparar los datos para insertar
  const userAchievementsData = achievementsToAdd.map(achievement => ({
    user_id: user.id,
    achievement_id: achievement.id,
    progress: 0,
    unlocked: false
  }));

  // Insertar los registros de logros del usuario
  const { error: insertError } = await supabase
    .from('user_achievements')
    .insert(userAchievementsData);

  return { error: insertError };
};

// Función para actualizar el progreso de un logro
export const updateAchievementProgress = async (
  achievementCode: string,
  increment: number = 1
) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  // Obtener el ID del logro por su código
  const { data: achievement, error: achievementError } = await supabase
    .from('achievements')
    .select('id, required_count')
    .eq('code', achievementCode)
    .single();

  if (achievementError) {
    return { error: achievementError };
  }

  // Obtener el registro actual del logro del usuario
  const { data: userAchievement, error: userAchievementError } = await supabase
    .from('user_achievements')
    .select('id, progress, unlocked')
    .eq('user_id', user.id)
    .eq('achievement_id', achievement.id)
    .single();

  if (userAchievementError && userAchievementError.code !== 'PGRST116') {
    // Si el error no es "no se encontró registro", es un error real
    return { error: userAchievementError };
  }

  // Si el usuario no tiene este logro inicializado, inicializarlo
  if (!userAchievement) {
    await initializeUserAchievements();

    // Intentar obtener el registro nuevamente
    const { data: newUserAchievement, error: newError } = await supabase
      .from('user_achievements')
      .select('id, progress, unlocked')
      .eq('user_id', user.id)
      .eq('achievement_id', achievement.id)
      .single();

    if (newError) {
      return { error: newError };
    }

    if (!newUserAchievement) {
      return { error: new Error('No se pudo inicializar el logro') };
    }

    // Continuar con el nuevo registro
    const userAchievementId = newUserAchievement.id;
    const currentProgress = newUserAchievement.progress;
    const isUnlocked = newUserAchievement.unlocked;

    // Si ya está desbloqueado, no hacer nada
    if (isUnlocked) {
      return { unlocked: false, error: null };
    }

    // Calcular el nuevo progreso
    const newProgress = currentProgress + increment;
    const shouldUnlock = newProgress >= achievement.required_count;

    // Actualizar el progreso
    const { error: updateError } = await supabase
      .from('user_achievements')
      .update({
        progress: newProgress,
        unlocked: shouldUnlock,
        unlocked_at: shouldUnlock ? new Date().toISOString() : null
      })
      .eq('id', userAchievementId);

    return { unlocked: shouldUnlock, error: updateError };
  }

  // Si ya está desbloqueado, no hacer nada
  if (userAchievement.unlocked) {
    return { unlocked: false, error: null };
  }

  // Calcular el nuevo progreso
  const newProgress = userAchievement.progress + increment;
  const shouldUnlock = newProgress >= achievement.required_count;

  // Actualizar el progreso
  const { error: updateError } = await supabase
    .from('user_achievements')
    .update({
      progress: newProgress,
      unlocked: shouldUnlock,
      unlocked_at: shouldUnlock ? new Date().toISOString() : null,
      reward_claimed: false // Inicializar como no reclamado cuando se desbloquea
    })
    .eq('id', userAchievement.id);

  // Si se desbloqueó un logro, actualizar las estadísticas
  if (shouldUnlock) {
    await updatePlayerStats();
  }

  return { unlocked: shouldUnlock, error: updateError };
};

// Función para verificar y desbloquear múltiples logros a la vez
export const checkMultipleAchievements = async (
  achievementUpdates: { code: string; increment?: number }[]
) => {
  const results: { code: string; unlocked: boolean; error: any }[] = [];

  for (const update of achievementUpdates) {
    const { unlocked, error } = await updateAchievementProgress(
      update.code,
      update.increment || 1
    );

    results.push({
      code: update.code,
      unlocked: unlocked || false,
      error
    });
  }

  // Filtrar solo los logros desbloqueados
  const unlockedAchievements = results.filter(result => result.unlocked && !result.error);

  return {
    unlockedAchievements,
    results
  };
};

// Función para reclamar la recompensa de un logro
export const claimAchievementReward = async (achievementId: number) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  // Verificar si el logro está desbloqueado
  const { data: userAchievement, error: checkError } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id)
    .eq('achievement_id', achievementId)
    .eq('unlocked', true)
    .eq('reward_claimed', false)
    .single();

  if (checkError) {
    return { error: new Error('No se puede reclamar esta recompensa') };
  }

  // Marcar la recompensa como reclamada
  const { error: updateError } = await supabase
    .from('user_achievements')
    .update({ reward_claimed: true })
    .eq('id', userAchievement.id);

  return { error: updateError };
};

// Función para compartir un logro
export const shareAchievement = async (achievementId: number) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado'), shareUrl: null };
  }

  // Obtener detalles del logro
  const { data: achievement, error: achievementError } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .single();

  if (achievementError) {
    return { error: achievementError, shareUrl: null };
  }

  // Verificar si el usuario ha desbloqueado este logro
  const { data: userAchievement, error: userAchievementError } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id)
    .eq('achievement_id', achievementId)
    .eq('unlocked', true)
    .single();

  if (userAchievementError) {
    return { error: new Error('No puedes compartir un logro que no has desbloqueado'), shareUrl: null };
  }

  // Crear URL para compartir
  const shareUrl = `https://drinkapp.com/share/achievement/${achievementId}?user=${encodeURIComponent(user.email || '')}`;

  return { shareUrl, error: null };
};

// Función para actualizar las estadísticas del jugador
export const updatePlayerStats = async (stats?: Partial<PlayerStats>) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  try {
    // Verificar si ya existe un registro de estadísticas
    const { data: existingStats, error: checkError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Si el error no es "no se encontró registro", es un error real
      throw checkError;
    }

    // Si no hay estadísticas, crear un nuevo registro
    if (!existingStats) {
      const defaultStats: any = {
        user_id: user.id,
        total_games: 0,
        truth_count: 0,
        dare_count: 0,
        shots_taken: 0,
        suggestions_created: 0,
        suggestions_approved: 0,
        votes_given: 0,
        last_played_at: new Date().toISOString()
      };

      // Combinar con las estadísticas proporcionadas
      const newStats = {
        ...defaultStats,
        ...(stats || {})
      };

      const { error: insertError } = await supabase
        .from('user_stats')
        .insert(newStats);

      if (insertError) throw insertError;
    } else {
      // Si ya hay estadísticas, actualizarlas
      const updatedStats = {
        ...(stats || {}),
        last_played_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('user_stats')
        .update(updatedStats)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
};
