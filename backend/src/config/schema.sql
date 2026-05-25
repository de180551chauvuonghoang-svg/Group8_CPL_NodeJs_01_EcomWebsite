-- ============================================================
--  E-Com FPT — Full Database Schema (SQL Server)
--  DERIVED FROM: backend/src/config/initDb.js (source of truth)
--  This file is a human-readable copy for direct SSMS execution.
--  When you alter a table, update BOTH this file AND initDb.js.
--  Run this script in SSMS against the [ecomfpt] database.
-- ============================================================

USE [ecomfpt];
GO

-- ============================================================
--  GROUP 1: USERS & AUTH
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
  CREATE TABLE Users (
    id            VARCHAR(50)    NOT NULL PRIMARY KEY,
    name          NVARCHAR(100)  NOT NULL,
    email         VARCHAR(150)   NOT NULL UNIQUE,
    password      VARCHAR(255)   NOT NULL,
    phone_number  VARCHAR(20)    NULL,
    avatar_url    VARCHAR(2083)  NULL,
    role          VARCHAR(20)    NOT NULL DEFAULT 'customer',  -- 'customer' | 'admin' | 'staff'
    is_active     BIT            NOT NULL DEFAULT 1,
    created_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  PRINT '[✓] Table Users created';
END
GO

-- ============================================================
--  GROUP 2: CATEGORIES (self-join for sub-categories)
-- ============================================================

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
GO

-- ============================================================
--  GROUP 3: PRODUCTS & CATALOG
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Products')
BEGIN
  CREATE TABLE Products (
    id              VARCHAR(50)    NOT NULL PRIMARY KEY,
    name            NVARCHAR(255)  NOT NULL,
    slug            VARCHAR(300)   NOT NULL UNIQUE,
    description     NVARCHAR(MAX)  NULL,
    short_desc      NVARCHAR(500)  NULL,
    base_price      DECIMAL(18,2)  NOT NULL DEFAULT 0,
    is_active       BIT            NOT NULL DEFAULT 1,
    is_featured     BIT            NOT NULL DEFAULT 0,
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_Products_slug ON Products(slug);
  PRINT '[✓] Table Products created';
END
GO

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
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductCategories')
BEGIN
  CREATE TABLE ProductCategories (
    product_id    VARCHAR(50)  NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
    category_id   VARCHAR(50)  NOT NULL REFERENCES Categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
  );
  PRINT '[✓] Table ProductCategories created';
END
GO

-- Attributes: e.g. "Color", "Size", "Storage"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Attributes')
BEGIN
  CREATE TABLE Attributes (
    id          VARCHAR(50)    NOT NULL PRIMARY KEY,
    name        NVARCHAR(100)  NOT NULL UNIQUE,
    created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  PRINT '[✓] Table Attributes created';
END
GO

-- AttributeValues: e.g. "Red", "XL", "256GB"
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AttributeValues')
BEGIN
  CREATE TABLE AttributeValues (
    id            VARCHAR(50)    NOT NULL PRIMARY KEY,
    attribute_id  VARCHAR(50)    NOT NULL REFERENCES Attributes(id) ON DELETE CASCADE,
    value         NVARCHAR(150)  NOT NULL,
    color_hex     VARCHAR(7)     NULL,  -- For color swatches, e.g. '#FF0000'
    sort_order    INT            NOT NULL DEFAULT 0
  );
  CREATE INDEX IX_AttributeValues_attribute_id ON AttributeValues(attribute_id);
  PRINT '[✓] Table AttributeValues created';
END
GO

-- ProductVariants: each SKU = 1 specific version of a product
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductVariants')
BEGIN
  CREATE TABLE ProductVariants (
    id            VARCHAR(50)    NOT NULL PRIMARY KEY,
    product_id    VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
    sku           VARCHAR(100)   NOT NULL UNIQUE,
    price         DECIMAL(18,2)  NOT NULL,
    compare_price DECIMAL(18,2)  NULL,  -- Original price for strikethrough display
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
GO

-- VariantAttributeValues: which attribute values a variant has
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VariantAttributeValues')
BEGIN
  CREATE TABLE VariantAttributeValues (
    variant_id          VARCHAR(50)  NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
    attribute_value_id  VARCHAR(50)  NOT NULL REFERENCES AttributeValues(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, attribute_value_id)
  );
  PRINT '[✓] Table VariantAttributeValues created';
END
GO

-- InventoryLogs: track every stock change
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryLogs')
BEGIN
  CREATE TABLE InventoryLogs (
    id              VARCHAR(50)    NOT NULL PRIMARY KEY,
    variant_id      VARCHAR(50)    NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
    change_qty      INT            NOT NULL,  -- Positive = stock in, Negative = stock out
    reason          NVARCHAR(255)  NULL,       -- 'purchase', 'restock', 'adjustment', 'return'
    reference_id    VARCHAR(50)    NULL,       -- Order ID or other reference
    created_by      VARCHAR(50)    NULL REFERENCES Users(id) ON DELETE SET NULL,
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_InventoryLogs_variant_id ON InventoryLogs(variant_id);
  PRINT '[✓] Table InventoryLogs created';
END
GO

-- ============================================================
--  GROUP 4: REVIEWS
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reviews')
BEGIN
  CREATE TABLE Reviews (
    id              VARCHAR(50)    NOT NULL PRIMARY KEY,
    product_id      VARCHAR(50)    NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
    user_id         VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
    order_item_id   VARCHAR(50)    NULL,  -- FK added after OrderItems table is created
    rating          TINYINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           NVARCHAR(255)  NULL,
    body            NVARCHAR(MAX)  NULL,
    is_verified     BIT            NOT NULL DEFAULT 0,  -- True if linked to a real purchase
    is_approved     BIT            NOT NULL DEFAULT 1,
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_Reviews_product_id ON Reviews(product_id);
  CREATE INDEX IX_Reviews_user_id    ON Reviews(user_id);
  PRINT '[✓] Table Reviews created';
END
GO

-- ============================================================
--  GROUP 5: CART & WISHLIST
-- ============================================================

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
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CartItems')
BEGIN
  CREATE TABLE CartItems (
    id          VARCHAR(50)    NOT NULL PRIMARY KEY,
    cart_id     VARCHAR(50)    NOT NULL REFERENCES Carts(id) ON DELETE CASCADE,
    variant_id  VARCHAR(50)    NOT NULL REFERENCES ProductVariants(id) ON DELETE CASCADE,
    quantity    INT            NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
    UNIQUE (cart_id, variant_id)
  );
  CREATE INDEX IX_CartItems_cart_id ON CartItems(cart_id);
  PRINT '[✓] Table CartItems created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Wishlists')
BEGIN
  CREATE TABLE Wishlists (
    id          VARCHAR(50)  NOT NULL PRIMARY KEY,
    user_id     VARCHAR(50)  NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
    created_at  DATETIME2    NOT NULL DEFAULT GETDATE()
  );
  PRINT '[✓] Table Wishlists created';
END
GO

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
GO

-- ============================================================
--  GROUP 6: COUPONS
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Coupons')
BEGIN
  CREATE TABLE Coupons (
    id                VARCHAR(50)    NOT NULL PRIMARY KEY,
    code              VARCHAR(50)    NOT NULL UNIQUE,
    description       NVARCHAR(500)  NULL,
    discount_type     VARCHAR(20)    NOT NULL DEFAULT 'percentage',  -- 'percentage' | 'fixed'
    discount_value    DECIMAL(18,2)  NOT NULL,
    min_order_amount  DECIMAL(18,2)  NULL,
    max_discount_amt  DECIMAL(18,2)  NULL,  -- Cap for percentage discounts
    usage_limit       INT            NULL,   -- NULL = unlimited
    used_count        INT            NOT NULL DEFAULT 0,
    user_limit        INT            NULL DEFAULT 1,  -- Uses per user
    starts_at         DATETIME2      NULL,
    expires_at        DATETIME2      NULL,
    is_active         BIT            NOT NULL DEFAULT 1,
    created_at        DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_Coupons_code ON Coupons(code);
  PRINT '[✓] Table Coupons created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CouponProducts')
BEGIN
  CREATE TABLE CouponProducts (
    coupon_id   VARCHAR(50)  NOT NULL REFERENCES Coupons(id) ON DELETE CASCADE,
    product_id  VARCHAR(50)  NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, product_id)
  );
  PRINT '[✓] Table CouponProducts created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CouponCategories')
BEGIN
  CREATE TABLE CouponCategories (
    coupon_id    VARCHAR(50)  NOT NULL REFERENCES Coupons(id) ON DELETE CASCADE,
    category_id  VARCHAR(50)  NOT NULL REFERENCES Categories(id) ON DELETE CASCADE,
    PRIMARY KEY (coupon_id, category_id)
  );
  PRINT '[✓] Table CouponCategories created';
END
GO

-- ============================================================
--  GROUP 7: ORDERS & PAYMENTS
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Orders')
BEGIN
  CREATE TABLE Orders (
    id                  VARCHAR(50)    NOT NULL PRIMARY KEY,
    user_id             VARCHAR(50)    NOT NULL REFERENCES Users(id) ON DELETE NO ACTION,
    coupon_id           VARCHAR(50)    NULL REFERENCES Coupons(id) ON DELETE SET NULL,
    status              VARCHAR(30)    NOT NULL DEFAULT 'pending',
      -- 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
    subtotal            DECIMAL(18,2)  NOT NULL,
    discount_amount     DECIMAL(18,2)  NOT NULL DEFAULT 0,
    shipping_fee        DECIMAL(18,2)  NOT NULL DEFAULT 0,
    total               DECIMAL(18,2)  NOT NULL,
    -- Snapshot of shipping address at order time
    shipping_name       NVARCHAR(150)  NOT NULL,
    shipping_phone      VARCHAR(20)    NOT NULL,
    shipping_address    NVARCHAR(500)  NOT NULL,
    shipping_city       NVARCHAR(100)  NULL,
    shipping_country    NVARCHAR(100)  NOT NULL DEFAULT 'Vietnam',
    note                NVARCHAR(500)  NULL,
    created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_Orders_user_id  ON Orders(user_id);
  CREATE INDEX IX_Orders_status   ON Orders(status);
  PRINT '[✓] Table Orders created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderItems')
BEGIN
  CREATE TABLE OrderItems (
    id              VARCHAR(50)    NOT NULL PRIMARY KEY,
    order_id        VARCHAR(50)    NOT NULL REFERENCES Orders(id) ON DELETE CASCADE,
    variant_id      VARCHAR(50)    NOT NULL REFERENCES ProductVariants(id) ON DELETE NO ACTION,
    quantity        INT            NOT NULL CHECK (quantity > 0),
    -- Snapshot of price at order time
    unit_price      DECIMAL(18,2)  NOT NULL,
    total_price     DECIMAL(18,2)  NOT NULL,  -- unit_price * quantity
    product_name    NVARCHAR(255)  NOT NULL,
    variant_info    NVARCHAR(255)  NULL,       -- e.g. "Red / XL"
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_OrderItems_order_id   ON OrderItems(order_id);
  CREATE INDEX IX_OrderItems_variant_id ON OrderItems(variant_id);
  PRINT '[✓] Table OrderItems created';
END
GO

-- Add FK from Reviews to OrderItems (deferred because OrderItems created after Reviews)
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_Reviews_OrderItems'
)
BEGIN
  ALTER TABLE Reviews
    ADD CONSTRAINT FK_Reviews_OrderItems
    FOREIGN KEY (order_item_id) REFERENCES OrderItems(id) ON DELETE SET NULL;
  PRINT '[✓] FK Reviews → OrderItems added';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Payments')
BEGIN
  CREATE TABLE Payments (
    id                VARCHAR(50)    NOT NULL PRIMARY KEY,
    order_id          VARCHAR(50)    NOT NULL UNIQUE REFERENCES Orders(id) ON DELETE CASCADE,
    method            VARCHAR(50)    NOT NULL,  -- 'cod' | 'bank_transfer' | 'vnpay' | 'momo' | 'stripe'
    status            VARCHAR(30)    NOT NULL DEFAULT 'pending',
      -- 'pending' | 'paid' | 'failed' | 'refunded'
    amount            DECIMAL(18,2)  NOT NULL,
    transaction_ref   VARCHAR(255)   NULL,       -- External payment gateway ref
    paid_at           DATETIME2      NULL,
    created_at        DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  PRINT '[✓] Table Payments created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Refunds')
BEGIN
  CREATE TABLE Refunds (
    id              VARCHAR(50)    NOT NULL PRIMARY KEY,
    payment_id      VARCHAR(50)    NOT NULL UNIQUE REFERENCES Payments(id) ON DELETE CASCADE,
    reason          NVARCHAR(500)  NULL,
    status          VARCHAR(30)    NOT NULL DEFAULT 'pending',
      -- 'pending' | 'approved' | 'rejected' | 'completed'
    refund_amount   DECIMAL(18,2)  NOT NULL,
    refunded_at     DATETIME2      NULL,
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE()
  );
  PRINT '[✓] Table Refunds created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RefundItems')
BEGIN
  CREATE TABLE RefundItems (
    id              VARCHAR(50)  NOT NULL PRIMARY KEY,
    refund_id       VARCHAR(50)  NOT NULL REFERENCES Refunds(id) ON DELETE CASCADE,
    order_item_id   VARCHAR(50)  NOT NULL REFERENCES OrderItems(id) ON DELETE NO ACTION,
    quantity        INT          NOT NULL CHECK (quantity > 0),
    refund_amount   DECIMAL(18,2) NOT NULL
  );
  CREATE INDEX IX_RefundItems_refund_id ON RefundItems(refund_id);
  PRINT '[✓] Table RefundItems created';
END
GO

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
GO

PRINT '';
PRINT '============================================================';
PRINT '  ✅  E-Com FPT Schema applied successfully! (24 tables)';
PRINT '============================================================';
