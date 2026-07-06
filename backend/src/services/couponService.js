import { pool, sql } from '../config/db.js';

export const couponService = {
  /**
   * Validate a coupon and calculate discount amount
   * @param {string} code - Coupon code to validate
   * @param {string} userId - User trying to use the coupon
   * @param {number} subtotal - Total value of items before shipping
   * @returns {Promise<Object>} - Validation result { valid, discountAmount, coupon, message }
   */
  validateCoupon: async (code, userId, subtotal, shopId = null) => {
    if (!code) {
      return { valid: false, message: 'Mã giảm giá không được để trống' };
    }

    // 1. Fetch coupon details
    const result = await pool.request()
      .input('code', sql.VarChar, code)
      .query(`
        SELECT * FROM Coupons 
        WHERE code = @code AND is_active = 1
      `);

    const coupon = result.recordset[0];
    if (!coupon) {
      return { valid: false, message: 'Mã giảm giá không tồn tại hoặc đã bị khóa' };
    }

    // Shop-scoped coupon: must match the shop of the order
    if (coupon.shop_id && shopId && coupon.shop_id !== shopId) {
      return {
        valid: false,
        message: `Mã "${code}" chỉ áp dụng cho cửa hàng khác. Vui lòng kiểm tra shop của sản phẩm.`
      };
    }
    if (coupon.shop_id && !shopId) {
      return {
        valid: false,
        message: 'Vui lòng chọn sản phẩm từ cửa hàng phù hợp để áp dụng mã giảm giá này'
      };
    }

    const now = new Date();

    // 2. Check active time
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return { valid: false, message: 'Mã giảm giá chưa đến thời gian áp dụng' };
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return { valid: false, message: 'Mã giảm giá đã hết hạn sử dụng' };
    }

    // 3. Check overall usage limit
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return { valid: false, message: 'Mã giảm giá đã đạt giới hạn số lần sử dụng tối đa' };
    }

    // 4. Check user specific usage limit
    const userLimit = coupon.user_limit ?? 1;
    const usageCheck = await pool.request()
      .input('couponId', sql.VarChar, coupon.id)
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT COUNT(*) AS user_used_cnt 
        FROM CouponUsage 
        WHERE coupon_id = @couponId AND user_id = @userId
      `);
    
    const userUsedCount = usageCheck.recordset[0]?.user_used_cnt || 0;
    if (userUsedCount >= userLimit) {
      return { valid: false, message: `Bạn đã sử dụng mã giảm giá này (Giới hạn: ${userLimit} lần/khách hàng)` };
    }

    // 5. Check minimum order amount
    const minOrderAmt = parseFloat(coupon.min_order_amount || 0);
    if (subtotal < minOrderAmt) {
      return { 
        valid: false, 
        message: `Mã giảm giá chỉ áp dụng cho đơn hàng có giá trị tối thiểu từ ${minOrderAmt.toLocaleString('vi-VN')} đ (Hiện tại: ${subtotal.toLocaleString('vi-VN')} đ)` 
      };
    }

    // 6. Calculate discount amount
    let discountAmount = 0;
    const discountVal = parseFloat(coupon.discount_value);

    if (coupon.discount_type === 'percentage') {
      discountAmount = subtotal * (discountVal / 100);
      const maxDiscount = coupon.max_discount_amt ? parseFloat(coupon.max_discount_amt) : null;
      if (maxDiscount !== null && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = discountVal;
    }

    // Discount cannot exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return {
      valid: true,
      coupon,
      discountAmount: Math.round(discountAmount),
      message: 'Mã giảm giá hợp lệ'
    };
  }
};
