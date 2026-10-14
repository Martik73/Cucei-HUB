# 🎓 CUCEI HUB

**Red social académica para estudiantes del Centro Universitario de Ciencias Exactas e Ingenierías (CUCEI), Universidad de Guadalajara.**

CUCEI HUB centraliza la vida universitaria: publicaciones por carrera, mensajería directa, evaluación de docentes y comunidades de estudio — todo restringido a correos institucionales `@alumnos.udg.mx`.

> Proyecto académico — **Equipo A077 · Grupo 26A** · Ingeniería en Computación, CUCEI — UdeG

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen?logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4-black?logo=socket.io)

---

## ✨ Módulos implementados

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Registro y login exclusivo con correo `@alumnos.udg.mx`. Firebase Admin SDK + JWT propio |
| **Feed de publicaciones** | Posts generales (visibles para todos) y posts por carrera (sin filtración cruzada) |
| **Mensajería directa** | Chat en tiempo real entre usuarios vía WebSockets (Socket.io) |
| **Perfil de usuario** | Vista y edición de nombre, bio y semestre |
| **Evaluación docente** | Calificación de profesores por materia (1–5 estrellas), filtros por semestre/materia, sin anonimato, una evaluación por alumno/materia |
| **Sección educativa** | Comunidades de estudio con canal de discusión, subida de materiales PDF y links de YouTube |

---

## 🛠 Stack tecnológico

### Frontend
- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS v4** + **shadcn/ui** para componentes de interfaz
- **Socket.io Client** para mensajería en tiempo real
- **React Hook Form** + **Zod** para formularios y validación
- **Axios** para consumo de la API REST

### Backend
- **Node.js** + **Express 4**
- **Socket.io** para WebSockets
- **Mongoose** sobre **MongoDB** (local en desarrollo, Atlas en producción)
- **Firebase Admin SDK** para verificación de dominio institucional
- **JWT** (`jsonwebtoken`) para gestión de sesiones
- **Multer** para subida de archivos PDF (máx. 10 MB)
- **bcryptjs** para hash de contraseñas

### Base de datos
- **Desarrollo:** MongoDB local en `mongodb://localhost:27017/cucei-hub`
- **Producción:** MongoDB Atlas (URI vía variable de entorno `MONGODB_URI`)

---

## 📁 Estructura del proyecto

```
cucei-hub/
├── backend/
│   ├── scripts/
│   │   └── seed-professors.js      # Carga inicial de profesores y materias
│   ├── src/
│   │   ├── config/
│   │   │   ├── firebase.js         # Inicialización Firebase Admin SDK
│   │   │   └── mongodb.js          # Conexión Mongoose
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── community.controller.js
│   │   │   ├── message.controller.js
│   │   │   ├── post.controller.js
│   │   │   ├── professor.controller.js
│   │   │   └── users.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.js             # Verificación JWT + dominio @alumnos.udg.mx
│   │   │   ├── errorHandler.js
│   │   │   ├── socketAuth.js       # Auth para conexiones WebSocket
│   │   │   └── upload.js           # Multer para PDFs
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Post.js
│   │   │   ├── Comment.js
│   │   │   ├── Reaction.js
│   │   │   ├── Message.js
│   │   │   ├── Professor.js
│   │   │   ├── Subject.js
│   │   │   ├── Evaluation.js
│   │   │   ├── Community.js
│   │   │   ├── CommunityMember.js
│   │   │   ├── Material.js
│   │   │   └── CommunityMessage.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── community.routes.js
│   │   │   ├── message.routes.js
│   │   │   ├── post.routes.js
│   │   │   ├── professor.routes.js
│   │   │   ├── subject.routes.js
│   │   │   └── users.routes.js
│   │   ├── sockets/
│   │   │   └── index.js            # Eventos Socket.io (mensajería directa)
│   │   ├── utils/
│   │   │   ├── validators.js       # Validaciones de email y carrera
│   │   │   └── postValidators.js
│   │   └── server.js
│   ├── uploads/materials/          # PDFs subidos por usuarios
│   ├── .env.example                # Plantilla de variables de entorno
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── communities/
    │   │   ├── [id]/page.tsx       # Detalle de comunidad
    │   │   └── page.tsx            # Listado de comunidades
    │   ├── messages/page.tsx       # Chat directo
    │   ├── professors/
    │   │   ├── [id]/page.tsx       # Detalle del profesor + evaluaciones
    │   │   └── page.tsx            # Listado de profesores
    │   ├── profile/[id]/page.tsx   # Perfil de usuario
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx                # Feed principal
    ├── components/
    │   ├── feed/                   # PostCard, CreatePost, Comments, PostSkeleton
    │   ├── communities/
    │   ├── messages/
    │   ├── professors/
    │   ├── profile/
    │   ├── layout/                 # Navbar, Sidebar
    │   ├── ui/                     # Componentes shadcn/ui
    │   └── ProtectedRoute.tsx
    ├── context/
    │   ├── AuthContext.tsx         # Estado global de autenticación
    │   └── SocketContext.tsx       # Conexión Socket.io
    ├── lib/
    │   ├── api.ts                  # Instancia Axios con interceptores JWT
    │   ├── auth.ts
    │   ├── posts.ts
    │   ├── messages.ts
    │   ├── communities.ts
    │   ├── professors.ts
    │   └── users.ts
    └── package.json
```

