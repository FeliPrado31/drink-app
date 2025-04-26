import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Button } from 'react-native-elements';
import { getRandomQuestion, Question, Player } from '../services/supabase';
import AdBanner from '../components/AdBanner';

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

  // Update current player when index changes
  useEffect(() => {
    setCurrentPlayer(players[currentPlayerIndex]);
  }, [currentPlayerIndex, players]);

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
  };

  const handleDare = () => {
    fetchQuestion('dare');
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

      {/* Banner de anuncios en la parte inferior */}
      <AdBanner />
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
