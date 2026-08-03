import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import { queryError } from "../utils/queryUtils.js";

export const WALLET_TRANSACTION_TYPES = Object.freeze([
  "sale_pending",
  "sale_released",
  "sale_reversed",
  "withdrawal_hold",
  "withdrawal_approved",
  "withdrawal_rejected",
  "withdrawal_cancelled",
]);

const walletId = () => `wallet_${uuidv4().replace(/-/g, "")}`;
const transactionId = () => `wtx_${uuidv4().replace(/-/g, "")}`;
const money = (value) => Number(value || 0);
const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const getHoldDays = () => {
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

export const acquireSellerWalletLock = async (transaction, sellerId) => {
  const result = await transaction
    .request()
    .input("resource", sql.NVarChar, `seller-wallet:${sellerId}`).query(`
      DECLARE @lock_result INT;
      EXEC @lock_result = sys.sp_getapplock
        @Resource = @resource,
        @LockMode = 'Exclusive',
        @LockOwner = 'Transaction',
        @LockTimeout = 10000;
      SELECT @lock_result AS lock_result;
    `);
  if (Number(result.recordset[0]?.lock_result) < 0) {
    throw queryError(
      "WALLET_LOCK_TIMEOUT",
      "Khong the khoa vi de xu ly giao dich.",
      409,
    );
  }
};

export const ensureWalletForSeller = async (db, sellerId) => {
  await db
    .request()
    .input("walletId", sql.VarChar, walletId())
    .input("sellerId", sql.VarChar, sellerId).query(`
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

  const result = await db.request().input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT *
      FROM ShopWallets WITH (UPDLOCK, ROWLOCK)
      WHERE seller_id = @sellerId
    `);
  if (!result.recordset[0]) {
    const seller = await db
      .request()
      .input("sellerId", sql.VarChar, sellerId)
      .query("SELECT id FROM Sellers WHERE id = @sellerId");
    throw seller.recordset[0]
      ? queryError("WALLET_NOT_FOUND", "Khong tim thay vi seller.", 404)
      : queryError("SELLER_NOT_FOUND", "Khong tim thay seller.", 404);
  }
  return result.recordset[0];
};

export const insertLedger = async (db, data) => {
  const result = await db
    .request()
    .input("id", sql.VarChar, transactionId())
    .input("walletId", sql.VarChar, data.walletId)
    .input("sellerId", sql.VarChar, data.sellerId)
    .input("type", sql.VarChar, data.type)
    .input("amount", sql.Decimal(18, 2), data.amount)
    .input("referenceType", sql.VarChar, data.referenceType)
    .input("referenceId", sql.VarChar, data.referenceId)
    .input("idempotencyKey", sql.VarChar, data.idempotencyKey)
    .input("availableAt", sql.DateTime2, data.availableAt || null)
    .input("description", sql.NVarChar, data.description || null).query(`
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
  const existing = await db
    .request()
    .input("key", sql.VarChar, `wallet:sale-pending:${orderItemId}`).query(`
      SELECT id FROM WalletTransactions WITH (UPDLOCK, HOLDLOCK)
      WHERE idempotency_key = @key
    `);
  if (existing.recordset[0]) return null;

  const result = await db
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("orderItemId", sql.VarChar, orderItemId).query(`
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
    throw queryError(
      "ORDER_ITEM_NOT_FOUND",
      "Khong tim thay dong don hang delivered.",
      404,
    );
  }

  const gross = money(item.total_price);
  const voucherShare =
    item.shop_discount !== null && money(item.eligible_subtotal) > 0
      ? roundMoney(
          (money(item.shop_discount) * gross) / money(item.eligible_subtotal),
        )
      : money(item.legacy_subtotal) > 0
        ? roundMoney(
            (money(item.legacy_discount) * gross) / money(item.legacy_subtotal),
          )
        : 0;
  const discount = Math.min(gross, Math.max(0, voucherShare));
  const commission = roundMoney((gross - discount) * getCommissionRate());
  const netAmount = roundMoney(Math.max(0, gross - discount - commission));
  if (netAmount <= 0) return null;

  const deliveredAt = new Date(
    item.delivered_at || item.updated_at || Date.now(),
  );
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
    description: `Doanh thu cho ${item.product_name}`,
  });
  if (!ledger) return null;

  await db
    .request()
    .input("walletId", sql.VarChar, wallet.id)
    .input("amount", sql.Decimal(18, 2), netAmount).query(`
      UPDATE ShopWallets
      SET pending_balance = pending_balance + @amount,
          lifetime_earnings = lifetime_earnings + @amount,
          updated_at = GETDATE()
      WHERE id = @walletId
    `);
  return ledger;
};

