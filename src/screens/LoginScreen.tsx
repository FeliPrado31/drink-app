import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { signInWithEmail, signUpWithEmail } from '../services/supabase';

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
      <View style={styles.formContainer}>
        <Text style={styles.title}>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</Text>

        <Input
          placeholder="Email"
          leftIcon={{ type: 'material', name: 'email' }}
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Input
          placeholder="Contraseña"
          leftIcon={{ type: 'material', name: 'lock' }}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          autoCapitalize="none"
        />

        <Button
          title={isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          onPress={handleAuth}
          loading={loading}
          buttonStyle={styles.button}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6200ee',
    borderRadius: 5,
    marginTop: 10,
  },
  switchContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#6200ee',
    fontSize: 16,
  },
});

export default LoginScreen;
