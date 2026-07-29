import express from "express";
import { getPublicBanners } from "../controllers/banner.controller.js";

const router = express.Router();

// Public route — không cần đăng nhập, trang chủ gọi để lấy banner khuyến mãi đang hiển thị
router.get("/", getPublicBanners);

export default router;
