import express from 'express';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/product.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: Lấy danh sách toàn bộ sản phẩm
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Trả về danh sách sản phẩm thành công
 */
router.get('/', getAllProducts);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Lấy thông tin sản phẩm chi tiết theo ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm
 *     responses:
 *       200:
 *         description: Tìm thấy sản phẩm
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get('/:id', getProductById);

// Protected Admin-only routes

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Tạo sản phẩm mới (Chỉ dành cho Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: iPhone 15 Pro Max
 *               price:
 *                 type: number
 *                 example: 34990000
 *               description:
 *                 type: string
 *                 example: Flagship mới nhất từ Apple
 *     responses:
 *       201:
 *         description: Tạo sản phẩm thành công
 *       403:
 *         description: Không có quyền truy cập (Yêu cầu quyền Admin)
 */
router.post('/', protect, restrictTo('admin'), createProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   patch:
 *     summary: Cập nhật sản phẩm theo ID (Chỉ dành cho Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch('/:id', protect, restrictTo('admin'), updateProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Xóa sản phẩm theo ID (Chỉ dành cho Admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa sản phẩm thành công
 */
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

export default router;
