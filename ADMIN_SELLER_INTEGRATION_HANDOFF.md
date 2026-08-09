# Bàn Giao Sửa Admin Để Tích Hợp Với Seller Hiện Tại

## 1. Mục Đích

Tài liệu này chỉ dành cho member phụ trách **Admin**. Nội dung tập trung vào:

- Những điểm code Admin cũ đang xung đột hoặc chưa khớp với Seller hiện tại.
- Những phần Admin cần sửa để hai role dùng chung dữ liệu đúng nghiệp vụ.
- Những file Seller và file dùng chung Admin không được ghi đè.

Mốc Seller cần lấy làm nền:

```txt
Branch tích hợp mới nhất: fix/seller-refactor
Snapshot trước refactor: feature/seller-expansion-20260729 (07778c8)
Wallet backend: c906abc
Wallet frontend: 8fb7400
Backend refactor: 023a13d
Frontend refactor: 63c128e
```

Member Admin phải tạo branch mới từ `fix/seller-refactor`. Code Admin cũ chỉ nên dùng để tham khảo và chuyển từng phần cần thiết; không merge hoặc chép đè toàn bộ nhánh Admin cũ lên Seller hiện tại.

Đã đối chiếu trực tiếp với nhánh Admin cũ:

```txt
Source branch: origin/feature/ecommerce-updates-20260729
Source commit: 5691823
Ngày đối chiếu: 2026-08-03
```

Tên file trong các mục dưới đây được ghi theo đúng hai cây code tại các mốc trên. Nếu nhánh Admin phát sinh commit mới sau `5691823`, member Admin phải đối chiếu lại danh sách file trước khi chuyển code.

---

## 2. Các Xung Đột Admin Phải Xử Lý

| Mức độ | Khu vực | Admin hiện tại chưa khớp | Admin cần sửa |
|---|---|---|---|
| Rất cao | Duyệt seller | Approve/suspend cập nhật `Sellers` và `Users` bằng nhiều câu lệnh rời, chưa có transaction; thiếu reject reason và reactivate | Dùng transaction, khóa application, kiểm tra chuyển trạng thái, cập nhật role, audit và notification trong cùng transaction |
| Rất cao | Voucher | Admin và Seller dùng chung `Coupons` nhưng Admin chưa tách voucher toàn sàn khỏi voucher shop | Mọi CRUD voucher Admin phải có `seller_id IS NULL`; tuyệt đối không update/delete voucher có `seller_id IS NOT NULL` |
| Cao | Kho hàng | Admin đang dùng ngưỡng cứng `5` và có luồng tự điều chỉnh stock | Dùng `ProductVariants.low_stock_threshold`; Admin chỉ xem và giám sát kho trong MVP, không tự thay stock của shop |
| Cao | Đơn hàng | Admin có thể đang đọc trạng thái tổng từ `Orders.status` | Hiển thị và báo cáo theo `OrderItems.fulfillment_status`; không thay đổi fulfillment thay seller |
| Cao | Báo cáo | Doanh thu/đơn hủy có thể tính theo trạng thái order cũ | Chỉ tính doanh thu từ item `delivered`; loại item `cancelled`; hỗ trợ một order có nhiều shop |
| Cao | Ví và rút tiền | Admin cũ chưa có UI duyệt rút tiền hoặc có thể tự sửa số dư trực tiếp | Dùng API withdrawal đã có; chỉ duyệt/từ chối yêu cầu `pending`, không tạo API chỉnh số dư |
| Cao | Product theo seller | Admin có thể gọi lại hàm Seller vốn lấy shop từ token hiện tại | Viết query read-only riêng trong `adminService`; không gọi Seller service với `sellerId` tùy ý |
| Trung bình | Schema/file chung | Nhánh Admin cũ có thể ghi đè `initDb.js`, `schema.sql`, `app.js` và routes mới | Chỉ thêm migration/route theo từng block; giữ nguyên schema và middleware Seller hiện tại |
| Trung bình | FE Admin | Thiếu modal nhập lý do từ chối/tạm ngưng, thiếu reactivate và xử lý transition error | Bổ sung action theo đúng trạng thái và hiển thị lỗi bằng `code` từ BE |

