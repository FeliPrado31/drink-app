import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import { useAchievements } from '../context/AchievementsContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BackButton from '../components/BackButton';

type AchievementsScreenProps = {
  navigation: any;
};

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState<'achievements' | 'stats'>('achievements');
  const [refreshing, setRefreshing] = useState(false);

  // Usar el contexto de logros
  const {
    userAchievements,
    playerStats,
    loading,
    error,
    showSecretAchievements,
    refreshAchievements,
    toggleShowSecretAchievements,
    claimReward,
    shareAchievementWithFriends
  } = useAchievements();

  useEffect(() => {
    // Cargar logros al montar el componente
    refreshAchievements();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAchievements();
    setRefreshing(false);
  };

  // Función para reclamar recompensa
  const handleClaimReward = async (achievementId: number) => {
    const success = await claimReward(achievementId);

    if (success) {
      Alert.alert(
        '¡Recompensa Reclamada!',
        'Has reclamado tu recompensa con éxito.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        'No se pudo reclamar la recompensa. Inténtalo de nuevo más tarde.',
        [{ text: 'OK' }]
      );
    }
  };

  // Función para compartir logro
  const handleShareAchievement = async (achievementId: number) => {
    await shareAchievementWithFriends(achievementId);
  };

  const getIconName = (iconKey: string) => {
    const iconMap: { [key: string]: string } = {
      'game-controller': 'game-controller',
      'comment-question': 'help-circle',
      'run': 'walk',
      'glass-cocktail': 'wine',
      'lightbulb': 'bulb',
      'check-circle': 'checkmark-circle',
      'thumb-up': 'thumbs-up',
      'fire': 'flame',
      'account-group': 'people',
      'run-fast': 'speedometer',
      'moon': 'moon',
      'people-circle': 'people-circle',
      'search': 'search',
      'beer': 'beer',
      'crown': 'crown',
      'calendar': 'calendar',
      'refresh-circle': 'refresh-circle',
      'globe': 'globe',
      'checkmark-done-circle': 'checkmark-done-circle'
    };

    return iconMap[iconKey] || 'trophy';
  };

  const renderAchievementItem = ({ item }: { item: UserAchievement }) => {
    const achievement = item.achievement;
    if (!achievement) return null;

    // No mostrar logros secretos a menos que estén desbloqueados o se haya activado la opción
    if (achievement.is_secret && !item.unlocked && !showSecretAchievements) {
      return null;
    }

    const progress = Math.min(item.progress, achievement.required_count);
    const progressPercentage = (progress / achievement.required_count) * 100;

    // Si es un logro secreto no desbloqueado, mostrar versión oculta
    const isSecretNotUnlocked = achievement.is_secret && !item.unlocked;

    return (
      <View style={[
        styles.achievementCard,
        item.unlocked ? styles.unlockedCard : styles.lockedCard,
        isSecretNotUnlocked && styles.secretCard
      ]}>
        <View style={styles.achievementHeader}>
          <View style={[
            styles.iconContainer,
            item.unlocked ? styles.unlockedIcon : styles.lockedIcon,
            isSecretNotUnlocked && styles.secretIcon
          ]}>
            <Ionicons
              name={isSecretNotUnlocked ? 'help' : getIconName(achievement.icon)}
              size={24}
              color={item.unlocked ? '#FFD700' : (isSecretNotUnlocked ? '#9C27B0' : '#A0A0A0')}
            />
          </View>
          <View style={styles.achievementInfo}>
            <Text style={[
              styles.achievementName,
              item.unlocked ? styles.unlockedText : styles.lockedText,
              isSecretNotUnlocked && styles.secretText
            ]}>
              {isSecretNotUnlocked ? 'Logro Secreto' : achievement.name}
            </Text>
            <Text style={styles.achievementDescription}>
              {isSecretNotUnlocked ? 'Sigue jugando para descubrir este logro secreto' : achievement.description}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%` },
                item.unlocked ? styles.unlockedProgressFill : styles.lockedProgressFill,
                isSecretNotUnlocked && styles.secretProgressFill
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {isSecretNotUnlocked ? '?' : `${progress} / ${achievement.required_count}`}
          </Text>
        </View>

        {item.unlocked && (
          <View style={styles.unlockedInfoContainer}>
            {item.unlocked_at && (
              <Text style={styles.unlockedDate}>
                Desbloqueado el {new Date(item.unlocked_at).toLocaleDateString()}
              </Text>
            )}

            {achievement.reward_description && (
              <View style={styles.rewardContainer}>
                <Ionicons name="gift-outline" size={14} color="#ff8f00" style={styles.rewardIcon} />
                <Text style={styles.rewardText}>
                  Recompensa: {achievement.reward_description}
                </Text>
              </View>
            )}

            <View style={styles.actionButtonsContainer}>
              {achievement.reward_description && !item.reward_claimed && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleClaimReward(achievement.id)}
                >
                  <Ionicons name="gift" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Reclamar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => handleShareAchievement(achievement.id)}
              >
                <Ionicons name="share-social" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

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
          onPress={fetchAchievements}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Componente para mostrar estadísticas del jugador
  const renderStatsTab = () => {
    if (!playerStats) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No hay estadísticas disponibles</Text>
          <Text style={styles.emptySubtext}>
            ¡Juega más partidas para generar estadísticas!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.statsContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff5722']}
          />
        }
      >
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Estadísticas Generales</Text>

          <View style={styles.statItem}>
            <Ionicons name="game-controller" size={24} color="#ff5722" />
            <Text style={styles.statLabel}>Partidas jugadas:</Text>
            <Text style={styles.statValue}>{playerStats.total_games}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="help-circle" size={24} color="#2196f3" />
            <Text style={styles.statLabel}>Verdades respondidas:</Text>
            <Text style={styles.statValue}>{playerStats.truth_count}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#ff9800" />
            <Text style={styles.statLabel}>Retos completados:</Text>
            <Text style={styles.statValue}>{playerStats.dare_count}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="wine" size={24} color="#9c27b0" />
            <Text style={styles.statLabel}>Shots tomados:</Text>
            <Text style={styles.statValue}>{playerStats.shots_taken}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Contribuciones</Text>

          <View style={styles.statItem}>
            <Ionicons name="bulb" size={24} color="#ffc107" />
            <Text style={styles.statLabel}>Sugerencias creadas:</Text>
            <Text style={styles.statValue}>{playerStats.suggestions_created}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
            <Text style={styles.statLabel}>Sugerencias aprobadas:</Text>
            <Text style={styles.statValue}>{playerStats.suggestions_approved}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="thumbs-up" size={24} color="#2196f3" />
            <Text style={styles.statLabel}>Votos realizados:</Text>
            <Text style={styles.statValue}>{playerStats.votes_given}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Logros</Text>

          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color="#ffd700" />
            <Text style={styles.statLabel}>Logros desbloqueados:</Text>
            <Text style={styles.statValue}>{playerStats.achievements_unlocked}</Text>
          </View>

          {playerStats.last_played_at && (
            <View style={styles.statItem}>
              <Ionicons name="time" size={24} color="#607d8b" />
              <Text style={styles.statLabel}>Última partida:</Text>
              <Text style={styles.statValue}>
                {new Date(playerStats.last_played_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
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
          <Text style={styles.headerTitle}>Mis Logros</Text>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        {/* Tabs para cambiar entre logros y estadísticas */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
            onPress={() => setSelectedTab('achievements')}
          >
            <Ionicons
              name="trophy"
              size={20}
              color={selectedTab === 'achievements' ? '#ff5722' : '#757575'}
            />
            <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
              Logros
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'stats' && styles.activeTab]}
            onPress={() => setSelectedTab('stats')}
          >
            <Ionicons
              name="stats-chart"
              size={20}
              color={selectedTab === 'stats' ? '#ff5722' : '#757575'}
            />
            <Text style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
              Estadísticas
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'achievements' && (
          <>
            <View style={styles.headerContainer}>
              <View style={styles.secretToggleContainer}>
                <Text style={styles.secretToggleLabel}>
                  Mostrar secretos
                </Text>
                <Switch
                  value={showSecretAchievements}
                  onValueChange={toggleShowSecretAchievements}
                  trackColor={{ false: '#e0e0e0', true: '#ffcc80' }}
                  thumbColor={showSecretAchievements ? '#ff9800' : '#f5f5f5'}
                />
              </View>
            </View>

            {userAchievements.length > 0 ? (
              <FlatList
                data={userAchievements}
                renderItem={renderAchievementItem}
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
                <Text style={styles.emptyText}>No hay logros disponibles</Text>
                <Text style={styles.emptySubtext}>
                  ¡Juega más partidas para desbloquear logros!
                </Text>
              </View>
            )}
          </>
        )}

        {selectedTab === 'stats' && renderStatsTab()}
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
  listContainer: {
    paddingBottom: 20,
  },
  achievementCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unlockedCard: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffd54f',
    borderWidth: 1,
  },
  lockedCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  secretCard: {
    backgroundColor: '#f3e5f5',
    borderColor: '#ce93d8',
    borderWidth: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unlockedIcon: {
    backgroundColor: '#fff8e1',
  },
  lockedIcon: {
    backgroundColor: '#f0f0f0',
  },
  secretIcon: {
    backgroundColor: '#f3e5f5',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  unlockedText: {
    color: '#ff8f00',
  },
  lockedText: {
    color: '#757575',
  },
  secretText: {
    color: '#9c27b0',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#757575',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  unlockedProgressFill: {
    backgroundColor: '#ffd54f',
  },
  lockedProgressFill: {
    backgroundColor: '#bdbdbd',
  },
  secretProgressFill: {
    backgroundColor: '#ce93d8',
  },
  progressText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  unlockedInfoContainer: {
    marginTop: 8,
  },
  unlockedDate: {
    fontSize: 12,
    color: '#9e9e9e',
    fontStyle: 'italic',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 236, 179, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rewardIcon: {
    marginRight: 4,
  },
  rewardText: {
    fontSize: 12,
    color: '#ff8f00',
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#2196f3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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
  tabContainer: {
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
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
  },
  activeTabText: {
    color: '#ff5722',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  secretToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secretToggleLabel: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8,
  },
  statsContainer: {
    flex: 1,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: '#757575',
    marginLeft: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default AchievementsScreen;
