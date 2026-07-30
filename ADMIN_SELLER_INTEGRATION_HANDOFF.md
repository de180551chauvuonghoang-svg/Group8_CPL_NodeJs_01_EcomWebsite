# Bàn Giao Tích Hợp Admin - Seller

## 1. Mục tiêu

Tích hợp role Admin vào hệ thống Seller hiện tại mà không ghi đè schema, vòng đời đơn hàng, lịch sử kho, phạm vi voucher và cấu trúc route FE đã được nâng cấp.

Tài liệu này phân biệt ba nhóm:

```txt
ĐÃ CÓ ở Seller BE       -> Admin phải tái sử dụng, không tạo lại.
ADMIN PHẢI LÀM          -> Chưa có trong Seller BE.
CẦN PHỐI HỢP            -> Chạm file/bảng dùng chung, phải merge thủ công.
```

BE Seller pending approval đã được kiểm tra ngày `2026-07-30` bằng:

```txt
pnpm --dir backend run verify:seller-approval
```

Kết quả pass toàn bộ các nhóm: migration, pending application, giữ role customer, không cấp token seller, gửi lại hồ sơ rejected, guard seller inactive, ẩn shop inactive, chặn checkout shop inactive, category inactive và quyền sở hữu ảnh application.

## 2. Những gì Seller BE đã hoàn tất

### 2.1 Trạng thái hồ sơ và migration

Bảng `Sellers` hiện dùng đúng bốn trạng thái:

```txt
pending | active | rejected | suspended
```

Đã có:

- Default của `Sellers.status` là `pending`.
- Check constraint chỉ nhận bốn trạng thái trên.
- Index theo `status, created_at` để Admin lọc hồ sơ chờ duyệt.
- Hồ sơ seller cũ đang `active` vẫn hoạt động bình thường.

Admin không được dùng thêm các giá trị như `approved`, `disabled`, `blocked` trong cột này.

### 2.2 API phía customer/seller application

Đã có:

```http
GET  /api/seller/application
POST /api/seller/register
```

Luồng hiện tại:

```txt
customer gửi hồ sơ
-> Sellers.status = pending
-> Users.role vẫn là customer
-> không cấp access token mới
-> chờ Admin duyệt
```

`GET /api/seller/application` chỉ trả thông tin an toàn:

```ts
{
  sellerId: string;
  shopName: string;
  status: "pending" | "active" | "rejected" | "suspended";
  createdAt: string;
  updatedAt: string;
}
```

API không trả CCCD, số tài khoản hoặc thông tin ngân hàng.

### 2.3 Upload ảnh trước khi được duyệt

Đã có endpoint riêng:

```http
POST   /api/seller/application/uploads/images
DELETE /api/seller/application/uploads/images
```

Chỉ nhận `purpose=shop_logo|shop_cover`, file JPG/PNG/WebP tối đa 5 MB và kiểm tra `publicId` phải thuộc user hiện tại.

Quyền upload:

```txt
chưa có hồ sơ -> được upload
rejected       -> được upload để gửi lại
pending        -> bị chặn
active         -> dùng upload seller bình thường, không dùng application upload
suspended      -> bị chặn
```

Admin không cần tạo thêm upload flow cho hồ sơ Seller và không được xóa ảnh application bằng endpoint platform chung.

### 2.4 Guard seller active

Các route quản trị shop chạy theo thứ tự:

```txt
protect
-> requireActiveSeller
-> restrictTo('seller')
```

Hồ sơ `pending`, `rejected`, `suspended` không truy cập được sản phẩm, đơn hàng, kho, voucher, tài chính hoặc dashboard seller.

### 2.5 Ảnh hưởng khi shop không active

Seller BE đã xử lý:

- Public product/shop chỉ trả dữ liệu của shop `active`.
- Product detail/review công khai không trả sản phẩm của shop inactive.
- Checkout sản phẩm shop inactive trả `PRODUCT_UNAVAILABLE`.
- Seller chỉ thấy category `is_active = 1`.
- Tạo/sửa sản phẩm bằng category inactive trả `SELLER_CATEGORY_INACTIVE`.

Vì vậy Admin suspend shop sẽ có hiệu lực trên catalog và checkout mà không cần xóa sản phẩm.

## 3. Phân quyền nghiệp vụ đã chốt

