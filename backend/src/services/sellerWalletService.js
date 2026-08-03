import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import { createNotification } from "./notificationService.js";
import {
  paginationMeta,
  parsePagination,
  queryError
} from "../utils/queryUtils.js";

export const WALLET_TRANSACTION_TYPES = Object.freeze([
  "sale_pending",
  "sale_released",
  "sale_reversed",
  "withdrawal_hold",
  "withdrawal_approved",
  "withdrawal_rejected",
  "withdrawal_cancelled"
]);

const WITHDRAWAL_STATUSES = Object.freeze([
  "pending",
  "approved",
  "rejected",
  "cancelled"
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const walletId = () => `wallet_${uuidv4().replace(/-/g, "")}`;
const transactionId = () => `wtx_${uuidv4().replace(/-/g, "")}`;
const withdrawalId = () => `wdr_${uuidv4().replace(/-/g, "")}`;
const money = (value) => Number(value || 0);
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getHoldDays = () => {
  const value = Number(process.env.SELLER_WALLET_HOLD_DAYS ?? 7);
  return Number.isInteger(value) && value >= 0 ? value : 7;
};

const getCommissionRate = () => {
  const value = Number(process.env.SELLER_COMMISSION_RATE ?? 0);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0;
};

export const getMinimumWithdrawalAmount = () => {
  const value = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 100000);
  return Number.isSafeInteger(value) && value > 0 ? value : 100000;
};

const maskAccountNo = (value) => {
  const accountNo = String(value || "");
  if (!accountNo) return null;
  const visible = accountNo.slice(-4);
  return `${"*".repeat(Math.max(0, accountNo.length - visible.length))}${visible}`;
};

const parseDateRange = (query = {}) => {
  const from = query.from ? String(query.from) : null;
  const to = query.to ? String(query.to) : null;
  const isValidDate = (value) => {
    if (!DATE_PATTERN.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  };
  if (from && !isValidDate(from)) {
    throw queryError("INVALID_WALLET_DATE", "from phai la ngay YYYY-MM-DD hop le.");
  }
  if (to && !isValidDate(to)) {
    throw queryError("INVALID_WALLET_DATE", "to phai la ngay YYYY-MM-DD hop le.");
  }
  if (from && to && from > to) {
    throw queryError("INVALID_WALLET_DATE_RANGE", "from khong duoc sau to.");
  }
  return { from, to };
};

const validateNote = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > 500) {
    throw queryError("INVALID_WITHDRAWAL_NOTE", `${fieldName} khong duoc vuot qua 500 ky tu.`);
  }
  return value.trim() || null;
};

