import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  StatusBar
} from 'react-native';
import { Button, Icon } from 'react-native-elements';
import { getCurrentUser, signOut } from '../services/supabase';
import { useAchievements } from '../context/AchievementsContext';
import { useLevel } from '../context/LevelContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

type HomeScreenProps = {
  navigation: any;
  route?: {
    params?: {
      refresh?: boolean;
    };
  };
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showTip, setShowTip] = useState(true);
  const { refreshAchievements, trackAchievements, userAchievements } = useAchievements();
  const { userLevel, rankingPosition } = useLevel();

  // Obtener dimensiones de la pantalla
  const screenWidth = Dimensions.get('window').width;

  // Función para cargar datos del usuario y actualizar la información
  const loadUserData = async (showLoading = true) => {
    if (showLoading) {
      setInitializing(true);
    }

    try {
      console.log('Obteniendo usuario actual...');
      const { user, error } = await getCurrentUser();

      if (error) {
        console.error('Error al obtener usuario:', error);
        return;
      }

      if (user) {
        console.log('Usuario autenticado:', user.email);
        setUserEmail(user.email);

        // Inicializar logros cuando el usuario inicia sesión
        console.log('Inicializando logros para el usuario...');
        await refreshAchievements();

        // Verificar logro de regreso (si el usuario vuelve después de un tiempo)
        try {
          const lastLogin = await AsyncStorage.getItem('lastLogin');
          const now = new Date().getTime();

          if (lastLogin) {
            const daysSinceLastLogin = (now - parseInt(lastLogin)) / (1000 * 60 * 60 * 24);
            console.log(`Días desde último inicio de sesión: ${daysSinceLastLogin.toFixed(1)}`);

            if (daysSinceLastLogin >= 30) {
              console.log('¡El usuario ha vuelto después de 30 días! Desbloqueando logro...');
              trackAchievements([{ code: 'comeback_kid' }]);
            }
          }

          // Guardar la fecha de inicio de sesión actual
          await AsyncStorage.setItem('lastLogin', now.toString());
        } catch (storageError) {
          console.error('Error al acceder al almacenamiento:', storageError);
        }
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setInitializing(false);
    }
  };

  // Efecto para cargar datos cuando el componente se monta
  useEffect(() => {
    loadUserData();
  }, []);

  // Efecto para recargar datos cuando se recibe el parámetro refresh
  useEffect(() => {
    if (route?.params?.refresh) {
      console.log('Recargando datos después de terminar partida...');
      // Recargar sin mostrar el indicador de carga completo
      loadUserData(false);

      // Limpiar el parámetro de refresh para evitar recargas innecesarias
      // Usar setTimeout para evitar actualizar el estado durante el renderizado
      setTimeout(() => {
        navigation.setParams({ refresh: undefined });
      }, 100);
    }
  }, [route?.params?.refresh, loadUserData, navigation]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      // Navigate back to login screen
      navigation.navigate('Login');
    }
  };

  const handleNewGame = () => {
    navigation.navigate('GameMode');
  };

  const handleSuggest = () => {
    navigation.navigate('Suggest');
  };

  const handleVote = () => {
    navigation.navigate('Vote');
  };

  const handleAchievements = () => {
    navigation.navigate('Achievements');
  };

  const handleLevel = () => {
    navigation.navigate('Level');
  };

  const handleStats = () => {
    navigation.navigate('Stats');
  };

  // Calcular estadísticas para mostrar
  const unlockedAchievements = userAchievements ? userAchievements.filter(ua => ua.unlocked).length : 0;
  const totalAchievements = userAchievements ? userAchievements.length : 0;
  const achievementPercentage = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

  // Consejos para mostrar en el banner
  const tips = [
    "¡Completa retos para desbloquear logros!",
    "Sugiere nuevas preguntas para ganar XP",
    "Vota por las mejores sugerencias de la comunidad",
    "Juega con amigos para una experiencia más divertida",
    "Desbloquea todos los logros para convertirte en leyenda"
  ];

  // Seleccionar un consejo aleatorio
  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  // Función para cerrar el banner de consejos
  const handleCloseTip = () => {
    setShowTip(false);
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>¡Bienvenido!</Text>
            {userEmail && (
              <Text style={styles.emailText}>{userEmail}</Text>
            )}
          </View>

          {/* Información de nivel */}
          <TouchableOpacity
            style={styles.levelBadge}
            onPress={handleLevel}
          >
            <Text style={styles.levelNumber}>{userLevel?.level || 1}</Text>
            <Text style={styles.levelLabel}>NIVEL</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Contenido principal (scrollable) */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Banner de consejos */}
        {showTip && (
          <View style={styles.tipBanner}>
            <Icon name="lightbulb-outline" type="material" size={24} color="#ff9800" />
            <Text style={styles.tipText}>{randomTip}</Text>
            <TouchableOpacity onPress={handleCloseTip}>
              <Icon name="close" type="material" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de carga */}
        {initializing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ff9800" />
            <Text style={styles.loadingText}>Inicializando logros...</Text>
          </View>
        )}

        {/* Tarjeta de juego principal */}
        <TouchableOpacity
          style={styles.mainGameCard}
          onPress={handleNewGame}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={{ uri: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg' }}
            style={styles.gameCardBg}
            imageStyle={styles.gameCardImage}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
              style={styles.gameCardGradient}
            >
              <View style={styles.gameCardContent}>
                <Text style={styles.gameCardTitle}>¡JUGAR AHORA!</Text>
                <Text style={styles.gameCardSubtitle}>Verdad o Reto</Text>
                <View style={styles.playButtonContainer}>
                  <Icon name="play-circle-filled" type="material" size={40} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>

        {/* Tarjetas de estadísticas rápidas */}
        <View style={styles.statsCards}>
          <TouchableOpacity
            style={[styles.statsCard, styles.achievementsCard]}
            onPress={handleAchievements}
          >
            <Icon name="emoji-events" type="material" size={28} color="#ff9800" />
            <Text style={styles.statsValue}>{unlockedAchievements}/{totalAchievements}</Text>
            <Text style={styles.statsLabel}>Logros</Text>
            <View style={styles.statsProgressContainer}>
              <View
                style={[
                  styles.statsProgressBar,
                  { width: `${achievementPercentage}%` }
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statsCard, styles.rankingCard]}
            onPress={handleLevel}
          >
            <Icon name="leaderboard" type="material" size={28} color="#2196f3" />
            <Text style={styles.statsValue}>#{rankingPosition || '?'}</Text>
            <Text style={styles.statsLabel}>Ranking</Text>
          </TouchableOpacity>
        </View>

        {/* Sección de comunidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comunidad</Text>

          <View style={styles.actionCards}>
            <TouchableOpacity
              style={[styles.actionCard, styles.suggestCard]}
              onPress={handleSuggest}
            >
              <Icon name="lightbulb" type="material" size={32} color="#4caf50" />
              <Text style={styles.actionCardTitle}>Sugerir</Text>
              <Text style={styles.actionCardSubtitle}>Pregunta/Reto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.voteCard]}
              onPress={handleVote}
            >
              <Icon name="how-to-vote" type="material" size={32} color="#2196f3" />
              <Text style={styles.actionCardTitle}>Votar</Text>
              <Text style={styles.actionCardSubtitle}>Sugerencias</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de estadísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas</Text>

          <TouchableOpacity
            style={styles.statsDetailCard}
            onPress={handleStats}
          >
            <View style={styles.statsDetailContent}>
              <Icon name="bar-chart" type="material" size={32} color="#607d8b" />
              <View style={styles.statsDetailText}>
                <Text style={styles.statsDetailTitle}>Estadísticas Detalladas</Text>
                <Text style={styles.statsDetailSubtitle}>Ver todas tus estadísticas de juego</Text>
              </View>
            </View>
            <Icon name="chevron-right" type="material" size={24} color="#607d8b" />
          </TouchableOpacity>
        </View>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

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
  // Header
  header: {
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  levelLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },

  // Contenido principal
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Banner de consejos
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#ff8f00',
    marginHorizontal: 12,
  },

  // Indicador de carga
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff8e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcc80',
  },
  loadingText: {
    fontSize: 14,
    color: '#ff9800',
    fontStyle: 'italic',
    marginLeft: 8,
  },

  // Tarjeta de juego principal
  mainGameCard: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  gameCardBg: {
    width: '100%',
    height: '100%',
  },
  gameCardImage: {
    borderRadius: 12,
  },
  gameCardGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  gameCardContent: {
    alignItems: 'center',
  },
  gameCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  gameCardSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  playButtonContainer: {
    marginTop: 8,
  },

  // Tarjetas de estadísticas
  statsCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementsCard: {
    marginRight: 8,
  },
  rankingCard: {
    marginLeft: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
  },
  statsProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  statsProgressBar: {
    height: '100%',
    backgroundColor: '#ff9800',
    borderRadius: 2,
  },

  // Secciones
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },

  // Tarjetas de acción
  actionCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: 120,
    justifyContent: 'center',
  },
  suggestCard: {
    marginRight: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  voteCard: {
    marginLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // Tarjeta de estadísticas detalladas
  statsDetailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsDetailContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statsDetailText: {
    marginLeft: 16,
    flex: 1,
  },
  statsDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statsDetailSubtitle: {
    fontSize: 12,
    color: '#666',
  },

  // Botón de cerrar sesión
  signOutButton: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  signOutText: {
    color: '#666',
    fontSize: 16,
  },

  // Espacio adicional al final
  bottomPadding: {
    height: 40,
  },

  // Estilos antiguos que se mantienen para compatibilidad
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  buttonContainer: {
    width: '80%',
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
  },
  primaryButton: {
    backgroundColor: '#ff5722',
  },
  suggestButton: {
    backgroundColor: '#4caf50',
  },
  voteButton: {
    backgroundColor: '#2196f3',
  },
  achievementsButton: {
    backgroundColor: '#ff9800',
  },
  levelButton: {
    backgroundColor: '#9c27b0',
  },
  statsButton: {
    backgroundColor: '#607d8b',
  },
  signOutContainer: {
    marginTop: 20,
  },
});

export default HomeScreen;
