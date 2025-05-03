import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-elements';

type BackButtonProps = {
  onPress: () => void;
  label?: string;
  color?: string;
  style?: any;
};

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  label = 'Volver',
  color = '#ff5722',
  style
}) => {
  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="arrow-back" type="material" size={20} color={color} />
      {label && <Text style={[styles.backButtonText, { color }]}>{label}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default BackButton;
