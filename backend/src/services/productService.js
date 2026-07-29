import { sql, pool } from '../config/db.js';

export const productService = {
  // Get all products with optional category/brand filter and search
  getAll: async ({ category, search, brand }) => {
    let query = `
      WITH product_variants AS (
        SELECT
          p.id, p.name, p.description,
          COALESCE(fs.sale_price, pv.price, p.base_price) AS price,
          CASE WHEN fs.id IS NOT NULL THEN COALESCE(fs.original_price, pv.price, p.base_price) ELSE NULL END AS originalPrice,
          CASE WHEN fs.id IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS isFlashSale,
          fs.ends_at AS flashSaleEndsAt,
          COALESCE(pv.stock_qty, 0) AS stock,
          COALESCE(pv.image_url, pi.image_url, '') AS image,
          c.name AS category,
          c.slug AS category_slug,
          b.id AS brand_id,
          b.name AS brand_name,
          p.seller_id,
          s.user_id AS seller_user_id,
          s.shop_name AS seller_name,
          s.logo_url AS seller_logo_url,
          ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pv.id) AS rn
        FROM Products p
        LEFT JOIN ProductVariants pv ON p.id = pv.product_id
        LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
        LEFT JOIN Sellers s ON p.seller_id = s.id
        LEFT JOIN ProductCategories pc ON p.id = pc.product_id
        LEFT JOIN Categories c ON pc.category_id = c.id
        LEFT JOIN Brands b ON p.brand_id = b.id
        OUTER APPLY (
          SELECT TOP 1 id, sale_price, original_price, ends_at
          FROM ProductFlashSales
          WHERE product_id = p.id
            AND (variant_id IS NULL OR variant_id = pv.id)
            AND status = 'active'
            AND starts_at <= GETDATE()
            AND ends_at >= GETDATE()
          ORDER BY CASE WHEN variant_id = pv.id THEN 0 ELSE 1 END, ends_at ASC
        ) fs
        WHERE ISNULL(p.is_active, 1) = 1
    `;
    const request = pool.request();

    if (category) {
      query += `
        AND (
          LOWER(c.slug) = LOWER(@category)
          OR LOWER(c.id) = LOWER(@category)
          OR LOWER(c.name) = LOWER(@category)
          OR LOWER(CASE c.slug
            WHEN 'am-thanh' THEN 'Audio'
            WHEN 'dong-ho-wear' THEN 'Wearables'
            WHEN 'dien-tu' THEN 'Electronics'
            WHEN 'phu-kien' THEN 'Accessories'
            WHEN 'nha-bep' THEN 'Home & Kitchen'
            ELSE c.slug
          END) = LOWER(@category)
        )`;
      request.input('category', sql.NVarChar, category);
    }

    if (brand) {
      query += `
        AND (
          LOWER(b.id) = LOWER(@brand)
          OR LOWER(b.name) = LOWER(@brand)
        )`;
      request.input('brand', sql.NVarChar, brand);
    }

    if (search) {
      query += ' AND (LOWER(p.name) LIKE LOWER(@search) OR LOWER(p.description) LIKE LOWER(@search))';
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += `
      )
      SELECT
        pv.id, pv.name, pv.description, pv.price, pv.originalPrice, pv.isFlashSale, pv.flashSaleEndsAt,
        pv.stock, pv.image, pv.category, pv.category_slug, pv.brand_id, pv.brand_name,
        pv.seller_id, pv.seller_user_id, pv.seller_name, pv.seller_logo_url,
        (SELECT AVG(CAST(r.rating AS FLOAT))
           FROM Reviews r
           WHERE r.product_id = pv.id AND r.is_approved = 1) AS rating,
        (SELECT COUNT(*)
           FROM Reviews r
           WHERE r.product_id = pv.id AND r.is_approved = 1) AS reviewsCount
      FROM product_variants pv
      WHERE rn = 1
    `;

    const result = await request.query(query);

    return result.recordset.map(product => ({
      ...product,
      price:         parseFloat(product.price || 0),
      originalPrice: product.originalPrice === null ? null : parseFloat(product.originalPrice || 0),
      isFlashSale:   Boolean(product.isFlashSale),
      stock:         parseInt(product.stock || 0),
      rating:        product.rating != null ? parseFloat(product.rating) : 0,
      reviewsCount:  product.reviewsCount != null ? parseInt(product.reviewsCount) : 0,
    }));
  },

  // Get product by ID
  getById: async (productId) => {
    const result = await pool.request()
      .input('id', sql.VarChar, productId)
      .query(`
        SELECT
          p.id, p.name, p.description,
          COALESCE(fs.sale_price, pv.price, p.base_price) AS price,
          CASE WHEN fs.id IS NOT NULL THEN COALESCE(fs.original_price, pv.price, p.base_price) ELSE NULL END AS originalPrice,
          CASE WHEN fs.id IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS isFlashSale,
          fs.ends_at AS flashSaleEndsAt,
          COALESCE(pv.stock_qty, 0)           AS stock,
          COALESCE(pv.image_url, pi.image_url, '') AS image,
          c.name AS category,
          c.slug AS category_slug,
          br.id AS brand_id,
          br.name AS brand_name,
          p.seller_id,
          s.user_id AS seller_user_id,
          s.shop_name AS seller_name,
          s.logo_url AS seller_logo_url,
          (SELECT AVG(CAST(r.rating AS FLOAT))
             FROM Reviews r
             WHERE r.product_id = p.id AND r.is_approved = 1) AS rating,
          (SELECT COUNT(*)
             FROM Reviews r
             WHERE r.product_id = p.id AND r.is_approved = 1) AS reviewsCount
        FROM Products p
        OUTER APPLY (
          SELECT TOP 1 id, price, stock_qty, image_url
          FROM ProductVariants
          WHERE product_id = p.id
          ORDER BY id
        ) pv
        LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
        LEFT JOIN Sellers s ON p.seller_id = s.id
        LEFT JOIN ProductCategories pc ON p.id = pc.product_id
        LEFT JOIN Categories c ON pc.category_id = c.id
        LEFT JOIN Brands br ON p.brand_id = br.id
        OUTER APPLY (
          SELECT TOP 1 id, sale_price, original_price, ends_at
          FROM ProductFlashSales
          WHERE product_id = p.id
            AND (variant_id IS NULL OR variant_id = pv.id)
            AND status = 'active'
            AND starts_at <= GETDATE()
            AND ends_at >= GETDATE()
          ORDER BY CASE WHEN variant_id = pv.id THEN 0 ELSE 1 END, ends_at ASC
        ) fs
        WHERE p.id = @id AND ISNULL(p.is_active, 1) = 1
      `);

    const product = result.recordset[0];
    if (!product) {
      throw new Error('Product not found');
    }

    return {
      ...product,
      price:          parseFloat(product.price || 0),
      originalPrice:  product.originalPrice === null ? null : parseFloat(product.originalPrice || 0),
      isFlashSale:    Boolean(product.isFlashSale),
      stock:          parseInt(product.stock || 0),
      rating:         product.rating != null ? parseFloat(product.rating) : 0,
      reviewsCount:   product.reviewsCount != null ? parseInt(product.reviewsCount) : 0,
      seller_id:      product.seller_id || null,
      seller_user_id: product.seller_user_id || null,
    };
  },

  // Create new product (Admin feature)
  create: async (productData) => {
    const productId = `prod_${Math.random().toString(36).substr(2, 9)}`;
    const price = parseFloat(productData.price) || 0.0;
    const stock = parseInt(productData.stock) || 0;
    const rating = 5.0;
    const reviewsCount = 0;
    const description = productData.description || '';
    const category = productData.category || 'Uncategorized';
    const image = productData.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80';

    await pool.request()
      .input('id', sql.VarChar, productId)
      .input('name', sql.NVarChar, productData.name)
      .input('price', sql.Decimal(10, 2), price)
      .input('description', sql.NVarChar, description)
      .input('category', sql.NVarChar, category)
      .input('image', sql.VarChar, image)
      .input('stock', sql.Int, stock)
      .input('rating', sql.Decimal(3, 2), rating)
      .input('reviewsCount', sql.Int, reviewsCount)
      .query(`
        INSERT INTO Products (id, name, price, description, category, image, stock, rating, reviewsCount)
        VALUES (@id, @name, @price, @description, @category, @image, @stock, @rating, @reviewsCount)
      `);

    return {
      id: productId,
      name: productData.name,
      price,
      description,
      category,
      image,
      stock,
      rating,
      reviewsCount
    };
  },

  // Update existing product (Admin feature)
  update: async (productId, updateData) => {
    // 1. Fetch current product details to handle partial updates
    const currentResult = await pool.request()
      .input('id', sql.VarChar, productId)
      .query('SELECT * FROM Products WHERE id = @id');

    const current = currentResult.recordset[0];
    if (!current) {
      throw new Error('Product not found');
    }

    const name = updateData.name !== undefined ? updateData.name : current.name;
    const price = updateData.price !== undefined ? parseFloat(updateData.price) : parseFloat(current.price);
    const description = updateData.description !== undefined ? updateData.description : current.description;
    const category = updateData.category !== undefined ? updateData.category : current.category;
    const image = updateData.image !== undefined ? updateData.image : current.image;
    const stock = updateData.stock !== undefined ? parseInt(updateData.stock) : parseInt(current.stock);

    await pool.request()
      .input('id', sql.VarChar, productId)
      .input('name', sql.NVarChar, name)
      .input('price', sql.Decimal(10, 2), price)
      .input('description', sql.NVarChar, description)
      .input('category', sql.NVarChar, category)
      .input('image', sql.VarChar, image)
      .input('stock', sql.Int, stock)
      .query(`
        UPDATE Products
        SET name = @name,
            price = @price,
            description = @description,
            category = @category,
            image = @image,
            stock = @stock
        WHERE id = @id
      `);

    return {
      id: productId,
      name,
      price,
      description,
      category,
      image,
      stock,
      rating: parseFloat(current.rating),
      reviewsCount: parseInt(current.reviewsCount)
    };
  },

  // Delete product (Admin feature)
  delete: async (productId) => {
    // 1. Fetch product first to return it after deletion
    const result = await pool.request()
      .input('id', sql.VarChar, productId)
      .query('SELECT * FROM Products WHERE id = @id');

    const product = result.recordset[0];
    if (!product) {
      throw new Error('Product not found');
    }

    await pool.request()
      .input('id', sql.VarChar, productId)
      .query('DELETE FROM Products WHERE id = @id');

    return {
      ...product,
      price: parseFloat(product.price),
      rating: parseFloat(product.rating),
      stock: parseInt(product.stock),
      reviewsCount: parseInt(product.reviewsCount)
    };
  },

  // Update stock when an order is placed
  reduceStock: async (productId, quantity) => {
    const result = await pool.request()
      .input('id', sql.VarChar, productId)
      .query('SELECT * FROM Products WHERE id = @id');

    const product = result.recordset[0];
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for product: ${product.name}`);
    }

    const newStock = product.stock - quantity;

    await pool.request()
      .input('id', sql.VarChar, productId)
      .input('stock', sql.Int, newStock)
      .query('UPDATE Products SET stock = @stock WHERE id = @id');

    return {
      ...product,
      price: parseFloat(product.price),
      rating: parseFloat(product.rating),
      stock: newStock,
      reviewsCount: parseInt(product.reviewsCount)
    };
  },

  // Danh sách thương hiệu đang active — dùng cho filter công khai
  getBrandsList: async () => {
    const result = await pool.request().query(`
      SELECT id, name, logo_url
      FROM Brands
      WHERE status = 'active'
      ORDER BY name ASC
    `);
    return result.recordset;
  },

  // Danh sách danh mục đang active — dùng cho filter công khai
  getCategoriesList: async () => {
    const result = await pool.request().query(`
      SELECT id, name, slug, parent_id
      FROM Categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `);
    return result.recordset;
  }
};
