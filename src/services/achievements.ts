import { supabase } from './supabase';
import { cacheManager } from '../utils/cacheManager';
import { logger } from '../utils/logger';

// Flags para controlar la inicialización
let achievementsInitialized = false;
let predefinedAchievementsLoaded = false;

// Claves de caché
const CACHE_KEYS = {
  ALL_ACHIEVEMENTS: 'all_achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
  PLAYER_STATS: 'player_stats',
  PREDEFINED_ACHIEVEMENTS: 'predefined_achievements'
};

// Función para obtener los logros predeterminados
export const getDefaultAchievements = () => {
  return [
    {
      code: 'first_game',
      name: 'Primer Juego',
      description: 'Juega tu primera partida',
      icon: 'game-controller',
      required_count: 1,
      is_secret: false,
      reward_description: 'Desbloquea nuevos modos de juego'
    },
    {
      code: 'shot_taker',
      name: 'Bebedor Valiente',
      description: 'Toma 10 shots durante el juego',
      icon: 'wine-glass',
      required_count: 10,
      is_secret: false,
      reward_description: 'Desbloquea un nuevo modo de juego'
    },
    {
      code: 'shot_master',
      name: 'Maestro de Shots',
      description: 'Toma un total de 50 shots',
      icon: 'beer',
      required_count: 50,
      is_secret: false,
      reward_description: 'Desbloquea un nuevo modo de juego'
    },
    {
      code: 'truth_master',
      name: 'Maestro de la Verdad',
      description: 'Elige "Verdad" 20 veces',
      icon: 'chatbubbles',
      required_count: 20,
      is_secret: false,
      reward_description: null
    },
    {
      code: 'dare_master',
      name: 'Maestro del Reto',
      description: 'Elige "Reto" 20 veces',
      icon: 'flame',
      required_count: 20,
      is_secret: false,
      reward_description: null
    },
    {
      code: 'truth_seeker',
      name: 'Buscador de Verdades',
      description: 'Elige "Verdad" 20 veces consecutivas',
      icon: 'search',
      required_count: 20,
      is_secret: true,
      reward_description: 'Desbloquea preguntas especiales de verdad'
    },
    {
      code: 'dare_devil',
      name: 'Atrevido',
      description: 'Elige "Reto" 20 veces consecutivas',
      icon: 'flame-outline',
      required_count: 20,
      is_secret: true,
      reward_description: 'Desbloquea retos especiales'
    },
    {
      code: 'perfect_streak',
      name: 'Racha Perfecta',
      description: 'Completa 10 desafíos seguidos sin tomar shots',
      icon: 'trophy',
      required_count: 1,
      is_secret: false,
      reward_description: 'Desbloquea un nuevo modo de juego'
    },
    {
      code: 'social_butterfly',
      name: 'Mariposa Social',
      description: 'Juega con 10 jugadores diferentes',
      icon: 'people',
      required_count: 10,
      is_secret: false,
      reward_description: null
    },
    {
      code: 'night_owl',
      name: 'Búho Nocturno',
      description: 'Juega después de la medianoche',
      icon: 'moon',
      required_count: 1,
      is_secret: true,
      reward_description: 'Desbloquea preguntas nocturnas especiales'
    },
    {
      code: 'weekend_warrior',
      name: 'Guerrero de Fin de Semana',
      description: 'Juega durante el fin de semana',
      icon: 'calendar',
      required_count: 1,
      is_secret: false,
      reward_description: null
    },
    {
      code: 'extreme_player',
      name: 'Jugador Extremo',
      description: 'Juega en modo Extremo',
      icon: 'warning',
      required_count: 1,
      is_secret: false,
      reward_description: 'Desbloquea preguntas extremas adicionales'
    }
  ];
};

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
  // Clave de caché específica para esta consulta
  const cacheKey = `${CACHE_KEYS.ALL_ACHIEVEMENTS}_${includeSecret}`;

  // Intentar obtener de la caché primero
  const cachedData = cacheManager.get<{ achievements: Achievement[], error: any }>(cacheKey);
  if (cachedData) {
    logger.debug(`Usando logros en caché (includeSecret=${includeSecret})`);
    return cachedData;
  }

  logger.debug(`Obteniendo logros de la base de datos (includeSecret=${includeSecret})`);

  return logger.measureAsync(`getAchievements(${includeSecret})`, async () => {
    let query = supabase
      .from('achievements')
      .select('*')
      .order('id');

    if (!includeSecret) {
      query = query.eq('is_secret', false);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Guardar en caché por 5 minutos (los logros cambian con poca frecuencia)
      const result = { achievements: data as Achievement[], error };
      cacheManager.set(cacheKey, result, 5 * 60 * 1000);
      return result;
    }

    return { achievements: data as Achievement[], error };
  });
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

    try {
      // Obtener todos los logros del usuario
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error al obtener logros del usuario:', error);

        // Si hay un error específico de relación, intentar obtener los logros de otra manera
        if (error.message && error.message.includes('relationship')) {
          console.log('Intentando obtener logros sin relación...');

          // Obtener los logros del usuario sin la relación
          const { data: userAchievementsData, error: userAchievementsError } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('user_id', user.id);

          if (userAchievementsError) {
            console.error('Error al obtener logros básicos del usuario:', userAchievementsError);
            return { userAchievements: [], error: userAchievementsError };
          }

          // Obtener todos los logros
          const { achievements: allAchievements, error: allAchievementsError } = await getAchievements(true);

          if (allAchievementsError) {
            console.error('Error al obtener todos los logros:', allAchievementsError);
            return { userAchievements: [], error: allAchievementsError };
          }

          // Combinar manualmente los datos
          const combinedData = userAchievementsData.map(userAchievement => {
            const achievement = allAchievements.find(a => a.id === userAchievement.achievement_id);
            return {
              ...userAchievement,
              achievement
            };
          });

          return {
            userAchievements: combinedData as UserAchievement[],
            error: null
          };
        }

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
    } catch (innerErr) {
      console.error('Error interno en getUserAchievements:', innerErr);
      return { userAchievements: [], error: innerErr };
    }
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
  // Si ya se inicializaron los logros en esta sesión, no hacerlo de nuevo
  if (achievementsInitialized) {
    logger.debug('Logros ya inicializados en esta sesión, omitiendo...');
    return { error: null };
  }

  logger.info('Inicializando logros para el usuario...');

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Error: Usuario no autenticado en initializeUserAchievements');
      return { error: null }; // Devolver error nulo para evitar errores en cascada
    }

    logger.info('Usuario autenticado para inicialización:', user.id);

    // Verificar si todos los logros predefinidos existen en la base de datos
    await ensureAllAchievementsExist();

    return logger.measureAsync('initializeUserAchievements', async () => {
      // Obtener todos los logros (incluyendo secretos)
      const { achievements, error: achievementsError } = await getAchievements(true);

      if (achievementsError) {
        logger.error('Error al obtener logros:', achievementsError);
        return { error: null }; // Devolver error nulo para evitar errores en cascada
      }

      logger.info(`Se encontraron ${achievements.length} logros para inicializar`);

      // Verificar si el usuario ya tiene logros inicializados
      const { data: existingAchievements, error: checkError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (checkError) {
        logger.error('Error al verificar logros existentes:', checkError);
        return { error: null }; // Devolver error nulo para evitar errores en cascada
      }

      // Crear un conjunto de IDs de logros que el usuario ya tiene
      const existingAchievementIds = new Set(
        (existingAchievements || []).map(item => item.achievement_id)
      );

      logger.info(`El usuario ya tiene ${existingAchievementIds.size} logros inicializados`);

      // Filtrar solo los logros que el usuario no tiene aún
      const achievementsToAdd = achievements.filter(
        achievement => !existingAchievementIds.has(achievement.id)
      );

      logger.info(`Se necesitan inicializar ${achievementsToAdd.length} logros nuevos`);

      if (achievementsToAdd.length === 0) {
        logger.info('No hay nuevos logros para inicializar');
        // Marcar como inicializado
        achievementsInitialized = true;
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
        logger.error('Error al insertar logros:', insertError);
      } else {
        logger.info(`${achievementsToAdd.length} logros inicializados correctamente`);
      }

      // Marcar como inicializado incluso si hubo un error
      // para evitar intentos repetidos que probablemente fallarían
      achievementsInitialized = true;

      // Invalidar la caché de logros del usuario
      cacheManager.invalidate(CACHE_KEYS.USER_ACHIEVEMENTS);

      return { error: null }; // Siempre devolver error nulo para evitar errores en cascada
    });
  } catch (err) {
    logger.error('Error inesperado en initializeUserAchievements:', err);
    return { error: null }; // Devolver error nulo para evitar errores en cascada
  }
};

