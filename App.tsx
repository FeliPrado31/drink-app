import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import { supabase } from './src/services/supabase';
import ErrorBoundary from './src/components/ErrorBoundary';
import { logger } from './src/utils/logger';
import { cacheManager } from './src/utils/cacheManager';
import { xpQueue } from './src/utils/xpQueue';
import { syncManager } from './src/utils/syncManager';

// Ignorar advertencias específicas
LogBox.ignoreLogs([
  'Reanimated 3',
  'VirtualizedLists should never be nested',
  'ViewPropTypes will be removed from React Native',
  'NativeEventEmitter',
]);

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import GameModeScreen from './src/screens/GameModeScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import GameScreen from './src/screens/GameScreen';
import SuggestScreen from './src/screens/SuggestScreen';
import VoteScreen from './src/screens/VoteScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import LevelScreen from './src/screens/LevelScreen';
import RankingScreen from './src/screens/RankingScreen';
import StatsScreen from './src/screens/StatsScreen';

// Import contexts
import { AchievementsProvider } from './src/context/AchievementsContext';
import { LevelProvider } from './src/context/LevelContext';
import { AuthProvider } from './src/context/AuthContext';

// Create stack navigator
const Stack = createNativeStackNavigator();

export default function App() {
  const [key, setKey] = useState(0);

  // Configurar el nivel de log según el entorno
  useEffect(() => {
    if (__DEV__) {
      logger.setLogLevel(0); // DEBUG en desarrollo
    } else {
      logger.setLogLevel(3); // ERROR en producción (solo errores)
    }

    // Solo registrar inicio en desarrollo
    if (__DEV__) {
      logger.info('Aplicación iniciada');
    }

    // La inicialización de anuncios ha sido eliminada temporalmente

    // Registrar tareas de sincronización periódica
    syncManager.registerTask(
      'flush-xp-queue',
      'Procesar cola de XP',
      async () => {
        logger.debug('Ejecutando tarea programada: Procesar cola de XP');
        await xpQueue.flush();
      },
      30000 // Cada 30 segundos
    );

    // Limpiar al desmontar
    return () => {
      syncManager.unregisterTask('flush-xp-queue');
      xpQueue.stopAutoFlush();
      logger.info('Aplicación detenida');
    };
  }, []);

  // Función para reiniciar la aplicación en caso de error
  const handleReset = () => {
    setKey(prevKey => prevKey + 1);

    // Limpiar caché al reiniciar
    cacheManager.invalidateAll();
    logger.info('Aplicación reiniciada');
  };

  // Normal app rendering
  return (
    <ErrorBoundary onReset={handleReset}>
      <GestureHandlerRootView style={{ flex: 1 }} key={key}>
        <SafeAreaProvider>
          <PaperProvider>
            <AuthProvider>
              <AchievementsProvider>
                <LevelProvider>
                  <NavigationContainer>
                  <Stack.Navigator
                    initialRouteName="Login"
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="GameMode" component={GameModeScreen} />
                    <Stack.Screen name="Players" component={PlayersScreen} />
                    <Stack.Screen name="Game" component={GameScreen} />
                    <Stack.Screen name="Suggest" component={SuggestScreen} />
                    <Stack.Screen name="Vote" component={VoteScreen} />
                    <Stack.Screen name="Achievements" component={AchievementsScreen} />
                    <Stack.Screen name="Level" component={LevelScreen} />
                    <Stack.Screen name="Ranking" component={RankingScreen} />
                    <Stack.Screen name="Stats" component={StatsScreen} />
              </Stack.Navigator>
                <StatusBar style="auto" />
              </NavigationContainer>
                </LevelProvider>
              </AchievementsProvider>
            </AuthProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
