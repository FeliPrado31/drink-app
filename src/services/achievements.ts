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
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado en getUserAchievements');
      // En lugar de devolver un error, devolvemos un array vacío
      // para evitar que la aplicación se rompa
      return { userAchievements: [], error: null };
    }

    // Obtener todos los logros del usuario
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error al obtener logros del usuario:', error);
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
  } catch (err) {
    console.error('Error inesperado en getUserAchievements:', err);
    return { userAchievements: [], error: null };
  }
};

// Función para obtener estadísticas del jugador
export const getPlayerStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado en getPlayerStats');
      // Devolver estadísticas vacías en lugar de un error
      return {
        stats: {
          total_games: 0,
          truth_count: 0,
          dare_count: 0,
          shots_taken: 0,
          suggestions_created: 0,
          suggestions_approved: 0,
          votes_given: 0,
          achievements_unlocked: 0,
          last_played_at: null
        },
        error: null
      };
    }

    try {
      // Obtener logros desbloqueados
      const { userAchievements, error: achievementsError } = await getUserAchievements(true);

      if (achievementsError) {
        console.error('Error al obtener logros para estadísticas:', achievementsError);
        // Continuar con un array vacío en lugar de lanzar error
        const unlockedAchievements = [];
      } else {
        var unlockedAchievements = userAchievements.filter(ua => ua.unlocked);
      }

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
        achievements_unlocked: unlockedAchievements?.length || 0,
        last_played_at: null
      };

      // Intentar obtener estadísticas reales de la base de datos
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        // Si el error no es "no se encontró registro", es un error real
        console.error('Error al obtener estadísticas:', statsError);
        // Continuar con estadísticas predeterminadas
      }

      // Combinar estadísticas predeterminadas con las reales (si existen)
      const stats: PlayerStats = {
        ...defaultStats,
        ...(statsData || {}),
        achievements_unlocked: unlockedAchievements?.length || 0 // Siempre usar el valor real
      };

      return { stats, error: null };
    } catch (error) {
      console.error('Error inesperado en getPlayerStats:', error);
      // Devolver estadísticas predeterminadas en caso de error
      return {
        stats: {
          total_games: 0,
          truth_count: 0,
          dare_count: 0,
          shots_taken: 0,
          suggestions_created: 0,
          suggestions_approved: 0,
          votes_given: 0,
          achievements_unlocked: 0,
          last_played_at: null
        },
        error: null
      };
    }
  } catch (outerError) {
    console.error('Error crítico en getPlayerStats:', outerError);
    // Devolver estadísticas predeterminadas en caso de error
    return {
      stats: {
        total_games: 0,
        truth_count: 0,
        dare_count: 0,
        shots_taken: 0,
        suggestions_created: 0,
        suggestions_approved: 0,
        votes_given: 0,
        achievements_unlocked: 0,
        last_played_at: null
      },
      error: null
    };
  }
};

// Función para inicializar los logros de un usuario
export const initializeUserAchievements = async () => {
  console.log('Inicializando logros para el usuario...');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado en initializeUserAchievements');
      return { error: null }; // Devolver error nulo para evitar errores en cascada
    }

    console.log('Usuario autenticado para inicialización:', user.id);

    // Obtener todos los logros (incluyendo secretos)
    const { achievements, error: achievementsError } = await getAchievements(true);

    if (achievementsError) {
      console.error('Error al obtener logros:', achievementsError);
      return { error: null }; // Devolver error nulo para evitar errores en cascada
    }

    console.log(`Se encontraron ${achievements.length} logros para inicializar`);

    // Verificar si el usuario ya tiene logros inicializados
    const { data: existingAchievements, error: checkError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (checkError) {
      console.error('Error al verificar logros existentes:', checkError);
      return { error: null }; // Devolver error nulo para evitar errores en cascada
    }

    // Crear un conjunto de IDs de logros que el usuario ya tiene
    const existingAchievementIds = new Set(
      (existingAchievements || []).map(item => item.achievement_id)
    );

    console.log(`El usuario ya tiene ${existingAchievementIds.size} logros inicializados`);

    // Filtrar solo los logros que el usuario no tiene aún
    const achievementsToAdd = achievements.filter(
      achievement => !existingAchievementIds.has(achievement.id)
    );

    console.log(`Se necesitan inicializar ${achievementsToAdd.length} logros nuevos`);

    if (achievementsToAdd.length === 0) {
      console.log('No hay nuevos logros para inicializar');
      return { error: null }; // Usuario ya tiene todos los logros inicializados
    }

    // Preparar los datos para insertar
    const userAchievementsData = achievementsToAdd.map(achievement => ({
      user_id: user.id,
      achievement_id: achievement.id,
      progress: 0,
      unlocked: false,
      reward_claimed: false
    }));

    // Insertar los registros de logros del usuario
    const { error: insertError } = await supabase
      .from('user_achievements')
      .insert(userAchievementsData);

    if (insertError) {
      console.error('Error al insertar logros:', insertError);
    } else {
      console.log(`${achievementsToAdd.length} logros inicializados correctamente`);
    }

    return { error: null }; // Siempre devolver error nulo para evitar errores en cascada
  } catch (err) {
    console.error('Error inesperado en initializeUserAchievements:', err);
    return { error: null }; // Devolver error nulo para evitar errores en cascada
  }
};

