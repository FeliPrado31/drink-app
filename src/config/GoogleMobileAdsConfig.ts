// Configuración para Google Mobile Ads
import { TestIds } from 'react-native-google-mobile-ads';

// IDs de AdMob
export const AD_IDS = {
  APP_ID: 'ca-app-pub-7275388055615808~3583010996',
  BANNER: 'ca-app-pub-7275388055615808/4816185702',
  INTERSTITIAL: 'ca-app-pub-7275388055615808/3059191415',
};

// Determinar si estamos en modo de desarrollo
export const isDevelopment = __DEV__;

// Obtener los IDs adecuados según el entorno
export const getAdUnitId = (type: 'BANNER' | 'INTERSTITIAL') => {
  if (isDevelopment) {
    // En desarrollo, usar IDs de prueba
    return type === 'BANNER' ? TestIds.BANNER : TestIds.INTERSTITIAL;
  } else {
    // En producción, usar IDs reales
    return AD_IDS[type];
  }
};

// Configuración para la inicialización de Google Mobile Ads
export const mobileAdsConfig = {
  requestConfiguration: {
    // Solicitar anuncios no personalizados por defecto
    tagForChildDirectedTreatment: true,
    tagForUnderAgeOfConsent: true,
  }
};
