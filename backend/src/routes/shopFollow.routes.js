import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  createShopFollow,
  deleteShopFollow,
  showShopFollowStatus
} from "../controllers/shopFollow.controller.js";

const router = express.Router();
router.use(protect);
router.post("/:shopId/follow", createShopFollow);
router.delete("/:shopId/follow", deleteShopFollow);
router.get("/:shopId/follow-status", showShopFollowStatus);

export default router;
