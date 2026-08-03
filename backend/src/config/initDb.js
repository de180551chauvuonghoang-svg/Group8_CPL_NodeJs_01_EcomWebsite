/**
 * Initialize all application tables for E-Com FPT database.
 * SOURCE OF TRUTH: This file (initDb.js) is the authoritative schema definition.
 * schema.sql is a human-readable copy — keep them in sync manually when altering tables.
 *
 * Uses IF NOT EXISTS so it is safe to run on every server start.
 * Tables are created in dependency order (FK parents first).
 *
 * @param {import('mssql').ConnectionPool} pool - Active mssql connection pool
 * @param {import('mssql')} sql - The mssql module (types namespace)
 */
export const initDb = async (pool, sql) => {
  try {
    await createUsersTable(pool);
    await createUserAddressesTable(pool);
    await createSessionsTable(pool);
    await createOtpsTable(pool);
    await createSellersTable(pool);
    await createShopFollowersTable(pool);
    await createNotificationsTable(pool);
    await createCategoriesTable(pool);
    await createProductsTable(pool);
    await createProductImagesTable(pool);
    await createProductCategoriesTable(pool);
    await createAttributesTable(pool);
    await createAttributeValuesTable(pool);
    await createProductVariantsTable(pool);
    await createProductFlashSalesTable(pool);
    await normalizeFlashSaleDefaultVariants(pool);
    await createVariantAttributeValuesTable(pool);
    await createInventoryLogsTable(pool);
    await createReviewsTable(pool); // order_item_id FK added later
    await createCartsTable(pool);
    await createCartItemsTable(pool);
    await createWishlistsTable(pool);
    await createWishlistItemsTable(pool);
    await createCouponsTable(pool);
    await createCouponProductsTable(pool);
    await createCouponCategoriesTable(pool);
    await createOrdersTable(pool);
    await createOrderItemsTable(pool);
    await createOrderCouponsTable(pool);
    await createOrderItemStatusHistoryTable(pool);
    await createReturnRequestsTable(pool);
    await createReturnStatusHistoryTable(pool);
    await createSellerWalletTables(pool);
    await addReviewsOrderItemFk(pool); // deferred FK
    await createPaymentsTable(pool);
    await createRefundsTable(pool);
    await createRefundItemsTable(pool);
    await createCouponUsageTable(pool);

    // AI Tables (NEW)
    await createProductCombosTable(pool);
    await createComboItemsTable(pool);
    await createUserInteractionsTable(pool);
    await createSearchAnalyticsTable(pool);
    await createComboEmbeddingsTable(pool);
    await createMessagesTable(pool);

    console.log("[✓] initDb: All application tables verified/created.");

    await seedData(pool, sql);
    // Seed data is inserted after the first schema pass. Run the idempotent
    // variant normalization again so a fresh database is valid immediately.
    await createProductVariantsTable(pool);
    await assignDevelopmentOrphanProducts(pool);
    await backfillOrderItemStatusHistory(pool);
    await ensureActiveSellerWallets(pool);
  } catch (err) {
    console.error("[🚨 initDb ERROR]", err.message);
    throw err;
  }
};

// ============================================================
//  GROUP 1: USERS
// ============================================================

const createUsersTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
    BEGIN
      CREATE TABLE Users (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        name          NVARCHAR(100)  NOT NULL UNIQUE,
        email         VARCHAR(150)   NOT NULL UNIQUE,
        password      VARCHAR(255)   NOT NULL,
        phone_number  VARCHAR(20)    NULL,
        avatar_url    VARCHAR(2083)  NULL,
        bio           NVARCHAR(MAX)  NULL,
        country       NVARCHAR(100)  NULL,
        timezone      NVARCHAR(100)  NULL,
        role          VARCHAR(20)    NOT NULL DEFAULT 'customer',
        is_active     BIT            NOT NULL DEFAULT 1,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Users created';
    END
    ELSE
    BEGIN
      -- Add missing columns to existing Users table
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'bio')
      BEGIN
        ALTER TABLE Users ADD bio NVARCHAR(MAX) NULL;
        PRINT '[✓] Column bio added to Users';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'country')
      BEGIN
        ALTER TABLE Users ADD country NVARCHAR(100) NULL;
        PRINT '[✓] Column country added to Users';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'timezone')
      BEGIN
        ALTER TABLE Users ADD timezone NVARCHAR(100) NULL;
        PRINT '[✓] Column timezone added to Users';
      END
    END
  `);
};

const createUserAddressesTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserAddresses')
    BEGIN
      CREATE TABLE UserAddresses (
        id              VARCHAR(50)    NOT NULL PRIMARY KEY,
        user_id         VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        recipient_name  NVARCHAR(100)  NOT NULL,
        phone_number    VARCHAR(20)    NOT NULL,
        street_address  NVARCHAR(500)  NOT NULL,
        city            NVARCHAR(100)  NOT NULL,
        is_default      BIT            NOT NULL DEFAULT 0,
        created_at      DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_UserAddresses_user_id ON UserAddresses(user_id);
      PRINT '[✓] Table UserAddresses created';
    END
  `);
};

// ============================================================
//  GROUP 1B: SESSIONS
// ============================================================

const createSessionsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Sessions')
    BEGIN
      CREATE TABLE Sessions (
        id             VARCHAR(50)    NOT NULL PRIMARY KEY,
        user_id        VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        refresh_token  VARCHAR(255)   NOT NULL UNIQUE,
        expires_at     DATETIME2      NOT NULL,
        is_active      BIT            NOT NULL DEFAULT 1,
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Sessions_user_id ON Sessions(user_id);
      CREATE INDEX IX_Sessions_refresh_token ON Sessions(refresh_token);
      PRINT '[✓] Table Sessions created';
    END
  `);
};

const createOtpsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Otps')
    BEGIN
      CREATE TABLE Otps (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        email         VARCHAR(150)   NOT NULL,
        otp           VARCHAR(10)    NOT NULL,
        expires_at    DATETIME2      NOT NULL,
        is_verified   BIT            NOT NULL DEFAULT 0,
        attempts      INT            NOT NULL DEFAULT 0,
        locked_until  DATETIME2      NULL,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Otps_email ON Otps(email);
      CREATE INDEX IX_Otps_expires_at ON Otps(expires_at);
      PRINT '[✓] Table Otps created';
    END
  `);
};

// ============================================================
//  GROUP 1D: SELLERS (NEW)
// ============================================================

const createSellersTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Sellers')
    BEGIN
      CREATE TABLE Sellers (
        id            VARCHAR(50)    NOT NULL PRIMARY KEY,
        user_id       VARCHAR(50)    NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
        shop_name     NVARCHAR(150)  NOT NULL UNIQUE,
        shop_phone    VARCHAR(20)    NOT NULL,
        shop_address  NVARCHAR(500)  NOT NULL,
        pickup_address NVARCHAR(500) NULL,
        logo_url      VARCHAR(2083)   NULL,
        logo_public_id VARCHAR(255)   NULL,
        cover_url     VARCHAR(2083)   NULL,
        cover_public_id VARCHAR(255)  NULL,
        description   NVARCHAR(MAX)  NULL,
        identity_name NVARCHAR(150)   NULL,
        identity_number VARCHAR(30)   NULL,
        bank_name     NVARCHAR(100)   NULL,
        bank_account_no VARCHAR(50)   NULL,
        bank_account_holder NVARCHAR(150) NULL,
        status        VARCHAR(30)    NOT NULL DEFAULT 'pending',
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      PRINT '[✓] Table Sellers created';
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'logo_url')
      BEGIN
        ALTER TABLE Sellers ADD logo_url VARCHAR(2083) NULL;
        PRINT '[✓] Column logo_url added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'cover_url')
      BEGIN
        ALTER TABLE Sellers ADD cover_url VARCHAR(2083) NULL;
        PRINT '[✓] Column cover_url added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'logo_public_id')
        ALTER TABLE Sellers ADD logo_public_id VARCHAR(255) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'cover_public_id')
        ALTER TABLE Sellers ADD cover_public_id VARCHAR(255) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'pickup_address')
      BEGIN
        ALTER TABLE Sellers ADD pickup_address NVARCHAR(500) NULL;
        PRINT '[✓] Column pickup_address added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'identity_name')
      BEGIN
        ALTER TABLE Sellers ADD identity_name NVARCHAR(150) NULL;
        PRINT '[✓] Column identity_name added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'identity_number')
      BEGIN
        ALTER TABLE Sellers ADD identity_number VARCHAR(30) NULL;
        PRINT '[✓] Column identity_number added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'bank_name')
      BEGIN
        ALTER TABLE Sellers ADD bank_name NVARCHAR(100) NULL;
        PRINT '[✓] Column bank_name added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'bank_account_no')
      BEGIN
        ALTER TABLE Sellers ADD bank_account_no VARCHAR(50) NULL;
        PRINT '[✓] Column bank_account_no added to Sellers';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sellers') AND name = 'bank_account_holder')
      BEGIN
        ALTER TABLE Sellers ADD bank_account_holder NVARCHAR(150) NULL;
        PRINT '[✓] Column bank_account_holder added to Sellers';
      END
    END

    DECLARE @sellerStatusDefault SYSNAME;
    SELECT @sellerStatusDefault = default_constraint.name
    FROM sys.default_constraints default_constraint
    INNER JOIN sys.columns column_info
      ON column_info.object_id = default_constraint.parent_object_id
      AND column_info.column_id = default_constraint.parent_column_id
    WHERE default_constraint.parent_object_id = OBJECT_ID('Sellers')
      AND column_info.name = 'status'
      AND default_constraint.definition NOT LIKE '%pending%';

    IF @sellerStatusDefault IS NOT NULL
    BEGIN
      DECLARE @dropSellerStatusDefaultSql NVARCHAR(500);
      SET @dropSellerStatusDefaultSql =
        N'ALTER TABLE Sellers DROP CONSTRAINT ' + QUOTENAME(@sellerStatusDefault);
      EXEC sys.sp_executesql @dropSellerStatusDefaultSql;
    END

    IF NOT EXISTS (
      SELECT 1
      FROM sys.default_constraints default_constraint
      INNER JOIN sys.columns column_info
        ON column_info.object_id = default_constraint.parent_object_id
        AND column_info.column_id = default_constraint.parent_column_id
      WHERE default_constraint.parent_object_id = OBJECT_ID('Sellers')
        AND column_info.name = 'status'
    )
      ALTER TABLE Sellers
        ADD CONSTRAINT DF_Sellers_status_pending DEFAULT 'pending' FOR status;

    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('Sellers')
        AND name = 'CK_Sellers_status_allowed'
    )
      ALTER TABLE Sellers WITH CHECK
        ADD CONSTRAINT CK_Sellers_status_allowed
        CHECK (status IN ('pending', 'active', 'rejected', 'suspended'));

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID('Sellers')
        AND name = 'IX_Sellers_status_created_at'
    )
      CREATE INDEX IX_Sellers_status_created_at
        ON Sellers(status, created_at DESC);
  `);
};

const assignDevelopmentOrphanProducts = async (pool) => {
  if (process.env.NODE_ENV === "production") return;
  await pool.request().query(`
    DECLARE @defaultSellerId VARCHAR(50) = (
      SELECT TOP 1 id FROM Sellers ORDER BY created_at, id
    );
    IF @defaultSellerId IS NOT NULL
    BEGIN
      UPDATE Products
      SET seller_id = @defaultSellerId,
          updated_at = GETDATE()
      WHERE seller_id IS NULL;
    END
  `);
};

const createShopFollowersTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ShopFollowers')
    BEGIN
      CREATE TABLE ShopFollowers (
        user_id     VARCHAR(50) NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
        seller_id   VARCHAR(50) NOT NULL REFERENCES Sellers(id) ON DELETE CASCADE,
        created_at  DATETIME2   NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ShopFollowers PRIMARY KEY (user_id, seller_id)
      );
      CREATE INDEX IX_ShopFollowers_seller_created
        ON ShopFollowers(seller_id, created_at);
    END
  `);
};

const createNotificationsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications')
    BEGIN
      CREATE TABLE Notifications (
        id           VARCHAR(50)    NOT NULL PRIMARY KEY,
        user_id      VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        type         VARCHAR(40)    NOT NULL,
        title        NVARCHAR(200)  NOT NULL,
        message      NVARCHAR(1000) NOT NULL,
        entity_type  VARCHAR(40)    NULL,
        entity_id    VARCHAR(50)    NULL,
        data_json    NVARCHAR(MAX)  NULL,
        dedupe_key   VARCHAR(255)   NULL,
        is_read      BIT            NOT NULL DEFAULT 0,
        read_at      DATETIME2      NULL,
        created_at   DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Notifications_user_read_created
        ON Notifications(user_id, is_read, created_at DESC);
      CREATE UNIQUE INDEX UX_Notifications_dedupe_key
        ON Notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;
    END
  `);
};

// ============================================================
//  GROUP 2: CATEGORIES
// ============================================================

const createCategoriesTable = async (pool) => {
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

const createProductsTable = async (pool) => {
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
        seller_id     VARCHAR(50)    NULL REFERENCES Sellers(id) ON DELETE SET NULL,
        is_active     BIT            NOT NULL DEFAULT 1,
        is_featured   BIT            NOT NULL DEFAULT 0,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Products_slug ON Products(slug);
      CREATE INDEX IX_Products_seller_id ON Products(seller_id);
      PRINT '[✓] Table Products created';
    END
    ELSE
    BEGIN
      -- Add seller_id column if not exists
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'seller_id')
      BEGIN
        ALTER TABLE Products ADD seller_id VARCHAR(50) NULL REFERENCES Sellers(id) ON DELETE SET NULL;
        PRINT '[✓] Column seller_id added to Products';
      END
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_seller_id' AND object_id = OBJECT_ID('Products'))
      BEGIN
        CREATE INDEX IX_Products_seller_id ON Products(seller_id);
        PRINT '[✓] Index IX_Products_seller_id added';
      END
    END
  `);
};

const createProductImagesTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductImages')
    BEGIN
      CREATE TABLE ProductImages (
        id          VARCHAR(50)    NOT NULL PRIMARY KEY,
        product_id  VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        image_url   VARCHAR(2083)  NOT NULL,
        public_id   VARCHAR(255)   NULL,
        alt_text    NVARCHAR(255)  NULL,
        sort_order  INT            NOT NULL DEFAULT 0,
        is_primary  BIT            NOT NULL DEFAULT 0,
        created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ProductImages_product_id ON ProductImages(product_id);
      PRINT '[✓] Table ProductImages created';
    END
    ELSE IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('ProductImages') AND name = 'public_id'
    )
    BEGIN
      ALTER TABLE ProductImages ADD public_id VARCHAR(255) NULL;
    END
  `);
};

const createProductCategoriesTable = async (pool) => {
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

const createAttributesTable = async (pool) => {
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

const createAttributeValuesTable = async (pool) => {
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

const createProductVariantsTable = async (pool) => {
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
        low_stock_threshold INT      NOT NULL DEFAULT 5,
        weight_kg     DECIMAL(8,3)   NULL,
        image_url     VARCHAR(2083)  NULL,
        is_active     BIT            NOT NULL DEFAULT 1,
        is_default    BIT            NOT NULL DEFAULT 1,
        created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ProductVariants_product_id ON ProductVariants(product_id);
      CREATE INDEX IX_ProductVariants_sku ON ProductVariants(sku);
      PRINT '[✓] Table ProductVariants created';
    END
    ELSE
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('ProductVariants') AND name = 'low_stock_threshold'
      )
      BEGIN
        ALTER TABLE ProductVariants
          ADD low_stock_threshold INT NOT NULL
          CONSTRAINT DF_ProductVariants_low_stock_threshold DEFAULT 5 WITH VALUES;
      END
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('ProductVariants') AND name = 'is_default'
      )
      BEGIN
        ALTER TABLE ProductVariants
          ADD is_default BIT NOT NULL
          CONSTRAINT DF_ProductVariants_is_default DEFAULT 0 WITH VALUES;
      END
    END
  `);

  await pool.request().query(`
    ;WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY product_id
               ORDER BY CASE WHEN is_default = 1 THEN 0 ELSE 1 END,
                        CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                        created_at,
                        id
             ) AS row_num
      FROM ProductVariants
    )
    UPDATE variant
    SET is_default = CASE WHEN ranked.row_num = 1 THEN 1 ELSE 0 END
    FROM ProductVariants variant
    INNER JOIN ranked ON ranked.id = variant.id;

    ;WITH stock_totals AS (
      SELECT product_id, SUM(stock_qty) AS total_stock
      FROM ProductVariants
      GROUP BY product_id
    )
    UPDATE variant
    SET stock_qty = stock_totals.total_stock,
        is_active = 1
    FROM ProductVariants variant
    INNER JOIN stock_totals ON stock_totals.product_id = variant.product_id
    WHERE variant.is_default = 1;

    UPDATE ProductVariants
    SET stock_qty = 0,
        is_active = 0
    WHERE is_default = 0;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'UX_ProductVariants_one_default'
        AND object_id = OBJECT_ID('ProductVariants')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_ProductVariants_one_default
        ON ProductVariants(product_id)
        WHERE is_default = 1;
    END

    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CK_ProductVariants_stock_nonnegative'
    )
    BEGIN
      ALTER TABLE ProductVariants WITH CHECK
        ADD CONSTRAINT CK_ProductVariants_stock_nonnegative
        CHECK (stock_qty >= 0);
    END

    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CK_ProductVariants_low_stock_threshold_nonnegative'
    )
    BEGIN
      ALTER TABLE ProductVariants WITH CHECK
        ADD CONSTRAINT CK_ProductVariants_low_stock_threshold_nonnegative
        CHECK (low_stock_threshold >= 0);
    END
  `);
};

const createProductFlashSalesTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductFlashSales')
    BEGIN
      CREATE TABLE ProductFlashSales (
        id             VARCHAR(50)    NOT NULL PRIMARY KEY,
        seller_id      VARCHAR(50)    NOT NULL REFERENCES Sellers(id) ON DELETE CASCADE,
        product_id     VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
        variant_id     VARCHAR(50)    NULL REFERENCES ProductVariants(id) ON DELETE NO ACTION,
        original_price DECIMAL(18,2)  NOT NULL,
        sale_price     DECIMAL(18,2)  NOT NULL,
        starts_at      DATETIME2      NOT NULL,
        ends_at        DATETIME2      NOT NULL,
        status         VARCHAR(20)    NOT NULL DEFAULT 'active',
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ProductFlashSales_product_active
        ON ProductFlashSales(product_id, variant_id, status, starts_at, ends_at);
      CREATE INDEX IX_ProductFlashSales_seller_id ON ProductFlashSales(seller_id);
      PRINT '[✓] Table ProductFlashSales created';
    END
  `);
};

const normalizeFlashSaleDefaultVariants = async (pool) => {
  await pool.request().query(`
    UPDATE flash_sale
    SET variant_id = default_variant.id,
        updated_at = GETDATE()
    FROM ProductFlashSales flash_sale
    INNER JOIN ProductVariants default_variant
      ON default_variant.product_id = flash_sale.product_id
      AND default_variant.is_default = 1
    WHERE flash_sale.variant_id IS NOT NULL
      AND flash_sale.variant_id <> default_variant.id
  `);
};

const createVariantAttributeValuesTable = async (pool) => {
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

const createInventoryLogsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryLogs')
    BEGIN
      CREATE TABLE InventoryLogs (
        id               VARCHAR(50)    NOT NULL PRIMARY KEY,
        variant_id       VARCHAR(50)    NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
        old_quantity     INT            NOT NULL,
        change_quantity  INT            NOT NULL,
        new_quantity     INT            NOT NULL,
        type             VARCHAR(30)    NOT NULL,
        reference_id     VARCHAR(50)    NULL,
        reason           NVARCHAR(255)  NULL,
        created_by       VARCHAR(50)    NULL REFERENCES Users(id) ON DELETE SET NULL,
        created_at       DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_InventoryLogs_variant_created
        ON InventoryLogs(variant_id, created_at DESC);
      CREATE INDEX IX_InventoryLogs_type ON InventoryLogs(type);
      PRINT '[✓] Table InventoryLogs created';
    END
    ELSE
    BEGIN
      IF COL_LENGTH('InventoryLogs', 'change_quantity') IS NULL
         AND COL_LENGTH('InventoryLogs', 'change_qty') IS NOT NULL
      BEGIN
        EXEC sp_rename 'InventoryLogs.change_qty', 'change_quantity', 'COLUMN';
      END

      IF COL_LENGTH('InventoryLogs', 'old_quantity') IS NULL
        ALTER TABLE InventoryLogs ADD old_quantity INT NULL;
      IF COL_LENGTH('InventoryLogs', 'new_quantity') IS NULL
        ALTER TABLE InventoryLogs ADD new_quantity INT NULL;
      IF COL_LENGTH('InventoryLogs', 'type') IS NULL
        ALTER TABLE InventoryLogs ADD type VARCHAR(30) NULL;
    END
  `);

  // Reconstruct old inventory snapshots from the current stock and historical deltas.
  await pool.request().query(`
    ;WITH reconstructed AS (
      SELECT
        inventory.id,
        variant.stock_qty - COALESCE(
          SUM(inventory.change_quantity) OVER (
            PARTITION BY inventory.variant_id
            ORDER BY inventory.created_at DESC, inventory.id DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ),
          0
        ) AS reconstructed_new_quantity
      FROM InventoryLogs inventory
      INNER JOIN ProductVariants variant ON variant.id = inventory.variant_id
    )
    UPDATE inventory
    SET new_quantity = reconstructed.reconstructed_new_quantity,
        old_quantity = reconstructed.reconstructed_new_quantity - inventory.change_quantity,
        type = CASE
          WHEN inventory.change_quantity < 0 THEN 'sale'
          WHEN LOWER(COALESCE(inventory.reason, '')) LIKE '%hủy%' THEN 'order_cancelled'
          WHEN inventory.change_quantity > 0 THEN 'restock'
          ELSE 'manual_adjustment'
        END
    FROM InventoryLogs inventory
    INNER JOIN reconstructed ON reconstructed.id = inventory.id
    WHERE inventory.old_quantity IS NULL
       OR inventory.new_quantity IS NULL
       OR inventory.type IS NULL;

    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('InventoryLogs')
        AND name = 'old_quantity' AND is_nullable = 1
    )
      ALTER TABLE InventoryLogs ALTER COLUMN old_quantity INT NOT NULL;

    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('InventoryLogs')
        AND name = 'new_quantity' AND is_nullable = 1
    )
      ALTER TABLE InventoryLogs ALTER COLUMN new_quantity INT NOT NULL;

    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('InventoryLogs')
        AND name = 'type' AND is_nullable = 1
    )
      ALTER TABLE InventoryLogs ALTER COLUMN type VARCHAR(30) NOT NULL;
  `);

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'IX_InventoryLogs_variant_created'
        AND object_id = OBJECT_ID('InventoryLogs')
    )
      CREATE INDEX IX_InventoryLogs_variant_created
        ON InventoryLogs(variant_id, created_at DESC);

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'IX_InventoryLogs_type'
        AND object_id = OBJECT_ID('InventoryLogs')
    )
      CREATE INDEX IX_InventoryLogs_type ON InventoryLogs(type);

    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CK_InventoryLogs_quantities'
    )
    BEGIN
      ALTER TABLE InventoryLogs WITH CHECK
        ADD CONSTRAINT CK_InventoryLogs_quantities
        CHECK (
          old_quantity >= 0
          AND new_quantity >= 0
          AND change_quantity <> 0
          AND new_quantity = old_quantity + change_quantity
        );
    END

    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE name = 'CK_InventoryLogs_type'
    )
    BEGIN
      ALTER TABLE InventoryLogs WITH CHECK
        ADD CONSTRAINT CK_InventoryLogs_type
        CHECK (type IN (
          'sale',
          'order_cancelled',
          'restock',
          'manual_adjustment',
          'return_refund'
        ));
    END
  `);
};

// ============================================================
//  GROUP 4: REVIEWS
// ============================================================

const createReviewsTable = async (pool) => {
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
        seller_reply   NVARCHAR(2000) NULL,
        replied_at     DATETIME2      NULL,
        replied_by_seller_id VARCHAR(50) NULL,
        deleted_at     DATETIME2      NULL,
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Reviews_product_id ON Reviews(product_id);
      CREATE INDEX IX_Reviews_user_id    ON Reviews(user_id);
      PRINT '[✓] Table Reviews created';
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'seller_reply')
        ALTER TABLE Reviews ADD seller_reply NVARCHAR(2000) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'replied_at')
        ALTER TABLE Reviews ADD replied_at DATETIME2 NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'replied_by_seller_id')
        ALTER TABLE Reviews ADD replied_by_seller_id VARCHAR(50) NULL;
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'deleted_at')
        ALTER TABLE Reviews ADD deleted_at DATETIME2 NULL;
    END

  `);

  // SQL Server resolves column names before a batch runs. Keep constraints and
  // indexes in a second batch so migrations also work for an existing table.
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Reviews_RepliedBySeller'
    )
    BEGIN
      ALTER TABLE Reviews ADD CONSTRAINT FK_Reviews_RepliedBySeller
        FOREIGN KEY (replied_by_seller_id) REFERENCES Sellers(id) ON DELETE SET NULL;
    END

    ;WITH duplicate_reviews AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY order_item_id
               ORDER BY created_at ASC, id ASC
             ) AS duplicate_number
      FROM Reviews
      WHERE order_item_id IS NOT NULL AND deleted_at IS NULL
    )
    UPDATE review
    SET order_item_id = NULL,
        is_verified = 0,
        updated_at = GETDATE()
    FROM Reviews review
    INNER JOIN duplicate_reviews duplicate ON duplicate.id = review.id
    WHERE duplicate.duplicate_number > 1;

    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'UX_Reviews_active_order_item'
        AND object_id = OBJECT_ID('Reviews')
    )
    BEGIN
      CREATE UNIQUE INDEX UX_Reviews_active_order_item
        ON Reviews(order_item_id)
        WHERE order_item_id IS NOT NULL AND deleted_at IS NULL;
    END
  `);
};

const addReviewsOrderItemFk = async (pool) => {
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

const createCartsTable = async (pool) => {
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

const createCartItemsTable = async (pool) => {
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

const createWishlistsTable = async (pool) => {
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

const createWishlistItemsTable = async (pool) => {
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

const createCouponsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Coupons')
    BEGIN
      CREATE TABLE Coupons (
        id                VARCHAR(50)    NOT NULL PRIMARY KEY,
        seller_id         VARCHAR(50)    NULL REFERENCES Sellers(id) ON DELETE CASCADE,
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
        deleted_at        DATETIME2      NULL,
        created_at        DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Coupons_code ON Coupons(code);
      PRINT '[✓] Table Coupons created';
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Coupons') AND name = 'seller_id')
      BEGIN
        ALTER TABLE Coupons ADD seller_id VARCHAR(50) NULL REFERENCES Sellers(id) ON DELETE CASCADE;
        PRINT '[✓] Column seller_id added to Coupons';
      END
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Coupons_seller_id' AND object_id = OBJECT_ID('Coupons'))
      BEGIN
        CREATE INDEX IX_Coupons_seller_id ON Coupons(seller_id);
        PRINT '[✓] Index IX_Coupons_seller_id added';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Coupons') AND name = 'deleted_at')
      BEGIN
        ALTER TABLE Coupons ADD deleted_at DATETIME2 NULL;
        PRINT '[Coupons] Column deleted_at added';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Coupons') AND name = 'starts_at')
      BEGIN
        ALTER TABLE Coupons ADD starts_at DATETIME2 NULL;
        PRINT '[Coupons] Column starts_at added';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Coupons') AND name = 'expires_at')
      BEGIN
        ALTER TABLE Coupons ADD expires_at DATETIME2 NULL;
        PRINT '[Coupons] Column expires_at added';
      END
    END
  `);
};

const createCouponProductsTable = async (pool) => {
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

const createCouponCategoriesTable = async (pool) => {
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

const createOrdersTable = async (pool) => {
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
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'coupon_id')
      BEGIN
        ALTER TABLE Orders ADD coupon_id VARCHAR(50) NULL REFERENCES Coupons(id) ON DELETE SET NULL;
        PRINT '[ok] Column coupon_id added to Orders';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'discount_amount')
      BEGIN
        ALTER TABLE Orders ADD discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
        PRINT '[ok] Column discount_amount added to Orders';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'shipping_fee')
      BEGIN
        ALTER TABLE Orders ADD shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0;
        PRINT '[ok] Column shipping_fee added to Orders';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'shipping_city')
      BEGIN
        ALTER TABLE Orders ADD shipping_city NVARCHAR(100) NULL;
        PRINT '[ok] Column shipping_city added to Orders';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'shipping_country')
      BEGIN
        ALTER TABLE Orders ADD shipping_country NVARCHAR(100) NOT NULL DEFAULT 'Vietnam';
        PRINT '[ok] Column shipping_country added to Orders';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'note')
      BEGIN
        ALTER TABLE Orders ADD note NVARCHAR(500) NULL;
        PRINT '[ok] Column note added to Orders';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'updated_at')
      BEGIN
        ALTER TABLE Orders ADD updated_at DATETIME2 NULL;
        PRINT '[ok] Column updated_at added to Orders';
      END
    END
  `);
};

const createOrderCouponsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderCoupons')
    BEGIN
      CREATE TABLE OrderCoupons (
        id                 VARCHAR(50)   NOT NULL PRIMARY KEY,
        order_id           VARCHAR(50)   NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
        coupon_id          VARCHAR(50)   NOT NULL REFERENCES Coupons(id) ON DELETE NO ACTION,
        seller_id          VARCHAR(50)   NOT NULL REFERENCES Sellers(id) ON DELETE NO ACTION,
        eligible_subtotal  DECIMAL(18,2) NOT NULL,
        discount_amount    DECIMAL(18,2) NOT NULL,
        created_at         DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_OrderCoupons_order_coupon UNIQUE (order_id, coupon_id),
        CONSTRAINT UQ_OrderCoupons_order_seller UNIQUE (order_id, seller_id)
      );
      CREATE INDEX IX_OrderCoupons_coupon_id ON OrderCoupons(coupon_id);
      CREATE INDEX IX_OrderCoupons_seller_created ON OrderCoupons(seller_id, created_at);
    END

    INSERT INTO OrderCoupons (
      id, order_id, coupon_id, seller_id,
      eligible_subtotal, discount_amount, created_at
    )
    SELECT
      LEFT(CONCAT('oc_', orders.id), 50),
      orders.id,
      orders.coupon_id,
      coupon.seller_id,
      seller_items.eligible_subtotal,
      orders.discount_amount,
      orders.created_at
    FROM Orders orders
    INNER JOIN Coupons coupon ON coupon.id = orders.coupon_id
    CROSS APPLY (
      SELECT COALESCE(SUM(item.total_price), 0) AS eligible_subtotal
      FROM OrderItems item
      INNER JOIN ProductVariants variant ON variant.id = item.variant_id
      INNER JOIN Products product ON product.id = variant.product_id
      WHERE item.order_id = orders.id
        AND product.seller_id = coupon.seller_id
    ) seller_items
    WHERE coupon.seller_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM OrderCoupons existing
        WHERE existing.order_id = orders.id
          AND existing.coupon_id = orders.coupon_id
      );
  `);
};

