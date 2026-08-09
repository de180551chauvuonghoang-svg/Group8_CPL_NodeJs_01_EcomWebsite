import { v4 as uuidv4 } from 'uuid';
import { pool, sql } from '../config/db.js';

// Helper to ensure a user has a wishlist
const getOrCreateWishlist = async (userId) => {
  const result = await pool.request()
    .input('user_id', userId)
    .query(`SELECT id FROM Wishlists WHERE user_id = @user_id`);
  
  if (result.recordset.length > 0) {
    return result.recordset[0].id;
  }
  
  const newId = uuidv4();
  await pool.request()
    .input('id', newId)
    .input('user_id', userId)
    .query(`INSERT INTO Wishlists (id, user_id, created_at) VALUES (@id, @user_id, GETDATE())`);
  return newId;
};

// GET /api/wishlists
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const wishlistId = await getOrCreateWishlist(userId);

    const { recordset } = await pool.request()
      .input('wishlist_id', wishlistId)
      .query(`
        WITH product_variants AS (
          SELECT 
            wi.id as wishlist_item_id,
            p.id, p.name, p.slug, p.description,
            COALESCE(pv.price, p.base_price) AS base_price,
            COALESCE(pv.image_url, pi.image_url, '') AS image_url,
            c.name AS category_name,
            wi.added_at,
            ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pv.id) AS rn
          FROM WishlistItems wi
          JOIN Products p ON wi.product_id = p.id
          LEFT JOIN ProductVariants pv ON p.id = pv.product_id
          LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
          LEFT JOIN ProductCategories pc ON p.id = pc.product_id
          LEFT JOIN Categories c ON pc.category_id = c.id
          WHERE wi.wishlist_id = @wishlist_id
        )
        SELECT *
        FROM product_variants
        WHERE rn = 1
        ORDER BY added_at DESC
      `);

    res.json({ status: 'success', data: recordset });
  } catch (err) {
    next(err);
  }
};

// POST /api/wishlists/add
export const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ status: 'fail', message: 'Missing productId' });
    }

    const wishlistId = await getOrCreateWishlist(userId);

    // Check if already exists
    const checkResult = await pool.request()
      .input('wishlist_id', wishlistId)
      .input('product_id', productId)
      .query(`SELECT id FROM WishlistItems WHERE wishlist_id = @wishlist_id AND product_id = @product_id`);

    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ status: 'fail', message: 'Product already in wishlist' });
    }

    await pool.request()
      .input('id', uuidv4())
      .input('wishlist_id', wishlistId)
      .input('product_id', productId)
      .query(`
        INSERT INTO WishlistItems (id, wishlist_id, product_id, added_at)
        VALUES (@id, @wishlist_id, @product_id, GETDATE())
      `);

    res.status(201).json({ status: 'success', message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/wishlists/remove/:productId
export const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlistId = await getOrCreateWishlist(userId);

    await pool.request()
      .input('wishlist_id', wishlistId)
      .input('product_id', productId)
      .query(`
        DELETE FROM WishlistItems 
        WHERE wishlist_id = @wishlist_id AND product_id = @product_id
      `);

    res.json({ status: 'success', message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
};
