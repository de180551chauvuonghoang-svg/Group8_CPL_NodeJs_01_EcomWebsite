# 🛠️ ADMIN.md — Code Flow của toàn bộ chức năng Admin

> Tài liệu này mô tả **luồng chạy thực tế của code** cho từng chức năng Admin đã implement: file/hàm nào gọi hàm nào, input nhận vào là gì, output trả về là gì, và dữ liệu chảy qua những lớp nào từ lúc bấm nút trên UI cho tới lúc nhận response.
> Đọc mục 1 (luồng chung) trước, sau đó tra theo module ở mục 2 khi cần hiểu 1 chức năng cụ thể.

---

## 1. Luồng chung (áp dụng cho MỌI request admin)

Tất cả chức năng admin đều đi qua đúng 6 lớp theo thứ tự sau:

```
[1] Frontend Page (pages/AdminXxx.tsx)
        │  gọi hàm trong
        ▼
[2] frontend/src/services/adminService.ts   (1 hàm = 1 API call, dùng chung instance axios `API`)
        │  API.get/post/patch/delete(...) → axios interceptor tự gắn header
        │  Authorization: Bearer <token lấy từ localStorage 'ecom_token'>
        ▼
[3] HTTP request  →  baseURL http://localhost:5000/api + path (vd: /admin/users)
        ▼
[4] backend/src/app.js
        app.use("/api/admin", adminRoutes)   ← mount router tại app.js:100
        ▼
[5] backend/src/routes/admin.routes.js
        router.use(protect)                  ← xác thực JWT, load req.user (auth.middleware.js:5)
        router.use(restrictTo("admin"))      ← chặn nếu req.user.role !== 'admin' (auth.middleware.js:56)
        router.<method>(path, controllerFn)  ← khớp path → gọi đúng hàm controller
        ▼
[6] backend/src/controllers/admin.controller.js
        - đọc input từ req.params / req.query / req.body
        - validate sơ bộ (nếu có)
        - gọi 1 hoặc nhiều hàm trong adminService.js
        - với các thao tác ghi (create/update/delete/approve/...) → gọi thêm
          adminService.logAudit({...}) để ghi vào bảng AuditLogs (A006)
        - res.status(...).json({ status, message?, results?, data }) → trả response
        ▼
[7] backend/src/services/adminService.js
        - dùng mssql: pool.request().input(...).query(`SQL...`)
        - đọc/ghi trực tiếp SQL Server (không ORM), trả JS object/array
        ▼
[8] SQL Server (backend/src/config/schema.sql — 27+ bảng)
```

**Chiều response đi ngược lại:** SQL Server → `recordset` (service) → object JS (controller) →
`res.json(...)` → HTTP response → axios response interceptor ở `frontend/src/services/api.ts:26`
(bóc `response.data`, hoặc reject với `{message, status, data}` nếu lỗi) → hàm trong
`adminService.ts` trả về đúng field cần (`response.data?.xxx || []`) → Page component `setState(...)`
→ re-render UI.

**Response envelope chuẩn (mọi endpoint):**
- Thành công: `{ status: "success", message?: string, results?: number, data: {...} }`
- Thất bại (lỗi nghiệp vụ, do controller tự catch): `{ status: "fail", message: string }`, HTTP 400/404
- Thất bại (lỗi hệ thống, do `next(err)` → `errorHandler`): xem `error.middleware.js`

**Bảo mật chung:** mọi route trong `admin.routes.js` đều bắt buộc `protect` (JWT hợp lệ + user đang active)
rồi tới `restrictTo("admin")` (role phải là `admin`) — 2 middleware này chạy **trước tất cả controller**,
nên không route admin nào cần tự kiểm tra quyền lại.

**Audit log side-effect:** các hành động nhạy cảm (duyệt/từ chối/khoá seller, khoá/mở khoá user, reset
password, CRUD category/brand/banner/coupon, sửa notification template, điều chỉnh tồn kho, xác nhận
thanh toán) đều gọi thêm `adminService.logAudit()` **sau khi** thao tác chính thành công. Hàm này tự
try/catch nội bộ — ghi log lỗi thì chỉ log ra console, **không** làm fail request chính (xem
`adminService.js:1094`).

---

## 2. Chi tiết từng chức năng theo module

### Module: Duyệt Seller (đơn đăng ký shop)
Trang: `AdminSellerApplications.tsx` · Nav: *Người bán*

#### `getSellers` — Danh sách đơn đăng ký / shop theo trạng thái
- FE: `adminService.getSellers(status?)` → `GET /admin/sellers?status=`
- Controller: `admin.controller.js:7 getSellers`
- Service: `adminService.js:174` (khối "Danh sách shop") — JOIN `Sellers` + `Users`
- Input: query `status?` ∈ `pending|active|rejected|suspended` (validate ở controller, 400 nếu sai)
- Output: `{ data: { sellers: [{ id, shop_name, shop_phone, shop_address, status, owner_name, owner_email, ... }] } }`
- Luồng: FE chọn tab trạng thái → gọi API → SQL `SELECT ... FROM Sellers JOIN Users ... [WHERE status=@status] ORDER BY created_at DESC` → render bảng danh sách đơn.

