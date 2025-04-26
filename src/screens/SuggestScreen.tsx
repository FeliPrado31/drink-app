import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Button, Input } from 'react-native-elements';
import { Picker } from '@react-native-picker/picker';
import { createSuggestion, getGameModes, GameMode, getSettings } from '../services/supabase';
import { useAchievements } from '../context/AchievementsContext';

type SuggestScreenProps = {
  navigation: any;
};

const SuggestScreen: React.FC<SuggestScreenProps> = ({ navigation }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'truth' | 'dare'>('truth');
  const [modeId, setModeId] = useState<number | null>(null);
  const [modes, setModes] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [minVotes, setMinVotes] = useState<string>('5');

  // Acceder al contexto de logros
  const { trackAchievements, updateStats } = useAchievements();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch game modes
        const { modes, error } = await getGameModes();
        if (error) throw error;

        setModes(modes || []);
        if (modes && modes.length > 0) {
          setModeId(modes[0].id);
        }

        // Fetch min votes setting
        const { value, error: settingsError } = await getSettings('min_votes_required');
        if (settingsError) throw settingsError;

        if (value) {
          setMinVotes(value);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Por favor ingresa el contenido de la sugerencia');
      return;
    }

    if (!modeId) {
      Alert.alert('Error', 'Por favor selecciona un modo de juego');
      return;
    }

    setSubmitting(true);
    try {
      const { suggestion, error } = await createSuggestion(content.trim(), type, modeId);

      if (error) throw error;

      // Registrar logro de creador de contenido
      trackAchievements([{ code: 'suggestion_creator' }]);

      // Actualizar estadísticas
      updateStats({ suggestions_created: 1 });

      Alert.alert(
        'Sugerencia Enviada',
        `Tu sugerencia ha sido enviada correctamente. Necesita ${minVotes} votos para ser aprobada.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error al enviar la sugerencia');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff5722" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Sugerir Nueva Pregunta/Reto</Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Modo de Juego:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={modeId}
                onValueChange={(itemValue) => setModeId(Number(itemValue))}
                style={styles.picker}
              >
                {modes.map((mode) => (
                  <Picker.Item key={mode.id} label={mode.name} value={mode.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Tipo:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={type}
                onValueChange={(itemValue) => setType(itemValue as 'truth' | 'dare')}
                style={styles.picker}
              >
                <Picker.Item label="Verdad" value="truth" />
                <Picker.Item label="Reto" value="dare" />
              </Picker>
            </View>

            <Text style={styles.label}>Contenido:</Text>
            <Input
              placeholder="Escribe tu pregunta o reto aquí"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.input}
            />

            <Text style={styles.infoText}>
              Tu sugerencia necesitará {minVotes} votos para ser aprobada y añadida al juego.
            </Text>

            <Button
              title="Enviar Sugerencia"
              onPress={handleSubmit}
              loading={submitting}
              buttonStyle={styles.submitButton}
              containerStyle={styles.buttonContainer}
            />

            <Button
              title="Cancelar"
              onPress={() => navigation.goBack()}
              buttonStyle={styles.cancelButton}
              containerStyle={styles.buttonContainer}
              type="outline"
            />
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  input: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginVertical: 5,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 5,
  },
  cancelButton: {
    borderColor: '#f44336',
    paddingVertical: 12,
    borderRadius: 5,
  },
});

export default SuggestScreen;
