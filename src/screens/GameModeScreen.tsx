import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { getGameModes, GameMode } from '../services/supabase';

type GameModeScreenProps = {
  navigation: any;
};

const GameModeScreen: React.FC<GameModeScreenProps> = ({ navigation }) => {
  const [modes, setModes] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameModes = async () => {
      try {
        setLoading(true);
        const { modes, error } = await getGameModes();

        if (error) {
          throw error;
        }

        setModes(modes || []);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los modos de juego');
      } finally {
        setLoading(false);
      }
    };

    fetchGameModes();
  }, []);

  const handleSelectMode = (mode: GameMode) => {
    navigation.navigate('Players', { modeId: mode.id, modeName: mode.name });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona el Modo de Juego</Text>

      <FlatList
        data={modes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => handleSelectMode(item)}
          >
            <Text style={styles.modeName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.modeDescription}>{item.description}</Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  modeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default GameModeScreen;
