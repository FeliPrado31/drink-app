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

Para despliegues con EAS, las variables de entorno se gestionan de forma segura a través de EAS Secrets:

```bash
# Iniciar sesión en EAS (si aún no lo has hecho)
eas login

# Configurar la variable SUPABASE_ANON_KEY como secreto
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "tu_clave_anonima_real" --type string
```

Las variables de entorno ya están configuradas en el archivo `eas.json` para cada perfil de construcción.

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

## Seguridad

- Nunca incluyas claves API o secretos directamente en el código
- Utiliza siempre variables de entorno o EAS Secrets para gestionar información sensible
- Asegúrate de que `.env` esté incluido en `.gitignore` para evitar subir credenciales al repositorio
