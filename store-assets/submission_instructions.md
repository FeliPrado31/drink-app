# Instrucciones para publicar Drink App en Google Play Store

Una vez que la compilación de EAS se complete, sigue estos pasos para publicar la aplicación en Google Play Store:

## 1. Acceder a Google Play Console

1. Inicia sesión en [Google Play Console](https://play.google.com/console)
2. Si aún no tienes una cuenta de desarrollador, deberás crear una y pagar la tarifa única de $25 USD

## 2. Crear una nueva aplicación

1. En la página principal de Google Play Console, haz clic en "Crear app"
2. Completa la información básica:
   - Nombre: Drink App
   - Idioma predeterminado: Español
   - Tipo de app: Aplicación
   - Gratis o de pago: Gratis
   - Declaraciones: Marca las casillas correspondientes

## 3. Configurar la ficha de Play Store

1. En el menú lateral, ve a "Ficha de Play Store"
2. Completa la siguiente información:
   - Descripción breve: Usa el contenido del archivo `short_description.txt`
   - Descripción completa: Usa el contenido del archivo `full_description.txt`
   - Capturas de pantalla: Sube las capturas de pantalla de la carpeta `screenshots`
   - Icono de alta resolución: Usa el archivo `icon.png` (512x512 px)
   - Gráfico de función: Crea una imagen de 1024x500 px
   - Video promocional (opcional): Si tienes un video, añade el enlace de YouTube

## 4. Clasificación de contenido

1. En el menú lateral, ve a "Clasificación de contenido"
2. Completa el cuestionario de clasificación
3. Para Drink App, ten en cuenta:
   - Contiene alcohol/referencias al alcohol: Sí
   - Dirigido a adultos: Sí (17+)
   - Contenido sugerente: Depende del modo de juego (especialmente "Extremo")

## 5. Subir el AAB

1. En el menú lateral, ve a "Producción" > "Crear nueva versión"
2. Sube el archivo AAB generado por EAS Build
3. Añade notas de la versión (por ejemplo: "Versión inicial de Drink App")
4. Haz clic en "Guardar" y luego en "Revisar versión"

## 6. Configurar países de distribución

1. En el menú lateral, ve a "Presencia en la tienda" > "Países"
2. Selecciona los países donde quieres distribuir la app (recomendado: todos los países de habla hispana)

## 7. Política de privacidad

1. En "Ficha de Play Store", añade el enlace a tu política de privacidad
2. Puedes usar un servicio de alojamiento web para subir el archivo HTML de la política de privacidad

## 8. Enviar para revisión

1. Asegúrate de que todos los requisitos estén completos (aparecerán con marcas de verificación verdes)
2. Haz clic en "Enviar para revisión"
3. La revisión puede tardar entre unas horas y varios días

## 9. Después de la aprobación

Una vez que Google apruebe tu aplicación:
1. La app se publicará automáticamente en Google Play Store
2. Podrás ver estadísticas de instalaciones y valoraciones en Google Play Console
3. Para futuras actualizaciones, repite el proceso de compilación con EAS y sube la nueva versión

## Notas importantes

- La primera revisión suele ser más rigurosa y puede tardar más tiempo
- Asegúrate de que la app cumpla con las [Políticas del programa para desarrolladores de Google Play](https://play.google.com/about/developer-content-policy/)
- Ten en cuenta que el contenido relacionado con alcohol puede tener restricciones en algunos países
