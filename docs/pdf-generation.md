# Generación de PDFs con Puppeteer en Producción

## Descripción General

Este documento describe la configuración y troubleshooting para la generación de PDFs usando Puppeteer y Chromium en entornos de producción, específicamente en contenedores Docker y Railway.

## Requisitos del Sistema

### Dependencias de Chromium

Para que Chromium funcione correctamente en Alpine Linux, se requieren las siguientes dependencias:

```dockerfile
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
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0
```

### Configuración de Docker

#### Memoria Compartida (shm_size)

Chromium requiere memoria compartida suficiente para funcionar:

```yaml
services:
  backend:
    shm_size: "2gb" # Mínimo 1GB, recomendado 2GB
```

#### Capabilities

Se requieren permisos especiales para el sandbox de Chromium:

```yaml
services:
  backend:
    cap_add:
      - SYS_ADMIN # Necesario para sandbox de Chromium
```

#### Recursos del Sistema

Para producción, se recomienda:

```yaml
deploy:
  resources:
    limits:
      memory: 2G # Aumentar memoria para Chromium
      cpus: "1.0" # Aumentar CPU para Chromium
    reservations:
      memory: 1G
      cpus: "0.5"
```

## Variables de Entorno

### Variables Requeridas

```bash
# Configuración de Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Entorno
NODE_ENV=production
```

### Variables Opcionales

```bash
# Timeouts (en milisegundos)
PUPPETEER_TIMEOUT=30000
PUPPETEER_PROTOCOL_TIMEOUT=30000
```

## Configuración de Puppeteer

### Argumentos Críticos para Contenedores

```typescript
const puppeteerOptions = {
  headless: true,
  args: [
    "--no-sandbox", // Crítico para contenedores
    "--disable-setuid-sandbox", // Crítico para contenedores
    "--disable-dev-shm-usage", // Usar /tmp en lugar de /dev/shm
    "--disable-accelerated-2d-canvas", // Deshabilitar aceleración
    "--no-first-run", // No mostrar primera ejecución
    "--no-zygote", // Deshabilitar zygote
    "--single-process", // Un solo proceso
    "--disable-gpu", // Deshabilitar GPU
    "--disable-web-security", // Deshabilitar seguridad web
    "--disable-features=VizDisplayCompositor",
    "--disable-software-rasterizer",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--metrics-recording-only",
    "--mute-audio",
    "--safebrowsing-disable-auto-update",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=TranslateUI",
    "--disable-ipc-flooding-protection",
    "--memory-pressure-off",
    "--max_old_space_size=4096",
  ],
  timeout: 30000,
  protocolTimeout: 30000,
};
```

## Retry Logic y Manejo de Errores

### Implementación de Reintentos

```typescript
// Implementar retry logic (3 intentos)
let browser: any = null;
let retryCount = 0;
const maxRetries = 3;

while (retryCount < maxRetries) {
  try {
    browser = await puppeteerInstance.launch(puppeteerOptions);
    // ... generar PDF ...
    break; // Éxito
  } catch (error) {
    if (browser) {
      await browser.close();
      browser = null;
    }
    retryCount++;
    if (retryCount >= maxRetries) {
      throw new Error(`Error después de ${maxRetries} intentos`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
  }
}
```

### Logging y Debugging

```typescript
console.log(`Intento ${retryCount + 1} de ${maxRetries} para generar PDF`);
console.error(`Error en intento ${retryCount + 1}:`, error);
```

## Troubleshooting Común

### Error: "ProtocolError: Target closed"

**Causa**: Chromium se cierra prematuramente
**Solución**:

1. Verificar que todas las dependencias estén instaladas
2. Aumentar `shm_size` a 2GB
3. Añadir `--disable-dev-shm-usage` a los argumentos
4. Verificar permisos del usuario

### Error: "No usable sandbox"

**Causa**: Sandbox de Chromium no puede inicializarse
**Solución**:

1. Añadir `cap_add: [SYS_ADMIN]`
2. Usar `--no-sandbox` y `--disable-setuid-sandbox`

### Error: "Out of memory"

**Causa**: Memoria insuficiente
**Solución**:

1. Aumentar límites de memoria en Docker
2. Usar `--max_old_space_size=4096`
3. Aumentar `shm_size`

### Error: "Timeout waiting for page"

**Causa**: Timeouts muy bajos
**Solución**:

1. Aumentar timeouts a 30 segundos
2. Usar `waitUntil: "networkidle0"`
3. Implementar retry logic

## Configuración en Railway

### Variables de Entorno en Railway

```bash
NODE_ENV=production
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Configuración de Recursos

Railway requiere configuración específica para Chromium:

1. **Memoria**: Mínimo 1GB, recomendado 2GB
2. **CPU**: Mínimo 0.5 vCPU, recomendado 1 vCPU
3. **Variables de entorno**: Configurar todas las variables requeridas

### Deploy en Railway

```bash
# Build local para testing
docker build -t fusioncol-backend -f backend/Dockerfile backend/

# Verificar que Chromium funciona
docker run --rm fusioncol-backend chromium --version

# Deploy a Railway
railway deploy
```

## Testing Local

### Build y Test Local

```bash
# Build de la imagen
docker build -t fusioncol-backend -f backend/Dockerfile backend/

# Test de Chromium
docker run --rm fusioncol-backend chromium --version

# Test completo con docker-compose
docker-compose -f backend/docker-compose.yml up --build
```

### Verificar Generación de PDFs

```bash
# Test endpoint de PDF
curl -X GET "http://localhost:3000/api/quotations/1/print" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test.pdf
```

## Monitoreo y Logs

### Logs Importantes

```bash
# Verificar instalación de Chromium
which chromium && chromium --version

# Logs de Puppeteer
console.log(`Using Chromium at: ${executablePath}`);

# Logs de retry
console.log(`Intento ${retryCount + 1} de ${maxRetries}`);
```

### Métricas a Monitorear

1. **Tiempo de generación de PDFs**: Debe ser < 30 segundos
2. **Tasa de éxito**: Debe ser > 95%
3. **Uso de memoria**: Monitorear picos durante generación
4. **Errores de Chromium**: Logs de crashes o timeouts

## Mejores Prácticas

### 1. Gestión de Recursos

- Cerrar browsers inmediatamente después de uso
- Implementar timeouts apropiados
- Usar retry logic para fallos temporales

### 2. Seguridad

- Usar usuario no-root cuando sea posible
- Limitar capabilities al mínimo necesario
- Validar inputs antes de generar PDFs

### 3. Performance

- Cachear templates EJS cuando sea posible
- Optimizar imágenes en PDFs
- Usar argumentos de Chromium apropiados

### 4. Mantenimiento

- Monitorear logs regularmente
- Actualizar dependencias
- Testear cambios en staging antes de producción

## Referencias

- [Puppeteer Documentation](https://pptr.dev/)
- [Chromium in Docker](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker)
- [Railway Documentation](https://docs.railway.app/)
- [Alpine Linux Packages](https://pkgs.alpinelinux.org/)
