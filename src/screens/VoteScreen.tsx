import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import { Button } from 'react-native-elements';
import { getSuggestions, voteSuggestion, Suggestion, getSettings, supabase, updateAllVoteCounts } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAchievements } from '../context/AchievementsContext';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../components/BackButton';

type VoteScreenProps = {
  navigation: any;
};

const VoteScreen: React.FC<VoteScreenProps> = ({ navigation }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minVotes, setMinVotes] = useState<number>(5);
  const [voteCount, setVoteCount] = useState<number>(0);

  // Acceder al contexto de logros
  const { trackAchievements, updateStats } = useAchievements();

  const fetchData = async (showLoading = true) => {
    try {
      console.log('Actualizando lista de sugerencias...');

      if (showLoading) {
        setLoading(true);
      }

      // Fetch suggestions - Forzar una consulta fresca a la base de datos
      // La función getSuggestions ya se encarga de actualizar los contadores
      const { suggestions, error } = await getSuggestions('pending', true);
      if (error) throw error;

      console.log(`Obtenidas ${suggestions?.length || 0} sugerencias pendientes`);

      // Actualizar el estado con las sugerencias obtenidas
      setSuggestions(suggestions || []);

      // Fetch min votes setting
      const { value, error: settingsError } = await getSettings('min_votes_required');
      if (settingsError) throw settingsError;

      if (value) {
        console.log(`Configuración de votos mínimos: ${value}`);
        setMinVotes(parseInt(value, 10));
      }

      console.log('Actualización completada');
    } catch (err: any) {
      console.error('Error al cargar sugerencias:', err);
      Alert.alert('Error', err.message || 'Error al cargar sugerencias');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      // Actualizar manualmente los contadores de votos mediante RPC
      const { success, error } = await updateAllVoteCounts();

      if (error) {
        console.error('Error al actualizar contadores mediante RPC:', error);
      } else {
        console.log('Contadores actualizados correctamente mediante RPC');
      }

      // Obtener las sugerencias actualizadas
      await fetchData(false);
      console.log('Actualización completada');
    } catch (error) {
      console.error('Error al actualizar sugerencias:', error);
      setRefreshing(false);
    }
  };

  const handleVote = async (suggestionId: number) => {
    try {
      console.log(`Intentando votar por sugerencia ID: ${suggestionId}`);

      // Primero actualizamos la UI para dar feedback inmediato al usuario
      setSuggestions(prevSuggestions =>
        prevSuggestions.map(suggestion =>
          suggestion.id === suggestionId
            ? {
                ...suggestion,
                votes_count: suggestion.votes_count + 1,
                user_has_voted: true
              }
            : suggestion
        )
      );

      // Luego enviamos el voto a la base de datos
      const { error, success, suggestion: updatedSuggestion } = await voteSuggestion(suggestionId);

      if (error) {
        // Si hay error, revertimos el cambio en la UI
        console.error('Error al votar:', error);

        // Recargar los datos originales
        await fetchData(false);

        throw error;
      }

      // Si tenemos la sugerencia actualizada, actualizamos la UI con los datos exactos
      if (updatedSuggestion) {
        console.log('Actualizando UI con sugerencia actualizada:', updatedSuggestion);

        // Actualizar la sugerencia específica con los datos actualizados
        // El contador de votos ya debe estar correcto desde la función voteSuggestion
        setSuggestions(prevSuggestions =>
          prevSuggestions.map(suggestion =>
            suggestion.id === suggestionId
              ? {
                  ...updatedSuggestion,
                  user_has_voted: true
                }
              : suggestion
          )
        );
      } else {
        // Si no tenemos la sugerencia actualizada, forzar una actualización completa
        console.log('No se recibió la sugerencia actualizada, actualizando toda la lista...');
        await fetchData(false);
      }

      // Incrementar contador de votos
      setVoteCount(prev => prev + 1);

      // Registrar logro de votante
      await trackAchievements([{ code: 'voter' }]);

      // Actualizar estadísticas
      await updateStats({ votes_given: 1 });

      // Verificar si la sugerencia alcanzó los votos necesarios para ser aprobada
      const currentVotesCount = updatedSuggestion?.votes_count || 0;
      if (currentVotesCount >= minVotes) {
        // Si la sugerencia será aprobada, registrar logro de influencer
        await trackAchievements([{ code: 'suggestion_approved' }]);

        // Actualizar estadísticas de sugerencias aprobadas
        await updateStats({ suggestions_approved: 1 });
      }

      Alert.alert('Éxito', 'Tu voto ha sido registrado correctamente');

      // Actualizar la lista de sugerencias después de un breve retraso para asegurar
      // que los contadores estén actualizados correctamente
      setTimeout(() => {
        fetchData(false);
      }, 1000); // Aumentar el tiempo de espera para asegurar que la base de datos esté actualizada
    } catch (err: any) {
      console.error('Error al votar:', err);
      Alert.alert('Error', err.message || 'Error al registrar el voto');
    }
  };

  const getTypeLabel = (type: 'truth' | 'dare') => {
    return type === 'truth' ? 'Verdad' : 'Reto';
  };

  const renderSuggestionItem = ({ item }: { item: Suggestion }) => (
    <View style={styles.suggestionCard}>
      <View style={styles.suggestionHeader}>
        <View style={[
          styles.typeTag,
          item.type === 'truth' ? styles.truthTag : styles.dareTag
        ]}>
          <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
        </View>
        <Text style={styles.modeText}>
          Modo: {item.game_modes?.name || 'Desconocido'}
        </Text>
      </View>

      <Text style={styles.contentText}>{item.content}</Text>

      <View style={styles.voteContainer}>
        <View style={styles.voteCountContainer}>
          <Text style={styles.voteCountText}>
            {item.votes_count} / {minVotes} votos
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (item.votes_count / minVotes) * 100)}%` }
              ]}
            />
          </View>
        </View>

        <Button
          title="Votar"
          icon={
            <Ionicons
              name="thumbs-up"
              size={16}
              color="white"
              style={{ marginRight: 5 }}
            />
          }
          onPress={() => handleVote(item.id)}
          buttonStyle={[
            styles.voteButton,
            item.user_has_voted ? styles.votedButton : {}
          ]}
          disabled={item.user_has_voted}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={styles.loadingText}>Cargando sugerencias...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Votar por Sugerencias</Text>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>

        {suggestions.length > 0 ? (
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#ff5722']}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay sugerencias pendientes</Text>
            <Text style={styles.emptySubtext}>
              ¡Sé el primero en sugerir una pregunta o reto!
            </Text>
            <Button
              title="Sugerir Nueva"
              onPress={() => navigation.navigate('Suggest')}
              buttonStyle={styles.suggestButton}
              containerStyle={styles.suggestButtonContainer}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Sugerir Nueva"
            onPress={() => navigation.navigate('Suggest')}
            buttonStyle={styles.newButton}
            containerStyle={styles.footerButtonContainer}
          />
          <Button
            title="Volver"
            onPress={() => navigation.goBack()}
            buttonStyle={styles.backButton}
            containerStyle={styles.footerButtonContainer}
            type="outline"
          />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },

  listContainer: {
    paddingBottom: 80, // Space for footer
  },
  suggestionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  truthTag: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  dareTag: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  typeText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  modeText: {
    fontSize: 12,
    color: '#666',
  },
  contentText: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteCountContainer: {
    flex: 1,
    marginRight: 10,
  },
  voteCountText: {
    fontSize: 14,
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  voteButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  votedButton: {
    backgroundColor: '#9e9e9e',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  suggestButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  suggestButtonContainer: {
    marginTop: 10,
  },
  footer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 10,
  },
  footerButtonContainer: {
    width: '48%',
  },
  newButton: {
    backgroundColor: '#ff5722',
    borderRadius: 5,
  },
  backButton: {
    borderColor: '#6200ee',
    borderRadius: 5,
  },
});

export default VoteScreen;