const createOrderItemsTable = async (pool) => {
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
        fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'pending_fulfillment',
        tracking_code  VARCHAR(100)   NULL,
        shipping_label_url VARCHAR(2083) NULL,
        cancel_reason  NVARCHAR(255)  NULL,
        created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
        updated_at     DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_OrderItems_order_id   ON OrderItems(order_id);
      CREATE INDEX IX_OrderItems_variant_id ON OrderItems(variant_id);
      CREATE INDEX IX_OrderItems_fulfillment_status ON OrderItems(fulfillment_status);
      PRINT '[✓] Table OrderItems created';
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'fulfillment_status')
      BEGIN
        ALTER TABLE OrderItems ADD fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'pending_fulfillment';
        PRINT '[✓] Column fulfillment_status added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'product_name')
      BEGIN
        ALTER TABLE OrderItems ADD product_name NVARCHAR(255) NULL;
        PRINT '[ok] Column product_name added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'variant_info')
      BEGIN
        ALTER TABLE OrderItems ADD variant_info NVARCHAR(255) NULL;
        PRINT '[ok] Column variant_info added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'tracking_code')
      BEGIN
        ALTER TABLE OrderItems ADD tracking_code VARCHAR(100) NULL;
        PRINT '[✓] Column tracking_code added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'shipping_label_url')
      BEGIN
        ALTER TABLE OrderItems ADD shipping_label_url VARCHAR(2083) NULL;
        PRINT '[✓] Column shipping_label_url added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'cancel_reason')
      BEGIN
        ALTER TABLE OrderItems ADD cancel_reason NVARCHAR(255) NULL;
        PRINT '[✓] Column cancel_reason added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderItems') AND name = 'updated_at')
      BEGIN
        ALTER TABLE OrderItems ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_OrderItems_updated_at DEFAULT GETDATE();
        PRINT '[✓] Column updated_at added to OrderItems';
      END
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrderItems_fulfillment_status' AND object_id = OBJECT_ID('OrderItems'))
      BEGIN
        CREATE INDEX IX_OrderItems_fulfillment_status ON OrderItems(fulfillment_status);
        PRINT '[✓] Index IX_OrderItems_fulfillment_status added';
      END
    END
  `);
};

const createOrderItemStatusHistoryTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderItemStatusHistory')
    BEGIN
      CREATE TABLE OrderItemStatusHistory (
        id                   VARCHAR(50)   NOT NULL PRIMARY KEY,
        order_item_id        VARCHAR(50)   NOT NULL REFERENCES OrderItems(id) ON DELETE CASCADE,
        old_status           VARCHAR(30)   NULL,
        new_status           VARCHAR(30)   NOT NULL,
        changed_by_user_id   VARCHAR(50)   NULL REFERENCES Users(id) ON DELETE SET NULL,
        change_source        VARCHAR(20)   NOT NULL DEFAULT 'system',
        note                 NVARCHAR(500) NULL,
        created_at           DATETIME2     NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_OrderItemStatusHistory_item_created
        ON OrderItemStatusHistory(order_item_id, created_at);
      PRINT '[✓] Table OrderItemStatusHistory created';
    END
  `);

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'IX_Orders_coupon_id' AND object_id = OBJECT_ID('Orders')
    )
    BEGIN
      CREATE INDEX IX_Orders_coupon_id ON Orders(coupon_id);
    END
  `);
};

const backfillOrderItemStatusHistory = async (pool) => {
  await pool.request().query(`
    UPDATE OrderItems
    SET fulfillment_status = 'shipping', updated_at = GETDATE()
    WHERE fulfillment_status = 'shipped';

    UPDATE oi
    SET fulfillment_status = CASE
          WHEN o.status = 'delivered' THEN 'delivered'
          WHEN o.status IN ('shipping', 'shipped') THEN 'shipping'
          WHEN o.status IN ('cancelled', 'failed', 'refunded') THEN 'cancelled'
          ELSE oi.fulfillment_status
        END,
        updated_at = GETDATE()
    FROM OrderItems oi
    INNER JOIN Orders o ON o.id = oi.order_id
    WHERE oi.fulfillment_status = 'pending_fulfillment'
      AND o.status IN ('delivered', 'shipping', 'shipped', 'cancelled', 'failed', 'refunded');

    INSERT INTO OrderItemStatusHistory (
      id, order_item_id, old_status, new_status,
      changed_by_user_id, change_source, note, created_at
    )
    SELECT
      'hist_' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''),
      oi.id,
      NULL,
      oi.fulfillment_status,
      NULL,
      'migration',
      N'Khởi tạo lịch sử từ trạng thái hiện có.',
      oi.created_at
    FROM OrderItems oi
    WHERE NOT EXISTS (
      SELECT 1
      FROM OrderItemStatusHistory history
      WHERE history.order_item_id = oi.id
    );
  `);
};

const createReturnRequestsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ReturnRequests')
    BEGIN
      CREATE TABLE ReturnRequests (
        id                VARCHAR(50)    NOT NULL PRIMARY KEY,
        order_item_id     VARCHAR(50)    NOT NULL REFERENCES OrderItems(id) ON DELETE NO ACTION,
        customer_user_id  VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
        seller_id         VARCHAR(50)    NOT NULL REFERENCES Sellers(id) ON DELETE NO ACTION,
        quantity          INT            NOT NULL CHECK (quantity > 0),
        reason            NVARCHAR(1000) NOT NULL,
        status            VARCHAR(30)    NOT NULL DEFAULT 'requested',
        seller_response   NVARCHAR(1000) NULL,
        requested_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
        responded_at      DATETIME2      NULL,
        returned_at       DATETIME2      NULL,
        updated_at        DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ReturnRequests_seller_status_requested
        ON ReturnRequests(seller_id, status, requested_at DESC);
      CREATE INDEX IX_ReturnRequests_customer_requested
        ON ReturnRequests(customer_user_id, requested_at DESC);
      CREATE INDEX IX_ReturnRequests_order_item
        ON ReturnRequests(order_item_id);
    END
  `);
};

const createReturnStatusHistoryTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ReturnStatusHistory')
    BEGIN
      CREATE TABLE ReturnStatusHistory (
        id                   VARCHAR(50)    NOT NULL PRIMARY KEY,
        return_request_id    VARCHAR(50)    NOT NULL REFERENCES ReturnRequests(id) ON DELETE CASCADE,
        old_status           VARCHAR(30)    NULL,
        new_status           VARCHAR(30)    NOT NULL,
        changed_by_user_id   VARCHAR(50)    NULL REFERENCES Users(id) ON DELETE SET NULL,
        note                 NVARCHAR(1000) NULL,
        created_at           DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_ReturnStatusHistory_return_created
        ON ReturnStatusHistory(return_request_id, created_at);
    END
  `);
};

const createSellerWalletTables = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ShopWallets')
    BEGIN
      CREATE TABLE ShopWallets (
        id                         VARCHAR(50)   NOT NULL PRIMARY KEY,
        seller_id                  VARCHAR(50)   NOT NULL
          REFERENCES Sellers(id) ON DELETE NO ACTION,
        available_balance          DECIMAL(18,2) NOT NULL DEFAULT 0,
        pending_balance            DECIMAL(18,2) NOT NULL DEFAULT 0,
        withdrawal_hold_balance    DECIMAL(18,2) NOT NULL DEFAULT 0,
        withdrawn_total            DECIMAL(18,2) NOT NULL DEFAULT 0,
        lifetime_earnings          DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at                 DATETIME2     NOT NULL DEFAULT GETDATE(),
        updated_at                 DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_ShopWallets_non_negative CHECK (
          available_balance >= 0
          AND pending_balance >= 0
          AND withdrawal_hold_balance >= 0
          AND withdrawn_total >= 0
          AND lifetime_earnings >= 0
        )
      );
      CREATE UNIQUE INDEX UX_ShopWallets_seller_id ON ShopWallets(seller_id);
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WalletTransactions')
    BEGIN
      CREATE TABLE WalletTransactions (
        id                 VARCHAR(50)    NOT NULL PRIMARY KEY,
        wallet_id          VARCHAR(50)    NOT NULL
          REFERENCES ShopWallets(id) ON DELETE NO ACTION,
        seller_id          VARCHAR(50)    NOT NULL
          REFERENCES Sellers(id) ON DELETE NO ACTION,
        type               VARCHAR(30)    NOT NULL,
        amount             DECIMAL(18,2)  NOT NULL,
        reference_type     VARCHAR(20)    NOT NULL,
        reference_id       VARCHAR(50)    NOT NULL,
        idempotency_key    VARCHAR(150)   NOT NULL UNIQUE,
        available_at       DATETIME2      NULL,
        description        NVARCHAR(500)  NULL,
        created_at         DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_WalletTransactions_amount CHECK (amount > 0),
        CONSTRAINT CK_WalletTransactions_type CHECK (type IN (
          'sale_pending', 'sale_released', 'sale_reversed',
          'withdrawal_hold', 'withdrawal_approved',
          'withdrawal_rejected', 'withdrawal_cancelled'
        )),
        CONSTRAINT CK_WalletTransactions_reference_type CHECK (
          reference_type IN ('order_item', 'return', 'withdrawal')
        )
      );
      CREATE INDEX IX_WalletTransactions_seller_created
        ON WalletTransactions(seller_id, created_at DESC);
      CREATE INDEX IX_WalletTransactions_wallet_type_created
        ON WalletTransactions(wallet_id, type, created_at DESC);
      CREATE INDEX IX_WalletTransactions_reference
        ON WalletTransactions(reference_type, reference_id);
    END;

    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WithdrawalRequests')
    BEGIN
      CREATE TABLE WithdrawalRequests (
        id                    VARCHAR(50)    NOT NULL PRIMARY KEY,
        seller_id             VARCHAR(50)    NOT NULL
          REFERENCES Sellers(id) ON DELETE NO ACTION,
        amount                DECIMAL(18,2)  NOT NULL,
        status                VARCHAR(20)    NOT NULL DEFAULT 'pending',
        bank_name             NVARCHAR(100)  NOT NULL,
        bank_account_no       VARCHAR(50)    NOT NULL,
        bank_account_holder   NVARCHAR(150)  NOT NULL,
        seller_note           NVARCHAR(500)  NULL,
        admin_note            NVARCHAR(500)  NULL,
        processed_by          VARCHAR(50)    NULL
          REFERENCES Users(id) ON DELETE NO ACTION,
        requested_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
        processed_at          DATETIME2      NULL,
        CONSTRAINT CK_WithdrawalRequests_amount CHECK (amount > 0),
        CONSTRAINT CK_WithdrawalRequests_status CHECK (
          status IN ('pending', 'approved', 'rejected', 'cancelled')
        )
      );
      CREATE INDEX IX_WithdrawalRequests_seller_status_requested
        ON WithdrawalRequests(seller_id, status, requested_at DESC);
      CREATE INDEX IX_WithdrawalRequests_status_requested
        ON WithdrawalRequests(status, requested_at ASC);
    END;
  `);

  await pool.request().query(`
    EXEC(N'
      CREATE OR ALTER TRIGGER TR_Sellers_CreateWallet_OnActive
      ON Sellers
      AFTER INSERT, UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        INSERT INTO ShopWallets (id, seller_id)
        SELECT
          CONVERT(VARCHAR(50), NEWID()),
          seller.id
        FROM inserted seller
        WHERE seller.status = ''active''
          AND NOT EXISTS (
            SELECT 1 FROM ShopWallets wallet WHERE wallet.seller_id = seller.id
          );
      END
    ');
  `);
};

const ensureActiveSellerWallets = async (pool) => {
  await pool.request().query(`
    INSERT INTO ShopWallets (id, seller_id)
    SELECT
      LEFT(CONCAT('wallet_', REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', '')), 50),
      seller.id
    FROM Sellers seller
    WHERE seller.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM ShopWallets wallet WHERE wallet.seller_id = seller.id
      );
  `);
};

const createPaymentsTable = async (pool) => {
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

const createRefundsTable = async (pool) => {
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

const createRefundItemsTable = async (pool) => {
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

const createCouponUsageTable = async (pool) => {
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

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes
      WHERE name = 'IX_CouponUsage_coupon_used_at'
        AND object_id = OBJECT_ID('CouponUsage')
    )
    BEGIN
      CREATE INDEX IX_CouponUsage_coupon_used_at
        ON CouponUsage(coupon_id, used_at)
        INCLUDE (order_id, user_id);
    END
  `);
};

// ============================================================
//  AI TABLES (COMBO RECOMMENDATIONS & SEMANTIC SEARCH)
// ============================================================

const createProductCombosTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductCombos')
    BEGIN
      CREATE TABLE ProductCombos (
        combo_id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        price DECIMAL(15,2) NOT NULL,
        category NVARCHAR(100),
        use_case NVARCHAR(100),
        specs_summary NVARCHAR(MAX),
        image_url NVARCHAR(MAX),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
      CREATE INDEX IX_ProductCombos_category ON ProductCombos(category);
      CREATE INDEX IX_ProductCombos_active ON ProductCombos(is_active);
      PRINT '[✓] Table ProductCombos created';
    END
  `);
};

const createComboItemsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ComboItems')
    BEGIN
      CREATE TABLE ComboItems (
        combo_item_id INT PRIMARY KEY IDENTITY(1,1),
        combo_id INT NOT NULL REFERENCES ProductCombos(combo_id) ON DELETE CASCADE,
        product_id INT NOT NULL,
        quantity INT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
      );
      CREATE INDEX IX_ComboItems_combo_id ON ComboItems(combo_id);
      PRINT '[✓] Table ComboItems created';
    END
  `);
};

const createUserInteractionsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserInteractions')
    BEGIN
      CREATE TABLE UserInteractions (
        interaction_id INT PRIMARY KEY IDENTITY(1,1),
        user_id VARCHAR(50),
        product_id INT,
        combo_id INT,
        action NVARCHAR(50),
        search_query NVARCHAR(MAX),
        timestamp DATETIME2 DEFAULT GETDATE()
      );
      CREATE INDEX IX_UserInteractions_user ON UserInteractions(user_id);
      CREATE INDEX IX_UserInteractions_timestamp ON UserInteractions(timestamp);
      PRINT '[✓] Table UserInteractions created';
    END
  `);
};

const createSearchAnalyticsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SearchAnalytics')
    BEGIN
      CREATE TABLE SearchAnalytics (
        search_id INT PRIMARY KEY IDENTITY(1,1),
        query NVARCHAR(MAX) NOT NULL,
        parsed_intent NVARCHAR(50),
        parsed_budget INT,
        results_count INT,
        clicked_result_id INT,
        user_id VARCHAR(50),
        created_at DATETIME2 DEFAULT GETDATE()
      );
      CREATE INDEX IX_SearchAnalytics_user ON SearchAnalytics(user_id);
      CREATE INDEX IX_SearchAnalytics_date ON SearchAnalytics(created_at);
      PRINT '[✓] Table SearchAnalytics created';
    END
  `);
};

const createComboEmbeddingsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ComboEmbeddings')
    BEGIN
      CREATE TABLE ComboEmbeddings (
        embedding_id INT PRIMARY KEY IDENTITY(1,1),
        combo_id INT NOT NULL UNIQUE REFERENCES ProductCombos(combo_id) ON DELETE CASCADE,
        embedding_vector NVARCHAR(MAX),
        last_updated DATETIME2 DEFAULT GETDATE()
      );
      PRINT '[✓] Table ComboEmbeddings created';
    END
  `);
};

// ============================================================
//  GROUP 8: MESSAGES (NEW)
// ============================================================

const createMessagesTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Messages')
    BEGIN
      CREATE TABLE Messages (
        id           VARCHAR(50)    NOT NULL PRIMARY KEY,
        sender_id    VARCHAR(50)    NOT NULL REFERENCES Users(id),
        receiver_id  VARCHAR(50)    NOT NULL REFERENCES Users(id),
        message_text NVARCHAR(MAX)  NOT NULL,
        is_read      BIT            NOT NULL DEFAULT 0,
        created_at   DATETIME2      NOT NULL DEFAULT GETDATE()
      );
      CREATE INDEX IX_Messages_sender_receiver ON Messages(sender_id, receiver_id);
      PRINT '[✓] Table Messages created';
    END
  `);
};

// ============================================================
//  SEED DATA
// ============================================================

const seedData = async (pool, sql) => {
  await seedUsers(pool, sql);
  await seedSellers(pool, sql); // Seed sellers after users but before products
  await seedCategories(pool, sql);
  await seedAttributes(pool, sql);
  await seedProducts(pool, sql);
  await seedUserAddresses(pool, sql);
  await seedReviews(pool, sql);
  await seedCoupons(pool, sql);
  await seedProductCombos(pool, sql);
  await seedOrders(pool, sql);
};

const seedUsers = async (pool, sql) => {
  // Never seed in production — avoids leaking dev credentials
  if (process.env.NODE_ENV === "production") {
    console.log("[Seed] Skipping user seed in production environment.");
    return;
  }

  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Users`);
  if (recordset[0].cnt > 0) {
    // Đồng bộ tên đăng nhập (username) cho các tài khoản mẫu trong DB hiện tại
    await pool.request().query(`
      UPDATE Users SET name = 'admin' WHERE id = 'usr_admin001';
      UPDATE Users SET name = 'customer' WHERE id = 'usr_cust001';
      UPDATE Users SET name = 'seller' WHERE id = 'usr_seller001';
    `);
    return;
  }

  // Read seed password from env var; fall back to a dev-only default
  const seedPassword =
    process.env.SEED_PASSWORD ??
    (process.env.NODE_ENV === "development" ? "password123" : undefined);
  if (!seedPassword) {
    throw new Error(
      "SEED_PASSWORD env var is required when seeding users outside development.",
    );
  }

  console.log("[Seed] Seeding initial users...");
  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.default.hash(seedPassword, 10);

  await pool
    .request()
    .input("id", sql.VarChar, "usr_admin001")
    .input("name", sql.NVarChar, "admin")
    .input("email", sql.VarChar, "admin@ecom.com")
    .input("password", sql.VarChar, hashed)
    .input("phone", sql.VarChar, "0901234567")
    .input("role", sql.VarChar, "admin")
    .query(`INSERT INTO Users (id,name,email,password,phone_number,role)
            VALUES (@id,@name,@email,@password,@phone,@role)`);

  await pool
    .request()
    .input("id", sql.VarChar, "usr_cust001")
    .input("name", sql.NVarChar, "customer")
    .input("email", sql.VarChar, "customer@ecom.com")
    .input("password", sql.VarChar, hashed)
    .input("phone", sql.VarChar, "0909876543")
    .input("role", sql.VarChar, "customer")
    .query(`INSERT INTO Users (id,name,email,password,phone_number,role)
            VALUES (@id,@name,@email,@password,@phone,@role)`);

  await pool
    .request()
    .input("id", sql.VarChar, "usr_seller001")
    .input("name", sql.NVarChar, "seller")
    .input("email", sql.VarChar, "seller@ecom.com")
    .input("password", sql.VarChar, hashed)
    .input("phone", sql.VarChar, "0912345678")
    .input("role", sql.VarChar, "seller")
    .query(`INSERT INTO Users (id,name,email,password,phone_number,role)
            VALUES (@id,@name,@email,@password,@phone,@role)`);

  console.log("[Seed] ✓ Users seeded.");
};

