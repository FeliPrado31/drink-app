import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ImageBackground,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { Input, Button, Icon } from 'react-native-elements';
import { signInWithEmail, signUpWithEmail } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

type LoginScreenProps = {
  navigation: any;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Manejar inicio de sesión
        const { data, error } = await signInWithEmail(email, password);

        if (error) throw error;

        // Navegar a la pantalla Home al iniciar sesión correctamente
        navigation.navigate('Home');
      } else {
        // Manejar registro
        const { data, error } = await signUpWithEmail(email, password);

        if (error) throw error;

        Alert.alert(
          'Registro Exitoso',
          'Por favor revisa tu email para verificar tu cuenta y luego inicia sesión.',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ha ocurrido un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff5722" />

      {/* Fondo con gradiente */}
      <LinearGradient
        colors={['#ff5722', '#ff9800']}
        style={styles.background}
      />

      {/* Logo y título */}
      <View style={styles.headerContainer}>
        <Icon
          name="local-bar"
          type="material"
          size={80}
          color="white"
          containerStyle={styles.logoContainer}
        />
        <Text style={styles.appTitle}>Drink App</Text>
        <Text style={styles.appSubtitle}>El juego para tus fiestas</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</Text>

            <Input
              placeholder="Email"
              leftIcon={{ type: 'material', name: 'email', color: '#ff5722' }}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              inputContainerStyle={styles.inputContainer}
              containerStyle={styles.inputWrapper}
            />

            <Input
              placeholder="Contraseña"
              leftIcon={{ type: 'material', name: 'lock', color: '#ff5722' }}
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              autoCapitalize="none"
              inputContainerStyle={styles.inputContainer}
              containerStyle={styles.inputWrapper}
            />

            <Button
              title={isLogin ? 'Iniciar Sesión' : 'Registrarse'}
              onPress={handleAuth}
              loading={loading}
              loadingProps={{ color: 'white' }}
              buttonStyle={styles.button}
              containerStyle={styles.buttonContainer}
              icon={{
                name: isLogin ? 'login' : 'person-add',
                type: 'material',
                size: 20,
                color: 'white',
              }}
              iconRight
            />

            <TouchableOpacity
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchContainer}
            >
              <Text style={styles.switchText}>
                {isLogin
                  ? "¿No tienes cuenta? Regístrate"
                  : '¿Ya tienes cuenta? Inicia Sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: Dimensions.get('window').height,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 40 : 60,
    paddingBottom: 30,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  inputWrapper: {
    marginBottom: 8,
  },
  inputContainer: {
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  buttonContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#ff5722',
    borderRadius: 8,
    paddingVertical: 12,
  },
  switchContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: '#ff5722',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
