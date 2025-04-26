import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-elements';
import { getCurrentUser, signOut } from '../services/supabase';
import AdBanner from '../components/AdBanner';

type HomeScreenProps = {
  navigation: any;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get current user when component mounts
    const fetchUser = async () => {
      const { user, error } = await getCurrentUser();
      if (user) {
        setUserEmail(user.email);
      }
    };

    fetchUser();
  }, []);

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

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>¡Bienvenido a Drink App!</Text>
        {userEmail && (
          <Text style={styles.emailText}>Sesión iniciada como: {userEmail}</Text>
        )}

        <Button
          title="Nuevo Juego"
          onPress={handleNewGame}
          buttonStyle={[styles.button, styles.primaryButton]}
          containerStyle={styles.buttonContainer}
        />

        <View style={styles.communitySection}>
          <Text style={styles.sectionTitle}>Comunidad</Text>

          <Button
            title="Sugerir Pregunta/Reto"
            onPress={handleSuggest}
            buttonStyle={[styles.button, styles.suggestButton]}
            containerStyle={styles.buttonContainer}
            icon={{
              name: 'lightbulb-outline',
              type: 'material',
              size: 20,
              color: 'white',
            }}
            iconRight
          />

          <Button
            title="Votar Sugerencias"
            onPress={handleVote}
            buttonStyle={[styles.button, styles.voteButton]}
            containerStyle={styles.buttonContainer}
            icon={{
              name: 'thumb-up',
              type: 'material',
              size: 20,
              color: 'white',
            }}
            iconRight
          />
        </View>

        <Button
          title="Cerrar Sesión"
          onPress={handleSignOut}
          buttonStyle={styles.button}
          containerStyle={[styles.buttonContainer, styles.signOutContainer]}
          type="outline"
        />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666',
  },
  communitySection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
  signOutContainer: {
    marginTop: 20,
  },
});

export default HomeScreen;
