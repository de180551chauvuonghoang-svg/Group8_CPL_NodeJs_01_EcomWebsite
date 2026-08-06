import "dotenv/config";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { connectDB, pool, sql } from "../src/config/db.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const suffix = Date.now().toString(36);
const ids = {
  customer: `usr_app_${suffix}`,
  rejectedUser: `usr_rej_${suffix}`,
  rejectedSeller: `sel_rej_${suffix}`,
  suspendedUser: `usr_sus_${suffix}`,
  suspendedSeller: `sel_sus_${suffix}`,
  suspendedProduct: `prod_sus_${suffix}`,
  suspendedVariant: `var_sus_${suffix}`
};
const emails = {
  customer: `verify-app-${suffix}@example.test`,
  rejected: `verify-rejected-${suffix}@example.test`,
  suspended: `verify-suspended-${suffix}@example.test`
};
const shopNames = {
  customer: `Verify Pending ${suffix}`,
  rejectedBefore: `Verify Rejected Before ${suffix}`,
  rejectedAfter: `Verify Rejected After ${suffix}`,
  suspended: `Verify Suspended ${suffix}`
};

let baseUrl;
let server;
let categoryFixture = null;
let fixtureCleanupError = null;

const makeToken = (user) => jwt.sign({
  userID: user.id,
  email: user.email,
  role: user.role
}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "5m" });

const request = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  let body = null;
  try { body = await response.json(); } catch (_) { /* Assertions report invalid JSON. */ }
  return { status: response.status, body };
};