#### `approveSeller` — Duyệt shop
- FE: `adminService.approveSeller(sellerId)` → `PATCH /admin/sellers/:id/approve`
- Controller: `admin.controller.js:29`
- Service: `adminService.js:208 approveSeller` — 2 UPDATE trong 1 hàm (không transaction):
  1. `UPDATE Sellers SET status='active'` (yêu cầu trạng thái hiện tại phải là `pending`, else throw)
  2. `UPDATE Users SET role='seller'` cho chủ shop (`seller.user_id`)
- Input: `params.id` (sellerId)
- Output: `{ data: { sellerId, status: "active" } }` + audit log `action: "approve_seller"`
- Luồng: FE bấm "Duyệt" → PATCH → service load seller hiện tại (`getSellerById`) → check `status === 'pending'` → 2 UPDATE tuần tự → trả kết quả → controller ghi `AuditLogs` → FE nhận success → tự gọi lại `getSellers()` để refresh danh sách.

#### `rejectSeller` — Từ chối đơn
- FE/API: `adminService.rejectSeller(sellerId)` → `PATCH /admin/sellers/:id/reject`
- Controller: `admin.controller.js:46` · Service: `adminService.js:229`
- Input: `params.id` · Output: `{ data: { sellerId, status: "rejected" } }`
- Luồng: check `status === 'pending'` → `UPDATE Sellers SET status='rejected'` (role user giữ nguyên, chưa từng lên seller) → audit log `reject_seller`.

#### `suspendSeller` — Khoá shop đang hoạt động
- FE/API: `adminService.suspendSeller(sellerId)` → `PATCH /admin/sellers/:id/suspend`
- Controller: `admin.controller.js:63` · Service: `adminService.js:246`
- Input: `params.id` · Output: `{ data: { sellerId, status: "suspended" } }`
- Luồng: check `status === 'active'` → `UPDATE Sellers SET status='suspended'` **và** `UPDATE Users SET role='customer'` (hạ quyền chủ shop) → audit log `suspend_seller`.

---

### Module: Quản lý người dùng (A010, A012, A013)
Trang: `AdminUsers.tsx` (danh sách) + `AdminUserDetail.tsx` (chi tiết) · Nav: *Người dùng*

#### `getUsers` — Danh sách user (lọc role/trạng thái, search, kèm cảnh báo "boom hàng")
- FE: `adminService.getUsers({role?, isActive?, q?})` → `GET /admin/users?role=&isActive=&q=`
- Controller: `admin.controller.js:80 getUsers`
- Service: `adminService.js:351 listUsersWithBoomCount` → gọi lồng 2 việc:
  1. `listUsers()` (`adminService.js:281`) — SQL động, nối thêm `AND role=@role` / `AND is_active=@isActive` / `AND (name LIKE @q OR email LIKE @q OR phone_number LIKE @q)` tuỳ query có mặt
  2. 1 query riêng đếm số đơn COD `status='cancelled'` trong 30 ngày, `GROUP BY user_id` → map vào từng user thành field `boom_count`
- Input: query `role?`, `isActive?` ("true"/"false" → convert sang boolean ở controller), `q?` (tìm theo tên/email/SĐT — A012)
- Output: `{ data: { users: [{ id, name, email, role, is_active, suspend_reason, boom_count, ... }] } }`
- Luồng: FE gõ filter/search → debounce/onClick → GET → service chạy 2 SQL độc lập → merge bằng `Map` trong JS → trả mảng đã gộp → FE hiển thị bảng, badge đỏ nếu `boom_count > 3`.

#### `setUserStatus` — Khoá / mở khoá tài khoản (bắt buộc lý do khi khoá)
- FE: `adminService.setUserStatus(userId, isActive, reason?)` → `PATCH /admin/users/:id/status` body `{isActive, reason}`
- Controller: `admin.controller.js:99` — validate `isActive` phải là boolean; nếu `isActive=false` thì `reason` bắt buộc không rỗng (400 nếu thiếu)
- Service: `adminService.js:315 setUserActive` — chặn khoá tài khoản admin khác (throw); `UPDATE Users SET is_active=@isActive, suspend_reason=@suspendReason` (mở khoá thì set `suspend_reason=NULL`)
- Input: `params.id`, body `{ isActive: boolean, reason?: string }`
- Output: `{ message, data: { userId, isActive, reason } }` + audit `lock_user`/`unlock_user`
- Luồng: FE (list hoặc trang chi tiết) mở modal nhập lý do → PATCH → controller validate → service load user, chặn nếu `role==='admin'` → UPDATE → audit log → FE refetch user/list.

