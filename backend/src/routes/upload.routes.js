import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import { requireActiveSeller } from "../middlewares/seller.middleware.js";
import { parseSingleImage } from "../middlewares/imageUpload.middleware.js";
import {
  deleteSellerImage,
  uploadSellerImage
} from "../controllers/uploadImage.controller.js";

const router = express.Router();

router.use(protect, requireActiveSeller, restrictTo("seller"));

router.post("/images", parseSingleImage, uploadSellerImage);
router.delete("/images", deleteSellerImage);

export default router;
