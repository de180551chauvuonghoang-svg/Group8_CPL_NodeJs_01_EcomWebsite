import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import { createNotification } from "./notificationService.js";
import {
  paginationMeta,
  parsePagination,
  queryError,
} from "../utils/queryUtils.js";
import {
  acquireSellerWalletLock,
  ensureWalletForSeller,
  getMinimumWithdrawalAmount,
  insertLedger,
  syncSellerWallet,
} from "./sellerWalletService.js";

const WITHDRAWAL_STATUSES = Object.freeze([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

const withdrawalId = () => `wdr_${uuidv4().replace(/-/g, "")}`;
const money = (value) => Number(value || 0);

const maskAccountNo = (value) => {
  const accountNo = String(value || "");
  if (!accountNo) return null;
  const visible = accountNo.slice(-4);
  return `${"*".repeat(Math.max(0, accountNo.length - visible.length))}${visible}`;
};

const validateNote = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > 500) {
    throw queryError(
      "INVALID_WITHDRAWAL_NOTE",
      `${fieldName} khong duoc vuot qua 500 ky tu.`,
    );
  }
  return value.trim() || null;
};

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
  processedAt: row.processed_at,
});

const validateWithdrawalAmount = (value) => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < getMinimumWithdrawalAmount()) {
    throw queryError(
      "INVALID_WITHDRAWAL_AMOUNT",
      `So tien rut phai la so nguyen VND va toi thieu ${getMinimumWithdrawalAmount()}.`,
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
    const sellerResult = await transaction
      .request()
      .input("sellerId", sql.VarChar, sellerId).query(`
        SELECT bank_name, bank_account_no, bank_account_holder
        FROM Sellers WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @sellerId AND status = 'active'
      `);
    const seller = sellerResult.recordset[0];
    if (!seller)
      throw queryError("SELLER_NOT_FOUND", "Khong tim thay seller.", 404);
    if (
      !seller.bank_name ||
      !seller.bank_account_no ||
      !seller.bank_account_holder
    ) {
      throw queryError(
        "BANK_INFO_REQUIRED",
        "Vui long cap nhat day du thong tin ngan hang.",
      );
    }
    if (money(wallet.available_balance) < amount) {
      throw queryError(
        "INSUFFICIENT_AVAILABLE_BALANCE",
        "So du kha dung khong du de rut tien.",
        409,
      );
    }
    const id = withdrawalId();
    const created = await transaction
      .request()
      .input("id", sql.VarChar, id)
      .input("sellerId", sql.VarChar, sellerId)
      .input("amount", sql.Decimal(18, 2), amount)
      .input("bankName", sql.NVarChar, seller.bank_name)
      .input("bankAccountNo", sql.VarChar, seller.bank_account_no)
      .input("bankAccountHolder", sql.NVarChar, seller.bank_account_holder)
      .input("sellerNote", sql.NVarChar, sellerNote).query(`
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
      description: `Tam giu cho yeu cau rut tien ${id}`,
    });
    const update = await transaction
      .request()
      .input("walletId", sql.VarChar, wallet.id)
      .input("amount", sql.Decimal(18, 2), amount).query(`
        UPDATE ShopWallets
        SET available_balance = available_balance - @amount,
            withdrawal_hold_balance = withdrawal_hold_balance + @amount,
            updated_at = GETDATE()
        WHERE id = @walletId AND available_balance >= @amount
      `);
    if (update.rowsAffected[0] !== 1) {
      throw queryError(
        "INSUFFICIENT_AVAILABLE_BALANCE",
        "So du kha dung khong du.",
        409,
      );
    }
    await transaction.commit();
    started = false;
    return toWithdrawal(created.recordset[0]);
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

export const listSellerWithdrawals = async (sellerId, query = {}) => {
  await syncSellerWallet(sellerId);
  const { page, limit, offset } = parsePagination(query);
  const status = String(query.status || "all")
    .trim()
    .toLowerCase();
  if (status !== "all" && !WITHDRAWAL_STATUSES.includes(status)) {
    throw queryError(
      "INVALID_WITHDRAWAL_STATUS",
      "Trang thai rut tien khong hop le.",
    );
  }
  const result = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("status", sql.VarChar, status)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
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
    pagination: paginationMeta(page, limit, total),
  };
};

export const cancelWithdrawal = async (sellerId, requestId) => {
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, sellerId);
    const requestResult = await transaction
      .request()
      .input("sellerId", sql.VarChar, sellerId)
      .input("requestId", sql.VarChar, requestId).query(`
        SELECT * FROM WithdrawalRequests WITH (UPDLOCK, HOLDLOCK)
        WHERE id = @requestId AND seller_id = @sellerId
      `);
    const withdrawal = requestResult.recordset[0];
    if (!withdrawal) {
      throw queryError(
        "WITHDRAWAL_NOT_FOUND",
        "Khong tim thay yeu cau rut tien.",
        404,
      );
    }
    if (withdrawal.status !== "pending") {
      throw queryError(
        "WITHDRAWAL_NOT_CANCELLABLE",
        "Chi co the huy yeu cau rut tien dang cho xu ly.",
        409,
      );
    }
    const wallet = await ensureWalletForSeller(transaction, sellerId);
    await transaction.request().input("requestId", sql.VarChar, requestId)
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
      description: `Seller huy yeu cau rut tien ${requestId}`,
    });
    const update = await transaction
      .request()
      .input("walletId", sql.VarChar, wallet.id)
      .input("amount", sql.Decimal(18, 2), withdrawal.amount).query(`
        UPDATE ShopWallets
        SET withdrawal_hold_balance = withdrawal_hold_balance - @amount,
            available_balance = available_balance + @amount,
            updated_at = GETDATE()
        WHERE id = @walletId AND withdrawal_hold_balance >= @amount
      `);
    if (update.rowsAffected[0] !== 1) {
      throw queryError(
        "WALLET_BALANCE_CONFLICT",
        "So du tam giu khong hop le.",
        409,
      );
    }
    const updated = await transaction
      .request()
      .input("requestId", sql.VarChar, requestId)
      .query("SELECT * FROM WithdrawalRequests WHERE id = @requestId");
    await transaction.commit();
    started = false;
    return toWithdrawal(updated.recordset[0]);
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

export const listAdminWithdrawals = async (query = {}) => {
  const { page, limit, offset } = parsePagination(query);
  const status = String(query.status || "all")
    .trim()
    .toLowerCase();
  if (status !== "all" && !WITHDRAWAL_STATUSES.includes(status)) {
    throw queryError(
      "INVALID_WITHDRAWAL_STATUS",
      "Trang thai rut tien khong hop le.",
    );
  }
  const result = await pool
    .request()
    .input("status", sql.VarChar, status)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
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
      sellerUserId: row.seller_user_id,
    })),
    pagination: paginationMeta(page, limit, total),
  };
};

export const processWithdrawal = async (
  adminUserId,
  requestId,
  payload = {},
) => {
  const nextStatus = String(payload.status || "")
    .trim()
    .toLowerCase();
  if (!["approved", "rejected"].includes(nextStatus)) {
    throw queryError(
      "INVALID_WITHDRAWAL_STATUS",
      "Admin chi duoc approved hoac rejected yeu cau rut tien.",
    );
  }
  const adminNote = validateNote(payload.adminNote, "adminNote");
  const owner = await pool
    .request()
    .input("requestId", sql.VarChar, requestId)
    .query("SELECT seller_id FROM WithdrawalRequests WHERE id = @requestId");
  if (!owner.recordset[0]) {
    throw queryError(
      "WITHDRAWAL_NOT_FOUND",
      "Khong tim thay yeu cau rut tien.",
      404,
    );
  }
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    await acquireSellerWalletLock(transaction, owner.recordset[0].seller_id);
    const requestResult = await transaction
      .request()
      .input("requestId", sql.VarChar, requestId).query(`
        SELECT request.*, seller.user_id AS seller_user_id
        FROM WithdrawalRequests request WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN Sellers seller ON seller.id = request.seller_id
        WHERE request.id = @requestId
      `);
    const withdrawal = requestResult.recordset[0];
    if (!withdrawal) {
      throw queryError(
        "WITHDRAWAL_NOT_FOUND",
        "Khong tim thay yeu cau rut tien.",
        404,
      );
    }
    if (withdrawal.status !== "pending") {
      throw queryError(
        "WITHDRAWAL_NOT_CANCELLABLE",
        "Yeu cau rut tien nay da duoc xu ly.",
        409,
      );
    }
    const wallet = await ensureWalletForSeller(
      transaction,
      withdrawal.seller_id,
    );
    await transaction
      .request()
      .input("requestId", sql.VarChar, requestId)
      .input("status", sql.VarChar, nextStatus)
      .input("adminNote", sql.NVarChar, adminNote)
      .input("adminUserId", sql.VarChar, adminUserId).query(`
        UPDATE WithdrawalRequests
        SET status = @status, admin_note = @adminNote,
            processed_by = @adminUserId, processed_at = GETDATE()
        WHERE id = @requestId
      `);
    await insertLedger(transaction, {
      walletId: wallet.id,
      sellerId: withdrawal.seller_id,
      type:
        nextStatus === "approved"
          ? "withdrawal_approved"
          : "withdrawal_rejected",
      amount: money(withdrawal.amount),
      referenceType: "withdrawal",
      referenceId: requestId,
      idempotencyKey: `wallet:withdrawal-${nextStatus}:${requestId}`,
      description:
        nextStatus === "approved"
          ? `Admin xac nhan rut tien ${requestId}`
          : `Admin tu choi rut tien ${requestId}`,
    });
    const balanceUpdate =
      nextStatus === "approved"
        ? `withdrawal_hold_balance = withdrawal_hold_balance - @amount,
         withdrawn_total = withdrawn_total + @amount`
        : `withdrawal_hold_balance = withdrawal_hold_balance - @amount,
         available_balance = available_balance + @amount`;
    const update = await transaction
      .request()
      .input("walletId", sql.VarChar, wallet.id)
      .input("amount", sql.Decimal(18, 2), withdrawal.amount).query(`
        UPDATE ShopWallets
        SET ${balanceUpdate}, updated_at = GETDATE()
        WHERE id = @walletId AND withdrawal_hold_balance >= @amount
      `);
    if (update.rowsAffected[0] !== 1) {
      throw queryError(
        "WALLET_BALANCE_CONFLICT",
        "So du tam giu khong hop le.",
        409,
      );
    }
    await createNotification(transaction, {
      userId: withdrawal.seller_user_id,
      type: "withdrawal_status",
      title: "Cap nhat yeu cau rut tien",
      message:
        nextStatus === "approved"
          ? "Yeu cau rut tien da duoc duyet."
          : "Yeu cau rut tien da bi tu choi.",
      entityType: "withdrawal",
      entityId: requestId,
      data: { withdrawalId: requestId, status: nextStatus },
      dedupeKey: `withdrawal-status:${requestId}:${nextStatus}`,
    });
    const updated = await transaction
      .request()
      .input("requestId", sql.VarChar, requestId)
      .query("SELECT * FROM WithdrawalRequests WHERE id = @requestId");
    await transaction.commit();
    started = false;
    return toWithdrawal(updated.recordset[0], { includeBankAccount: true });
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
