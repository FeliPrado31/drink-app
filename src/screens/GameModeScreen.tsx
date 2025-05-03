import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image
} from 'react-native';
import { Icon } from 'react-native-elements';
import { getGameModes, GameMode } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../components/BackButton';

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

  // Función para obtener un color basado en el ID del modo
  const getModeColor = (id: number) => {
    const colors = ['#ff5722', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#607d8b'];
    return colors[id % colors.length];
  };

  // Función para obtener un icono basado en el nombre del modo
  const getModeIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('casual')) return 'mood';
    if (nameLower.includes('extremo')) return 'whatshot';
    if (nameLower.includes('erotic') || nameLower.includes('erótico')) return 'favorite';
    if (nameLower.includes('fiesta')) return 'celebration';
    return 'local-bar';
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
          <Text style={styles.headerTitle}>Selecciona el Modo</Text>
          <Text style={styles.headerSubtitle}>Elige cómo quieres jugar</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff5722" />
          <Text style={styles.loadingText}>Cargando modos de juego...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="error-outline" type="material" size={60} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={modes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => handleSelectMode(item)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[getModeColor(item.id), getModeColor(item.id) + '80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modeIconContainer}
              >
                <Icon
                  name={getModeIcon(item.name)}
                  type="material"
                  size={30}
                  color="white"
                />
              </LinearGradient>
              <View style={styles.modeTextContainer}>
                <Text style={styles.modeName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.modeDescription}>{item.description}</Text>
                )}
              </View>
              <Icon
                name="chevron-right"
                type="material"
                size={24}
                color="#bbb"
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#ff5722',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GameModeScreen;
