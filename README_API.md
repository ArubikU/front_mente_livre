# 🔄 Generación Automática de API

Este proyecto genera automáticamente los tipos TypeScript y el cliente API desde la documentación OpenAPI/Swagger del backend.

## 🚀 Uso Rápido

```bash
# Generar API desde el backend
npm run generate-api
```

Esto:
1. ✅ Descarga el Swagger JSON del backend
2. ✅ Genera tipos TypeScript automáticamente
3. ✅ Crea el cliente API listo para usar

## 📁 Archivos Generados

Después de ejecutar `npm run generate-api`, se crean:

```
src/api/
├── openapi.json      # Especificación OpenAPI completa
└── types.ts          # Tipos TypeScript generados
```

## 💻 Uso del Cliente API

```typescript
import { apiClient } from './api/client';
import { Therapist, ApiResponse } from './api/types';

// Configurar token de autenticación
apiClient.setToken('tu-jwt-token');

// Obtener todos los terapeutas
const response: ApiResponse<Therapist[]> = await apiClient.getTherapists();

// Obtener un terapeuta específico
const therapist: ApiResponse<Therapist> = await apiClient.getTherapist('uuid');

// Crear un terapeuta (requiere autenticación admin)
const newTherapist = await apiClient.createTherapist({
  name: 'Dr. Juan Pérez',
  university: 'Universidad de Lima',
  // ...
});

// Login
const loginResponse = await apiClient.login('email@example.com', 'password');
```

## 🔧 Configuración

### Cambiar URL del Backend

Por defecto usa: `https://backend.mentelivre.org/`

Para cambiar:

```bash
# Opción 1: Variable de entorno
API_BASE_URL=http://tu-backend.com npm run generate-api

# Opción 2: Editar scripts/generate-api.js
const API_BASE_URL = 'http://tu-backend.com';
```

## 🔄 Regenerar Automáticamente

El backend regenera automáticamente el Swagger cuando:
- No existe el archivo `swagger.json`
- Se accede con `?regenerate=true`
- El archivo tiene más de 1 hora de antigüedad

### Forzar Regeneración

```bash
# Desde el frontend
curl "https://backend.mentelivre.org//swagger.json?regenerate=true"

# Luego regenerar tipos
npm run generate-api
```

## 📝 Endpoints Disponibles

### Backend
- `GET /swagger.json` - Obtener documentación OpenAPI
- `GET /swagger.json?regenerate=true` - Forzar regeneración
- `POST /swagger/generate` - Generar manualmente
- `GET /docs` - Interfaz Swagger UI

### Frontend
- `npm run generate-api` - Generar tipos y cliente

## 🎯 Flujo de Trabajo Recomendado

1. **Desarrollar endpoint en el backend** con anotaciones Swagger
2. **Regenerar Swagger** (automático o manual)
3. **Generar tipos en frontend**: `npm run generate-api`
4. **Usar tipos generados** en tu código React/TypeScript

## 🐛 Troubleshooting

### Error: "ECONNREFUSED"
- Verifica que el backend esté corriendo
- Verifica la URL en `scripts/generate-api.js`

### Error: "HTTP 404"
- Verifica que el endpoint `/swagger.json` exista
- Intenta regenerar: `curl "https://backend.mentelivre.org//swagger.json?regenerate=true"`

### Tipos no se actualizan
- Elimina `src/api/types.ts` y `src/api/openapi.json`
- Ejecuta `npm run generate-api` nuevamente

### CORS Error
- El backend debe tener CORS habilitado
- Verifica `CorsMiddleware` en el backend

## 📚 Documentación Adicional

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