// Función para actualizar el progreso de un logro
export const updateAchievementProgress = async (
  achievementCode: string,
  increment: number = 1
) => {
  console.log(`Actualizando progreso para logro: ${achievementCode}, incremento: ${increment}`);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('Error: Usuario no autenticado');
    return { error: new Error('Usuario no autenticado') };
  }

  console.log('Usuario autenticado:', user.id);

  // Obtener el ID del logro por su código
  const { data: achievement, error: achievementError } = await supabase
    .from('achievements')
    .select('id, required_count, name')
    .eq('code', achievementCode)
    .single();

  if (achievementError) {
    console.error(`Error al obtener logro ${achievementCode}:`, achievementError);
    return { error: achievementError };
  }

  console.log(`Logro encontrado: ${achievement.name} (ID: ${achievement.id}), requerido: ${achievement.required_count}`);

  // Obtener el registro actual del logro del usuario
  const { data: userAchievement, error: userAchievementError } = await supabase
    .from('user_achievements')
    .select('id, progress, unlocked')
    .eq('user_id', user.id)
    .eq('achievement_id', achievement.id)
    .single();

  console.log('Buscando registro de logro para usuario:',
    userAchievement ? `Encontrado (progreso: ${userAchievement.progress})` : 'No encontrado');

  if (userAchievementError) {
    if (userAchievementError.code === 'PGRST116') {
      console.log('No se encontró registro de logro para el usuario, inicializando...');
    } else {
      console.error('Error al obtener registro de logro:', userAchievementError);
      return { error: userAchievementError };
    }
  }

  // Si el usuario no tiene este logro inicializado, inicializarlo
  if (!userAchievement) {
    console.log('Inicializando logros para el usuario...');
    const initResult = await initializeUserAchievements();

    if (initResult.error) {
      console.error('Error al inicializar logros:', initResult.error);
      return { error: initResult.error };
    }

    console.log('Logros inicializados, obteniendo registro actualizado...');

    // Intentar obtener el registro nuevamente
    const { data: newUserAchievement, error: newError } = await supabase
      .from('user_achievements')
      .select('id, progress, unlocked')
      .eq('user_id', user.id)
      .eq('achievement_id', achievement.id)
      .single();

    if (newError) {
      console.error('Error al obtener registro actualizado:', newError);
      return { error: newError };
    }

    if (!newUserAchievement) {
      console.error('No se pudo encontrar el registro después de inicializar');
      return { error: new Error('No se pudo inicializar el logro') };
    }

    console.log('Registro actualizado encontrado:', newUserAchievement);

    // Continuar con el nuevo registro
    const userAchievementId = newUserAchievement.id;
    const currentProgress = newUserAchievement.progress;
    const isUnlocked = newUserAchievement.unlocked;

    // Si ya está desbloqueado, no hacer nada
    if (isUnlocked) {
      console.log('El logro ya está desbloqueado, no se actualiza');
      return { unlocked: false, error: null };
    }

    // Calcular el nuevo progreso
    const newProgress = currentProgress + increment;
    const shouldUnlock = newProgress >= achievement.required_count;

    console.log(`Actualizando progreso: ${currentProgress} -> ${newProgress}, desbloquear: ${shouldUnlock}`);

    // Actualizar el progreso
    const { error: updateError } = await supabase
      .from('user_achievements')
      .update({
        progress: newProgress,
        unlocked: shouldUnlock,
        unlocked_at: shouldUnlock ? new Date().toISOString() : null
      })
      .eq('id', userAchievementId);

    if (updateError) {
      console.error('Error al actualizar progreso:', updateError);
    } else {
      console.log('Progreso actualizado correctamente');
    }

    return { unlocked: shouldUnlock, error: updateError };
  }

  // Si ya está desbloqueado, no hacer nada
  if (userAchievement.unlocked) {
    console.log('El logro ya está desbloqueado, no se actualiza');
    return { unlocked: false, error: null };
  }

  // Calcular el nuevo progreso
  const newProgress = userAchievement.progress + increment;
  const shouldUnlock = newProgress >= achievement.required_count;

  console.log(`Actualizando progreso existente: ${userAchievement.progress} -> ${newProgress}, desbloquear: ${shouldUnlock}`);

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

  if (updateError) {
    console.error('Error al actualizar progreso:', updateError);
  } else {
    console.log('Progreso actualizado correctamente');
  }

  // Si se desbloqueó un logro, actualizar las estadísticas
  if (shouldUnlock) {
    console.log('¡Logro desbloqueado! Actualizando estadísticas...');
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
