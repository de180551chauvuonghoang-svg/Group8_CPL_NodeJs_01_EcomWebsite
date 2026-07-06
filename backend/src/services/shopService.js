import { sql, pool } from '../config/db.js';

export const shopService = {
  /**
   * Get shop by the owner's user ID.
   */
  getByUserId: async (userId) => {
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query('SELECT * FROM Shops WHERE user_id = @userId');
    return result.recordset[0] || null;
  },

  /**
   * Get shop by shop ID.
   */
  getById: async (shopId) => {
    const result = await pool.request()
      .input('id', sql.VarChar, shopId)
      .query('SELECT * FROM Shops WHERE id = @id');
    return result.recordset[0] || null;
  },

  /**
   * Update shop profile fields dynamically.
   * Only provided fields are updated; others remain unchanged.
   */
  update: async (shopId, updateData) => {
    const fields = [];
    const request = pool.request().input('id', sql.VarChar, shopId);

    if (updateData.shop_name !== undefined) {
      fields.push('shop_name = @shopName');
      request.input('shopName', sql.NVarChar, updateData.shop_name);
    }
    if (updateData.phone_number !== undefined) {
      fields.push('phone_number = @phone');
      request.input('phone', sql.VarChar, updateData.phone_number);
    }
    if (updateData.warehouse_address !== undefined) {
      fields.push('warehouse_address = @address');
      request.input('address', sql.NVarChar, updateData.warehouse_address);
    }
    if (updateData.latitude !== undefined) {
      fields.push('latitude = @lat');
      request.input('lat', sql.Decimal(9, 6), updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      fields.push('longitude = @lng');
      request.input('lng', sql.Decimal(9, 6), updateData.longitude);
    }
    if (updateData.shipping_fee_per_km !== undefined) {
      fields.push('shipping_fee_per_km = @feePerKm');
      request.input('feePerKm', sql.Decimal(18, 2), updateData.shipping_fee_per_km);
    }
    if (updateData.max_delivery_distance !== undefined) {
      fields.push('max_delivery_distance = @maxDist');
      request.input('maxDist', sql.Int, updateData.max_delivery_distance);
    }
    if (updateData.description !== undefined) {
      fields.push('description = @desc');
      request.input('desc', sql.NVarChar, updateData.description);
    }
    if (updateData.logo_url !== undefined) {
      fields.push('logo_url = @logoUrl');
      request.input('logoUrl', sql.VarChar, updateData.logo_url);
    }
    if (updateData.cover_url !== undefined) {
      fields.push('cover_url = @coverUrl');
      request.input('coverUrl', sql.VarChar, updateData.cover_url);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = GETDATE()');
    const query = `UPDATE Shops SET ${fields.join(', ')} WHERE id = @id`;
    await request.query(query);

    return await shopService.getById(shopId);
  }
};