const seedSellers = async (pool, sql) => {
  // Never seed in production
  if (process.env.NODE_ENV === "production") return;

  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Sellers`);
  if (recordset[0].cnt > 0) return;

  // 1. Kiểm tra xem user usr_seller001 có tồn tại không
  const userCheck = await pool.request()
    .input("userId", sql.VarChar, "usr_seller001")
    .query("SELECT id FROM Users WHERE id = @userId");

  // 2. Nếu chưa tồn tại, hãy tạo user usr_seller001 trước
  if (userCheck.recordset.length === 0) {
    console.log("[Seed] User usr_seller001 does not exist. Creating seller user first...");
    const seedPassword =
      process.env.SEED_PASSWORD ??
      (process.env.NODE_ENV === "development" ? "password123" : undefined);
    if (!seedPassword) {
      throw new Error(
        "SEED_PASSWORD env var is required when seeding users outside development.",
      );
    }
    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.default.hash(seedPassword, 10);

    await pool.request()
      .input("id", sql.VarChar, "usr_seller001")
      .input("name", sql.NVarChar, "seller")
      .input("email", sql.VarChar, "seller@ecom.com")
      .input("password", sql.VarChar, hashed)
      .input("phone", sql.VarChar, "0912345678")
      .input("role", sql.VarChar, "seller")
      .query(`INSERT INTO Users (id,name,email,password,phone_number,role)
              VALUES (@id,@name,@email,@password,@phone,@role)`);
  } else {
    // Nếu user đã tồn tại, hãy cập nhật name và role của họ thành seller
    await pool.request()
      .input("userId", sql.VarChar, "usr_seller001")
      .query("UPDATE Users SET name = 'seller', role = 'seller' WHERE id = @userId");
  }

  console.log("[Seed] Seeding initial sellers...");
  await pool
    .request()
    .input("id", sql.VarChar, "sel_001")
    .input("userId", sql.VarChar, "usr_seller001")
    .input("shopName", sql.NVarChar, "Shop FPT Tech")
    .input("shopPhone", sql.VarChar, "0912345678")
    .input("shopAddress", sql.NVarChar, "Khu Công Nghệ Cao Hòa Lạc, Hà Nội")
    .input("description", sql.NVarChar, "Chuyên cung cấp các thiết bị công nghệ chính hãng FPT")
    .query(`INSERT INTO Sellers (id,user_id,shop_name,shop_phone,shop_address,description,status)
            VALUES (@id,@userId,@shopName,@shopPhone,@shopAddress,@description,'active')`);
  console.log("[Seed] ✓ Sellers seeded.");
};

const seedCategories = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Categories`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding categories...");
  const cats = [
    { id: "cat_electronics", name: "Điện Tử", slug: "dien-tu", parent: null },
    {
      id: "cat_audio",
      name: "Âm Thanh",
      slug: "am-thanh",
      parent: "cat_electronics",
    },
    {
      id: "cat_computers",
      name: "Máy Tính",
      slug: "may-tinh",
      parent: "cat_electronics",
    },
    {
      id: "cat_accessories",
      name: "Phụ Kiện",
      slug: "phu-kien",
      parent: "cat_electronics",
    },
    {
      id: "cat_wearables",
      name: "Đồng Hồ & Wear",
      slug: "dong-ho-wear",
      parent: "cat_electronics",
    },
    { id: "cat_home", name: "Gia Dụng", slug: "gia-dung", parent: null },
    { id: "cat_kitchen", name: "Nhà Bếp", slug: "nha-bep", parent: "cat_home" },
    { id: "cat_fashion", name: "Thời Trang", slug: "thoi-trang", parent: null },
  ];

  for (const c of cats) {
    await pool
      .request()
      .input("id", sql.VarChar, c.id)
      .input("name", sql.NVarChar, c.name)
      .input("slug", sql.VarChar, c.slug)
      .input("parentId", sql.VarChar, c.parent)
      .query(`INSERT INTO Categories (id,name,slug,parent_id)
              VALUES (@id,@name,@slug,@parentId)`);
  }
  console.log("[Seed] ✓ Categories seeded.");
};