const toWallet = (row) => ({
  id: row.id,
  sellerId: row.seller_id,
  availableBalance: money(row.available_balance),
  pendingBalance: money(row.pending_balance),
  withdrawalHoldBalance: money(row.withdrawal_hold_balance),
  withdrawnTotal: money(row.withdrawn_total),
  lifetimeEarnings: money(row.lifetime_earnings),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const toWalletTransaction = (row) => ({
  id: row.id,
  type: row.type,
  amount: money(row.amount),
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  availableAt: row.available_at,
  description: row.description,
  createdAt: row.created_at
});

const toWithdrawal = (row, { includeBankAccount = false } = {}) => ({
  id: row.id,
  sellerId: row.seller_id,
  amount: money(row.amount),
  status: row.status,
  bankName: row.bank_name,
  accountNo: includeBankAccount ? row.bank_account_no : undefined,
  maskedAccountNo: maskAccountNo(row.bank_account_no),
  accountHolder: row.bank_account_holder,
  sellerNote: row.seller_note,
  adminNote: row.admin_note,
  processedBy: row.processed_by,
  requestedAt: row.requested_at,
  processedAt: row.processed_at
});

export const acquireSellerWalletLock = async (transaction, sellerId) => {
  const result = await transaction.request()
    .input("resource", sql.NVarChar, `seller-wallet:${sellerId}`)
    .query(`
      DECLARE @lock_result INT;
      EXEC @lock_result = sys.sp_getapplock
        @Resource = @resource,
        @LockMode = 'Exclusive',
        @LockOwner = 'Transaction',
        @LockTimeout = 10000;
      SELECT @lock_result AS lock_result;
    `);
  if (Number(result.recordset[0]?.lock_result) < 0) {
    throw queryError("WALLET_LOCK_TIMEOUT", "Khong the khoa vi de xu ly giao dich.", 409);
  }
};

export const ensureWalletForSeller = async (db, sellerId) => {
  await db.request()
    .input("walletId", sql.VarChar, walletId())
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      INSERT INTO ShopWallets (id, seller_id)
      SELECT @walletId, seller.id
      FROM Sellers seller
      WHERE seller.id = @sellerId AND seller.status = 'active'
        AND NOT EXISTS (
          SELECT 1
          FROM ShopWallets wallet WITH (UPDLOCK, HOLDLOCK)
          WHERE wallet.seller_id = @sellerId
        )
    `);

  const result = await db.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT *
      FROM ShopWallets WITH (UPDLOCK, ROWLOCK)
      WHERE seller_id = @sellerId
    `);
  if (!result.recordset[0]) {
    const seller = await db.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("SELECT id FROM Sellers WHERE id = @sellerId");
    throw seller.recordset[0]
      ? queryError("WALLET_NOT_FOUND", "Khong tim thay vi seller.", 404)
      : queryError("SELLER_NOT_FOUND", "Khong tim thay seller.", 404);
  }
  return result.recordset[0];
};

const insertLedger = async (db, data) => {
  const result = await db.request()
    .input("id", sql.VarChar, transactionId())
    .input("walletId", sql.VarChar, data.walletId)
    .input("sellerId", sql.VarChar, data.sellerId)
    .input("type", sql.VarChar, data.type)
    .input("amount", sql.Decimal(18, 2), data.amount)
    .input("referenceType", sql.VarChar, data.referenceType)
    .input("referenceId", sql.VarChar, data.referenceId)
    .input("idempotencyKey", sql.VarChar, data.idempotencyKey)
    .input("availableAt", sql.DateTime2, data.availableAt || null)
    .input("description", sql.NVarChar, data.description || null)
    .query(`
      INSERT INTO WalletTransactions (
        id, wallet_id, seller_id, type, amount, reference_type,
        reference_id, idempotency_key, available_at, description
      )
      OUTPUT inserted.*
      SELECT
        @id, @walletId, @sellerId, @type, @amount, @referenceType,
        @referenceId, @idempotencyKey, @availableAt, @description
      WHERE NOT EXISTS (
        SELECT 1
        FROM WalletTransactions WITH (UPDLOCK, HOLDLOCK)
        WHERE idempotency_key = @idempotencyKey
      )
    `);
  return result.recordset[0] || null;
};

export const recordDeliveredSale = async (db, { sellerId, orderItemId }) => {
  await acquireSellerWalletLock(db, sellerId);
  const wallet = await ensureWalletForSeller(db, sellerId);
  const existing = await db.request()
    .input("key", sql.VarChar, `wallet:sale-pending:${orderItemId}`)
    .query(`
      SELECT id FROM WalletTransactions WITH (UPDLOCK, HOLDLOCK)
      WHERE idempotency_key = @key
    `);
  if (existing.recordset[0]) return null;

  const result = await db.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("orderItemId", sql.VarChar, orderItemId)
    .query(`
      SELECT item.id, item.order_id, item.product_name, item.total_price,
             item.updated_at,
             order_coupon.discount_amount AS shop_discount,
             order_coupon.eligible_subtotal,
             CASE WHEN legacy_coupon.seller_id = @sellerId
               THEN orders.discount_amount ELSE 0 END AS legacy_discount,
             seller_subtotal.total_value AS legacy_subtotal,
             COALESCE(delivered.created_at, item.updated_at) AS delivered_at
      FROM OrderItems item
      INNER JOIN Orders orders ON orders.id = item.order_id
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      LEFT JOIN OrderCoupons order_coupon
        ON order_coupon.order_id = item.order_id
       AND order_coupon.seller_id = @sellerId
      LEFT JOIN Coupons legacy_coupon ON legacy_coupon.id = orders.coupon_id
      OUTER APPLY (
        SELECT SUM(seller_item.total_price) AS total_value
        FROM OrderItems seller_item
        INNER JOIN ProductVariants seller_variant ON seller_variant.id = seller_item.variant_id
        INNER JOIN Products seller_product ON seller_product.id = seller_variant.product_id
        WHERE seller_item.order_id = item.order_id
          AND seller_product.seller_id = @sellerId
      ) seller_subtotal
      OUTER APPLY (
        SELECT TOP 1 history.created_at
        FROM OrderItemStatusHistory history
        WHERE history.order_item_id = item.id AND history.new_status = 'delivered'
        ORDER BY history.created_at DESC
      ) delivered
      WHERE item.id = @orderItemId
        AND product.seller_id = @sellerId
        AND item.fulfillment_status = 'delivered'
    `);
  const item = result.recordset[0];
  if (!item) {
    throw queryError("ORDER_ITEM_NOT_FOUND", "Khong tim thay dong don hang delivered.", 404);
  }

  const gross = money(item.total_price);
  const voucherShare = item.shop_discount !== null && money(item.eligible_subtotal) > 0
    ? roundMoney(money(item.shop_discount) * gross / money(item.eligible_subtotal))
    : money(item.legacy_subtotal) > 0
      ? roundMoney(money(item.legacy_discount) * gross / money(item.legacy_subtotal))
      : 0;
  const discount = Math.min(gross, Math.max(0, voucherShare));
  const commission = roundMoney((gross - discount) * getCommissionRate());
  const netAmount = roundMoney(Math.max(0, gross - discount - commission));
  if (netAmount <= 0) return null;

  const deliveredAt = new Date(item.delivered_at || item.updated_at || Date.now());
  deliveredAt.setDate(deliveredAt.getDate() + getHoldDays());
  const ledger = await insertLedger(db, {
    walletId: wallet.id,
    sellerId,
    type: "sale_pending",
    amount: netAmount,
    referenceType: "order_item",
    referenceId: orderItemId,
    idempotencyKey: `wallet:sale-pending:${orderItemId}`,
    availableAt: deliveredAt,
    description: `Doanh thu cho ${item.product_name}`
  });
  if (!ledger) return null;

  await db.request()
    .input("walletId", sql.VarChar, wallet.id)
    .input("amount", sql.Decimal(18, 2), netAmount)
    .query(`
      UPDATE ShopWallets
      SET pending_balance = pending_balance + @amount,
          lifetime_earnings = lifetime_earnings + @amount,
          updated_at = GETDATE()
      WHERE id = @walletId
    `);
  return ledger;
};

export const reverseSaleForReturn = async (db, {
  sellerId,
  returnId,
  orderItemId,
  quantity
}) => {
  await recordDeliveredSale(db, { sellerId, orderItemId });
  const wallet = await ensureWalletForSeller(db, sellerId);
  const result = await db.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("returnId", sql.VarChar, returnId)
    .input("orderItemId", sql.VarChar, orderItemId)
    .query(`
      SELECT item.quantity AS purchased_quantity,
             pending.amount AS pending_amount,
             CASE WHEN released.id IS NULL THEN 0 ELSE 1 END AS is_released,
             COALESCE(previous.reversed_amount, 0) AS reversed_amount,
             COALESCE(previous.returned_quantity, 0) AS returned_quantity
      FROM OrderItems item
      INNER JOIN WalletTransactions pending
        ON pending.seller_id = @sellerId
       AND pending.type = 'sale_pending'
       AND pending.reference_type = 'order_item'
       AND pending.reference_id = item.id
      LEFT JOIN WalletTransactions released
        ON released.idempotency_key = CONCAT('wallet:sale-release:', item.id)
      OUTER APPLY (
        SELECT SUM(reversal.amount) AS reversed_amount,
               SUM(return_request.quantity) AS returned_quantity
        FROM ReturnRequests return_request
        INNER JOIN WalletTransactions reversal
          ON reversal.reference_type = 'return'
         AND reversal.reference_id = return_request.id
         AND reversal.type = 'sale_reversed'
        WHERE return_request.order_item_id = item.id
          AND return_request.id <> @returnId
      ) previous
      WHERE item.id = @orderItemId
    `);
  const row = result.recordset[0];
  if (!row) return null;

  const key = `wallet:sale-reverse:${returnId}`;
  const purchasedQuantity = Number(row.purchased_quantity);
  const remaining = roundMoney(money(row.pending_amount) - money(row.reversed_amount));
  const isLastReturn = Number(row.returned_quantity) + Number(quantity) >= purchasedQuantity;
  const proportional = roundMoney(money(row.pending_amount) * Number(quantity) / purchasedQuantity);
  const reversalAmount = Math.min(remaining, isLastReturn ? remaining : proportional);
  if (reversalAmount <= 0) return null;

  const ledger = await insertLedger(db, {
    walletId: wallet.id,
    sellerId,
    type: "sale_reversed",
    amount: reversalAmount,
    referenceType: "return",
    referenceId: returnId,
    idempotencyKey: key,
    description: `Dao doanh thu do tra hang ${returnId}`
  });
  if (!ledger) return null;

  const balanceColumn = Number(row.is_released) ? "available_balance" : "pending_balance";
  const update = await db.request()
    .input("walletId", sql.VarChar, wallet.id)
    .input("amount", sql.Decimal(18, 2), reversalAmount)
    .query(`
      UPDATE ShopWallets
      SET ${balanceColumn} = ${balanceColumn} - @amount,
          lifetime_earnings = lifetime_earnings - @amount,
          updated_at = GETDATE()
      WHERE id = @walletId
        AND ${balanceColumn} >= @amount
        AND lifetime_earnings >= @amount
    `);
  if (update.rowsAffected[0] !== 1) {
    throw queryError(
      "INSUFFICIENT_WALLET_BALANCE_FOR_REVERSAL",
      "So du vi khong du de dao giao dich tra hang.",
      409
    );
  }
  return ledger;
};

const releaseDueSales = async (sellerId) => {
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, sellerId);
    const wallet = await ensureWalletForSeller(transaction, sellerId);
    const due = await transaction.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT pending.reference_id AS order_item_id,
               pending.amount - COALESCE(reversals.amount, 0) AS release_amount
        FROM WalletTransactions pending WITH (UPDLOCK, HOLDLOCK)
        OUTER APPLY (
          SELECT SUM(reversal.amount) AS amount
          FROM ReturnRequests return_request
          INNER JOIN WalletTransactions reversal
            ON reversal.type = 'sale_reversed'
           AND reversal.reference_type = 'return'
           AND reversal.reference_id = return_request.id
          WHERE return_request.order_item_id = pending.reference_id
        ) reversals
        WHERE pending.seller_id = @sellerId
          AND pending.type = 'sale_pending'
          AND pending.reference_type = 'order_item'
          AND pending.available_at <= GETDATE()
          AND NOT EXISTS (
            SELECT 1 FROM WalletTransactions released
            WHERE released.idempotency_key = CONCAT('wallet:sale-release:', pending.reference_id)
          )
          AND NOT EXISTS (
            SELECT 1 FROM ReturnRequests active_return
            WHERE active_return.order_item_id = pending.reference_id
              AND active_return.status IN ('requested', 'accepted')
          )
      `);

    for (const row of due.recordset) {
      const amount = roundMoney(row.release_amount);
      if (amount <= 0) continue;
      const ledger = await insertLedger(transaction, {
        walletId: wallet.id,
        sellerId,
        type: "sale_released",
        amount,
        referenceType: "order_item",
        referenceId: row.order_item_id,
        idempotencyKey: `wallet:sale-release:${row.order_item_id}`,
        description: `Giai phong doanh thu ${row.order_item_id}`
      });
      if (!ledger) continue;
      const update = await transaction.request()
        .input("walletId", sql.VarChar, wallet.id)
        .input("amount", sql.Decimal(18, 2), amount)
        .query(`
          UPDATE ShopWallets
          SET pending_balance = pending_balance - @amount,
              available_balance = available_balance + @amount,
              updated_at = GETDATE()
          WHERE id = @walletId AND pending_balance >= @amount
        `);
      if (update.rowsAffected[0] !== 1) {
        throw queryError("WALLET_BALANCE_CONFLICT", "So du pending khong hop le.", 409);
      }
    }
    await transaction.commit();
    started = false;
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};

export const syncSellerWallet = async (sellerId) => {
  await ensureWalletForSeller(pool, sellerId);
  const missingSales = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT item.id
      FROM OrderItems item
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      WHERE product.seller_id = @sellerId
        AND item.fulfillment_status = 'delivered'
        AND NOT EXISTS (
          SELECT 1 FROM WalletTransactions wallet_transaction
          WHERE wallet_transaction.idempotency_key = CONCAT('wallet:sale-pending:', item.id)
        )
    `);
  for (const item of missingSales.recordset) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await recordDeliveredSale(transaction, { sellerId, orderItemId: item.id });
      await transaction.commit();
    } catch (error) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
      throw error;
    }
  }

  const missingReversals = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT request.id, request.order_item_id, request.quantity
      FROM ReturnRequests request
      WHERE request.seller_id = @sellerId
        AND request.status = 'item_returned'
        AND NOT EXISTS (
          SELECT 1 FROM WalletTransactions wallet_transaction
          WHERE wallet_transaction.idempotency_key = CONCAT('wallet:sale-reverse:', request.id)
        )
      ORDER BY request.returned_at ASC, request.id ASC
    `);
  for (const item of missingReversals.recordset) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await reverseSaleForReturn(transaction, {
        sellerId,
        returnId: item.id,
        orderItemId: item.order_item_id,
        quantity: item.quantity
      });
      await transaction.commit();
    } catch (error) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
      throw error;
    }
  }
  await releaseDueSales(sellerId);
};

let releaseJobRunning = false;

export const reconcileAllActiveSellerWallets = async () => {
  if (releaseJobRunning) return;
  releaseJobRunning = true;
  try {
    const sellers = await pool.request().query(`
      SELECT id FROM Sellers WHERE status = 'active' ORDER BY id
    `);
    for (const seller of sellers.recordset) {
      try {
        await syncSellerWallet(seller.id);
      } catch (error) {
        console.error(`[SellerWallet] Reconcile failed for ${seller.id}:`, error.message);
      }
    }
  } finally {
    releaseJobRunning = false;
  }
};

export const startSellerWalletReleaseJob = () => {
  const configuredInterval = Number(process.env.SELLER_WALLET_RELEASE_INTERVAL_MS ?? 300000);
  const intervalMs = Number.isInteger(configuredInterval) && configuredInterval >= 10000
    ? configuredInterval
    : 300000;
  const run = () => reconcileAllActiveSellerWallets().catch((error) => {
    console.error("[SellerWallet] Reconcile job failed:", error.message);
  });
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
};

export const getSellerWallet = async (sellerId) => {
  await syncSellerWallet(sellerId);
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT wallet.*, seller.bank_name, seller.bank_account_no,
             seller.bank_account_holder
      FROM ShopWallets wallet
      INNER JOIN Sellers seller ON seller.id = wallet.seller_id
      WHERE wallet.seller_id = @sellerId
    `);
  const row = result.recordset[0];
  if (!row) throw queryError("WALLET_NOT_FOUND", "Khong tim thay vi seller.", 404);
  return {
    wallet: toWallet(row),
    bankInfo: {
      bankName: row.bank_name,
      accountHolder: row.bank_account_holder,
      maskedAccountNo: maskAccountNo(row.bank_account_no)
    },
    minimumWithdrawalAmount: getMinimumWithdrawalAmount(),
    holdDays: getHoldDays()
  };
};

