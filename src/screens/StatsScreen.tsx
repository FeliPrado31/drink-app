import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { getPlayerStats, PlayerStats } from '../services/achievements';
import { getUserAchievements, UserAchievement } from '../services/achievements';
import { Ionicons } from '@expo/vector-icons';

type StatsScreenProps = {
  navigation: any;
};

const StatsScreen: React.FC<StatsScreenProps> = () => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'games' | 'social'>('overview');

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Obtener estadísticas del jugador
      const { stats, error } = await getPlayerStats();

      if (error) throw error;

      setStats(stats);

      // Obtener logros del usuario
      const { userAchievements, error: achievementsError } = await getUserAchievements(true);

      if (achievementsError) throw achievementsError;

      setAchievements(userAchievements || []);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  // Eliminamos las funciones de preparación de datos para gráficos
  // ya que no estamos usando gráficos en esta versión simplificada

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Resumen de Estadísticas</Text>

      {/* Estadísticas de logros */}
      <View style={styles.statsCard}>
        <Text style={styles.chartTitle}>Progreso de Logros</Text>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total de Logros:</Text>
          <Text style={styles.detailValue}>{achievements.length}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Logros Desbloqueados:</Text>
          <Text style={styles.detailValue}>{achievements.filter(a => a.unlocked).length}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Porcentaje Completado:</Text>
          <Text style={styles.detailValue}>
            {achievements.length > 0
              ? `${Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%`
              : '0%'}
          </Text>
        </View>
      </View>

      {/* Estadísticas generales */}
      <View style={styles.statsCard}>
        <Text style={styles.chartTitle}>Estadísticas Generales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="game-controller" size={24} color="#ff5722" />
            <Text style={styles.statValue}>{stats?.total_games || 0}</Text>
            <Text style={styles.statLabel}>Partidas</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="help-circle" size={24} color="#2196f3" />
            <Text style={styles.statValue}>{stats?.truth_count || 0}</Text>
            <Text style={styles.statLabel}>Verdades</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#ff9800" />
            <Text style={styles.statValue}>{stats?.dare_count || 0}</Text>
            <Text style={styles.statLabel}>Retos</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="wine" size={24} color="#9c27b0" />
            <Text style={styles.statValue}>{stats?.shots_taken || 0}</Text>
            <Text style={styles.statLabel}>Shots</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAchievementsTab = () => {
    // Agrupar logros por categoría
    const achievementsByCategory = achievements.reduce((acc, ua) => {
      if (!ua.achievement) return acc;

      const category = ua.achievement.is_secret ? 'Secretos' : 'Normales';

      if (!acc[category]) {
        acc[category] = { total: 0, unlocked: 0 };
      }

      acc[category].total++;
      if (ua.unlocked) {
        acc[category].unlocked++;
      }

      return acc;
    }, {} as Record<string, { total: number; unlocked: number }>);

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Estadísticas de Logros</Text>

        {/* Estadísticas de logros */}
        <View style={styles.statsCard}>
          <Text style={styles.chartTitle}>Detalles de Logros</Text>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total de Logros:</Text>
            <Text style={styles.detailValue}>{achievements.length}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Logros Desbloqueados:</Text>
            <Text style={styles.detailValue}>{achievements.filter(a => a.unlocked).length}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Porcentaje Completado:</Text>
            <Text style={styles.detailValue}>
              {achievements.length > 0
                ? `${Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)}%`
                : '0%'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Logros Secretos Desbloqueados:</Text>
            <Text style={styles.detailValue}>
              {achievements.filter(a => a.unlocked && a.achievement?.is_secret).length}
            </Text>
          </View>
        </View>

        {/* Categorías de logros */}
        <View style={styles.statsCard}>
          <Text style={styles.chartTitle}>Categorías de Logros</Text>

          {Object.entries(achievementsByCategory).map(([category, data]) => (
            <View key={category} style={styles.detailItem}>
              <Text style={styles.detailLabel}>Logros {category}:</Text>
              <Text style={styles.detailValue}>
                {data.unlocked} / {data.total}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderGamesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Estadísticas de Juego</Text>

      {/* Estadísticas detalladas de juego */}
      <View style={styles.statsCard}>
        <Text style={styles.chartTitle}>Detalles de Juego</Text>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total de Partidas:</Text>
          <Text style={styles.detailValue}>{stats?.total_games || 0}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Verdades Respondidas:</Text>
          <Text style={styles.detailValue}>{stats?.truth_count || 0}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Retos Completados:</Text>
          <Text style={styles.detailValue}>{stats?.dare_count || 0}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Shots Tomados:</Text>
          <Text style={styles.detailValue}>{stats?.shots_taken || 0}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Ratio Verdad/Reto:</Text>
          <Text style={styles.detailValue}>
            {stats && stats.dare_count > 0
              ? (stats.truth_count / stats.dare_count).toFixed(2)
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Última Partida:</Text>
          <Text style={styles.detailValue}>
            {stats?.last_played_at
              ? new Date(stats.last_played_at).toLocaleDateString()
              : 'Nunca'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSocialTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Estadísticas Sociales</Text>

      {/* Estadísticas detalladas sociales */}
      <View style={styles.statsCard}>
        <Text style={styles.chartTitle}>Detalles Sociales</Text>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Sugerencias Creadas:</Text>
          <Text style={styles.detailValue}>{stats?.suggestions_created || 0}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Sugerencias Aprobadas:</Text>
          <Text style={styles.detailValue}>{stats?.suggestions_approved || 0}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Tasa de Aprobación:</Text>
          <Text style={styles.detailValue}>
            {stats && stats.suggestions_created > 0
              ? `${Math.round((stats.suggestions_approved / stats.suggestions_created) * 100)}%`
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Votos Realizados:</Text>
          <Text style={styles.detailValue}>{stats?.votes_given || 0}</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
        onPress={() => setActiveTab('overview')}
      >
        <Ionicons
          name="stats-chart"
          size={20}
          color={activeTab === 'overview' ? '#ff5722' : '#757575'}
        />
        <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
          General
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
        onPress={() => setActiveTab('achievements')}
      >
        <Ionicons
          name="trophy"
          size={20}
          color={activeTab === 'achievements' ? '#ff5722' : '#757575'}
        />
        <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
          Logros
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'games' && styles.activeTab]}
        onPress={() => setActiveTab('games')}
      >
        <Ionicons
          name="game-controller"
          size={20}
          color={activeTab === 'games' ? '#ff5722' : '#757575'}
        />
        <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
          Juegos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'social' && styles.activeTab]}
        onPress={() => setActiveTab('social')}
      >
        <Ionicons
          name="people"
          size={20}
          color={activeTab === 'social' ? '#ff5722' : '#757575'}
        />
        <Text style={[styles.tabText, activeTab === 'social' && styles.activeTabText]}>
          Social
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'achievements':
        return renderAchievementsTab();
      case 'games':
        return renderGamesTab();
      case 'social':
        return renderSocialTab();
      default:
        return renderOverviewTab();
    }
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
          onPress={fetchStats}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#ff5722']}
        />
      }
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Mis Estadísticas</Text>

        {renderTabs()}

        {renderActiveTab()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
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
  tabContent: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  pieChartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pieChartCenterLabel: {
    fontSize: 12,
    color: '#757575',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#757575',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
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

export default StatsScreen;
