# Guía de Webhooks

## Introducción
Los webhooks son una forma de recibir notificaciones en tiempo real cuando ocurren eventos en el sistema. Cada webhook tiene una URL única que puede ser usada por sistemas externos para enviar datos que dispararán automatizaciones.

## Tipos de Webhooks
Existen dos formas de usar los webhooks en nuestro sistema:

1. **Webhooks con ID único (recomendado)**: Cada webhook tiene su propia URL única.
2. **Webhooks por módulo/evento (compatibilidad)**: Para compatibilidad con versiones anteriores.

## Creación de Webhooks

### Para crear un nuevo webhook:

```
POST /api/v1/webhook-endpoints
Headers:
  - Authorization: Bearer {tu_token_de_autenticación}
  - Content-Type: application/json
Body:
{
  "name": "Nombre descriptivo del webhook",
  "description": "Descripción opcional del webhook",
  "module": "webhook",
  "event": "contact_form",
  "isActive": true
}
```

### Respuesta:

```json
{
  "_id": "id_del_endpoint",
  "name": "Nombre descriptivo del webhook",
  "description": "Descripción opcional del webhook",
  "module": "webhook",
  "event": "contact_form",
  "isActive": true,
  "organizationId": "id_de_tu_organización",
  "createdBy": "tu_user_id",
  "secret": "token_secreto_generado",
  "uniqueId": "abcXYZ123",
  "createdAt": "fecha_creación",
  "updatedAt": "fecha_actualización",
  "fullUrl": "http://tudominio.com/api/v1/webhooks/id/abcXYZ123"
}
```

## Uso de Webhooks

### Envío de datos al webhook (URL única):

```
POST {fullUrl}
Headers:
  - Content-Type: application/json
  [Opcional para mayor seguridad]
  - x-webhook-secret: {secret}
Body:
{
  "data": {
    // Cualquier dato que quieras enviar
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@ejemplo.com",
    // etc...
  }
}
```

### Respuesta de éxito:

```json
{
  "message": "Webhook procesado correctamente",
  "automationsTriggered": 1,
  "executionIds": ["id_de_la_ejecución"]
}
```

## Seguridad

Cada webhook tiene un `secret` único generado automáticamente. Puedes utilizarlo para asegurar que solo sistemas autorizados puedan disparar el webhook incluyéndolo como header:

```
x-webhook-secret: {secret}
```

Si no envías este header, el webhook funcionará igualmente, pero es recomendable usarlo para mayor seguridad.

## Administración de Webhooks

### Listar todos los webhooks

```
GET /api/v1/webhook-endpoints
Headers:
  - Authorization: Bearer {tu_token_de_autenticación}
```

### Actualizar un webhook

```
PATCH /api/v1/webhook-endpoints/{id}
Headers:
  - Authorization: Bearer {tu_token_de_autenticación}
  - Content-Type: application/json
Body:
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "isActive": true
}
```

### Regenerar el secreto de un webhook

```
POST /api/v1/webhook-endpoints/{id}/regenerate-secret
Headers:
  - Authorization: Bearer {tu_token_de_autenticación}
```

### Eliminar un webhook

```
DELETE /api/v1/webhook-endpoints/{id}
Headers:
  - Authorization: Bearer {tu_token_de_autenticación}
```

## Integración con Automatizaciones

Para que un webhook dispare una automatización, debes crear una automatización con un nodo trigger que coincida con el módulo y evento del webhook:

1. Crear un nuevo webhook como se describió anteriormente
2. Crear una automatización con un nodo trigger configurado así:
   ```json
   {
     "id": "1",
     "type": "trigger",
     "module": "webhook",
     "event": "contact_form",
     "next": ["2"]
   }
   ```

3. El payload enviado al webhook estará disponible en la automatización. Por ejemplo, si envías:
   ```json
   {
     "data": {
       "firstName": "Juan"
     }
   }
   ```

   Podrás acceder a ese valor en la automatización como `{{data.firstName}}`

## Ejemplos de Uso

### Crear un contacto desde un formulario web

1. Crear un webhook para formularios de contacto
2. Crear una automatización con:
   - Nodo trigger para "webhook/contact_form"
   - Nodo "contacts" para crear un contacto
   - Nodo "send_email" para enviar confirmación

3. En tu formulario web, enviar los datos al webhook

### Actualizar un trato desde otro sistema

1. Crear un webhook para actualizaciones de tratos
2. Crear una automatización que actualice el trato y notifique al responsable
3. Configurar tu sistema externo para enviar actualizaciones al webhook 