---

## 3. Contract Seller Hiện Tại Phải Giữ Nguyên

### 3.1 Vòng đời seller

```txt
customer gửi đơn       -> pending   + role customer
Admin duyệt pending    -> active    + role seller
Admin từ chối pending  -> rejected  + role customer
customer gửi lại       -> pending   + role customer
Admin tạm ngưng active -> suspended + role customer
Admin kích hoạt lại    -> active    + role seller
```

Không cho phép chuyển trạng thái ngoài các đường trên. Ví dụ:

```txt
pending   -> suspended: không hợp lệ
rejected  -> active: không hợp lệ nếu customer chưa gửi lại
suspended -> pending: không hợp lệ
active    -> rejected: không hợp lệ
```

### 3.2 Rule quyền truy cập

- Seller mới đăng ký không được tự động chuyển thành `active`.
- Khi còn `pending`, `rejected` hoặc `suspended`, user không được truy cập Seller Dashboard.
- Các API vận hành Seller hiện được bảo vệ bởi `requireActiveSeller`.
- Shop không `active` không được hiển thị công khai và không được checkout.
- Admin không phát JWT mới sau khi duyệt. User đăng nhập lại hoặc FE refresh profile để nhận role mới.

### 3.3 API Seller Admin không được thay đổi contract

```http
POST /api/seller/register
GET  /api/seller/application
POST /api/seller/application/uploads
```

Admin phải tạo API riêng dưới `/api/admin`. Không mở rộng API status an toàn của customer để trả CCCD hoặc tài khoản ngân hàng.

---

## 4. BE Admin Cần Sửa

### 4.1 Seller Applications

Các endpoint Admin nên có:

```http
GET   /api/admin/sellers?status=&search=&page=&limit=
GET   /api/admin/sellers/:sellerId
PATCH /api/admin/sellers/:sellerId/approve
PATCH /api/admin/sellers/:sellerId/reject
PATCH /api/admin/sellers/:sellerId/suspend
PATCH /api/admin/sellers/:sellerId/reactivate
```

Tất cả endpoint phải đi qua:

```txt
protect
restrictTo('admin')
```

#### Approve

Chỉ cho phép `pending -> active`.

Trong một transaction:

```txt
1. Khóa bản ghi Sellers cần duyệt.
2. Kiểm tra application tồn tại và đang pending.
3. Cập nhật Sellers.status = active.
4. Cập nhật Users.role = seller.
5. Ghi thông tin người duyệt và thời gian duyệt nếu schema hỗ trợ.
6. Ghi AuditLogs.
7. Tạo notification cho user.
8. Commit transaction.
```

Nếu bất kỳ bước nào lỗi phải rollback toàn bộ. Không được xảy ra trường hợp shop `active` nhưng user vẫn là `customer`, hoặc ngược lại.

#### Reject

Body:

```json
{
  "reason": "Thông tin định danh chưa hợp lệ."
}
```

Rule:

```txt
Chỉ pending -> rejected
reason bắt buộc, trim, từ 3 đến 500 ký tự
Users.role giữ hoặc chuyển về customer
Ghi audit và notification trong cùng transaction
```

#### Suspend

Body:

```json
{
  "reason": "Shop vi phạm chính sách vận hành."
}
```

Rule:

```txt
Chỉ active -> suspended
reason bắt buộc
Users.role = customer
Shop bị ẩn và không được checkout theo rule Seller hiện tại
Ghi audit và notification trong cùng transaction
```

#### Reactivate

Body có thể nhận lý do nội bộ:

```json
{
  "reason": "Shop đã hoàn tất xác minh lại."
}
```

Rule:

```txt
Chỉ suspended -> active
Users.role = seller
Ghi audit và notification trong cùng transaction
```

#### Error code nên chuẩn hóa

```txt
SELLER_APPLICATION_NOT_FOUND       404
INVALID_SELLER_STATUS_TRANSITION   409
SELLER_REJECT_REASON_REQUIRED      400
SELLER_SUSPEND_REASON_REQUIRED     400
```

