import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { initializeAdMob } from './src/services/admob';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import GameModeScreen from './src/screens/GameModeScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import GameScreen from './src/screens/GameScreen';
import SuggestScreen from './src/screens/SuggestScreen';
import VoteScreen from './src/screens/VoteScreen';

// Create stack navigator
const Stack = createNativeStackNavigator();

// Error boundary componentred
const ErrorDisplay = ({ error }: { error: Error }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>An error occurred</Text>
    <Text style={styles.errorMessage}>{error.message}</Text>
  </View>
);

export default function App() {
  const [error, setError] = useState<Error | null>(null);

  // Initialize AdMob
  useEffect(() => {
    const setupAdMob = async () => {
      try {
        // Inicializar AdMob con los IDs reales
        const success = await initializeAdMob();
        if (success) {
          console.log('AdMob initialized successfully');
        } else {
          console.warn('AdMob initialization returned false');
        }
      } catch (error) {
        console.error('AdMob initialization failed:', error);
      }
    };

    // Ejecutar la inicialización cuando la aplicación esté lista
    setupAdMob();
  }, []);

  // Global error handler
  useEffect(() => {
    const handleError = (error: Error) => {
      console.error('Global error caught:', error);
      setError(error);
    };

    // Set up global error handler
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((e, isFatal) => {
      handleError(e);
      originalErrorHandler(e, isFatal);
    });

    return () => {
      // Restore original handler on cleanup
      ErrorUtils.setGlobalHandler(originalErrorHandler);
    };
  }, []);

  // If there's an error, show the error screen
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // Normal app rendering
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Drink App',
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="GameMode"
            component={GameModeScreen}
            options={{
              title: 'Seleccionar Modo',
              headerBackTitle: 'Inicio',
            }}
          />
          <Stack.Screen
            name="Players"
            component={PlayersScreen}
            options={{
              title: 'Agregar Jugadores',
              headerBackTitle: 'Modos',
            }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={({ route }: any) => ({
              title: route.params?.modeName ? `Modo ${route.params.modeName}` : 'Juego',
              headerBackTitle: 'Jugadores',
            })}
          />
          <Stack.Screen
            name="Suggest"
            component={SuggestScreen}
            options={{
              title: 'Sugerir Pregunta/Reto',
              headerBackTitle: 'Inicio',
            }}
          />
          <Stack.Screen
            name="Vote"
            component={VoteScreen}
            options={{
              title: 'Votar Sugerencias',
              headerBackTitle: 'Inicio',
            }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e53935',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});
