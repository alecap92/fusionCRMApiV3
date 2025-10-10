# API: Buscar Contacto por Teléfono

## Descripción

Endpoint público para buscar un contacto específico por número de teléfono. Devuelve el primer contacto encontrado que coincida con el número proporcionado.

## Endpoint

```
GET /api/contacts/search
```

## Autenticación

Requiere **token de API** válido en el header `Authorization: Bearer {API_TOKEN}`

## Parámetros de Consulta

| Parámetro        | Tipo   | Requerido | Descripción                                       |
| ---------------- | ------ | --------- | ------------------------------------------------- |
| `phone`          | string | ✅ Sí     | Número de teléfono a buscar (mínimo 3 caracteres) |
| `organizationId` | string | ✅ Sí     | ID de la organización                             |

## Respuesta Exitosa (200)

```json
{
  "success": true,
  "contact": {
    "id": "64f5b8e1234567890abcdef0",
    "organizationId": "64f5b8e1234567890abcdef1",
    "properties": {
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan.perez@email.com",
      "mobile": "+573001234567",
      "phone": "+5713001234567",
      "companyName": "Empresa XYZ",
      "position": "Gerente"
    },
    "firstName": "Juan",
    "lastName": "Pérez",
    "fullName": "Juan Pérez",
    "email": "juan.perez@email.com",
    "mobile": "+573001234567",
    "phone": "+5713001234567",
    "company": "Empresa XYZ",
    "position": "Gerente",
    "leadScore": 85,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

## Respuestas de Error

### 400 - Parámetros Faltantes

```json
{
  "success": false,
  "error": "Organization ID is required"
}
```

```json
{
  "success": false,
  "error": "Phone number is required"
}
```

```json
{
  "success": false,
  "error": "Phone number must have at least 3 characters"
}
```

### 404 - Contacto No Encontrado

```json
{
  "success": false,
  "error": "Contact not found",
  "message": "No contact found with phone number: +573001234567"
}
```

### 500 - Error del Servidor

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Error específico del servidor"
}
```

## Ejemplos de Uso

### cURL

```bash
curl -X GET "https://api.fusioncol.com/api/contacts/search?phone=%2B573001234567&organizationId=64f5b8e1234567890abcdef1" \
  -H "Authorization: Bearer tu_api_token_aqui"
```

### JavaScript/TypeScript

```javascript
const searchContactByPhone = async (phone, organizationId, apiToken) => {
  try {
    const response = await fetch(
      `https://api.fusioncol.com/api/contacts/search?phone=${encodeURIComponent(phone)}&organizationId=${organizationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log("Contacto encontrado:", data.contact);
      return data.contact;
    } else {
      console.log("Error:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error de red:", error);
    return null;
  }
};

// Uso
const contact = await searchContactByPhone(
  "+573001234567",
  "tu_organization_id",
  "tu_api_token"
);
```

### Python

```python
import requests
import urllib.parse

def search_contact_by_phone(phone, organization_id, api_token):
    url = f"https://api.fusioncol.com/api/contacts/search"
    params = {
        'phone': phone,
        'organizationId': organization_id
    }
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()

        if data.get('success'):
            print('Contacto encontrado:', data['contact'])
            return data['contact']
        else:
            print('Error:', data.get('error'))
            return None
    except Exception as e:
        print('Error de red:', e)
        return None

# Uso
contact = search_contact_by_phone('+573001234567', 'tu_organization_id', 'tu_api_token')
```

## Notas Importantes

1. **Búsqueda Flexible**: El endpoint busca tanto en campos `mobile` como `phone` del contacto.

2. **Normalización**: Se normalizan automáticamente los números eliminando caracteres especiales para búsquedas más flexibles.

3. **Primer Resultado**: Siempre devuelve el primer contacto encontrado que coincida con los criterios de búsqueda.

4. **Campos de Búsqueda**:

   - Búsqueda exacta por número completo
   - Búsqueda parcial por números sin formatear (solo dígitos)

5. **Seguridad**: Requiere token de API válido y está limitado por organización.

## Casos de Uso Comunes

- **Validación de Clientes**: Verificar si un cliente ya existe antes de crearlo
- **Integración con WhatsApp**: Buscar contactos asociados a números de WhatsApp
- **Sistemas de CRM**: Sincronización de datos de contactos desde sistemas externos
- **Automatizaciones**: Triggers basados en números de teléfono específicos