FE Admin phải dựa vào `code`, không so sánh riêng chuỗi `message`.

### 4.2 Dữ liệu duyệt seller

Schema Seller hiện tại đã có status:

```txt
pending | active | rejected | suspended
```

Nếu Admin cần lưu lý do và metadata duyệt nhưng DB chưa có, chỉ bổ sung migration an toàn:

```txt
rejection_reason VARCHAR(500) NULL
reviewed_at DATETIME2 NULL
reviewed_by VARCHAR(50) NULL
```

Yêu cầu migration:

- Kiểm tra cột tồn tại trước khi `ALTER TABLE`.
- Không xóa hoặc tạo lại bảng `Sellers`.
- Không đổi default status về `active`.
- Khi customer gửi lại application bị `rejected`, cần xóa lý do từ chối và metadata duyệt cũ. Đây là điểm chạm file Seller; member Admin phải báo owner Seller để thêm đúng block, không chép đè `sellerService.js`.

API chi tiết `/api/admin/sellers/:sellerId` có thể trả thông tin định danh và ngân hàng cho Admin. API `/api/seller/application` vẫn chỉ trả thông tin trạng thái an toàn.

### 4.3 Voucher toàn sàn và voucher shop

Hai role dùng chung bảng `Coupons`, không tạo bảng voucher Admin mới.

Quy ước bắt buộc:

```txt
seller_id IS NULL     = voucher toàn sàn do Admin quản lý
seller_id IS NOT NULL = voucher riêng của shop
```

Mọi query Admin tạo/sửa/xóa voucher toàn sàn phải khóa scope:

```sql
WHERE id = @couponId
  AND seller_id IS NULL
  AND deleted_at IS NULL
```

Admin không được:

- Sửa voucher của shop.
- Xóa voucher của shop.
- Gán voucher shop thành voucher toàn sàn bằng update `seller_id`.
- Dùng một endpoint delete không có điều kiện `seller_id IS NULL`.

Nếu Admin cần màn giám sát toàn bộ voucher, endpoint đó chỉ được read-only và trả thêm `scope = platform | shop`.

Khi xóa voucher toàn sàn, dùng cùng cơ chế soft delete hiện tại:

```txt
đổi code thành <code>__deleted__<couponId>
is_active = 0
deleted_at = GETDATE()
```

Cơ chế này giải phóng unique code để có thể tạo lại mã cũ. Không hard delete.

### 4.4 Kho hàng

Admin hiện tại không nên thay số lượng tồn kho của Seller.

Phạm vi Admin hợp lý:

```txt
Xem tồn kho toàn hệ thống
Lọc theo shop, SKU, trạng thái
Xem lịch sử InventoryLogs
Phát hiện hết hàng/sắp hết hàng
Khóa sản phẩm hoặc shop qua nghiệp vụ kiểm duyệt riêng nếu cần
```

Không dùng ngưỡng cứng:

```js
const LOW_STOCK_THRESHOLD = 5;
```

Phải dùng dữ liệu từng variant:

```txt
stock_qty <= low_stock_threshold
```

Schema `InventoryLogs` hiện tại cần được đọc đúng tên cột:

```txt
old_quantity
change_quantity
new_quantity
type
reference_id
reason
created_by
created_at
```

Không dùng cột cũ `change_qty`. Không insert log bằng code Admin rời transaction.

Nếu tương lai Admin được phép override stock, phải gọi chung inventory service, bắt buộc lý do, audit và transaction. Chức năng này không nằm trong MVP hiện tại.

### 4.5 Đơn hàng và báo cáo

Seller vận hành theo từng `OrderItem`, không theo một trạng thái giao hàng chung của `Orders`.

Trạng thái chuẩn:

```txt
pending_fulfillment
ready_to_ship
shipping
delivered
cancelled
```

Admin chỉ giám sát và hỗ trợ tra cứu. Không hiện nút thay Seller chuyển fulfillment trong màn Admin.

Query báo cáo phải theo rule:

```txt
Doanh thu: chỉ cộng OrderItems đã delivered
Đơn hủy: dựa trên item cancelled
Top sản phẩm: chỉ tính số lượng delivered
Đơn nhiều shop: nhóm đúng theo seller_id của từng item
Return/refund: giảm số liệu tài chính theo contract finance hiện tại
```

