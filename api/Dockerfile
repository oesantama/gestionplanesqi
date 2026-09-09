FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --omit=dev

# Copiar código de la aplicación
COPY . .

# Puerto por defecto para el servicio backend
ENV PORT=3060
EXPOSE 3060

CMD ["node", "index.js"]
