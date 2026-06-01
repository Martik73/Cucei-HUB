# CUCEI HUB — Backend

API REST para la red social académica del CUCEI, Universidad de Guadalajara.

## Stack

- **Runtime:** Node.js + Express 4
- **Base de datos:** MongoDB (Mongoose)
- **Autenticación:** Firebase Auth + JWT
- **Tiempo real:** Socket.io
- **Validación:** express-validator

## Requisitos previos

- Node.js >= 18
- Cuenta en Firebase (proyecto con Authentication habilitado)
- Cluster en MongoDB Atlas (o instancia local)

## Configuración inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno
cp .env.example .env
# Completar las variables en .env

# 3. Iniciar en desarrollo
npm run dev
```

## Variables de entorno

Ver `.env.example` para la lista completa. Las críticas son:

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | URI de conexión a MongoDB Atlas |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `FIREBASE_PRIVATE_KEY` | Clave privada del SDK Admin |
| `FIREBASE_CLIENT_EMAIL` | Email del service account |
| `JWT_SECRET` | Secreto para firmar tokens JWT |

## Estructura

```
src/
├── config/        # Inicialización de Firebase y MongoDB
├── controllers/   # Lógica de negocio (próximo sprint)
├── middleware/    # Auth, validación, errores
├── models/        # Esquemas Mongoose (User, Post, Message)
├── routes/        # Definición de endpoints
├── services/      # Servicios reutilizables (próximo sprint)
├── sockets/       # Configuración de WebSockets
├── utils/         # Funciones auxiliares (próximo sprint)
└── server.js      # Punto de entrada
```

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor |
| POST | `/api/auth/register` | Registrar usuario (requiere token Firebase) |
| GET | `/api/auth/me` | Perfil del usuario autenticado |

## Autenticación

El cliente debe obtener un **Firebase ID Token** después del login y enviarlo en cada petición protegida:

```
Authorization: Bearer <firebase-id-token>
```

Solo se aceptan correos `@alumnos.udg.mx`.