Không dùng riêng:

```sql
Orders.status != 'cancelled'
```

để suy ra doanh thu hoặc trạng thái vận chuyển.

### 4.6 Product theo seller

Admin cần query read-only riêng trong `adminService`:

```txt
GET /api/admin/sellers/:sellerId/products
```

Không gọi `sellerService.getSellerProducts(sellerId)` nếu hàm Seller hiện tại lấy shop từ token/session. Làm vậy dễ phá data isolation hoặc trả sai shop.

Admin có thể khóa/ẩn sản phẩm theo contract kiểm duyệt riêng. Admin không được sửa giá, stock, SKU hoặc nội dung bán hàng thay seller trong MVP.

### 4.7 Ví Seller và yêu cầu rút tiền

Backend đã hoàn chỉnh phần ví và route cho Admin. Member Admin **không viết lại nghiệp vụ ví**, chỉ tích hợp trang quản trị vào các API sau:

```http
GET   /api/admin/withdrawals?status=&search=&page=&limit=
PATCH /api/admin/withdrawals/:id
Authorization: Bearer <admin-token>
```

Body xử lý yêu cầu:

```json
{
  "status": "approved",
  "adminNote": "Đã chuyển khoản thủ công theo thông tin ngân hàng."
}
```

Hoặc:

```json
{
  "status": "rejected",
  "adminNote": "Thông tin tài khoản ngân hàng chưa hợp lệ."
}
```

Rule bắt buộc:

```txt
Chỉ pending -> approved hoặc pending -> rejected
Không xử lý lại yêu cầu đã approved/rejected/cancelled
Approve giữ nguyên số tiền đã được khóa khi Seller tạo request
Reject hoàn số tiền đang giữ về available_balance
Admin không nhập hoặc chỉnh amount
adminNote phải trim, tối đa 500 ký tự; nên bắt buộc khi rejected
Mọi cập nhật request, wallet ledger và notification chạy trong cùng transaction
Không cung cấp endpoint chỉnh trực tiếp available_balance/pending_balance
```

Luồng hiện tại là chuyển khoản thủ công. `approved` có nghĩa Admin xác nhận đã xử lý chuyển khoản ngoài hệ thống; chưa tích hợp cổng payout ngân hàng.

Response danh sách đã có dữ liệu shop, chủ shop, ngân hàng, số tiền, trạng thái và thời gian. FE Admin phải che số tài khoản trên list; chỉ hiện đầy đủ trong modal chi tiết/xác nhận và không ghi thông tin nhạy cảm vào console.

Các service đã được tách sau refactor:

```txt
backend/src/services/sellerWalletService.js          # ledger, đối soát, cộng/trừ số dư
backend/src/services/sellerWalletQueryService.js     # đọc tổng quan và lịch sử ví
backend/src/services/sellerWithdrawalService.js      # tạo/hủy/duyệt/từ chối rút tiền
backend/src/controllers/adminWithdrawal.controller.js
backend/src/routes/adminWithdrawal.routes.js
```

Không chuyển logic withdrawal vào `adminService.js`; controller Admin hiện tại đã gọi đúng service dùng chung.

---

## 5. Những File Admin Có Thể Chuyển Sang

Có thể lấy các file độc lập sau từ nhánh Admin cũ làm nền rồi sửa theo tài liệu này:

```txt
backend/src/routes/admin.routes.js
backend/src/controllers/admin.controller.js
backend/src/services/adminService.js

frontend/src/pages/AdminAuditLog.tsx
frontend/src/pages/AdminBanners.tsx
frontend/src/pages/AdminBrands.tsx
frontend/src/pages/AdminCategories.tsx
frontend/src/pages/AdminCoupons.tsx
frontend/src/pages/AdminDashboard.tsx
frontend/src/pages/AdminInventory.tsx
frontend/src/pages/AdminNotifications.tsx
frontend/src/pages/AdminOrders.tsx
frontend/src/pages/AdminReports.tsx
frontend/src/pages/AdminSellerApplications.tsx
frontend/src/pages/AdminSellerProducts.tsx
frontend/src/pages/AdminTransactions.tsx
frontend/src/pages/AdminUserDetail.tsx
frontend/src/pages/AdminUsers.tsx
frontend/src/components/admin/AdminLayout.tsx
frontend/src/components/admin/ImageUploadField.tsx
frontend/src/components/admin/TimeSeriesChart.tsx
frontend/src/services/adminService.ts
```

