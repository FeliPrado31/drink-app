import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';

// Initialize Supabase client
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

// Log Supabase configuration for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);
console.log('Supabase Anon Key first 10 chars:', supabaseAnonKey ? supabaseAnonKey.substring(0, 10) : 'none');

// Add optimized options for mobile environments
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false, // Disable auto-detection of OAuth grants in URL for mobile
    autoRefreshToken: true, // Configurado para refrescar automáticamente pero con menos frecuencia
    debug: false, // Disable debug logs for production
    flowType: 'implicit', // Use implicit flow for better mobile performance
    // Set a longer storage key refresh time to reduce frequent checks
    storageKey: 'supabase-auth-token'
  },
  // Global settings to improve performance
  global: {
    headers: { 'X-Client-Info': 'drink-app-mobile' },
    // Increase timeout for better reliability on mobile networks
    fetch: (url, options = {}) => {
      const fetchOptions = {
        ...options,
        // Increase timeout to 30 seconds
        timeout: 30000,
      };
      return fetch(url, fetchOptions);
    },
  },
  // Reduce realtime subscription noise
  realtime: {
    params: {
      eventsPerSecond: 1,
    },
  },
});

// Types for game data
export type GameMode = {
  id: number;
  name: string;
  description: string;
  created_at: string;
};

export type Question = {
  id: number;
  content: string;
  type: 'truth' | 'dare';
  mode_id: number;
  created_at: string;
};

export type Player = {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
};

export type Suggestion = {
  id: number;
  content: string;
  type: 'truth' | 'dare';
  mode_id: number;
  user_id: string;
  votes_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_has_voted?: boolean;
};

export type Settings = {
  key: string;
  value: string;
};

// Authentication functions
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    // Validar el email y la contraseña
    if (!email || !password) {
      return {
        data: null,
        error: new Error('El email y la contraseña son obligatorios')
      };
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        data: null,
        error: new Error('El formato del email no es válido')
      };
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return {
        data: null,
        error: new Error('La contraseña debe tener al menos 6 caracteres')
      };
    }

    // Verificar la conexión a Supabase antes de intentar registrar
    try {
      // Hacer una petición simple para verificar la conexión
      const { error: pingError } = await supabase.from('settings').select('key').limit(1);

      if (pingError) {
        console.error('Error de conexión a Supabase:', pingError);
        return {
          data: null,
          error: new Error('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.')
        };
      }
    } catch (pingError) {
      console.error('Error al verificar la conexión:', pingError);
      return {
        data: null,
        error: new Error('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.')
      };
    }

    // Intentar el registro con manejo de reintentos
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        console.log(`Intento de registro ${4 - retries}/3...`);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          console.error(`Error en intento ${4 - retries}:`, error);
          lastError = error;
          retries--;

          // Si es un error 503, esperar antes de reintentar
          if (error.status === 503) {
            console.log('Servicio temporalmente no disponible. Esperando antes de reintentar...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
          } else {
            // Si es otro tipo de error, no reintentar
            break;
          }
        } else {
          // Éxito, devolver los datos
          return { data, error: null };
        }
      } catch (error) {
        console.error(`Error en intento ${4 - retries}:`, error);
        lastError = error;
        retries--;

        // Esperar antes de reintentar
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('Todos los intentos de registro fallaron:', lastError);

    // Proporcionar un mensaje de error más descriptivo basado en el último error
    let errorMessage = 'Error al registrarse. Por favor, inténtalo de nuevo más tarde.';

    if (lastError) {
      // Verificamos si lastError tiene la propiedad status (para errores de API)
      const errorStatus = (lastError as any).status;
      const errorMsg = (lastError as any).message;

      if (errorStatus === 503) {
        errorMessage = 'El servicio está temporalmente no disponible. Por favor, inténtalo de nuevo más tarde.';
      } else if (errorStatus === 429) {
        errorMessage = 'Demasiados intentos. Por favor, espera unos minutos antes de intentarlo de nuevo.';
      } else if (errorMsg && typeof errorMsg === 'string' && errorMsg.includes('already registered')) {
        errorMessage = 'Este email ya está registrado. Por favor, inicia sesión o usa otro email.';
      }
    }

    return {
      data: null,
      error: new Error(errorMessage)
    };
  } catch (error) {
    console.error('Error en signUpWithEmail:', error);
    return {
      data: null,
      error: new Error('Error al registrarse. Por favor, inténtalo de nuevo.')
    };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    // Validar el email y la contraseña
    if (!email || !password) {
      return {
        data: null,
        error: new Error('El email y la contraseña son obligatorios')
      };
    }

    // Verificar la conexión a Supabase antes de intentar iniciar sesión
    try {
      // Hacer una petición simple para verificar la conexión
      const { error: pingError } = await supabase.from('settings').select('key').limit(1);

      if (pingError) {
        console.error('Error de conexión a Supabase:', pingError);
        return {
          data: null,
          error: new Error('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.')
        };
      }
    } catch (pingError) {
      console.error('Error al verificar la conexión:', pingError);
      return {
        data: null,
        error: new Error('No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.')
      };
    }

    // Intentar el inicio de sesión con manejo de reintentos
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        console.log(`Intento de inicio de sesión ${4 - retries}/3...`);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error(`Error en intento ${4 - retries}:`, error);
          lastError = error;
          retries--;

          // Si es un error 503, esperar antes de reintentar
          if (error.status === 503) {
            console.log('Servicio temporalmente no disponible. Esperando antes de reintentar...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
          } else {
            // Si es otro tipo de error, no reintentar
            break;
          }
        } else {
          // Éxito, devolver los datos
          return { data, error: null };
        }
      } catch (error) {
        console.error(`Error en intento ${4 - retries}:`, error);
        lastError = error;
        retries--;

        // Esperar antes de reintentar
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('Todos los intentos de inicio de sesión fallaron:', lastError);

    // Proporcionar un mensaje de error más descriptivo basado en el último error
    let errorMessage = 'Error al iniciar sesión. Por favor, inténtalo de nuevo más tarde.';

    if (lastError) {
      // Verificamos si lastError tiene la propiedad status (para errores de API)
      const errorStatus = (lastError as any).status;

      if (errorStatus === 503) {
        errorMessage = 'El servicio está temporalmente no disponible. Por favor, inténtalo de nuevo más tarde.';
      } else if (errorStatus === 429) {
        errorMessage = 'Demasiados intentos. Por favor, espera unos minutos antes de intentarlo de nuevo.';
      } else if (errorStatus === 400 || errorStatus === 401) {
        errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
      }
    }

    return {
      data: null,
      error: new Error(errorMessage)
    };
  } catch (error) {
    console.error('Error en signInWithEmail:', error);
    return {
      data: null,
      error: new Error('Error al iniciar sesión. Por favor, inténtalo de nuevo.')
    };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Error en signOut:', error);
    return {
      error: new Error('Error al cerrar sesión. Por favor, inténtalo de nuevo.')
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { user: null, error };
    }

    // Asegurarse de que el email esté disponible
    if (data.user && !data.user.email) {
      try {
        // Si no hay email, intentar obtenerlo de la sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user?.email) {
          data.user.email = sessionData.session.user.email;
        }
      } catch (sessionError) {
        console.error('Error al obtener la sesión:', sessionError);
        // Continuar aunque no se pueda obtener el email
      }
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return {
      user: null,
      error: new Error('Error al obtener el usuario actual. Por favor, inténtalo de nuevo.')
    };
  }
};