export const getWalletTransactions = async (sellerId, query = {}) => {
  await syncSellerWallet(sellerId);
  const { page, limit, offset } = parsePagination(query);
  const { from, to } = parseDateRange(query);
  const type = String(query.type || "all").trim().toLowerCase();
  if (type !== "all" && !WALLET_TRANSACTION_TYPES.includes(type)) {
    throw queryError("INVALID_WALLET_TRANSACTION_TYPE", "type giao dich vi khong hop le.");
  }
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("type", sql.VarChar, type)
    .input("from", sql.Date, from)
    .input("to", sql.Date, to)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT COUNT(*) OVER() AS total_count, wallet_transaction.*
      FROM WalletTransactions wallet_transaction
      WHERE wallet_transaction.seller_id = @sellerId
        AND (@type = 'all' OR wallet_transaction.type = @type)
        AND (@from IS NULL OR wallet_transaction.created_at >= @from)
        AND (@to IS NULL OR wallet_transaction.created_at < DATEADD(DAY, 1, @to))
      ORDER BY wallet_transaction.created_at DESC, wallet_transaction.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    transactions: result.recordset.map(toWalletTransaction),
    pagination: paginationMeta(page, limit, total)
  };
};

const validateWithdrawalAmount = (value) => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < getMinimumWithdrawalAmount()) {
    throw queryError(
      "INVALID_WITHDRAWAL_AMOUNT",
      `So tien rut phai la so nguyen VND va toi thieu ${getMinimumWithdrawalAmount()}.`
    );
  }
  return amount;
};

