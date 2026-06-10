import express from "express";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from "../controllers/address.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Tất cả các route address đều yêu cầu đăng nhập
router.use(protect);

/**
 * @openapi
 * /api/addresses:
 *   get:
 *     summary: Lấy danh sách địa chỉ của người dùng
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", getAddresses);

/**
 * @openapi
 * /api/addresses:
 *   post:
 *     summary: Thêm địa chỉ mới
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", addAddress);

/**
 * @openapi
 * /api/addresses/{id}:
 *   put:
 *     summary: Cập nhật địa chỉ
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", updateAddress);

/**
 * @openapi
 * /api/addresses/{id}:
 *   delete:
 *     summary: Xóa địa chỉ
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", deleteAddress);

/**
 * @openapi
 * /api/addresses/{id}/default:
 *   put:
 *     summary: Đặt làm địa chỉ mặc định
 *     tags: [Address]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id/default", setDefaultAddress);

export default router;
