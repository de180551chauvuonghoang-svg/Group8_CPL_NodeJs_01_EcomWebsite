import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

// Routes imports
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import userRoute from "./routes/userRoute.js";
import aiRoutes from "./routes/ai.routes.js";
import addressRoutes from "./routes/address.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import orderRoutes from "./routes/order.routes.js";
import sellerRoutes from "./routes/seller.routes.js";
import chatRoutes from "./routes/chat.routes.js";

// Middlewares imports
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// 1. Security Middlewares - Disable CSP to allow Swagger UI resources to load
app.use(helmet({
  contentSecurityPolicy: false
}));

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];
if (process.env.FRONTEND_URL) {
  // Support both comma-separated lists or single URL
  if (process.env.FRONTEND_URL.includes(',')) {
    allowedOrigins.push(...process.env.FRONTEND_URL.split(',').map(url => url.trim()));
  } else {
    allowedOrigins.push(process.env.FRONTEND_URL.trim());
  }
}

app.use(
  cors({
    origin: allowedOrigins,
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
  max: process.env.NODE_ENV === "production" ? 100 : 2000,
  skip: () => process.env.NODE_ENV !== "production" && process.env.ENABLE_RATE_LIMIT !== "true",
  message: {
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
});
app.use("/api", limiter);

// 3. Logging Middleware
app.use(morgan("dev"));

// Swagger Interactive API Docs Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
app.use("/api/user", userRoute);
app.use("/api/ai", aiRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/chat", chatRoutes);

// 4. Handle 404 Routes
app.all("*", (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.statusCode = 404;
  next(err);
});

// 5. Global Error Handling Middleware
app.use(errorHandler);

export default app;
