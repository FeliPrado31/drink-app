# Guía para enviar la app a Google Play Store con EAS Submit

Una vez que la compilación de EAS Build se complete, puedes usar EAS Submit para enviar automáticamente la app a Google Play Store. Este método es más rápido y sencillo que la subida manual.

## Requisitos previos

1. Asegúrate de tener configurado el archivo `playstore.json` con las credenciales de la cuenta de servicio de Google Play (ya está configurado en tu proyecto)
2. Verifica que el archivo `eas.json` tenga la configuración correcta para la sección `submit` (ya está configurado en tu proyecto)

## Pasos para enviar la app con EAS Submit

1. Una vez que la compilación de EAS Build se complete, ejecuta el siguiente comando:

```bash
npx eas-cli submit --platform android --profile production
```

2. EAS Submit utilizará el archivo AAB generado por la compilación más reciente y lo enviará a Google Play Store.

3. Durante el proceso, EAS Submit:
   - Verificará que tienes las credenciales correctas
   - Subirá el archivo AAB a Google Play Store
   - Configurará la versión para la pista "internal" (como está definido en `eas.json`)

4. Una vez completado el envío, verás un mensaje de confirmación en la terminal.

## Después del envío

1. Inicia sesión en [Google Play Console](https://play.google.com/console)
2. Ve a la sección "Producción" > "Pista interna"
3. Deberías ver la nueva versión de tu app lista para revisión
4. Completa cualquier información adicional requerida:
   - Descripción de la versión
   - Notas de la versión
   - Información de contacto

5. Haz clic en "Iniciar lanzamiento a producción" para enviar la app a revisión

## Solución de problemas comunes

- **Error de credenciales**: Asegúrate de que el archivo `playstore.json` sea válido y tenga los permisos correctos
- **Error de versión**: Si la versión ya existe en Google Play, incrementa el número de versión en `app.json`
- **Error de metadatos**: Completa toda la información requerida en Google Play Console antes de enviar la app

## Actualizaciones futuras

Para futuras actualizaciones de la app:

1. Incrementa el número de versión en `app.json`
2. Ejecuta `npx eas-cli build --platform android --profile production`
3. Una vez completada la compilación, ejecuta `npx eas-cli submit --platform android --profile production`

Este proceso automatizado te ahorrará tiempo y reducirá la posibilidad de errores en el proceso de publicación.