// Función para asegurar que todos los logros predefinidos existan en la base de datos
export const ensureAllAchievementsExist = async () => {
  // Si ya se verificaron los logros predefinidos, no hacerlo de nuevo
  if (predefinedAchievementsLoaded) {
    logger.debug('Logros predefinidos ya verificados, omitiendo...');
    return;
  }

  try {
    logger.info('Verificando que todos los logros predefinidos existan en la base de datos...');

    // Intentar obtener de la caché primero
    const cachedPredefined = cacheManager.get<boolean>(CACHE_KEYS.PREDEFINED_ACHIEVEMENTS);
    if (cachedPredefined) {
      logger.debug('Usando verificación de logros predefinidos en caché');
      predefinedAchievementsLoaded = true;
      return;
    }

    return logger.measureAsync('ensureAllAchievementsExist', async () => {
      // Obtener todos los logros predefinidos
      const defaultAchievements = getDefaultAchievements();

      // Obtener todos los logros existentes en la base de datos
      const { data: existingAchievements, error } = await supabase
        .from('achievements')
        .select('code');

      if (error) {
        logger.error('Error al obtener logros existentes:', error);
        return;
      }

      // Crear un conjunto de códigos de logros que ya existen
      const existingCodes = new Set(
        (existingAchievements || []).map(item => item.code)
      );

      // Filtrar solo los logros que no existen en la base de datos
      const achievementsToAdd = defaultAchievements.filter(
        achievement => !existingCodes.has(achievement.code)
      );

      logger.info(`Se necesitan crear ${achievementsToAdd.length} logros nuevos`);

      if (achievementsToAdd.length === 0) {
        logger.info('Todos los logros predefinidos ya existen en la base de datos');

        // Marcar como verificado y guardar en caché
        predefinedAchievementsLoaded = true;
        cacheManager.set(CACHE_KEYS.PREDEFINED_ACHIEVEMENTS, true, 24 * 60 * 60 * 1000); // 24 horas

        return;
      }

      // Crear los logros faltantes uno por uno para evitar errores
      for (const achievement of achievementsToAdd) {
        try {
          logger.info(`Creando logro: ${achievement.code} - ${achievement.name}`);

          const { error: createError } = await supabase
            .from('achievements')
            .insert({
              code: achievement.code,
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              required_count: achievement.required_count,
              is_secret: achievement.is_secret,
              reward_description: achievement.reward_description,
              created_at: new Date().toISOString()
            });

          if (createError) {
            logger.error(`Error al crear logro ${achievement.code}:`, createError);
          } else {
            logger.info(`Logro ${achievement.code} creado correctamente`);
          }
        } catch (createErr) {
          logger.error(`Error inesperado al crear logro ${achievement.code}:`, createErr);
        }
      }

      // Invalidar la caché de logros
      cacheManager.invalidate(CACHE_KEYS.ALL_ACHIEVEMENTS);

      // Marcar como verificado y guardar en caché
      predefinedAchievementsLoaded = true;
      cacheManager.set(CACHE_KEYS.PREDEFINED_ACHIEVEMENTS, true, 24 * 60 * 60 * 1000); // 24 horas
    });
  } catch (err) {
    logger.error('Error inesperado en ensureAllAchievementsExist:', err);
  }
};

