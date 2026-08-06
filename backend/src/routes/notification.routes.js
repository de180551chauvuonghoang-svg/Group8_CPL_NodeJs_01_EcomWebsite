import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getNotifications,
  readAllNotifications,
  readNotification
} from "../controllers/notification.controller.js";

const router = express.Router();
router.use(protect);
router.get("/", getNotifications);
router.post("/read-all", readAllNotifications);
router.patch("/read-all", readAllNotifications);
router.patch("/:id/read", readNotification);

export default router;