---

## ✅ Requisitos previos

- **Node.js** v18 o superior
- **MongoDB** corriendo localmente en el puerto `27017`
  ```bash
  # Verificar que MongoDB está activo
  mongosh --eval "db.runCommand({ ping: 1 })"
  ```
  > También puedes usar una URI de **MongoDB Atlas** configurando `MONGODB_URI` en el `.env`.
- Proyecto de **Firebase** con el SDK Admin habilitado (para verificación de dominio)
- Git

---

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Martik73/Cucei-HUB.git
cd Cucei-HUB
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

Crea el archivo `.env` a partir de la plantilla:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales reales (ver sección [Variables de entorno](#-variables-de-entorno)).

Carga los profesores y materias de prueba:

```bash
node scripts/seed-professors.js
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

El backend queda disponible en `http://localhost:5000`.

### 3. Configurar el Frontend

Abre otra terminal:

```bash
cd frontend
npm install
```

Crea el archivo `.env.local` en la carpeta `frontend/`:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

El frontend queda disponible en `http://localhost:3000`.

---

## 🔑 Variables de entorno

### Backend — `backend/.env`

Copia `backend/.env.example` y rellena los valores:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cucei-hub

# Servidor
PORT=5000
NODE_ENV=development
JWT_SECRET=

# CORS
FRONTEND_URL=http://localhost:3000
```

> ⚠️ **Nunca** subas el archivo `.env` al repositorio. Está incluido en `.gitignore`.

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## ▶️ Cómo correr el proyecto

Asegúrate de que **MongoDB esté corriendo** antes de iniciar el backend.

| Servicio | Directorio | Comando | Puerto |
|----------|------------|---------|--------|
| Backend  | `backend/` | `npm run dev` | `5000` |
| Frontend | `frontend/` | `npm run dev` | `3000` |

Accede a la aplicación en `http://localhost:3000`.

La mensajería en tiempo real usa **Socket.io** sobre el mismo puerto del backend (`5000`).

---

## 🌐 Endpoints principales de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registro con correo institucional |
| `POST` | `/api/auth/login` | Login — retorna JWT |
| `GET` | `/api/posts` | Feed paginado con filtro por carrera |
| `POST` | `/api/posts` | Crear publicación |
| `GET` | `/api/messages/conversations` | Lista de conversaciones activas |
| `GET` | `/api/messages/:userId` | Historial de mensajes con un usuario |
| `GET` | `/api/professors` | Lista de profesores con filtros |
| `POST` | `/api/professors/:id/evaluations` | Registrar evaluación docente |
| `GET` | `/api/communities` | Lista de comunidades de estudio |
| `POST` | `/api/communities/:id/join` | Unirse a una comunidad |

---

## 👥 Equipo de desarrollo

**Equipo A077 · Grupo 26A** — Ingeniería en Computación, CUCEI · Universidad de Guadalajara

| Nombre |
|--------|
| Delgado Lizardi Alfonso Roman |
| Pérez Cornejo Gilberto Emmanuel |
| Pérez Ramírez Josué Martin |
| Zepeda Briseño Juan Jesús |

---

## 📄 Licencia

ISC — Proyecto académico. Ver `backend/package.json` para más detalles.
