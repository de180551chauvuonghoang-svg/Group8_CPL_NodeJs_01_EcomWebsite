import 'dotenv/config';
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { setupSocket } from "./src/config/socket.js";

// Connect to SQL Server Database before starting server
await connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`[🚀 SERVER RUNNING] http://localhost:${PORT}`);
  console.log(`[📑 API DOCS]       http://localhost:${PORT}/api-docs`);
  console.log(`[🛠️  ENVIRONMENT]   ${process.env.NODE_ENV || "development"}`);
  console.log(`[🏥 HEALTH CHECK]   http://localhost:${PORT}/api/health`);
  console.log(`==================================================\n`);
});

// Setup Socket.io Server for real-time chat
setupSocket(server);

// Handle unhandled rejections and exceptions
process.on("unhandledRejection", (err) => {
  console.error("[⚠️ UNHANDLED REJECTION] Shutting down...", err.message);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("[🚨 UNCAUGHT EXCEPTION] Shutting down...", err.stack);
  server.close(() => process.exit(1));
});