// Game functions
export const getGameModes = async () => {
  const { data, error } = await supabase
    .from('game_modes')
    .select('*')
    .order('id');

  return { modes: data as GameMode[], error };
};

export const getQuestionsByMode = async (modeId: number) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('mode_id', modeId);

  return { questions: data as Question[], error };
};

export const getRandomQuestion = async (modeId: number, type?: 'truth' | 'dare') => {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('mode_id', modeId);

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return { question: null, error: error || new Error('No questions found') };
  }

  // Get a random question
  const randomIndex = Math.floor(Math.random() * data.length);
  return { question: data[randomIndex] as Question, error: null };
};

// Suggestion functions
export const createSuggestion = async (content: string, type: 'truth' | 'dare', modeId: number) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { suggestion: null, error: new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      content,
      type,
      mode_id: modeId,
      user_id: user.id,
      votes_count: 0,
      status: 'pending'
    })
    .select()
    .single();

  return { suggestion: data as Suggestion, error };
};

export const getSuggestions = async (status: 'pending' | 'approved' | 'rejected' = 'pending', forceRefresh: boolean = true) => {
  try {
    console.log(`Obteniendo sugerencias con estado: ${status}`);

    // Verificar que el usuario esté autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado al obtener sugerencias');
      return { suggestions: [], error: new Error('Usuario no autenticado') };
    }

    // Obtener todas las sugerencias con el estado especificado
    // Primero, actualizar el conteo real de votos para cada sugerencia
    if (forceRefresh) {
      // Utilizar el endpoint RPC para actualizar todos los contadores de votos
      console.log('Actualizando contadores de votos en la base de datos...');
      try {
        const { success, error } = await updateAllVoteCounts();

        if (error) {
          console.error('Error al actualizar contadores de votos mediante RPC:', error);
          // Continuar con la consulta normal aunque falle la actualización
        } else if (success) {
          console.log('Contadores actualizados correctamente mediante RPC');
        }
      } catch (e) {
        console.error('Error al actualizar contadores de votos:', e);
        // Continuar con la consulta normal aunque falle la actualización
      }
    }

    // Ahora obtener las sugerencias con los contadores actualizados
    let query = supabase
      .from('suggestions')
      .select('*, game_modes(name)')
      .eq('status', status);

    // Ordenar por fecha de creación (más recientes primero)
    query = query.order('created_at', { ascending: false });

    // Añadir un parámetro aleatorio para evitar caché
    const timestamp = new Date().getTime();
    console.log(`Forzando consulta fresca con timestamp: ${timestamp}`);

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener sugerencias:', error);
      return { suggestions: [], error: error };
    }

    if (!data || data.length === 0) {
      console.log(`No se encontraron sugerencias con estado: ${status}`);
      return { suggestions: [], error: null };
    }

    console.log(`Se encontraron ${data.length} sugerencias con estado: ${status}`);

    // Verificar por cuáles sugerencias ha votado el usuario actual
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('suggestion_id')
      .eq('user_id', user.id);

    if (votesError) {
      console.error('Error al obtener votos del usuario:', votesError);
      return { suggestions: [], error: votesError };
    }

    // Crear un conjunto de IDs de sugerencias por las que el usuario ha votado
    const votedSuggestionIds = new Set((votes || []).map(vote => vote.suggestion_id));
    console.log(`El usuario ha votado por ${votedSuggestionIds.size} sugerencias`);

    // Añadir la bandera user_has_voted a cada sugerencia
    const suggestionsWithVoteStatus = data.map(suggestion => ({
      ...suggestion,
      user_has_voted: votedSuggestionIds.has(suggestion.id)
    }));

    return { suggestions: suggestionsWithVoteStatus as Suggestion[], error: null };
  } catch (error) {
    console.error('Error inesperado al obtener sugerencias:', error);
    return {
      suggestions: [],
      error: new Error('Ocurrió un error inesperado al obtener las sugerencias. Por favor, inténtalo de nuevo.')
    };
  }
};

