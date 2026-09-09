# Stage 1: Build de la aplicación Quasar Vue
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
COPY . .

RUN if [ ! -d "dist/spa" ]; then npm install --ignore-scripts --no-audit --no-fund && npm run build; fi


# Stage 2: Servidor Nginx para producción
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
