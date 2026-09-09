FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de forma limpia y rápida
RUN npm install --production --no-audit --no-fund

# Copiar código de la aplicación
COPY . .

# Puerto por defecto para el servicio backend
ENV PORT=3060
EXPOSE 3060

CMD ["node", "index.js"]
