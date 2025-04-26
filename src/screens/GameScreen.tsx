import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Button } from 'react-native-elements';
import { getRandomQuestion, Question, Player } from '../services/supabase';
import { useAchievements } from '../context/AchievementsContext';
import * as Location from 'expo-location';

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

  // Acceder al contexto de logros
  const { trackAchievements, updateStats } = useAchievements();

  // Estado para rastrear ubicaciones
  const [locations, setLocations] = useState<Set<string>>(new Set());

  // Update current player when index changes
  useEffect(() => {
    setCurrentPlayer(players[currentPlayerIndex]);
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
    };

    initGame();
  }, []);

  // Function to get the next player
  const moveToNextPlayer = () => {
    const nextIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIndex);
  };

  const fetchQuestion = async (type?: 'truth' | 'dare') => {
    try {
      setLoading(true);
      const { question, error } = await getRandomQuestion(modeId, type);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setCurrentQuestion(question);
      setSelectedType(type || null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleTruth = () => {
    fetchQuestion('truth');
    // Actualizar estadísticas y verificar logros
    setGameStats(prev => ({
      ...prev,
      truthCount: prev.truthCount + 1
    }));

    // Verificar logro de maestro de la verdad
    trackAchievements([{ code: 'truth_master' }]);

    // Verificar logro de buscador de verdades (20 verdades consecutivas)
    if (gameStats.dareCount === 0 && gameStats.truthCount >= 19) {
      trackAchievements([{ code: 'truth_seeker' }]);
    }

    // Actualizar estadísticas en la base de datos
    updateStats({ truth_count: 1 });
  };

  const handleDare = () => {
    fetchQuestion('dare');
    // Actualizar estadísticas y verificar logros
    setGameStats(prev => ({
      ...prev,
      dareCount: prev.dareCount + 1
    }));

    // Verificar logro de maestro del reto
    trackAchievements([{ code: 'dare_master' }]);

    // Verificar logro de atrevido (20 retos consecutivos)
    if (gameStats.truthCount === 0 && gameStats.dareCount >= 19) {
      trackAchievements([{ code: 'dare_devil' }]);
    }

    // Actualizar estadísticas en la base de datos
    updateStats({ dare_count: 1 });
  };

  const handleRandom = () => {
    fetchQuestion();
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
    moveToNextPlayer();
    // Reiniciar pregunta actual para mostrar pantalla de selección
    setCurrentQuestion(null);
    // Reiniciar tipo seleccionado
    setSelectedType(null);
  };

  const handleRefuse = () => {
    // Actualizar estadísticas de shots tomados
    setGameStats(prev => ({
      ...prev,
      shotsTaken: prev.shotsTaken + shotCount
    }));

    // Verificar logro de bebedor valiente
    trackAchievements([{ code: 'shot_taker', increment: shotCount }]);

    // Verificar logro de maestro de shots
    trackAchievements([{ code: 'shot_master', increment: shotCount }]);

    // Actualizar estadísticas en la base de datos
    updateStats({ shots_taken: shotCount });

    // Reiniciar contadores de racha para los logros de verdad/reto consecutivos
    if (selectedType === 'truth') {
      setGameStats(prev => ({ ...prev, truthCount: 0 }));
    } else {
      setGameStats(prev => ({ ...prev, dareCount: 0 }));
    }

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
  };

  const handleComplete = () => {
    // Verificar logro de racha perfecta
    if (shotCount >= 10) {
      trackAchievements([{ code: 'perfect_streak' }]);
    }

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
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Modo {modeName}</Text>
          <View style={styles.playerInfo}>
            <Text style={styles.currentPlayerText}>Jugador Actual:</Text>
            <Text style={styles.playerName}>{currentPlayer.name}</Text>
          </View>
        </View>

        {!currentQuestion ? (
          <View style={styles.choiceContainer}>
            <Text style={styles.instructionText}>
              {currentPlayer.name}, elige tu destino:
            </Text>

            <View style={styles.buttonRow}>
              <Button
                title="Verdad"
                onPress={handleTruth}
                buttonStyle={[styles.button, styles.truthButton]}
                containerStyle={styles.buttonContainer}
                loading={loading}
              />

              <Button
                title="Reto"
                onPress={handleDare}
                buttonStyle={[styles.button, styles.dareButton]}
                containerStyle={styles.buttonContainer}
                loading={loading}
              />
            </View>

            <Button
              title="Aleatorio"
              onPress={handleRandom}
              buttonStyle={[styles.button, styles.randomButton]}
              containerStyle={[styles.buttonContainer, styles.randomButtonContainer]}
              loading={loading}
            />
          </View>
        ) : (
          <View style={styles.questionContainer}>
            <View style={[
              styles.questionCard,
              selectedType === 'truth' ? styles.truthCard : styles.dareCard
            ]}>
              <Text style={styles.questionType}>
                {selectedType === 'truth' ? 'VERDAD' : 'RETO'}
              </Text>
              <Text style={styles.questionText}>{currentQuestion.content}</Text>
            </View>

            <View style={styles.actionButtons}>
              {/* Usar botones normales para no mostrar anuncios durante el juego */}
              <Button
                title="Me Niego"
                onPress={handleRefuse}
                buttonStyle={[styles.button, styles.refuseButton]}
                containerStyle={styles.actionButtonContainer}
              />

              <Button
                title="Completado"
                onPress={handleComplete}
                buttonStyle={[styles.button, styles.completeButton]}
                containerStyle={styles.actionButtonContainer}
              />
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.playersListText}>
            Jugadores: {players.map((p, i) =>
              `${p.name}${i < players.length - 1 ? ', ' : ''}`
            )}
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver a Jugadores</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentPlayerText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff5722',
  },
  choiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
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
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    alignItems: 'center',
  },
  truthCard: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  dareCard: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  questionType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  questionText: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButtonContainer: {
    width: '48%',
  },
  refuseButton: {
    backgroundColor: '#ff9800',
  },
  completeButton: {
    backgroundColor: '#4caf50',
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
  backButton: {
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6200ee',
    fontSize: 16,
  },
});

export default GameScreen;
