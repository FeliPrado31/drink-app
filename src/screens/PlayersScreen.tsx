import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { Button, Input } from 'react-native-elements';
import { Player } from '../services/supabase';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agregar Jugadores</Text>
      <Text style={styles.subtitle}>Modo {modeName}</Text>

      <View style={styles.addPlayerForm}>
        <Input
          placeholder="Nombre del Jugador"
          value={currentName}
          onChangeText={setCurrentName}
          containerStyle={styles.inputContainer}
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
        />
      </View>

      <View style={styles.playerListContainer}>
        <Text style={styles.playersTitle}>
          Jugadores ({players.length})
        </Text>

        {players.length > 0 ? (
          <FlatList
            data={players}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.playerItem}>
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
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            style={styles.playerList}
          />
        ) : (
          <Text style={styles.noPlayersText}>
            No hay jugadores añadidos. Agrega al menos 2 jugadores para comenzar.
          </Text>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          title="Iniciar Juego"
          onPress={startGame}
          buttonStyle={[styles.button, styles.startButton]}
          disabled={players.length < 2}
        />
        <Button
          title="Volver"
          onPress={() => navigation.goBack()}
          buttonStyle={[styles.button, styles.backButton]}
          type="outline"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addPlayerForm: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  inputContainer: {
    paddingHorizontal: 0,
  },
  genderSelector: {
    marginBottom: 15,
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
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedGenderButton: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  genderButtonText: {
    color: '#333',
  },
  selectedGenderButtonText: {
    color: 'white',
  },
  addButton: {
    backgroundColor: '#4caf50',
    borderRadius: 5,
  },
  playerListContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  playerList: {
    flex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerGender: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noPlayersText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  buttonsContainer: {
    marginTop: 20,
  },
  button: {
    borderRadius: 5,
    marginBottom: 10,
    paddingVertical: 12,
  },
  startButton: {
    backgroundColor: '#ff5722',
  },
  backButton: {
    borderColor: '#6200ee',
  },
});

export default PlayersScreen;
