import { pool, sql } from "../config/db.js";
import {
  paginationMeta,
  parsePagination,
  queryError,
} from "../utils/queryUtils.js";
import {
  WALLET_TRANSACTION_TYPES,
  getHoldDays,
  getMinimumWithdrawalAmount,
  syncSellerWallet,
} from "./sellerWalletService.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const money = (value) => Number(value || 0);

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
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  };
  if (from && !isValidDate(from)) {
    throw queryError(
      "INVALID_WALLET_DATE",
      "from phai la ngay YYYY-MM-DD hop le.",
    );
  }
  if (to && !isValidDate(to)) {
    throw queryError(
      "INVALID_WALLET_DATE",
      "to phai la ngay YYYY-MM-DD hop le.",
    );
  }
  if (from && to && from > to) {
    throw queryError("INVALID_WALLET_DATE_RANGE", "from khong duoc sau to.");
  }
  return { from, to };
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
  updatedAt: row.updated_at,
});

const toWalletTransaction = (row) => ({
  id: row.id,
  type: row.type,
  amount: money(row.amount),
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  availableAt: row.available_at,
  description: row.description,
  createdAt: row.created_at,
});

export const getSellerWallet = async (sellerId) => {
  await syncSellerWallet(sellerId);
  const result = await pool.request().input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT wallet.*, seller.bank_name, seller.bank_account_no,
             seller.bank_account_holder
      FROM ShopWallets wallet
      INNER JOIN Sellers seller ON seller.id = wallet.seller_id
      WHERE wallet.seller_id = @sellerId
    `);
  const row = result.recordset[0];
  if (!row)
    throw queryError("WALLET_NOT_FOUND", "Khong tim thay vi seller.", 404);
  return {
    wallet: toWallet(row),
    bankInfo: {
      bankName: row.bank_name,
      accountHolder: row.bank_account_holder,
      maskedAccountNo: maskAccountNo(row.bank_account_no),
    },
    minimumWithdrawalAmount: getMinimumWithdrawalAmount(),
    holdDays: getHoldDays(),
  };
};

export const getWalletTransactions = async (sellerId, query = {}) => {
  await syncSellerWallet(sellerId);
  const { page, limit, offset } = parsePagination(query);
  const { from, to } = parseDateRange(query);
  const type = String(query.type || "all")
    .trim()
    .toLowerCase();
  if (type !== "all" && !WALLET_TRANSACTION_TYPES.includes(type)) {
    throw queryError(
      "INVALID_WALLET_TRANSACTION_TYPE",
      "type giao dich vi khong hop le.",
    );
  }
  const result = await pool
    .request()
    .input("sellerId", sql.VarChar, sellerId)
    .input("type", sql.VarChar, type)
    .input("from", sql.Date, from)
    .input("to", sql.Date, to)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
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
    pagination: paginationMeta(page, limit, total),
  };
};
