import { v4 as uuidv4 } from "uuid";
import { sql } from "../config/db.js";
import { INVENTORY_TYPES, recordInventoryLog } from "./inventoryService.js";
import { createNotification } from "./notificationService.js";

const SHIPPING_FEE = 0;
const VAT_RATE = 0.1;

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const checkoutError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

const priceChangedError = () => checkoutError(
  "PRICE_CHANGED",
  "Giá sản phẩm đã thay đổi. Vui lòng kiểm tra lại đơn hàng.",
  409
);

const ownShopPurchaseError = () => checkoutError(
  "OWN_SHOP_PURCHASE_NOT_ALLOWED",
  "Bạn không thể mua sản phẩm của cửa hàng mình.",
  403
);

const getProductId = (item) => item?.productId || item?.product?.id;
const getVariantId = (item) => item?.variantId || item?.product?.variantId || null;

const resolveCartItems = async (db, cartItems, userId) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw checkoutError("INVALID_CART", "Giỏ hàng không có sản phẩm hợp lệ.");
  }

  const pricedItems = [];
  for (const item of cartItems) {
    const productId = getProductId(item);
    const requestedVariantId = getVariantId(item);
    const quantity = item?.quantity;

    if (typeof productId !== "string" || !productId.trim()) {
      throw checkoutError("INVALID_CART", "Mã sản phẩm không hợp lệ.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw checkoutError("INVALID_QUANTITY", "Số lượng sản phẩm không hợp lệ.");
    }
    if (requestedVariantId !== null && typeof requestedVariantId !== "string") {
      throw checkoutError("INVALID_VARIANT", "Mã phiên bản sản phẩm không hợp lệ.");
    }

    const result = await db.request()
      .input("productId", sql.VarChar, productId.trim())
      .query(`
        SELECT TOP 1
          p.id AS product_id,
          p.name AS product_name,
          p.seller_id,
          s.user_id AS seller_user_id,
          pv.id AS variant_id,
          pv.sku,
          pv.stock_qty,
          COALESCE(pv.price, p.base_price) AS regular_price,
          fs.sale_price
        FROM Products p WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN Sellers s
          ON s.id = p.seller_id
        INNER JOIN ProductVariants pv WITH (UPDLOCK, HOLDLOCK)
          ON pv.product_id = p.id AND pv.is_default = 1 AND pv.is_active = 1
        OUTER APPLY (
          SELECT TOP 1 sale_price
          FROM ProductFlashSales WITH (UPDLOCK, HOLDLOCK)
          WHERE product_id = p.id
            AND (variant_id IS NULL OR variant_id = pv.id)
            AND status = 'active'
            AND starts_at <= GETDATE()
            AND ends_at >= GETDATE()
          ORDER BY CASE WHEN variant_id = pv.id THEN 0 ELSE 1 END, ends_at ASC
        ) fs
        WHERE p.id = @productId
          AND ISNULL(p.is_active, 1) = 1
        ORDER BY pv.id
      `);

    const product = result.recordset[0];
    if (!product) {
      throw checkoutError("PRODUCT_UNAVAILABLE", "Sản phẩm hoặc phiên bản không còn khả dụng.");
    }
    if (product.seller_user_id === userId) {
      throw ownShopPurchaseError();
    }
    if (Number(product.stock_qty) < quantity) {
      throw checkoutError("INSUFFICIENT_STOCK", `Sản phẩm ${product.product_name} không đủ tồn kho.`);
    }

    const unitPrice = roundMoney(product.sale_price ?? product.regular_price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw checkoutError("INVALID_PRODUCT_PRICE", "Giá sản phẩm trong hệ thống không hợp lệ.");
    }

    const clientPrice = item?.product?.price;
    if (!Number.isFinite(clientPrice) || roundMoney(clientPrice) !== unitPrice) {
      throw priceChangedError();
    }

    pricedItems.push({
      productId: product.product_id,
      productName: String(product.product_name || "Sản phẩm"),
      sellerId: product.seller_id,
      sellerUserId: product.seller_user_id,
      variantId: product.variant_id,
      variantInfo: product.sku || null,
      quantity,
      unitPrice,
      totalPrice: roundMoney(unitPrice * quantity)
    });
  }

  return pricedItems;
};

