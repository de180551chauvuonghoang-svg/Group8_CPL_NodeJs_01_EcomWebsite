import { sql, pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/reviews/product/:productId
 * Returns all approved reviews for a product (public).
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const { recordset } = await pool.request()
      .input('productId', sql.VarChar, productId)
      .query(`
        SELECT r.id, r.rating, r.title, r.body, r.is_verified, r.created_at,
               u.name AS user_name, u.avatar_url
        FROM Reviews r
        JOIN Users u ON r.user_id = u.id
        WHERE r.product_id = @productId AND r.is_approved = 1
        ORDER BY r.created_at DESC
      `);

    res.json({ status: 'success', data: recordset });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reviews/mine/:productId
 * Returns the authenticated user's review for a product, if any.
 */
export const getMyReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const { recordset } = await pool.request()
      .input('productId', sql.VarChar, productId)
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT id, rating, title, body, created_at
        FROM Reviews
        WHERE product_id = @productId AND user_id = @userId
      `);

    res.json({ status: 'success', data: recordset[0] || null });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews
 * Creates a new review for a product (authenticated, one per product per user).
 */
export const createReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, rating, title, body } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ status: 'fail', message: 'productId và rating là bắt buộc' });
    }

    const ratingNum = parseInt(rating, 10);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ status: 'fail', message: 'Rating phải từ 1 đến 5' });
    }

    // Ensure the product exists
    const { recordset: productCheck } = await pool.request()
      .input('productId', sql.VarChar, productId)
      .query(`SELECT id FROM Products WHERE id = @productId`);

    if (productCheck.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Sản phẩm không tồn tại' });
    }

    // One review per user per product
    const { recordset: existing } = await pool.request()
      .input('productId', sql.VarChar, productId)
      .input('userId', sql.VarChar, userId)
      .query(`SELECT id FROM Reviews WHERE product_id = @productId AND user_id = @userId`);

    if (existing.length > 0) {
      return res.status(409).json({ status: 'fail', message: 'Bạn đã đánh giá sản phẩm này rồi' });
    }

    const reviewId = uuidv4();

    await pool.request()
      .input('id',        sql.VarChar,          reviewId)
      .input('productId', sql.VarChar,          productId)
      .input('userId',    sql.VarChar,          userId)
      .input('rating',    sql.TinyInt,          ratingNum)
      .input('title',     sql.NVarChar(255),    title || null)
      .input('body',      sql.NVarChar(sql.MAX), body || null)
      .query(`
        INSERT INTO Reviews (id, product_id, user_id, rating, title, body,
                             is_verified, is_approved, created_at, updated_at)
        VALUES (@id, @productId, @userId, @rating, @title, @body,
                0, 1, GETDATE(), GETDATE())
      `);

    res.status(201).json({ status: 'success', message: 'Đánh giá của bạn đã được ghi nhận!', reviewId });
  } catch (err) {
    next(err);
  }
};