export const createWithdrawal = async (sellerId, payload = {}) => {
  const amount = validateWithdrawalAmount(payload.amount);
  const sellerNote = validateNote(payload.sellerNote, "sellerNote");
  await syncSellerWallet(sellerId);
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, sellerId);
    const wallet = await ensureWalletForSeller(transaction, sellerId);
    const sellerResult = await transaction.request()
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        SELECT bank_name, bank_account_no, bank_account_holder
        FROM Sellers WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @sellerId AND status = 'active'
      `);
    const seller = sellerResult.recordset[0];
    if (!seller) throw queryError("SELLER_NOT_FOUND", "Khong tim thay seller.", 404);
    if (!seller.bank_name || !seller.bank_account_no || !seller.bank_account_holder) {
      throw queryError("BANK_INFO_REQUIRED", "Vui long cap nhat day du thong tin ngan hang.");
    }
    if (money(wallet.available_balance) < amount) {
      throw queryError(
        "INSUFFICIENT_AVAILABLE_BALANCE",
        "So du kha dung khong du de rut tien.",
        409
      );
    }
    const id = withdrawalId();
    const created = await transaction.request()
      .input("id", sql.VarChar, id)
      .input("sellerId", sql.VarChar, sellerId)
      .input("amount", sql.Decimal(18, 2), amount)
      .input("bankName", sql.NVarChar, seller.bank_name)
      .input("bankAccountNo", sql.VarChar, seller.bank_account_no)
      .input("bankAccountHolder", sql.NVarChar, seller.bank_account_holder)
      .input("sellerNote", sql.NVarChar, sellerNote)
      .query(`
        INSERT INTO WithdrawalRequests (
          id, seller_id, amount, status, bank_name, bank_account_no,
          bank_account_holder, seller_note
        )
        OUTPUT inserted.*
        VALUES (
          @id, @sellerId, @amount, 'pending', @bankName, @bankAccountNo,
          @bankAccountHolder, @sellerNote
        )
      `);
    await insertLedger(transaction, {
      walletId: wallet.id,
      sellerId,
      type: "withdrawal_hold",
      amount,
      referenceType: "withdrawal",
      referenceId: id,
      idempotencyKey: `wallet:withdrawal-hold:${id}`,
      description: `Tam giu cho yeu cau rut tien ${id}`
    });
    const update = await transaction.request()
      .input("walletId", sql.VarChar, wallet.id)
      .input("amount", sql.Decimal(18, 2), amount)
      .query(`
        UPDATE ShopWallets
        SET available_balance = available_balance - @amount,
            withdrawal_hold_balance = withdrawal_hold_balance + @amount,
            updated_at = GETDATE()
        WHERE id = @walletId AND available_balance >= @amount
      `);
    if (update.rowsAffected[0] !== 1) {
      throw queryError("INSUFFICIENT_AVAILABLE_BALANCE", "So du kha dung khong du.", 409);
    }
    await transaction.commit();
    started = false;
    return toWithdrawal(created.recordset[0]);
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};

export const listSellerWithdrawals = async (sellerId, query = {}) => {
  await syncSellerWallet(sellerId);
  const { page, limit, offset } = parsePagination(query);
  const status = String(query.status || "all").trim().toLowerCase();
  if (status !== "all" && !WITHDRAWAL_STATUSES.includes(status)) {
    throw queryError("INVALID_WITHDRAWAL_STATUS", "Trang thai rut tien khong hop le.");
  }
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("status", sql.VarChar, status)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT COUNT(*) OVER() AS total_count, request.*
      FROM WithdrawalRequests request
      WHERE request.seller_id = @sellerId
        AND (@status = 'all' OR request.status = @status)
      ORDER BY request.requested_at DESC, request.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    withdrawals: result.recordset.map((row) => toWithdrawal(row)),
    pagination: paginationMeta(page, limit, total)
  };
};

export const cancelWithdrawal = async (sellerId, requestId) => {
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, sellerId);
    const requestResult = await transaction.request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("requestId", sql.VarChar, requestId)
      .query(`
        SELECT * FROM WithdrawalRequests WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @requestId AND seller_id = @sellerId
      `);
    const withdrawal = requestResult.recordset[0];
    if (!withdrawal) {
      throw queryError("WITHDRAWAL_NOT_FOUND", "Khong tim thay yeu cau rut tien.", 404);
    }
    if (withdrawal.status !== "pending") {
      throw queryError(
        "WITHDRAWAL_NOT_CANCELLABLE",
        "Chi co the huy yeu cau rut tien dang cho xu ly.",
        409
      );
    }
    const wallet = await ensureWalletForSeller(transaction, sellerId);
    await transaction.request()
      .input("requestId", sql.VarChar, requestId)
      .query(`
        UPDATE WithdrawalRequests
        SET status = 'cancelled', processed_at = GETDATE()
        WHERE id = @requestId
      `);
    await insertLedger(transaction, {
      walletId: wallet.id,
      sellerId,
      type: "withdrawal_cancelled",
      amount: money(withdrawal.amount),
      referenceType: "withdrawal",
      referenceId: requestId,
      idempotencyKey: `wallet:withdrawal-cancelled:${requestId}`,
      description: `Seller huy yeu cau rut tien ${requestId}`
    });
    const update = await transaction.request()
      .input("walletId", sql.VarChar, wallet.id)
      .input("amount", sql.Decimal(18, 2), withdrawal.amount)
      .query(`
        UPDATE ShopWallets
        SET withdrawal_hold_balance = withdrawal_hold_balance - @amount,
            available_balance = available_balance + @amount,
            updated_at = GETDATE()
        WHERE id = @walletId AND withdrawal_hold_balance >= @amount
      `);
    if (update.rowsAffected[0] !== 1) {
      throw queryError("WALLET_BALANCE_CONFLICT", "So du tam giu khong hop le.", 409);
    }
    const updated = await transaction.request()
      .input("requestId", sql.VarChar, requestId)
      .query("SELECT * FROM WithdrawalRequests WHERE id = @requestId");
    await transaction.commit();
    started = false;
    return toWithdrawal(updated.recordset[0]);
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};

export const listAdminWithdrawals = async (query = {}) => {
  const { page, limit, offset } = parsePagination(query);
  const status = String(query.status || "all").trim().toLowerCase();
  if (status !== "all" && !WITHDRAWAL_STATUSES.includes(status)) {
    throw queryError("INVALID_WITHDRAWAL_STATUS", "Trang thai rut tien khong hop le.");
  }
  const result = await pool.request()
    .input("status", sql.VarChar, status)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`
      SELECT COUNT(*) OVER() AS total_count, request.*,
             seller.shop_name, seller.user_id AS seller_user_id
      FROM WithdrawalRequests request
      INNER JOIN Sellers seller ON seller.id = request.seller_id
      WHERE @status = 'all' OR request.status = @status
      ORDER BY CASE WHEN request.status = 'pending' THEN 0 ELSE 1 END,
               request.requested_at ASC, request.id ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  const total = Number(result.recordset[0]?.total_count || 0);
  return {
    withdrawals: result.recordset.map((row) => ({
      ...toWithdrawal(row, { includeBankAccount: true }),
      shopName: row.shop_name,
      sellerUserId: row.seller_user_id
    })),
    pagination: paginationMeta(page, limit, total)
  };
};

