# Dockerización del Backend FUSIONCOL

Este documento explica cómo usar Docker para ejecutar el backend de FUSIONCOL.

## Archivos de Docker

- `Dockerfile` - Para producción
- `Dockerfile.dev` - Para desarrollo
- `docker-compose.yml` - Stack completo con MongoDB y Redis
- `docker-compose.prod.yml` - Solo backend para producción
- `docker-compose.dev.yml` - Stack de desarrollo con hot reload

## Requisitos Previos

- Docker instalado
- Docker Compose instalado

## Desarrollo Local

### Opción 1: Solo Backend (recomendado para desarrollo)

```bash
# Construir y ejecutar solo el backend
docker build -f Dockerfile.dev -t fusioncol-backend-dev .
docker run -p 3000:3000 -v $(pwd)/src:/app/src fusioncol-backend-dev
```

### Opción 2: Stack completo de desarrollo

```bash
# Ejecutar todo el stack de desarrollo
docker compose -f docker-compose.dev.yml up --build

# Ejecutar en segundo plano
docker compose -f docker-compose.dev.yml up -d --build
```

### Opción 3: Stack completo con servicios locales

```bash
# Ejecutar con MongoDB y Redis locales
docker compose up --build
```

## Producción

### Opción 1: Solo Backend

```bash
# Construir imagen de producción
docker build -t fusioncol-backend-prod .

# Ejecutar con variables de entorno
docker run -p 3000:3000 \
  -e MONGODB_URI="tu-uri-mongodb" \
  -e REDIS_URL="tu-uri-redis" \
  fusioncol-backend-prod
```

### Opción 2: Con docker compose

```bash
# Ejecutar configuración de producción
docker compose -f docker-compose.prod.yml up -d
```

## Variables de Entorno

Crea un archivo `.env` en el directorio del backend con las siguientes variables:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/fusioncol

# Redis
REDIS_URL=redis://localhost:6379

# Firebase
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_PRIVATE_KEY=tu-clave-privada
FIREBASE_CLIENT_EMAIL=tu-email-cliente

# AWS (si usas S3)
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_REGION=us-east-1

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Email (Brevo/Sendinblue)
BREVO_API_KEY=tu-api-key

# OpenAI
OPENAI_API_KEY=tu-api-key

# Puerto
PORT=3000
NODE_ENV=production
```

## Comandos Útiles

### Ver logs

```bash
# Ver logs del backend
docker logs fusioncol-backend

# Ver logs en tiempo real
docker logs -f fusioncol-backend
```

### Ejecutar comandos dentro del contenedor

```bash
# Acceder al shell del contenedor
docker exec -it fusioncol-backend sh

# Ejecutar un comando específico
docker exec fusioncol-backend npm run test
```

### Limpiar recursos

```bash
# Detener y eliminar contenedores
docker compose down

# Detener y eliminar contenedores + volúmenes
docker compose down -v

# Eliminar imágenes no utilizadas
docker image prune -a
```

## Puertos

- **Backend**: 3000
- **MongoDB**: 27017 (27018 en desarrollo)
- **Redis**: 6379 (6380 en desarrollo)

## Troubleshooting

### Error de permisos

```bash
# Si tienes problemas de permisos en macOS/Linux
sudo chown -R $USER:$USER .
```

### Puerto ocupado

```bash
# Verificar qué está usando el puerto 3000
lsof -i :3000

# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"
```

### Problemas con FFmpeg

Si tienes problemas con FFmpeg, verifica que esté instalado en el contenedor:

```bash
docker exec fusioncol-backend ffmpeg -version
```

### Problemas con Puppeteer

Para problemas con Puppeteer en Docker:

```bash
# Verificar que Chromium esté instalado
docker exec fusioncol-backend chromium-browser --version
```

## Optimizaciones

### Multi-stage build (opcional)

Para reducir el tamaño de la imagen, puedes usar un Dockerfile multi-stage:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Health Check

El contenedor incluye un health check. Puedes verificar el estado:

```bash
docker inspect fusioncol-backend | grep Health -A 10
```
