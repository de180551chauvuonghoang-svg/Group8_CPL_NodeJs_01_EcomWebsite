import { sql, pool } from '../config/db.js';

export const productService = {
  // Get all products with optional category filter, search, and shopId
  getAll: async ({ category, search, shopId }) => {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.short_desc,
        p.shop_id,
        COALESCE(MIN(pv.price), p.base_price) AS price,
        COALESCE(SUM(pv.stock_qty), 0) AS stock,
        COALESCE(MIN(pi.image_url), 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80') AS image,
        COALESCE(MIN(c.name), 'Uncategorized') AS category,
        COALESCE(AVG(CAST(r.rating AS DECIMAL(3,2))), 5.0) AS rating,
        COUNT(DISTINCT r.id) AS reviewsCount
      FROM Products p
      LEFT JOIN ProductVariants pv ON p.id = pv.product_id AND pv.is_active = 1
      LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
      LEFT JOIN ProductCategories pc ON p.id = pc.product_id
      LEFT JOIN Categories c ON pc.category_id = c.id
      LEFT JOIN Reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE p.is_active = 1
    `;
    const request = pool.request();

    if (category) {
      query += ' AND (LOWER(c.name) = LOWER(@category) OR LOWER(c.slug) = LOWER(@category))';
      request.input('category', sql.NVarChar, category);
    }

    if (search) {
      query += ' AND (LOWER(p.name) LIKE LOWER(@search) OR LOWER(p.description) LIKE LOWER(@search))';
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    if (shopId) {
      query += ' AND p.shop_id = @shopId';
      request.input('shopId', sql.VarChar, shopId);
    }

    query += ' GROUP BY p.id, p.name, p.slug, p.description, p.short_desc, p.base_price, p.shop_id';

    const result = await request.query(query);
    
    // Ensure correct types for numeric values from decimal SQL columns
    return result.recordset.map(product => ({
      ...product,
      price: parseFloat(product.price),
      rating: parseFloat(product.rating),
      stock: parseInt(product.stock),
      reviewsCount: parseInt(product.reviewsCount)
    }));
  },

  // Get product by ID
  getById: async (productId) => {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.short_desc,
        p.shop_id,
        COALESCE(MIN(pv.price), p.base_price) AS price,
        COALESCE(SUM(pv.stock_qty), 0) AS stock,
        COALESCE(MIN(pi.image_url), 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80') AS image,
        COALESCE(MIN(c.name), 'Uncategorized') AS category,
        COALESCE(AVG(CAST(r.rating AS DECIMAL(3,2))), 5.0) AS rating,
        COUNT(DISTINCT r.id) AS reviewsCount
      FROM Products p
      LEFT JOIN ProductVariants pv ON p.id = pv.product_id AND pv.is_active = 1
      LEFT JOIN ProductImages pi ON p.id = pi.product_id AND pi.is_primary = 1
      LEFT JOIN ProductCategories pc ON p.id = pc.product_id
      LEFT JOIN Categories c ON pc.category_id = c.id
      LEFT JOIN Reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE p.id = @id
      GROUP BY p.id, p.name, p.slug, p.description, p.short_desc, p.base_price, p.shop_id
    `;
    const result = await pool.request()
      .input('id', sql.VarChar, productId)
      .query(query);

    const product = result.recordset[0];
    if (!product) {
      throw new Error('Product not found');
    }

    return {
      ...product,
      price: parseFloat(product.price),
      rating: parseFloat(product.rating),
      stock: parseInt(product.stock),
      reviewsCount: parseInt(product.reviewsCount)
    };
  },

  // Create new product (Admin/Seller feature)
  create: async (productData) => {
    const productId = `prod_${Math.random().toString(36).substr(2, 9)}`;
    const price = parseFloat(productData.price) || 0.0;
    const stock = parseInt(productData.stock) || 0;
    const description = productData.description || '';
    const categoryNameOrId = productData.category || 'cat_accessories';
    const image = productData.image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80';
    const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 4);
    const shopId = productData.shopId || null;

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const req = () => transaction.request();

      // 1. Insert Products
      await req()
        .input('id', sql.VarChar, productId)
        .input('name', sql.NVarChar, productData.name)
        .input('slug', sql.VarChar, slug)
        .input('description', sql.NVarChar, description)
        .input('basePrice', sql.Decimal(18, 2), price)
        .input('shopId', sql.VarChar, shopId)
        .query(`
          INSERT INTO Products (id, name, slug, description, base_price, is_active, is_featured, shop_id)
          VALUES (@id, @name, @slug, @description, @basePrice, 1, 1, @shopId)
        `);

      // 2. Resolve Category ID (check if category is id or name)
      let categoryId = categoryNameOrId;
      const catCheck = await req()
        .input('catNameOrId', sql.NVarChar, categoryNameOrId)
        .query(`SELECT id FROM Categories WHERE id = @catNameOrId OR LOWER(name) = LOWER(@catNameOrId)`);
      if (catCheck.recordset.length > 0) {
        categoryId = catCheck.recordset[0].id;
      } else {
        categoryId = 'cat_accessories';
      }

      // Link to Category
      await req()
        .input('productId', sql.VarChar, productId)
        .input('categoryId', sql.VarChar, categoryId)
        .query(`INSERT INTO ProductCategories (product_id, category_id) VALUES (@productId, @categoryId)`);

      // 3. Primary image
      await req()
        .input('imgId', sql.VarChar, `img_${productId}_primary`)
        .input('productId', sql.VarChar, productId)
        .input('imageUrl', sql.VarChar, image)
        .input('altText', sql.NVarChar, productData.name)
        .query(`
          INSERT INTO ProductImages (id, product_id, image_url, alt_text, sort_order, is_primary)
          VALUES (@imgId, @productId, @imageUrl, @altText, 0, 1)
        `);

      // 4. Default Product Variant
      await req()
        .input('varId', sql.VarChar, `var_${productId}_default`)
        .input('productId', sql.VarChar, productId)
        .input('sku', sql.VarChar, `SKU-${productId.toUpperCase()}`)
        .input('price', sql.Decimal(18, 2), price)
        .input('stock', sql.Int, stock)
        .query(`
          INSERT INTO ProductVariants (id, product_id, sku, price, stock_qty, is_active)
          VALUES (@varId, @productId, @sku, @price, @stock, 1)
        `);

      await transaction.commit();

      return {
        id: productId,
        name: productData.name,
        price,
        description,
        category: categoryNameOrId,
        image,
        stock,
        rating: 5.0,
        reviewsCount: 0,
        shop_id: shopId
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // Update existing product
  update: async (productId, updateData) => {
    const currentProduct = await productService.getById(productId);

    // Optional ownership check (if shopId is passed in updateData, it must match current product's shop_id)
    if (updateData.shopId !== undefined && currentProduct.shop_id !== updateData.shopId) {
      throw new Error('You do not own this product');
    }

    const name = updateData.name !== undefined ? updateData.name : currentProduct.name;
    const price = updateData.price !== undefined ? parseFloat(updateData.price) : currentProduct.price;
    const description = updateData.description !== undefined ? updateData.description : currentProduct.description;
    const categoryNameOrId = updateData.category !== undefined ? updateData.category : currentProduct.category;
    const image = updateData.image !== undefined ? updateData.image : currentProduct.image;
    const stock = updateData.stock !== undefined ? parseInt(updateData.stock) : currentProduct.stock;

    const transaction = new sql.Transaction(pool);
    try {
      await transaction.begin();
      const req = () => transaction.request();

      // 1. Update Products
      await req()
        .input('id', sql.VarChar, productId)
        .input('name', sql.NVarChar, name)
        .input('description', sql.NVarChar, description)
        .input('basePrice', sql.Decimal(18, 2), price)
        .query(`
          UPDATE Products
          SET name = @name,
              description = @description,
              base_price = @basePrice
          WHERE id = @id
        `);

      // 2. Update Category if changed
      if (updateData.category !== undefined) {
        let categoryId = categoryNameOrId;
        const catCheck = await req()
          .input('catNameOrId', sql.NVarChar, categoryNameOrId)
          .query(`SELECT id FROM Categories WHERE id = @catNameOrId OR LOWER(name) = LOWER(@catNameOrId)`);
        if (catCheck.recordset.length > 0) {
          categoryId = catCheck.recordset[0].id;
        }

        await req()
          .input('productId', sql.VarChar, productId)
          .query(`DELETE FROM ProductCategories WHERE product_id = @productId`);

        await req()
          .input('productId', sql.VarChar, productId)
          .input('categoryId', sql.VarChar, categoryId)
          .query(`INSERT INTO ProductCategories (product_id, category_id) VALUES (@productId, @categoryId)`);
      }

      // 3. Update Image
      if (updateData.image !== undefined) {
        const imgCheck = await req()
          .input('productId', sql.VarChar, productId)
          .query(`SELECT id FROM ProductImages WHERE product_id = @productId AND is_primary = 1`);
        
        if (imgCheck.recordset.length > 0) {
          await req()
            .input('id', sql.VarChar, imgCheck.recordset[0].id)
            .input('imageUrl', sql.VarChar, image)
            .query(`UPDATE ProductImages SET image_url = @imageUrl WHERE id = @id`);
        } else {
          await req()
            .input('imgId', sql.VarChar, `img_${productId}_primary`)
            .input('productId', sql.VarChar, productId)
            .input('imageUrl', sql.VarChar, image)
            .input('altText', sql.NVarChar, name)
            .query(`
              INSERT INTO ProductImages (id, product_id, image_url, alt_text, sort_order, is_primary)
              VALUES (@imgId, @productId, @imageUrl, @altText, 0, 1)
            `);
        }
      }

      // 4. Update Variant
      const varCheck = await req()
        .input('productId', sql.VarChar, productId)
        .query(`SELECT id FROM ProductVariants WHERE product_id = @productId`);

      if (varCheck.recordset.length > 0) {
        await req()
          .input('productId', sql.VarChar, productId)
          .input('price', sql.Decimal(18, 2), price)
          .input('stock', sql.Int, stock)
          .query(`UPDATE ProductVariants SET price = @price, stock_qty = @stock WHERE product_id = @productId`);
      } else {
        await req()
          .input('varId', sql.VarChar, `var_${productId}_default`)
          .input('productId', sql.VarChar, productId)
          .input('sku', sql.VarChar, `SKU-${productId.toUpperCase()}`)
          .input('price', sql.Decimal(18, 2), price)
          .input('stock', sql.Int, stock)
          .query(`
            INSERT INTO ProductVariants (id, product_id, sku, price, stock_qty, is_active)
            VALUES (@varId, @productId, @sku, @price, @stock, 1)
          `);
      }

      await transaction.commit();

      return {
        id: productId,
        name,
        price,
        description,
        category: categoryNameOrId,
        image,
        stock,
        rating: currentProduct.rating,
        reviewsCount: currentProduct.reviewsCount,
        shop_id: currentProduct.shop_id
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // Delete product
  delete: async (productId, shopId) => {
    const product = await productService.getById(productId);

    if (shopId !== undefined && product.shop_id !== shopId) {
      throw new Error('You do not own this product');
    }

    await pool.request()
      .input('id', sql.VarChar, productId)
      .query('DELETE FROM Products WHERE id = @id');

    return product;
  },

  // Update stock when an order is placed
  reduceStock: async (productId, quantity) => {
    const variantsResult = await pool.request()
      .input('productId', sql.VarChar, productId)
      .query('SELECT * FROM ProductVariants WHERE product_id = @productId AND is_active = 1');

    const variants = variantsResult.recordset;
    if (variants.length === 0) {
      throw new Error(`Product variants for ${productId} not found`);
    }

    const totalStock = variants.reduce((sum, v) => sum + v.stock_qty, 0);
    if (totalStock < quantity) {
      throw new Error(`Insufficient stock for product: ${productId}`);
    }

    let remainingToReduce = quantity;
    for (const variant of variants) {
      if (remainingToReduce <= 0) break;
      const reduceAmt = Math.min(variant.stock_qty, remainingToReduce);
      if (reduceAmt > 0) {
        await pool.request()
          .input('id', sql.VarChar, variant.id)
          .input('newStock', sql.Int, variant.stock_qty - reduceAmt)
          .query('UPDATE ProductVariants SET stock_qty = @newStock WHERE id = @id');
        remainingToReduce -= reduceAmt;
      }
    }

    return await productService.getById(productId);
  }
};