#### `resetUserPassword` — Admin khởi tạo reset mật khẩu cho khách (A013)
- FE: `adminService.resetUserPassword(userId)` → `POST /admin/users/:id/reset-password`
- Controller: `admin.controller.js:135` — gọi `adminService.getUserById` để lấy email, 404 nếu không có user, rồi gọi **`otpService.createOTP(user.email)`** (tái dùng nguyên flow tự-phục-vụ `forgotPassword`)
- Service liên quan: `adminService.js:306 getUserById` (chỉ SELECT) — việc sinh OTP + gửi email nằm ở `otpService.js`, không phải `adminService.js`
- Input: `params.id` (userId) · Output: `{ message: "Đã gửi mã đặt lại mật khẩu tới email ...", data: { mock } }` + audit `reset_user_password`
- Luồng: FE bấm "Đặt lại mật khẩu" → POST → controller tra email user → `otpService.createOTP` sinh OTP, lưu, gửi email qua `emailService` → response về ngay (không chờ khách) → khách tự vào email lấy OTP/link → dùng route `/api/auth/reset-password` (tự phục vụ, không thuộc admin routes) để đặt mật khẩu mới.

#### `demoteSellerUser` — Hạ trực tiếp 1 seller → customer
- FE: `adminService.demoteSeller(userId)` → `PATCH /admin/users/:id/demote-seller`
- Controller: `admin.controller.js:157` · Service: `adminService.js:267 demoteSellerToCustomer`
- Luồng: service tìm `Sellers.id` theo `user_id` → nếu có, **gọi lại `suspendSeller(seller.id)`** (dùng chung logic ở trên) → cùng lúc set `Sellers.status='suspended'` + `Users.role='customer'`.
- Input: `params.id` (userId, không phải sellerId) · Output: `{ data: { sellerId, status: "suspended" } }`

#### `getUserDetail` (A009) — Trang chi tiết 1 khách hàng
Trang: `AdminUserDetail.tsx`
- FE: `adminService.getUserDetail(userId)` → `GET /admin/users/:id/detail`
- Controller: `admin.controller.js:573` · Service: `adminService.js:817 getUserDetail`
- Service chạy tuần tự 4 SQL + 1 hàm phụ trên cùng userId: profile (`Users`), `UserAddresses`, danh sách `Orders`, tổng hợp `SUM(total)/COUNT(*)` (loại trừ đơn `cancelled` khỏi `total_spent`), và `getBoomOrderCount(userId)` (`adminService.js:334`, đếm đơn COD huỷ trong 30 ngày)
- Input: `params.id` · Output: `{ data: { user: { ...profile, addresses[], orders[], total_spent, total_orders, boom_count } } }`
- Luồng: FE click 1 dòng trong `AdminUsers.tsx` → điều hướng route `/admin/users/:id` → mount `AdminUserDetail.tsx` → gọi API 1 lần khi mount → render đủ 4 khối (thông tin, địa chỉ, lịch sử đơn, cảnh báo boom) từ 1 response duy nhất. Nút khoá/mở khoá/reset password trong trang này gọi lại đúng `setUserStatus`/`resetUserPassword` ở trên.

---

### Module: Sản phẩm của Seller (admin xem, read-only)
Trang: `AdminSellerProducts.tsx`

#### `getSellerProducts`
- FE: `adminService.getSellerProducts(sellerId)` → `GET /admin/sellers/:id/products`
- Controller: `admin.controller.js:171` · Service: `adminService.js:10` — **uỷ quyền thẳng** sang `sellerService.getSellerProducts(sellerId)` (tái dùng query có sẵn của module Seller, không viết SQL riêng)
- Input: `params.id` (sellerId) · Output: `{ data: { products: [...] } }`

#### `getProductDetail`
- FE: `adminService.getProductDetail(productId)` → `GET /admin/products/:id`
- Controller: `admin.controller.js:185` · Service: `adminService.js:13 getProductDetail`
- Luồng: 3 query tuần tự trên cùng `productId`: (1) `Products` JOIN `Sellers` lấy info gốc — throw 404 nếu không có; (2) `ProductImages` sắp theo `is_primary DESC, sort_order ASC`; (3) `ProductVariants` kèm subquery `STRING_AGG` gộp thuộc tính biến thể (vd "Đỏ / L") → gộp cả 3 thành 1 object `{ ...product, images[], variants[] }`.
- Output: `{ data: { product: {..., images[], variants[]} } }`

---

### Module: Báo cáo cơ bản & Thống kê Dashboard
Trang: `AdminReports.tsx` (tab Seller/User), `AdminDashboard.tsx` (chart)

#### `getSellerReport`
- FE: `adminService.getSellerReport()` → `GET /admin/reports/sellers`
- Controller: `admin.controller.js:198` · Service: `adminService.js:61 reportSellers`
- SQL: `Sellers` + `OUTER APPLY` tính `SUM(oi.total_price)`/`COUNT(DISTINCT order_id)` từ `OrderItems→ProductVariants→Products→Orders`, loại `status='cancelled'`, sort theo doanh thu giảm dần.
- Output: `{ data: { sellers: [{ seller_id, shop_name, total_products, total_revenue, total_orders }] } }`