export const voteSuggestion = async (suggestionId: number) => {
  try {
    console.log(`Iniciando votación para sugerencia ID: ${suggestionId}`);

    // Verificar que el usuario esté autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('Error: Usuario no autenticado al intentar votar');
      return { error: new Error('Usuario no autenticado'), success: false };
    }

    // Verificar primero que la sugerencia existe
    const { data: suggestionExists, error: checkError } = await supabase
      .from('suggestions')
      .select('id, content, type, mode_id, votes_count')
      .eq('id', suggestionId);

    if (checkError) {
      console.error(`Error al verificar la sugerencia ${suggestionId}:`, checkError);
      return { error: checkError, success: false };
    }

    if (!suggestionExists || suggestionExists.length === 0) {
      console.error(`Error: La sugerencia con ID ${suggestionId} no existe`);
      return { error: new Error(`La sugerencia con ID ${suggestionId} no existe`), success: false };
    }

    // Verificar si el usuario ya ha votado por esta sugerencia
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('votes')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', user.id);

    if (voteCheckError) {
      console.error('Error al verificar voto existente:', voteCheckError);
      return { error: voteCheckError, success: false };
    }

    if (existingVote && existingVote.length > 0) {
      console.log(`El usuario ${user.id} ya ha votado por la sugerencia ${suggestionId}`);
      return { error: new Error('Ya has votado por esta sugerencia'), success: false };
    }

    // Obtener la sugerencia actual
    const suggestion = suggestionExists[0];

    // Registrar el voto
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        suggestion_id: suggestionId,
        user_id: user.id
      });

    if (voteError) {
      console.error('Error al insertar voto:', voteError);
      if (voteError.code === '23505') { // Unique constraint violation
        return { error: new Error('Ya has votado por esta sugerencia'), success: false };
      }
      return { error: voteError, success: false };
    }

    console.log(`Voto registrado correctamente. El trigger actualizará el contador automáticamente.`);

    // Esperar un momento más largo para asegurar que el trigger haya actualizado el contador
    await new Promise(resolve => setTimeout(resolve, 300));

    // Actualizar todos los contadores de votos mediante RPC
    const { success, error: rpcError } = await updateAllVoteCounts();

    if (rpcError) {
      console.error('Error al actualizar contadores mediante RPC:', rpcError);

      // Si falla el RPC, intentar actualizar manualmente solo esta sugerencia
      const { data: votes, error: countError } = await supabase
        .from('votes')
        .select('id')
        .eq('suggestion_id', suggestionId);

      if (countError) {
        console.error(`Error al contar votos para sugerencia ${suggestionId}:`, countError);
        // Continuar con la sugerencia actualizada aunque falle el conteo
      } else if (votes) {
        // Actualizar el contador de votos con el número real de votos
        const voteCount = votes.length;
        console.log(`Sugerencia ${suggestionId}: ${voteCount} votos contados manualmente`);

        // Actualizar el contador en la base de datos
        const { error: updateError } = await supabase
          .from('suggestions')
          .update({ votes_count: voteCount })
          .eq('id', suggestionId);

        if (updateError) {
          console.error(`Error al actualizar contador para sugerencia ${suggestionId}:`, updateError);
        } else {
          console.log(`Contador actualizado manualmente a ${voteCount} votos`);
        }
      }
    } else {
      console.log('Contadores de votos actualizados correctamente mediante RPC');
    }

    // Obtener la sugerencia actualizada después de insertar el voto y actualizar el contador
    const { data: updatedSuggestion, error: updateError } = await supabase
      .from('suggestions')
      .select('*, game_modes(name)')
      .eq('id', suggestionId)
      .single();

    if (updateError) {
      console.error('Error al obtener la sugerencia actualizada:', updateError);
      return { error: updateError, success: false };
    }

    // Verificar si el contador en la sugerencia actualizada es correcto
    // Obtener el conteo actual de votos para esta sugerencia
    const { data: currentVotes, error: finalCountError } = await supabase
      .from('votes')
      .select('id')
      .eq('suggestion_id', suggestionId);

    if (!finalCountError && currentVotes && updatedSuggestion) {
      const voteCount = currentVotes.length;
      if (updatedSuggestion.votes_count !== voteCount) {
        console.log(`Corrigiendo contador en objeto de respuesta: ${updatedSuggestion.votes_count} -> ${voteCount}`);
        updatedSuggestion.votes_count = voteCount;
      }
    }

    // Obtener el conteo actualizado de votos
    const currentVotesCount = updatedSuggestion?.votes_count || 0;

    // Verificar si la sugerencia ha alcanzado los votos mínimos requeridos
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'min_votes_required');

    if (settingsError) {
      console.error('Error al obtener configuración de votos mínimos:', settingsError);
      return { error: settingsError, success: false };
    }

    if (!settings || settings.length === 0) {
      console.error('No se encontró la configuración de votos mínimos');
      return { error: new Error('No se encontró la configuración de votos mínimos'), success: false };
    }

    const minVotesRequired = parseInt(settings[0].value, 10);
    console.log(`Votos mínimos requeridos: ${minVotesRequired}, votos actuales: ${currentVotesCount}`);

    // Si la sugerencia ha alcanzado los votos mínimos, aprobarla y añadirla a las preguntas
    if (currentVotesCount >= minVotesRequired) {
      console.log(`La sugerencia ${suggestionId} ha alcanzado los votos mínimos. Aprobando...`);

      // Actualizar el estado de la sugerencia a aprobado
      const { error: approveError } = await supabase
        .from('suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestionId);

      if (approveError) {
        console.error('Error al aprobar la sugerencia:', approveError);
        return { error: approveError, success: false };
      }

      // Añadir la sugerencia a la tabla de preguntas
      const { error: addQuestionError } = await supabase
        .from('questions')
        .insert({
          content: suggestion.content,
          type: suggestion.type,
          mode_id: suggestion.mode_id
        });

      if (addQuestionError) {
        console.error('Error al añadir la sugerencia como pregunta:', addQuestionError);
        return { error: addQuestionError, success: false };
      }

      console.log(`Sugerencia ${suggestionId} aprobada y añadida como pregunta correctamente`);
    }

    console.log(`Voto registrado correctamente para la sugerencia ${suggestionId}`);
    return {
      error: null,
      success: true,
      suggestion: updatedSuggestion
    };
  } catch (error) {
    console.error('Error inesperado al votar por sugerencia:', error);
    return {
      error: new Error('Ocurrió un error inesperado al procesar tu voto. Por favor, inténtalo de nuevo.'),
      success: false
    };
  }
};

export const getSettings = async (key: string) => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    return { value: null, error };
  }

  return { value: data.value, error: null };
};

// Función para actualizar todos los contadores de votos utilizando el endpoint RPC
export const updateAllVoteCounts = async () => {
  try {
    console.log('Actualizando todos los contadores de votos mediante RPC...');

    const { data, error } = await supabase
      .rpc('update_vote_counts');

    if (error) {
      console.error('Error al actualizar contadores de votos mediante RPC:', error);
      return { success: false, error };
    }

    console.log('Contadores de votos actualizados correctamente mediante RPC:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado al actualizar contadores de votos:', error);
    return {
      success: false,
      error: new Error('Ocurrió un error inesperado al actualizar los contadores de votos.')
    };
  }
};
