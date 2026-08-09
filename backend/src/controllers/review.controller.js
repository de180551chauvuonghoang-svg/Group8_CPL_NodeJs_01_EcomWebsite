import { v4 as uuidv4 } from 'uuid';
import { pool, sql } from '../config/db.js';

// GET /api/reviews/product/:productId
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const { recordset } = await pool.request()
      .input('product_id', sql.VarChar, productId)
      .query(`
        SELECT 
          r.id,
          r.rating,
          r.title,
          r.body,
          r.is_verified,
          r.created_at,
          u.name as user_name,
          u.avatar_url as user_avatar
        FROM Reviews r
        JOIN Users u ON r.user_id = u.id
        WHERE r.product_id = @product_id AND r.is_approved = 1
        ORDER BY r.created_at DESC
      `);

    res.json({
      status: 'success',
      data: recordset
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/reviews
export const createReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, rating, title, body } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({
        status: 'fail',
        message: 'Product ID and Rating are required.'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Rating must be between 1 and 5.'
      });
    }

    // Check if the user actually bought this product to mark as verified
    const orderCheck = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .input('product_id', sql.VarChar, productId)
      .query(`
        SELECT TOP 1 oi.id 
        FROM OrderItems oi
        JOIN Orders o ON oi.order_id = o.id
        JOIN ProductVariants pv ON oi.variant_id = pv.id
        WHERE o.user_id = @user_id AND pv.product_id = @product_id AND o.status = 'delivered'
      `);
      
    const isVerified = orderCheck.recordset.length > 0 ? 1 : 0;
    const orderItemId = isVerified ? orderCheck.recordset[0].id : null;

    const reviewId = uuidv4();

    await pool.request()
      .input('id', sql.VarChar, reviewId)
      .input('product_id', sql.VarChar, productId)
      .input('user_id', sql.VarChar, userId)
      .input('order_item_id', sql.VarChar, orderItemId)
      .input('rating', sql.TinyInt, rating)
      .input('title', sql.NVarChar, title || null)
      .input('body', sql.NVarChar, body || null)
      .input('is_verified', sql.Bit, isVerified)
      .query(`
        INSERT INTO Reviews (id, product_id, user_id, order_item_id, rating, title, body, is_verified, created_at, updated_at)
        VALUES (@id, @product_id, @user_id, @order_item_id, @rating, @title, @body, @is_verified, GETDATE(), GETDATE())
      `);
      
    // Update product rating (optional but good for syncing)
    await pool.request()
      .input('product_id', sql.VarChar, productId)
      .query(`
        UPDATE Products 
        SET rating = (SELECT AVG(CAST(rating AS DECIMAL(3,2))) FROM Reviews WHERE product_id = @product_id AND is_approved = 1),
            reviewsCount = (SELECT COUNT(*) FROM Reviews WHERE product_id = @product_id AND is_approved = 1)
        WHERE id = @product_id
      `);

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully.',
      data: {
        id: reviewId,
        is_verified: isVerified
      }
    });
  } catch (err) {
    next(err);
  }
};
