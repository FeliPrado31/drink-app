import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Button } from 'react-native-elements';
import { getSuggestions, voteSuggestion, Suggestion, getSettings } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import AdBanner from '../components/AdBanner';

type VoteScreenProps = {
  navigation: any;
};

const VoteScreen: React.FC<VoteScreenProps> = ({ navigation }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [minVotes, setMinVotes] = useState<number>(5);

  const fetchData = async () => {
    try {
      // Fetch suggestions
      const { suggestions, error } = await getSuggestions('pending');
      if (error) throw error;

      setSuggestions(suggestions || []);

      // Fetch min votes setting
      const { value, error: settingsError } = await getSettings('min_votes_required');
      if (settingsError) throw settingsError;

      if (value) {
        setMinVotes(parseInt(value, 10));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al cargar sugerencias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleVote = async (suggestionId: number) => {
    try {
      const { error } = await voteSuggestion(suggestionId);

      if (error) throw error;

      // Update the local state to reflect the vote
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

      Alert.alert('Éxito', 'Tu voto ha sido registrado correctamente');
    } catch (err: any) {
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
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Votar por Sugerencias</Text>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
