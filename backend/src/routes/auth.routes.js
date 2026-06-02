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
  updateProfile,
} from "../controllers/auth.controller.js";
import { uploadImage } from "../controllers/upload.controller.js";
import rateLimit from "express-rate-limit";
import { protect } from "../middlewares/auth.middleware.js";
import { googleLogin } from "../controllers/googleAuth.controller.js";


const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    status: "fail",
    message: "Quá nhiều yêu cầu xác thực OTP từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  message: {
    status: "fail",
    message: "Quá nhiều yêu cầu đăng nhập Google từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP/user to 5 uploads per windowMs
  message: {
    status: "fail",
    message: "Quá nhiều yêu cầu tải ảnh lên từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// Public routes
router.post("/signup", signUp);
router.post("/login", login);
router.post("/google", googleAuthLimiter, googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/reset-password", resetPassword);

// Protected routes (require authentication)
router.get("/me", protect, getMe);
router.put("/update-profile", protect, updateProfile);
router.post("/upload", protect, uploadRateLimiter, uploadImage);
router.post("/logout", logout);
router.post("/logout-everywhere", protect, logoutEverywhere);

// Token refresh route
router.post("/refresh", refreshAccessToken);

export default router;
