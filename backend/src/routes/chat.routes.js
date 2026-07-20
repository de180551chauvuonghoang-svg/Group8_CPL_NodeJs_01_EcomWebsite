import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  getRecentChats,
  getChatHistory,
  markChatAsRead
} from "../controllers/chat.controller.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("customer", "seller"));

router.get("/recent", getRecentChats);
router.get("/history/:partnerId", getChatHistory);
router.post("/read/:partnerId", markChatAsRead);

export default router;