Các file trên vẫn cần review lại query, transaction và payload; không coi code cũ là tương thích sẵn.

### Mapping file cũ sang kiến trúc hiện tại

| Nội dung | Nhánh Admin cũ `5691823` | Đích trong `fix/seller-refactor` |
|---|---|---|
| Khai báo trang Admin | `frontend/src/App.tsx` | Thêm lazy imports và `<Route>` vào `frontend/src/routes/AppRoutes.tsx` |
| Guard role Admin | `AdminRoute` viết trong `frontend/src/App.tsx` | Tách thành `AdminRoute` dùng `<Outlet />` trong `frontend/src/routes/RouteGuards.tsx` |
| Layout Admin | Bọc `AdminLayout` từng route trong `frontend/src/App.tsx` | Tạo `AdminDashboardLayout` trong `frontend/src/routes/RouteLayouts.tsx` rồi dùng nested routes |
| Provider/router gốc | `frontend/src/App.tsx` quản lý tất cả | Giữ nguyên `frontend/src/App.tsx` hiện tại; không chép file cũ |
| API Admin tổng quát | `backend/src/routes/admin.routes.js` | Có thể thêm mới và mount `/api/admin` trong `backend/src/app.js` |
| API Admin rút tiền | Chưa có trong nhánh Admin cũ | Đã có `adminWithdrawal.routes.js` và `adminWithdrawal.controller.js`; không viết lại |

Không chuyển các file Seller trùng tên từ nhánh Admin cũ, gồm `SellerLayout.tsx`, `BecomeSeller.tsx`, `Seller*.tsx`, `sellerService.ts`, `seller.routes.js`, `seller.controller.js` và `sellerService.js`.

---

## 6. Những File Dùng Chung Phải Merge Thủ Công

Không chép đè file từ nhánh Admin cũ. Chỉ thêm đúng import, route hoặc migration cần thiết:

```txt
backend/src/app.js
backend/src/config/initDb.js
backend/src/config/schema.sql
backend/src/middlewares/auth.middleware.js
backend/src/controllers/adminWithdrawal.controller.js
backend/src/routes/adminWithdrawal.routes.js
backend/src/services/sellerWalletService.js
backend/src/services/sellerWalletQueryService.js
backend/src/services/sellerWithdrawalService.js
frontend/src/App.tsx
frontend/src/routes/AppRoutes.tsx
frontend/src/routes/RouteGuards.tsx
frontend/src/routes/RouteLayouts.tsx
frontend/src/context/AuthContext.tsx
frontend/src/types.ts
pnpm-lock.yaml
```

Đặc biệt không lấy đè các file Seller hiện tại:

```txt
backend/src/services/sellerService.js
backend/src/services/sellerCouponService.js
backend/src/services/sellerDashboardService.js
backend/src/controllers/seller.controller.js
backend/src/controllers/sellerProduct.controller.js
backend/src/routes/seller.routes.js
frontend/src/pages/BecomeSeller.tsx
frontend/src/services/sellerService.ts
frontend/src/pages/Seller*.tsx
frontend/src/hooks/seller/*.ts
frontend/src/components/seller/*.tsx
frontend/src/components/seller/dashboard/*.tsx
frontend/src/components/seller/products/*.tsx
```

Nếu Admin cần thay đổi một file trong danh sách này, phải gửi diff nhỏ cho owner Seller review.

---

## 7. Việc Cụ Thể Theo Từng File Admin

### `backend/src/services/adminService.js`

