import { pool, sql } from "../config/db.js";
import { createTrustedOrder, sendCheckoutError } from "../services/checkoutService.js";
import { getCustomerOrderTimeline as loadCustomerOrderTimeline } from "../services/orderTimelineService.js";

const parseShippingAddress = (shippingAddress) => {
  if (typeof shippingAddress !== "string") return null;

  const [contactLine = "", ...addressLines] = shippingAddress.split("\n");
  const [name = "", phone = ""] = contactLine.split("|").map((value) => value.trim());
  const address = addressLines.join("\n").trim();

  return { name, phone, address };
};

export const createOrder = async (req, res) => {
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;

  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      couponCode,
      couponCodes,
      totalAmount
    } = req.body;

    if (!["cod", "qr"].includes(paymentMethod)) {
      return res.status(400).json({
        status: "fail",
        code: "INVALID_PAYMENT_METHOD",
        message: "Phương thức thanh toán không hợp lệ."
      });
    }

    await transaction.begin();
    transactionStarted = true;

    const result = await createTrustedOrder(transaction, {
      userId: req.user.id,
      cartItems: items,
      shippingInfo: parseShippingAddress(shippingAddress),
      couponCode,
      couponCodes,
      paymentMethod,
      orderStatus: "pending",
      paymentStatus: paymentMethod === "cod" ? "pending_cod" : "pending_payment",
      clientTotal: totalAmount
    });

    await transaction.commit();
    transactionStarted = false;

    if (paymentMethod === "qr") {
      const bankId = "mbbank";
      const accountNo = "123456789";
      const accountName = "NGUYEN VAN A";
      const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${result.pricing.total}&addInfo=${result.orderId}&accountName=${accountName}`;

      return res.status(201).json({
        status: "success",
        success: true,
        message: "Tạo đơn hàng QR thành công.",
        orderId: result.orderId,
        qrUrl,
        pricing: result.pricing,
        items: result.items
      });
    }

    return res.status(201).json({
      status: "success",
      success: true,
      message: "Đặt hàng thành công.",
      orderId: result.orderId,
      pricing: result.pricing,
      items: result.items
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (_) {
        // Preserve the original checkout error.
      }
    }

    if (sendCheckoutError(res, error)) return;

    console.error("Lỗi tạo đơn hàng:", error);
    return res.status(400).json({
      status: "fail",
      success: false,
      message: error.message || "Lỗi server khi đặt hàng."
    });
  }
};

export const getCustomerOrderTimeline = async (req, res, next) => {
  try {
    const timeline = await loadCustomerOrderTimeline(req.user.id, req.params.orderId);
    return res.status(200).json({ status: "success", data: timeline });
  } catch (error) {
    if (error.code) {
      return res.status(error.statusCode || 400).json({
        status: "fail",
        code: error.code,
        message: error.message
      });
    }
    next(error);
  }
};
