import app from './src/app.js';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

// Connect to SQL Server Database before starting server
await connectDB();

const PORT = process.env.PORT || 5001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    credentials: true
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[🔌 SOCKET CONNECTED] Client: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`[🔌 SOCKET ROOM] Client ${socket.id} joined room: ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`[🔌 SOCKET ROOM] Client ${socket.id} left room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[🔌 SOCKET DISCONNECTED] Client: ${socket.id}`);
  });
});

const server = httpServer.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`[🚀 SERVER RUNNING] http://localhost:${PORT}`);
  console.log(`[🛠️  ENVIRONMENT]   ${process.env.NODE_ENV || 'development'}`);
  console.log(`[🏥 HEALTH CHECK]   http://localhost:${PORT}/api/health`);
  console.log(`==================================================\n`);
});

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (err) => {
  console.error('[⚠️ UNHANDLED REJECTION] Shutting down...', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('[🚨 UNCAUGHT EXCEPTION] Shutting down...', err.stack);
  server.close(() => process.exit(1));
});

export { io };
