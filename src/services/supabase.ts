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
    autoRefreshToken: true,
    debug: true, // Enable debug logs for troubleshooting
    flowType: 'implicit', // Use implicit flow for better mobile performance
    // Set a longer storage key refresh time to reduce frequent checks
    storageKey: 'supabase-auth-token',
  },
  // Global settings to improve performance
  global: {
    headers: { 'X-Client-Info': 'drink-app-mobile' },
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { data, error };
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
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

export const getSuggestions = async (status: 'pending' | 'approved' | 'rejected' = 'pending') => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { suggestions: [], error: new Error('Usuario no autenticado') };
  }

  // Get all suggestions with the specified status
  const { data, error } = await supabase
    .from('suggestions')
    .select('*, game_modes(name)')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return { suggestions: [], error: error || new Error('Error al obtener sugerencias') };
  }

  // Check if the current user has voted for each suggestion
  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .select('suggestion_id')
    .eq('user_id', user.id);

  if (votesError) {
    return { suggestions: [], error: votesError };
  }

  // Create a set of suggestion IDs that the user has voted for
  const votedSuggestionIds = new Set((votes || []).map(vote => vote.suggestion_id));

  // Add user_has_voted flag to each suggestion
  const suggestionsWithVoteStatus = data.map(suggestion => ({
    ...suggestion,
    user_has_voted: votedSuggestionIds.has(suggestion.id)
  }));

  return { suggestions: suggestionsWithVoteStatus as Suggestion[], error: null };
};

export const voteSuggestion = async (suggestionId: number) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Usuario no autenticado') };
  }

  // Start a transaction
  const { error: voteError } = await supabase
    .from('votes')
    .insert({
      suggestion_id: suggestionId,
      user_id: user.id
    });

  if (voteError) {
    if (voteError.code === '23505') { // Unique constraint violation
      return { error: new Error('Ya has votado por esta sugerencia') };
    }
    return { error: voteError };
  }

  // First get the current votes count
  const { data: currentData, error: getError } = await supabase
    .from('suggestions')
    .select('votes_count')
    .eq('id', suggestionId)
    .single();

  if (getError) {
    return { error: getError };
  }

  // Increment the votes_count in the suggestions table
  const newVotesCount = (currentData.votes_count || 0) + 1;

  const { data, error: updateError } = await supabase
    .from('suggestions')
    .update({ votes_count: newVotesCount })
    .eq('id', suggestionId)
    .select()
    .single();

  if (updateError) {
    return { error: updateError };
  }

  // Check if the suggestion has reached the minimum votes required
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'min_votes_required')
    .single();

  if (settingsError) {
    return { error: settingsError };
  }

  const minVotesRequired = parseInt(settings.value, 10);

  // If the suggestion has reached the minimum votes, approve it and add it to the questions table
  if (data.votes_count >= minVotesRequired) {
    // Update the suggestion status to approved
    const { error: approveError } = await supabase
      .from('suggestions')
      .update({ status: 'approved' })
      .eq('id', suggestionId);

    if (approveError) {
      return { error: approveError };
    }

    // Add the suggestion to the questions table
    const { error: addQuestionError } = await supabase
      .from('questions')
      .insert({
        content: data.content,
        type: data.type,
        mode_id: data.mode_id
      });

    if (addQuestionError) {
      return { error: addQuestionError };
    }
  }

  return { error: null };
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
