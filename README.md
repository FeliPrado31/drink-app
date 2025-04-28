# Drink App

Una aplicación de juego de bebidas con verdades y retos.

## Configuración del Proyecto

### Requisitos Previos

- Node.js (v14 o superior)
- Expo CLI
- Android Studio (para desarrollo en Android)
- Xcode (para desarrollo en iOS, solo macOS)
- Cuenta en Supabase

### Variables de Entorno

Este proyecto utiliza variables de entorno para gestionar configuraciones sensibles como las credenciales de Supabase. Hay dos formas de configurar estas variables:

#### 1. Desarrollo Local

Para desarrollo local, crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```bash
cp .env.example .env
```

Luego, edita el archivo `.env` y añade tus credenciales:

```
# Variables de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anonima
SUPABASE_DATABASE=tu-id-de-base-de-datos

# Variables de Android
ANDROID_HOME=$HOME/Android/Sdk
ANDROID_SDK_ROOT=$HOME/Android/Sdk
PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator
```

#### 2. Despliegue con EAS (Expo Application Services)

Para despliegues con EAS, las variables de entorno se gestionan de forma segura a través de EAS Secrets. Las variables ya están configuradas como secretas en EAS para todos los entornos (development, preview y production).

Si necesitas actualizar estas variables, puedes usar los siguientes comandos:

```bash
# Iniciar sesión en EAS (si aún no lo has hecho)
eas login

# Listar las variables de entorno existentes
eas env:list production  # También puedes usar 'development' o 'preview'

# Actualizar una variable existente
eas env:update SUPABASE_URL --scope project --type string --secret

# Crear una nueva variable secreta
eas env:create --scope project --name NUEVA_VARIABLE --type string --secret
```

**Importante**: Las claves de Supabase están configuradas como secretas en EAS y no se pueden ver ni modificar desde la interfaz de usuario. Solo se pueden acceder durante el proceso de construcción en EAS.

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/drink-app.git
   cd drink-app
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia la aplicación:
   ```bash
   npm start
   ```

## Desarrollo

### Estructura del Proyecto

- `/src`: Código fuente de la aplicación
  - `/components`: Componentes reutilizables
  - `/screens`: Pantallas de la aplicación
  - `/services`: Servicios (Supabase, etc.)
  - `/context`: Contextos de React
- `/assets`: Recursos estáticos (imágenes, fuentes, etc.)

### Comandos Útiles

- `npm start`: Inicia el servidor de desarrollo
- `npm run android`: Inicia la aplicación en un dispositivo/emulador Android
- `npm run ios`: Inicia la aplicación en un dispositivo/emulador iOS
- `npm run web`: Inicia la aplicación en un navegador web

## Despliegue

### Construcción Local

Para construir un APK para Android:

```bash
eas build --platform android --profile local
```

### Construcción en EAS

Para construir la aplicación en EAS:

```bash
# Versión de desarrollo
eas build --platform android --profile development

# Versión de vista previa
eas build --platform android --profile preview

# Versión de producción
eas build --platform android --profile production
```

### Publicación en Google Play Store

Para publicar la aplicación en Google Play Store, sigue estos pasos:

1. **Preparación de recursos**:
   - Asegúrate de tener los siguientes recursos listos:
     - Ícono de la aplicación (512x512 px)
     - Imagen de portada (1024x500 px)
     - Capturas de pantalla (al menos 2 por dispositivo)
     - Video promocional (opcional)
     - Descripción corta (80 caracteres máximo)
     - Descripción completa (4000 caracteres máximo)

2. **Crear una cuenta de desarrollador**:
   - Regístrate en la [Google Play Console](https://play.google.com/console/signup)
   - Paga la tarifa única de registro ($25 USD)

3. **Configurar la aplicación en Google Play Console**:
   - Crea una nueva aplicación
   - Completa la información de la ficha de Play Store
   - Configura la clasificación de contenido
   - Configura el precio y la distribución

4. **Generar un AAB (Android App Bundle) para producción**:
   ```bash
   eas build --platform android --profile production
   ```

5. **Subir el AAB a Google Play Console**:
   - Ve a la sección "Producción" en Google Play Console
   - Crea una nueva versión
   - Sube el archivo AAB generado
   - Completa las notas de la versión
   - Envía para revisión

6. **Actualizar la aplicación**:
   Para futuras actualizaciones, incrementa la versión en `app.json` y ejecuta:
   ```bash
   eas build --platform android --profile production
   ```

7. **Enviar actualizaciones a través de EAS Update** (opcional):
   Para cambios menores que no requieren una nueva versión en la tienda:
   ```bash
   eas update --branch production --message "Descripción de la actualización"
   ```

## Seguridad

- Nunca incluyas claves API o secretos directamente en el código
- Utiliza siempre variables de entorno o EAS Secrets para gestionar información sensible
- Asegúrate de que `.env` esté incluido en `.gitignore` para evitar subir credenciales al repositorio

## Configuración de AdMob

La aplicación está configurada para mostrar anuncios utilizando AdMob. Los IDs de AdMob están configurados en `app.json`:

- App ID: ca-app-pub-7275388055615808~3583010996
- Banner ID: ca-app-pub-7275388055615808/4816185702
- Interstitial ad ID: ca-app-pub-7275388055615808/3059191415

Para implementar completamente los anuncios, sigue estos pasos:

1. **Instalar la biblioteca de Google Mobile Ads para React Native**:
   ```bash
   npx expo install react-native-google-mobile-ads
   ```

2. **Actualizar app.config.js para incluir los permisos necesarios**:
   ```javascript
   plugins: [
     [
       "react-native-google-mobile-ads",
       {
         "userTrackingPermission": "Esta aplicación utiliza la tecnología de anuncios para financiarse. La información de tu dispositivo se utilizará para ofrecerte anuncios personalizados."
       }
     ]
   ]
   ```

3. **Implementar los componentes de anuncios**:
   - Utiliza los componentes `AdBanner.tsx` y el servicio `ads.ts` que ya están creados
   - Para implementar completamente, reemplaza el código de marcador de posición con el código real de AdMob

4. **Pruebas de anuncios**:
   - Durante el desarrollo, utiliza los IDs de prueba proporcionados por AdMob
   - Verifica que los anuncios se muestren correctamente en diferentes dispositivos
   - Asegúrate de que los anuncios no interfieran con la experiencia del usuario

## Lista de verificación para lanzamiento

Antes de lanzar la aplicación a producción, verifica los siguientes puntos:

- [ ] Todas las funcionalidades principales funcionan correctamente
- [ ] La autenticación con Supabase funciona sin problemas
- [ ] Los anuncios se muestran correctamente y no son intrusivos
- [ ] La aplicación maneja correctamente la pérdida de conexión a Internet
- [ ] Las animaciones y transiciones son fluidas
- [ ] La aplicación no tiene fugas de memoria o problemas de rendimiento
- [ ] Todos los textos están en español y son gramaticalmente correctos
- [ ] Los iconos y gráficos se ven bien en diferentes tamaños de pantalla
- [ ] La política de privacidad está actualizada y accesible
- [ ] La aplicación cumple con las políticas de Google Play Store
