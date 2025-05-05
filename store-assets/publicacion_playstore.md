# Guía Completa para Publicar Drink App en Google Play Store

Esta guía te ayudará a publicar tu aplicación Drink App en Google Play Store utilizando Expo y EAS (Expo Application Services).

## Paso 1: Preparación de la Aplicación

✅ **Configuración del proyecto**
- Se ha actualizado el nombre de la aplicación a "Drink App" en app.json
- Se ha configurado el versionCode para Android
- Se ha verificado que el package name es correcto: com.feli.drinkapp

✅ **Recursos necesarios**
- Iconos de la aplicación: Disponibles en la carpeta `/assets`
- Política de privacidad: Disponible en `/privacy-policy/index.html`
- Descripción corta y completa: Creadas en `/store-assets/`

## Paso 2: Compilación de la Aplicación

✅ **Compilación con EAS Build**
- Se ha iniciado la compilación con el comando:
  ```bash
  npx eas-cli build --platform android --profile production
  ```
- Este proceso genera un archivo AAB (Android App Bundle) optimizado para Google Play Store
- La compilación se está realizando en los servidores de Expo

## Paso 3: Envío a Google Play Store

Una vez que la compilación se complete, tienes dos opciones para enviar la aplicación a Google Play Store:

### Opción 1: Envío Automático con EAS Submit

1. Ejecuta el siguiente comando:
   ```bash
   npx eas-cli submit --platform android --profile production
   ```

2. EAS Submit utilizará el archivo AAB generado y lo enviará automáticamente a Google Play Store
3. La aplicación se enviará a la pista "internal" como está configurado en `eas.json`

### Opción 2: Envío Manual

1. Descarga el archivo AAB generado desde la página de compilación de Expo
2. Inicia sesión en [Google Play Console](https://play.google.com/console)
3. Crea una nueva aplicación si aún no lo has hecho
4. Completa toda la información requerida:
   - Ficha de Play Store (descripción, capturas de pantalla, etc.)
   - Clasificación de contenido
   - Precios y distribución
5. Sube el archivo AAB en la sección "Producción" > "Crear nueva versión"
6. Completa las notas de la versión
7. Envía para revisión

## Paso 4: Configuración en Google Play Console

Independientemente del método de envío, deberás completar la siguiente información en Google Play Console:

1. **Ficha de Play Store**
   - Descripción corta: Usa el contenido de `/store-assets/short_description.txt`
   - Descripción completa: Usa el contenido de `/store-assets/full_description.txt`
   - Capturas de pantalla: Sube capturas de pantalla de la aplicación
   - Gráficos promocionales: Sube el icono y otros gráficos promocionales

2. **Clasificación de contenido**
   - Completa el cuestionario de clasificación
   - Ten en cuenta que la aplicación contiene referencias al alcohol
   - Indica que la aplicación está dirigida a adultos (17+)

3. **Política de privacidad**
   - Sube la política de privacidad a un servidor web
   - Añade el enlace en la sección correspondiente de Google Play Console

4. **Precios y distribución**
   - Configura la aplicación como gratuita
   - Selecciona los países donde quieres distribuir la aplicación

## Paso 5: Revisión y Publicación

1. Google revisará tu aplicación para asegurarse de que cumple con sus políticas
2. Este proceso puede tardar desde unas horas hasta varios días
3. Es posible que recibas comentarios o solicitudes de cambios
4. Una vez aprobada, la aplicación se publicará en Google Play Store

## Actualizaciones Futuras

Para futuras actualizaciones de la aplicación:

1. Incrementa el número de versión en `app.json`
2. Realiza los cambios necesarios en el código
3. Ejecuta `npx eas-cli build --platform android --profile production`
4. Envía la nueva versión con `npx eas-cli submit --platform android --profile production`

## Recursos Adicionales

- [Documentación de EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentación de EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Políticas para desarrolladores de Google Play](https://play.google.com/about/developer-content-policy/)
- [Guía de publicación en Google Play Console](https://support.google.com/googleplay/android-developer/answer/9859152)
