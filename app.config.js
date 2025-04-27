// Importamos el archivo app.json para usar sus valores
import appJson from './app.json';

// Función para obtener variables de entorno con valores por defecto para desarrollo local
const getEnvVars = () => {
  // En desarrollo local, usamos valores por defecto o de process.env
  if (!process.env.EAS_BUILD) {
    return {
      supabaseUrl: process.env.SUPABASE_URL || "https://tqheqenhhrurplpaewfm.supabase.co",
      // Nota: En desarrollo local, debes configurar esta variable en tu entorno
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "REEMPLAZAR_CON_CLAVE_REAL_EN_DESARROLLO"
    };
  }

  // En builds de EAS, usamos las variables de entorno de EAS
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  };
};

// Extendemos la configuración con valores adicionales
export default {
  ...appJson.expo,
  name: "Drink App",
  slug: "drink-app",
  ios: {
    ...appJson.expo.ios,
    bundleIdentifier: "com.feli.drinkapp"
  },
  android: {
    ...appJson.expo.android,
    package: "com.feli.drinkapp",
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE"
    ]
  },
  plugins: [
  ],
  extra: {
    eas: {
      projectId: "b6fd68ed-36e0-470b-aa93-117898c5a164"
    },
    ...getEnvVars()
  }
};
