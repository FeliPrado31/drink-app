import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { getGlobalRanking, RankingEntry, getUserRankingPosition } from '../services/ranking';
import { Ionicons } from '@expo/vector-icons';

type RankingScreenProps = {
  navigation: any;
};

const RankingScreen: React.FC<RankingScreenProps> = ({ navigation }) => {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'total' | 'achievements' | 'games' | 'social'>('total');
  const [userPosition, setUserPosition] = useState<number | null>(null);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      
      // Obtener el ranking global
      const { ranking, error } = await getGlobalRanking(100, category);
      
      if (error) throw error;
      
      setRanking(ranking || []);
      
      // Obtener la posición del usuario
      const { position, error: posError } = await getUserRankingPosition(category);
      
      if (!posError) {
        setUserPosition(position);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el ranking');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRanking();
  }, [category]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRanking();
  };

  const getCategoryName = () => {
    switch (category) {
      case 'achievements':
        return 'Logros';
      case 'games':
        return 'Juegos';
      case 'social':
        return 'Social';
      default:
        return 'Total';
    }
  };

  const getScoreField = (item: RankingEntry) => {
    switch (category) {
      case 'achievements':
        return item.achievements_score;
      case 'games':
        return item.games_score;
      case 'social':
        return item.social_score;
      default:
        return item.total_score;
    }
  };

  const renderRankingItem = ({ item, index }: { item: RankingEntry; index: number }) => {
    const isTop3 = index < 3;
    const isCurrentUser = userPosition === item.rank;
    
    return (
      <View style={[
        styles.rankingItem,
        isCurrentUser && styles.currentUserItem
      ]}>
        <View style={[
          styles.rankBadge,
          isTop3 ? styles.topRankBadge : null,
          isCurrentUser ? styles.currentUserBadge : null
        ]}>
          <Text style={[
            styles.rankText,
            isTop3 ? styles.topRankText : null
          ]}>
            {item.rank}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[
            styles.username,
            isCurrentUser && styles.currentUserText
          ]}>
            {item.username}
            {isCurrentUser && ' (Tú)'}
          </Text>
          
          <View style={styles.scoreBreakdown}>
            <View style={styles.scoreItem}>
              <Ionicons name="trophy" size={12} color="#ffd700" />
              <Text style={styles.scoreText}>{item.achievements_score}</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Ionicons name="game-controller" size={12} color="#2196f3" />
              <Text style={styles.scoreText}>{item.games_score}</Text>
            </View>
            
            <View style={styles.scoreItem}>
              <Ionicons name="people" size={12} color="#4caf50" />
              <Text style={styles.scoreText}>{item.social_score}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[
            styles.scoreValue,
            isTop3 ? styles.topRankScore : null,
            isCurrentUser && styles.currentUserText
          ]}>
            {getScoreField(item)}
          </Text>
          <Text style={styles.scoreLabel}>puntos</Text>
        </View>
      </View>
    );
  };

  const renderCategoryTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, category === 'total' && styles.activeTab]}
        onPress={() => setCategory('total')}
      >
        <Ionicons 
          name="stats-chart" 
          size={20} 
          color={category === 'total' ? '#ff5722' : '#757575'} 
        />
        <Text style={[styles.tabText, category === 'total' && styles.activeTabText]}>
          Total
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, category === 'achievements' && styles.activeTab]}
        onPress={() => setCategory('achievements')}
      >
        <Ionicons 
          name="trophy" 
          size={20} 
          color={category === 'achievements' ? '#ff5722' : '#757575'} 
        />
        <Text style={[styles.tabText, category === 'achievements' && styles.activeTabText]}>
          Logros
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, category === 'games' && styles.activeTab]}
        onPress={() => setCategory('games')}
      >
        <Ionicons 
          name="game-controller" 
          size={20} 
          color={category === 'games' ? '#ff5722' : '#757575'} 
        />
        <Text style={[styles.tabText, category === 'games' && styles.activeTabText]}>
          Juegos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, category === 'social' && styles.activeTab]}
        onPress={() => setCategory('social')}
      >
        <Ionicons 
          name="people" 
          size={20} 
          color={category === 'social' ? '#ff5722' : '#757575'} 
        />
        <Text style={[styles.tabText, category === 'social' && styles.activeTabText]}>
          Social
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
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
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchRanking}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Ranking Global</Text>
        
        {renderCategoryTabs()}
        
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>Categoría: {getCategoryName()}</Text>
          
          {userPosition && (
            <View style={styles.userPositionContainer}>
              <Text style={styles.userPositionText}>
                Tu posición: #{userPosition}
              </Text>
            </View>
          )}
        </View>
        
        {ranking.length > 0 ? (
          <FlatList
            data={ranking}
            renderItem={renderRankingItem}
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
            <Ionicons name="trophy-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay datos de ranking disponibles</Text>
            <Text style={styles.emptySubtext}>
              ¡Juega más partidas para aparecer en el ranking!
            </Text>
          </View>
        )}
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
    padding: 16,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
  },
  activeTabText: {
    color: '#ff5722',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userPositionContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  userPositionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  listContainer: {
    paddingBottom: 20,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserItem: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffecb3',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topRankBadge: {
    backgroundColor: '#ffd700',
  },
  currentUserBadge: {
    backgroundColor: '#ff9800',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
  },
  topRankText: {
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  currentUserText: {
    color: '#ff8f00',
  },
  scoreBreakdown: {
    flexDirection: 'row',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  topRankScore: {
    color: '#ff5722',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default RankingScreen;
