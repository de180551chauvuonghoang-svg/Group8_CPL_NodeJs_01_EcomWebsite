import assert from "node:assert/strict";
import { v4 as uuidv4 } from "uuid";
import { connectDB, pool, sql } from "../src/config/db.js";

process.env.SELLER_WALLET_HOLD_DAYS = "0";
process.env.SELLER_COMMISSION_RATE = "0";
process.env.MIN_WITHDRAWAL_AMOUNT = "100000";

await connectDB();

const suffix = uuidv4().replace(/-/g, "").slice(0, 12);
const ids = {
  sellerUser: `usr_w_${suffix}`,
  seller: `sel_w_${suffix}`,
  product: `prod_w_${suffix}`,
  variant: `var_w_${suffix}`,
  returnOrder: `ord_wr_${suffix}`,
  returnItem: `item_wr_${suffix}`,
  saleOrder: `ord_ws_${suffix}`,
  saleItem: `item_ws_${suffix}`,
};

const cleanup = async () => {
  await pool
    .request()
    .input("sellerId", sql.VarChar, ids.seller)
    .input("sellerUser", sql.VarChar, ids.sellerUser)
    .input("productId", sql.VarChar, ids.product)
    .input("returnOrder", sql.VarChar, ids.returnOrder)
    .input("saleOrder", sql.VarChar, ids.saleOrder).query(`
      DELETE FROM Notifications
      WHERE user_id = @sellerUser OR entity_id IN (@returnOrder, @saleOrder);
      DELETE FROM ReturnStatusHistory
      WHERE return_request_id IN (
        SELECT id FROM ReturnRequests WHERE seller_id = @sellerId
      );
      DELETE FROM WalletTransactions WHERE seller_id = @sellerId;
      DELETE FROM WithdrawalRequests WHERE seller_id = @sellerId;
      DELETE FROM ReturnRequests WHERE seller_id = @sellerId;
      DELETE FROM OrderItemStatusHistory
      WHERE order_item_id IN (@returnOrder, @saleOrder)
         OR order_item_id IN (
           SELECT id FROM OrderItems WHERE order_id IN (@returnOrder, @saleOrder)
         );
      DELETE FROM OrderItems WHERE order_id IN (@returnOrder, @saleOrder);
      DELETE FROM Orders WHERE id IN (@returnOrder, @saleOrder);
      DELETE FROM ShopWallets WHERE seller_id = @sellerId;
      DELETE FROM ProductVariants WHERE product_id = @productId;
      DELETE FROM Products WHERE id = @productId;
      DELETE FROM Sellers WHERE id = @sellerId;
      DELETE FROM Users WHERE id = @sellerUser;
    `);
};

