import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../services/supabase';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el estado para que el siguiente renderizado muestre la UI alternativa
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar el error en la consola para depuración
    console.error('Error capturado por ErrorBoundary:', error);
    console.error('Información del error:', errorInfo);

    // Verificar si es un error de autenticación
    this.handleAuthError(error);
  }

  handleAuthError = (error: Error) => {
    // Verificar si el error está relacionado con la autenticación
    if (
      error.message.includes('no autenticado') ||
      error.message.includes('not authenticated') ||
      error.message.includes('JWT expired')
    ) {
      // Registrar el error de autenticación en la consola
      console.error('Error de autenticación detectado:', error.message);

      // Para errores de autenticación, cerrar sesión y reiniciar
      (async () => {
        try {
          await supabase.auth.signOut();
          this.setState({ hasError: false, error: null });
          if (this.props.onReset) {
            this.props.onReset();
          }
        } catch (signOutError) {
          console.error('Error al cerrar sesión:', signOutError);
        }
      })();
    } else {
      // Para otros tipos de errores, solo registrarlos en la consola
      console.error('Error no relacionado con autenticación:', error.message);
    }
  };

  resetError = async () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Registrar el error en la consola en lugar de mostrar una UI de error
      console.error('Error en la renderización:', this.state.error?.message || 'Error desconocido');
      console.warn('Por favor revisa la consola para ver detalles del error');

      // Mostrar un botón de reintentar más discreto en lugar de una pantalla completa de error
      return (
        <View style={styles.miniErrorContainer}>
          <Text style={styles.miniErrorText}>
            Error detectado. Revisa la consola para más detalles.
          </Text>
          <TouchableOpacity style={styles.miniButton} onPress={this.resetError}>
            <Text style={styles.miniButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e53935',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Estilos para la versión mini del error
  miniErrorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
  },
  miniErrorText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  miniButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  miniButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default ErrorBoundary;