- Chuyển approve/reject/suspend/reactivate sang transaction.
- Thêm validate state transition.
- Scope CRUD coupon bằng `seller_id IS NULL`.
- Bỏ thao tác chỉnh stock trực tiếp; chuyển inventory Admin thành read-only.
- Sửa low-stock dùng `low_stock_threshold`.
- Sửa báo cáo theo `OrderItems.fulfillment_status`.
- Viết query product theo seller riêng cho Admin.

### `backend/src/controllers/admin.controller.js`

- Validate `reason` cho reject/suspend.
- Chuẩn hóa HTTP status và error `code`.
- Không trả lỗi SQL thô cho FE.
- Không nhận `userId` hoặc role mới từ FE cho approve; tự lấy quan hệ từ Seller trong DB.

### `backend/src/routes/admin.routes.js`

- Giữ `protect` và `restrictTo('admin')` cho toàn bộ route.
- Thêm route `reactivate`.
- Đặt route cụ thể trước route có `/:id` để tránh bắt nhầm URL.
- Bổ sung pagination/filter cho seller applications.

### `frontend/src/services/adminService.ts`

- Thêm API reject/suspend nhận `{ reason }`.
- Thêm API reactivate.
- Chuẩn hóa type status: `pending | active | rejected | suspended`.
- Không gửi `userId`, `role` hoặc `seller_id` trong action approve.
- Có thể bổ sung hàm gọi `/api/admin/withdrawals` ngay trong service này; không import hoặc sửa `frontend/src/services/walletService.ts` của Seller.

### `frontend/src/App.tsx` và routes

- Không dùng file `frontend/src/App.tsx` từ nhánh Admin cũ.
- Giữ `App.tsx` hiện tại chỉ làm nhiệm vụ gắn `AppProviders`, `BrowserRouter` và `AppRoutes`.
- Chuyển lazy import cùng route Admin sang `frontend/src/routes/AppRoutes.tsx`.
- Tạo `AdminRoute` trong `frontend/src/routes/RouteGuards.tsx`, kiểm tra đăng nhập và `user.role === 'admin'`.
- Tạo `AdminDashboardLayout` trong `frontend/src/routes/RouteLayouts.tsx` để bọc `AdminLayout` một lần bằng nested route.
- Không đưa lại `ProtectedRoute`, `SellerRoute`, Header, Footer hoặc widget từ `App.tsx` cũ.

### Trang Admin Seller Applications

- Tab theo bốn trạng thái Seller.
- `pending`: hiện Duyệt và Từ chối.
- `active`: hiện Tạm ngưng.
- `suspended`: hiện Kích hoạt lại.
- `rejected`: chỉ xem lý do; customer tự gửi lại từ Seller flow.
- Reject/suspend phải mở modal nhập lý do.
- Sau action thành công, refetch danh sách và chi tiết.
- Khi BE trả `INVALID_SELLER_STATUS_TRANSITION`, báo dữ liệu đã thay đổi và refetch thay vì tiếp tục dùng state cũ.

### Trang Admin Voucher

- Gắn nhãn rõ `Voucher toàn sàn`.
- Chỉ gọi endpoint Admin có scope platform.
- Không render nút sửa/xóa đối với voucher shop nếu có màn giám sát chung.

### Trang Admin Inventory và Reports

- Inventory chỉ đọc, bỏ nút điều chỉnh stock.
- Hiển thị threshold riêng từng variant.
- Reports dùng field item-level do BE Admin trả, không tự suy diễn từ `Orders.status`.

### Trang Admin Withdrawal

- Thêm menu `Yêu cầu rút tiền` cho role Admin.
- Có tab/filter `pending`, `approved`, `rejected`, `cancelled`.
- List hiển thị mã yêu cầu, shop, chủ shop, số tiền, ngân hàng dạng che bớt, trạng thái và ngày tạo.
- Modal chi tiết mới được hiển thị đầy đủ ngân hàng/số tài khoản.
- Chỉ request `pending` có nút `Duyệt` và `Từ chối`.
- Từ chối bắt buộc nhập lý do; duyệt phải có bước xác nhận.
- Sau action thành công phải refetch list và số lượng pending.
- Với lỗi trạng thái hiện tại `WITHDRAWAL_NOT_CANCELLABLE` (HTTP 409), đóng action cũ và refetch thay vì gửi lại.
- Không thêm form sửa số dư ví hoặc sửa số tiền yêu cầu.

