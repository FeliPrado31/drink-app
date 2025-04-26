import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AchievementNotificationProps = {
  title: string;
  description: string;
  icon: string;
  onClose: () => void;
  duration?: number;
  reward?: string;
};

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  title,
  description,
  icon,
  onClose,
  duration = 3000,
  reward
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    // Configurar temporizador para cerrar automáticamente
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    // Animación de salida
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      onClose();
    });
  };

  const getIconName = (iconKey: string) => {
    const iconMap: { [key: string]: string } = {
      'game-controller': 'game-controller',
      'comment-question': 'help-circle',
      'run': 'walk',
      'glass-cocktail': 'wine',
      'lightbulb': 'bulb',
      'check-circle': 'checkmark-circle',
      'thumb-up': 'thumbs-up',
      'fire': 'flame',
      'account-group': 'people',
      'run-fast': 'speedometer',
      'moon': 'moon',
      'people-circle': 'people-circle',
      'search': 'search',
      'beer': 'beer',
      'crown': 'crown',
      'calendar': 'calendar',
      'refresh-circle': 'refresh-circle',
      'globe': 'globe',
      'checkmark-done-circle': 'checkmark-done-circle'
    };

    return iconMap[iconKey] || 'trophy';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={getIconName(icon)} size={32} color="#FFD700" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>¡Logro Desbloqueado!</Text>
          <Text style={styles.achievementTitle}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {reward && (
            <View style={styles.rewardContainer}>
              <Ionicons name="gift" size={14} color="#ff8f00" style={styles.rewardIcon} />
              <Text style={styles.rewardText}>Recompensa: {reward}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={20} color="#757575" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: 16,
    paddingTop: 40, // Para evitar el notch en dispositivos iOS
  },
  content: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ffd54f',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ffd54f',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff8f00',
    marginBottom: 2,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#757575',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 236, 179, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardIcon: {
    marginRight: 4,
  },
  rewardText: {
    fontSize: 11,
    color: '#ff8f00',
    fontWeight: 'bold',
  },
});

export default AchievementNotification;
