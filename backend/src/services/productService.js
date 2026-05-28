import { sql, pool } from '../config/db.js';

export const productService = {
  // Get all products with optional category filter and search
  getAll: async ({ category, search }) => {
    let query = `
      WITH product_variants AS (
        SELECT 
          p.id, p.name, p.description,
          COALESCE(pv.price, p.base_price) AS price,
          COALESCE(pv.stock_qty, 0) AS stock,
          COALESCE(pv.image_url, pi.image_url, '') AS image,
          ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY pv.id) AS rn
        FROM Products p
        LEFT JOIN ProductVariants pv ON p.id = pv.product_id
        LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
        LEFT JOIN ProductCategories pc ON p.id = pc.product_id
        LEFT JOIN Categories c ON pc.category_id = c.id
        WHERE 1=1
    `;
    const request = pool.request();

    if (category) {
      query += ' AND LOWER(c.slug) = LOWER(@category)';
      request.input('category', sql.NVarChar, category);
    }

    if (search) {
      query += ' AND (LOWER(p.name) LIKE LOWER(@search) OR LOWER(p.description) LIKE LOWER(@search))';
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += `
      )
      SELECT id, name, description, price, stock, image
      FROM product_variants
      WHERE rn = 1
    `;

    const result = await request.query(query);
    
    // Ensure correct types for numeric values from decimal SQL columns
    return result.recordset.map(product => ({
      ...product,
      price: parseFloat(product.price || 0),
      stock: parseInt(product.stock || 0)
    }));
  },

  // Get product by ID
  getById: async (productId) => {
    const result = await pool.request()
      .input('id', sql.VarChar, productId)
      .query(`
        SELECT 
          p.id, p.name, p.description,
          COALESCE(pv.price, p.base_price) AS price,
          COALESCE(pv.stock_qty, 0) AS stock,
          COALESCE(pv.image_url, pi.image_url, '') AS image
        FROM Products p
        LEFT JOIN ProductVariants pv ON p.id = pv.product_id
        LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
        WHERE p.id = @id
      `);

    const product = result.recordset[0];
    if (!product) {
      throw new Error('Product not found');
    }

    return {
      ...product,
      price: parseFloat(product.price || 0),
      stock: parseInt(product.stock || 0)
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
  }
};