| Dữ liệu/nghiệp vụ | Seller                                     | Admin                                            |
| --------------------- | ------------------------------------------ | ------------------------------------------------ |
| Hồ sơ shop          | Gửi hồ sơ, cập nhật hồ sơ active    | Duyệt, từ chối, tạm ngưng, kích hoạt lại |
| Sản phẩm shop       | CRUD sản phẩm của shop                  | Xem/moderation riêng nếu cần                  |
| Tồn kho              | Điều chỉnh stock, threshold và xem log | Chỉ đọc trong MVP                             |
| Đơn hàng           | Xử lý fulfillment từng`OrderItem`     | Giám sát, không thay seller vận hành        |
| Voucher shop          | CRUD với`seller_id` của shop           | Chỉ đọc hoặc moderation riêng               |
| Voucher toàn sàn    | Không quản lý                           | CRUD với`seller_id = NULL`                    |
| Review                | Trả lời review của shop                 | Giám sát nội dung nếu có module moderation  |
| Báo cáo             | Xem dữ liệu shop                         | Xem dữ liệu toàn sàn từ item thật          |
| Banner/template/audit | Không quản lý                           | Quản lý                                        |

## 4. Xung đột chính cần tránh

### 4.1 Duyệt seller

Seller BE đã bỏ cơ chế tự active và tự đổi role. Nếu Admin branch vẫn có code tạo shop active ngay khi đăng ký, phải bỏ code đó.

Contract duy nhất:

```txt
Become Seller -> pending
Admin approve -> active + role seller
```

### 4.2 Coupon

Hai role dùng chung bảng `Coupons` là đúng. Xung đột xảy ra nếu Admin CRUD không giới hạn `seller_id`, vì có thể sửa/xóa nhầm voucher shop.

### 4.3 Inventory

Schema Seller hiện dùng:

```txt
old_quantity
change_quantity
new_quantity
type
reference_id
reason
created_by
low_stock_threshold
```

Admin code cũ dùng `change_qty` hoặc hardcode low-stock bằng 5 sẽ không khớp.

### 4.4 Order và báo cáo

Seller quản lý trạng thái ở từng `OrderItem`. Báo cáo dựa trên `Orders.status` sẽ sai với đơn nhiều shop hoặc các item có trạng thái khác nhau.

### 4.5 File dùng chung

Các file dễ conflict:

```txt
backend/src/config/initDb.js
backend/src/config/schema.sql
backend/src/app.js
frontend/src/routes/AppRoutes.tsx
frontend/src/routes/RouteGuards.tsx
frontend/src/routes/RouteLayouts.tsx
frontend/src/context/AuthContext.tsx
frontend/src/types.ts
pnpm-lock.yaml
```

Không chọn toàn bộ một phía cho các file này. Phải ghép migration, route mount, type và guard theo từng khối chức năng.

## 5. ADMIN PHẢI LÀM: Seller Approval

### 5.1 API Admin

```http
GET   /api/admin/sellers?status=pending&page=1&limit=20
GET   /api/admin/sellers/:sellerId
PATCH /api/admin/sellers/:sellerId/approve
PATCH /api/admin/sellers/:sellerId/reject
PATCH /api/admin/sellers/:sellerId/suspend
PATCH /api/admin/sellers/:sellerId/reactivate
```

Tất cả endpoint bắt buộc `protect + restrictTo('admin')`.

### 5.2 Approve

Approve phải nằm trong một database transaction:

```txt
1. SELECT Sellers WITH (UPDLOCK, HOLDLOCK).
2. Kiểm tra status hiện tại = pending.
3. UPDATE Sellers.status = active.
4. UPDATE Users.role = seller.
5. Ghi AuditLogs.
6. Tạo notification cho user.
7. COMMIT.
```

Không tạo access token trong Admin API. Token hiện tại vẫn xác thực được; FE Seller sẽ gọi `/auth/me` để đồng bộ role mới.

### 5.3 Reject

```txt
Yêu cầu status = pending.
Bắt buộc rejectReason sau khi trim.
Sellers.status = rejected.
Users.role giữ customer.
Ghi người duyệt, thời gian, AuditLogs và notification.
```

### 5.4 Suspend và reactivate

Suspend:

```txt
active -> suspended
Users.role -> customer
Không xóa shop, product, coupon, order, review hoặc lịch sử.
```

Reactivate:

```txt
suspended -> active
Users.role -> seller
```

### 5.5 Cột còn thiếu để hiển thị lý do từ chối

Seller BE hiện chưa có `rejectionReason`. Nếu Admin UI yêu cầu seller đọc được lý do, Admin migration cần bổ sung an toàn:

```sql
rejection_reason NVARCHAR(500) NULL,
reviewed_at DATETIME2 NULL,
reviewed_by VARCHAR(255) NULL
```

Sau đó phối hợp cập nhật `GET /api/seller/application` để trả thêm duy nhất:

