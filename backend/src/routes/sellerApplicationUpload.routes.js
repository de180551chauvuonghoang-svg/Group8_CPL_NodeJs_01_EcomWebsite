import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import { parseSingleImage } from "../middlewares/imageUpload.middleware.js";
import { requireEditableSellerApplication } from "../middlewares/seller.middleware.js";
import {
  deleteSellerImage,
  uploadSellerImage
} from "../controllers/uploadImage.controller.js";

const router = express.Router();
const APPLICATION_IMAGE_PURPOSES = new Set(["shop_logo", "shop_cover"]);

const requireApplicationImagePurpose = (req, res, next) => {
  const purpose = String(req.body?.purpose || "").trim();
  if (!APPLICATION_IMAGE_PURPOSES.has(purpose)) {
    return res.status(400).json({
      status: "fail",
      code: "INVALID_APPLICATION_IMAGE_PURPOSE",
      message: "Ảnh hồ sơ đăng ký chỉ nhận purpose shop_logo hoặc shop_cover."
    });
  }
  return next();
};

/**
 * @openapi
 * /api/seller/application/uploads/images:
 *   post:
 *     summary: Upload logo hoặc ảnh bìa trước khi gửi đơn mở cửa hàng
 *     tags: [Seller Application]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, purpose]
 *             properties:
 *               file: { type: string, format: binary }
 *               purpose: { type: string, enum: [shop_logo, shop_cover] }
 *     responses:
 *       201: { description: Trả URL và publicId của ảnh }
 *       400: { description: File hoặc purpose không hợp lệ }
 *       403: { description: SELLER_SUSPENDED }
 *       409: { description: SELLER_APPLICATION_PENDING hoặc SELLER_ALREADY_ACTIVE }
 *   delete:
 *     summary: Xóa ảnh hồ sơ đăng ký thuộc tài khoản hiện tại
 *     tags: [Seller Application]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ảnh đã xóa hoặc không còn tồn tại }
 */
router.use(protect, restrictTo("customer", "seller"), requireEditableSellerApplication);
router.post("/images", parseSingleImage, requireApplicationImagePurpose, uploadSellerImage);
router.delete("/images", deleteSellerImage);

export default router;
