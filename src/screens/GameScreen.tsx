import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { Button, Icon } from 'react-native-elements';
import { getRandomQuestion, Question, Player } from '../services/supabase';
import { useAchievements } from '../context/AchievementsContext';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { addExperiencePoints } from '../services/levels';

type GameScreenProps = {
  navigation: any;
  route: {
    params: {
      modeId: number;
      modeName: string;
      players: Player[];
    };
  };
};

const GameScreen: React.FC<GameScreenProps> = ({ navigation, route }) => {
  const { modeId, modeName, players } = route.params;
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'truth' | 'dare' | null>(null);
  const [shotCount, setShotCount] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(players[0]);
  const [gameStats, setGameStats] = useState({
    truthCount: 0,
    dareCount: 0,
    shotsTaken: 0,
    isFirstGame: true,
    playedExtreme: modeName === 'Extremo',
    uniquePlayers: new Set(players.map(p => p.name))
  });

  // Referencias para animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Acceder al contexto de logros
  const { trackAchievements, updateStats } = useAchievements();

  // Estado para rastrear ubicaciones
  const [locations, setLocations] = useState<Set<string>>(new Set());

  // Update current player when index changes
  useEffect(() => {
    setCurrentPlayer(players[currentPlayerIndex]);

    // Animar la transición de jugador
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  }, [currentPlayerIndex, players]);

  // Verificar logros al montar el componente
  useEffect(() => {
    const initGame = async () => {
      // Verificar logro de jugar en modo Extremo
      if (modeName === 'Extremo') {
        trackAchievements([{ code: 'extreme_player' }]);
      }

      // Verificar logro de primer juego
      trackAchievements([{ code: 'first_game' }]);

      // Verificar logro de mariposa social (jugar con muchos jugadores diferentes)
      trackAchievements([
        { code: 'social_butterfly', increment: gameStats.uniquePlayers.size }
      ]);

      // Verificar logro de jugar después de la medianoche
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 5) {
        trackAchievements([{ code: 'night_owl' }]);
      }

      // Verificar logro de jugar en fin de semana
      const currentDay = new Date().getDay();
      if (currentDay === 5 || currentDay === 6 || currentDay === 0) { // Viernes, Sábado o Domingo
        trackAchievements([{ code: 'weekend_warrior' }]);
      }

      // Obtener ubicación para el logro de jugador global
      try {
        // Verificar si la API de ubicación está disponible
        const isAvailable = await Location.hasServicesEnabledAsync();

        if (!isAvailable) {
          console.log('Los servicios de ubicación no están disponibles');
          return;
        }

        // Solicitar permisos
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.log('Permiso de ubicación denegado');
          return;
        }

        // Obtener ubicación con un timeout para evitar bloqueos
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          mayShowUserSettingsDialog: true
        });

        // Redondear a 2 decimales para considerar áreas generales, no ubicaciones exactas
        const locationKey = `${location.coords.latitude.toFixed(2)},${location.coords.longitude.toFixed(2)}`;

        // Guardar la ubicación actual
        setLocations(prev => {
          const newLocations = new Set(prev);
          newLocations.add(locationKey);

          // Verificar logro de jugador global si hay 3 o más ubicaciones
          if (newLocations.size >= 3) {
            trackAchievements([{ code: 'global_player', increment: newLocations.size }]);
          }

          return newLocations;
        });
      } catch (error) {
        console.log('Error al obtener ubicación:', error);
        // No interrumpir el flujo del juego si hay errores con la ubicación
      }

      // Actualizar estadísticas
      updateStats({
        total_games: 1,
        last_played_at: new Date().toISOString()
      });

      // Añadir puntos de experiencia por iniciar un juego
      try {
        // Dar más XP si es modo Extremo
        const xpAmount = modeName === 'Extremo' ? 50 : 25;
        const result = await addExperiencePoints(xpAmount, `Inició juego en modo ${modeName}`);

        // Si hay límites, mostrar un mensaje sutil pero permitir continuar
        if (!result.success && result.limitReached) {
          Alert.alert(
            'Límite de XP diario',
            'Has alcanzado el límite de XP por hoy, pero puedes seguir jugando normalmente.',
            [{ text: 'Entendido' }]
          );
        } else if (result.success && players.length > 1) {
          // Dar XP adicional por cada jugador solo si no se alcanzó el límite
          // (incentiva jugar con más amigos)
          await addExperiencePoints(players.length * 5, `Jugó con ${players.length} jugadores`);
        }
      } catch (error) {
        console.error('Error al añadir puntos de experiencia por iniciar juego:', error);
      }
    };

    initGame();
  }, []);

  // Actualizar el jugador actual cuando cambia el índice
  useEffect(() => {
    setCurrentPlayer(players[currentPlayerIndex]);
  }, [currentPlayerIndex, players]);

  // Caché de preguntas para mejorar el rendimiento
  const [questionCache, setQuestionCache] = useState<{
    truth: Question[];
    dare: Question[];
    random: Question[];
  }>({
    truth: [],
    dare: [],
    random: []
  });

  // Función para precargar preguntas en caché
  const preloadQuestions = async () => {
    try {
      // Precargar 5 preguntas de cada tipo
      const truthPromise = Promise.all(Array(5).fill(0).map(() => getRandomQuestion(modeId, 'truth')));
      const darePromise = Promise.all(Array(5).fill(0).map(() => getRandomQuestion(modeId, 'dare')));
      const randomPromise = Promise.all(Array(5).fill(0).map(() => getRandomQuestion(modeId)));

      const [truthResults, dareResults, randomResults] = await Promise.all([truthPromise, darePromise, randomPromise]);

      // Filtrar solo las preguntas válidas
      const truthQuestions = truthResults.filter(result => !result.error && result.question).map(result => result.question!);
      const dareQuestions = dareResults.filter(result => !result.error && result.question).map(result => result.question!);
      const randomQuestions = randomResults.filter(result => !result.error && result.question).map(result => result.question!);

      setQuestionCache({
        truth: truthQuestions,
        dare: dareQuestions,
        random: randomQuestions
      });
    } catch (error) {
      console.error('Error al precargar preguntas:', error);
    }
  };

  // Precargar preguntas cuando se monta el componente
  useEffect(() => {
    preloadQuestions();
  }, [modeId]);

  const fetchQuestion = async (type?: 'truth' | 'dare') => {
    try {
      setLoading(true);

      let question: Question | null = null;
      let cacheKey: 'truth' | 'dare' | 'random' = type || 'random';

      // Intentar obtener pregunta de la caché primero
      if (questionCache[cacheKey].length > 0) {
        // Obtener una pregunta aleatoria de la caché
        const randomIndex = Math.floor(Math.random() * questionCache[cacheKey].length);
        question = questionCache[cacheKey][randomIndex];

        // Eliminar la pregunta usada de la caché
        setQuestionCache(prev => ({
          ...prev,
          [cacheKey]: prev[cacheKey].filter((_, index) => index !== randomIndex)
        }));

        // Si la caché se está agotando, precargar más preguntas en segundo plano
        if (questionCache[cacheKey].length < 2) {
          setTimeout(() => {
            preloadQuestions();
          }, 100);
        }
      } else {
        // Si no hay preguntas en caché, obtener una nueva
        const { question: newQuestion, error } = await getRandomQuestion(modeId, type);

        if (error) {
          console.error('Error al obtener pregunta:', error);
          return;
        }

        question = newQuestion;
      }

      if (!question) {
        console.error('No se pudo obtener una pregunta');
        return;
      }

      // Reiniciar animaciones antes de mostrar la nueva pregunta
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(50);

      setCurrentQuestion(question);
      setSelectedType(type || null);

      // Animar la aparición de la pregunta (más rápido)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300, // Reducido de 500ms a 300ms
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300, // Reducido de 500ms a 300ms
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300, // Reducido de 500ms a 300ms
          useNativeDriver: true
        })
      ]).start();
    } catch (err: any) {
      console.error('Error al cargar pregunta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTruth = () => {
    // Mostrar la pregunta inmediatamente para mejorar la experiencia del usuario
    fetchQuestion('truth');

    // Actualizar estadísticas locales inmediatamente
    setGameStats(prev => ({
      ...prev,
      truthCount: prev.truthCount + 1
    }));

    // Procesar XP y logros en segundo plano
    setTimeout(async () => {
      try {
        // Añadir puntos de experiencia (10 XP por elegir verdad)
        const result = await addExperiencePoints(10, 'Eligió verdad');

        // Si la acción está en cooldown o se alcanzó un límite, solo mostrar mensaje
        if (!result.success) {
          if (result.cooldown) {
            console.log('Acción en cooldown, ignorando');
            return;
          }

          if (result.limitReached) {
            console.log('Límite de XP alcanzado para verdad');
            return;
          }
        }

        // Verificar logro de maestro de la verdad
        trackAchievements([{ code: 'truth_master' }]);

        // Verificar logro de buscador de verdades (20 verdades consecutivas)
        if (gameStats.dareCount === 0 && gameStats.truthCount >= 19) {
          trackAchievements([{ code: 'truth_seeker' }]);
        }

        // Actualizar estadísticas en la base de datos
        updateStats({ truth_count: 1 });
      } catch (error) {
        console.error('Error al añadir puntos de experiencia:', error);
      }
    }, 100); // Retrasar 100ms para priorizar la UI
  };

  const handleDare = () => {
    // Mostrar la pregunta inmediatamente para mejorar la experiencia del usuario
    fetchQuestion('dare');

    // Actualizar estadísticas locales inmediatamente
    setGameStats(prev => ({
      ...prev,
      dareCount: prev.dareCount + 1
    }));

    // Procesar XP y logros en segundo plano
    setTimeout(async () => {
      try {
        // Añadir puntos de experiencia (15 XP por elegir reto - más que verdad porque es más arriesgado)
        const result = await addExperiencePoints(15, 'Eligió reto');

        // Si la acción está en cooldown o se alcanzó un límite, solo mostrar mensaje
        if (!result.success) {
          if (result.cooldown) {
            console.log('Acción en cooldown, ignorando');
            return;
          }

          if (result.limitReached) {
            console.log('Límite de XP alcanzado para reto');
            return;
          }
        }

        // Verificar logro de maestro del reto
        trackAchievements([{ code: 'dare_master' }]);

        // Verificar logro de atrevido (20 retos consecutivos)
        if (gameStats.truthCount === 0 && gameStats.dareCount >= 19) {
          trackAchievements([{ code: 'dare_devil' }]);
        }

        // Actualizar estadísticas en la base de datos
        updateStats({ dare_count: 1 });
      } catch (error) {
        console.error('Error al añadir puntos de experiencia:', error);
      }
    }, 100); // Retrasar 100ms para priorizar la UI
  };

  const handleRandom = () => {
    // Mostrar la pregunta inmediatamente para mejorar la experiencia del usuario
    fetchQuestion();

    // Procesar XP en segundo plano
    setTimeout(async () => {
      try {
        // Añadir puntos de experiencia (5 XP por elegir aleatorio)
        const result = await addExperiencePoints(5, 'Eligió aleatorio');

        // Si la acción está en cooldown o se alcanzó un límite, solo mostrar mensaje
        if (!result.success) {
          if (result.cooldown) {
            console.log('Acción en cooldown, ignorando');
            return;
          }

          if (result.limitReached) {
            console.log('Límite de XP alcanzado para aleatorio');
            return;
          }
        }
      } catch (error) {
        console.error('Error al añadir puntos de experiencia:', error);
      }
    }, 100); // Retrasar 100ms para priorizar la UI
  };

  // Función auxiliar para obtener el pronombre correcto según el género
  const getPronoun = (type: 'subject' | 'object' | 'possessive') => {
    switch (currentPlayer.gender) {
      case 'male':
        return type === 'subject' ? 'él' : type === 'object' ? 'lo' : 'su';
      case 'female':
        return type === 'subject' ? 'ella' : type === 'object' ? 'la' : 'su';
      default:
        return type === 'subject' ? 'elle' : type === 'object' ? 'le' : 'su';
    }
  };

  const resetForNextPlayer = () => {
    // Cambiar al siguiente jugador
    const nextIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIndex);

    // Reiniciar animaciones para la transición
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    slideAnim.setValue(50);

    // Reiniciar pregunta actual para mostrar pantalla de selección
    setCurrentQuestion(null);
    // Reiniciar tipo seleccionado
    setSelectedType(null);

    // Animar la aparición de la nueva pantalla
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleRefuse = () => {
    // Actualizar estadísticas locales inmediatamente
    setGameStats(prev => ({
      ...prev,
      shotsTaken: prev.shotsTaken + shotCount
    }));

    // Reiniciar contadores de racha para los logros de verdad/reto consecutivos
    if (selectedType === 'truth') {
      setGameStats(prev => ({ ...prev, truthCount: 0 }));
    } else {
      setGameStats(prev => ({ ...prev, dareCount: 0 }));
    }

    // Mostrar alerta inmediatamente
    Alert.alert(
      '¡Toma un Shot!',
      `¡${currentPlayer.name} rechazó el ${selectedType === 'truth' ? 'reto de verdad' : 'desafío'}! ${getPronoun('subject')} debe tomar ${shotCount} shot${shotCount > 1 ? 's' : ''}.`,
      [
        {
          text: 'Shots Tomados',
          onPress: () => {
            // Aumentar contador de shots para el próximo rechazo
            setShotCount(prev => prev + 1);
            // Reiniciar para el siguiente jugador
            resetForNextPlayer();
          },
        },
      ]
    );

    // Procesar XP y logros en segundo plano
    setTimeout(async () => {
      try {
        // Añadir puntos de experiencia (3 XP por cada shot tomado)
        const result = await addExperiencePoints(3 * shotCount, 'Tomó shots');

        // Verificar logro de bebedor valiente
        trackAchievements([{ code: 'shot_taker', increment: shotCount }]);

        // Verificar logro de maestro de shots
        trackAchievements([{ code: 'shot_master', increment: shotCount }]);

        // Actualizar estadísticas en la base de datos
        updateStats({ shots_taken: shotCount });
      } catch (error) {
        console.error('Error al añadir puntos de experiencia:', error);
      }
    }, 100); // Retrasar 100ms para priorizar la UI
  };

  const handleComplete = () => {
    // Mostrar alerta inmediatamente
    Alert.alert(
      '¡Bien Hecho!',
      `¡${currentPlayer.name} completó el desafío! Turno del siguiente jugador.`,
      [
        {
          text: 'Siguiente Jugador',
          onPress: () => {
            // Reiniciar para el siguiente jugador
            resetForNextPlayer();
          },
        },
      ]
    );

    // Procesar XP y logros en segundo plano
    setTimeout(async () => {
      try {
        // Añadir puntos de experiencia (20 XP por completar un desafío)
        const result = await addExperiencePoints(20, 'Completó desafío');

        // Verificar logro de racha perfecta
        if (shotCount >= 10) {
          trackAchievements([{ code: 'perfect_streak' }]);
        }
      } catch (error) {
        console.error('Error al añadir puntos de experiencia:', error);
      }
    }, 100); // Retrasar 100ms para priorizar la UI
  };

  // Función para obtener un color basado en el género
  const getGenderColor = (gender: 'male' | 'female' | 'other') => {
    switch (gender) {
      case 'male': return '#2196f3';
      case 'female': return '#e91e63';
      case 'other': return '#9c27b0';
      default: return '#607d8b';
    }
  };

  // Función para obtener un icono basado en el género
  const getGenderIcon = (gender: 'male' | 'female' | 'other') => {
    switch (gender) {
      case 'male': return 'man';
      case 'female': return 'woman';
      case 'other': return 'person';
      default: return 'person';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff5722" />

      {/* Header con gradiente */}
      <LinearGradient
        colors={['#ff5722', '#ff9800']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Modo {modeName}</Text>

        <Animated.View
          style={[
            styles.playerInfoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <View style={[styles.playerAvatar, { backgroundColor: getGenderColor(currentPlayer.gender) }]}>
            <Icon
              name={getGenderIcon(currentPlayer.gender)}
              type="material"
              size={24}
              color="white"
            />
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerLabel}>Turno de:</Text>
            <Text style={styles.playerName}>{currentPlayer.name}</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!currentQuestion ? (
          <Animated.View
            style={[
              styles.choiceContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim }
                ]
              }
            ]}
          >
            <Text style={styles.instructionText}>
              {currentPlayer.name}, elige tu destino:
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.choiceButton, styles.truthChoiceButton]}
                onPress={handleTruth}
                disabled={loading}
              >
                <Icon name="question-answer" type="material" size={40} color="white" />
                <Text style={styles.choiceButtonText}>Verdad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceButton, styles.dareChoiceButton]}
                onPress={handleDare}
                disabled={loading}
              >
                <Icon name="local-fire-department" type="material" size={40} color="white" />
                <Text style={styles.choiceButtonText}>Reto</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.choiceButton, styles.randomChoiceButton]}
              onPress={handleRandom}
              disabled={loading}
            >
              <Icon name="shuffle" type="material" size={30} color="white" />
              <Text style={styles.choiceButtonText}>Aleatorio</Text>
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Cargando...</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.questionContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={selectedType === 'truth' ?
                ['#2196f3', '#03a9f4'] :
                ['#f44336', '#ff5722']}
              style={styles.questionCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.questionTypeContainer}>
                <Icon
                  name={selectedType === 'truth' ? 'question-answer' : 'local-fire-department'}
                  type="material"
                  size={24}
                  color="white"
                />
                <Text style={styles.questionType}>
                  {selectedType === 'truth' ? 'VERDAD' : 'RETO'}
                </Text>
              </View>
              <Text style={styles.questionText}>{currentQuestion.content}</Text>
            </LinearGradient>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.refuseButton]}
                onPress={handleRefuse}
              >
                <Icon name="close" type="material" size={24} color="white" />
                <Text style={styles.actionButtonText}>
                  Me Niego ({shotCount} {shotCount === 1 ? 'shot' : 'shots'})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleComplete}
              >
                <Icon name="check" type="material" size={24} color="white" />
                <Text style={styles.actionButtonText}>Completado</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Información de jugadores */}
        <View style={styles.playersListContainer}>
          <Text style={styles.playersListTitle}>Jugadores:</Text>
          <View style={styles.playersList}>
            {players.map((player, index) => (
              <View
                key={player.id}
                style={[
                  styles.playerItem,
                  currentPlayerIndex === index && styles.activePlayerItem
                ]}
              >
                <View style={[styles.playerItemAvatar, { backgroundColor: getGenderColor(player.gender) }]}>
                  <Icon
                    name={getGenderIcon(player.gender)}
                    type="material"
                    size={16}
                    color="white"
                  />
                </View>
                <Text
                  style={[
                    styles.playerItemName,
                    currentPlayerIndex === index && styles.activePlayerItemName
                  ]}
                >
                  {player.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Botones de navegación */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" type="material" size={20} color="#ff5722" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endGameButton}
            onPress={() => {
              Alert.alert(
                "Terminar Partida",
                "¿Estás seguro de que quieres terminar la partida y volver al menú de jugadores?",
                [
                  {
                    text: "Cancelar",
                    style: "cancel"
                  },
                  {
                    text: "Terminar",
                    onPress: () => {
                      // Navegar a la pantalla de jugadores con los mismos parámetros
                      navigation.navigate('Players', {
                        modeId: route.params.modeId,
                        modeName: route.params.modeName
                      });
                    }
                  }
                ]
              );
            }}
          >
            <Icon name="exit-to-app" type="material" size={20} color="#f44336" />
            <Text style={styles.endGameButtonText}>Terminar Partida</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  playerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  choiceContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  choiceButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  truthChoiceButton: {
    backgroundColor: '#2196f3',
    flex: 1,
    marginRight: 8,
    height: 120,
  },
  dareChoiceButton: {
    backgroundColor: '#f44336',
    flex: 1,
    marginLeft: 8,
    height: 120,
  },
  randomChoiceButton: {
    backgroundColor: '#9c27b0',
    width: '100%',
    flexDirection: 'row',
    height: 60,
  },
  choiceButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  questionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  questionText: {
    fontSize: 20,
    lineHeight: 28,
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  refuseButton: {
    backgroundColor: '#f44336',
    marginRight: 8,
  },
  completeButton: {
    backgroundColor: '#4caf50',
    marginLeft: 8,
  },
  playersListContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playersListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  playersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  activePlayerItem: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  playerItemAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  playerItemName: {
    fontSize: 14,
    color: '#666',
  },
  activePlayerItemName: {
    color: '#ff5722',
    fontWeight: 'bold',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 10,
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  backButtonText: {
    color: '#ff5722',
    fontSize: 16,
    marginLeft: 8,
  },
  endGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  endGameButtonText: {
    color: '#f44336',
    fontSize: 16,
    marginLeft: 8,
  },

  // Mantener estilos antiguos para compatibilidad
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  currentPlayerText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  buttonContainer: {
    width: '48%',
  },
  randomButtonContainer: {
    width: '100%',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 10,
  },
  truthButton: {
    backgroundColor: '#2196f3',
  },
  dareButton: {
    backgroundColor: '#f44336',
  },
  randomButton: {
    backgroundColor: '#9c27b0',
  },
  truthCard: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  dareCard: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  actionButtonContainer: {
    width: '48%',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 15,
  },
  playersListText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default GameScreen;