const seedAttributes = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Attributes`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding attributes...");

  const attrs = [
    {
      id: "attr_color",
      name: "Màu sắc",
      values: [
        { id: "av_black", value: "Đen", hex: "#1a1a1a" },
        { id: "av_white", value: "Trắng", hex: "#f5f5f5" },
        { id: "av_silver", value: "Bạc", hex: "#c0c0c0" },
        { id: "av_blue", value: "Xanh", hex: "#2563eb" },
        { id: "av_red", value: "Đỏ", hex: "#dc2626" },
      ],
    },
    {
      id: "attr_storage",
      name: "Dung lượng",
      values: [
        { id: "av_128gb", value: "128GB", hex: null },
        { id: "av_256gb", value: "256GB", hex: null },
        { id: "av_512gb", value: "512GB", hex: null },
      ],
    },
    {
      id: "attr_size",
      name: "Kích thước",
      values: [
        { id: "av_s", value: "S", hex: null },
        { id: "av_m", value: "M", hex: null },
        { id: "av_l", value: "L", hex: null },
        { id: "av_xl", value: "XL", hex: null },
      ],
    },
  ];

  for (const a of attrs) {
    await pool
      .request()
      .input("id", sql.VarChar, a.id)
      .input("name", sql.NVarChar, a.name)
      .query(`INSERT INTO Attributes (id,name) VALUES (@id,@name)`);

    for (const v of a.values) {
      await pool
        .request()
        .input("id", sql.VarChar, v.id)
        .input("attributeId", sql.VarChar, a.id)
        .input("value", sql.NVarChar, v.value)
        .input("hex", sql.VarChar, v.hex)
        .query(`INSERT INTO AttributeValues (id,attribute_id,value,color_hex)
                VALUES (@id,@attributeId,@value,@hex)`);
    }
  }
  console.log("[Seed] ✓ Attributes & values seeded.");
};

const seedProducts = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Products`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding products & variants...");

  const products = [
    {
      id: "prod_001",
      name: "Tai Nghe Chống Ồn Premium",
      slug: "tai-nghe-chong-on-premium",
      short_desc: "Âm thanh đỉnh cao, chống ồn chủ động 40dB, pin 40 giờ",
      desc: "Trải nghiệm âm thanh đỉnh cao với công nghệ chống ồn chủ động tiên tiến, pin sử dụng 40 giờ và đệm tai bằng memory foam cao cấp.",
      base_price: 4599000,
      category: "cat_audio",
      seller_id: "sel_001",
      variants: [
        {
          id: "var_001_black",
          sku: "HP-PREM-BLK",
          price: 4599000,
          compare: 5999000,
          stock: 15,
          image:
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
        {
          id: "var_001_white",
          sku: "HP-PREM-WHT",
          price: 4599000,
          compare: 5999000,
          stock: 10,
          image:
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_white"],
        },
      ],
      primaryImage:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_002",
      name: "Bàn Phím Cơ Gaming RGB",
      slug: "ban-phim-co-gaming-rgb",
      short_desc: "Switch Blue cơ học, RGB tùy chỉnh, khung nhôm bền bỉ",
      desc: "Switch cơ học Blue tactile, đèn RGB tùy chỉnh từng phím, khung nhôm cao cấp và phím media chuyên dụng.",
      base_price: 2099000,
      category: "cat_accessories",
      seller_id: "sel_001",
      variants: [
        {
          id: "var_002_black",
          sku: "KB-RGB-BLK",
          price: 2099000,
          compare: 2599000,
          stock: 25,
          image:
            "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
        {
          id: "var_002_white",
          sku: "KB-RGB-WHT",
          price: 2199000,
          compare: 2599000,
          stock: 18,
          image:
            "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_white"],
        },
      ],
      primaryImage:
        "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_003",
      name: "Chuột Không Dây Ergonomic",
      slug: "chuot-khong-day-ergonomic",
      short_desc: "DPI điều chỉnh 400-3200, thiết kế ergonomic, pin 60 giờ",
      desc: "Chuột không dây chính xác cao, DPI tùy chỉnh linh hoạt, thiết kế ergonomic phù hợp cho cả ngày làm việc.",
      base_price: 1199000,
      category: "cat_accessories",
      variants: [
        {
          id: "var_003_black",
          sku: "MS-ERG-BLK",
          price: 1199000,
          compare: null,
          stock: 40,
          image:
            "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
      ],
      primaryImage:
        "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_004",
      name: "Đồng Hồ Thông Minh Fitness Pro",
      slug: "dong-ho-thong-minh-fitness-pro",
      short_desc: "Màn hình AMOLED, theo dõi nhịp tim, GPS tích hợp",
      desc: "Theo dõi hoạt động thể thao, nhịp tim, giấc ngủ với màn hình AMOLED sắc nét và nhận thông báo điện thoại.",
      base_price: 3499000,
      category: "cat_wearables",
      variants: [
        {
          id: "var_004_black",
          sku: "SW-FIT-BLK",
          price: 3499000,
          compare: 4299000,
          stock: 12,
          image:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
        {
          id: "var_004_silver",
          sku: "SW-FIT-SLV",
          price: 3699000,
          compare: 4299000,
          stock: 8,
          image:
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_silver"],
        },
      ],
      primaryImage:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_005",
      name: "Máy Pha Cà Phê Cold-Brew",
      slug: "may-pha-ca-phe-cold-brew",
      short_desc: "Bình thủy tinh cao cấp, pha lạnh 12 giờ, giữ tươi 2 tuần",
      desc: "Tự pha cà phê cold brew thơm ngon tại nhà. Nắp silicon kín khí giữ cà phê tươi đến 2 tuần, bình thủy tinh cao cấp.",
      base_price: 799000,
      category: "cat_kitchen",
      variants: [
        {
          id: "var_005_std",
          sku: "CB-MAKER-STD",
          price: 799000,
          compare: null,
          stock: 8,
          image:
            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
          avIds: [],
        },
      ],
      primaryImage:
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_006",
      name: 'Màn Hình Cong UltraWide 34"',
      slug: "man-hinh-cong-ultrawide-34",
      short_desc: "144Hz, HDR10, tỷ lệ 21:9, loa tích hợp kép",
      desc: "Trải nghiệm gaming và làm việc đắm chìm với màn hình cong 144Hz, HDR10, tỷ lệ 21:9 và loa kép tích hợp.",
      base_price: 10499000,
      category: "cat_computers",
      variants: [
        {
          id: "var_006_std",
          sku: "MON-UW34-BLK",
          price: 10499000,
          compare: 12999000,
          stock: 5,
          image:
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_007",
      name: "Smart TV OLED 55 Inch 4K",
      slug: "smart-tv-oled-55-inch-4k",
      short_desc: "Màn hình OLED 4K, HDR10+, Dolby Vision, tần số quét 120Hz",
      desc: "Trải nghiệm rạp chiếu phim tại gia với màn hình OLED thế hệ mới, độ tương phản vô hạn, màu đen tuyệt đối và hệ thống âm thanh vòm Dolby Atmos tích hợp.",
      base_price: 24990000,
      category: "cat_electronics",
      variants: [
        {
          id: "var_007_std",
          sku: "TV-OLED55-BLK",
          price: 24990000,
          compare: 29990000,
          stock: 12,
          image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_008",
      name: "Loa Bluetooth Soundbar Cinema",
      slug: "loa-bluetooth-soundbar-cinema",
      short_desc: "Công suất 300W, Dolby Audio, kết nối HDMI ARC & Bluetooth",
      desc: "Nâng cấp âm thanh tivi với loa Soundbar Cinema. Âm trầm sâu lắng từ loa sub không dây kèm hiệu ứng giả lập âm thanh vòm sống động.",
      base_price: 3890000,
      category: "cat_audio",
      variants: [
        {
          id: "var_008_std",
          sku: "SB-CINEMA-BLK",
          price: 3890000,
          compare: 4500000,
          stock: 15,
          image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_009",
      name: "Điện Thoại Volitify Phone One",
      slug: "dien-thoai-volitify-phone-one",
      short_desc: "Màn hình 120Hz Super AMOLED, RAM 8GB, Camera 108MP",
      desc: "Trải nghiệm mượt mà với vi xử lý 4nm, màn hình đục lỗ siêu tràn viền, sạc nhanh 67W và cụm camera chụp đêm siêu sắc nét.",
      base_price: 10990000,
      category: "cat_electronics",
      variants: [
        {
          id: "var_009_black",
          sku: "PH-ONE-BLK",
          price: 10990000,
          compare: 12490000,
          stock: 20,
          image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
        {
          id: "var_009_blue",
          sku: "PH-ONE-BLU",
          price: 10990000,
          compare: 12490000,
          stock: 15,
          image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_blue"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_010",
      name: "Laptop Volitify Book Pro 14",
      slug: "laptop-volitify-book-pro-14",
      short_desc: "Intel Core i5, RAM 16GB, SSD 512GB, Màn hình 2K IPS",
      desc: "Thiết kế kim loại nguyên khối mỏng nhẹ chỉ 1.3kg. Hiệu năng vượt trội đáp ứng tốt mọi công việc văn phòng, thiết kế đồ họa 2D và giải trí.",
      base_price: 18500000,
      category: "cat_computers",
      variants: [
        {
          id: "var_010_silver",
          sku: "LT-BPRO14-SLV",
          price: 18500000,
          compare: 21000000,
          stock: 10,
          image: "https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_silver"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1496181130204-755241524eab?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_011",
      name: "Nồi Chiên Không Dầu Smart Wave",
      slug: "noi-chien-khong-dau-smart-wave",
      short_desc: "Thể tích 5.5L, công suất 1700W, điều khiển qua App",
      desc: "Nấu ăn lành mạnh giảm 85% lượng dầu mỡ. Công nghệ luồng nhiệt tuần hoàn 360 độ giúp thức ăn chín đều, giòn rụm bên ngoài và mềm mọng bên trong.",
      base_price: 2490000,
      category: "cat_kitchen",
      variants: [
        {
          id: "var_011_white",
          sku: "KC-FRYER-WHT",
          price: 2490000,
          compare: 3200000,
          stock: 8,
          image: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_white"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=600&q=80",
    },
    {
      id: "prod_012",
      name: "Robot Hút Bụi Lau Nhà Robovac X1",
      slug: "robot-hut-bui-lau-nha-robovac-x1",
      short_desc: "Lực hút 4000Pa, lập bản đồ laser LiDAR, tự động sạc",
      desc: "Giải phóng đôi tay của bạn với robot hút bụi lau nhà thông minh. Tự động vẽ bản đồ phòng tránh chướng ngại vật cực nhạy, hẹn giờ quét dọn qua ứng dụng di động.",
      base_price: 7990000,
      category: "cat_home",
      variants: [
        {
          id: "var_012_black",
          sku: "HM-ROBO-BLK",
          price: 7990000,
          compare: 9900000,
          stock: 7,
          image: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=600&q=80",
          avIds: ["av_black"],
        },
      ],
      primaryImage: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=600&q=80",
    },
  ];

  // Wrap all product inserts in one transaction — rollback on any failure
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const req = () => transaction.request();

    for (const p of products) {
      // Insert product
      await req()
        .input("id", sql.VarChar, p.id)
        .input("name", sql.NVarChar, p.name)
        .input("slug", sql.VarChar, p.slug)
        .input("desc", sql.NVarChar, p.desc)
        .input("shortDesc", sql.NVarChar, p.short_desc)
        .input("basePrice", sql.Decimal(18, 2), p.base_price)
        .input("sellerId", sql.VarChar, p.seller_id || "sel_001")
        .query(`INSERT INTO Products (id,name,slug,description,short_desc,base_price,is_featured,seller_id)
                VALUES (@id,@name,@slug,@desc,@shortDesc,@basePrice,1,@sellerId)`);

      // Link to category
      await req()
        .input("productId", sql.VarChar, p.id)
        .input("categoryId", sql.VarChar, p.category)
        .query(`INSERT INTO ProductCategories (product_id,category_id)
                VALUES (@productId,@categoryId)`);

      // Primary image
      await req()
        .input("id", sql.VarChar, `img_${p.id}_primary`)
        .input("productId", sql.VarChar, p.id)
        .input("imageUrl", sql.VarChar, p.primaryImage)
        .input("altText", sql.NVarChar, p.name)
        .query(`INSERT INTO ProductImages (id,product_id,image_url,alt_text,is_primary)
                VALUES (@id,@productId,@imageUrl,@altText,1)`);

      // Variants
      for (const [variantIndex, v] of p.variants.entries()) {
        await req()
          .input("id", sql.VarChar, v.id)
          .input("productId", sql.VarChar, p.id)
          .input("sku", sql.VarChar, v.sku)
          .input("price", sql.Decimal(18, 2), v.price)
          .input("compare", sql.Decimal(18, 2), v.compare)
          .input("stock", sql.Int, v.stock)
          .input("imageUrl", sql.VarChar, v.image)
          .input("isDefault", sql.Bit, variantIndex === 0)
          .query(`INSERT INTO ProductVariants (
                    id,product_id,sku,price,compare_price,stock_qty,image_url,is_default
                  ) VALUES (
                    @id,@productId,@sku,@price,@compare,@stock,@imageUrl,@isDefault
                  )`);

        // Link attribute values to variant
        for (const avId of v.avIds) {
          await req()
            .input("variantId", sql.VarChar, v.id)
            .input("avId", sql.VarChar, avId)
            .query(`INSERT INTO VariantAttributeValues (variant_id,attribute_value_id)
                    VALUES (@variantId,@avId)`);
        }
      }
    }

    await transaction.commit();
    console.log("[Seed] ✓ Products, variants & categories seeded.");
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const seedUserAddresses = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM UserAddresses`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding user addresses...");
  await pool
    .request()
    .input("id", sql.VarChar, "addr_001")
    .input("userId", sql.VarChar, "usr_cust001")
    .input("name", sql.NVarChar, "Nguyen Van A")
    .input("phone", sql.VarChar, "0909876543")
    .input("address", sql.NVarChar, "Số 1 Khu Khuất Duy Tiến, Thanh Xuân")
    .input("city", sql.NVarChar, "Hà Nội")
    .query(`INSERT INTO UserAddresses (id,user_id,recipient_name,phone_number,street_address,city,is_default)
            VALUES (@id,@userId,@name,@phone,@address,@city,1)`);

  await pool
    .request()
    .input("id", sql.VarChar, "addr_002")
    .input("userId", sql.VarChar, "usr_cust001")
    .input("name", sql.NVarChar, "Nguyen Van A (Văn phòng)")
    .input("phone", sql.VarChar, "0909876543")
    .input("address", sql.NVarChar, "Tòa nhà FPT, Khu công nghệ cao Hòa Lạc")
    .input("city", sql.NVarChar, "Hà Nội")
    .query(`INSERT INTO UserAddresses (id,user_id,recipient_name,phone_number,street_address,city,is_default)
            VALUES (@id,@userId,@name,@phone,@address,@city,0)`);
  console.log("[Seed] ✓ User addresses seeded.");
};

const seedReviews = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Reviews`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding product reviews...");
  const reviews = [
    { id: "rev_001", pId: "prod_001", uId: "usr_cust001", rating: 5, body: "Tai nghe nghe nhạc rất hay, chống ồn tốt!" },
    { id: "rev_002", pId: "prod_001", uId: "usr_admin001", rating: 4, body: "Sản phẩm chất lượng ổn, thời lượng pin rất trâu." },
    { id: "rev_003", pId: "prod_002", uId: "usr_cust001", rating: 5, body: "Phím gõ nảy, LED RGB đẹp lung linh." },
    { id: "rev_004", pId: "prod_004", uId: "usr_cust001", rating: 4, body: "Đồng hồ đo nhịp tim chuẩn xác, màn hình sáng nét." },
    { id: "rev_005", pId: "prod_007", uId: "usr_cust001", rating: 5, body: "Màn hình OLED 4K hiển thị xuất sắc, xem phim cực kỳ đã mắt." },
    { id: "rev_006", pId: "prod_010", uId: "usr_cust001", rating: 5, body: "Laptop mỏng nhẹ, hiệu năng tốt, pin trâu dùng cả ngày." }
  ];

  for (const r of reviews) {
    await pool
      .request()
      .input("id", sql.VarChar, r.id)
      .input("pId", sql.VarChar, r.pId)
      .input("uId", sql.VarChar, r.uId)
      .input("rating", sql.Int, r.rating)
      .input("body", sql.NVarChar, r.body)
      .query(`INSERT INTO Reviews (id,product_id,user_id,rating,body)
              VALUES (@id,@pId,@uId,@rating,@body)`);
  }
  console.log("[Seed] ✓ Reviews seeded.");
};

const seedCoupons = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Coupons`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding discount coupons...");
  await pool
    .request()
    .input("id", sql.VarChar, "coup_001")
    .input("code", sql.VarChar, "VOLITIFY10")
    .input("type", sql.VarChar, "percentage")
    .input("val", sql.Decimal(18, 2), 10.00)
    .input("minSpend", sql.Decimal(18, 2), 1000000.00)
    .input("maxDisc", sql.Decimal(18, 2), 500000.00)
    .query(`INSERT INTO Coupons (id,code,discount_type,discount_value,min_order_amount,max_discount_amt,is_active)
            VALUES (@id,@code,@type,@val,@minSpend,@maxDisc,1)`);

  await pool
    .request()
    .input("id", sql.VarChar, "coup_002")
    .input("code", sql.VarChar, "GIAM50K")
    .input("type", sql.VarChar, "fixed")
    .input("val", sql.Decimal(18, 2), 50000.00)
    .input("minSpend", sql.Decimal(18, 2), 500000.00)
    .query(`INSERT INTO Coupons (id,code,discount_type,discount_value,min_order_amount,is_active)
            VALUES (@id,@code,@type,@val,@minSpend,1)`);
  console.log("[Seed] ✓ Coupons seeded.");
};

const seedProductCombos = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM ProductCombos`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding AI product combos...");
  const combos = [
    { name: "Bộ PC Sinh Viên - Văn Phòng", desc: "Bộ PC cơ bản, cực kỳ tiết kiệm. Đáp ứng mượt mà các tác vụ Word, Excel, lướt web.", price: 8500000.00, cat: "PC", uc: "văn phòng, sinh viên", specs: "Core i3, 8GB RAM, 256GB SSD", img: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2042&auto=format&fit=crop" },
    { name: "Bộ PC Esport - Quốc dân", desc: "Sự lựa chọn quốc dân cho sinh viên và game thủ nhẹ nhàng. Cân mượt các game Esport.", price: 15000000.00, cat: "PC", uc: "chơi game, esport", specs: "Core i5, 16GB RAM, GTX 1650, 512GB SSD", img: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=1965&auto=format&fit=crop" },
    { name: "Bộ PC Đa Năng - Cân Đồ Họa", desc: "Best choice trong tầm giá 25 triệu. Vừa chơi game AAA mượt, vừa thiết kế êm ru.", price: 25000000.00, cat: "PC", uc: "đồ họa, chơi game mượt", specs: "Core i5 Gen 13, 16GB RAM, RTX 4060, 1TB SSD", img: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=2000&auto=format&fit=crop" },
    { name: "Bếp Nhỏ Nấu Nhanh (Phòng Trọ)", desc: "Giải pháp cho không gian hẹp. Gọn gàng, dễ dọn dẹp, đủ nấu ăn cơ bản.", price: 3500000.00, cat: "Kitchen", uc: "phòng trọ, độc thân", specs: "Bếp từ đơn, Nồi cơm mini, Ấm siêu tốc", img: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2070&auto=format&fit=crop" },
    { name: "Phòng Khách Điện Ảnh", desc: "Biến phòng khách thành rạp phim mini, trải nghiệm âm thanh hình ảnh tuyệt đỉnh.", price: 35000000.00, cat: "SmartHome", uc: "phòng khách, xem phim", specs: "Smart TV OLED 55 inch, Loa Soundbar 5.1", img: "https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop" }
  ];

  for (const c of combos) {
    await pool
      .request()
      .input("name", sql.NVarChar, c.name)
      .input("desc", sql.NVarChar, c.desc)
      .input("price", sql.Decimal(15, 2), c.price)
      .input("cat", sql.NVarChar, c.cat)
      .input("uc", sql.NVarChar, c.uc)
      .input("specs", sql.NVarChar, c.specs)
      .input("img", sql.NVarChar, c.img)
      .query(`INSERT INTO ProductCombos (name,description,price,category,use_case,specs_summary,image_url)
              VALUES (@name,@desc,@price,@cat,@uc,@specs,@img)`);
  }
  console.log("[Seed] ✓ AI product combos seeded.");
};

const seedOrders = async (pool, sql) => {
  const { recordset } = await pool
    .request()
    .query(`SELECT COUNT(*) AS cnt FROM Orders`);
  if (recordset[0].cnt > 0) return;

  console.log("[Seed] Seeding order histories...");
  
  // Seeding 1 completed order
  await pool
    .request()
    .input("id", sql.VarChar, "ord_001")
    .input("userId", sql.VarChar, "usr_cust001")
    .input("status", sql.VarChar, "delivered")
    .input("subtotal", sql.Decimal(18, 2), 4599000.00)
    .input("discount", sql.Decimal(18, 2), 0.00)
    .input("shipping", sql.Decimal(18, 2), 30000.00)
    .input("total", sql.Decimal(18, 2), 4629000.00)
    .input("name", sql.NVarChar, "Nguyen Van A")
    .input("phone", sql.VarChar, "0909876543")
    .input("address", sql.NVarChar, "Số 1 Khu Khuất Duy Tiến, Thanh Xuân")
    .input("city", sql.NVarChar, "Hà Nội")
    .query(`INSERT INTO Orders (id,user_id,status,subtotal,discount_amount,shipping_fee,total,shipping_name,shipping_phone,shipping_address,shipping_city)
            VALUES (@id,@userId,@status,@subtotal,@discount,@shipping,@total,@name,@phone,@address,@city)`);

  await pool
    .request()
    .input("id", sql.VarChar, "item_001")
    .input("orderId", sql.VarChar, "ord_001")
    .input("variantId", sql.VarChar, "var_001_black")
    .input("qty", sql.Int, 1)
    .input("price", sql.Decimal(18, 2), 4599000.00)
    .input("total", sql.Decimal(18, 2), 4599000.00)
    .input("prodName", sql.NVarChar, "Tai Nghe Chống Ồn Premium")
    .input("varInfo", sql.NVarChar, "Màu sắc: Đen")
    .query(`INSERT INTO OrderItems (id,order_id,variant_id,quantity,unit_price,total_price,product_name,variant_info)
            VALUES (@id,@orderId,@variantId,@qty,@price,@total,@prodName,@varInfo)`);

  // Seeding 1 pending order
  await pool
    .request()
    .input("id", sql.VarChar, "ord_002")
    .input("userId", sql.VarChar, "usr_cust001")
    .input("status", sql.VarChar, "pending")
    .input("subtotal", sql.Decimal(18, 2), 1199000.00)
    .input("discount", sql.Decimal(18, 2), 50000.00)
    .input("shipping", sql.Decimal(18, 2), 0.00)
    .input("total", sql.Decimal(18, 2), 1149000.00)
    .input("name", sql.NVarChar, "Nguyen Van A")
    .input("phone", sql.VarChar, "0909876543")
    .input("address", sql.NVarChar, "Số 1 Khu Khuất Duy Tiến, Thanh Xuân")
    .input("city", sql.NVarChar, "Hà Nội")
    .query(`INSERT INTO Orders (id,user_id,status,subtotal,discount_amount,shipping_fee,total,shipping_name,shipping_phone,shipping_address,shipping_city)
            VALUES (@id,@userId,@status,@subtotal,@discount,@shipping,@total,@name,@phone,@address,@city)`);

  await pool
    .request()
    .input("id", sql.VarChar, "item_002")
    .input("orderId", sql.VarChar, "ord_002")
    .input("variantId", sql.VarChar, "var_003_black")
    .input("qty", sql.Int, 1)
    .input("price", sql.Decimal(18, 2), 1199000.00)
    .input("total", sql.Decimal(18, 2), 1199000.00)
    .input("prodName", sql.NVarChar, "Chuột Không Dây Ergonomic")
    .input("varInfo", sql.NVarChar, "Màu sắc: Đen")
    .query(`INSERT INTO OrderItems (id,order_id,variant_id,quantity,unit_price,total_price,product_name,variant_info)
            VALUES (@id,@orderId,@variantId,@qty,@price,@total,@prodName,@varInfo)`);

  console.log("[Seed] ✓ Order histories seeded.");
};