```ts
rejectionReason?: string | null;
```

Không trả CCCD hoặc dữ liệu ngân hàng trong API trạng thái. Khi user gửi lại hồ sơ, xóa `rejection_reason`, `reviewed_at`, `reviewed_by` cũ và chuyển về `pending`.

### 5.6 Error code

```txt
SELLER_APPLICATION_NOT_FOUND
INVALID_SELLER_STATUS_TRANSITION
SELLER_REJECT_REASON_REQUIRED
SELLER_ALREADY_ACTIVE
SELLER_ALREADY_SUSPENDED
```

Trả `409` cho chuyển trạng thái không hợp lệ, `404` nếu không có hồ sơ và `400` nếu thiếu lý do.

## 6. ADMIN PHẢI LÀM: Voucher toàn sàn

Không tạo bảng voucher mới.

Quy ước:

```txt
Coupons.seller_id IS NULL     = voucher toàn sàn của Admin
Coupons.seller_id IS NOT NULL = voucher shop của Seller
```

Admin create luôn ghi `seller_id = NULL`.

Admin update/delete bắt buộc có điều kiện:

```sql
WHERE id = @couponId
  AND seller_id IS NULL
  AND deleted_at IS NULL
```

Admin list mặc định chỉ trả platform coupon. Nếu cần giám sát voucher Seller, hỗ trợ:

```txt
scope=platform|seller|all
```

Voucher Seller trên màn Admin là read-only. Nếu cần khóa do vi phạm, tạo moderation action riêng có lý do và AuditLogs, không dùng CRUD platform coupon.

Validation phải đồng bộ Seller:

```txt
code trim + uppercase
discount_value là DECIMAL(18,2) và > 0
percentage <= 100
starts_at < expires_at
usage_limit > 0 nếu nhập
user_limit > 0 nếu nhập
code unique trên toàn hệ thống
```

Soft delete dùng chung rule giải phóng code:

```txt
code = LEFT(code, 25) + '__deleted__' + couponId
is_active = 0
deleted_at = GETDATE()
```

Không dùng `sql.BigInt` cho tiền/giảm giá; dùng `sql.Decimal(18, 2)`.

## 7. ADMIN PHẢI LÀM: Inventory chỉ đọc

Trong MVP, bỏ nút và endpoint điều chỉnh tồn kho của Admin. Admin không phải chủ sở hữu hàng hóa và không thay số lượng thay Seller.

Admin được:

```txt
Xem stock toàn hệ thống.
Lọc theo shop/product/SKU.
Xem low stock và out of stock.
Xem InventoryLogs.
Phát hiện biến động bất thường.
```

Low stock phải dùng:

```sql
stock_qty <= low_stock_threshold
```

Không hardcode `LOW_STOCK_THRESHOLD = 5`.

Nếu sau này cần sửa khẩn cấp, tạo permission `inventory_override`, bắt buộc reason, AuditLogs và tái sử dụng transaction của `inventoryService`. Không update stock bằng query độc lập.

## 8. ADMIN PHẢI LÀM: Order và báo cáo

Admin order detail phải trả:

```txt
items[].fulfillment_status
items[].seller_id
items[].shop_name
```

Lifecycle chuẩn:

```txt
pending_fulfillment -> ready_to_ship | cancelled
ready_to_ship       -> shipping | cancelled
shipping            -> delivered
delivered/cancelled -> terminal
```

Admin mặc định chỉ xem/giám sát. Không thay Seller đóng gói, giao hoặc hủy item nếu chưa có dispute workflow riêng.

Công thức báo cáo:

```sql
-- Doanh thu
WHERE OrderItems.fulfillment_status = 'delivered'

-- Hủy theo seller
WHERE OrderItems.fulfillment_status = 'cancelled'

-- Top product
Chỉ SUM quantity/total_price của item delivered
```

Rule doanh thu phải trùng Seller:

```txt
revenue_rule = delivered_items_gross
```

Không dùng `Orders.status <> 'cancelled'` để tính doanh thu Seller.

Return/refund hoàn tất phải được phản ánh trong báo cáo Admin. Cần thống nhất một nguồn:

```txt
Tạo Refund record khi hoàn tiền hoàn tất; hoặc
Report đọc ReturnRequests ở trạng thái hoàn tất.
```

## 9. Tích hợp schema

Giữ migration Seller hiện tại làm base. Admin chỉ thêm migration mới, có kiểm tra tồn tại, cho:

