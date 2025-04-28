#!/bin/bash

# Limpiar caché de Gradle
echo "Limpiando caché de Gradle..."
cd android
./gradlew clean
cd ..

# Limpiar caché de Metro
echo "Limpiando caché de Metro..."
npx react-native start --reset-cache --no-interactive &
METRO_PID=$!
sleep 5
kill $METRO_PID

# Limpiar caché de Expo
echo "Limpiando caché de Expo..."
npx expo start --clear

# Construir la aplicación con EAS
echo "Construyendo la aplicación con EAS..."
npx eas-cli build --platform android --profile development