try {
  await cleanup();
  await pool
    .request()
    .input("sellerUser", sql.VarChar, ids.sellerUser)
    .input("sellerId", sql.VarChar, ids.seller)
    .input("productId", sql.VarChar, ids.product)
    .input("variantId", sql.VarChar, ids.variant)
    .input("returnOrder", sql.VarChar, ids.returnOrder)
    .input("returnItem", sql.VarChar, ids.returnItem)
    .input("saleOrder", sql.VarChar, ids.saleOrder)
    .input("saleItem", sql.VarChar, ids.saleItem).query(`
      INSERT INTO Users (id, name, email, password, role)
      VALUES (@sellerUser, 'Wallet test seller', CONCAT(@sellerUser, '@test.local'), 'test', 'seller');

      INSERT INTO Sellers (
        id, user_id, shop_name, shop_phone, shop_address, status,
        bank_name, bank_account_no, bank_account_holder
      ) VALUES (
        @sellerId, @sellerUser, CONCAT('Wallet shop ', @sellerId),
        '0900000000', 'Test address', 'active', 'MB Bank', '1234567890', 'TEST SELLER'
      );

      INSERT INTO Products (id, name, slug, base_price, seller_id)
      VALUES (@productId, 'Wallet test product', CONCAT('wallet-test-', @productId), 500000, @sellerId);
      INSERT INTO ProductVariants (
        id, product_id, sku, price, stock_qty, is_active, is_default
      ) VALUES (
        @variantId, @productId, CONCAT('SKU-', @variantId), 500000, 8, 1, 1
      );

      INSERT INTO Orders (
        id, user_id, status, subtotal, discount_amount, shipping_fee, total,
        shipping_name, shipping_phone, shipping_address
      ) VALUES
        (@returnOrder, 'usr_cust001', 'shipping', 500000, 0, 0, 500000,
         'Wallet customer', '0900000001', 'Test address'),
        (@saleOrder, 'usr_cust001', 'shipping', 500000, 0, 0, 500000,
         'Wallet customer', '0900000001', 'Test address');

      INSERT INTO OrderItems (
        id, order_id, variant_id, quantity, unit_price, total_price,
        product_name, fulfillment_status
      ) VALUES
        (@returnItem, @returnOrder, @variantId, 1, 500000, 500000,
         'Wallet test product', 'shipping'),
        (@saleItem, @saleOrder, @variantId, 1, 500000, 500000,
         'Wallet test product', 'shipping');
    `);

  const walletCreatedOnApproval = await pool
    .request()
    .input("sellerId", sql.VarChar, ids.seller)
    .query(
      "SELECT COUNT(*) AS count FROM ShopWallets WHERE seller_id = @sellerId",
    );
  assert.equal(
    Number(walletCreatedOnApproval.recordset[0].count),
    1,
    "An active seller must receive a wallet automatically",
  );

  const { sellerService } = await import("../src/services/sellerService.js");
  const { createReturnRequest, updateSellerReturn } =
    await import("../src/services/returnService.js");
  const { getSellerWallet, getWalletTransactions } =
    await import("../src/services/sellerWalletQueryService.js");
  const { cancelWithdrawal, createWithdrawal, processWithdrawal } =
    await import("../src/services/sellerWithdrawalService.js");

  await sellerService.updateSellerOrderItem(
    ids.seller,
    ids.sellerUser,
    ids.returnItem,
    {
      fulfillmentStatus: "delivered",
    },
  );
  await sellerService.updateSellerOrderItem(
    ids.seller,
    ids.sellerUser,
    ids.returnItem,
    {
      fulfillmentStatus: "delivered",
    },
  );

  const returnRequest = await createReturnRequest(
    "usr_cust001",
    ids.returnItem,
    {
      quantity: 1,
      reason: "San pham khong phu hop nhu cau su dung",
    },
  );
  await updateSellerReturn(ids.seller, ids.sellerUser, returnRequest.id, {
    status: "approved",
    sellerResponse: "Dong y nhan lai san pham",
  });
  await updateSellerReturn(ids.seller, ids.sellerUser, returnRequest.id, {
    status: "received",
    sellerResponse: "Da nhan lai san pham",
  });

  let walletData = await getSellerWallet(ids.seller);
  assert.equal(walletData.wallet.lifetimeEarnings, 0);
  assert.equal(walletData.wallet.pendingBalance, 0);

  await sellerService.updateSellerOrderItem(
    ids.seller,
    ids.sellerUser,
    ids.saleItem,
    {
      fulfillmentStatus: "delivered",
    },
  );
  walletData = await getSellerWallet(ids.seller);
  assert.equal(walletData.wallet.availableBalance, 500000);
  assert.equal(walletData.wallet.lifetimeEarnings, 500000);

  let ledger = await getWalletTransactions(ids.seller, { page: 1, limit: 50 });
  assert.equal(
    ledger.transactions.filter((item) => item.type === "sale_pending").length,
    2,
    "Each delivered item must be recorded exactly once",
  );
  assert.equal(
    ledger.transactions.filter((item) => item.type === "sale_reversed").length,
    1,
  );

  const cancelled = await createWithdrawal(ids.seller, { amount: 100000 });
  await cancelWithdrawal(ids.seller, cancelled.id);
  walletData = await getSellerWallet(ids.seller);
  assert.equal(walletData.wallet.availableBalance, 500000);
  assert.equal(walletData.wallet.withdrawalHoldBalance, 0);

  const approved = await createWithdrawal(ids.seller, { amount: 100000 });
  await processWithdrawal("usr_admin001", approved.id, {
    status: "approved",
    adminNote: "Test manual transfer",
  });
  walletData = await getSellerWallet(ids.seller);
  assert.equal(walletData.wallet.availableBalance, 400000);
  assert.equal(walletData.wallet.withdrawnTotal, 100000);
  assert.equal(walletData.wallet.withdrawalHoldBalance, 0);

  const rejected = await createWithdrawal(ids.seller, { amount: 100000 });
  await processWithdrawal("usr_admin001", rejected.id, {
    status: "rejected",
    adminNote: "Test rejection",
  });
  walletData = await getSellerWallet(ids.seller);
  assert.equal(walletData.wallet.availableBalance, 400000);
  assert.equal(walletData.wallet.withdrawalHoldBalance, 0);

  ledger = await getWalletTransactions(ids.seller, { page: 1, limit: 50 });
  assert.equal(
    ledger.transactions.filter((item) => item.type === "withdrawal_hold")
      .length,
    3,
  );
  assert.equal(
    ledger.transactions.filter((item) => item.type === "withdrawal_cancelled")
      .length,
    1,
  );
  assert.equal(
    ledger.transactions.filter((item) => item.type === "withdrawal_approved")
      .length,
    1,
  );
  assert.equal(
    ledger.transactions.filter((item) => item.type === "withdrawal_rejected")
      .length,
    1,
  );

  const concurrent = await Promise.allSettled([
    createWithdrawal(ids.seller, {
      amount: 300000,
      sellerNote: "Concurrent A",
    }),
    createWithdrawal(ids.seller, {
      amount: 300000,
      sellerNote: "Concurrent B",
    }),
  ]);
  const fulfilled = concurrent.filter(
    (result) => result.status === "fulfilled",
  );
  const rejectedConcurrent = concurrent.filter(
    (result) => result.status === "rejected",
  );
  assert.equal(
    fulfilled.length,
    1,
    "Wallet lock must allow only one oversized concurrent pair",
  );
  assert.equal(rejectedConcurrent.length, 1);
  assert.equal(
    rejectedConcurrent[0].reason.code,
    "INSUFFICIENT_AVAILABLE_BALANCE",
  );
  await cancelWithdrawal(ids.seller, fulfilled[0].value.id);
  walletData = await getSellerWallet(ids.seller);
  assert.equal(walletData.wallet.availableBalance, 400000);
  assert.equal(walletData.wallet.withdrawalHoldBalance, 0);

  console.log(
    "[PASS] Seller wallet lifecycle, return reversal, idempotency, and withdrawal flow.",
  );
} finally {
  await cleanup();
  await pool.close();
}
