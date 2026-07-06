import { couponService } from '../services/couponService.js';

export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, shopId } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng cung cấp mã giảm giá'
      });
    }

    if (subtotal === undefined || subtotal === null || isNaN(subtotal) || subtotal < 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Giá trị đơn hàng không hợp lệ'
      });
    }

    const result = await couponService.validateCoupon(code, userId, parseFloat(subtotal), shopId || null);

    if (!result.valid) {
      return res.status(400).json({
        status: 'fail',
        message: result.message
      });
    }

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        coupon: {
          id: result.coupon.id,
          code: result.coupon.code,
          description: result.coupon.description,
          discount_type: result.coupon.discount_type,
          discount_value: result.coupon.discount_value
        },
        discountAmount: result.discountAmount
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
