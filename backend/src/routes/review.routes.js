import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import {
  createProductReview,
  deleteProductReview,
  getMyReviews,
  getProductReviews,
  getReviewableItems,
  getSellerReviews,
  replyToProductReview,
  updateProductReview
} from "../controllers/review.controller.js";
import { listMyReturns } from "../controllers/return.controller.js";

const router = express.Router();

/**
 * @openapi
 * /api/products/{productId}/reviews:
 *   get:
 *     summary: Lấy đánh giá công khai của sản phẩm
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: rating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest, lowest]
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: Danh sách đánh giá, thống kê sao và phân trang
 *       404:
 *         description: Không tìm thấy sản phẩm
 *   post:
 *     summary: Customer đánh giá một sản phẩm đã được giao thành công
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderItemId, rating, body]
 *             properties:
 *               orderItemId: { type: string }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string, nullable: true, maxLength: 255 }
 *               body: { type: string, minLength: 10, maxLength: 2000 }
 *     responses:
 *       201:
 *         description: Tạo đánh giá đã xác minh mua hàng thành công
 *       403:
 *         description: Không sở hữu dòng đơn hàng hoặc sản phẩm thuộc shop của chính mình
 *       409:
 *         description: Sản phẩm chưa giao hoặc dòng đơn hàng đã được đánh giá
 */
router.get("/products/:productId/reviews", getProductReviews);
router.post("/products/:productId/reviews", protect, createProductReview);

/**
 * @openapi
 * /api/me/reviewable-items:
 *   get:
 *     summary: Lấy các dòng đơn hàng customer được phép đánh giá
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chỉ gồm sản phẩm đã giao và chưa có review đang hoạt động
 */
router.get("/me/reviewable-items", protect, getReviewableItems);

/**
 * @openapi
 * /api/me/reviews:
 *   get:
 *     summary: Customer lấy các đánh giá của chính mình
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: Danh sách review đang hoạt động của tài khoản và phân trang
 *       401:
 *         description: Thiếu access token
 */
router.get("/me/reviews", protect, getMyReviews);
router.get("/me/returns", protect, listMyReturns);

/**
 * @openapi
 * /api/reviews/{reviewId}:
 *   patch:
 *     summary: Customer sửa đánh giá của chính mình
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string, nullable: true, maxLength: 255 }
 *               body: { type: string, minLength: 10, maxLength: 2000 }
 *     responses:
 *       200: { description: Cập nhật đánh giá thành công }
 *       404: { description: Không tìm thấy đánh giá thuộc customer }
 *   delete:
 *     summary: Customer xóa mềm đánh giá của chính mình
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Xóa đánh giá thành công }
 *       404: { description: Không tìm thấy đánh giá thuộc customer }
 */
router.patch("/reviews/:reviewId", protect, updateProductReview);
router.delete("/reviews/:reviewId", protect, deleteProductReview);

/**
 * @openapi
 * /api/seller/reviews:
 *   get:
 *     summary: Seller lấy đánh giá của các sản phẩm thuộc shop
 *     tags: [Seller Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: replied
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200: { description: Danh sách review thuộc shop và phân trang }
 *       403: { description: Tài khoản không có quyền seller }
 */
router.get(
  "/seller/reviews",
  protect,
  restrictTo("seller"),
  getSellerReviews
);

/**
 * @openapi
 * /api/seller/reviews/{reviewId}/reply:
 *   put:
 *     summary: Seller tạo hoặc thay thế phản hồi cho review thuộc shop
 *     tags: [Seller Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reply]
 *             properties:
 *               reply: { type: string, minLength: 2, maxLength: 2000 }
 *     responses:
 *       200: { description: Phản hồi review thành công }
 *       404: { description: Review không thuộc shop hoặc không còn hoạt động }
 */
router.put(
  "/seller/reviews/:reviewId/reply",
  protect,
  restrictTo("seller"),
  replyToProductReview
);

export default router;
