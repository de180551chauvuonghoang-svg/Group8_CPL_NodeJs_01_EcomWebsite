import jwt from "jsonwebtoken";
import { connectDB, pool, sql } from "../src/config/db.js";

const baseUrl = process.env.VERIFY_API_URL || "http://localhost:5000";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  let body = null;
  try { body = await response.json(); } catch (_) { /* validation handles non-JSON */ }
  return { status: response.status, body };
};

const returnFixtureIds = [];
let receivedReturnFixtureId = null;

const cleanupReturnFixtures = async () => {
  if (returnFixtureIds.length === 0) return;
  const cleanup = pool.request();
  const parameters = returnFixtureIds.map((id, index) => {
    const name = `returnId${index}`;
    cleanup.input(name, sql.VarChar, id);
    return `@${name}`;
  });
  cleanup.input("receivedReturnId", sql.VarChar, receivedReturnFixtureId);
  await cleanup.query(`
    UPDATE default_variant
    SET stock_qty = default_variant.stock_qty - return_request.quantity,
        updated_at = GETDATE()
    FROM ProductVariants default_variant
    INNER JOIN OrderItems item
      ON default_variant.product_id = (
        SELECT source_variant.product_id
        FROM ProductVariants source_variant
        WHERE source_variant.id = item.variant_id
      )
    INNER JOIN ReturnRequests return_request ON return_request.order_item_id = item.id
    WHERE return_request.id = @receivedReturnId
      AND return_request.status = 'item_returned'
      AND default_variant.is_default = 1;

    UPDATE wallet
    SET available_balance = available_balance + CASE WHEN released.id IS NOT NULL THEN reversal.amount ELSE 0 END,
        pending_balance = pending_balance + CASE WHEN released.id IS NULL THEN reversal.amount ELSE 0 END,
        lifetime_earnings = lifetime_earnings + reversal.amount,
        updated_at = GETDATE()
    FROM ShopWallets wallet
    INNER JOIN WalletTransactions reversal
      ON reversal.wallet_id = wallet.id
     AND reversal.type = 'sale_reversed'
     AND reversal.reference_type = 'return'
     AND reversal.reference_id = @receivedReturnId
    INNER JOIN ReturnRequests return_request ON return_request.id = reversal.reference_id
    LEFT JOIN WalletTransactions released
      ON released.wallet_id = wallet.id
     AND released.idempotency_key = CONCAT('wallet:sale-release:', return_request.order_item_id);

    DELETE FROM WalletTransactions
    WHERE type = 'sale_reversed'
      AND reference_type = 'return'
      AND reference_id IN (${parameters.join(", ")});

    DELETE FROM InventoryLogs WHERE reference_id IN (${parameters.join(", ")});
    DELETE FROM Notifications
    WHERE entity_type = 'return' AND entity_id IN (${parameters.join(", ")});
    DELETE FROM ReturnStatusHistory WHERE return_request_id IN (${parameters.join(", ")});
    DELETE FROM ReturnRequests WHERE id IN (${parameters.join(", ")});
  `);
};