#### `getUserReport`
- FE/API: `adminService.getUserReport()` → `GET /admin/reports/users`
- Controller: `admin.controller.js:212` · Service: `adminService.js:154 reportUsers`
- SQL: `Users` (loại `role='admin'`) + `OUTER APPLY SUM(total)/COUNT(*)` từ `Orders` (loại đơn huỷ), sort theo chi tiêu giảm dần.

#### `getRevenueStats` — Doanh số theo thời gian (line chart)
- FE: `adminService.getRevenueStats({from?, to?, groupBy?})` → `GET /admin/stats/revenue`
- Controller: `admin.controller.js:231`, dùng chung helper `parseStatsQuery` (`admin.controller.js:225`, ép `groupBy` chỉ nhận `day`|`month`, mặc định `day`)
- Service: `adminService.js:86 revenueStats` — `FORMAT(created_at, 'yyyy-MM-dd' | 'yyyy-MM')` làm bucket, `SUM(total_price)` từ `Orders JOIN OrderItems`, loại đơn huỷ, lọc theo khoảng `from/to` nếu có.
- Output: `{ data: { series: [{ bucket, revenue, orders_count }] } }` → FE vẽ line chart.

#### `getCashflowStats` — Tiền vào (Payments) / tiền ra (Refunds)
- FE/API: `adminService.getCashflowStats({from?, to?, groupBy?})` → `GET /admin/stats/cashflow`
- Controller: `admin.controller.js:244` · Service: `adminService.js:111 cashflowStats`
- Luồng: chạy **2 query độc lập** (inflow từ `Payments WHERE status='paid'`, outflow từ `Refunds WHERE status='completed'`) → gộp theo `bucket` bằng `Map` trong JS thành `{bucket, cash_in, cash_out}` → sort tăng dần theo bucket.
- Output: `{ data: { series: [{ bucket, cash_in, cash_out }] } }`

---

### Module A007: Danh mục sản phẩm (Categories CRUD)
Trang: `AdminCategories.tsx` · Nav: *Danh mục*

| Hàm | API | Controller | Service | Ghi chú |
|---|---|---|---|---|
| `getCategories` | `GET /admin/categories` | `admin.controller.js:260` | `adminService.js:369 listCategories` | Trả toàn bộ (kể cả `is_active=0`), sort `sort_order, created_at`; FE tự dựng cây cha/con từ `parent_id` |
| `createCategory` | `POST /admin/categories` | `:273` | `:385 createCategory` | Input bắt buộc `{name, slug}`; sinh `id = cat_<uuid>`; `INSERT ... is_active=1` mặc định |
| `updateCategory` | `PATCH /admin/categories/:id` | `:289` | `:405 updateCategory` | Controller load `before` trước khi update để ghi audit before/after; service chặn `parent_id === categoryId` (không thể tự làm cha của chính nó) |
| `deleteCategory` | `DELETE /admin/categories/:id` | `:307` | `:433 deleteCategory` | **Soft-delete**: chỉ `UPDATE ... SET is_active=0`, không xoá dòng — giữ nguyên liên kết cũ trong `ProductCategories` |

- Input chung create/update: `{ name, slug, description?, image_url?, parent_id?, sort_order? }` (body)
- Output chung: `{ data: { category: {...} } }` (create/update) hoặc `{ data: { categoryId, is_active:false } }` (delete)
- Luồng ghi (create/update/delete): FE submit form → API → controller gọi service → service SELECT kiểm tra tồn tại/hợp lệ → UPDATE/INSERT → SELECT lại bản ghi mới nhất trả về → controller gọi `logAudit` → FE nhận `category` mới → cập nhật state cây danh mục tại chỗ (không cần reload toàn trang).

---

### Module A008: Thương hiệu / Nhà cung cấp (Brands CRUD)
Trang: `AdminBrands.tsx` · Nav: *Thương hiệu*

| Hàm | API | Controller | Service |
|---|---|---|---|
| `getBrands` | `GET /admin/brands?status=` | `:327` | `:448 listBrands` |
| `createBrand` | `POST /admin/brands` | `:341` | `:467 createBrand` |
| `updateBrand` | `PATCH /admin/brands/:id` | `:357` | `:484 updateBrand` |
| `setBrandStatus` | `PATCH /admin/brands/:id/status` | `:373` | `:503 setBrandStatus` |

- Input: `createBrand`/`updateBrand` body `{ name, logo_url?, description? }` (name bắt buộc lúc tạo); `setBrandStatus` body `{ status }` — controller validate chỉ nhận `"active"`/`"inactive"` (400 nếu khác)
- Output: `{ data: { brand: {...} } }` hoặc `{ data: { brandId, status } }`
- Luồng: admin tự thêm brand trực tiếp (không có workflow "brand tự đăng ký chờ duyệt") — `createBrand` insert thẳng với `status='active'`. `setBrandStatus` dùng để ẩn/hiện brand khỏi dropdown gán cho sản phẩm mà không xoá dữ liệu (id `brand_id` trên `Products` vẫn giữ nguyên).

---

### Module: Admin Orders (nền tảng cho A002/A003/A012)
Trang: `AdminOrders.tsx` · Nav: *Đơn hàng*

