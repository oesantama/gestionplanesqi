FROM node:22-alpine

WORKDIR /app

# Copiar código de la aplicación y dependencias
COPY package*.json ./
COPY . .

# Instalar dependencias si no existen en el contexto
RUN if [ ! -d "node_modules" ]; then npm install --production --no-audit --no-fund || true; fi

# Puerto por defecto para el servicio backend
ENV PORT=3060
EXPOSE 3060

CMD ["node", "index.js"]
