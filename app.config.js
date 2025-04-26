export default {
  name: "Drink App",
  slug: "drink-app",
  version: "1.0.0",
  orientation: "portrait",
  // Comentamos estas líneas para evitar errores ya que no tenemos estos archivos
  // icon: "./assets/icon.png",
  // splash: {
  //   image: "./assets/splash.png",
  //   resizeMode: "contain",
  //   backgroundColor: "#ffffff"
  // },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.feli.drinkapp",
    // Configuración de AdMob para iOS
    config: {
      googleMobileAdsAppId: "ca-app-pub-7275388055615808~3583010996" // ID real de AdMob para iOS
    }
  },
  android: {
    // adaptiveIcon: {
    //   foregroundImage: "./assets/adaptive-icon.png",
    //   backgroundColor: "#FFFFFF"
    // },
    package: "com.feli.drinkapp",
    // Configuración de AdMob para Android
    config: {
      googleMobileAdsAppId: "ca-app-pub-7275388055615808~3583010996" // ID real de AdMob para Android
    },
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE"
    ]
  },
  web: {
    // favicon: "./assets/favicon.png"
  },
  plugins: [
    [
      "expo-ads-admob",
      {
        "userTrackingPermission": "Esta aplicación utiliza tecnología de publicidad que recopila información sobre tu dispositivo para mostrarte anuncios relevantes."
      }
    ]
  ],
  extra: {
    eas: {
      projectId: "your-project-id"
    }
  },
  // Habilitar la nueva arquitectura para mejor compatibilidad
  newArchEnabled: true
};
