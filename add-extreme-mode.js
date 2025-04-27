// Script para agregar el modo de juego "Extremo" y sus preguntas/retos
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verificar que las variables de entorno estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY deben estar definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para agregar el modo de juego "Extremo"
const addExtremeMode = async () => {
  try {
    console.log('Agregando modo de juego "Extremo"...');

    // Verificar si el modo ya existe
    const { data: existingModes, error: checkError } = await supabase
      .from('game_modes')
      .select('id')
      .eq('name', 'Extremo');

    if (checkError) {
      throw checkError;
    }

    // Si el modo ya existe, no lo creamos de nuevo
    if (existingModes && existingModes.length > 0) {
      console.log('El modo "Extremo" ya existe con ID:', existingModes[0].id);
      return existingModes[0].id;
    }

    // Agregar el nuevo modo
    const { data, error } = await supabase
      .from('game_modes')
      .insert({
        name: 'Extremo',
        description: 'Retos y verdades para adultos. ¡Solo para valientes!'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Modo "Extremo" agregado con ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error al agregar el modo "Extremo":', error);
    throw error;
  }
};

// Función para agregar preguntas/retos al modo "Extremo"
const addExtremeQuestions = async (modeId) => {
  try {
    console.log('Agregando preguntas y retos para el modo "Extremo"...');

    // Lista de verdades para el modo "Extremo"
    const truths = [
      "¿Con quién de los presentes te acostarías esta noche?",
      "¿Cuál ha sido tu fantasía sexual más atrevida?",
      "¿Alguna vez has tenido un sueño erótico con alguien de esta habitación?",
      "¿Cuál es la parte del cuerpo que más te excita?",
      "¿Alguna vez has enviado fotos íntimas a alguien?",
      "¿Cuál ha sido el lugar más extraño donde has tenido relaciones?",
      "¿Alguna vez has sido infiel? Cuenta los detalles",
      "¿Qué es lo más atrevido que has hecho en público?",
      "¿Con cuántas personas has estado íntimamente?",
      "¿Alguna vez has tenido un encuentro de una noche?",
      "¿Cuál es tu posición favorita?",
      "¿Alguna vez has tenido fantasías con alguien del mismo sexo?",
      "¿Qué es lo más vergonzoso que te ha pasado durante el sexo?",
      "¿Alguna vez has fingido un orgasmo?",
      "¿Cuál es tu mayor fetiche sexual?"
    ];

    // Lista de retos para el modo "Extremo"
    const dares = [
      "Besa en los labios a la persona de tu izquierda durante 5 segundos",
      "Quítate una prenda de ropa y juega sin ella durante 3 rondas",
      "Haz un baile sensual para la persona que elijas",
      "Deja que la persona a tu derecha te dé una nalgada",
      "Muestra la última foto comprometedora que tengas en tu teléfono",
      "Siéntate en las piernas de alguien del grupo durante la siguiente ronda",
      "Haz tu mejor imitación de un orgasmo",
      "Deja que alguien del grupo te dibuje algo en una parte oculta de tu cuerpo",
      "Cuenta una experiencia sexual vergonzosa",
      "Besa el cuello de la persona más atractiva del grupo según tu criterio",
      "Quítate los zapatos y deja que alguien te haga cosquillas en los pies",
      "Intercambia una prenda con la persona que elijas",
      "Deja que alguien te vende los ojos y adivina quién te está tocando",
      "Haz un masaje de 30 segundos a quien tú elijas",
      "Muestra tu mejor cara de placer"
    ];

    // Preparar los objetos para insertar
    const truthQuestions = truths.map(content => ({
      content,
      type: 'truth',
      mode_id: modeId
    }));

    const dareQuestions = dares.map(content => ({
      content,
      type: 'dare',
      mode_id: modeId
    }));

    const allQuestions = [...truthQuestions, ...dareQuestions];

    // Insertar las preguntas en lotes para evitar límites de tamaño
    const batchSize = 10;
    for (let i = 0; i < allQuestions.length; i += batchSize) {
      const batch = allQuestions.slice(i, i + batchSize);
      const { error } = await supabase
        .from('questions')
        .insert(batch);

      if (error) {
        throw error;
      }
    }

    console.log(`Se agregaron ${allQuestions.length} preguntas/retos al modo "Extremo"`);
  } catch (error) {
    console.error('Error al agregar preguntas/retos:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    // Agregar el modo "Extremo"
    const modeId = await addExtremeMode();

    // Agregar preguntas/retos al modo "Extremo"
    await addExtremeQuestions(modeId);

    console.log('¡Proceso completado con éxito!');
  } catch (error) {
    console.error('Error en el proceso:', error);
  }
};

// Ejecutar la función principal
main();