export const processWithdrawal = async (adminUserId, requestId, payload = {}) => {
  const nextStatus = String(payload.status || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(nextStatus)) {
    throw queryError(
      "INVALID_WITHDRAWAL_STATUS",
      "Admin chi duoc approved hoac rejected yeu cau rut tien."
    );
  }
  const adminNote = validateNote(payload.adminNote, "adminNote");
  const owner = await pool.request()
    .input("requestId", sql.VarChar, requestId)
    .query("SELECT seller_id FROM WithdrawalRequests WHERE id = @requestId");
  if (!owner.recordset[0]) {
    throw queryError("WITHDRAWAL_NOT_FOUND", "Khong tim thay yeu cau rut tien.", 404);
  }
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, owner.recordset[0].seller_id);
    const requestResult = await transaction.request()
      .input("requestId", sql.VarChar, requestId)
      .query(`
        SELECT request.*, seller.user_id AS seller_user_id
        FROM WithdrawalRequests request WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN Sellers seller ON seller.id = request.seller_id
        WHERE request.id = @requestId
      `);
    const withdrawal = requestResult.recordset[0];
    if (!withdrawal) {
      throw queryError("WITHDRAWAL_NOT_FOUND", "Khong tim thay yeu cau rut tien.", 404);
    }
    if (withdrawal.status !== "pending") {
      throw queryError(
        "WITHDRAWAL_NOT_CANCELLABLE",
        "Yeu cau rut tien nay da duoc xu ly.",
        409
      );
    }
    const wallet = await ensureWalletForSeller(transaction, withdrawal.seller_id);
    await transaction.request()
      .input("requestId", sql.VarChar, requestId)
      .input("status", sql.VarChar, nextStatus)
      .input("adminNote", sql.NVarChar, adminNote)
      .input("adminUserId", sql.VarChar, adminUserId)
      .query(`
        UPDATE WithdrawalRequests
        SET status = @status, admin_note = @adminNote,
            processed_by = @adminUserId, processed_at = GETDATE()
        WHERE id = @requestId
      `);
    await insertLedger(transaction, {
      walletId: wallet.id,
      sellerId: withdrawal.seller_id,
      type: nextStatus === "approved" ? "withdrawal_approved" : "withdrawal_rejected",
      amount: money(withdrawal.amount),
      referenceType: "withdrawal",
      referenceId: requestId,
      idempotencyKey: `wallet:withdrawal-${nextStatus}:${requestId}`,
      description: nextStatus === "approved"
        ? `Admin xac nhan rut tien ${requestId}`
        : `Admin tu choi rut tien ${requestId}`
    });
    const balanceUpdate = nextStatus === "approved"
      ? `withdrawal_hold_balance = withdrawal_hold_balance - @amount,
         withdrawn_total = withdrawn_total + @amount`
      : `withdrawal_hold_balance = withdrawal_hold_balance - @amount,
         available_balance = available_balance + @amount`;
    const update = await transaction.request()
      .input("walletId", sql.VarChar, wallet.id)
      .input("amount", sql.Decimal(18, 2), withdrawal.amount)
      .query(`
        UPDATE ShopWallets
        SET ${balanceUpdate}, updated_at = GETDATE()
        WHERE id = @walletId AND withdrawal_hold_balance >= @amount
      `);
    if (update.rowsAffected[0] !== 1) {
      throw queryError("WALLET_BALANCE_CONFLICT", "So du tam giu khong hop le.", 409);
    }
    await createNotification(transaction, {
      userId: withdrawal.seller_user_id,
      type: "withdrawal_status",
      title: "Cap nhat yeu cau rut tien",
      message: nextStatus === "approved"
        ? "Yeu cau rut tien da duoc duyet."
        : "Yeu cau rut tien da bi tu choi.",
      entityType: "withdrawal",
      entityId: requestId,
      data: { withdrawalId: requestId, status: nextStatus },
      dedupeKey: `withdrawal-status:${requestId}:${nextStatus}`
    });
    const updated = await transaction.request()
      .input("requestId", sql.VarChar, requestId)
      .query("SELECT * FROM WithdrawalRequests WHERE id = @requestId");
    await transaction.commit();
    started = false;
    return toWithdrawal(updated.recordset[0], { includeBankAccount: true });
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
};
