// Importamos el archivo app.json para usar sus valores
import appJson from './app.json';

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
    supabaseUrl: "https://ldhlwodndotijyeysibl.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaGx3b2RuZG90aWp5ZXlzaWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2MjQ1MDUsImV4cCI6MjA2MTIwMDUwNX0.oxkkZ42hW-0jbHt2muePWUAPhv6Ooq10VsD30ONCP2Q"
  }
};