const jsonRequest = (path, token, method, body) => request(path, token, {
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

const insertUser = async ({ id, name, email, role }) => {
  await pool.request()
    .input("id", sql.VarChar, id)
    .input("name", sql.NVarChar, name)
    .input("email", sql.VarChar, email)
    .input("role", sql.VarChar, role)
    .query(`
      INSERT INTO Users (id, name, email, password, role, is_active, created_at, updated_at)
      VALUES (@id, @name, @email, 'verification-only', @role, 1, GETDATE(), GETDATE())
    `);
};

const insertSeller = async ({ id, userId, shopName, status }) => {
  await pool.request()
    .input("id", sql.VarChar, id)
    .input("userId", sql.VarChar, userId)
    .input("shopName", sql.NVarChar, shopName)
    .input("status", sql.VarChar, status)
    .query(`
      INSERT INTO Sellers (
        id, user_id, shop_name, shop_phone, shop_address, status, created_at, updated_at
      ) VALUES (
        @id, @userId, @shopName, '0987654321', N'Verification address',
        @status, GETDATE(), GETDATE()
      )
    `);
};

const cleanup = async () => {
  if (categoryFixture) {
    await pool.request()
      .input("categoryId", sql.VarChar, categoryFixture.id)
      .input("isActive", sql.Bit, categoryFixture.is_active)
      .query("UPDATE Categories SET is_active = @isActive WHERE id = @categoryId");
  }

  await pool.request()
    .input("productId", sql.VarChar, ids.suspendedProduct)
    .input("customerId", sql.VarChar, ids.customer)
    .input("rejectedUserId", sql.VarChar, ids.rejectedUser)
    .input("suspendedUserId", sql.VarChar, ids.suspendedUser)
    .query(`
      DELETE FROM Products WHERE id = @productId;
      DELETE FROM Sellers
      WHERE user_id IN (@customerId, @rejectedUserId, @suspendedUserId);
      DELETE FROM Users
      WHERE id IN (@customerId, @rejectedUserId, @suspendedUserId);
    `);
};

await connectDB();
try {
  assert(process.env.ACCESS_TOKEN_SECRET, "ACCESS_TOKEN_SECRET is required.");

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const schemaState = (await pool.request().query(`
    SELECT
      default_constraint.definition AS default_definition,
      CASE WHEN check_constraint.name IS NULL THEN 0 ELSE 1 END AS has_status_check,
      CASE WHEN status_index.name IS NULL THEN 0 ELSE 1 END AS has_status_index
    FROM sys.columns status_column
    LEFT JOIN sys.default_constraints default_constraint
      ON default_constraint.parent_object_id = status_column.object_id
      AND default_constraint.parent_column_id = status_column.column_id
    LEFT JOIN sys.check_constraints check_constraint
      ON check_constraint.parent_object_id = status_column.object_id
      AND check_constraint.name = 'CK_Sellers_status_allowed'
    LEFT JOIN sys.indexes status_index
      ON status_index.object_id = status_column.object_id
      AND status_index.name = 'IX_Sellers_status_created_at'
    WHERE status_column.object_id = OBJECT_ID('Sellers')
      AND status_column.name = 'status'
  `)).recordset[0];
  assert(String(schemaState?.default_definition).includes("pending"), "Sellers.status default must be pending.");
  assert(Number(schemaState?.has_status_check) === 1, "Sellers status CHECK constraint is missing.");
  assert(Number(schemaState?.has_status_index) === 1, "Sellers status index is missing.");

  const activeSeller = (await pool.request().query(`
    SELECT TOP 1 users.id, users.email, users.role, seller.id AS seller_id
    FROM Users users
    INNER JOIN Sellers seller ON seller.user_id = users.id
    WHERE users.role = 'seller' AND seller.status = 'active'
    ORDER BY seller.id
  `)).recordset[0];
  assert(activeSeller, "At least one existing active seller fixture is required.");

  await insertUser({
    id: ids.customer,
    name: `verify-app-${suffix}`,
    email: emails.customer,
    role: "customer"
  });
  await insertUser({
    id: ids.rejectedUser,
    name: `verify-rejected-${suffix}`,
    email: emails.rejected,
    role: "customer"
  });
  await insertUser({
    id: ids.suspendedUser,
    name: `verify-suspended-${suffix}`,
    email: emails.suspended,
    role: "seller"
  });
  await insertSeller({
    id: ids.rejectedSeller,
    userId: ids.rejectedUser,
    shopName: shopNames.rejectedBefore,
    status: "rejected"
  });
  await insertSeller({
    id: ids.suspendedSeller,
    userId: ids.suspendedUser,
    shopName: shopNames.suspended,
    status: "suspended"
  });

  await pool.request()
    .input("productId", sql.VarChar, ids.suspendedProduct)
    .input("variantId", sql.VarChar, ids.suspendedVariant)
    .input("sellerId", sql.VarChar, ids.suspendedSeller)
    .input("slug", sql.VarChar, `verify-suspended-${suffix}`)
    .input("sku", sql.VarChar, `VERIFY-SUS-${suffix}`.toUpperCase())
    .query(`
      INSERT INTO Products (id, name, slug, base_price, seller_id, is_active, is_featured)
      VALUES (@productId, N'Hidden suspended product', @slug, 100000, @sellerId, 1, 0);
      INSERT INTO ProductVariants (
        id, product_id, sku, price, stock_qty, low_stock_threshold, is_active, is_default
      ) VALUES (
        @variantId, @productId, @sku, 100000, 10, 5, 1, 1
      );
    `);

  const customerToken = makeToken({ id: ids.customer, email: emails.customer, role: "customer" });
  const rejectedToken = makeToken({ id: ids.rejectedUser, email: emails.rejected, role: "customer" });
  const suspendedToken = makeToken({ id: ids.suspendedUser, email: emails.suspended, role: "seller" });
  const activeToken = makeToken(activeSeller);

  const emptyApplication = await request("/api/seller/application", customerToken);
  assert(emptyApplication.status === 200, "Application lookup without a record must return 200.");
  assert(emptyApplication.body?.data?.application === null, "Application lookup must return null before submit.");

  const invalidApplicationUpload = new FormData();
  invalidApplicationUpload.set("purpose", "product");
  const invalidApplicationPurpose = await request(
    "/api/seller/application/uploads/images",
    customerToken,
    { method: "POST", body: invalidApplicationUpload }
  );
  assert(invalidApplicationPurpose.status === 400, "Application upload must reject product purpose.");
  assert(
    invalidApplicationPurpose.body?.code === "INVALID_APPLICATION_IMAGE_PURPOSE",
    "Application upload purpose error code is incorrect."
  );

  const emptyApplicationUpload = new FormData();
  emptyApplicationUpload.set("purpose", "shop_logo");
  const emptyApplicationFile = await request(
    "/api/seller/application/uploads/images",
    customerToken,
    { method: "POST", body: emptyApplicationUpload }
  );
  assert(emptyApplicationFile.status === 400, "Application upload without a file must return 400.");
  assert(emptyApplicationFile.body?.code === "IMAGE_FILE_REQUIRED", "Application upload file error is incorrect.");

  const submitPayload = {
    shopName: shopNames.customer,
    shopPhone: "0987654321",
    shopAddress: "Verification address",
    pickupAddress: "Verification pickup address",
    identityName: "Verification Customer",
    identityNumber: "012345678901",
    bankName: "Verification Bank",
    bankAccountNo: "1234567890",
    bankAccountHolder: "VERIFICATION CUSTOMER"
  };
  const foreignImage = await jsonRequest("/api/seller/register", customerToken, "POST", {
    ...submitPayload,
    logoUrl: "https://example.test/logo.png",
    logoPublicId: "volitify/another-user/shop_logo/not-owned"
  });
  assert(foreignImage.status === 403, "Register must reject a foreign application image.");
  assert(foreignImage.body?.code === "APPLICATION_IMAGE_NOT_OWNED", "Foreign image error code is incorrect.");

  const submit = await jsonRequest("/api/seller/register", customerToken, "POST", submitPayload);
  assert(submit.status === 200, `New seller application returned HTTP ${submit.status}.`);
  assert(submit.body?.data?.application?.status === "pending", "New seller application must be pending.");
  assert(!JSON.stringify(submit.body).includes("accessToken"), "Application response must not contain a seller token.");

  const persisted = (await pool.request()
    .input("userId", sql.VarChar, ids.customer)
    .query(`
      SELECT users.role, seller.status
      FROM Users users
      INNER JOIN Sellers seller ON seller.user_id = users.id
      WHERE users.id = @userId
    `)).recordset[0];
  assert(persisted?.role === "customer", "Submitting an application must preserve Users.role=customer.");
  assert(persisted?.status === "pending", "Submitting an application must persist Sellers.status=pending.");

  const application = await request("/api/seller/application", customerToken);
  const applicationJson = JSON.stringify(application.body);
  assert(application.status === 200, "Pending application lookup must return 200.");
  assert(application.body?.data?.application?.status === "pending", "Pending application status is incorrect.");
  assert(application.body?.data?.application?.shopName === shopNames.customer, "Application shopName is incorrect.");
  assert(!/identity|bankAccount|bank_|identity_/i.test(applicationJson), "Application lookup exposed sensitive identity or bank fields.");

  const pendingSellerApi = await request("/api/seller/products", customerToken);
  assert(pendingSellerApi.status === 403, "Pending customer must not access seller management APIs.");
  assert(pendingSellerApi.body?.code === "SELLER_NOT_ACTIVE", "Pending seller API error code is incorrect.");

  const pendingUpload = new FormData();
  pendingUpload.set("purpose", "shop_cover");
  const pendingApplicationUpload = await request(
    "/api/seller/application/uploads/images",
    customerToken,
    { method: "POST", body: pendingUpload }
  );
  assert(pendingApplicationUpload.status === 409, "Pending application upload must be blocked.");
  assert(
    pendingApplicationUpload.body?.code === "SELLER_APPLICATION_PENDING",
    "Pending application upload error code is incorrect."
  );

  const duplicatePending = await jsonRequest("/api/seller/register", customerToken, "POST", submitPayload);
  assert(duplicatePending.status === 409, "Submitting a pending application again must return 409.");
  assert(duplicatePending.body?.code === "SELLER_APPLICATION_PENDING", "Pending duplicate error code is incorrect.");

  const rejectedUpload = new FormData();
  rejectedUpload.set("purpose", "shop_logo");
  const editableRejectedUpload = await request(
    "/api/seller/application/uploads/images",
    rejectedToken,
    { method: "POST", body: rejectedUpload }
  );
  assert(editableRejectedUpload.status === 400, "Rejected application must be allowed into upload validation.");
  assert(editableRejectedUpload.body?.code === "IMAGE_FILE_REQUIRED", "Rejected upload access is incorrect.");

  const resubmit = await jsonRequest("/api/seller/register", rejectedToken, "POST", {
    ...submitPayload,
    shopName: shopNames.rejectedAfter,
    shopPhone: "0976543210"
  });
  assert(resubmit.status === 200, `Rejected application resubmit returned HTTP ${resubmit.status}.`);
  const resubmittedState = (await pool.request()
    .input("sellerId", sql.VarChar, ids.rejectedSeller)
    .query("SELECT shop_name, shop_phone, status FROM Sellers WHERE id = @sellerId"))
    .recordset[0];
  assert(resubmittedState?.status === "pending", "Rejected application must return to pending.");
  assert(resubmittedState?.shop_name === shopNames.rejectedAfter, "Rejected application data was not updated.");
  assert(resubmittedState?.shop_phone === "0976543210", "Rejected application phone was not updated.");

  const suspendedSellerApi = await request("/api/seller/products", suspendedToken);
  assert(suspendedSellerApi.status === 403, "Suspended seller must not access seller APIs.");
  assert(suspendedSellerApi.body?.code === "SELLER_NOT_ACTIVE", "Suspended seller API error code is incorrect.");

  const suspendedUpload = new FormData();
  suspendedUpload.set("purpose", "shop_logo");
  const suspendedApplicationUpload = await request(
    "/api/seller/application/uploads/images",
    suspendedToken,
    { method: "POST", body: suspendedUpload }
  );
  assert(suspendedApplicationUpload.status === 403, "Suspended application upload must be blocked.");
  assert(suspendedApplicationUpload.body?.code === "SELLER_SUSPENDED", "Suspended upload code is incorrect.");

  const activeSellerApi = await request("/api/seller/profile", activeToken);
  assert(activeSellerApi.status === 200, "Existing active seller must remain usable.");
  assert(activeSellerApi.body?.status === "success", "Existing active seller response is invalid.");

  const hiddenProduct = await request(`/api/products/${ids.suspendedProduct}`, null);
  assert(hiddenProduct.status === 404, "Suspended seller product must not be publicly readable.");
  const publicProducts = await request("/api/products", null);
  assert(publicProducts.status === 200, "Public product list must remain available.");
  assert(
    !publicProducts.body?.data?.products?.some((product) => product.id === ids.suspendedProduct),
    "Suspended seller product leaked into the public product list."
  );
  const checkout = await jsonRequest("/api/orders/checkout", customerToken, "POST", {
    items: [{
      productId: ids.suspendedProduct,
      quantity: 1,
      product: { id: ids.suspendedProduct, price: 100000 }
    }],
    shippingAddress: "Verification Customer | 0987654321\nVerification address",
    paymentMethod: "cod"
  });
  assert(checkout.status === 400, "Checkout with a suspended shop product must fail.");
  assert(checkout.body?.code === "PRODUCT_UNAVAILABLE", "Suspended shop checkout error code is incorrect.");

  categoryFixture = (await pool.request().query(`
    SELECT TOP 1 id, is_active
    FROM Categories
    WHERE is_active = 1
      AND id IN ('cat_electronics', 'cat_accessories', 'cat_kitchen', 'cat_wearables', 'cat_audio')
    ORDER BY id
  `)).recordset[0];
  assert(categoryFixture, "An active seller category fixture is required.");
  await pool.request()
    .input("categoryId", sql.VarChar, categoryFixture.id)
    .query("UPDATE Categories SET is_active = 0 WHERE id = @categoryId");

  const categories = await request("/api/seller/categories", activeToken);
  assert(categories.status === 200, "Seller categories must return 200.");
  assert(
    !categories.body?.data?.categories?.some((category) => category.id === categoryFixture.id),
    "Inactive category must be hidden from seller categories."
  );
  const inactiveCategoryCreate = await jsonRequest("/api/seller/products", activeToken, "POST", {
    name: `Inactive category verification ${suffix}`,
    price: 100000,
    categoryId: categoryFixture.id,
    stock: 0
  });
  assert(inactiveCategoryCreate.status === 400, "Creating with an inactive category must return 400.");
  assert(
    inactiveCategoryCreate.body?.code === "SELLER_CATEGORY_INACTIVE",
    "Inactive category create error code is incorrect."
  );

  console.log(JSON.stringify({
    status: "success",
    checks: {
      schemaMigration: true,
      newApplicationPending: true,
      customerRolePreserved: true,
      noSellerToken: true,
      safeApplicationLookup: true,
      duplicatePendingRejected: true,
      rejectedResubmit: true,
      activeSellerRegression: true,
      inactiveSellerGuard: true,
      inactiveShopHiddenPublicly: true,
      inactiveShopCheckoutBlocked: true,
      inactiveCategoryGuard: true,
      applicationUploadGuard: true,
      applicationImageOwnership: true
    }
  }, null, 2));
} finally {
  console.log("[verify] Cleaning temporary fixtures...");
  try {
    await cleanup();
  } catch (error) {
    fixtureCleanupError = error;
    console.error("Fixture cleanup failed:", error.message);
  }
  console.log("[verify] Closing HTTP server...");
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
    });
  }
  console.log("[verify] Closing database pool...");
  await pool.close();
  console.log("[verify] Cleanup complete.");
}

if (fixtureCleanupError) throw fixtureCleanupError;
// Some imported infrastructure keeps internal timers alive after the test server closes.
// Reaching this line means assertions and cleanup both completed successfully.
process.exit(0);