// Función para actualizar el progreso de un logro
export const updateAchievementProgress = async (
  achievementCode: string,
  increment: number = 1
) => {
  console.log(`Actualizando progreso para logro: ${achievementCode}, incremento: ${increment}`);

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado');
      return { unlocked: false, error: new Error('Usuario no autenticado') };
    }

    console.log('Usuario autenticado:', user.id);

    // Asegurarse de que todos los logros predefinidos existan en la base de datos
    await ensureAllAchievementsExist();

    // Obtener el ID del logro por su código
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('id, required_count, name')
      .eq('code', achievementCode)
      .single();

    let achievementData;

    if (achievementError) {
      // Si el logro no existe, es un error inesperado ya que acabamos de asegurarnos de que todos existan
      console.error(`Error al obtener logro ${achievementCode} después de verificar existencia:`, achievementError);

      // Intentar obtener el logro de la lista predefinida como fallback
      const defaultAchievements = getDefaultAchievements();
      const defaultAchievement = defaultAchievements.find(a => a.code === achievementCode);

      if (defaultAchievement) {
        console.log(`Usando información predefinida para el logro ${achievementCode}`);

        // Crear un objeto con la información predefinida y un ID temporal
        achievementData = {
          id: -1, // ID temporal
          name: defaultAchievement.name,
          required_count: defaultAchievement.required_count
        };
      } else {
        console.error(`El logro ${achievementCode} no existe y no está en la lista predefinida`);
        return { unlocked: false, error: new Error(`Logro ${achievementCode} no encontrado`) };
      }
    } else {
      achievementData = achievement;
    }

    console.log(`Logro encontrado: ${achievementData.name} (ID: ${achievementData.id}), requerido: ${achievementData.required_count}`);

    // Obtener el registro actual del logro del usuario
    const { data: userAchievement, error: userAchievementError } = await supabase
      .from('user_achievements')
      .select('id, progress, unlocked')
      .eq('user_id', user.id)
      .eq('achievement_id', achievementData.id)
      .single();

    console.log('Buscando registro de logro para usuario:',
      userAchievement ? `Encontrado (progreso: ${userAchievement.progress})` : 'No encontrado');

    // Si hay un error específico de "no se encontró registro", continuamos con la lógica
    if (userAchievementError && userAchievementError.code !== 'PGRST116') {
      console.error('Error al obtener registro de logro del usuario:', userAchievementError);
      return { unlocked: false, error: userAchievementError };
    }

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
        .eq('achievement_id', achievementData.id)
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
      const shouldUnlock = newProgress >= achievementData.required_count;

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
    const shouldUnlock = newProgress >= achievementData.required_count;

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
  } catch (error) {
    console.error('Error general en updateAchievementProgress:', error);
    return { unlocked: false, error };
  }
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
