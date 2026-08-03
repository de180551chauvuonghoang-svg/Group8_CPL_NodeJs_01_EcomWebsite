import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  listWithdrawalRequestsForAdmin,
  updateWithdrawalRequestForAdmin
} from "../controllers/adminWithdrawal.controller.js";

const router = express.Router();

router.use(protect, restrictTo("admin"));
router.get("/", listWithdrawalRequestsForAdmin);
router.patch("/:id", updateWithdrawalRequestForAdmin);

export default router;