---

## 8. Trình Tự Tích Hợp An Toàn

```txt
1. Member Admin fetch và tạo branch mới từ `fix/seller-refactor`.
2. Xác nhận HEAD có cả hai commit refactor `023a13d` và `63c128e`.
3. Chuyển các file Admin độc lập từ nhánh Admin cũ.
4. Sửa adminService/controller/routes theo các conflict trong tài liệu này.
5. Merge thủ công app, migration và FE routes theo từng block nhỏ.
6. Chạy migration trên DB test.
7. Test lại Seller flow trước khi mở PR Admin.
8. Tạo PR Admin riêng để owner Seller review các file dùng chung.
```

Không merge nguyên nhánh Admin cũ vào Seller hiện tại vì sẽ dễ ghi đè pending workflow, Seller middleware, schema kho, coupon scope và order lifecycle mới.

---

## 9. Acceptance Checklist Cho Member Admin

### Seller approval

- [ ] User gửi Become Seller thì application là `pending`, role vẫn `customer`.
- [ ] Approve thành công đồng thời đổi Seller `active` và User `seller`.
- [ ] Approve lỗi giữa chừng rollback cả hai bảng.
- [ ] Reject bắt buộc lý do và gửi notification.
- [ ] Active có thể suspend; suspended có thể reactivate.
- [ ] Không cho transition ngoài state machine.
- [ ] Shop suspended biến mất khỏi public shop và bị chặn checkout.

### Voucher

- [ ] Admin tạo voucher với `seller_id = NULL`.
- [ ] Admin update/delete không tác động voucher shop.
- [ ] Seller update/delete không tác động voucher toàn sàn.
- [ ] Soft delete giải phóng code để tạo lại.

### Inventory

- [ ] Admin không có action đổi stock trong MVP.
- [ ] Low stock dùng threshold của từng variant.
- [ ] Inventory log đọc đúng `change_quantity` và các cột schema hiện tại.

### Orders và reports

- [ ] Đơn nhiều shop hiển thị đúng từng item và seller.
- [ ] Dashboard/report chỉ tính doanh thu item delivered.
- [ ] Cancelled item không được tính doanh thu.
- [ ] Admin không thay fulfillment thay Seller.

### Wallet và withdrawal

- [ ] Admin chỉ xem yêu cầu thuộc API `/api/admin/withdrawals`.
- [ ] Chỉ yêu cầu `pending` được duyệt hoặc từ chối một lần.
- [ ] Approve không trừ tiền lần hai và tạo đúng ledger `withdrawal_approved`.
- [ ] Reject trả tiền giữ về số dư khả dụng và tạo ledger `withdrawal_rejected`.
- [ ] Seller nhận notification sau khi Admin xử lý.
- [ ] Customer/Seller không gọi được route Admin; Admin không gọi được route Seller wallet.
- [ ] FE Admin không có chức năng sửa trực tiếp số dư hoặc số tiền yêu cầu.

### Regression

- [ ] Seller active vẫn vào dashboard và dùng product/order/inventory bình thường.
- [ ] Seller pending/rejected/suspended bị chặn đúng.
- [ ] Customer checkout shop active bình thường.
- [ ] API `/api/seller/application` vẫn hoạt động và không lộ dữ liệu nhạy cảm.
- [ ] Không có file Seller nào bị chép đè từ nhánh Admin cũ.

---

## 10. Không Thuộc Phạm Vi Member Admin

Member Admin không cần sửa các nghiệp vụ sau nếu không có lỗi tích hợp trực tiếp:

```txt
Seller tạo/sửa/xóa sản phẩm
Seller điều chỉnh kho
Seller xử lý fulfillment
Seller tạo voucher shop
Seller flash sale
Seller chat/review/finance
Seller wallet ledger, đối soát và tạo/hủy yêu cầu rút tiền
Customer checkout và cart
Seller route guards và application status UI
```

Mục tiêu của nhánh Admin là bổ sung quản trị và kiểm duyệt, không thay quyền vận hành cửa hàng của Seller.