const calculateDiscount = (coupon, subtotal) => {
  const value = Number(coupon.discount_value || 0);
  if (coupon.discount_type === "fixed") {
    return Math.min(roundMoney(value), subtotal);
  }

  const percentageDiscount = Math.round(subtotal * (value / 100));
  return coupon.max_discount_amt
    ? Math.min(percentageDiscount, Number(coupon.max_discount_amt))
    : percentageDiscount;
};

const getCouponEligibleSubtotal = (coupon, pricedItems) => roundMoney(
  pricedItems.reduce((sum, item) => {
    if (coupon.seller_id && item.sellerId !== coupon.seller_id) return sum;
    return sum + item.totalPrice;
  }, 0)
);

const findApplicableCoupon = async (db, {
  couponCode,
  pricedItems,
  userId,
  expectedSellerId = null
}) => {
  if (!couponCode) return null;

  const result = await db.request()
    .input("code", sql.VarChar, String(couponCode).trim().toUpperCase())
    .input("userId", sql.VarChar, userId)
    .query(`
      SELECT TOP 1 c.*
      FROM Coupons c WITH (UPDLOCK, HOLDLOCK)
      WHERE c.code = @code
        AND c.is_active = 1
        AND c.deleted_at IS NULL
        AND (c.starts_at IS NULL OR c.starts_at <= GETDATE())
        AND (c.expires_at IS NULL OR c.expires_at >= GETDATE())
        AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit)
        AND (
          c.user_limit IS NULL
          OR (SELECT COUNT(*) FROM CouponUsage cu WHERE cu.coupon_id = c.id AND cu.user_id = @userId) < c.user_limit
        )
    `);

  const coupon = result.recordset[0];
  if (!coupon) {
    throw checkoutError("COUPON_INVALID", "Mã voucher không hợp lệ hoặc đã hết hạn.");
  }
  if (coupon.seller_id && !pricedItems.some((item) => item.sellerId === coupon.seller_id)) {
    throw checkoutError("COUPON_INVALID", "Voucher không áp dụng cho sản phẩm trong giỏ hàng.");
  }
  if (expectedSellerId && coupon.seller_id !== expectedSellerId) {
    throw checkoutError(
      "COUPON_SELLER_MISMATCH",
      "Voucher không thuộc shop đã chọn."
    );
  }

  const eligibleSubtotal = getCouponEligibleSubtotal(coupon, pricedItems);
  if (coupon.min_order_amount && eligibleSubtotal < Number(coupon.min_order_amount)) {
    throw checkoutError(
      "COUPON_MIN_ORDER_NOT_MET",
      "Giá trị sản phẩm của shop phát hành chưa đạt mức tối thiểu của voucher."
    );
  }

  return { ...coupon, eligible_subtotal: eligibleSubtotal };
};

const normalizeCouponRequests = ({ couponCode, couponCodes }) => {
  const rawRequests = Array.isArray(couponCodes)
    ? couponCodes
    : couponCode ? [{ code: couponCode }] : [];
  if (rawRequests.length > 50) {
    throw checkoutError("TOO_MANY_COUPONS", "Số lượng voucher vượt quá số shop trong giỏ hàng.");
  }

  return rawRequests.map((entry) => {
    const code = typeof entry === "string" ? entry : entry?.code;
    const sellerId = typeof entry === "object" ? entry?.sellerId || null : null;
    if (typeof code !== "string" || !code.trim()) {
      throw checkoutError("COUPON_INVALID", "Mã voucher không hợp lệ.");
    }
    return { code: code.trim().toUpperCase(), sellerId };
  });
};

