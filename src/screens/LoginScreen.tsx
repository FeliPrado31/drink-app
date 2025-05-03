import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Input, Button, Icon } from 'react-native-elements';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

type LoginScreenProps = {
  navigation: any;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  // Usar el contexto de autenticación optimizado
  const { signIn, signUp, loading, user, refreshSession } = useAuth();

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Si hay un usuario autenticado, navegar a Home
        if (user) {
          console.log('Usuario ya autenticado, redirigiendo a Home');
          navigation.navigate('Home');
        } else {
          // Intentar refrescar la sesión para verificar si hay una sesión persistente
          await refreshSession();

          // Verificar nuevamente después de refrescar
          if (user) {
            console.log('Sesión recuperada después de refrescar, redirigiendo a Home');
            navigation.navigate('Home');
          }
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
      } finally {
        // Finalizar la carga inicial
        setInitialLoading(false);
      }
    };

    checkAuth();
  }, [user, navigation, refreshSession]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    console.log('Iniciando proceso de autenticación...');
    console.log('Modo:', isLogin ? 'Inicio de sesión' : 'Registro');
    console.log('Email:', email);

    try {
      if (isLogin) {
        console.log('Intentando iniciar sesión...');
        // Manejar inicio de sesión con el nuevo contexto
        const { error } = await signIn(email, password);

        if (error) {
          // Registrar el error en la consola en lugar de mostrar un modal
          console.error('Error de inicio de sesión:', error.message || error);

          // Mostrar un mensaje al usuario para mejor experiencia
          Alert.alert(
            'Error de inicio de sesión',
            'No se pudo iniciar sesión. Por favor verifica tus credenciales o crea una cuenta si aún no tienes una.',
            [{ text: 'OK' }]
          );

          throw error;
        }

        console.log('Inicio de sesión exitoso, esperando redirección...');
        // La navegación se maneja en el useEffect cuando cambia el usuario
      } else {
        console.log('Intentando registrar nuevo usuario...');
        // Manejar registro con el nuevo contexto
        const { error } = await signUp(email, password);

        if (error) {
          // Registrar el error en la consola en lugar de mostrar un modal
          console.error('Error de registro:', error.message || error);

          // Mostrar un mensaje al usuario para mejor experiencia
          Alert.alert(
            'Error de registro',
            'No se pudo crear la cuenta. El email podría estar en uso o hay un problema con el servidor.',
            [{ text: 'OK' }]
          );

          throw error;
        }

        console.log('Registro exitoso');
        Alert.alert(
          'Registro Exitoso',
          'Por favor revisa tu email para verificar tu cuenta y luego inicia sesión.',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );
      }
    } catch (error: any) {
      // Registrar el error en la consola
      console.error('Error de autenticación:', error.message || error);
      console.error('Detalles completos del error:', JSON.stringify(error));

      // Mostrar un mensaje en la consola en lugar de un modal
      console.warn('Por favor revisa la consola para ver detalles del error de autenticación');
    }
  };

  // Mostrar un indicador de carga mientras se verifica la sesión
  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#ff5722" />
        <LinearGradient
          colors={['#ff5722', '#ff9800']}
          style={styles.background}
        />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
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
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 40,
    paddingBottom: 20,
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
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
  // Estilos para la pantalla de carga
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
  },
});

export default LoginScreen;
