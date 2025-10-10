# Usar Node.js 18 como imagen base
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias esenciales para Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-opensans \
    font-noto-emoji \
    dbus \
    xvfb \
    udev \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Verificar que Chromium esté instalado correctamente
RUN which chromium && chromium --version

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copiar archivos de configuración de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY src/ ./src/
COPY public/ ./public/

# Compilar TypeScript
RUN npm run build

# Asegurar que el archivo de plantilla esté en el lugar correcto
RUN mkdir -p dist/PDF && cp src/PDF/quotation.ejs dist/PDF/ && echo "Template file copied to dist/PDF/" && ls -la dist/PDF/

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Dar permisos al usuario nodejs para usar Chromium
RUN mkdir -p /home/nodejs/.cache && \
    chown -R nodejs:nodejs /home/nodejs && \
    chmod -R 755 /home/nodejs

# Cambiar propiedad de archivos al usuario nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