```txt
Brands
Banners
NotificationTemplates
AuditLogs
Products.brand_id nullable
rejection_reason/reviewed_at/reviewed_by nếu triển khai lý do duyệt
```

Không ghi đè migration hiện tại của:

```txt
Sellers
Coupons
CouponUsage
OrderCoupons
InventoryLogs
OrderItems
ProductVariants
Reviews
ReturnRequests
Notifications
```

Category Admin chỉ tắt bằng `is_active = 0`, không hard-delete category đang được sản phẩm sử dụng. Seller BE đã tự ẩn category inactive và chặn create/update.

## 10. Tích hợp Frontend Admin

Giữ cấu trúc route:

```txt
frontend/src/routes/AppRoutes.tsx
frontend/src/routes/RouteGuards.tsx
frontend/src/routes/RouteLayouts.tsx
```

Thêm theo từng khối:

```txt
AdminRoute
AdminDashboardLayout
lazy Admin pages
adminService.ts
admin types
```

Không thay toàn bộ `App.tsx`, AuthContext, CartContext, Seller pages/services hoặc `types.ts` bằng bản Admin cũ. Admin types được append/merge vào type hiện tại.

Màn duyệt seller tối thiểu có:

- Tab pending/active/rejected/suspended.
- Phân trang và tìm kiếm.
- Drawer chi tiết hồ sơ dành cho Admin.
- Approve có xác nhận.
- Reject bắt buộc lý do.
- Suspend/reactivate có xác nhận và lý do audit.
- Refetch list sau mutation.
- Xử lý bằng `error.data.code`, không so sánh message.

Admin image upload nên tái sử dụng `ImageUploadField` và `uploadService` nếu phù hợp; không thay application upload của Seller.

## 11. Cách tích hợp Git khuyến nghị

```txt
1. Tạo integration branch từ nhánh Seller mới nhất.
2. Copy các file Admin độc lập: controller/routes/pages/components/service.
3. Merge thủ công route mounts trong app.js và AppRoutes.tsx.
4. Thêm migration Admin vào cuối initDb Seller hiện tại.
5. Sửa Admin coupon/inventory/report/approval theo contract tài liệu này.
6. Không checkout toàn bộ Admin branch vào file dùng chung.
7. Build và integration test cả customer, seller, admin.
```

## 12. Acceptance Tests

```txt
[ ] Customer gửi Become Seller -> pending, role vẫn customer, token không đổi.
[ ] Pending không truy cập được API/dashboard seller.
[ ] Admin approve -> shop active, role seller, Seller API truy cập được.
[ ] FE Seller refresh profile -> nhận role seller và vào dashboard.
[ ] Admin reject -> role customer, status rejected, có audit/notification.
[ ] Nếu triển khai rejectionReason: customer chỉ đọc được lý do, không nhận dữ liệu nhạy cảm.
[ ] Rejected gửi lại -> pending và xóa metadata review cũ.
[ ] Admin suspend -> public catalog ẩn shop, checkout bị chặn, dữ liệu không bị xóa.
[ ] Admin reactivate -> shop hiển thị lại và user nhận role seller.
[ ] Seller tạo voucher -> seller_id đúng shop.
[ ] Admin tạo voucher -> seller_id NULL.
[ ] Admin không sửa/xóa voucher Seller bằng platform coupon API.
[ ] Xóa voucher Admin/Seller -> tạo lại cùng code được.
[ ] Admin inventory không có nút/API sửa stock trong MVP.
[ ] Low-stock Admin khớp low_stock_threshold của variant.
[ ] Doanh thu Admin và Seller khớp khi cùng lọc item delivered.
[ ] Đơn nhiều shop hiển thị trạng thái từng item đúng.
[ ] Admin migration không làm mất constraint/index/bảng Seller hiện tại.
[ ] Frontend Admin route không làm regression Seller/customer routes.
```

## 13. Phần còn thiếu sau khi đối chiếu BE

Seller BE không cần sửa thêm để hỗ trợ trạng thái pending cơ bản. Các phần chưa có và thuộc Admin/integration là:

1. Admin API/list UI để approve, reject, suspend, reactivate.
2. Transaction cập nhật đồng thời `Sellers.status` và `Users.role`.
3. AuditLogs và notification cho quyết định của Admin.
4. `rejectionReason` cùng metadata người/thời gian duyệt nếu muốn seller xem lý do.
5. Platform coupon có `seller_id = NULL` và guard không chạm voucher shop.
6. Báo cáo Admin theo `OrderItems.fulfillment_status`, không theo trạng thái order tổng.
7. Inventory Admin chỉ đọc và dùng đúng schema/threshold Seller hiện tạiqq
