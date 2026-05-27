# 📚 Tài Liệu Database Schema — E-Com FPT

> **Nguồn dữ liệu:** `backend/src/config/initDb.js` (source of truth)  
> **Database:** Microsoft SQL Server | **Tổng số bảng:** 24  
> **Cập nhật lần cuối:** 2026-05-25

---

## 📑 Mục Lục

| # | Nhóm | Bảng |
|---|---|---|
| | **👤 Users & Auth** | [Users](#1-users) |
| | **🗂️ Categories** | [Categories](#2-categories) |
| | **📦 Products & Catalog** | [Products](#3-products) · [ProductImages](#4-productimages) · [ProductCategories](#5-productcategories) · [Attributes](#6-attributes) · [AttributeValues](#7-attributevalues) · [ProductVariants](#8-productvariants) · [VariantAttributeValues](#9-variantattributevalues) · [InventoryLogs](#10-inventorylogs) |
| | **⭐ Reviews** | [Reviews](#11-reviews) |
| | **🛒 Cart & Wishlist** | [Carts](#12-carts) · [CartItems](#13-cartitems) · [Wishlists](#14-wishlists) · [WishlistItems](#15-wishlistitems) |
| | **🎟️ Coupons** | [Coupons](#16-coupons) · [CouponProducts](#17-couponproducts) · [CouponCategories](#18-couponcategories) |
| | **📋 Orders & Payments** | [Orders](#19-orders) · [OrderItems](#20-orderitems) · [Payments](#21-payments) · [Refunds](#22-refunds) · [RefundItems](#23-refunditems) · [CouponUsage](#24-couponusage) |

---

## 👤 NHÓM 1: USERS & AUTH

---

### 1. `Users`

**Công dụng:** Lưu thông tin tài khoản người dùng — bao gồm khách hàng, admin và nhân viên. Đây là bảng trung tâm được hầu hết các bảng khác tham chiếu.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính, định danh duy nhất cho mỗi user (vd: `usr_abc123`) |
| `name` | `NVARCHAR(100)` | NOT NULL | Họ tên đầy đủ (hỗ trợ tiếng Việt) |
| `email` | `VARCHAR(150)` | NOT NULL, **UNIQUE** | Email đăng nhập — không được trùng lặp |
| `password` | `VARCHAR(255)` | NOT NULL | Mật khẩu đã được mã hóa bằng bcrypt |
| `phone_number` | `VARCHAR(20)` | NULL | Số điện thoại (tùy chọn) |
| `avatar_url` | `VARCHAR(2083)` | NULL | URL ảnh đại diện (tùy chọn) |
| `role` | `VARCHAR(20)` | NOT NULL, DEFAULT `'customer'` | Vai trò: `customer` (mặc định) hoặc `admin` |
| `is_active` | `BIT` | NOT NULL, DEFAULT `1` | Tài khoản đang hoạt động (`1`) hay bị khóa (`0`) |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo tài khoản |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm cập nhật lần cuối |

**Quan hệ:**
- ← Được tham chiếu bởi: `Carts`, `Wishlists`, `Orders`, `Reviews`, `InventoryLogs`, `CouponUsage`

---

## 🗂️ NHÓM 2: CATEGORIES

---

### 2. `Categories`

**Công dụng:** Lưu danh mục sản phẩm. Hỗ trợ cấu trúc **cây phân cấp** (danh mục cha → danh mục con) thông qua self-join qua cột `parent_id`.

**Ví dụ cây danh mục:**
```text
Điện Tử (cat_electronics)
├── Âm Thanh (cat_audio)
├── Máy Tính (cat_computers)
└── Phụ Kiện (cat_accessories)
Gia Dụng (cat_home)
└── Nhà Bếp (cat_kitchen)
```

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính (vd: `cat_electronics`) |
| `name` | `NVARCHAR(150)` | NOT NULL | Tên danh mục (hỗ trợ tiếng Việt) |
| `slug` | `VARCHAR(200)` | NOT NULL, **UNIQUE** | URL-friendly name (vd: `dien-tu`) — dùng trong URL |
| `description` | `NVARCHAR(MAX)` | NULL | Mô tả danh mục |
| `image_url` | `VARCHAR(2083)` | NULL | Ảnh đại diện danh mục |
| `parent_id` | `VARCHAR(50)` | NULL, **FK → Categories.id** | ID danh mục cha. NULL = danh mục gốc |
| `sort_order` | `INT` | NOT NULL, DEFAULT `0` | Thứ tự hiển thị (số nhỏ hiển thị trước) |
| `is_active` | `BIT` | NOT NULL, DEFAULT `1` | Danh mục đang hiển thị hay ẩn |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |

**Index:** `IX_Categories_parent_id` trên cột `parent_id` — tăng tốc truy vấn danh mục con.

**Quan hệ:**
- 🔄 **Self-join:** `parent_id` → `Categories.id` (danh mục cha/con)
- ← Được tham chiếu bởi: `ProductCategories`, `CouponCategories`

---

## 📦 NHÓM 3: PRODUCTS & CATALOG

---

### 3. `Products`

**Công dụng:** Lưu thông tin sản phẩm **gốc**. Không lưu giá hay tồn kho trực tiếp — những thông tin biến đổi theo màu sắc/kích cỡ được lưu trong `ProductVariants`.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính (vd: `prod_001`) |
| `name` | `NVARCHAR(255)` | NOT NULL | Tên sản phẩm |
| `slug` | `VARCHAR(300)` | NOT NULL, **UNIQUE** | URL-friendly name (vd: `tai-nghe-chong-on-premium`) |
| `description` | `NVARCHAR(MAX)` | NULL | Mô tả chi tiết sản phẩm |
| `short_desc` | `NVARCHAR(500)` | NULL | Mô tả ngắn hiển thị trong card sản phẩm |
| `base_price` | `DECIMAL(18,2)` | NOT NULL, DEFAULT `0` | Giá tham chiếu cơ bản (giá thực tế xem trong `ProductVariants`) |
| `is_active` | `BIT` | NOT NULL, DEFAULT `1` | Sản phẩm đang bán hay đã ngừng |
| `is_featured` | `BIT` | NOT NULL, DEFAULT `0` | Hiển thị ở trang chủ hay không |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm cập nhật |

**Index:** `IX_Products_slug` trên cột `slug`.

**Quan hệ:**
- ← Được tham chiếu bởi: `ProductImages`, `ProductCategories`, `ProductVariants`, `Reviews`, `WishlistItems`, `CouponProducts`

---

### 4. `ProductImages`

**Công dụng:** Lưu nhiều ảnh cho một sản phẩm. Một sản phẩm có thể có nhiều ảnh, trong đó một ảnh được đánh dấu là **ảnh chính** (`is_primary = 1`) hiển thị làm thumbnail.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `product_id` | `VARCHAR(50)` | NOT NULL, **FK → Products.id** | Sản phẩm sở hữu ảnh này |
| `image_url` | `VARCHAR(2083)` | NOT NULL | URL đường dẫn ảnh |
| `alt_text` | `NVARCHAR(255)` | NULL | Mô tả ảnh (cho SEO và accessibility) |
| `sort_order` | `INT` | NOT NULL, DEFAULT `0` | Thứ tự hiển thị trong gallery |
| `is_primary` | `BIT` | NOT NULL, DEFAULT `0` | `1` = ảnh đại diện chính của sản phẩm |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm upload |

**Ràng buộc FK:** `ON DELETE CASCADE` — xóa sản phẩm → tự xóa toàn bộ ảnh của sản phẩm đó.

**Index:** `IX_ProductImages_product_id`

---

### 5. `ProductCategories`

**Công dụng:** Bảng **trung gian** (junction table) thể hiện quan hệ **nhiều-nhiều** giữa `Products` và `Categories`. Một sản phẩm có thể thuộc nhiều danh mục, một danh mục chứa nhiều sản phẩm.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `product_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → Products.id** | ID sản phẩm |
| `category_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → Categories.id** | ID danh mục |

> **Khóa chính kép:** `(product_id, category_id)` — đảm bảo không có bản ghi trùng lặp.  
> **ON DELETE CASCADE** từ cả hai phía — xóa sản phẩm hoặc danh mục thì bản ghi trung gian tự xóa.

---

### 6. `Attributes`

**Công dụng:** Định nghĩa các **loại thuộc tính** mà sản phẩm có thể có. Ví dụ: "Màu sắc", "Kích thước", "Dung lượng".

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính (vd: `attr_color`) |
| `name` | `NVARCHAR(100)` | NOT NULL, **UNIQUE** | Tên thuộc tính (vd: "Màu sắc") |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |

**Quan hệ:**
- → Có nhiều `AttributeValues`

---

### 7. `AttributeValues`

**Công dụng:** Lưu các **giá trị cụ thể** của từng thuộc tính. Ví dụ: Thuộc tính "Màu sắc" có các giá trị "Đen", "Trắng", "Bạc". Đặc biệt hỗ trợ mã màu HEX cho các giá trị màu sắc.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính (vd: `av_black`) |
| `attribute_id` | `VARCHAR(50)` | NOT NULL, **FK → Attributes.id** | Thuộc tính cha |
| `value` | `NVARCHAR(150)` | NOT NULL | Giá trị (vd: "Đen", "XL", "256GB") |
| `color_hex` | `VARCHAR(7)` | NULL | Mã màu HEX (vd: `#1a1a1a`) — chỉ dùng cho thuộc tính màu sắc |
| `sort_order` | `INT` | NOT NULL, DEFAULT `0` | Thứ tự hiển thị trong bộ lọc |

**Ràng buộc FK:** `ON DELETE CASCADE` — xóa Attribute thì xóa toàn bộ giá trị của nó.

**Index:** `IX_AttributeValues_attribute_id`

---

### 8. `ProductVariants`

**Công dụng:** Lưu từng **biến thể cụ thể** (SKU) của sản phẩm. Mỗi biến thể là một phiên bản sản phẩm có giá, tồn kho và hình ảnh riêng. Ví dụ: "Tai nghe màu Đen" và "Tai nghe màu Trắng" là 2 variants khác nhau của cùng 1 sản phẩm.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính (vd: `var_001_black`) |
| `product_id` | `VARCHAR(50)` | NOT NULL, **FK → Products.id** | Sản phẩm gốc |
| `sku` | `VARCHAR(100)` | NOT NULL, **UNIQUE** | Mã SKU duy nhất (vd: `HP-PREM-BLK`) |
| `price` | `DECIMAL(18,2)` | NOT NULL | Giá bán thực tế của biến thể này |
| `compare_price` | `DECIMAL(18,2)` | NULL | Giá gốc (để hiển thị strikethrough, tính % giảm giá) |
| `stock_qty` | `INT` | NOT NULL, DEFAULT `0` | Số lượng tồn kho |
| `weight_kg` | `DECIMAL(8,3)` | NULL | Trọng lượng (dùng tính phí ship) |
| `image_url` | `VARCHAR(2083)` | NULL | Ảnh riêng của biến thể (ưu tiên hơn ảnh sản phẩm) |
| `is_active` | `BIT` | NOT NULL, DEFAULT `1` | Biến thể còn bán hay đã ngừng |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm cập nhật |

**Index:** `IX_ProductVariants_product_id`, `IX_ProductVariants_sku`

**Quan hệ:**
- ← Được tham chiếu bởi: `VariantAttributeValues`, `CartItems`, `OrderItems`, `InventoryLogs`

---

### 9. `VariantAttributeValues`

**Công dụng:** Bảng **trung gian** thể hiện quan hệ nhiều-nhiều — mỗi biến thể sản phẩm có thể mang nhiều giá trị thuộc tính. Ví dụ: Biến thể `var_001_black` có thuộc tính `av_black` (Màu đen) và `av_256gb` (256GB).

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `variant_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → ProductVariants.id** | Biến thể sản phẩm |
| `attribute_value_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → AttributeValues.id** | Giá trị thuộc tính của biến thể |

> **Khóa chính kép:** `(variant_id, attribute_value_id)`  
> **ON DELETE CASCADE** từ cả hai phía.

---

### 10. `InventoryLogs`

**Công dụng:** Ghi lại lịch sử **nhập/xuất kho** cho từng biến thể sản phẩm. Mỗi lần tồn kho thay đổi (nhập hàng, bán hàng, điều chỉnh, hoàn trả) đều được ghi log để truy vết.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `variant_id` | `VARCHAR(50)` | NOT NULL, **FK → ProductVariants.id** | Biến thể sản phẩm được điều chỉnh |
| `change_qty` | `INT` | NOT NULL | Số lượng thay đổi: **dương (+)** = nhập kho, **âm (-)** = xuất kho |
| `reason` | `NVARCHAR(255)` | NULL | Lý do: `purchase`, `restock`, `adjustment`, `return` |
| `reference_id` | `VARCHAR(50)` | NULL | ID đơn hàng hoặc phiếu nhập kho liên quan |
| `created_by` | `VARCHAR(50)` | NULL, **FK → Users.id** | Admin/nhân viên thực hiện điều chỉnh |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm điều chỉnh |

**Index:** `IX_InventoryLogs_variant_id`

---

## ⭐ NHÓM 4: REVIEWS

---

### 11. `Reviews`

**Công dụng:** Lưu đánh giá và nhận xét của người dùng về sản phẩm. Hỗ trợ xác minh người dùng **đã thực sự mua hàng** thông qua liên kết với `OrderItems`.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `product_id` | `VARCHAR(50)` | NOT NULL, **FK → Products.id** | Sản phẩm được đánh giá |
| `user_id` | `VARCHAR(50)` | NOT NULL, **FK → Users.id** | Người viết đánh giá |
| `order_item_id` | `VARCHAR(50)` | NULL, **FK → OrderItems.id** | Mục đơn hàng liên kết (xác minh đã mua) — NULL = không cần xác minh |
| `rating` | `TINYINT` | NOT NULL, CHECK (1-5) | Sao đánh giá từ 1 đến 5 |
| `title` | `NVARCHAR(255)` | NULL | Tiêu đề đánh giá |
| `body` | `NVARCHAR(MAX)` | NULL | Nội dung đánh giá chi tiết |
| `is_verified` | `BIT` | NOT NULL, DEFAULT `0` | `1` = đã mua hàng (có `order_item_id`) |
| `is_approved` | `BIT` | NOT NULL, DEFAULT `1` | Admin duyệt hiển thị hay ẩn |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm đánh giá |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm chỉnh sửa |

> ⚠️ **Lưu ý quan trọng:** FK `order_item_id → OrderItems.id` được thêm vào **sau** khi cả `Reviews` và `OrderItems` đã tồn tại (thêm trễ bằng `ALTER TABLE`) để tránh circular dependency khi tạo bảng.

**Index:** `IX_Reviews_product_id`, `IX_Reviews_user_id`

---

## 🛒 NHÓM 5: CART & WISHLIST

---

### 12. `Carts`

**Công dụng:** Đại diện cho **giỏ hàng** của mỗi người dùng. Mỗi user chỉ có **đúng một** giỏ hàng (quan hệ 1-1 với Users). Các sản phẩm trong giỏ được lưu ở `CartItems`.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `user_id` | `VARCHAR(50)` | NOT NULL, **UNIQUE**, **FK → Users.id** | Chủ sở hữu giỏ hàng (mỗi user chỉ 1 giỏ) |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo giỏ hàng |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm cập nhật lần cuối |

> **UNIQUE** trên `user_id` đảm bảo mỗi user **chỉ có đúng 1** giỏ hàng.

---

### 13. `CartItems`

**Công dụng:** Lưu từng **sản phẩm (variant) trong giỏ hàng**. Một giỏ hàng có thể chứa nhiều sản phẩm khác nhau.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `cart_id` | `VARCHAR(50)` | NOT NULL, **FK → Carts.id** | Giỏ hàng chứa sản phẩm này |
| `variant_id` | `VARCHAR(50)` | NOT NULL, **FK → ProductVariants.id** | Biến thể sản phẩm được thêm vào giỏ |
| `quantity` | `INT` | NOT NULL, DEFAULT `1`, CHECK (> 0) | Số lượng (phải lớn hơn 0) |
| `added_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm thêm vào giỏ |

**Ràng buộc UNIQUE:** `(cart_id, variant_id)` — mỗi variant chỉ xuất hiện **một lần** trong giỏ hàng (thêm lần 2 thì tăng số lượng).

**Index:** `IX_CartItems_cart_id`

---

### 14. `Wishlists`

**Công dụng:** Đại diện cho **danh sách yêu thích** của mỗi người dùng. Tương tự Carts — mỗi user chỉ có **một** wishlist.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `user_id` | `VARCHAR(50)` | NOT NULL, **UNIQUE**, **FK → Users.id** | Chủ sở hữu wishlist |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |

---

### 15. `WishlistItems`

**Công dụng:** Lưu từng **sản phẩm** (không phải variant) trong danh sách yêu thích. Wishlist lưu ở cấp độ sản phẩm, không phải variant cụ thể.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `wishlist_id` | `VARCHAR(50)` | NOT NULL, **FK → Wishlists.id** | Wishlist chứa sản phẩm này |
| `product_id` | `VARCHAR(50)` | NOT NULL, **FK → Products.id** | Sản phẩm được yêu thích |
| `added_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm thêm vào |

**Ràng buộc UNIQUE:** `(wishlist_id, product_id)` — mỗi sản phẩm chỉ có thể yêu thích **một lần**.

**Index:** `IX_WishlistItems_wishlist_id`

---

## 🎟️ NHÓM 6: COUPONS

---

### 16. `Coupons`

**Công dụng:** Lưu thông tin **mã giảm giá**. Hỗ trợ nhiều loại: giảm theo phần trăm hoặc giảm số tiền cố định, có thể giới hạn số lần dùng, thời hạn, và phạm vi áp dụng.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `code` | `VARCHAR(50)` | NOT NULL, **UNIQUE** | Mã coupon (vd: `SUMMER20`) |
| `description` | `NVARCHAR(500)` | NULL | Mô tả chương trình giảm giá |
| `discount_type` | `VARCHAR(20)` | NOT NULL, DEFAULT `'percentage'` | Loại giảm: `percentage` (%) hoặc `fixed` (tiền mặt) |
| `discount_value` | `DECIMAL(18,2)` | NOT NULL | Giá trị giảm (20 = giảm 20% hoặc giảm 20.000đ) |
| `min_order_amount` | `DECIMAL(18,2)` | NULL | Giá trị đơn hàng tối thiểu để được áp dụng |
| `max_discount_amt` | `DECIMAL(18,2)` | NULL | Mức giảm tối đa (áp dụng cho loại %) |
| `usage_limit` | `INT` | NULL | Tổng số lần được dùng. NULL = không giới hạn |
| `used_count` | `INT` | NOT NULL, DEFAULT `0` | Số lần đã được sử dụng |
| `user_limit` | `INT` | NULL, DEFAULT `1` | Số lần mỗi user được dùng. NULL = không giới hạn |
| `starts_at` | `DATETIME2` | NULL | Thời điểm bắt đầu hiệu lực. NULL = áp dụng ngay |
| `expires_at` | `DATETIME2` | NULL | Thời điểm hết hạn. NULL = không hết hạn |
| `is_active` | `BIT` | NOT NULL, DEFAULT `1` | Coupon còn hoạt động hay đã tắt |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |

**Index:** `IX_Coupons_code` — tăng tốc tra cứu mã coupon khi thanh toán.

---

### 17. `CouponProducts`

**Công dụng:** Bảng **trung gian** xác định coupon chỉ áp dụng cho **một số sản phẩm cụ thể** (thay vì toàn bộ cửa hàng). Nếu coupon không có bản ghi trong bảng này → áp dụng toàn cửa hàng.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `coupon_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → Coupons.id** | Mã giảm giá |
| `product_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → Products.id** | Sản phẩm được áp dụng |

---

### 18. `CouponCategories`

**Công dụng:** Bảng **trung gian** xác định coupon chỉ áp dụng cho **một số danh mục** cụ thể.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `coupon_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → Coupons.id** | Mã giảm giá |
| `category_id` | `VARCHAR(50)` | 🔑 **PK (kép)**, **FK → Categories.id** | Danh mục được áp dụng |

---

## 📋 NHÓM 7: ORDERS & PAYMENTS

---

### 19. `Orders`

**Công dụng:** Lưu thông tin **đơn hàng** khi khách đặt mua. Bao gồm địa chỉ giao hàng (snapshot tại thời điểm đặt), tổng tiền, và trạng thái đơn hàng. Địa chỉ được lưu trực tiếp (không dùng FK) để tránh mất dữ liệu nếu user thay đổi địa chỉ sau này.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính (vd: `ord_abc123`) |
| `user_id` | `VARCHAR(50)` | NOT NULL, **FK → Users.id** | Người đặt hàng |
| `coupon_id` | `VARCHAR(50)` | NULL, **FK → Coupons.id** | Mã giảm giá được áp dụng. NULL = không dùng coupon |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'pending'` | Trạng thái: `pending` → `confirmed` → `processing` → `shipped` → `delivered` → `cancelled` / `refunded` |
| `subtotal` | `DECIMAL(18,2)` | NOT NULL | Tổng tiền hàng (trước giảm giá + phí ship) |
| `discount_amount` | `DECIMAL(18,2)` | NOT NULL, DEFAULT `0` | Số tiền được giảm từ coupon |
| `shipping_fee` | `DECIMAL(18,2)` | NOT NULL, DEFAULT `0` | Phí vận chuyển |
| `total` | `DECIMAL(18,2)` | NOT NULL | Tổng thanh toán = subtotal - discount + shipping_fee |
| `shipping_name` | `NVARCHAR(150)` | NOT NULL | Tên người nhận hàng |
| `shipping_phone` | `VARCHAR(20)` | NOT NULL | SĐT người nhận |
| `shipping_address` | `NVARCHAR(500)` | NOT NULL | Địa chỉ giao hàng (snapshot) |
| `shipping_city` | `NVARCHAR(100)` | NULL | Tỉnh/Thành phố |
| `shipping_country` | `NVARCHAR(100)` | NOT NULL, DEFAULT `'Vietnam'` | Quốc gia |
| `note` | `NVARCHAR(500)` | NULL | Ghi chú của khách |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm đặt hàng |
| `updated_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm cập nhật trạng thái |

**Index:** `IX_Orders_user_id`, `IX_Orders_status`

---

### 20. `OrderItems`

**Công dụng:** Lưu **chi tiết từng sản phẩm** trong đơn hàng. Lưu snapshot (ảnh chụp tại thời điểm mua) của giá, tên sản phẩm và thông tin biến thể — đảm bảo dữ liệu không thay đổi dù sau này sản phẩm bị chỉnh sửa.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `order_id` | `VARCHAR(50)` | NOT NULL, **FK → Orders.id** | Đơn hàng chứa mục này |
| `variant_id` | `VARCHAR(50)` | NOT NULL, **FK → ProductVariants.id** | Biến thể sản phẩm đã mua (ON DELETE NO ACTION — giữ lịch sử dù variant bị xóa) |
| `quantity` | `INT` | NOT NULL, CHECK (> 0) | Số lượng mua |
| `unit_price` | `DECIMAL(18,2)` | NOT NULL | **Giá tại thời điểm mua** (snapshot — không đổi theo giá hiện tại) |
| `total_price` | `DECIMAL(18,2)` | NOT NULL | = `unit_price × quantity` |
| `product_name` | `NVARCHAR(255)` | NOT NULL | **Tên sản phẩm tại thời điểm mua** (snapshot) |
| `variant_info` | `NVARCHAR(255)` | NULL | **Thông tin biến thể** (vd: "Đen / XL") — snapshot |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |

**Index:** `IX_OrderItems_order_id`, `IX_OrderItems_variant_id`

---

### 21. `Payments`

**Công dụng:** Lưu thông tin **thanh toán** cho đơn hàng. Mỗi đơn hàng có **đúng một** bản ghi thanh toán (quan hệ 1-1). Hỗ trợ nhiều phương thức thanh toán.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `order_id` | `VARCHAR(50)` | NOT NULL, **UNIQUE**, **FK → Orders.id** | Đơn hàng cần thanh toán (mỗi đơn chỉ 1 payment) |
| `method` | `VARCHAR(50)` | NOT NULL | Phương thức: `cod`, `bank_transfer`, `vnpay`, `momo`, `stripe` |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'pending'` | Trạng thái: `pending` → `paid` / `failed` / `refunded` |
| `amount` | `DECIMAL(18,2)` | NOT NULL | Số tiền thanh toán |
| `transaction_ref` | `VARCHAR(255)` | NULL | Mã giao dịch từ cổng thanh toán bên thứ 3 |
| `paid_at` | `DATETIME2` | NULL | Thời điểm thanh toán thành công |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm tạo |

---

### 22. `Refunds`

**Công dụng:** Lưu thông tin **hoàn tiền** khi khách trả hàng. Mỗi thanh toán chỉ được hoàn tiền **một lần** (quan hệ 1-1 với Payments).

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `payment_id` | `VARCHAR(50)` | NOT NULL, **UNIQUE**, **FK → Payments.id** | Thanh toán cần hoàn (mỗi payment chỉ 1 refund) |
| `reason` | `NVARCHAR(500)` | NULL | Lý do hoàn tiền |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'pending'` | Trạng thái: `pending` → `approved` / `rejected` → `completed` |
| `refund_amount` | `DECIMAL(18,2)` | NOT NULL | Số tiền hoàn (có thể hoàn một phần) |
| `refunded_at` | `DATETIME2` | NULL | Thời điểm hoàn tiền thực tế |
| `created_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm yêu cầu hoàn |

---

### 23. `RefundItems`

**Công dụng:** Lưu **chi tiết từng sản phẩm** được hoàn trả trong một yêu cầu hoàn tiền. Một yêu cầu hoàn tiền có thể hoàn một phần sản phẩm trong đơn hàng.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `refund_id` | `VARCHAR(50)` | NOT NULL, **FK → Refunds.id** | Yêu cầu hoàn tiền |
| `order_item_id` | `VARCHAR(50)` | NOT NULL, **FK → OrderItems.id** | Mục đơn hàng cần hoàn (ON DELETE NO ACTION — giữ dữ liệu) |
| `quantity` | `INT` | NOT NULL, CHECK (> 0) | Số lượng sản phẩm được hoàn |
| `refund_amount` | `DECIMAL(18,2)` | NOT NULL | Số tiền hoàn cho mục này |

**Index:** `IX_RefundItems_refund_id`

---

### 24. `CouponUsage`

**Công dụng:** Ghi lại lịch sử **ai đã dùng coupon nào, trong đơn hàng nào**. Phục vụ kiểm tra giới hạn số lần dùng per user và tổng số lần dùng.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `VARCHAR(50)` | 🔑 **PK** | Khóa chính |
| `coupon_id` | `VARCHAR(50)` | NOT NULL, **FK → Coupons.id** | Mã coupon đã dùng |
| `order_id` | `VARCHAR(50)` | NOT NULL, **FK → Orders.id** | Đơn hàng áp dụng coupon |
| `user_id` | `VARCHAR(50)` | NOT NULL, **FK → Users.id** | Người dùng coupon |
| `used_at` | `DATETIME2` | NOT NULL, DEFAULT `GETDATE()` | Thời điểm sử dụng |

**Ràng buộc UNIQUE:** `(coupon_id, order_id)` — mỗi đơn hàng chỉ áp dụng một coupon **một lần**.

**Index:** `IX_CouponUsage_coupon_id`, `IX_CouponUsage_user_id`

---

## 🔗 Tổng Hợp Quan Hệ Giữa Các Bảng

```text
USERS
 ├── 1:1  → Carts          (mỗi user có 1 giỏ hàng)
 ├── 1:1  → Wishlists      (mỗi user có 1 wishlist)
 ├── 1:N  → Orders         (user đặt nhiều đơn hàng)
 ├── 1:N  → Reviews        (user viết nhiều đánh giá)
 └── 1:N  → InventoryLogs  (admin tạo log kho)

CATEGORIES
 ├── 1:N  → Categories     (self-join: danh mục cha → con)
 ├── N:N  → Products       (qua ProductCategories)
 └── N:N  → Coupons        (qua CouponCategories)

PRODUCTS
 ├── 1:N  → ProductImages         (nhiều ảnh)
 ├── 1:N  → ProductVariants       (nhiều biến thể SKU)
 ├── 1:N  → Reviews               (nhiều đánh giá)
 ├── N:N  → Categories            (qua ProductCategories)
 ├── N:N  → Coupons               (qua CouponProducts)
 └── N:N  → Wishlists             (qua WishlistItems)

ATTRIBUTES
 └── 1:N  → AttributeValues
              └── N:N → ProductVariants  (qua VariantAttributeValues)

PRODUCT VARIANTS
 ├── 1:N  → CartItems        (thêm vào giỏ)
 ├── 1:N  → OrderItems       (mua hàng)
 └── 1:N  → InventoryLogs    (theo dõi kho)

ORDERS
 ├── 1:N  → OrderItems
 ├── 1:1  → Payments
 │           └── 1:1 → Refunds
 │                       └── 1:N → RefundItems
 └── 1:N  → CouponUsage

ORDER ITEMS
 └── 1:N  → RefundItems
 └── 1:N  → Reviews         (xác minh đã mua hàng)

COUPONS
 ├── 1:N  → CouponUsage
 ├── N:N  → Products    (qua CouponProducts)
 └── N:N  → Categories  (qua CouponCategories)
```

---

## 📌 Bảng Tóm Tắt Tất Cả Khóa Ngoại (FK)

| Bảng | Cột FK | Trỏ đến | ON DELETE |
|---|---|---|---|
| Categories | `parent_id` | Categories.id | NO ACTION |
| ProductImages | `product_id` | Products.id | CASCADE |
| ProductCategories | `product_id` | Products.id | CASCADE |
| ProductCategories | `category_id` | Categories.id | CASCADE |
| AttributeValues | `attribute_id` | Attributes.id | CASCADE |
| ProductVariants | `product_id` | Products.id | CASCADE |
| VariantAttributeValues | `variant_id` | ProductVariants.id | CASCADE |
| VariantAttributeValues | `attribute_value_id` | AttributeValues.id | CASCADE |
| InventoryLogs | `variant_id` | ProductVariants.id | CASCADE |
| InventoryLogs | `created_by` | Users.id | **SET NULL** |
| Reviews | `product_id` | Products.id | CASCADE |
| Reviews | `user_id` | Users.id | NO ACTION |
| Reviews | `order_item_id` | OrderItems.id | **SET NULL** |
| Carts | `user_id` | Users.id | CASCADE |
| CartItems | `cart_id` | Carts.id | CASCADE |
| CartItems | `variant_id` | ProductVariants.id | CASCADE |
| Wishlists | `user_id` | Users.id | CASCADE |
| WishlistItems | `wishlist_id` | Wishlists.id | CASCADE |
| WishlistItems | `product_id` | Products.id | CASCADE |
| CouponProducts | `coupon_id` | Coupons.id | CASCADE |
| CouponProducts | `product_id` | Products.id | CASCADE |
| CouponCategories | `coupon_id` | Coupons.id | CASCADE |
| CouponCategories | `category_id` | Categories.id | CASCADE |
| Orders | `user_id` | Users.id | NO ACTION |
| Orders | `coupon_id` | Coupons.id | **SET NULL** |
| OrderItems | `order_id` | Orders.id | CASCADE |
| OrderItems | `variant_id` | ProductVariants.id | NO ACTION |
| Payments | `order_id` | Orders.id | CASCADE |
| Refunds | `payment_id` | Payments.id | CASCADE |
| RefundItems | `refund_id` | Refunds.id | CASCADE |
| RefundItems | `order_item_id` | OrderItems.id | NO ACTION |
| CouponUsage | `coupon_id` | Coupons.id | NO ACTION |
| CouponUsage | `order_id` | Orders.id | CASCADE |
| CouponUsage | `user_id` | Users.id | NO ACTION |

### Giải thích chiến lược ON DELETE:

| Chiến lược | Ý nghĩa | Dùng khi |
|---|---|---|
| **CASCADE** | Xóa cha → tự xóa con | Dữ liệu con không có nghĩa khi không có cha (vd: ảnh sản phẩm khi xóa sản phẩm) |
| **NO ACTION** | Xóa cha bị chặn nếu còn con | Dữ liệu con cần giữ nguyên (vd: đơn hàng dù user bị xóa) |
| **SET NULL** | Xóa cha → cột FK = NULL | Dữ liệu con vẫn hợp lệ nhưng mất liên kết (vd: review vẫn tồn tại dù order item bị xóa) |