#### `getOrders` — Danh sách đơn hàng toàn hệ thống
- FE: `adminService.getOrders({status?, from?, to?, q?})` → `GET /admin/orders`
- Controller: `admin.controller.js:401` · Service: `adminService.js:519 listOrders`
- SQL: `Orders JOIN Users` + `LEFT JOIN Payments`; filter động theo `status`/khoảng ngày `created_at`; `q` (A012) search OR trên `order.id`, `shipping_phone`, `user.name`, `user.email`, và `EXISTS` trên `OrderItems.product_name`.
- Output: `{ data: { orders: [{ id, status, total, user_name, payment_method, payment_status, ... }] } }`

#### `getOrderDetail`
- FE: `adminService.getOrderDetail(orderId)` → `GET /admin/orders/:id`
- Controller: `admin.controller.js:416` · Service: `adminService.js:557 getOrderDetail`
- Luồng: 3 query tuần tự — `Orders JOIN Users` (404 nếu không có), `OrderItems`, `Payments` — gộp thành `{ ...order, items[], payment }`.
- Luồng UI: FE click 1 dòng trong bảng đơn → mở modal/trang chi tiết → gọi API → render items + trạng thái thanh toán.

---

### Module A011: Kho hàng & tồn kho
Trang: `AdminInventory.tsx` · Nav: *Kho hàng* · Hằng số `LOW_STOCK_THRESHOLD = 5` khai báo tại `adminService.js:6`

#### `getInventory`
- FE: `adminService.getInventory(lowStockOnly?)` → `GET /admin/inventory?lowStockOnly=`
- Controller: `admin.controller.js:432` · Service: `adminService.js:594 listInventory`
- SQL: `ProductVariants JOIN Products` + `LEFT JOIN Sellers`, chỉ variant `is_active=1`; nếu `lowStockOnly=true` thêm `AND stock_qty <= 5`; sort `stock_qty ASC` (sắp hết hàng lên đầu).

#### `adjustInventory` — Điều chỉnh tồn kho tay
- FE: `adminService.adjustInventory(variantId, changeQty, reason)` → `POST /admin/inventory/:variantId/adjust` body `{changeQty, reason}`
- Controller: `admin.controller.js:446` — gắn thêm `adminId: req.user.id` vào payload trước khi gọi service
- Service: `adminService.js:615 adjustInventory` — validate `changeQty != 0`; đọc `stock_qty` hiện tại; tính `newQty = stock_qty + changeQty`; chặn nếu `newQty < 0`; `UPDATE ProductVariants SET stock_qty=@newQty`; **đồng thời** `INSERT` 1 dòng vào `InventoryLogs (variant_id, change_qty, reason, created_by)`
- Input: `changeQty` (số, dương=nhập thêm/âm=xuất), `reason?` (mặc định `"adjustment"`)
- Output: `{ data: { variantId, stock_qty: newQty } }` + audit `adjust_inventory`
- Luồng: 2 lệnh ghi (UPDATE stock + INSERT log) chạy tuần tự trong cùng hàm service (không bọc transaction SQL) → FE nhận `stock_qty` mới → cập nhật dòng tương ứng trong bảng tại chỗ.

#### `getInventoryLogs` — Lịch sử điều chỉnh của 1 variant
- FE: `adminService.getInventoryLogs(variantId)` → `GET /admin/inventory/:variantId/logs`
- Controller: `admin.controller.js:465` · Service: `adminService.js:652` — `InventoryLogs LEFT JOIN Users` (lấy tên người điều chỉnh), sort mới nhất trước.
- Luồng UI: FE click "Lịch sử" trên 1 dòng → mở panel → gọi API → liệt kê log.

---

### Module A014: Dashboard tổng quan mở rộng
Trang: `AdminDashboard.tsx` · Nav: *Tổng quan*

#### `getDashboardSummary`
- FE: `adminService.getDashboardSummary()` → `GET /admin/dashboard/summary`
- Controller: `admin.controller.js:482` — chạy **song song** `Promise.all([...])` 3 việc:
  1. `adminService.getNewOrdersCount()` (`adminService.js:676` — đếm `Orders` có `CAST(created_at AS DATE) = hôm nay`)
  2. `adminService.getLowStockCount()` (`adminService.js:665` — đếm variant `stock_qty <= 5`)
  3. `adminService.listInventory({lowStockOnly:true})` rồi cắt `slice(0,10)` lấy 10 sản phẩm sắp hết hàng để hiển thị
- Output: `{ data: { newOrdersToday, lowStockCount, lowStockProducts: [...10 dòng] } }`
- Luồng: trang Dashboard mount → gọi song song `getDashboardSummary()` + `getRevenueStats()` + `getCashflowStats()` (3 request độc lập, không phụ thuộc nhau) → 4 stat tile + 2 line chart + widget "sắp hết hàng" render từ 3 response riêng biệt.

---

### Module A002: Báo cáo mở rộng
Trang: `AdminReports.tsx` (cùng trang với báo cáo cơ bản, thêm cột/tab)