const resolveApplicableCoupons = async (db, {
  couponCode,
  couponCodes,
  pricedItems,
  userId
}) => {
  const requests = normalizeCouponRequests({ couponCode, couponCodes });
  const applied = [];
  const sellerKeys = new Set();
  const couponIds = new Set();

  for (const request of requests) {
    const coupon = await findApplicableCoupon(db, {
      couponCode: request.code,
      pricedItems,
      userId,
      expectedSellerId: request.sellerId
    });
    if (couponIds.has(coupon.id)) {
      throw checkoutError("DUPLICATE_COUPON", "Voucher bị gửi trùng trong đơn hàng.");
    }
    const sellerKey = coupon.seller_id || "__platform__";
    if (sellerKeys.has(sellerKey)) {
      throw checkoutError(
        "ONE_COUPON_PER_SHOP",
        "Mỗi shop chỉ được áp dụng một voucher trong một đơn hàng."
      );
    }
    if (!coupon.seller_id && requests.length > 1) {
      throw checkoutError(
        "PLATFORM_COUPON_CANNOT_STACK",
        "Voucher toàn sàn chưa hỗ trợ dùng chung với voucher shop."
      );
    }

    const eligibleSubtotal = Number(coupon.eligible_subtotal || 0);
    applied.push({
      coupon,
      sellerId: coupon.seller_id || null,
      eligibleSubtotal,
      discountAmount: calculateDiscount(coupon, eligibleSubtotal)
    });
    couponIds.add(coupon.id);
    sellerKeys.add(sellerKey);
  }
  return applied;
};

const recordCouponUsage = async (db, { coupon, orderId, userId }) => {
  if (!coupon) return;

  const updateResult = await db.request()
    .input("couponId", sql.VarChar, coupon.id)
    .query(`
      UPDATE Coupons
      SET used_count = used_count + 1
      WHERE id = @couponId
        AND is_active = 1
        AND deleted_at IS NULL
        AND (starts_at IS NULL OR starts_at <= GETDATE())
        AND (expires_at IS NULL OR expires_at >= GETDATE())
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `);

  if (updateResult.rowsAffected[0] !== 1) {
    throw checkoutError("COUPON_INVALID", "Voucher đã hết lượt sử dụng.");
  }

  await db.request()
    .input("id", sql.VarChar, uuidv4())
    .input("couponId", sql.VarChar, coupon.id)
    .input("orderId", sql.VarChar, orderId)
    .input("userId", sql.VarChar, userId)
    .query(`
      INSERT INTO CouponUsage (id, coupon_id, order_id, user_id, used_at)
      VALUES (@id, @couponId, @orderId, @userId, GETDATE())
    `);
};

const recordOrderCoupon = async (db, { appliedCoupon, orderId }) => {
  if (!appliedCoupon?.sellerId) return;
  await db.request()
    .input("id", sql.VarChar, uuidv4())
    .input("orderId", sql.VarChar, orderId)
    .input("couponId", sql.VarChar, appliedCoupon.coupon.id)
    .input("sellerId", sql.VarChar, appliedCoupon.sellerId)
    .input("eligibleSubtotal", sql.Decimal(18, 2), appliedCoupon.eligibleSubtotal)
    .input("discountAmount", sql.Decimal(18, 2), appliedCoupon.discountAmount)
    .query(`
      INSERT INTO OrderCoupons (
        id, order_id, coupon_id, seller_id,
        eligible_subtotal, discount_amount, created_at
      ) VALUES (
        @id, @orderId, @couponId, @sellerId,
        @eligibleSubtotal, @discountAmount, GETDATE()
      )
    `);
};

const releaseCouponUsage = async (db, orderId, couponId) => {
  const deleted = await db.request()
    .input("orderId", sql.VarChar, orderId)
    .input("couponId", sql.VarChar, couponId)
    .query(`
      DELETE FROM CouponUsage
      WHERE order_id = @orderId AND coupon_id = @couponId
    `);
  const releasedCount = Number(deleted.rowsAffected[0] || 0);
  if (releasedCount > 0) {
    await db.request()
      .input("couponId", sql.VarChar, couponId)
      .input("releasedCount", sql.Int, releasedCount)
      .query(`
        UPDATE Coupons
        SET used_count = CASE
          WHEN used_count >= @releasedCount THEN used_count - @releasedCount
          ELSE 0
        END
        WHERE id = @couponId
      `);
  }
};

