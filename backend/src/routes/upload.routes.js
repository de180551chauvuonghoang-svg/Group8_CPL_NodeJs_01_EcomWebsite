import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  deleteSellerImage,
  uploadSellerImage
} from "../controllers/uploadImage.controller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.mimetype)) {
      const error = new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      error.code = "INVALID_IMAGE_TYPE";
      return callback(error);
    }
    return callback(null, true);
  }
});

router.use(protect, restrictTo("seller"));

router.post("/images", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return uploadSellerImage(req, res, next);
    return res.status(400).json({
      status: "fail",
      code: error.code === "LIMIT_FILE_SIZE"
        ? "IMAGE_TOO_LARGE"
        : error.code || "IMAGE_UPLOAD_INVALID",
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Ảnh không được vượt quá 5 MB."
        : error.message
    });
  });
});
router.delete("/images", deleteSellerImage);

export default router;
