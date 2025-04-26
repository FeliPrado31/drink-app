import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Button } from 'react-native-elements';
import { showInterstitialAd } from '../services/admob';

type InterstitialAdButtonProps = {
  onPress?: () => void;
  text?: string;
  style?: any;
};

/**
 * Botón que muestra un anuncio intersticial cuando se presiona
 * @param onPress Función a ejecutar después de mostrar el anuncio
 * @param text Texto del botón
 * @param style Estilos adicionales para el botón
 */
const InterstitialAdButton: React.FC<InterstitialAdButtonProps> = ({
  onPress,
  text = 'Continuar',
  style,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);

    try {
      // Intentar mostrar un anuncio intersticial
      const adShown = await showInterstitialAd();

      // Ejecutar la función onPress independientemente de si se mostró el anuncio o no
      if (onPress) {
        onPress();
      }
    } catch (error) {
      console.error('Error showing interstitial ad:', error);

      // Si hay un error, ejecutar la función onPress de todos modos
      if (onPress) {
        onPress();
      }
    } finally {
      setLoading(false);
    }
  };

  // Usar el componente Button de react-native-elements para mantener la consistencia con el diseño original
  return (
    <Button
      title={text}
      onPress={handlePress}
      buttonStyle={style}
      loading={loading}
      loadingProps={{ color: '#fff', size: 'small' }}
      disabled={loading}
    />
  );
};

export default InterstitialAdButton;