export const recalculateOrderAfterCancellation = async (db, orderId) => {
  const orderCoupons = await db.request()
    .input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT order_coupon.id AS order_coupon_id, coupon.*,
             COALESCE(active_items.eligible_subtotal, 0) AS eligible_subtotal
      FROM OrderCoupons order_coupon WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN Coupons coupon ON coupon.id = order_coupon.coupon_id
      OUTER APPLY (
        SELECT SUM(item.total_price) AS eligible_subtotal
        FROM OrderItems item
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        WHERE item.order_id = order_coupon.order_id
          AND product.seller_id = order_coupon.seller_id
          AND item.fulfillment_status <> 'cancelled'
      ) active_items
      WHERE order_coupon.order_id = @orderId
    `);

  for (const coupon of orderCoupons.recordset) {
    const eligibleSubtotal = Number(coupon.eligible_subtotal || 0);
    const remainsApplicable = eligibleSubtotal > 0
      && (!coupon.min_order_amount || eligibleSubtotal >= Number(coupon.min_order_amount));
    if (!remainsApplicable) {
      await releaseCouponUsage(db, orderId, coupon.id);
      await db.request()
        .input("orderCouponId", sql.VarChar, coupon.order_coupon_id)
        .query("DELETE FROM OrderCoupons WHERE id = @orderCouponId");
      continue;
    }
    const discountAmount = calculateDiscount(coupon, eligibleSubtotal);
    await db.request()
      .input("orderCouponId", sql.VarChar, coupon.order_coupon_id)
      .input("eligibleSubtotal", sql.Decimal(18, 2), eligibleSubtotal)
      .input("discountAmount", sql.Decimal(18, 2), discountAmount)
      .query(`
        UPDATE OrderCoupons
        SET eligible_subtotal = @eligibleSubtotal,
            discount_amount = @discountAmount
        WHERE id = @orderCouponId
      `);
  }

  const totalsResult = await db.request()
    .input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT orders.coupon_id, coupon.seller_id AS legacy_seller_id,
             coupon.discount_type, coupon.discount_value,
             coupon.min_order_amount, coupon.max_discount_amt,
             COALESCE(active_items.subtotal, 0) AS subtotal
      FROM Orders orders WITH (UPDLOCK, HOLDLOCK)
      LEFT JOIN Coupons coupon ON coupon.id = orders.coupon_id
      OUTER APPLY (
        SELECT SUM(total_price) AS subtotal
        FROM OrderItems
        WHERE order_id = orders.id AND fulfillment_status <> 'cancelled'
      ) active_items
      WHERE orders.id = @orderId
    `);
  const order = totalsResult.recordset[0];
  if (!order) throw checkoutError("ORDER_NOT_FOUND", "Khong tim thay don hang.", 404);
  const subtotal = roundMoney(order.subtotal);

  let platformDiscount = 0;
  let platformCouponId = order.coupon_id && order.legacy_seller_id === null
    ? order.coupon_id
    : null;
  if (platformCouponId) {
    const isApplicable = subtotal > 0
      && (!order.min_order_amount || subtotal >= Number(order.min_order_amount));
    if (!isApplicable) {
      await releaseCouponUsage(db, orderId, platformCouponId);
      platformCouponId = null;
    } else {
      platformDiscount = calculateDiscount(order, subtotal);
    }
  }

  const remainingResult = await db.request()
    .input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT coupon_id, discount_amount
      FROM OrderCoupons
      WHERE order_id = @orderId
    `);
  const shopDiscount = roundMoney(
    remainingResult.recordset.reduce((sum, item) => sum + Number(item.discount_amount), 0)
  );
  const discount = roundMoney(shopDiscount + platformDiscount);
  const vat = Math.round(subtotal * VAT_RATE);
  const total = Math.max(0, roundMoney(subtotal + vat + SHIPPING_FEE - discount));
  const remainingCouponIds = [
    ...(platformCouponId ? [platformCouponId] : []),
    ...remainingResult.recordset.map((item) => item.coupon_id)
  ];
  const legacyCouponId = remainingCouponIds.length === 1 ? remainingCouponIds[0] : null;

  await db.request()
    .input("orderId", sql.VarChar, orderId)
    .input("couponId", sql.VarChar, legacyCouponId)
    .input("subtotal", sql.Decimal(18, 2), subtotal)
    .input("discount", sql.Decimal(18, 2), discount)
    .input("total", sql.Decimal(18, 2), total)
    .input("hasActiveItems", sql.Bit, subtotal > 0)
    .query(`
      UPDATE Orders
      SET coupon_id = @couponId,
          subtotal = @subtotal,
          discount_amount = @discount,
          shipping_fee = 0,
          total = @total,
          status = CASE WHEN @hasActiveItems = 0 THEN 'cancelled' ELSE status END,
          updated_at = GETDATE()
      WHERE id = @orderId;

      UPDATE Payments
      SET amount = @total,
          status = CASE WHEN @hasActiveItems = 0 AND status = 'pending' THEN 'failed' ELSE status END
      WHERE order_id = @orderId AND status <> 'paid';
    `);

  return { subtotal, vat, discount, shippingFee: SHIPPING_FEE, total };
};

const validateShippingInfo = (shippingInfo) => {
  if (
    !shippingInfo ||
    typeof shippingInfo.name !== "string" || !shippingInfo.name.trim() ||
    typeof shippingInfo.phone !== "string" || !shippingInfo.phone.trim() ||
    typeof shippingInfo.address !== "string" || !shippingInfo.address.trim()
  ) {
    throw checkoutError("INVALID_SHIPPING_INFO", "Thông tin giao hàng không đầy đủ.");
  }
};

export const createTrustedOrder = async (db, {
  userId,
  cartItems,
  shippingInfo,
  couponCode,
  couponCodes,
  paymentMethod,
  orderStatus,
  paymentStatus,
  clientTotal
}) => {
  validateShippingInfo(shippingInfo);

  const pricedItems = await resolveCartItems(db, cartItems, userId);
  const subtotal = roundMoney(pricedItems.reduce((sum, item) => sum + item.totalPrice, 0));
  const appliedCoupons = await resolveApplicableCoupons(db, {
    couponCode,
    couponCodes,
    pricedItems,
    userId
  });
  const discount = roundMoney(
    appliedCoupons.reduce((sum, applied) => sum + applied.discountAmount, 0)
  );
  const vat = Math.round(subtotal * VAT_RATE);
  const total = Math.max(0, roundMoney(subtotal + vat + SHIPPING_FEE - discount));

  if (clientTotal !== undefined && (!Number.isFinite(clientTotal) || roundMoney(clientTotal) !== total)) {
    throw priceChangedError();
  }

  const orderId = uuidv4();
  await db.request()
    .input("id", sql.VarChar, orderId)
    .input("userId", sql.VarChar, userId)
    .input("couponId", sql.VarChar, appliedCoupons.length === 1 ? appliedCoupons[0].coupon.id : null)
    .input("status", sql.VarChar, orderStatus)
    .input("subtotal", sql.Decimal(18, 2), subtotal)
    .input("discount", sql.Decimal(18, 2), discount)
    .input("shippingFee", sql.Decimal(18, 2), SHIPPING_FEE)
    .input("total", sql.Decimal(18, 2), total)
    .input("shippingName", sql.NVarChar, shippingInfo.name.trim())
    .input("shippingPhone", sql.VarChar, shippingInfo.phone.trim())
    .input("shippingAddress", sql.NVarChar, shippingInfo.address.trim())
    .input("shippingCity", sql.NVarChar, shippingInfo.city?.trim() || null)
    .input("shippingCountry", sql.NVarChar, "Vietnam")
    .input("note", sql.NVarChar, shippingInfo.note?.trim() || null)
    .query(`
      INSERT INTO Orders (
        id, user_id, coupon_id, status, subtotal, discount_amount, shipping_fee, total,
        shipping_name, shipping_phone, shipping_address, shipping_city, shipping_country,
        note, created_at, updated_at
      ) VALUES (
        @id, @userId, @couponId, @status, @subtotal, @discount, @shippingFee, @total,
        @shippingName, @shippingPhone, @shippingAddress, @shippingCity, @shippingCountry,
        @note, GETDATE(), GETDATE()
      )
    `);

  for (const item of pricedItems) {
    const stockUpdate = await db.request()
      .input("variantId", sql.VarChar, item.variantId)
      .input("quantity", sql.Int, item.quantity)
      .query(`
        UPDATE ProductVariants
        SET stock_qty = stock_qty - @quantity,
            updated_at = GETDATE()
        OUTPUT
          DELETED.stock_qty AS old_quantity,
          INSERTED.stock_qty AS new_quantity,
          INSERTED.low_stock_threshold AS low_stock_threshold
        WHERE id = @variantId AND stock_qty >= @quantity
      `);

    if (stockUpdate.rowsAffected[0] !== 1) {
      throw checkoutError("INSUFFICIENT_STOCK", `Sản phẩm ${item.productName} không đủ tồn kho.`);
    }

    const orderItemId = uuidv4();
    item.orderItemId = orderItemId;

    await db.request()
      .input("id", sql.VarChar, orderItemId)
      .input("orderId", sql.VarChar, orderId)
      .input("variantId", sql.VarChar, item.variantId)
      .input("quantity", sql.Int, item.quantity)
      .input("unitPrice", sql.Decimal(18, 2), item.unitPrice)
      .input("totalPrice", sql.Decimal(18, 2), item.totalPrice)
      .input("productName", sql.NVarChar, item.productName)
      .input("variantInfo", sql.NVarChar, item.variantInfo)
      .query(`
        INSERT INTO OrderItems (
          id, order_id, variant_id, quantity, unit_price, total_price,
          product_name, variant_info, created_at
        ) VALUES (
          @id, @orderId, @variantId, @quantity, @unitPrice, @totalPrice,
          @productName, @variantInfo, GETDATE()
        )
      `);

    await db.request()
      .input("id", sql.VarChar, uuidv4())
      .input("orderItemId", sql.VarChar, orderItemId)
      .input("userId", sql.VarChar, userId)
      .query(`
        INSERT INTO OrderItemStatusHistory (
          id, order_item_id, old_status, new_status,
          changed_by_user_id, change_source, note, created_at
        ) VALUES (
          @id, @orderItemId, NULL, 'pending_fulfillment',
          @userId, 'customer', N'Đơn hàng được tạo.', GETDATE()
        )
      `);

    const stockChange = stockUpdate.recordset[0];
    await recordInventoryLog(db, {
      variantId: item.variantId,
      oldQuantity: Number(stockChange.old_quantity),
      changeQuantity: -item.quantity,
      newQuantity: Number(stockChange.new_quantity),
      type: INVENTORY_TYPES.SALE,
      referenceId: orderItemId,
      reason: `Đơn hàng ${orderId}`,
      createdBy: userId
    });

    if (
      Number(stockChange.old_quantity) > Number(stockChange.low_stock_threshold)
      && Number(stockChange.new_quantity) <= Number(stockChange.low_stock_threshold)
    ) {
      await createNotification(db, {
        userId: item.sellerUserId,
        type: Number(stockChange.new_quantity) === 0 ? "out_of_stock" : "low_stock",
        title: Number(stockChange.new_quantity) === 0
          ? "S\u1ea3n ph\u1ea9m \u0111\u00e3 h\u1ebft h\u00e0ng"
          : "S\u1ea3n ph\u1ea9m s\u1eafp h\u1ebft h\u00e0ng",
        message: `${item.productName} ch\u1ec9 c\u00f2n ${stockChange.new_quantity} s\u1ea3n ph\u1ea9m.`,
        entityType: "product",
        entityId: item.productId,
        data: {
          productId: item.productId,
          variantId: item.variantId,
          stock: Number(stockChange.new_quantity),
          threshold: Number(stockChange.low_stock_threshold)
        },
        dedupeKey: `low-stock:${item.variantId}:${orderItemId}`
      });
    }
  }

  const sellerOrders = new Map();
  for (const item of pricedItems) {
    const current = sellerOrders.get(item.sellerId) || {
      sellerUserId: item.sellerUserId,
      itemCount: 0,
      quantity: 0
    };
    current.itemCount += 1;
    current.quantity += item.quantity;
    sellerOrders.set(item.sellerId, current);
  }
  for (const [sellerId, sellerOrder] of sellerOrders) {
    await createNotification(db, {
      userId: sellerOrder.sellerUserId,
      type: "new_order",
      title: "\u0110\u01a1n h\u00e0ng m\u1edbi",
      message: `\u0110\u01a1n ${orderId} c\u00f3 ${sellerOrder.quantity} s\u1ea3n ph\u1ea9m c\u1ea7n x\u1eed l\u00fd.`,
      entityType: "order",
      entityId: orderId,
      data: {
        orderId,
        sellerId,
        itemCount: sellerOrder.itemCount,
        quantity: sellerOrder.quantity
      },
      dedupeKey: `new-order:${orderId}:${sellerId}`
    });
  }

  for (const appliedCoupon of appliedCoupons) {
    await recordOrderCoupon(db, { appliedCoupon, orderId });
    await recordCouponUsage(db, {
      coupon: appliedCoupon.coupon,
      orderId,
      userId
    });
  }

  await db.request()
    .input("id", sql.VarChar, uuidv4())
    .input("orderId", sql.VarChar, orderId)
    .input("method", sql.VarChar, paymentMethod)
    .input("status", sql.VarChar, paymentStatus)
    .input("amount", sql.Decimal(18, 2), total)
    .query(`
      INSERT INTO Payments (id, order_id, method, status, amount, created_at)
      VALUES (@id, @orderId, @method, @status, @amount, GETDATE())
    `);

  return {
    orderId,
    pricing: {
      subtotal,
      couponEligibleSubtotal: appliedCoupons.length === 1
        ? appliedCoupons[0].eligibleSubtotal
        : 0,
      couponDiscounts: appliedCoupons.map((applied) => ({
        couponId: applied.coupon.id,
        code: applied.coupon.code,
        sellerId: applied.sellerId,
        eligibleSubtotal: applied.eligibleSubtotal,
        discountAmount: applied.discountAmount
      })),
      vat,
      discount,
      shippingFee: SHIPPING_FEE,
      total
    },
    items: pricedItems.map(({ orderItemId, productId, variantId, quantity, unitPrice, totalPrice }) => ({
      orderItemId,
      productId,
      variantId,
      quantity,
      unitPrice,
      totalPrice
    }))
  };
};

export const previewTrustedCoupon = async (db, {
  userId,
  cartItems,
  couponCode,
  sellerId = null
}) => {
  if (!couponCode || typeof couponCode !== "string") {
    throw checkoutError("COUPON_REQUIRED", "Vui lòng nhập mã voucher.");
  }

  const pricedItems = await resolveCartItems(db, cartItems, userId);
  const cartSubtotal = roundMoney(
    pricedItems.reduce((sum, item) => sum + item.totalPrice, 0)
  );
  const coupon = await findApplicableCoupon(db, {
    couponCode,
    pricedItems,
    userId,
    expectedSellerId: sellerId
  });
  const eligibleSubtotal = Number(coupon.eligible_subtotal || 0);

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value || 0),
    discountAmount: calculateDiscount(coupon, eligibleSubtotal),
    sellerId: coupon.seller_id || null,
    cartSubtotal,
    eligibleSubtotal
  };
};

export const sendCheckoutError = (res, error) => {
  if (!error?.code) return false;
  res.status(error.statusCode || 400).json({
    status: "fail",
    code: error.code,
    message: error.message
  });
  return true;
};
