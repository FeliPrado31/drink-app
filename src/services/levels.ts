import { supabase } from './supabase';
import { cacheManager } from '../utils/cacheManager';
import { logger } from '../utils/logger';
import { xpQueue } from '../utils/xpQueue';
import { syncManager } from '../utils/syncManager';

// Claves de caché
const CACHE_KEYS = {
  USER_LEVEL: 'user_level',
  LEVEL_DEFINITIONS: 'level_definitions',
  USER_RANKING: 'user_ranking',
  USER_RANKING_POSITION: 'user_ranking_position'
};
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
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Error: Usuario no autenticado en getUserLevel');
      return { userLevel: null, error: new Error('Usuario no autenticado') };
    }

    // Intentar obtener de la caché primero
    const cacheKey = `${CACHE_KEYS.USER_LEVEL}_${user.id}`;
    const cachedLevel = cacheManager.get<{ userLevel: UserLevel, error: any }>(cacheKey);

    if (cachedLevel) {
      logger.debug('Usando datos en caché para el nivel de usuario');
      return cachedLevel;
    }

    // Verificar si existe la tabla user_levels
    try {
      // Verificar si el usuario ya tiene un registro de nivel
      const { data, error } = await supabase
        .from('user_levels')
        .select('*, level_definitions!inner(*)')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Si hay un error, verificar si es porque no se encontró el registro
        if (error.code === 'PGRST116') {
          // No se encontró registro, crear uno nuevo
          console.log('No se encontró registro de nivel para el usuario, creando uno nuevo...');
        } else {
          // Es un error diferente, puede ser un problema con la relación o la tabla
          console.error('Error al consultar nivel de usuario:', error);

          // Intentar obtener solo el nivel sin la relación
          const { data: basicLevel, error: basicError } = await supabase
            .from('user_levels')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!basicError && basicLevel) {
            // Si podemos obtener el nivel básico, intentar obtener la definición por separado
            const { data: levelDef } = await supabase
              .from('level_definitions')
              .select('*')
              .eq('level', basicLevel.level)
              .single();

            // Combinar manualmente
            if (levelDef) {
              const combinedLevel = {
                ...basicLevel,
                level_definitions: levelDef
              };

              const result = { userLevel: combinedLevel as UserLevel, error: null };
              cacheManager.set(cacheKey, result, 30 * 1000); // 30 segundos
              return result;
            }

            // Si no podemos obtener la definición, devolver solo el nivel básico
            const result = { userLevel: basicLevel as UserLevel, error: null };
            cacheManager.set(cacheKey, result, 30 * 1000); // 30 segundos
            return result;
          }

          // Si no podemos obtener ni siquiera el nivel básico, crear uno nuevo
        }
      } else {
        // Se encontró el registro, guardarlo en caché y devolverlo
        const result = { userLevel: data as UserLevel, error: null };
        cacheManager.set(cacheKey, result, 30 * 1000); // 30 segundos
        return result;
      }
    } catch (tableError) {
      console.error('Error al acceder a la tabla user_levels:', tableError);
      // Continuar con la creación de un nuevo nivel
    }

    // Si llegamos aquí, necesitamos crear un nuevo nivel para el usuario

    // Obtener el nivel 1
    const { data: levelOne, error: levelError } = await supabase
      .from('level_definitions')
      .select('*')
      .eq('level', 1)
      .single();

    if (levelError) {
      console.error('Error al obtener definición de nivel 1:', levelError);
      const defaultLevel = {
        userLevel: {
          id: 0,
          user_id: user.id,
          level: 1,
          total_xp: 0,
          next_level_xp: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          level_definitions: {
            id: 1,
            level: 1,
            xp_required: 0,
            title: 'Principiante',
            description: 'Acabas de empezar tu aventura',
            reward_description: null,
            created_at: new Date().toISOString()
          }
        } as UserLevel,
        error: null
      };

      // Guardar en caché incluso el nivel predeterminado
      cacheManager.set(cacheKey, defaultLevel, 30 * 1000);
      return defaultLevel;
    }

    try {
      // Verificar si ya existe un registro para este usuario
      const { data: existingLevel, error: checkError } = await supabase
        .from('user_levels')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar si existe nivel de usuario:', checkError);
      }

      let newLevel;

      if (existingLevel) {
        // Si ya existe, actualizar en lugar de insertar
        console.log('Ya existe un registro de nivel para este usuario, actualizando...');
        const { data: updatedLevel, error: updateError } = await supabase
          .from('user_levels')
          .update({
            level_definition_id: levelOne.id,
            next_level_xp: levelOne.xp_required,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLevel.id)
          .select('*')
          .single();

        if (updateError) {
          console.error('Error al actualizar nivel de usuario:', updateError);
          // Continuar con el nivel existente
        } else {
          newLevel = updatedLevel;
        }
      } else {
        // Si no existe, crear uno nuevo
        console.log('Creando nuevo registro de nivel para el usuario...');
        const { data: insertedLevel, error: createError } = await supabase
          .from('user_levels')
          .insert({
            user_id: user.id,
            level: 1,
            total_xp: 0,
            next_level_xp: levelOne.xp_required,
            level_definition_id: levelOne.id
          })
          .select('*')
          .single();

        if (createError) {
          console.error('Error al crear nivel de usuario:', createError);
          // Devolver un nivel predeterminado en caso de error
          return {
            userLevel: {
              id: 0,
              user_id: user.id,
              level: 1,
              total_xp: 0,
              next_level_xp: levelOne.xp_required,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              level_definitions: levelOne
            } as UserLevel,
            error: null
          };
        }

        newLevel = insertedLevel;
      }

      // Si no tenemos un nivel después de todo, obtener el existente
      if (!newLevel) {
        const { data: fetchedLevel, error: fetchError } = await supabase
          .from('user_levels')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          console.error('Error al obtener nivel existente:', fetchError);
          // Devolver un nivel predeterminado en caso de error
          return {
            userLevel: {
              id: 0,
              user_id: user.id,
              level: 1,
              total_xp: 0,
              next_level_xp: levelOne.xp_required,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              level_definitions: levelOne
            } as UserLevel,
            error: null
          };
        }

        newLevel = fetchedLevel;
      }

      // Combinar manualmente el nivel con su definición
      const userLevel = {
        ...newLevel,
        level_definitions: levelOne
      };

      const result = { userLevel: userLevel as UserLevel, error: null };
      cacheManager.set(cacheKey, result, 30 * 1000);
      return result;
    } catch (insertError) {
      console.error('Error inesperado al crear nivel de usuario:', insertError);
      // Devolver un nivel predeterminado en caso de error
      const defaultLevel = {
        userLevel: {
          id: 0,
          user_id: user.id,
          level: 1,
          total_xp: 0,
          next_level_xp: levelOne.xp_required,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          level_definitions: levelOne
        } as UserLevel,
        error: null
      };

      // Guardar en caché incluso el nivel predeterminado
      cacheManager.set(cacheKey, defaultLevel, 30 * 1000);
      return defaultLevel;
    }
  } catch (err) {
    console.error('Error general en getUserLevel:', err);
    return { userLevel: null, error: new Error('Error al obtener información de nivel') };
  }
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
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado en updateUserLevel');
      return { leveledUp: false, newLevel: null, error: new Error('Usuario no autenticado') };
    }

    console.log('Actualizando nivel para usuario:', user.id);

    try {
      // Obtener el nivel actual del usuario directamente de la base de datos
      const { data: userLevelData, error: userLevelError } = await supabase
        .from('user_levels')
        .select('id, level, total_xp')
        .eq('user_id', user.id)
        .single();

      if (userLevelError && userLevelError.code !== 'PGRST116') {
        console.error('Error al obtener nivel actual del usuario:', userLevelError);
        throw userLevelError;
      }

      // Si no hay nivel de usuario, usar valores predeterminados
      const currentXP = userLevelData?.total_xp || 0;
      console.log('XP actual obtenida directamente de la base de datos:', currentXP);

      // Calcular XP adicional basado en logros (solo para complementar)
      const { xp: achievementXP, error: xpError } = await calculateExperienceFromAchievements();

      if (xpError) {
        console.error('Error al calcular experiencia de logros:', xpError);
        // No lanzamos error, continuamos con la XP actual
      }

      // Usar la XP de la base de datos como fuente principal de verdad
      // Solo usar la XP de logros si no hay XP en la base de datos
      const totalXP = currentXP > 0 ? currentXP : (achievementXP || 0);
      console.log('Experiencia total a utilizar:', totalXP);

      // Obtener todas las definiciones de niveles
      const { levelDefinitions, error: levelsError } = await getLevelDefinitions();

      if (levelsError) {
        console.error('Error al obtener definiciones de niveles:', levelsError);
        throw levelsError;
      }

      if (!levelDefinitions || levelDefinitions.length === 0) {
        console.error('No se encontraron definiciones de niveles');

        // Crear nivel predeterminado si no hay definiciones
        const { error: createLevelDefError } = await supabase
          .from('level_definitions')
          .insert({
            level: 1,
            xp_required: 0,
            title: 'Principiante',
            description: 'Acabas de empezar tu aventura',
            created_at: new Date().toISOString()
          });

        if (createLevelDefError) {
          console.error('Error al crear nivel predeterminado:', createLevelDefError);
        }

        // Usar valores predeterminados
        return { leveledUp: false, newLevel: 1, error: null };
      }

      // Ordenar niveles por XP requerido (descendente)
      const sortedLevels = [...levelDefinitions].sort((a, b) => b.xp_required - a.xp_required);

      // Encontrar el nivel actual basado en XP
      let currentLevel = 1;
      let nextLevelXP = 100;

      for (const level of sortedLevels) {
        if (totalXP >= level.xp_required) {
          currentLevel = level.level;

          // Encontrar el siguiente nivel
          const nextLevel = levelDefinitions.find(l => l.level === currentLevel + 1);
          nextLevelXP = nextLevel ? nextLevel.xp_required : level.xp_required;

          console.log(`Nivel determinado: ${currentLevel}, Siguiente nivel XP: ${nextLevelXP}`);
          break;
        }
      }

      try {
        // Verificar si el usuario ya tiene un registro de nivel
        if (!userLevelData) {
          console.log('Creando nuevo registro de nivel para el usuario');
          // Crear nuevo registro
          const { error: insertError } = await supabase
            .from('user_levels')
            .insert({
              user_id: user.id,
              level: currentLevel,
              total_xp: totalXP,
              next_level_xp: nextLevelXP,
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error al insertar nivel:', insertError);
            throw insertError;
          }

          console.log(`Nivel inicial creado: ${currentLevel}`);
          return { leveledUp: true, newLevel: currentLevel, error: null };
        } else {
          console.log(`Nivel existente: ${userLevelData.level}, Nuevo nivel: ${currentLevel}`);

          // Verificar si el usuario subió de nivel
          const leveledUp = currentLevel > userLevelData.level;

          if (leveledUp) {
            console.log(`¡El usuario ha subido de nivel! ${userLevelData.level} -> ${currentLevel}`);
          }

          // Actualizar registro existente
          const { error: updateError } = await supabase
            .from('user_levels')
            .update({
              level: currentLevel,
              // No actualizamos total_xp aquí para evitar sobrescribir la XP acumulada
              next_level_xp: nextLevelXP,
              updated_at: new Date().toISOString()
            })
            .eq('id', userLevelData.id);

          if (updateError) {
            console.error('Error al actualizar nivel:', updateError);
            throw updateError;
          }

          console.log('Nivel actualizado correctamente');
          return { leveledUp, newLevel: currentLevel, error: null };
        }
      } catch (dbError) {
        console.error('Error en operaciones de base de datos:', dbError);
        return { leveledUp: false, newLevel: currentLevel, error: dbError };
      }
    } catch (innerError) {
      console.error('Error en el proceso de actualización de nivel:', innerError);
      return { leveledUp: false, newLevel: 1, error: innerError };
    }
  } catch (outerError) {
    console.error('Error general en updateUserLevel:', outerError);
    return { leveledUp: false, newLevel: null, error: outerError };
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

// Almacenamiento en memoria para el sistema de cooldown y límites
interface ActionCooldown {
  lastActionTime: { [key: string]: number };  // Timestamp de la última acción por tipo
  dailyXP: { [key: string]: number };         // XP acumulada por día
  actionCounts: { [key: string]: number };    // Conteo de acciones por tipo en un período
  lastResetDate: string;                      // Fecha del último reset diario
}

// Inicializar el sistema de cooldown
const actionCooldown: ActionCooldown = {
  lastActionTime: {},
  dailyXP: {},
  actionCounts: {},
  lastResetDate: new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
};

// Constantes para el sistema de límites
const COOLDOWN_TIMES = {
  'Eligió verdad': 2000,       // 2 segundos entre acciones de verdad
  'Eligió reto': 2000,         // 2 segundos entre acciones de reto
  'Eligió aleatorio': 2000,    // 2 segundos entre acciones aleatorias
  'Completó desafío': 3000,    // 3 segundos entre completar desafíos
  'Tomó shots': 3000,          // 3 segundos entre tomar shots
  'default': 1000              // 1 segundo para otras acciones
};

const DAILY_XP_LIMIT = 1000;   // Límite de 1000 XP por día
const ACTION_COUNT_LIMIT = {
  'Eligió verdad': 50,         // Máximo 50 verdades por día
  'Eligió reto': 50,           // Máximo 50 retos por día
  'Eligió aleatorio': 50,      // Máximo 50 aleatorios por día
  'Completó desafío': 30,      // Máximo 30 desafíos completados por día
  'Tomó shots': 20,            // Máximo 20 veces tomando shots por día
  'default': 100               // Límite predeterminado para otras acciones
};

// Función para verificar y resetear los límites diarios si es necesario
const checkAndResetDailyLimits = (userId: string) => {
  const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

  if (actionCooldown.lastResetDate !== today) {
    console.log('Reseteando límites diarios de XP');
    actionCooldown.dailyXP = {};
    actionCooldown.actionCounts = {};
    actionCooldown.lastResetDate = today;
  }

  // Inicializar contadores para este usuario si no existen
  if (!actionCooldown.dailyXP[userId]) {
    actionCooldown.dailyXP[userId] = 0;
  }

  if (!actionCooldown.actionCounts[userId]) {
    actionCooldown.actionCounts[userId] = 0;
  }
};

// Función para verificar si una acción está en cooldown
const isActionInCooldown = (userId: string, action: string): boolean => {
  const actionKey = `${userId}_${action}`;
  const now = Date.now();
  const lastTime = actionCooldown.lastActionTime[actionKey] || 0;
  const cooldownTime = COOLDOWN_TIMES[action] || COOLDOWN_TIMES.default;

  return (now - lastTime) < cooldownTime;
};

// Función para verificar si se ha alcanzado el límite diario de XP
const hasReachedDailyXPLimit = (userId: string, xpToAdd: number): boolean => {
  return (actionCooldown.dailyXP[userId] + xpToAdd) > DAILY_XP_LIMIT;
};

// Función para verificar si se ha alcanzado el límite de acciones por tipo
const hasReachedActionCountLimit = (userId: string, action: string): boolean => {
  const actionKey = `${userId}_${action}`;
  const count = actionCooldown.actionCounts[actionKey] || 0;
  const limit = ACTION_COUNT_LIMIT[action] || ACTION_COUNT_LIMIT.default;

  return count >= limit;
};

// Función para registrar una acción
const recordAction = (userId: string, action: string, xpAmount: number) => {
  const actionKey = `${userId}_${action}`;
  const now = Date.now();

  // Actualizar tiempo de la última acción
  actionCooldown.lastActionTime[actionKey] = now;

  // Actualizar XP diaria
  actionCooldown.dailyXP[userId] += xpAmount;

  // Actualizar conteo de acciones
  if (!actionCooldown.actionCounts[actionKey]) {
    actionCooldown.actionCounts[actionKey] = 0;
  }
  actionCooldown.actionCounts[actionKey]++;
};

// Función para calcular la XP ajustada basada en la frecuencia de acciones
const calculateAdjustedXP = (userId: string, action: string, baseXP: number): number => {
  const actionKey = `${userId}_${action}`;
  const actionCount = actionCooldown.actionCounts[actionKey] || 0;

  // Reducir la XP gradualmente si el usuario realiza la misma acción repetidamente
  if (actionCount > 10) {
    // Reducción gradual: 100% -> 50% después de 50 acciones del mismo tipo
    const reductionFactor = Math.max(0.5, 1 - (actionCount - 10) / 80);
    return Math.floor(baseXP * reductionFactor);
  }

  return baseXP;
};

// Función para añadir XP al usuario por acciones en el juego
export const addExperiencePoints = async (xpAmount: number, action: string) => {
  try {
    logger.info(`Solicitando añadir ${xpAmount} puntos de experiencia por acción: ${action}`);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Error: Usuario no autenticado en addExperiencePoints');
      return { success: false, error: new Error('Usuario no autenticado') };
    }

    const userId = user.id;

    // Verificar y resetear límites diarios si es necesario
    checkAndResetDailyLimits(userId);

    // Verificar si la acción está en cooldown
    if (isActionInCooldown(userId, action)) {
      logger.info(`Acción "${action}" en cooldown, ignorando solicitud de XP`);
      return {
        success: false,
        cooldown: true,
        error: new Error('Acción en cooldown')
      };
    }

    // Verificar si se ha alcanzado el límite diario de XP
    if (hasReachedDailyXPLimit(userId, xpAmount)) {
      logger.info(`Límite diario de XP alcanzado para el usuario ${userId}`);
      return {
        success: false,
        limitReached: true,
        error: new Error('Límite diario de XP alcanzado')
      };
    }

    // Verificar si se ha alcanzado el límite de acciones por tipo
    if (hasReachedActionCountLimit(userId, action)) {
      logger.info(`Límite de acciones "${action}" alcanzado para el usuario ${userId}`);
      return {
        success: false,
        limitReached: true,
        error: new Error(`Límite de acciones "${action}" alcanzado`)
      };
    }

    // Calcular la XP ajustada basada en la frecuencia de acciones
    const adjustedXP = calculateAdjustedXP(userId, action, xpAmount);

    // Registrar la acción
    recordAction(userId, action, adjustedXP);

    logger.info(`Añadiendo ${adjustedXP} puntos de experiencia (ajustado de ${xpAmount}) por acción: ${action}`);

    // Usar el sistema de cola para actualizar la XP
    // Esto permite agrupar múltiples actualizaciones pequeñas en una sola operación
    if (adjustedXP <= 10) {
      // Para actualizaciones pequeñas, usar la cola
      logger.debug(`Añadiendo actualización de XP a la cola: +${adjustedXP} XP por "${action}"`);
      xpQueue.enqueue(adjustedXP, action);

      // Invalidar la caché del nivel del usuario
      cacheManager.invalidate(CACHE_KEYS.USER_LEVEL);

      return {
        success: true,
        leveledUp: false,
        xpAwarded: adjustedXP,
        error: null
      };
    }

    // Para actualizaciones más grandes, procesar inmediatamente
    return logger.measureAsync(`addExperiencePoints(${adjustedXP}, ${action})`, async () => {
      // Obtener el nivel actual del usuario directamente de la base de datos
      const { data: userLevelData, error: userLevelError } = await supabase
        .from('user_levels')
        .select('id, total_xp')
        .eq('user_id', user.id)
        .single();

      if (userLevelError && userLevelError.code !== 'PGRST116') {
        logger.error('Error al obtener nivel del usuario:', userLevelError);
        return { success: false, error: userLevelError };
      }

      // Si no existe un registro de nivel, crearlo
      if (!userLevelData) {
        logger.info('No se encontró registro de nivel, creando uno nuevo...');

        // Crear un nuevo registro de nivel
        const { error: insertError } = await supabase
          .from('user_levels')
          .insert({
            user_id: user.id,
            level: 1,
            total_xp: adjustedXP,
            next_level_xp: 100,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          logger.error('Error al crear nivel de usuario:', insertError);
          return { success: false, error: insertError };
        }

        logger.info(`Nivel inicial creado con ${adjustedXP} XP`);

        // Invalidar la caché
        cacheManager.invalidate(CACHE_KEYS.USER_LEVEL);

        // Verificar si el usuario ha subido de nivel en segundo plano
        setTimeout(async () => {
          try {
            const { leveledUp, newLevel } = await updateUserLevel();
            if (leveledUp) {
              logger.info(`¡El usuario ha subido al nivel ${newLevel}!`);
            }
          } catch (levelError) {
            logger.error('Error al verificar subida de nivel:', levelError);
          }
        }, 500);

        return {
          success: true,
          leveledUp: false,
          newLevel: 1,
          newTotalXP: adjustedXP,
          xpAwarded: adjustedXP,
          error: null
        };
      }

      // Calcular la nueva XP total
      const currentXP = userLevelData.total_xp || 0;
      const newTotalXP = currentXP + adjustedXP;
      logger.info(`XP actual: ${currentXP}, Nueva XP: ${newTotalXP}`);

      // Actualizar la XP en la base de datos
      const { error: updateError } = await supabase
        .from('user_levels')
        .update({
          total_xp: newTotalXP,
          updated_at: new Date().toISOString()
        })
        .eq('id', userLevelData.id);

      if (updateError) {
        logger.error('Error al actualizar XP:', updateError);
        return { success: false, error: updateError };
      }

      logger.info('XP actualizada correctamente');

      // Invalidar la caché
      cacheManager.invalidate(CACHE_KEYS.USER_LEVEL);

      // Verificar si el usuario ha subido de nivel en segundo plano
      setTimeout(async () => {
        try {
          const { leveledUp, newLevel } = await updateUserLevel();
          if (leveledUp) {
            logger.info(`¡El usuario ha subido al nivel ${newLevel}!`);
          }
        } catch (levelError) {
          logger.error('Error al verificar subida de nivel:', levelError);
        }
      }, 500);

      // Registrar la acción en las estadísticas del jugador (si existe la tabla)
      try {
        // Primero, obtener las estadísticas actuales del jugador
        const { data: currentStats, error: getStatsError } = await supabase
          .from('player_stats')
          .select('total_xp_earned, actions_count')
          .eq('user_id', user.id)
          .single();

        if (getStatsError && getStatsError.code !== 'PGRST116') {
          logger.error('Error al obtener estadísticas actuales:', getStatsError);
        }

        // Valores predeterminados si no hay estadísticas previas
        const statsXP = currentStats?.total_xp_earned || 0;
        const currentActions = currentStats?.actions_count || 0;

        // Actualizar o insertar estadísticas
        const { error: statsError } = await supabase
          .from('player_stats')
          .upsert({
            user_id: user.id,
            last_action: action,
            last_action_time: new Date().toISOString(),
            total_xp_earned: statsXP + adjustedXP,
            actions_count: currentActions + 1,
            updated_at: new Date().toISOString()
          });

        if (statsError) {
          logger.error('Error al actualizar estadísticas:', statsError);
          // No retornamos error aquí, ya que la XP se actualizó correctamente
        }
      } catch (statsError) {
        logger.error('Error al actualizar estadísticas (posiblemente la tabla no existe):', statsError);
        // No hacemos nada, simplemente continuamos
      }

      return {
        success: true,
        leveledUp: false, // No esperamos a la verificación de nivel para responder más rápido
        newTotalXP,
        xpAwarded: adjustedXP,
        error: null
      };
    });
  } catch (error) {
    logger.error('Error general en addExperiencePoints:', error);
    return { success: false, error };
  }
};
