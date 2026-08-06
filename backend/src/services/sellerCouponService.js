import { pool, sql } from "../config/db.js";
import {
  paginationMeta,
  parsePagination,
  parseSearch,
  parseSort,
  queryError,
} from "../utils/queryUtils.js";

const toLocalDateString = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const normalizeCouponDateTime = (
  value,
  fieldName,
  { endOfDay = false } = {},
) => {
  if (!value) throw new Error(`${fieldName} la bat buoc.`);

  const raw = String(value);
  const dateOnly = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new Error(`${fieldName} khong hop le.`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${dateOnly} ${endOfDay ? "23:59:59" : "00:00:00"}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()))
    throw new Error(`${fieldName} khong hop le.`);
  const timePart = [
    String(parsed.getHours()).padStart(2, "0"),
    String(parsed.getMinutes()).padStart(2, "0"),
    String(parsed.getSeconds()).padStart(2, "0"),
  ].join(":");
  return `${toLocalDateString(parsed)} ${timePart}`;
};

const validateCouponPayload = (data) => {
  const discountType = data.discountType || "percentage";
  const discountValue = Number(data.discountValue || 0);
  const usageLimit =
    data.usageLimit === undefined ||
    data.usageLimit === null ||
    data.usageLimit === ""
      ? null
      : Number(data.usageLimit);
  const minOrderAmount =
    data.minOrderAmount === undefined ||
    data.minOrderAmount === null ||
    data.minOrderAmount === ""
      ? 0
      : Number(data.minOrderAmount);
  const maxDiscountAmt =
    data.maxDiscountAmt === undefined ||
    data.maxDiscountAmt === null ||
    data.maxDiscountAmt === ""
      ? null
      : Number(data.maxDiscountAmt);
  const startsAt = normalizeCouponDateTime(data.startsAt, "startsAt");
  const expiresAt = normalizeCouponDateTime(data.expiresAt, "expiresAt", {
    endOfDay: true,
  });

  if (!["percentage", "fixed"].includes(discountType)) {
    throw new Error("Loai giam gia voucher khong hop le.");
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error("Gia tri giam gia phai lon hon 0.");
  }
  if (discountType === "percentage" && discountValue > 100) {
    throw new Error("Voucher phan tram khong duoc vuot qua 100%.");
  }
  if (
    usageLimit !== null &&
    (!Number.isInteger(usageLimit) || usageLimit <= 0)
  ) {
    throw new Error("Gioi han luot dung phai lon hon 0.");
  }
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    throw new Error("Gia tri don hang toi thieu phai lon hon hoac bang 0.");
  }
  if (
    maxDiscountAmt !== null &&
    (!Number.isFinite(maxDiscountAmt) || maxDiscountAmt <= 0)
  ) {
    throw new Error("Muc giam toi da phai lon hon 0.");
  }
  if (new Date(startsAt) >= new Date(expiresAt)) {
    throw new Error("startsAt phai nho hon expiresAt.");
  }
  if (new Date(expiresAt) <= new Date()) {
    throw new Error("expiresAt phai lon hon thoi diem hien tai.");
  }

  return {
    discountType,
    discountValue,
    usageLimit,
    minOrderAmount,
    maxDiscountAmt,
    startsAt,
    expiresAt,
  };
};

const recycleDeletedCouponCode = async (code) => {
  await pool.request().input("code", sql.VarChar, code).query(`
      UPDATE Coupons
      SET code = CONCAT(LEFT(code, 25), '__deleted__', id)
      WHERE code = @code
        AND deleted_at IS NOT NULL
    `);
};

export const getSellerCoupons = async (sellerId, query = {}) => {
  const { page, limit, offset } = parsePagination(query);
  const search = parseSearch(query.search);
  const status = String(query.status || "all").toLowerCase();
  if (
    ![
      "all",
      "active",
      "scheduled",
      "expired",
      "disabled",
      "exhausted",
    ].includes(status)
  ) {
    throw queryError(
      "INVALID_COUPON_STATUS",
      "Trang thai voucher khong hop le.",
    );
  }
  const { orderSql } = parseSort(query, {
    created_at: "coupon.created_at",
    code: "coupon.code",
    starts_at: "coupon.starts_at",
    expires_at: "coupon.expires_at",
    used_count: "coupon.used_count",
  });
  const result = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("search", sql.NVarChar, search || null)
    .input("status", sql.VarChar, status)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
      WITH SellerCoupons AS (
        SELECT coupon.*,
          CASE
            WHEN coupon.is_active = 0 THEN 'disabled'
            WHEN coupon.starts_at > GETDATE() THEN 'scheduled'
            WHEN coupon.expires_at < GETDATE() THEN 'expired'
            WHEN coupon.usage_limit IS NOT NULL AND coupon.used_count >= coupon.usage_limit THEN 'exhausted'
            ELSE 'active'
          END AS coupon_status
        FROM Coupons coupon
        WHERE coupon.seller_id = @sellerId
          AND coupon.deleted_at IS NULL
          AND (@search IS NULL OR coupon.code LIKE '%' + @search + '%' OR coupon.description LIKE '%' + @search + '%')
      )
      SELECT coupon.*, COUNT(*) OVER() AS total_count
      FROM SellerCoupons coupon
      WHERE @status = 'all' OR coupon.coupon_status = @status
      ORDER BY ${orderSql}, coupon.id
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    coupons: result.recordset.map(({ total_count, ...coupon }) => ({
      ...coupon,
      discount_value: Number(coupon.discount_value),
      min_order_amount:
        coupon.min_order_amount === null
          ? null
          : Number(coupon.min_order_amount),
      max_discount_amt:
        coupon.max_discount_amt === null
          ? null
          : Number(coupon.max_discount_amt),
      is_active: Boolean(coupon.is_active),
    })),
    pagination: paginationMeta(page, limit, total),
  };
};

