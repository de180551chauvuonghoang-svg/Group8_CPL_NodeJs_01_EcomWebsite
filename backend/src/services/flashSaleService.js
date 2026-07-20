import { sql, pool } from "../config/db.js";

const normalizeDateTime = (value, fieldName) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} khong hop le.`);
  }
  return date;
};

const validateFlashSalePayload = (data) => {
  const salePrice = Number(data.salePrice);
  const originalPrice = Number(data.originalPrice);
  const startsAt = normalizeDateTime(data.startsAt, "startsAt");
  const endsAt = normalizeDateTime(data.endsAt, "endsAt");

  if (!data.productId) throw new Error("productId la bat buoc.");
  if (originalPrice <= 0) throw new Error("originalPrice phai lon hon 0.");
  if (salePrice <= 0) throw new Error("salePrice phai lon hon 0.");
  if (salePrice >= originalPrice) throw new Error("salePrice phai nho hon originalPrice.");
  if (endsAt <= startsAt) throw new Error("endsAt phai lon hon startsAt.");
  if (endsAt <= new Date()) throw new Error("endsAt phai lon hon thoi diem hien tai.");
  if (!["active", "inactive"].includes(data.status || "active")) {
    throw new Error("status chi ho tro active hoac inactive.");
  }

  return {
    productId: data.productId,
    variantId: data.variantId || null,
    originalPrice,
    salePrice,
    startsAt,
    endsAt,
    status: data.status || "active"
  };
};

const assertSellerProduct = async (sellerId, productId, variantId = null) => {
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("productId", sql.VarChar, productId)
    .input("variantId", sql.VarChar, variantId)
    .query(`
      SELECT TOP 1 p.id, pv.id AS variant_id, COALESCE(pv.price, p.base_price) AS current_price
      FROM Products p
      LEFT JOIN ProductVariants pv ON pv.product_id = p.id
      WHERE p.id = @productId
        AND p.seller_id = @sellerId
        AND (@variantId IS NULL OR pv.id = @variantId)
    `);

  if (result.recordset.length === 0) {
    throw new Error("San pham khong thuoc shop cua ban.");
  }

  return result.recordset[0];
};

const assertNoActiveOverlap = async (sellerId, payload, excludeId = null) => {
  if (payload.status !== "active") return;

  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("productId", sql.VarChar, payload.productId)
    .input("variantId", sql.VarChar, payload.variantId)
    .input("startsAt", sql.DateTime2, payload.startsAt)
    .input("endsAt", sql.DateTime2, payload.endsAt)
    .input("excludeId", sql.VarChar, excludeId)
    .query(`
      SELECT TOP 1 id
      FROM ProductFlashSales
      WHERE seller_id = @sellerId
        AND product_id = @productId
        AND (
          @variantId IS NULL
          OR variant_id IS NULL
          OR variant_id = @variantId
        )
        AND status = 'active'
        AND (@excludeId IS NULL OR id <> @excludeId)
        AND starts_at < @endsAt
        AND ends_at > @startsAt
    `);

  if (result.recordset.length > 0) {
    throw new Error("Da co flash sale active trung thoi gian cho san pham/variant nay.");
  }
};

export const flashSaleService = {
  createFlashSale: async (sellerId, data) => {
    const payload = validateFlashSalePayload(data);
    await assertSellerProduct(sellerId, payload.productId, payload.variantId);
    await assertNoActiveOverlap(sellerId, payload);

    const id = `fs_${Math.random().toString(36).substr(2, 9)}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("sellerId", sql.VarChar, sellerId)
      .input("productId", sql.VarChar, payload.productId)
      .input("variantId", sql.VarChar, payload.variantId)
      .input("originalPrice", sql.Decimal(18, 2), payload.originalPrice)
      .input("salePrice", sql.Decimal(18, 2), payload.salePrice)
      .input("startsAt", sql.DateTime2, payload.startsAt)
      .input("endsAt", sql.DateTime2, payload.endsAt)
      .input("status", sql.VarChar, payload.status)
      .query(`
        INSERT INTO ProductFlashSales (
          id, seller_id, product_id, variant_id, original_price, sale_price,
          starts_at, ends_at, status, created_at, updated_at
        )
        VALUES (
          @id, @sellerId, @productId, @variantId, @originalPrice, @salePrice,
          @startsAt, @endsAt, @status, GETDATE(), GETDATE()
        )
      `);

    return { id, ...payload };
  },

  getFlashSales: async (sellerId) => {
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT fs.*, p.name AS product_name, pv.sku AS variant_sku
        FROM ProductFlashSales fs
        JOIN Products p ON p.id = fs.product_id
        LEFT JOIN ProductVariants pv ON pv.id = fs.variant_id
        WHERE fs.seller_id = @sellerId
        ORDER BY fs.created_at DESC
      `);
    return result.recordset;
  },

  updateFlashSale: async (sellerId, flashSaleId, data) => {
    const existing = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("id", sql.VarChar, flashSaleId)
      .query("SELECT * FROM ProductFlashSales WHERE id = @id AND seller_id = @sellerId");

    if (existing.recordset.length === 0) {
      throw new Error("Khong tim thay flash sale thuoc shop cua ban.");
    }

    const current = existing.recordset[0];
    const merged = {
      productId: data.productId || current.product_id,
      variantId: data.variantId === undefined ? current.variant_id : data.variantId,
      originalPrice: data.originalPrice === undefined ? current.original_price : data.originalPrice,
      salePrice: data.salePrice === undefined ? current.sale_price : data.salePrice,
      startsAt: data.startsAt || current.starts_at,
      endsAt: data.endsAt || current.ends_at,
      status: data.status || current.status
    };
    const payload = validateFlashSalePayload(merged);
    await assertSellerProduct(sellerId, payload.productId, payload.variantId);
    await assertNoActiveOverlap(sellerId, payload, flashSaleId);

    await pool.request()
      .input("id", sql.VarChar, flashSaleId)
      .input("sellerId", sql.VarChar, sellerId)
      .input("productId", sql.VarChar, payload.productId)
      .input("variantId", sql.VarChar, payload.variantId)
      .input("originalPrice", sql.Decimal(18, 2), payload.originalPrice)
      .input("salePrice", sql.Decimal(18, 2), payload.salePrice)
      .input("startsAt", sql.DateTime2, payload.startsAt)
      .input("endsAt", sql.DateTime2, payload.endsAt)
      .input("status", sql.VarChar, payload.status)
      .query(`
        UPDATE ProductFlashSales
        SET product_id = @productId,
            variant_id = @variantId,
            original_price = @originalPrice,
            sale_price = @salePrice,
            starts_at = @startsAt,
            ends_at = @endsAt,
            status = @status,
            updated_at = GETDATE()
        WHERE id = @id AND seller_id = @sellerId
      `);

    return true;
  },

  deleteFlashSale: async (sellerId, flashSaleId) => {
    const result = await pool.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("id", sql.VarChar, flashSaleId)
      .query(`
        UPDATE ProductFlashSales
        SET status = 'inactive', updated_at = GETDATE()
        WHERE id = @id AND seller_id = @sellerId
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Khong tim thay flash sale thuoc shop cua ban.");
    }

    return true;
  }
};
