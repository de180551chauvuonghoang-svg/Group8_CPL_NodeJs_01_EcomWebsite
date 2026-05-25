import { sql, pool } from './db.js';

/**
 * Initialize all 24 tables for E-Com FPT database.
 * Uses IF NOT EXISTS so it is safe to run on every server start.
 * Tables are created in dependency order (FK parents first).
 */
export const initDb = async () => {
  try {
    await createUsersTable();
    await createCategoriesTable();
    await createProductsTable();
    await createProductImagesTable();
    await createProductCategoriesTable();
    await createAttributesTable();
    await createAttributeValuesTable();
    await createProductVariantsTable();
    await createVariantAttributeValuesTable();
    await createInventoryLogsTable();
    await createReviewsTable();          // order_item_id FK added later
    await createCartsTable();
    await createCartItemsTable();
    await createWishlistsTable();
    await createWishlistItemsTable();
    await createCouponsTable();
    await createCouponProductsTable();
    await createCouponCategoriesTable();
    await createOrdersTable();
    await createOrderItemsTable();
    await addReviewsOrderItemFk();       // deferred FK
    await createPaymentsTable();
    await createRefundsTable();
    await createRefundItemsTable();
    await createCouponUsageTable();

    console.log('[✓] initDb: All 24 tables verified/created.');

    await seedData();

  } catch (err) {
    console.error('[🚨 initDb ERROR]', err.message);
    throw err;
  }
};

// ============================================================
//  GROUP 1: USERS
// ============================================================

const createUsersTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
    BEGIN
      CREATE TABLE Users (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        name          NVARCHAR(100)  NOT NULL,
        email         VARCHAR(150)   NOT NULL UNIQUE,
        password      VARCHAR(255)   NOT NULL,
        phone_number  VARCHAR(20)    NULL,
        avatar_url    VARCHAR(2083)  NULL,
        role          VARCHAR(20)    NOT NULL DEFAULT 'customer',
        is_active     BIT            NOT NULL DEFAULT 1,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Users created';
    END
  `);
};

// ============================================================
//  GROUP 2: CATEGORIES
// ============================================================

const createCategoriesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Categories')
    BEGIN
      CREATE TABLE Categories (
        id          VARCHAR(50)    NOT NULL PRIMARY KEY,
        name        NVARCHAR(150)  NOT NULL,
        slug        VARCHAR(200)   NOT NULL UNIQUE,
        description NVARCHAR(MAX)  NULL,
        image_url   VARCHAR(2083)  NULL,
        parent_id   VARCHAR(50)    NULL REFERENCES Categories(id) ON DELETE NO ACTION,
        sort_order  INT            NOT NULL DEFAULT 0,
        is_active   BIT            NOT NULL DEFAULT 1,
        created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Categories_parent_id ON Categories(parent_id);
      PRINT '[✓] Table Categories created';
    END
  `);
};

// ============================================================
//  GROUP 3: PRODUCTS & CATALOG
// ============================================================

const createProductsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Products')
    BEGIN
      CREATE TABLE Products (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        name          NVARCHAR(255)  NOT NULL,
        slug          VARCHAR(300)   NOT NULL UNIQUE,
        description   NVARCHAR(MAX)  NULL,
        short_desc    NVARCHAR(500)  NULL,
        base_price    DECIMAL(18,2)  NOT NULL DEFAULT 0,
        is_active     BIT            NOT NULL DEFAULT 1,
        is_featured   BIT            NOT NULL DEFAULT 0,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Products_slug ON Products(slug);
      PRINT '[✓] Table Products created';
    END
  `);
};

const createProductImagesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductImages')
    BEGIN
      CREATE TABLE ProductImages (
        id          VARCHAR(50)    NOT NULL PRIMARY KEY,
        product_id  VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        image_url   VARCHAR(2083)  NOT NULL,
        alt_text    NVARCHAR(255)  NULL,
        sort_order  INT            NOT NULL DEFAULT 0,
        is_primary  BIT            NOT NULL DEFAULT 0,
        created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ProductImages_product_id ON ProductImages(product_id);
      PRINT '[✓] Table ProductImages created';
    END
  `);
};

const createProductCategoriesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductCategories')
    BEGIN
      CREATE TABLE ProductCategories (
        product_id   VARCHAR(50)  NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        category_id  VARCHAR(50)  NOT NULL REFERENCES Categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      );
      PRINT '[✓] Table ProductCategories created';
    END
  `);
};

const createAttributesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Attributes')
    BEGIN
      CREATE TABLE Attributes (
        id          VARCHAR(50)    NOT NULL PRIMARY KEY,
        name        NVARCHAR(100)  NOT NULL UNIQUE,
        created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Attributes created';
    END
  `);
};

const createAttributeValuesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AttributeValues')
    BEGIN
      CREATE TABLE AttributeValues (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        attribute_id  VARCHAR(50)    NOT NULL REFERENCES Attributes(id) ON DELETE CASCADE,
        value         NVARCHAR(150)  NOT NULL,
        color_hex     VARCHAR(7)     NULL,
        sort_order    INT            NOT NULL DEFAULT 0
      );
      CREATE INDEX IX_AttributeValues_attribute_id ON AttributeValues(attribute_id);
      PRINT '[✓] Table AttributeValues created';
    END
  `);
};

const createProductVariantsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductVariants')
    BEGIN
      CREATE TABLE ProductVariants (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        product_id    VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        sku           VARCHAR(100)   NOT NULL UNIQUE,
        price         DECIMAL(18,2)  NOT NULL,
        compare_price DECIMAL(18,2)  NULL,
        stock_qty     INT            NOT NULL DEFAULT 0,
        weight_kg     DECIMAL(8,3)   NULL,
        image_url     VARCHAR(2083)  NULL,
        is_active     BIT            NOT NULL DEFAULT 1,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ProductVariants_product_id ON ProductVariants(product_id);
      CREATE INDEX IX_ProductVariants_sku ON ProductVariants(sku);
      PRINT '[✓] Table ProductVariants created';
    END
  `);
};

const createVariantAttributeValuesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VariantAttributeValues')
    BEGIN
      CREATE TABLE VariantAttributeValues (
        variant_id          VARCHAR(50)  NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
        attribute_value_id  VARCHAR(50)  NOT NULL REFERENCES AttributeValues(id) ON DELETE CASCADE,
        PRIMARY KEY (variant_id, attribute_value_id)
      );
      PRINT '[✓] Table VariantAttributeValues created';
    END
  `);
};

const createInventoryLogsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryLogs')
    BEGIN
      CREATE TABLE InventoryLogs (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        variant_id    VARCHAR(50)    NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
        change_qty    INT            NOT NULL,
        reason        NVARCHAR(255)  NULL,
        reference_id  VARCHAR(50)    NULL,
        created_by    VARCHAR(50)    NULL REFERENCES Users(id) ON DELETE SET NULL,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_InventoryLogs_variant_id ON InventoryLogs(variant_id);
      PRINT '[✓] Table InventoryLogs created';
    END
  `);
};

// ============================================================
//  GROUP 4: REVIEWS
// ============================================================

const createReviewsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reviews')
    BEGIN
      CREATE TABLE Reviews (
        id             VARCHAR(50)    NOT NULL PRIMARY KEY,
        product_id     VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        user_id        VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
        order_item_id  VARCHAR(50)    NULL,
        rating         TINYINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title          NVARCHAR(255)  NULL,
        body           NVARCHAR(MAX)  NULL,
        is_verified    BIT            NOT NULL DEFAULT 0,
        is_approved    BIT            NOT NULL DEFAULT 1,
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Reviews_product_id ON Reviews(product_id);
      CREATE INDEX IX_Reviews_user_id    ON Reviews(user_id);
      PRINT '[✓] Table Reviews created';
    END
  `);
};

const addReviewsOrderItemFk = async () => {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reviews_OrderItems'
    )
    AND EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderItems')
    AND EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reviews')
    BEGIN
      ALTER TABLE Reviews
        ADD CONSTRAINT FK_Reviews_OrderItems
        FOREIGN KEY (order_item_id) REFERENCES OrderItems(id) ON DELETE SET NULL;
      PRINT '[✓] FK Reviews → OrderItems added';
    END
  `);
};

// ============================================================
//  GROUP 5: CART & WISHLIST
// ============================================================

const createCartsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Carts')
    BEGIN
      CREATE TABLE Carts (
        id          VARCHAR(50)  NOT NULL PRIMARY KEY,
        user_id     VARCHAR(50)  NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
        created_at  DATETIME2    NOT NULL DEFAULT GETDATE(),
        updated_at  DATETIME2    NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Carts created';
    END
  `);
};

const createCartItemsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CartItems')
    BEGIN
      CREATE TABLE CartItems (
        id          VARCHAR(50)  NOT NULL PRIMARY KEY,
        cart_id     VARCHAR(50)  NOT NULL REFERENCES Carts(id) ON DELETE CASCADE,
        variant_id  VARCHAR(50)  NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
        quantity    INT          NOT NULL DEFAULT 1 CHECK (quantity > 0),
        added_at    DATETIME2    NOT NULL DEFAULT GETDATE(),
        UNIQUE (cart_id, variant_id)
      );
      CREATE INDEX IX_CartItems_cart_id ON CartItems(cart_id);
      PRINT '[✓] Table CartItems created';
    END
  `);
};

const createWishlistsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Wishlists')
    BEGIN
      CREATE TABLE Wishlists (
        id          VARCHAR(50)  NOT NULL PRIMARY KEY,
        user_id     VARCHAR(50)  NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
        created_at  DATETIME2    NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Wishlists created';
    END
  `);
};

const createWishlistItemsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WishlistItems')
    BEGIN
      CREATE TABLE WishlistItems (
        id           VARCHAR(50)  NOT NULL PRIMARY KEY,
        wishlist_id  VARCHAR(50)  NOT NULL REFERENCES Wishlists(id) ON DELETE CASCADE,
        product_id   VARCHAR(50)  NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        added_at     DATETIME2    NOT NULL DEFAULT GETDATE(),
        UNIQUE (wishlist_id, product_id)
      );
      CREATE INDEX IX_WishlistItems_wishlist_id ON WishlistItems(wishlist_id);
      PRINT '[✓] Table WishlistItems created';
    END
  `);
};

// ============================================================
//  GROUP 6: COUPONS
// ============================================================

const createCouponsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Coupons')
    BEGIN
      CREATE TABLE Coupons (
        id                VARCHAR(50)    NOT NULL PRIMARY KEY,
        code              VARCHAR(50)    NOT NULL UNIQUE,
        description       NVARCHAR(500)  NULL,
        discount_type     VARCHAR(20)    NOT NULL DEFAULT 'percentage',
        discount_value    DECIMAL(18,2)  NOT NULL,
        min_order_amount  DECIMAL(18,2)  NULL,
        max_discount_amt  DECIMAL(18,2)  NULL,
        usage_limit       INT            NULL,
        used_count        INT            NOT NULL DEFAULT 0,
        user_limit        INT            NULL DEFAULT 1,
        starts_at         DATETIME2      NULL,
        expires_at        DATETIME2      NULL,
        is_active         BIT            NOT NULL DEFAULT 1,
        created_at        DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Coupons_code ON Coupons(code);
      PRINT '[✓] Table Coupons created';
    END
  `);
};

const createCouponProductsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CouponProducts')
    BEGIN
      CREATE TABLE CouponProducts (
        coupon_id   VARCHAR(50)  NOT NULL REFERENCES Coupons(id) ON DELETE CASCADE,
        product_id  VARCHAR(50)  NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        PRIMARY KEY (coupon_id, product_id)
      );
      PRINT '[✓] Table CouponProducts created';
    END
  `);
};

const createCouponCategoriesTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CouponCategories')
    BEGIN
      CREATE TABLE CouponCategories (
        coupon_id    VARCHAR(50)  NOT NULL REFERENCES Coupons(id) ON DELETE CASCADE,
        category_id  VARCHAR(50)  NOT NULL REFERENCES Categories(id) ON DELETE CASCADE,
        PRIMARY KEY (coupon_id, category_id)
      );
      PRINT '[✓] Table CouponCategories created';
    END
  `);
};

// ============================================================
//  GROUP 7: ORDERS & PAYMENTS
// ============================================================

const createOrdersTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Orders')
    BEGIN
      CREATE TABLE Orders (
        id                VARCHAR(50)    NOT NULL PRIMARY KEY,
        user_id           VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
        coupon_id         VARCHAR(50)    NULL REFERENCES Coupons(id) ON DELETE SET NULL,
        status            VARCHAR(30)    NOT NULL DEFAULT 'pending',
        subtotal          DECIMAL(18,2)  NOT NULL,
        discount_amount   DECIMAL(18,2)  NOT NULL DEFAULT 0,
        shipping_fee      DECIMAL(18,2)  NOT NULL DEFAULT 0,
        total             DECIMAL(18,2)  NOT NULL,
        shipping_name     NVARCHAR(150)  NOT NULL,
        shipping_phone    VARCHAR(20)    NOT NULL,
        shipping_address  NVARCHAR(500)  NOT NULL,
        shipping_city     NVARCHAR(100)  NULL,
        shipping_country  NVARCHAR(100)  NOT NULL DEFAULT 'Vietnam',
        note              NVARCHAR(500)  NULL,
        created_at        DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at        DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Orders_user_id ON Orders(user_id);
      CREATE INDEX IX_Orders_status  ON Orders(status);
      PRINT '[✓] Table Orders created';
    END
  `);
};

const createOrderItemsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderItems')
    BEGIN
      CREATE TABLE OrderItems (
        id             VARCHAR(50)    NOT NULL PRIMARY KEY,
        order_id       VARCHAR(50)    NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
        variant_id     VARCHAR(50)    NOT NULL REFERENCES ProductVariants(id) ON DELETE NO ACTION,
        quantity       INT            NOT NULL CHECK (quantity > 0),
        unit_price     DECIMAL(18,2)  NOT NULL,
        total_price    DECIMAL(18,2)  NOT NULL,
        product_name   NVARCHAR(255)  NOT NULL,
        variant_info   NVARCHAR(255)  NULL,
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_OrderItems_order_id   ON OrderItems(order_id);
      CREATE INDEX IX_OrderItems_variant_id ON OrderItems(variant_id);
      PRINT '[✓] Table OrderItems created';
    END
  `);
};

const createPaymentsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Payments')
    BEGIN
      CREATE TABLE Payments (
        id               VARCHAR(50)    NOT NULL PRIMARY KEY,
        order_id         VARCHAR(50)    NOT NULL UNIQUE REFERENCES Orders(id) ON DELETE CASCADE,
        method           VARCHAR(50)    NOT NULL,
        status           VARCHAR(30)    NOT NULL DEFAULT 'pending',
        amount           DECIMAL(18,2)  NOT NULL,
        transaction_ref  VARCHAR(255)   NULL,
        paid_at          DATETIME2      NULL,
        created_at       DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Payments created';
    END
  `);
};

const createRefundsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Refunds')
    BEGIN
      CREATE TABLE Refunds (
        id             VARCHAR(50)    NOT NULL PRIMARY KEY,
        payment_id     VARCHAR(50)    NOT NULL UNIQUE REFERENCES Payments(id) ON DELETE CASCADE,
        reason         NVARCHAR(500)  NULL,
        status         VARCHAR(30)    NOT NULL DEFAULT 'pending',
        refund_amount  DECIMAL(18,2)  NOT NULL,
        refunded_at    DATETIME2      NULL,
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Refunds created';
    END
  `);
};

const createRefundItemsTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RefundItems')
    BEGIN
      CREATE TABLE RefundItems (
        id             VARCHAR(50)    NOT NULL PRIMARY KEY,
        refund_id      VARCHAR(50)    NOT NULL REFERENCES Refunds(id) ON DELETE CASCADE,
        order_item_id  VARCHAR(50)    NOT NULL REFERENCES OrderItems(id) ON DELETE NO ACTION,
        quantity       INT            NOT NULL CHECK (quantity > 0),
        refund_amount  DECIMAL(18,2)  NOT NULL
      );
      CREATE INDEX IX_RefundItems_refund_id ON RefundItems(refund_id);
      PRINT '[✓] Table RefundItems created';
    END
  `);
};

