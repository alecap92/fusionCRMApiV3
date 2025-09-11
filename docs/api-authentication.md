# Autenticación de API - Sistema de Tokens

Este documento explica cómo usar el sistema de autenticación específico para la API de FUSIONCOL.

## 🎯 **Resumen**

- **Tokens separados**: La API usa tokens JWT diferentes a los de autenticación de usuario
- **Seguridad por organización**: Cada token incluye `organizationId` automáticamente
- **Permisos granulares**: Control de acceso detallado por recurso
- **Gestión completa**: Crear, listar, revocar y renovar tokens

## 🔧 **Configuración**

### Variables de Entorno

```bash
# En tu archivo .env
API_SECRET_KEY=tu-api-secret-key-super-seguro-diferente-al-jwt
```

### Importar Modelo

```typescript
// Agregar a tu índice de modelos
import ApiTokenModel from "./models/ApiTokenModel";
```

## 📝 **Uso del Sistema**

### 1. Crear Token de API

**Endpoint**: `POST /api/tokens`  
**Autenticación**: Token de usuario normal (Bearer token)

```bash
curl -X POST "https://tu-api.com/api/tokens" \
  -H "Authorization: Bearer TU_TOKEN_DE_USUARIO" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Token de API",
    "description": "Token para integración con sistema externo",
    "permissions": ["quotations:write", "contacts:read"],
    "expiresIn": "365d"
  }'
```

**Respuesta**:

```json
{
  "message": "Token de API creado exitosamente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenId": "60f1b2c3d4e5f6a7b8c9d0e1",
    "name": "Mi Token de API",
    "permissions": ["quotations:write", "contacts:read"],
    "expiresAt": "2025-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "warning": "Guarde este token de forma segura. No podrá verlo nuevamente."
}
```

### 2. Usar Token en Llamadas API

**Opción 1: Header Authorization**

```bash
curl -X POST "https://tu-api.com/api/quotations" \
  -H "Authorization: Bearer TU_TOKEN_DE_API" \
  -H "Content-Type: application/json" \
  -d '{"contact": "...", "items": [...]}'
```

**Opción 2: Header X-API-Key**

```bash
curl -X POST "https://tu-api.com/api/quotations" \
  -H "X-API-Key: TU_TOKEN_DE_API" \
  -H "Content-Type: application/json" \
  -d '{"contact": "...", "items": [...]}'
```

### 3. Gestionar Tokens

**Listar tokens**:

```bash
GET /api/tokens
Authorization: Bearer TU_TOKEN_DE_USUARIO
```

**Revocar token**:

```bash
DELETE /api/tokens/{tokenId}
Authorization: Bearer TU_TOKEN_DE_USUARIO
```

**Renovar token**:

```bash
PUT /api/tokens/{tokenId}/renew
Authorization: Bearer TU_TOKEN_DE_USUARIO
Content-Type: application/json

{
  "expiresIn": "365d"
}
```

## 🔑 **Permisos Disponibles**

### Permisos Individuales

| Permiso            | Descripción                   |
| ------------------ | ----------------------------- |
| `contacts:read`    | Leer contactos                |
| `contacts:write`   | Crear/actualizar contactos    |
| `contacts:delete`  | Eliminar contactos            |
| `deals:read`       | Leer deals                    |
| `deals:write`      | Crear/actualizar deals        |
| `quotations:read`  | Leer cotizaciones             |
| `quotations:write` | Crear/actualizar cotizaciones |
| `whatsapp:send`    | Enviar mensajes WhatsApp      |
| `products:read`    | Leer productos                |
| `invoices:read`    | Leer facturas                 |
| `*`                | Acceso completo               |

### Grupos Predefinidos

```typescript
// Solo lectura
"permissions": ["contacts:read", "deals:read", "quotations:read", "products:read", "invoices:read"]

// Ventas
"permissions": ["contacts:read", "contacts:write", "deals:read", "deals:write", "quotations:read", "quotations:write", "products:read"]

// WhatsApp Bot
"permissions": ["whatsapp:send", "whatsapp:read", "contacts:read", "contacts:write"]

// Acceso completo
"permissions": ["*"]
```

## 🛡️ **Seguridad**

### Validaciones Automáticas

El middleware `verifyApiToken` verifica:

1. ✅ **Token válido**: JWT bien formado y firmado
2. ✅ **No expirado**: Dentro del período de validez
3. ✅ **Usuario activo**: Usuario existe en la base de datos
4. ✅ **Organización válida**: Usuario pertenece a la organización
5. ✅ **Token activo**: No revocado en base de datos
6. ✅ **Logout global**: Token emitido después del último logout

### Control de Permisos

```typescript
// En tus rutas, usar middleware de permisos
router.post(
  "/quotations",
  verifyApiToken,
  requireApiPermission("quotations:write"),
  createQuotationApi
);
```

## 📊 **Ejemplo Completo: Crear Cotización**

### 1. Obtener Token de API

```bash
# Usando tu token de usuario normal
curl -X POST "https://api.fusioncol.com/api/tokens" \
  -H "Authorization: Bearer tu_token_usuario" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sistema Externo CRM",
    "permissions": ["quotations:write", "contacts:read"],
    "expiresIn": "365d"
  }'
```

### 2. Crear Cotización con Token API

```bash
curl -X POST "https://api.fusioncol.com/api/quotations" \
  -H "Authorization: Bearer tu_token_api" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "60f1b2c3d4e5f6a7b8c9d0e1",
    "quotationNumber": 1001,
    "name": "Cotización Sistema CRM",
    "items": [
      {
        "product": "Producto A",
        "quantity": 2,
        "price": 100
      }
    ],
    "subtotal": 200,
    "taxes": 38,
    "total": 238,
    "expirationDate": "2024-12-31",
    "paymentTerms": "30 días",
    "shippingTerms": "FOB",
    "status": "pending",
    "observaciones": "Creado via API"
  }'
```

### 3. Respuesta

```json
{
  "message": "Cotización creada exitosamente",
  "data": {
    "_id": "60f1b2c3d4e5f6a7b8c9d0e2",
    "quotationNumber": 1001,
    "contactId": {
      "_id": "60f1b2c3d4e5f6a7b8c9d0e1",
      "name": "Cliente XYZ",
      "email": "cliente@xyz.com"
    },
    "organizationId": "60f1b2c3d4e5f6a7b8c9d0e0",
    "userId": "60f1b2c3d4e5f6a7b8c9d0e3",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔄 **Migración desde Sistema Anterior**

El nuevo sistema coexiste con el anterior:

- **Rutas `/api/v1/*`**: Siguen usando `verifyToken` (tokens de usuario)
- **Rutas `/api/*`**: Usan `verifyApiToken` (tokens de API)

### Beneficios de Migrar

1. **Seguridad mejorada**: Tokens específicos para API
2. **Permisos granulares**: Control detallado de acceso
3. **Mejor organización**: Separación clara de contextos
4. **Auditoría**: Seguimiento de uso por token

## 🚨 **Códigos de Error**

| Código                         | Mensaje                             | Descripción                            |
| ------------------------------ | ----------------------------------- | -------------------------------------- |
| `API_TOKEN_MISSING`            | Token de API no proporcionado       | Falta header Authorization o X-API-Key |
| `API_TOKEN_FORMAT_ERROR`       | Formato de token incorrecto         | Token malformado                       |
| `INVALID_API_TOKEN_TYPE`       | Token no válido para API            | Token no es de tipo "api"              |
| `API_TOKEN_NOT_FOUND`          | Token no encontrado o inactivo      | Token revocado o no existe             |
| `API_TOKEN_EXPIRED`            | Token de API expirado               | Token fuera de validez                 |
| `INSUFFICIENT_API_PERMISSIONS` | Permiso insuficiente                | Token no tiene el permiso requerido    |
| `USER_NOT_IN_ORGANIZATION`     | Usuario no pertenece a organización | Usuario removido de organización       |
| `GLOBAL_LOGOUT`                | Token invalidado por logout global  | Usuario cerró sesión globalmente       |

## 📈 **Mejores Prácticas**

1. **Usa permisos mínimos**: Solo los necesarios para tu integración
2. **Rota tokens regularmente**: Especialmente para integraciones críticas
3. **Almacena tokens seguramente**: Variables de entorno, nunca en código
4. **Monitorea uso**: Revisa tokens activos regularmente
5. **Revoca tokens no usados**: Mantén solo los necesarios