export const createSellerCoupon = async (sellerId, data) => {
  const couponId = `coup_${Math.random().toString(36).substr(2, 9)}`;
  const code = String(data.code || "")
    .trim()
    .toUpperCase();
  if (!code) throw new Error("Ma voucher la bat buoc.");
  if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
    throw new Error(
      "Ma voucher phai co 3-50 ky tu gom chu, so, gach duoi hoac gach ngang.",
    );
  }
  const {
    discountType,
    discountValue,
    usageLimit,
    minOrderAmount,
    maxDiscountAmt,
    startsAt,
    expiresAt,
  } = validateCouponPayload(data);

  await recycleDeletedCouponCode(code);
  const duplicate = await pool.request().input("code", sql.VarChar, code)
    .query(`
      SELECT TOP 1 id
      FROM Coupons
      WHERE code = @code AND deleted_at IS NULL
    `);
  if (duplicate.recordset.length > 0) throw new Error("Ma voucher da ton tai.");

  await pool
    .request()
    .input("id", sql.VarChar, couponId)
    .input("sellerId", sql.VarChar, sellerId)
    .input("code", sql.VarChar, code)
    .input("description", sql.NVarChar, data.description || null)
    .input("discountType", sql.VarChar, discountType)
    .input("discountValue", sql.Decimal(18, 2), discountValue)
    .input("minOrderAmount", sql.Decimal(18, 2), minOrderAmount)
    .input("maxDiscountAmt", sql.Decimal(18, 2), maxDiscountAmt)
    .input("usageLimit", sql.Int, usageLimit)
    .input("startsAt", sql.VarChar, startsAt)
    .input("expiresAt", sql.VarChar, expiresAt).query(`
      INSERT INTO Coupons (
        id, seller_id, code, description, discount_type, discount_value,
        min_order_amount, max_discount_amt, usage_limit, starts_at, expires_at, is_active
      )
      VALUES (
        @id, @sellerId, @code, @description, @discountType, @discountValue,
        @minOrderAmount, @maxDiscountAmt, @usageLimit,
        CONVERT(datetime2, @startsAt), CONVERT(datetime2, @expiresAt), 1
      )
    `);
  return { id: couponId, code };
};

export const updateSellerCoupon = async (sellerId, couponId, data) => {
  const check = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("couponId", sql.VarChar, couponId).query(`
      SELECT id, starts_at, expires_at
      FROM Coupons
      WHERE id = @couponId AND seller_id = @sellerId AND deleted_at IS NULL
    `);
  if (check.recordset.length === 0) {
    throw new Error("Khong tim thay voucher thuoc shop cua ban.");
  }

  const request = pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("couponId", sql.VarChar, couponId);
  const updates = [];
  if (data.isActive !== undefined) {
    updates.push("is_active = @isActive");
    request.input("isActive", sql.Bit, Boolean(data.isActive));
  }

  let nextStartsAt = check.recordset[0].starts_at;
  let nextExpiresAt = check.recordset[0].expires_at;
  if (data.startsAt !== undefined) {
    nextStartsAt = normalizeCouponDateTime(data.startsAt, "startsAt");
    updates.push("starts_at = CONVERT(datetime2, @startsAt)");
    request.input("startsAt", sql.VarChar, nextStartsAt);
  }
  if (data.expiresAt !== undefined) {
    nextExpiresAt = normalizeCouponDateTime(data.expiresAt, "expiresAt", {
      endOfDay: true,
    });
    updates.push("expires_at = CONVERT(datetime2, @expiresAt)");
    request.input("expiresAt", sql.VarChar, nextExpiresAt);
  }
  if (new Date(nextStartsAt) >= new Date(nextExpiresAt)) {
    throw new Error("startsAt phai nho hon expiresAt.");
  }
  if (updates.length === 0) return true;

  await request.query(`
    UPDATE Coupons
    SET ${updates.join(", ")}
    WHERE id = @couponId AND seller_id = @sellerId
  `);
  return true;
};

export const deleteSellerCoupon = async (sellerId, couponId) => {
  const coupon = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("couponId", sql.VarChar, couponId).query(`
      SELECT id, code
      FROM Coupons
      WHERE id = @couponId AND seller_id = @sellerId AND deleted_at IS NULL
    `);
  if (coupon.recordset.length === 0) {
    throw new Error("Khong tim thay voucher thuoc shop cua ban.");
  }

  const deletedCode = `${String(coupon.recordset[0].code || "").slice(0, 25)}__deleted__${couponId}`;
  const result = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("couponId", sql.VarChar, couponId)
    .input("deletedCode", sql.VarChar, deletedCode).query(`
      UPDATE Coupons
      SET is_active = 0, code = @deletedCode, deleted_at = GETDATE()
      WHERE id = @couponId AND seller_id = @sellerId AND deleted_at IS NULL
    `);
  if (result.rowsAffected[0] === 0) {
    throw new Error("Khong tim thay voucher thuoc shop cua ban.");
  }
  return true;
};

export const sellerCouponService = {
  getSellerCoupons,
  createSellerCoupon,
  updateSellerCoupon,
  deleteSellerCoupon,
};
