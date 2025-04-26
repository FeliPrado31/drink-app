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
import { useLevel } from '../context/LevelContext';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from 'react-native-paper';

type LevelScreenProps = {
  navigation: any;
};

const LevelScreen: React.FC<LevelScreenProps> = ({ navigation }) => {
  const { userLevel, loading, error, rankingPosition, refreshLevel } = useLevel();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshLevel();
    setRefreshing(false);
  };

  // Calcular el progreso hacia el siguiente nivel
  const calculateProgress = () => {
    if (!userLevel) return 0;

    // Depuración
    console.log('UserLevel data:', JSON.stringify(userLevel, null, 2));

    // Asegurarse de que todos los valores sean números válidos
    const currentXP = typeof userLevel.total_xp === 'number' ? userLevel.total_xp : 0;
    const nextLevelXP = typeof userLevel.next_level_xp === 'number' ? userLevel.next_level_xp : 100;

    // Usar un valor predeterminado si level_definitions no está disponible
    let prevLevelXP = 0;
    if (userLevel.level_definitions && typeof userLevel.level_definitions.xp_required === 'number') {
      prevLevelXP = userLevel.level_definitions.xp_required;
    } else {
      console.log('level_definitions no disponible o xp_required no es un número');
    }

    // Calcular el XP necesario para el siguiente nivel
    const xpNeeded = nextLevelXP - prevLevelXP;

    // Evitar división por cero
    if (xpNeeded <= 0) return 0;

    // Calcular el progreso actual
    const currentProgress = currentXP - prevLevelXP;

    // Calcular el porcentaje de progreso y asegurarse de que sea un número válido
    const progress = currentProgress / xpNeeded;

    // Verificar si el resultado es un número válido
    if (isNaN(progress) || !isFinite(progress)) {
      return 0;
    }

    // Limitar el valor entre 0 y 1
    return Math.min(1, Math.max(0, progress));
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
          onPress={refreshLevel}
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
        {/* Tarjeta de nivel */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{userLevel?.level || 1}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>
                {userLevel?.level_definitions ? userLevel.level_definitions.title : 'Principiante'}
              </Text>
              <Text style={styles.levelDescription}>
                {userLevel?.level_definitions ? userLevel.level_definitions.description : 'Acabas de empezar tu aventura'}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <ProgressBar
              progress={calculateProgress() || 0}
              color="#ff9800"
              style={styles.progressBar}
            />
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>
                XP: {userLevel?.total_xp || 0}
              </Text>
              <Text style={styles.progressText}>
                Siguiente nivel: {userLevel?.next_level_xp || 100} XP
              </Text>
            </View>
          </View>

          {userLevel?.level_definitions && userLevel.level_definitions.reward_description && (
            <View style={styles.rewardContainer}>
              <Ionicons name="gift-outline" size={20} color="#ff9800" />
              <Text style={styles.rewardText}>
                {userLevel.level_definitions.reward_description}
              </Text>
            </View>
          )}
        </View>

        {/* Tarjeta de ranking */}
        <View style={styles.rankingCard}>
          <Text style={styles.sectionTitle}>Ranking Global</Text>

          <View style={styles.rankingInfo}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankNumber}>#{rankingPosition || '?'}</Text>
            </View>
            <Text style={styles.rankingText}>
              {rankingPosition
                ? `¡Estás en la posición #${rankingPosition} del ranking global!`
                : 'Juega más para aparecer en el ranking global'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.rankingButton}
            onPress={() => navigation.navigate('Ranking')}
          >
            <Text style={styles.rankingButtonText}>Ver Ranking Completo</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Cómo ganar XP */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Cómo Ganar XP</Text>

          <View style={styles.xpItem}>
            <Ionicons name="trophy" size={24} color="#ffd700" />
            <View style={styles.xpItemContent}>
              <Text style={styles.xpItemTitle}>Desbloquear Logros</Text>
              <Text style={styles.xpItemDescription}>
                Cada logro desbloqueado otorga XP basado en su dificultad.
                Los logros secretos otorgan un 50% más de XP.
              </Text>
            </View>
          </View>

          <View style={styles.xpItem}>
            <Ionicons name="game-controller" size={24} color="#2196f3" />
            <View style={styles.xpItemContent}>
              <Text style={styles.xpItemTitle}>Jugar Partidas</Text>
              <Text style={styles.xpItemDescription}>
                Gana XP por cada partida jugada, verdad respondida y reto completado.
              </Text>
            </View>
          </View>

          <View style={styles.xpItem}>
            <Ionicons name="people" size={24} color="#4caf50" />
            <View style={styles.xpItemContent}>
              <Text style={styles.xpItemTitle}>Contribuir a la Comunidad</Text>
              <Text style={styles.xpItemDescription}>
                Crea sugerencias, vota por las de otros usuarios y consigue que tus sugerencias sean aprobadas.
              </Text>
            </View>
          </View>
        </View>
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
  levelCard: {
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
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffecb3',
  },
  rewardText: {
    fontSize: 14,
    color: '#ff8f00',
    marginLeft: 8,
    flex: 1,
  },
  rankingCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  rankingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  rankingText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  rankingButton: {
    backgroundColor: '#2196f3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  infoCard: {
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
  xpItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  xpItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  xpItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  xpItemDescription: {
    fontSize: 14,
    color: '#666',
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

export default LevelScreen;
