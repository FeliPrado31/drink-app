#!/bin/bash

# Script para actualizar y publicar Drink App en Google Play Store

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Actualizando y publicando Drink App ===${NC}"

# Verificar si hay cambios sin confirmar
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Hay cambios sin confirmar en el repositorio.${NC}"
  echo -e "${YELLOW}Por favor, confirma tus cambios antes de continuar.${NC}"
  exit 1
fi

# Preguntar por el tipo de actualización
echo -e "${YELLOW}¿Qué tipo de actualización quieres realizar?${NC}"
echo "1) Actualización de parche (1.0.x)"
echo "2) Actualización menor (1.x.0)"
echo "3) Actualización mayor (x.0.0)"
read -p "Selecciona una opción (1-3): " version_type

# Obtener la versión actual
current_version=$(grep '"version":' app.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')
echo -e "${YELLOW}Versión actual: ${current_version}${NC}"

# Dividir la versión en componentes
IFS='.' read -r -a version_parts <<< "$current_version"
major=${version_parts[0]}
minor=${version_parts[1]}
patch=${version_parts[2]}

# Calcular la nueva versión
case $version_type in
  1)
    patch=$((patch + 1))
    ;;
  2)
    minor=$((minor + 1))
    patch=0
    ;;
  3)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  *)
    echo -e "${RED}Opción no válida.${NC}"
    exit 1
    ;;
esac

new_version="${major}.${minor}.${patch}"
echo -e "${GREEN}Nueva versión: ${new_version}${NC}"

# Actualizar la versión en app.json
sed -i "s/\"version\": \"${current_version}\"/\"version\": \"${new_version}\"/" app.json
echo -e "${GREEN}Versión actualizada en app.json${NC}"

# Crear un commit con la nueva versión
git add app.json
git commit -m "Actualizar versión a ${new_version}"
echo -e "${GREEN}Commit creado con la nueva versión${NC}"

# Construir la aplicación con EAS
echo -e "${YELLOW}Construyendo la aplicación con EAS Build...${NC}"
npx eas-cli build --platform android --profile production

# Preguntar si se desea enviar la aplicación a Google Play Store
read -p "¿Deseas enviar la aplicación a Google Play Store? (s/n): " submit_app

if [[ $submit_app == "s" || $submit_app == "S" ]]; then
  echo -e "${YELLOW}Enviando la aplicación a Google Play Store...${NC}"
  npx eas-cli submit --platform android --profile production
  echo -e "${GREEN}¡Aplicación enviada a Google Play Store!${NC}"
else
  echo -e "${YELLOW}No se enviará la aplicación a Google Play Store.${NC}"
  echo -e "${YELLOW}Puedes enviarla manualmente más tarde con:${NC}"
  echo -e "${GREEN}npx eas-cli submit --platform android --profile production${NC}"
fi

echo -e "${GREEN}¡Proceso completado!${NC}"
