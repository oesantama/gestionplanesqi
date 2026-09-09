#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE COMPILACIÓN Y EMPAQUETADO PARA DESPLIEGUE (DEPLOYMENT BUILDER)
# Genera los archivos comprimidos en la carpeta deploy-out/
# ==============================================================================

set -e

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${WORKSPACE_DIR}/deploy-out"

echo "🚀 Iniciando proceso de empaquetado para despliegue..."
echo "📂 Carpeta destino: ${OUTPUT_DIR}"

# 1. Crear carpeta deploy-out limpia
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

# 2. Compilar Frontend (Quasar SPA)
echo "📦 1/3 Compilando Frontend (Quasar SPA)..."
cd "${WORKSPACE_DIR}/frontend"
npm install --silent
npm run build

echo "🤐 Comprimiendo compilado de Frontend..."
cd "${WORKSPACE_DIR}/frontend/dist/spa"
zip -r "${OUTPUT_DIR}/frontend-dist.zip" . > /dev/null
tar -czf "${OUTPUT_DIR}/frontend-dist.tar.gz" . > /dev/null
echo "✅ Frontend comprimido en deploy-out/frontend-dist.zip y .tar.gz"

# 3. Empaquetar Backend (API Express)
echo "📦 2/3 Empaquetando Backend (API Node.js)..."
cd "${WORKSPACE_DIR}"
zip -r "${OUTPUT_DIR}/api-dist.zip" api \
  -x "api/node_modules/*" \
  -x "api/.git/*" \
  -x "api/.env" \
  -x "api/logs/*" > /dev/null

tar -czf "${OUTPUT_DIR}/api-dist.tar.gz" \
  --exclude="api/node_modules" \
  --exclude="api/.git" \
  --exclude="api/.env" \
  --exclude="api/logs" \
  api > /dev/null
echo "✅ API Backend comprimido en deploy-out/api-dist.zip y .tar.gz"

# 4. Generar archivo .cpanel.yml para despliegue automático en cPanel
cat << 'EOF' > "${OUTPUT_DIR}/.cpanel.yml"
---
deployment:
  tasks:
    - export DEPLOYPATH=/home/USER/public_html
    - /bin/cp -R frontend/dist/spa/* $DEPLOYPATH
    - export APIPATH=/home/USER/api
    - /bin/cp -R api/* $APIPATH
    - /bin/touch $APIPATH/tmp/restart.txt
EOF

# 5. Generar README con instrucciones de despliegue en cPanel / Docker / Git
cat << 'EOF' > "${OUTPUT_DIR}/README_DEPLOY.md"
# Instrucciones de Despliegue - Planes QI

## Archivos Generados en `deploy-out/`
1. `frontend-dist.zip` / `frontend-dist.tar.gz`: Archivos estáticos del Frontend compilado (SPA).
2. `api-dist.zip` / `api-dist.tar.gz`: Código fuente del Backend Express API (sin node_modules).
3. `.cpanel.yml`: Archivo de configuración para despliegue automático desde Git en cPanel.

---

## Opción A: Despliegue en cPanel (Tradicional)
1. **Frontend**:
   - Subir y extraer el contenido de `frontend-dist.zip` en la carpeta web `public_html` (o el subdominio correspondiente).
2. **Backend API**:
   - Subir y extraer `api-dist.zip` en la carpeta `/home/usuario/api`.
   - Crear el archivo `.env` en la carpeta `api/` definiendo las variables de entorno (`PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`).
   - En el panel de cPanel, ir a **"Setup Node.js App"**, seleccionar la versión de Node (v18 o superior), establecer la raíz en `api` y ejecutar `npm install --production`.
   - Iniciar / Reiniciar la aplicación.

---

## Opción B: Despliegue Automático con Git en cPanel
1. Conectar el repositorio Git en cPanel mediante **"Git Version Control"**.
2. Copiar el archivo `.cpanel.yml` a la raíz de tu repositorio.
3. Cada vez que hagas `git push` a la rama `main`, cPanel ejecutará la tarea de despliegue copiando automáticamente el Frontend y reiniciando el servicio Node.

---

## Opción C: Despliegue con Docker / Containers (Recomendado para VPS)
Si cuentas con VPS o Docker Container Manager en cPanel:
```bash
git clone <tu-repositorio-git>
cd gestionplanesqi
docker compose up -d --build
```
EOF

echo "✨ 3/3 Proceso de empaquetado finalizado con éxito."
echo "📁 Revisa los archivos comprimidos en: ${OUTPUT_DIR}"
