require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');

const { connectMongoDB } = require('./config/mongodb');
const { initFirebase } = require('./config/firebase');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { initSockets } = require('./sockets');

// Rutas
const authRoutes      = require('./routes/auth.routes');
const postRoutes      = require('./routes/post.routes');
const messageRoutes   = require('./routes/message.routes');
const usersRoutes     = require('./routes/users.routes');
const professorRoutes = require('./routes/professor.routes');
const subjectRoutes   = require('./routes/subject.routes');

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});
initSockets(io);

// ─── Middlewares globales ────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/posts',      postRoutes);
app.use('/api/messages',   messageRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/professors', professorRoutes);
app.use('/api/subjects',   subjectRoutes);

// ─── Manejo de rutas no encontradas ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.originalUrl} no encontrada` });
});

// ─── Error handler global (debe ir al final) ─────────────────────────────────
app.use(globalErrorHandler);

// ─── Inicio del servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  initFirebase();
  await connectMongoDB();

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 WebSockets activos en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);
  });
};

startServer();