await connectDB();
try {
  const seller = (await pool.request().query(`
    SELECT TOP 1 users.id, users.email, users.role, seller.id AS seller_id
    FROM Users users
    INNER JOIN Sellers seller ON seller.user_id = users.id
    WHERE users.role = 'seller' AND seller.status = 'active'
    ORDER BY seller.id
  `)).recordset[0];
  const customer = (await pool.request().query(`
    SELECT TOP 1 id, email, role
    FROM Users
    WHERE role = 'customer'
    ORDER BY id
  `)).recordset[0];
  const admin = (await pool.request().query(`
    SELECT TOP 1 id, email, role
    FROM Users
    WHERE role = 'admin'
    ORDER BY id
  `)).recordset[0];
  assert(seller && customer && admin, "Seller, customer, and admin fixtures are required.");
  assert(process.env.ACCESS_TOKEN_SECRET, "ACCESS_TOKEN_SECRET is required.");
  const makeToken = (user) => jwt.sign({
    userID: user.id,
    email: user.email,
    role: user.role
  }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5m" });
  const sellerToken = makeToken(seller);
  const customerToken = makeToken(customer);
  const adminToken = makeToken(admin);

  const checks = [
    ["health", "/api/health", null, 200],
    ["dashboardTasks", "/api/seller/dashboard-tasks", sellerToken, 200],
    ["dashboardStats", "/api/seller/dashboard-stats", sellerToken, 200],
    ["products", "/api/seller/products?page=1&limit=2&status=all", sellerToken, 200],
    ["orders", "/api/seller/orders?page=1&limit=2&status=all", sellerToken, 200],
    ["coupons", "/api/seller/coupons?page=1&limit=2&status=all", sellerToken, 200],
    ["reviews", "/api/seller/reviews?page=1&limit=2&status=all", sellerToken, 200],
    ["returns", "/api/seller/returns?page=1&limit=2&status=all", sellerToken, 200],
    ["approvedReturns", "/api/seller/returns?page=1&limit=2&status=approved", sellerToken, 200],
    ["financeSummary", "/api/seller/finance/summary", sellerToken, 200],
    ["financeTransactions", "/api/seller/finance/transactions?page=1&limit=2&status=all", sellerToken, 200],
    ["wallet", "/api/seller/wallet", sellerToken, 200],
    ["walletTransactions", "/api/seller/wallet/transactions?page=1&limit=2", sellerToken, 200],
    ["withdrawals", "/api/seller/withdrawals?page=1&limit=2&status=all", sellerToken, 200],
    ["adminWithdrawals", "/api/admin/withdrawals?page=1&limit=2&status=all", adminToken, 200],
    ["notifications", "/api/notifications?page=1&limit=2", sellerToken, 200],
    ["followStatus", `/api/shops/${seller.seller_id}/follow-status`, customerToken, 200],
    ["publicShop", `/api/seller/shops/${seller.seller_id}`, null, 200]
  ];
  const results = {};
  for (const [name, path, token, expectedStatus] of checks) {
    const response = await request(path, token);
    assert(response.status === expectedStatus, `${name} returned HTTP ${response.status}.`);
    assert(response.body?.status === "success", `${name} did not return a success body.`);
    if (name === "dashboardTasks") {
      const expectedFields = [
        "ordersToProcess",
        "overdueOrders",
        "unreadMessages",
        "outOfStockProducts",
        "lowStockProducts",
        "unrepliedReviews",
        "pendingReturns",
        "overdueAfterHours"
      ];
      assert(
        expectedFields.every((field) => Number.isInteger(response.body?.data?.[field])),
        "Dashboard task response must use the documented camelCase counters."
      );
      assert(response.body.data.overdueAfterHours === 24, "Dashboard overdue threshold must be 24 hours.");
    }
    if (name === "dashboardStats") {
      assert(Array.isArray(response.body?.data?.topProducts), "topProducts must be an array.");
      assert(Array.isArray(response.body?.data?.topRatedProducts), "topRatedProducts must be an array.");
      assert(response.body.data.topProducts.length <= 5, "topProducts must contain at most 5 items.");
      assert(response.body.data.topRatedProducts.length <= 5, "topRatedProducts must contain at most 5 items.");
    }
    if (name === "wallet") {
      assert(
        Number.isFinite(response.body?.data?.wallet?.availableBalance),
        "Wallet response must include a numeric availableBalance."
      );
      assert(
        Number.isInteger(response.body?.data?.minimumWithdrawalAmount),
        "Wallet response must include minimumWithdrawalAmount."
      );
    }
    results[name] = response.status;
  }

  const uploadForm = new FormData();
  uploadForm.set("purpose", "product");
  const uploadValidation = await request("/api/seller/uploads/images", sellerToken, {
    method: "POST",
    body: uploadForm
  });
  assert(uploadValidation.status === 400, "Upload without a file must return HTTP 400.");
  assert(uploadValidation.body?.code === "IMAGE_FILE_REQUIRED", "Upload validation code is invalid.");
  results.uploadValidation = uploadValidation.status;

  const fakeImageForm = new FormData();
  fakeImageForm.set("purpose", "product");
  fakeImageForm.set("file", new Blob(["not-an-image"], { type: "image/png" }), "fake.png");
  const fakeImage = await request("/api/seller/uploads/images", sellerToken, {
    method: "POST",
    body: fakeImageForm
  });
  assert(fakeImage.status === 400, "Spoofed image content must return HTTP 400.");
  assert(fakeImage.body?.code === "INVALID_IMAGE_CONTENT", "Spoofed image error code is invalid.");
  results.uploadContentValidation = fakeImage.status;

  const forbiddenUpload = await request("/api/seller/uploads/images", customerToken, {
    method: "POST",
    body: new FormData()
  });
  assert(forbiddenUpload.status === 403, "Customer must not access seller uploads.");
  results.customerUploadIsolation = forbiddenUpload.status;

  const readAll = await request("/api/notifications/read-all", customerToken, {
    method: "POST"
  });
  assert(readAll.status === 200, "POST notification read-all must return HTTP 200.");
  assert(Number.isInteger(readAll.body?.data?.updated), "Notification read-all response is invalid.");
  results.notificationReadAll = readAll.status;

  const fakeRefund = await request("/api/seller/returns/not-a-real-return", sellerToken, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "refunded" })
  });
  assert(fakeRefund.status === 409, "Seller-created refunded status must return HTTP 409.");
  assert(
    fakeRefund.body?.code === "REFUND_REQUIRES_PAYMENT_PROCESSING",
    "Seller-created refunded error code is invalid."
  );
  results.sellerRefundGuard = fakeRefund.status;

  const returnItem = (await pool.request()
    .input("sellerId", sql.VarChar, seller.seller_id)
    .query(`
      SELECT TOP 1 item.id AS order_item_id,
             orders.user_id AS customer_user_id
      FROM OrderItems item
      INNER JOIN Orders orders ON orders.id = item.order_id
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      WHERE product.seller_id = @sellerId
        AND item.fulfillment_status = 'delivered'
      ORDER BY item.id
    `)).recordset[0];
  assert(returnItem, "A seller order item is required for return transition verification.");

  const fixtureSuffix = Date.now();
  const returnFixtures = [
    { id: `ret_verify_${fixtureSuffix}_a`, initialStatus: "requested", nextStatus: "accepted", expectedStatus: "approved" },
    { id: `ret_verify_${fixtureSuffix}_r`, initialStatus: "requested", nextStatus: "rejected", expectedStatus: "rejected" },
    { id: `ret_verify_${fixtureSuffix}_i`, initialStatus: "accepted", nextStatus: "item_returned", expectedStatus: "received" }
  ];
  receivedReturnFixtureId = returnFixtures[2].id;

  for (const fixture of returnFixtures) {
    await pool.request()
      .input("id", sql.VarChar, fixture.id)
      .input("orderItemId", sql.VarChar, returnItem.order_item_id)
      .input("customerUserId", sql.VarChar, returnItem.customer_user_id)
      .input("sellerId", sql.VarChar, seller.seller_id)
      .input("status", sql.VarChar, fixture.initialStatus)
      .query(`
        INSERT INTO ReturnRequests (
          id, order_item_id, customer_user_id, seller_id,
          quantity, reason, status, requested_at, updated_at
        ) VALUES (
          @id, @orderItemId, @customerUserId, @sellerId,
          1, N'HTTP verification fixture', @status, GETDATE(), GETDATE()
        )
      `);
    returnFixtureIds.push(fixture.id);

    const transition = await request(`/api/seller/returns/${fixture.id}`, sellerToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: fixture.nextStatus,
        sellerResponse: fixture.nextStatus === "rejected"
          ? "Tu choi trong bai verify"
          : "Xac nhan trong bai verify"
      })
    });
    assert(transition.status === 200, `${fixture.nextStatus} return transition must return HTTP 200.`);
    assert(
      transition.body?.data?.return?.status === fixture.expectedStatus,
      `${fixture.nextStatus} return transition has an invalid public status.`
    );
    assert(
      typeof transition.body?.data?.return?.customer_user_id === "string",
      `${fixture.nextStatus} must return customer_user_id as a string.`
    );
    results[`return_${fixture.nextStatus}`] = transition.status;
  }

  const returnInventoryLog = await pool.request()
    .input("referenceId", sql.VarChar, receivedReturnFixtureId)
    .query(`
      SELECT COUNT(*) AS count
      FROM InventoryLogs
      WHERE reference_id = @referenceId AND type = 'return_refund'
    `);
  assert(
    Number(returnInventoryLog.recordset[0]?.count || 0) === 1,
    "item_returned must create exactly one return_refund inventory log."
  );

  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const futureFinance = await request(
    `/api/seller/finance/summary?from=${futureDate}&to=${futureDate}`,
    sellerToken
  );
  assert(futureFinance.status === 400, "Future finance dates must return HTTP 400.");
  assert(
    futureFinance.body?.code === "FINANCE_FUTURE_DATE_NOT_ALLOWED",
    "Future finance date error code is invalid."
  );
  results.financeFutureDateGuard = futureFinance.status;

  const forbiddenFinance = await request("/api/seller/finance/summary", customerToken);
  assert(forbiddenFinance.status === 403, "Customer must not access seller finance.");
  results.customerFinanceIsolation = forbiddenFinance.status;

  const forbiddenWallet = await request("/api/seller/wallet", customerToken);
  assert(forbiddenWallet.status === 403, "Customer must not access seller wallet.");
  results.customerWalletIsolation = forbiddenWallet.status;

  const forbiddenAdminWithdrawals = await request("/api/admin/withdrawals", sellerToken);
  assert(forbiddenAdminWithdrawals.status === 403, "Seller must not access admin withdrawals.");
  results.sellerAdminWithdrawalIsolation = forbiddenAdminWithdrawals.status;

  console.log(JSON.stringify({ status: "success", baseUrl, results }, null, 2));
} finally {
  try {
    await cleanupReturnFixtures();
  } finally {
    await pool.close();
  }
}
