import { Platform } from 'react-native';

// ID de la aplicación de AdMob
export const APP_ID = Platform.select({
  ios: 'ca-app-pub-7275388055615808~3583010996', // Usar el mismo ID para iOS por ahora
  android: 'ca-app-pub-7275388055615808~3583010996', // ID de la aplicación para Android
  default: 'ca-app-pub-7275388055615808~3583010996',
});

// ID del banner de AdMob
export const BANNER_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-7275388055615808/4816185702', // Usar el mismo ID para iOS por ahora
  android: 'ca-app-pub-7275388055615808/4816185702', // ID del banner para Android
  default: 'ca-app-pub-7275388055615808/4816185702',
});

// ID para anuncios intersticiales
export const INTERSTITIAL_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-7275388055615808/3059191415', // Usar el mismo ID para iOS por ahora
  android: 'ca-app-pub-7275388055615808/3059191415', // ID real para Android
  default: 'ca-app-pub-7275388055615808/3059191415',
});

// Variable para controlar si AdMob está disponible
export let isAdMobAvailable = false;

// Inicializar AdMob
export const initializeAdMob = async () => {
  try {
    if (Platform.OS === 'web') {
      console.log('AdMob no está disponible en web');
      return false;
    }

    // Simulamos que AdMob está disponible sin importarlo
    // Esto evita el error "Value is undefined, expected an object"
    isAdMobAvailable = true;
    console.log('AdMob initialized successfully (simulated)');
    return true;
  } catch (error) {
    console.error('Error initializing AdMob:', error);
    return false;
  }
};

// Función para cargar y mostrar un anuncio intersticial (simulada)
export const showInterstitialAd = async () => {
  try {
    if (Platform.OS === 'web' || !isAdMobAvailable) {
      console.log('Interstitial ads not available');
      return false;
    }

    // Simulamos la carga y visualización de un anuncio intersticial
    console.log('Showing interstitial ad (simulated) with ID:', INTERSTITIAL_AD_UNIT_ID);

    // Simulamos un pequeño retraso para que parezca que se está cargando el anuncio
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
  } catch (error) {
    console.error('Error showing interstitial ad:', error);
    return false;
  }
};