export const reverseSaleForReturn = async (
  db,
  { sellerId, returnId, orderItemId, quantity },
) => {
  await recordDeliveredSale(db, { sellerId, orderItemId });
  const wallet = await ensureWalletForSeller(db, sellerId);
  const result = await db
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("returnId", sql.VarChar, returnId)
    .input("orderItemId", sql.VarChar, orderItemId).query(`
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
  const remaining = roundMoney(
    money(row.pending_amount) - money(row.reversed_amount),
  );
  const isLastReturn =
    Number(row.returned_quantity) + Number(quantity) >= purchasedQuantity;
  const proportional = roundMoney(
    (money(row.pending_amount) * Number(quantity)) / purchasedQuantity,
  );
  const reversalAmount = Math.min(
    remaining,
    isLastReturn ? remaining : proportional,
  );
  if (reversalAmount <= 0) return null;

  const ledger = await insertLedger(db, {
    walletId: wallet.id,
    sellerId,
    type: "sale_reversed",
    amount: reversalAmount,
    referenceType: "return",
    referenceId: returnId,
    idempotencyKey: key,
    description: `Dao doanh thu do tra hang ${returnId}`,
  });
  if (!ledger) return null;

  const balanceColumn = Number(row.is_released)
    ? "available_balance"
    : "pending_balance";
  const update = await db
    .request()
    .input("walletId", sql.VarChar, wallet.id)
    .input("amount", sql.Decimal(18, 2), reversalAmount).query(`
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
      409,
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
    const due = await transaction
      .request()
      .input("sellerId", sql.VarChar, sellerId).query(`
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
        description: `Giai phong doanh thu ${row.order_item_id}`,
      });
      if (!ledger) continue;
      const update = await transaction
        .request()
        .input("walletId", sql.VarChar, wallet.id)
        .input("amount", sql.Decimal(18, 2), amount).query(`
          UPDATE ShopWallets
          SET pending_balance = pending_balance - @amount,
              available_balance = available_balance + @amount,
              updated_at = GETDATE()
          WHERE id = @walletId AND pending_balance >= @amount
        `);
      if (update.rowsAffected[0] !== 1) {
        throw queryError(
          "WALLET_BALANCE_CONFLICT",
          "So du pending khong hop le.",
          409,
        );
      }
    }
    await transaction.commit();
    started = false;
  } catch (error) {
    if (started) {
      try {
        await transaction.rollback();
      } catch (_) {
        /* preserve original error */
      }
    }
    throw error;
  }
};

export const syncSellerWallet = async (sellerId) => {
  await ensureWalletForSeller(pool, sellerId);
  const missingSales = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId).query(`
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
      await recordDeliveredSale(transaction, {
        sellerId,
        orderItemId: item.id,
      });
      await transaction.commit();
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {
        /* preserve original error */
      }
      throw error;
    }
  }

  const missingReversals = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId).query(`
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
        quantity: item.quantity,
      });
      await transaction.commit();
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (_) {
        /* preserve original error */
      }
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
        console.error(
          `[SellerWallet] Reconcile failed for ${seller.id}:`,
          error.message,
        );
      }
    }
  } finally {
    releaseJobRunning = false;
  }
};

export const startSellerWalletReleaseJob = () => {
  const configuredInterval = Number(
    process.env.SELLER_WALLET_RELEASE_INTERVAL_MS ?? 300000,
  );
  const intervalMs =
    Number.isInteger(configuredInterval) && configuredInterval >= 10000
      ? configuredInterval
      : 300000;
  const run = () =>
    reconcileAllActiveSellerWallets().catch((error) => {
      console.error("[SellerWallet] Reconcile job failed:", error.message);
    });
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
};
