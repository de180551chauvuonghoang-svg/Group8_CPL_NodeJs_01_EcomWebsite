import express from "express";
import {
  signUp,
  login,
  logout,
  logoutEverywhere,
  refreshAccessToken,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/signup", signUp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Protected routes (require authentication)
router.get("/me", protect, getMe);
router.post("/logout", logout);
router.post("/logout-everywhere", protect, logoutEverywhere);

// Token refresh route
router.post("/refresh", refreshAccessToken);

export default router;
