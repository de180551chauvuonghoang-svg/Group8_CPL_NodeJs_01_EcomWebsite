import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

// Routes imports
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";

// Middlewares imports
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// 1. Security Middlewares
app.use(helmet());

// Configure CORS to allow our React frontend (typically runs on 5173 for Vite)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  }),
);

// 2. Parsing Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter to prevent abusive API calls
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
});
app.use("/api", limiter);

// 3. Logging Middleware
app.use(morgan("dev"));

// 3. API Routes Setup
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Backend API is healthy and running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// 4. Handle 404 Routes
app.all("*", (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.statusCode = 404;
  next(err);
});

// 5. Global Error Handling Middleware
app.use(errorHandler);

export default app;
