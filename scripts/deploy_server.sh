#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE AUTOMÁTICO CON DOCKER (DEPLOYMENT SCRIPT)
# Se ejecuta en la terminal del servidor o mediante Webhook / CI-CD al hacer push
# ==============================================================================

set -e

echo "🚀 Iniciando despliegue de Planes QI con Docker..."

# 1. Obtener los últimos cambios desde Git
echo "📥 1. Descargando último código de Git (git pull)..."
git pull origin main || git pull origin master

# 2. Ejecutar la compilación y despliegue de contenedores de Producción
echo "🐳 2. Reconstruyendo e iniciando contenedores Docker..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Ejecutar migración de tablas
echo "🗄️ 3. Verificando tablas de base de datos..."
docker exec gestionplanesqi-api-prod node /app/scripts/setup_capacitaciones_operadora_tables.js || true

# 4. Limpieza de imágenes antiguas huérfanas
echo "🧹 4. Limpiando imágenes antiguas en desuso..."
docker image prune -f

echo "✅ DESPLIEGUE CON DOCKER COMPLETADO CON ÉXITO 🚀"