#### `getTopProducts` — Top sản phẩm bán chạy
- FE: `adminService.getTopProducts({from?, to?, limit?})` → `GET /admin/reports/top-products`
- Controller: `admin.controller.js:506` · Service: `adminService.js:687 getTopSellingProducts`
- SQL: `TOP (@limit)` trên `OrderItems JOIN Orders/ProductVariants/Products`, loại đơn huỷ, `GROUP BY product` sort theo `SUM(quantity)` giảm dần.
- Output: `{ data: { products: [{ product_id, product_name, total_sold, total_revenue }] } }`

#### `getCancellationRates` — Tỷ lệ huỷ đơn theo từng seller
- FE: `adminService.getCancellationRates({from?, to?})` → `GET /admin/reports/cancellation-rate`
- Controller: `admin.controller.js:520` · Service: `adminService.js:715 getCancellationRateBySeller`
- SQL: JOIN `Sellers→Products→ProductVariants→OrderItems→Orders`, `COUNT(DISTINCT o.id)` tổng đơn và `COUNT(DISTINCT CASE WHEN status='cancelled')` số đơn huỷ theo từng seller → service tự tính thêm field `cancellation_rate = cancelled/total*100` (làm tròn 1 chữ số thập phân) ở tầng JS sau khi query xong.
- Output: `{ data: { sellers: [{ seller_id, shop_name, total_orders, cancelled_orders, cancellation_rate }] } }`

---

### Module A003: Theo dõi giao dịch thanh toán
Trang: `AdminTransactions.tsx` · Nav: *Giao dịch*

#### `getPayments` — Danh sách giao dịch + badge cảnh báo
- FE: `adminService.getPayments({method?, status?, from?, to?})` → `GET /admin/payments`
- Controller: `admin.controller.js:538` · Service: `adminService.js:750 listPayments`
- Luồng 2 bước trong service:
  1. Query chính `Payments JOIN Orders JOIN Users` với filter động theo `method`/`status`/khoảng ngày
  2. Query phụ tính `AVG(amount)` của `Payments` 30 ngày gần nhất
  3. `.map()` trong JS gắn thêm 2 cờ cảnh báo vào **mỗi dòng**: `is_stale_pending` (status=pending và đã tạo quá 24h) và `is_amount_outlier` (amount > 3 × giá trị trung bình 30 ngày)
- Output: `{ data: { payments: [{ id, method, status, amount, is_stale_pending, is_amount_outlier, ... }] } }` → FE hiển thị badge đỏ/vàng tương ứng.

#### `confirmPayment` — Xác nhận thủ công đã nhận tiền (dùng cho bank_transfer)
- FE: `adminService.confirmPayment(paymentId)` → `PATCH /admin/payments/:id/confirm`
- Controller: `admin.controller.js:553` · Service: `adminService.js:794 confirmPaymentPaid`
- Luồng: SELECT payment theo id (404 nếu không có) → chặn nếu `status !== 'pending'` (throw) → `UPDATE Payments SET status='paid', paid_at=GETDATE()`.
- Output: `{ data: { paymentId, status: "paid" } }` + audit `confirm_payment`
- Lưu ý: chỉ dùng cho đối soát thủ công (chuyển khoản); **VNPay** có callback riêng tự cập nhật status, không đi qua endpoint này.

---

### Module A004: Banner khuyến mãi
Trang: `AdminBanners.tsx` · Nav: *Banner* — banner active còn được endpoint **public** `GET /api/banners` (route riêng `banner.routes.js`, không thuộc `admin.routes.js`) đọc để hiển thị ngoài trang chủ.

| Hàm | API | Controller | Service |
|---|---|---|---|
| `getBanners` (`getAdminBanners` ở FE) | `GET /admin/banners` | `:589` | `:866 listBanners({})` — lấy **tất cả** kể cả banner ẩn/hết hạn (khác endpoint public chỉ lấy banner active còn hiệu lực) |
| `createBanner` | `POST /admin/banners` | `:602` | `:886 createBanner` |
| `updateBanner` | `PATCH /admin/banners/:id` | `:618` | `:907 updateBanner` |
| `deleteBanner` | `DELETE /admin/banners/:id` | `:634` | `:932 deleteBanner` — soft-delete `is_active=0` |

- Input create: `{ title, image_url, link_url?, position?, sort_order?, starts_at?, ends_at? }` (bắt buộc `title` + `image_url`, ảnh upload trước qua `upload.controller.js`/Cloudinary rồi mới gửi `image_url` vào đây)
- Output: `{ data: { banner: {...} } }` / `{ data: { bannerId, is_active:false } }`
- Luồng: FE upload ảnh (gọi service khác) → lấy URL → submit form banner → CRUD như trên → audit log → FE refetch danh sách banner trong trang admin. Trang chủ (`Home.tsx`) đọc banner qua route public riêng, độc lập với các API admin này.

---

### Module A004: Voucher / mã giảm giá (Coupons)
Trang: `AdminCoupons.tsx` · Nav: *Voucher* — bảng `Coupons` vốn đã tồn tại (dùng chung với `validateCoupon` phía checkout), ở đây chỉ thêm CRUD phía admin.

