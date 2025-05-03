import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Animated
} from 'react-native';
import { Button, Input, Icon } from 'react-native-elements';
import { Player } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../components/BackButton';

type PlayersScreenProps = {
  navigation: any;
  route: {
    params: {
      modeId: number;
      modeName: string;
    };
  };
};

const PlayersScreen: React.FC<PlayersScreenProps> = ({ navigation, route }) => {
  const { modeId, modeName } = route.params;
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentGender, setCurrentGender] = useState<'male' | 'female' | 'other'>('male');

  const addPlayer = () => {
    if (!currentName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre');
      return;
    }

    const newPlayer: Player = {
      id: Date.now().toString(),
      name: currentName.trim(),
      gender: currentGender,
    };

    setPlayers([...players, newPlayer]);
    setCurrentName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(player => player.id !== id));
  };

  const startGame = () => {
    if (players.length < 2) {
      Alert.alert('Jugadores insuficientes', 'Necesitas al menos 2 jugadores para iniciar el juego');
      return;
    }

    navigation.navigate('Game', {
      modeId,
      modeName,
      players,
    });
  };

  const renderGenderButton = (gender: 'male' | 'female' | 'other', label: string) => (
    <TouchableOpacity
      style={[
        styles.genderButton,
        currentGender === gender && styles.selectedGenderButton
      ]}
      onPress={() => setCurrentGender(gender)}
    >
      <Text style={[
        styles.genderButtonText,
        currentGender === gender && styles.selectedGenderButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
        <View style={styles.headerTop}>
          <BackButton onPress={() => navigation.goBack()} color="white" />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Agregar Jugadores</Text>
          <Text style={styles.headerSubtitle}>Modo: {modeName}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Formulario para agregar jugadores */}
        <View style={styles.addPlayerForm}>
          <Text style={styles.formTitle}>Nuevo Jugador</Text>

          <Input
            placeholder="Nombre del Jugador"
            value={currentName}
            onChangeText={setCurrentName}
            containerStyle={styles.inputContainer}
            inputContainerStyle={styles.inputField}
            leftIcon={{ type: 'material', name: 'person', color: '#ff5722' }}
            returnKeyType="done"
            onSubmitEditing={addPlayer}
          />

          <View style={styles.genderSelector}>
            <Text style={styles.genderLabel}>Género:</Text>
            <View style={styles.genderButtons}>
              {renderGenderButton('male', 'Hombre')}
              {renderGenderButton('female', 'Mujer')}
              {renderGenderButton('other', 'Otro')}
            </View>
          </View>

          <Button
            title="Agregar Jugador"
            onPress={addPlayer}
            buttonStyle={styles.addButton}
            containerStyle={styles.addButtonContainer}
            icon={{
              name: 'person-add',
              type: 'material',
              size: 20,
              color: 'white',
            }}
            iconRight
          />
        </View>

        {/* Lista de jugadores */}
        <View style={styles.playerListContainer}>
          <View style={styles.playerListHeader}>
            <Text style={styles.playersTitle}>
              Jugadores ({players.length})
            </Text>
            <Text style={styles.playerMinimum}>
              Mínimo: 2 jugadores
            </Text>
          </View>

          {players.length > 0 ? (
            <FlatList
              data={players}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.playerItem}>
                  <View style={[styles.playerAvatar, { backgroundColor: getGenderColor(item.gender) }]}>
                    <Icon
                      name={getGenderIcon(item.gender)}
                      type="material"
                      size={20}
                      color="white"
                    />
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{item.name}</Text>
                    <Text style={styles.playerGender}>
                      {item.gender === 'male' ? 'Hombre' : item.gender === 'female' ? 'Mujer' : 'Otro'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removePlayer(item.id)}
                    style={styles.removeButton}
                  >
                    <Icon name="close" type="material" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              style={styles.playerList}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noPlayersContainer}>
              <Icon name="people" type="material" size={40} color="#ddd" />
              <Text style={styles.noPlayersText}>
                No hay jugadores añadidos. Agrega al menos 2 jugadores para comenzar.
              </Text>
            </View>
          )}
        </View>

        {/* Botones de acción */}
        <View style={styles.buttonsContainer}>
          <Button
            title="Iniciar Juego"
            onPress={startGame}
            buttonStyle={[styles.button, styles.startButton]}
            containerStyle={styles.startButtonContainer}
            disabled={players.length < 2}
            disabledStyle={styles.disabledButton}
            icon={{
              name: 'play-arrow',
              type: 'material',
              size: 20,
              color: 'white',
            }}
            iconRight
          />
          <Button
            title="Volver"
            onPress={() => navigation.goBack()}
            buttonStyle={[styles.button, styles.backButton]}
            containerStyle={styles.backButtonContainer}
            type="outline"
            icon={{
              name: 'arrow-back',
              type: 'material',
              size: 20,
              color: '#ff5722',
            }}
          />
        </View>

        {/* Espacio adicional al final */}
        <View style={styles.bottomPadding} />
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
    paddingTop: (StatusBar.currentHeight || 40) + 15, // Añadimos 15px extra de espacio
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  addPlayerForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  inputField: {
    borderBottomColor: '#ddd',
  },
  genderSelector: {
    marginBottom: 16,
  },
  genderLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedGenderButton: {
    backgroundColor: '#ff5722',
    borderColor: '#ff5722',
  },
  genderButtonText: {
    color: '#333',
  },
  selectedGenderButtonText: {
    color: 'white',
  },
  addButtonContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 12,
  },
  playerListContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playerListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  playerMinimum: {
    fontSize: 14,
    color: '#666',
  },
  playerList: {
    marginBottom: 8,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  playerGender: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPlayersContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noPlayersText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  buttonsContainer: {
    marginBottom: 16,
  },
  startButtonContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  backButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 12,
  },
  startButton: {
    backgroundColor: '#ff5722',
    borderRadius: 8,
  },
  backButton: {
    borderColor: '#ff5722',
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  bottomPadding: {
    height: 20,
  },
});

export default PlayersScreen;
