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

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Đăng ký tài khoản thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Đăng ký thành công!
 *       400:
 *         description: Yêu cầu không hợp lệ hoặc Email đã tồn tại
 */
router.post("/signup", signUp);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập bằng Email và Mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, thiết lập Cookie refreshToken (HttpOnly)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Email hoặc mật khẩu không chính xác
 */
router.post("/login", login);

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Đăng nhập / Đăng ký bằng Google OAuth2
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: ID Token nhận được từ Google Identity Services SDK ở Frontend
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjFhMmIzY...
 *     responses:
 *       200:
 *         description: Đăng nhập bằng Google thành công, thiết lập Cookie refreshToken
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Token của Google không hợp lệ
 */
router.post("/google", googleAuthLimiter, googleLogin);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu mã OTP khôi phục mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@gmail.com
 *     responses:
 *       200:
 *         description: Mã OTP đã được gửi tới email
 */
router.post("/forgot-password", forgotPassword);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Xác thực mã OTP khôi phục mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Mã OTP hợp lệ
 */
router.post("/verify-otp", otpLimiter, verifyOTP);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu mới bằng OTP đã xác thực
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Đổi mật khẩu mới thành công
 */
router.post("/reset-password", resetPassword);

// Protected routes (require authentication)

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin cá nhân của người dùng hiện tại
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin người dùng hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone_number:
 *                           type: string
 *                         avatar_url:
 *                           type: string
 *                         bio:
 *                           type: string
 *                         country:
 *                           type: string
 *                         timezone:
 *                           type: string
 *       401:
 *         description: Chưa xác thực hoặc Token không hợp lệ
 */
router.get("/me", protect, getMe);

/**
 * @openapi
 * /api/auth/update-profile:
 *   put:
 *     summary: Cập nhật hồ sơ cá nhân
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nguyễn Văn B
 *               phone_number:
 *                 type: string
 *                 example: "+84988888888"
 *               avatar_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://res.cloudinary.com/..."
 *               bio:
 *                 type: string
 *                 example: Học viên tại FPT Academy
 *               country:
 *                 type: string
 *                 example: Việt Nam
 *               timezone:
 *                 type: string
 *                 example: "(GMT+07:00) Bangkok, Hanoi, Jakarta"
 *     responses:
 *       200:
 *         description: Cập nhật hồ sơ cá nhân thành công
 *       401:
 *         description: Chưa xác thực
 */
router.put("/update-profile", protect, updateProfile);

/**
 * @openapi
 * /api/auth/upload:
 *   post:
 *     summary: Tải ảnh đại diện lên Cloudinary an toàn (Dạng chuỗi Base64 Data URI)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 description: Chuỗi ảnh mã hóa Base64 Data URI (tối đa 4MB)
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANS..."
 *     responses:
 *       200:
 *         description: Tải ảnh lên thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Tải ảnh lên thành công
 *                 secure_url:
 *                   type: string
 *                   example: https://res.cloudinary.com/volitify_avatars/...
 *       400:
 *         description: Dữ liệu ảnh không đúng định dạng base64 hoặc vượt quá 4MB
 *       429:
 *         description: Quá giới hạn upload (5 lượt tải lên / 15 phút)
 */
router.post("/upload", protect, uploadRateLimiter, uploadImage);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất tài khoản (Xóa Cookie)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/auth/logout-everywhere:
 *   post:
 *     summary: Đăng xuất khỏi tất cả các thiết bị
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post("/logout-everywhere", protect, logoutEverywhere);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Làm mới Access Token bằng Refresh Token từ Cookie
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Tạo Access Token mới thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 accessToken:
 *                   type: string
 */
router.post("/refresh", refreshAccessToken);

export default router;
