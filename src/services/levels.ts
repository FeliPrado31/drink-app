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
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { userLevel: null, error: new Error('Usuario no autenticado') };
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

              return { userLevel: combinedLevel as UserLevel, error: null };
            }

            // Si no podemos obtener la definición, devolver solo el nivel básico
            return { userLevel: basicLevel as UserLevel, error: null };
          }

          // Si no podemos obtener ni siquiera el nivel básico, crear uno nuevo
        }
      } else {
        // Se encontró el registro, devolverlo
        return { userLevel: data as UserLevel, error: null };
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
      return {
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
    }

    try {
      // Crear registro de nivel para el usuario
      const { data: newLevel, error: createError } = await supabase
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

      // Combinar manualmente el nivel con su definición
      const userLevel = {
        ...newLevel,
        level_definitions: levelOne
      };

      return { userLevel: userLevel as UserLevel, error: null };
    } catch (insertError) {
      console.error('Error inesperado al crear nivel de usuario:', insertError);
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
      // Calcular XP basado en logros
      const { xp, error: xpError } = await calculateExperienceFromAchievements();

      if (xpError) {
        console.error('Error al calcular experiencia:', xpError);
        throw xpError;
      }

      console.log('Experiencia total calculada:', xp);

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
        if (xp >= level.xp_required) {
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
        const { data: existingLevel, error: checkError } = await supabase
          .from('user_levels')
          .select('id, level')
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          if (checkError.code === 'PGRST116') {
            console.log('No se encontró registro de nivel para el usuario, creando uno nuevo...');
          } else {
            console.error('Error al verificar nivel existente:', checkError);
            throw checkError;
          }
        }

        if (!existingLevel) {
          console.log('Creando nuevo registro de nivel para el usuario');
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
            console.error('Error al insertar nivel:', insertError);
            throw insertError;
          }

          console.log(`Nivel inicial creado: ${currentLevel}`);
          return { leveledUp: true, newLevel: currentLevel, error: null };
        } else {
          console.log(`Nivel existente: ${existingLevel.level}, Nuevo nivel: ${currentLevel}`);

          // Verificar si el usuario subió de nivel
          const leveledUp = currentLevel > existingLevel.level;

          if (leveledUp) {
            console.log(`¡El usuario ha subido de nivel! ${existingLevel.level} -> ${currentLevel}`);
          }

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
