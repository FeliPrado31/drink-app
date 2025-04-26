import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { BANNER_AD_UNIT_ID } from '../services/admob';

type AdBannerProps = {
  // Mantenemos el tipo para compatibilidad, pero no lo usamos
  bannerSize?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard' | 'smartBannerPortrait' | 'smartBannerLandscape';
};

const AdBanner: React.FC<AdBannerProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bannerSize = 'smartBannerPortrait'
}) => {
  // Si estamos en web, mostramos un mensaje
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text>Ads not available on web</Text>
      </View>
    );
  }

  // Mostramos un banner simulado para evitar errores
  return (
    <View style={styles.container}>
      <View style={styles.adPlaceholder}>
        <Text style={styles.adText}>ANUNCIO</Text>
        <Text style={styles.adSubtext}>ID: {BANNER_AD_UNIT_ID}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#f5f5f5',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  adPlaceholder: {
    width: '100%',
    height: 50,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  adText: {
    fontWeight: 'bold',
    color: '#555',
  },
  adSubtext: {
    fontSize: 10,
    color: '#777',
  },
  errorText: {
    fontSize: 8,
    color: '#ff0000',
    marginTop: 2,
  },
});

export default AdBanner;