| Hàm | API | Controller | Service |
|---|---|---|---|
| `getCoupons` | `GET /admin/coupons` | `:654` | `:944 listCoupons` — chỉ lấy `deleted_at IS NULL` |
| `createCoupon` | `POST /admin/coupons` | `:667` | `:962 createCoupon` |
| `updateCoupon` | `PATCH /admin/coupons/:id` | `:683` | `:988 updateCoupon` |
| `deleteCoupon` | `DELETE /admin/coupons/:id` | `:699` | `:1020 deleteCoupon` — soft-delete `deleted_at=GETDATE(), is_active=0` |

- Input create: `{ code, discount_value, description?, discount_type?, min_order_amount?, max_discount_amt?, usage_limit?, user_limit?, starts_at?, expires_at? }` (bắt buộc `code` + `discount_value`; `code` tự động uppercase + trim)
- Output: `{ data: { coupon: {...} } }` / `{ data: { couponId, deleted:true } }`
- Luồng: giống pattern Category/Brand — FE submit → validate tối thiểu ở service → INSERT/UPDATE → SELECT lại bản ghi mới → trả về → audit log.

---

### Module A005: Nội dung Email / Thông báo tự động
Trang: `AdminNotifications.tsx` · Nav: *Email/Thông báo*

#### `getNotificationTemplates`
- FE: `adminService.getNotificationTemplates()` → `GET /admin/notification-templates`
- Controller: `admin.controller.js:719` · Service: `adminService.js:1035 listNotificationTemplates`
- Output: `{ data: { templates: [{ id, code, subject, html_body, is_active }] } }`

#### `saveNotificationTemplate` — Upsert theo `code`
- FE: `adminService.saveNotificationTemplate({code, subject, html_body, is_active?})` → `PUT /admin/notification-templates`
- Controller: `admin.controller.js:733`
- Service: `adminService.js:1057 upsertNotificationTemplate` — validate đủ `{code, subject, html_body}`; `getNotificationTemplateByCode(code)` để kiểm tra đã tồn tại chưa → nếu có: `UPDATE`; nếu chưa: sinh `id = tmpl_<uuid>` rồi `INSERT`
- Output: `{ data: { template: {...} } }` + audit `save_notification_template`
- Luồng runtime khi **gửi email thực tế** (không qua route admin, xảy ra lúc hệ thống tạo/đổi trạng thái đơn): `emailService.sendFromTemplate(templateCode, toEmail, variables)` đọc HTML từ chính bảng `NotificationTemplates` này theo `code`, thay các biến `{{customer_name}}`, `{{order_id}}`... rồi gửi qua transporter — nghĩa là **sửa nội dung ở trang admin này sẽ đổi ngay nội dung email khách nhận được** ở lần gửi tiếp theo, không cần deploy lại code.

---

### Module A006: Nhật ký hoạt động (Audit Log)
Trang: `AdminAuditLog.tsx` · Nav: *Nhật ký*

#### `logAudit` — hàm ghi (không có route riêng, được các controller khác gọi nội bộ)
- Service: `adminService.js:1094 logAudit({adminId, action, entityType, entityId, before?, after?})`
- Input: luôn có `adminId` = `req.user.id` (admin đang đăng nhập) + `action` (chuỗi cố định như `approve_seller`, `lock_user`, `adjust_inventory`...) + `entityType`/`entityId` xác định đối tượng bị tác động; `before`/`after` (object, sẽ `JSON.stringify` trước khi lưu) là ảnh trước/sau khi thao tác — chỉ `updateCategory` hiện có truyền `before` (controller tự load trước khi update), các hành động còn lại chỉ truyền `after`.
- Output: không trả gì cho FE — chỉ `INSERT INTO AuditLogs`; lỗi ghi log bị nuốt (`try/catch` nội bộ, chỉ `console.error`) để **không** làm hỏng response chính của request gốc.
- Chỉ áp dụng cho hành động **nhạy cảm** (xem danh sách `ACTION_LABELS` trong `AdminAuditLog.tsx:6-27`), không log toàn bộ mutating action (vd các thao tác GET, hay các CRUD phụ ít quan trọng thì không log).

#### `getAuditLogs` — Trang xem log
- FE: `adminService.getAuditLogs({adminId?, action?, from?, to?})` → `GET /admin/audit-logs`
- Controller: `admin.controller.js:753` · Service: `adminService.js:1114 listAuditLogs`
- SQL: `AuditLogs JOIN Users` (lấy tên/email admin thực hiện), filter động theo `adminId`/`action`/khoảng ngày, sort mới nhất trước.
- Output: `{ data: { logs: [{ id, action, entity_type, entity_id, before_data, after_data, created_at, admin_name }] } }`
- Luồng UI: FE map `action` (mã tiếng Anh) sang nhãn tiếng Việt qua `ACTION_LABELS`, click 1 dòng để expand xem `before_data`/`after_data` (JSON string) dạng đối chiếu trước/sau.

---

## 3. Bảng tra nhanh route → controller → service (toàn bộ 45 endpoint)