const createCouponUsageTable = async () => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CouponUsage')
    BEGIN
      CREATE TABLE CouponUsage (
        id          VARCHAR(50)  NOT NULL PRIMARY KEY,
        coupon_id   VARCHAR(50)  NOT NULL REFERENCES Coupons(id) ON DELETE NO ACTION,
        order_id    VARCHAR(50)  NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
        user_id     VARCHAR(50)  NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
        used_at     DATETIME2    NOT NULL DEFAULT GETDATE(),
        UNIQUE (coupon_id, order_id)
      );
      CREATE INDEX IX_CouponUsage_coupon_id ON CouponUsage(coupon_id);
      CREATE INDEX IX_CouponUsage_user_id   ON CouponUsage(user_id);
      PRINT '[✓] Table CouponUsage created';
    END
  `);
};

// ============================================================
//  SEED DATA
// ============================================================

const seedData = async () => {
  await seedUsers();
  await seedCategories();
  await seedAttributes();
  await seedProducts();
};

const seedUsers = async () => {
  const { recordset } = await pool.request()
    .query(`SELECT COUNT(*) AS cnt FROM Users`);
  if (recordset[0].cnt > 0) return;

  console.log('[Seed] Seeding initial users...');
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.default.hash('password123', 10);

  await pool.request()
    .input('id',       sql.VarChar,   'usr_admin001')
    .input('name',     sql.NVarChar,  'Admin Manager')
    .input('email',    sql.VarChar,   'admin@ecom.com')
    .input('password', sql.VarChar,   hashed)
    .input('phone',    sql.VarChar,   '0901234567')
    .input('role',     sql.VarChar,   'admin')
    .query(`INSERT INTO Users (id,name,email,password,phone_number,role)
            VALUES (@id,@name,@email,@password,@phone,@role)`);

  await pool.request()
    .input('id',       sql.VarChar,   'usr_cust001')
    .input('name',     sql.NVarChar,  'Nguyen Van A')
    .input('email',    sql.VarChar,   'customer@ecom.com')
    .input('password', sql.VarChar,   hashed)
    .input('phone',    sql.VarChar,   '0909876543')
    .input('role',     sql.VarChar,   'customer')
    .query(`INSERT INTO Users (id,name,email,password,phone_number,role)
            VALUES (@id,@name,@email,@password,@phone,@role)`);

  console.log('[Seed] ✓ Users seeded.');
};

const seedCategories = async () => {
  const { recordset } = await pool.request()
    .query(`SELECT COUNT(*) AS cnt FROM Categories`);
  if (recordset[0].cnt > 0) return;

  console.log('[Seed] Seeding categories...');
  const cats = [
    { id: 'cat_electronics',  name: 'Điện Tử',         slug: 'dien-tu',        parent: null },
    { id: 'cat_audio',        name: 'Âm Thanh',         slug: 'am-thanh',       parent: 'cat_electronics' },
    { id: 'cat_computers',    name: 'Máy Tính',         slug: 'may-tinh',       parent: 'cat_electronics' },
    { id: 'cat_accessories',  name: 'Phụ Kiện',         slug: 'phu-kien',       parent: 'cat_electronics' },
    { id: 'cat_wearables',    name: 'Đồng Hồ & Wear',  slug: 'dong-ho-wear',   parent: 'cat_electronics' },
    { id: 'cat_home',         name: 'Gia Dụng',         slug: 'gia-dung',       parent: null },
    { id: 'cat_kitchen',      name: 'Nhà Bếp',          slug: 'nha-bep',        parent: 'cat_home' },
    { id: 'cat_fashion',      name: 'Thời Trang',       slug: 'thoi-trang',     parent: null },
  ];

  for (const c of cats) {
    await pool.request()
      .input('id',       sql.VarChar,   c.id)
      .input('name',     sql.NVarChar,  c.name)
      .input('slug',     sql.VarChar,   c.slug)
      .input('parentId', sql.VarChar,   c.parent)
      .query(`INSERT INTO Categories (id,name,slug,parent_id)
              VALUES (@id,@name,@slug,@parentId)`);
  }
  console.log('[Seed] ✓ Categories seeded.');
};

const seedAttributes = async () => {
  const { recordset } = await pool.request()
    .query(`SELECT COUNT(*) AS cnt FROM Attributes`);
  if (recordset[0].cnt > 0) return;

  console.log('[Seed] Seeding attributes...');

  const attrs = [
    {
      id: 'attr_color', name: 'Màu sắc',
      values: [
        { id: 'av_black',  value: 'Đen',   hex: '#1a1a1a' },
        { id: 'av_white',  value: 'Trắng', hex: '#f5f5f5' },
        { id: 'av_silver', value: 'Bạc',   hex: '#c0c0c0' },
        { id: 'av_blue',   value: 'Xanh',  hex: '#2563eb' },
        { id: 'av_red',    value: 'Đỏ',    hex: '#dc2626' },
      ]
    },
    {
      id: 'attr_storage', name: 'Dung lượng',
      values: [
        { id: 'av_128gb', value: '128GB', hex: null },
        { id: 'av_256gb', value: '256GB', hex: null },
        { id: 'av_512gb', value: '512GB', hex: null },
      ]
    },
    {
      id: 'attr_size', name: 'Kích thước',
      values: [
        { id: 'av_s',  value: 'S',  hex: null },
        { id: 'av_m',  value: 'M',  hex: null },
        { id: 'av_l',  value: 'L',  hex: null },
        { id: 'av_xl', value: 'XL', hex: null },
      ]
    },
  ];

  for (const a of attrs) {
    await pool.request()
      .input('id',   sql.VarChar,  a.id)
      .input('name', sql.NVarChar, a.name)
      .query(`INSERT INTO Attributes (id,name) VALUES (@id,@name)`);

    for (const v of a.values) {
      await pool.request()
        .input('id',          sql.VarChar,  v.id)
        .input('attributeId', sql.VarChar,  a.id)
        .input('value',       sql.NVarChar, v.value)
        .input('hex',         sql.VarChar,  v.hex)
        .query(`INSERT INTO AttributeValues (id,attribute_id,value,color_hex)
                VALUES (@id,@attributeId,@value,@hex)`);
    }
  }
  console.log('[Seed] ✓ Attributes & values seeded.');
};

const seedProducts = async () => {
  const { recordset } = await pool.request()
    .query(`SELECT COUNT(*) AS cnt FROM Products`);
  if (recordset[0].cnt > 0) return;

  console.log('[Seed] Seeding products & variants...');

  const products = [
    {
      id: 'prod_001', name: 'Tai Nghe Chống Ồn Premium', slug: 'tai-nghe-chong-on-premium',
      short_desc: 'Âm thanh đỉnh cao, chống ồn chủ động 40dB, pin 40 giờ',
      desc: 'Trải nghiệm âm thanh đỉnh cao với công nghệ chống ồn chủ động tiên tiến, pin sử dụng 40 giờ và đệm tai bằng memory foam cao cấp.',
      base_price: 4599000, category: 'cat_audio',
      variants: [
        { id: 'var_001_black', sku: 'HP-PREM-BLK', price: 4599000, compare: 5999000, stock: 15, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', avIds: ['av_black'] },
        { id: 'var_001_white', sku: 'HP-PREM-WHT', price: 4599000, compare: 5999000, stock: 10, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', avIds: ['av_white'] },
      ],
      primaryImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_002', name: 'Bàn Phím Cơ Gaming RGB', slug: 'ban-phim-co-gaming-rgb',
      short_desc: 'Switch Blue cơ học, RGB tùy chỉnh, khung nhôm bền bỉ',
      desc: 'Switch cơ học Blue tactile, đèn RGB tùy chỉnh từng phím, khung nhôm cao cấp và phím media chuyên dụng.',
      base_price: 2099000, category: 'cat_accessories',
      variants: [
        { id: 'var_002_black', sku: 'KB-RGB-BLK', price: 2099000, compare: 2599000, stock: 25, image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80', avIds: ['av_black'] },
        { id: 'var_002_white', sku: 'KB-RGB-WHT', price: 2199000, compare: 2599000, stock: 18, image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80', avIds: ['av_white'] },
      ],
      primaryImage: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_003', name: 'Chuột Không Dây Ergonomic', slug: 'chuot-khong-day-ergonomic',
      short_desc: 'DPI điều chỉnh 400-3200, thiết kế ergonomic, pin 60 giờ',
      desc: 'Chuột không dây chính xác cao, DPI tùy chỉnh linh hoạt, thiết kế ergonomic phù hợp cho cả ngày làm việc.',
      base_price: 1199000, category: 'cat_accessories',
      variants: [
        { id: 'var_003_black', sku: 'MS-ERG-BLK', price: 1199000, compare: null, stock: 40, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80', avIds: ['av_black'] },
      ],
      primaryImage: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_004', name: 'Đồng Hồ Thông Minh Fitness Pro', slug: 'dong-ho-thong-minh-fitness-pro',
      short_desc: 'Màn hình AMOLED, theo dõi nhịp tim, GPS tích hợp',
      desc: 'Theo dõi hoạt động thể thao, nhịp tim, giấc ngủ với màn hình AMOLED sắc nét và nhận thông báo điện thoại.',
      base_price: 3499000, category: 'cat_wearables',
      variants: [
        { id: 'var_004_black', sku: 'SW-FIT-BLK', price: 3499000, compare: 4299000, stock: 12, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', avIds: ['av_black'] },
        { id: 'var_004_silver', sku: 'SW-FIT-SLV', price: 3699000, compare: 4299000, stock: 8,  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', avIds: ['av_silver'] },
      ],
      primaryImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_005', name: 'Máy Pha Cà Phê Cold-Brew', slug: 'may-pha-ca-phe-cold-brew',
      short_desc: 'Bình thủy tinh cao cấp, pha lạnh 12 giờ, giữ tươi 2 tuần',
      desc: 'Tự pha cà phê cold brew thơm ngon tại nhà. Nắp silicon kín khí giữ cà phê tươi đến 2 tuần, bình thủy tinh cao cấp.',
      base_price: 799000, category: 'cat_kitchen',
      variants: [
        { id: 'var_005_std', sku: 'CB-MAKER-STD', price: 799000, compare: null, stock: 8, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', avIds: [] },
      ],
      primaryImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'prod_006', name: 'Màn Hình Cong UltraWide 34"', slug: 'man-hinh-cong-ultrawide-34',
      short_desc: '144Hz, HDR10, tỷ lệ 21:9, loa tích hợp kép',
      desc: 'Trải nghiệm gaming và làm việc đắm chìm với màn hình cong 144Hz, HDR10, tỷ lệ 21:9 và loa kép tích hợp.',
      base_price: 10499000, category: 'cat_computers',
      variants: [
        { id: 'var_006_std', sku: 'MON-UW34-BLK', price: 10499000, compare: 12999000, stock: 5, image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80', avIds: ['av_black'] },
      ],
      primaryImage: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80',
    },
  ];

  for (const p of products) {
    // Insert product
    await pool.request()
      .input('id',         sql.VarChar,   p.id)
      .input('name',       sql.NVarChar,  p.name)
      .input('slug',       sql.VarChar,   p.slug)
      .input('desc',       sql.NVarChar,  p.desc)
      .input('shortDesc',  sql.NVarChar,  p.short_desc)
      .input('basePrice',  sql.Decimal(18, 2), p.base_price)
      .query(`INSERT INTO Products (id,name,slug,description,short_desc,base_price,is_featured)
              VALUES (@id,@name,@slug,@desc,@shortDesc,@basePrice,1)`);

    // Link to category
    await pool.request()
      .input('productId',  sql.VarChar, p.id)
      .input('categoryId', sql.VarChar, p.category)
      .query(`INSERT INTO ProductCategories (product_id,category_id)
              VALUES (@productId,@categoryId)`);

    // Primary image
    await pool.request()
      .input('id',        sql.VarChar,   `img_${p.id}_primary`)
      .input('productId', sql.VarChar,   p.id)
      .input('imageUrl',  sql.VarChar,   p.primaryImage)
      .input('altText',   sql.NVarChar,  p.name)
      .query(`INSERT INTO ProductImages (id,product_id,image_url,alt_text,is_primary)
              VALUES (@id,@productId,@imageUrl,@altText,1)`);

    // Variants
    for (const v of p.variants) {
      await pool.request()
        .input('id',        sql.VarChar,        v.id)
        .input('productId', sql.VarChar,        p.id)
        .input('sku',       sql.VarChar,        v.sku)
        .input('price',     sql.Decimal(18, 2), v.price)
        .input('compare',   sql.Decimal(18, 2), v.compare)
        .input('stock',     sql.Int,            v.stock)
        .input('imageUrl',  sql.VarChar,        v.image)
        .query(`INSERT INTO ProductVariants (id,product_id,sku,price,compare_price,stock_qty,image_url)
                VALUES (@id,@productId,@sku,@price,@compare,@stock,@imageUrl)`);

      // Link attribute values to variant
      for (const avId of v.avIds) {
        await pool.request()
          .input('variantId', sql.VarChar, v.id)
          .input('avId',      sql.VarChar, avId)
          .query(`INSERT INTO VariantAttributeValues (variant_id,attribute_value_id)
                  VALUES (@variantId,@avId)`);
      }
    }
  }

  console.log('[Seed] ✓ Products, variants & categories seeded.');
};
