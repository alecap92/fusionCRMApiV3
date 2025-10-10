# API Routes Organization

Esta carpeta contiene las rutas de la API organizadas de manera más limpia y escalable.

## Estructura

```
/api/
├── contacts/     # Rutas para contactos
├── deals/        # Rutas para deals
└── README.md     # Este archivo
```

## Rutas Disponibles

### Contactos

- `GET /api/contacts/search?phone={numero}&organizationId={id}` - Buscar contacto por teléfono
- `POST /api/contacts` - Crear un nuevo contacto

### Deals

- `POST /api/deals` - Crear un nuevo deal

### Cotizaciones

- `POST /api/quotations` - Crear una nueva cotización
- `GET /api/quotations/:number/download` - Descargar cotización en PDF por número

## Migración

Las rutas anteriores:

- `/api/v1/contactsApi` → `/api/contacts`
- `/api/v1/dealsApi` → `/api/deals`

## Agregar Nuevas Rutas

Para agregar una nueva ruta de API:

1. Crear el archivo de ruta en esta carpeta (ej: `usersApi.ts`)
2. Agregar la importación en `../apiRouter.ts`
3. Registrar la ruta en `apiRouter.ts`

Ejemplo:

```typescript
// En apiRouter.ts
import usersApiRouter from "./api/usersApi";
router.use("/users", usersApiRouter);
```

Esto creará la ruta: `POST /api/users`