| Method | Route | Controller fn | Service fn |
|---|---|---|---|
| GET | `/sellers` | `getSellers` | `listSellers` |
| PATCH | `/sellers/:id/approve` | `approveSeller` | `approveSeller` |
| PATCH | `/sellers/:id/reject` | `rejectSeller` | `rejectSeller` |
| PATCH | `/sellers/:id/suspend` | `suspendSeller` | `suspendSeller` |
| GET | `/users` | `getUsers` | `listUsersWithBoomCount` |
| PATCH | `/users/:id/status` | `setUserStatus` | `setUserActive` |
| PATCH | `/users/:id/demote-seller` | `demoteSellerUser` | `demoteSellerToCustomer` |
| POST | `/users/:id/reset-password` | `resetUserPassword` | `getUserById` + `otpService.createOTP` |
| GET | `/sellers/:id/products` | `getSellerProducts` | `getSellerProducts` (→ `sellerService`) |
| GET | `/products/:id` | `getProductDetail` | `getProductDetail` |
| GET | `/reports/sellers` | `getSellerReport` | `reportSellers` |
| GET | `/reports/users` | `getUserReport` | `reportUsers` |
| GET | `/stats/revenue` | `getRevenueStats` | `revenueStats` |
| GET | `/stats/cashflow` | `getCashflowStats` | `cashflowStats` |
| GET | `/categories` | `getCategories` | `listCategories` |
| POST | `/categories` | `createCategory` | `createCategory` |
| PATCH | `/categories/:id` | `updateCategory` | `updateCategory` |
| DELETE | `/categories/:id` | `deleteCategory` | `deleteCategory` |
| GET | `/brands` | `getBrands` | `listBrands` |
| POST | `/brands` | `createBrand` | `createBrand` |
| PATCH | `/brands/:id` | `updateBrand` | `updateBrand` |
| PATCH | `/brands/:id/status` | `setBrandStatus` | `setBrandStatus` |
| GET | `/orders` | `getOrders` | `listOrders` |
| GET | `/orders/:id` | `getOrderDetail` | `getOrderDetail` |
| GET | `/inventory` | `getInventory` | `listInventory` |
| POST | `/inventory/:variantId/adjust` | `adjustInventory` | `adjustInventory` |
| GET | `/inventory/:variantId/logs` | `getInventoryLogs` | `getInventoryLogs` |
| GET | `/dashboard/summary` | `getDashboardSummary` | `getNewOrdersCount` + `getLowStockCount` + `listInventory` |
| GET | `/reports/top-products` | `getTopProducts` | `getTopSellingProducts` |
| GET | `/reports/cancellation-rate` | `getCancellationRates` | `getCancellationRateBySeller` |
| GET | `/payments` | `getPayments` | `listPayments` |
| PATCH | `/payments/:id/confirm` | `confirmPayment` | `confirmPaymentPaid` |
| GET | `/users/:id/detail` | `getUserDetail` | `getUserDetail` |
| GET | `/banners` | `getBanners` | `listBanners` |
| POST | `/banners` | `createBanner` | `createBanner` |
| PATCH | `/banners/:id` | `updateBanner` | `updateBanner` |
| DELETE | `/banners/:id` | `deleteBanner` | `deleteBanner` |
| GET | `/coupons` | `getCoupons` | `listCoupons` |
| POST | `/coupons` | `createCoupon` | `createCoupon` |
| PATCH | `/coupons/:id` | `updateCoupon` | `updateCoupon` |
| DELETE | `/coupons/:id` | `deleteCoupon` | `deleteCoupon` |
| GET | `/notification-templates` | `getNotificationTemplates` | `listNotificationTemplates` |
| PUT | `/notification-templates` | `saveNotificationTemplate` | `upsertNotificationTemplate` |
| GET | `/audit-logs` | `getAuditLogs` | `listAuditLogs` |

*(Tất cả path ở trên đều có prefix `/api/admin` khi gọi từ FE, và đều đi qua `protect` + `restrictTo("admin")` trước khi tới controller — xem mục 1.)*

---

## 4. File map

| Lớp | File |
|---|---|
| Frontend pages | `frontend/src/pages/Admin*.tsx` (16 trang) + `frontend/src/components/admin/AdminLayout.tsx` (sidebar nav) |
| Frontend API client | `frontend/src/services/adminService.ts` (types + hàm gọi API) → `frontend/src/services/api.ts` (axios instance dùng chung) |
| Backend route | `backend/src/routes/admin.routes.js` |
| Backend middleware | `backend/src/middlewares/auth.middleware.js` (`protect`, `restrictTo`) |
| Backend controller | `backend/src/controllers/admin.controller.js` |
| Backend service | `backend/src/services/adminService.js` (+ uỷ quyền sang `sellerService.js`, `otpService.js`) |
| DB | `backend/src/config/schema.sql`, `backend/src/config/db.js` (`pool`, `sql` — driver `mssql`) |
| App mount | `backend/src/app.js:100` → `app.use("/api/admin", adminRoutes)` |
