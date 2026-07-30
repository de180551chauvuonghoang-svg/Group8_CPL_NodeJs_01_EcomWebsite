# Giải Thích Logic Frontend Kênh Người Bán

Tài liệu này dành cho intern cần đọc, debug hoặc mở rộng FE Seller. Trọng tâm là workflow, state, validation, service và điểm kết nối API. Phần JSX trình bày giao diện và CSS không được phân tích chi tiết.

## 1. Bản đồ kiến trúc FE

```txt
main.tsx
  -> App.tsx
    -> AuthProvider / CartProvider
    -> AppRoutes.tsx
      -> Route guard
      -> Route layout
      -> Seller page
        -> event handler
        -> FE validation
        -> service function
        -> Axios API instance
        -> endpoint backend
        -> cập nhật state/refetch/navigate
```

Các lớp chính:

| Lớp                     | File                                                                         | Trách nhiệm                                            |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Routing                 | `frontend/src/routes/AppRoutes.tsx`                                          | Khai báo URL và lazy-load page                         |
| Guard                   | `frontend/src/routes/RouteGuards.tsx`                                        | Chặn user chưa đăng nhập hoặc chưa có role seller      |
| Layout                  | `frontend/src/routes/RouteLayouts.tsx`, `components/seller/SellerLayout.tsx` | Sidebar, notification, unread chat và vùng Outlet      |
| Page                    | `frontend/src/pages/Seller*.tsx`                                             | State màn hình, handler, validation, điều phối request |
| Feature component       | `components/analytics`, `inventory`, `vouchers`                              | Logic con có thể tái sử dụng                           |
| Service                 | `frontend/src/services/*.ts`                                                 | Đóng gói endpoint và chuẩn hóa response                |
| Shared validation/error | `frontend/src/utils/*.ts`                                                    | Regex, rule số và mapping error code                   |
| Types                   | `frontend/src/types.ts`                                                      | Contract TypeScript giữa page và service               |

## 2. Route và quyền seller

### `AppRoutes.tsx`

- Dùng `lazy()` để tách bundle từng page.
- Toàn bộ `/seller/*` nằm bên trong `<SellerRoute />`.
- Route `/seller` redirect sang `/seller/dashboard`.
- Page seller render trong `SellerDashboardLayout`, sau đó `SellerLayout` bọc `<Outlet />`.

### `SellerRoute()`

Workflow:

```txt
AuthContext đang loading -> PageLoader
chưa đăng nhập           -> /login
đã đăng nhập, role khác  -> /become-seller
role seller              -> GET /seller/application
application active       -> render Outlet
application khác active  -> /become-seller
lỗi xác minh tạm thời    -> màn lỗi + nút Thử lại
```

Guard chỉ là lớp trải nghiệm FE. API seller vẫn phải kiểm tra JWT và role ở backend.

### `AuthContext`

- Khi app mount, đọc `ecom_token` và `ecom_user`.
- Nếu có phiên thật, gọi `authService.getProfile()` để đồng bộ user từ server.
- Token không hợp lệ làm logout và ngắt socket.
- `updateUser()` cập nhật state React và `ecom_user` khi đã có một user hoàn chỉnh.
- `refreshUser()` gọi `authService.getProfile()`, cập nhật Context và local storage bằng role thật trong DB.
- Become Seller không tự sửa role. Khi hồ sơ chuyển `active`, page gọi `refreshUser()` rồi mới vào Dashboard.

## 3. Luồng Axios chung

File: `frontend/src/services/api.ts`.

### Request

1. `baseURL` lấy từ `VITE_API_BASE_URL`.
2. Nếu biến môi trường không có, fallback `http://localhost:5000/api`.
3. Request interceptor đọc `ecom_token`.
4. Nếu có token, gắn `Authorization: Bearer <token>`.
5. Timeout mặc định 10 giây.

### Response

- Success interceptor trả thẳng `response.data`, vì vậy service thường không nhận nguyên `AxiosResponse`.
- Error interceptor reject object chuẩn:

```ts
{
  message: string;
  status?: number;
  data?: {
    status?: string;
    code?: string;
    message?: string;
  };
}
```

Page nên ưu tiên `error.data.code` cho lỗi nghiệp vụ, sau đó `error.data.message`, cuối cùng mới dùng fallback FE.

## 4. Pattern state và URL chung

Các trang danh sách mới dùng `useSearchParams()` để URL là nguồn trạng thái đã áp dụng:

- Sản phẩm: page, search, categoryId, status, sort.
- Trả hàng: page, status, search.
- Tài chính: page, type, search, from, to.
- Voucher: tab.
- Đơn hàng: q và status.

Pattern:

```txt
input draft thay đổi
  -> chưa gọi API
click Lọc/Áp dụng
  -> FE validate
  -> setSearchParams hoặc set query state
  -> useEffect/useCallback chạy loader
  -> service gọi API
```

Lợi ích: refresh không mất bộ lọc và link có thể mở đúng trạng thái. Riêng Seller Orders hiện tải danh sách rồi lọc search/status ở FE; các trang lớn khác gửi query sang API.

## 5. Đăng ký seller

File: `frontend/src/pages/BecomeSeller.tsx`.

### Trạng thái khi mở trang

Page gọi `sellerService.getSellerApplication()` trước khi render form:

```txt
loading   -> màn kiểm tra hồ sơ
null      -> form đăng ký
pending   -> màn chờ Admin duyệt
rejected  -> thông báo bị từ chối + form gửi lại
suspended -> màn cửa hàng bị tạm ngưng
active    -> AuthContext.refreshUser() -> /seller/dashboard
lỗi API   -> màn lỗi + nút Thử lại, không render form
```

Khi trạng thái là `pending`, page refetch lúc cửa sổ trình duyệt được focus và có nút `Kiểm tra trạng thái`. Không polling liên tục nên không tạo request nền không cần thiết.

### Event và handler

- Gõ input → `handleChange()` cập nhật object `form` và xóa lỗi cũ.
- Submit → `handleSubmit()`.

### Workflow `handleSubmit()`

```txt
preventDefault
-> kiểm tra field bắt buộc
-> isValidShopPhone
-> isValidOptionalIdentityNumber
-> isValidOptionalBankAccount
-> setLoading(true)
-> sellerService.registerSeller(...)
-> gọi lại getSellerApplication() để lấy trạng thái và timestamp thật từ DB
-> hiển thị màn chờ duyệt
-> catch: hiển thị message API
-> finally: setLoading(false)
```

### Validation dùng chung

File `frontend/src/utils/sellerValidation.ts`:

- `isValidShopPhone`: `/^0\d{9}$/`.
- `isValidOptionalIdentityNumber`: rỗng hoặc đúng 12 số.
- `isValidOptionalBankAccount`: rỗng hoặc 6-20 số.

### API boundary

`sellerService.getSellerApplication()` → `GET /seller/application`.

`sellerService.registerSeller()` → `POST /seller/register`.

Service gửi thông tin cơ bản cộng `extra` và chỉ nhận hồ sơ `{ sellerId, status: 'pending' }`. Nó không ghi `ecom_token`, không ghi `ecom_user` và không tự cấp role seller.

Logo/cover trên trang này dùng `uploadScope="application"`:

```txt
POST   /seller/application/uploads/images
DELETE /seller/application/uploads/images
```

Các trang của seller đã active vẫn dùng endpoint `/uploads/images`. Việc tách scope ngăn customer chưa được duyệt gọi nhầm API upload sản phẩm.

### Xử lý error code

- `SELLER_APPLICATION_PENDING`: refetch hồ sơ và chuyển sang màn pending.
- `SELLER_ALREADY_ACTIVE`: refetch hồ sơ, refresh user và vào Dashboard.
- `SELLER_SUSPENDED`: refetch để hiện màn suspended.
- `SHOP_NAME_TAKEN`: hiển thị message BE tại form.
- Lỗi upload phải đọc từ `error.data.code/message` vì Axios interceptor đã chuẩn hóa lỗi.

## 6. Layout, notification và unread chat

### `SellerLayout.tsx`

- `navItems` là nguồn duy nhất của menu seller.
- Mount layout gọi `chatService.getRecentChats()`.
- Tổng `unread_count` của các chat được lưu trong `unreadMessages`.
- Poll mỗi 30 giây.
- `SellerInbox` phát custom event `seller-unread-changed`; layout nghe event và cập nhật badge ngay.
- Nút Home gọi `navigate('/')`.

### `NotificationBell.tsx`

`load(silent)` → `notificationService.getNotifications({ page: 1, limit: 8 })` → `GET /notifications`.

- Lần đầu có loading state.
- Poll nền mỗi 30 giây, chỉ khi tab browser visible.
- Click ngoài panel đóng dropdown.

`openNotification(notification)`:

```txt
nếu chưa đọc
  -> PATCH /notifications/:id/read
  -> cập nhật item local và giảm unreadCount
đóng panel
-> getTarget(type, role)
-> navigate(route)
```

`markAllRead()` → `PATCH /notifications/read-all` → set tất cả `is_read = true`, badge = 0.

## 7. Dashboard

File: `frontend/src/pages/SellerDashboard.tsx`.

### Ba loader độc lập

| Hàm                 | Service                        | Endpoint                          | State chính            |
| ------------------- | ------------------------------ | --------------------------------- | ---------------------- |
| `loadStats()`       | `getDashboardStats()`          | `GET /seller/dashboard-stats`     | stats, top products    |
| `loadAnalytics()`   | `getDashboardAnalytics(query)` | `GET /seller/dashboard-analytics` | summary, series, range |
| `loadActionStats()` | `getDashboardTasks()`          | `GET /seller/dashboard-tasks`     | việc cần làm           |

Ba loader độc lập để lỗi biểu đồ không làm mất toàn bộ KPI hoặc task. `handleRefresh()` chạy cả ba bằng `Promise.all`.

### Kỳ thống kê

- `period` là `'day' | 'month' | 'year'`.
- `fromDraft/toDraft` là giá trị input chưa áp dụng.
- `appliedRange` là khoảng thực sự gửi API.

`handlePeriodChange(nextPeriod)` đổi kỳ và reset cả draft/applied range.

`handleApplyRange()` gọi `getRangeError()` trước khi set range. Rule FE:

- Phải có đủ hai ngày hoặc để trống cả hai.
- `from <= to`.
- Day tối đa 366 bucket, month tối đa 60, year tối đa 10.

`handleResetRange()` xóa draft/applied range để backend dùng mặc định.

### Chart

- `RevenueOrdersChart.tsx` nhận `analytics.series`, dùng Recharts `ComposedChart`: bar `gross_revenue`, line `orders_created`.
- `StatusStackedChart.tsx` dùng bar stack cho 5 trạng thái.
- Component tự phát hiện toàn bộ số liệu bằng 0 để render empty state.
- FE không tự suy ra doanh thu từ order; dùng trực tiếp summary/series backend trả.

### Click task/card

`ActionCard` và `StatCard` nhận `to`. Nếu có `to`, chúng render link đến route tương ứng. Query `status` hoặc `replied` sau đó được page đích đọc để lọc.

## 8. Sản phẩm và flash sale

File: `frontend/src/pages/SellerProducts.tsx`.

### Load dữ liệu

- `loadProducts()` → `sellerService.getProductsPage(query)` → `GET /seller/products` với page/limit/search/category/status/sort.
- `loadFlashSales()` → `GET /seller/flash-sales`.
- Danh mục → `sellerService.getCategories()` → `GET /seller/categories`.
- `useMemo` ghép flash sale đang chạy/sắp chạy vào đúng product.

### Bộ lọc

`updateQuery(updates)` cập nhật search params và thường reset page về 1. `searchDraft` tách khỏi search đã áp dụng để không request ở mỗi ký tự.

### Tạo và sửa

- `openCreate()` reset form và mở modal mode create.
- `openEdit(product)` map product, ảnh và default variant vào form.
- `getDefaultVariant(product)` lấy variant đầu/default. FE hiện không tạo ma trận multi-variant.

`handleSubmit(event)` thực hiện:

1. Trim name, categoryId, SKU và reason.
2. Convert price, stock, threshold sang number.
3. Validate field bắt buộc.
4. `price > 0` và hữu hạn.
5. Stock nguyên, `>= 0`.
6. SKU `/^[A-Z0-9._-]{3,100}$/`.
7. Threshold nguyên trong 0-1.000.000.
8. Có ít nhất một ảnh.
9. Nếu edit làm stock thay đổi, reason dài 3-255.
10. Tạo `SellerProductPayload` với number thật, không gửi chuỗi số.
11. Create → `POST /seller/products`; edit → `PUT /seller/products/:id`.
12. Thành công đóng modal và gọi lại `loadProducts()`.

### Ảnh

`ImageUploadField`:

- Chặn MIME ngoài JPG/PNG/WebP.
- Chặn file > 5 MB.
- Chặn vượt `maxImages`.
- Gọi `uploadService.uploadImage(file, purpose)` → `POST /uploads/images` dạng multipart.
- Nếu prop `uploadScope="application"`, gọi `uploadApplicationImage()` cho logo/cover trước khi có role seller.
- Upload nhiều file bằng Promise; thành công trả `url/publicId` cho form.
- `removeImage()` hiện chỉ bỏ ảnh khỏi state của form và sắp xếp lại ảnh chính; component chưa gọi `uploadService.deleteImage()`.
- Service đã có `DELETE /uploads/images` với `publicId`, nhưng chưa được nối vào thao tác bỏ ảnh. Khi mở rộng cần quyết định chỉ xóa file mới chưa lưu hay xóa cả file đang được product tham chiếu để tránh file rác hoặc xóa nhầm ảnh đang dùng.

### Xóa

`deleteProduct()` chỉ chạy sau confirm dialog → `DELETE /seller/products/:id` → đóng confirm → refetch.

### Flash sale

- `openFlashSale(product)` lấy giá gốc và đặt thời gian mặc định.
- `createFlashSale(event)` validate sale price/time, convert local datetime sang ISO rồi gọi `POST /seller/flash-sales`.
- `stopFlashSale(sale)` gọi `DELETE /seller/flash-sales/:id`, sau đó reload sale.
- Utility `isSaleRunning` và `isSaleUpcomingOrRunning` quyết định badge/nút hiện tại.

## 9. Kho hàng

### Page `SellerInventory.tsx`

Loader:

- `loadProducts()` → `GET /seller/products` để tạo danh sách variant cho filter/modal.
- `loadLowStock(page)` → `GET /seller/inventory/low-stock?page=&limit=20`.
- `loadLogs(query)` → `GET /seller/inventory/logs`.
- `refreshInventory()` gọi lại toàn bộ nguồn dữ liệu.

`applyFilters()` validate `from <= to`, sau đó copy draft sang query log và reset page. `resetFilters()` xóa query.

### `InventoryAdjustModal.tsx`

`handleSubmit()`:

- Convert quantity sang number.
- Kiểm tra integer và khác 0.
- Type restock yêu cầu số dương.
- Kiểm tra `currentStock + change >= 0`.
- Reason trim 3-255.
- Gọi `inventoryService.adjust(payload)` → `POST /seller/inventory/adjust`.
- Success gọi callback `onAdjusted`, page refetch dữ liệu.

### `StockThresholdEditor.tsx`

- `save()` convert threshold, validate integer 0-1.000.000.
- Gọi `PATCH /seller/products/:productId/variants/:variantId/stock-alert`.
- Success cập nhật/refetch theo callback.

### Error mapping

`utils/inventoryErrors.ts` map `error.data.code` như `INSUFFICIENT_STOCK`, `INVALID_CHANGE_QUANTITY`, `INVALID_LOW_STOCK_THRESHOLD` sang câu tiếng Việt ổn định.

## 10. Đơn hàng

File: `frontend/src/pages/SellerOrders.tsx`.

### Load và filter

- Page gọi `sellerService.getOrders()` → `GET /seller/orders`.
- `filteredOrders` dùng `useMemo` để lọc local theo query text và status lấy từ URL.
- Mỗi order chỉ giữ item khớp điều kiện; order rỗng bị loại khỏi kết quả.

### `ItemActions.updateStatus(nextStatus)`

Payload được xây theo action:

```ts
{
  fulfillmentStatus: nextStatus,
  trackingCode?: string | null,
  cancelReason?: string | null
}
```

Validation FE:

- Cancel yêu cầu `cancelReason.trim()` khác rỗng.
- Tracking code là optional, input max 100; chuỗi rỗng được đổi thành `null/undefined`.
- Cancel reason max 255.

API: `sellerService.updateOrderItem(item.id, payload)` → `PATCH /seller/orders/items/:itemId`.

Sau success:

- `handleItemUpdated(orderId, result)` cập nhật item tương ứng trong state.
- Nếu timeline order đang mở, gọi lại `loadTimeline(orderId)`.
- Nếu backend báo transition cũ/stale, callback `onRefresh` tải lại danh sách.

Error code được map trong `getUpdateErrorMessage()`: `INVALID_FULFILLMENT_STATUS`, `CANCEL_REASON_REQUIRED`, `ORDER_ITEM_NOT_FOUND`, `INVALID_FULFILLMENT_TRANSITION`.

### Timeline

`handleTimelineToggle(orderId)`:

- Nếu đang mở thì đóng.
- Nếu chưa có cache, gọi `GET /seller/orders/:orderId/timeline`.
- Lưu theo object `timelines[orderId]` để không gọi lại vô ích trong cùng phiên.

`utils/orderStatus.ts` là nguồn label/badge cho 5 trạng thái và hàm nhận biết trạng thái cuối.

## 11. Trả hàng

File: `frontend/src/pages/SellerReturns.tsx`.

### List

- `load()` đọc page/status/search từ URL.
- Gọi `returnService.getSellerReturns(query)` → `GET /seller/returns`.
- `updateQuery()` thay search params và reset page khi filter đổi.

### Detail

`openDetail(returnId)` → `GET /seller/returns/:returnId` → set `selected` và mở drawer.

### Action

`changeStatus(nextStatus)`:

- Nếu `rejected`, `sellerResponse.trim().length >= 3`.
- `accepted` cho phép phản hồi rỗng.
- `item_returned` dùng khi shop xác nhận đã nhận hàng.
- Gọi `PATCH /seller/returns/:returnId` với `{ status, sellerResponse }`.
- Sau success gọi lại detail và list; xóa draft response.

FE chỉ điều phối. Cộng kho, inventory log và notification sau `item_returned` là trách nhiệm backend.

## 12. Tài chính

File: `frontend/src/pages/SellerFinance.tsx`.

### Draft và applied query

- `draft` chứa filter người dùng đang nhập.
- `searchParams` chứa filter đã bấm Áp dụng.
- `useEffect` đồng bộ URL trở lại draft khi back/forward browser.

### `submitFilters()`

1. Kiểm tra from/to phải cùng có hoặc cùng rỗng.
2. Kiểm tra `from <= to`.
3. Dùng `getVietnamToday()` để chặn `to` trong tương lai.
4. Success gọi `updateQuery(...)`, reset page 1.

### Load

`load()` gọi song song:

- `financeService.getSummary({ from, to })` → `GET /seller/finance/summary`.
- `financeService.getTransactions({ page, limit: 20, status, search, from, to })` → `GET /seller/finance/transactions`.

Chỉ gửi from/to khi có đủ hai giá trị. Summary và transaction đều dựa trên cùng applied range, nên nhãn Khoảng đang xem lấy từ URL thay vì draft.

Trang này không có mutation; chưa có endpoint rút tiền ở FE.

## 13. Đánh giá

File: `frontend/src/pages/SellerReviews.tsx`.

### Load

`loadReviews()` → `reviewService.getSellerReviews({ rating, replied, page, limit: 10 })` → `GET /seller/reviews`.

- Rating rỗng không gửi query.
- `replied=all` được đổi thành `undefined`.
- Query `replied=false` từ Dashboard được đọc khi page mount.

### Reply

Trong `SellerReviewRow`, `submitReply(event)`:

- Trim reply.
- Chặn rỗng.
- Chặn > 2.000 ký tự.
- Gọi `reviewService.replyToReview(review.id, reply)` → `PUT /seller/reviews/:reviewId/reply`.
- Success thoát edit mode và gọi `onReplied()` để refetch list.

`utils/reviewErrors.ts` map các code review của backend sang message FE.

## 14. Voucher

### Page và tab

File `SellerVouchers.tsx` đọc `tab` từ URL:

- `management` render quản lý voucher.
- `performance` render `VoucherStatsPanel`.

`changeTab(tab)` cập nhật URL, xóa lỗi và giữ đúng màn sau refresh.

### Quản lý voucher

`fetchCoupons()` → `GET /seller/coupons`.

`validateForm()` kiểm tra:

- Code khác rỗng.
- Discount value > 0.
- Percentage <= 100.
- Usage limit nếu nhập > 0.
- Có startsAt/expiresAt.
- Start < end.
- End không trước minimum datetime của form.

`createCoupon(event)` convert chuỗi số thành number, datetime local thành ISO, rồi gọi `POST /seller/coupons`. Success thêm/tải lại list, reset form và tăng `statsRefreshKey` để tab Hiệu quả refetch.

`toggleCoupon(coupon)` → `PATCH /seller/coupons/:id` với `isActive`; success cập nhật coupon trong state.

`updateDates(coupon)` validate rồi → `PATCH /seller/coupons/:id` với `startsAt/expiresAt` ISO.

`deleteCoupon(coupon)` sau confirm → `DELETE /seller/coupons/:id` → remove khỏi state và refresh stats key.

### `DateTimePicker.tsx`

- Nhận/emit chuỗi local `YYYY-MM-DDTHH:mm`.
- Tự parse ngày, chọn ngày, giờ và phút.
- Áp dụng `min` để không chọn trước mốc cho phép.
- Đóng khi click ngoài hoặc nhấn Escape.
- Page chịu trách nhiệm convert sang `new Date(value).toISOString()` trước API.

### Hiệu quả voucher

`VoucherStatsPanel` giữ `draft` và `query` riêng.

- `useEffect([query, refreshKey])` gọi `GET /seller/coupons/stats`.
- `applyFilters()` kiểm tra đủ from/to và `from <= to`, rồi set query page 1.
- `resetFilters()` trả default sort `redemptions desc`.
- `changePage()` chỉ đổi page trong query.
- `UsageCell` clamp usage rate vào 0-100; null nghĩa voucher không giới hạn.

## 15. Hộp thư realtime

File: `frontend/src/pages/SellerInbox.tsx`.

### Khởi tạo

1. Lấy user từ AuthContext.
2. `socketService.connect()` đọc token và kết nối WebSocket.
3. `loadChats()` gọi `GET /chat/recent`.
4. `filterSellerChats()` loại conversation tự chat và metadata shop không phù hợp.
5. `sortChats()` ưu tiên unread, sau đó mới nhất.

### Mở chat

`openChat(partner)`:

- Set active chat.
- `GET /chat/history/:partnerId`.
- `POST /chat/read/:partnerId`.
- Set unread của partner về 0.
- Phát `seller-unread-changed` để sidebar cập nhật.

`partnerId` là `user_id` của customer đối diện, không phải `seller_id`.

### Gửi tin

`handleSend()`:

1. Trim text, kiểm tra active partner và current user.
2. Gọi `socketService.sendMessage(receiverId, messageText)`.
3. Nếu socket nhận gửi, thêm message optimistic có id `pending_*`.
4. Xóa input và scroll cuối.
5. Sự kiện `messageSent` thay optimistic message bằng row thật từ server.

`handleKeyDown`: Enter gửi, Shift+Enter xuống dòng.

### Nhận tin và unread

- `receiveMessage` xác định partner từ sender/receiver.
- Nếu đúng chat đang mở, append message và giữ unread 0.
- Nếu chat khác, tăng unread, cập nhật preview và đưa conversation lên đầu.
- `chatUnreadUpdated` đồng bộ badge/count từ server cho receiver.
- Cleanup effect gọi `offReceiveMessage`, `offMessageSent`, `offChatUnreadUpdated` và disconnect khi unmount phù hợp.

## 16. Hồ sơ shop

File: `frontend/src/pages/SellerProfile.tsx`.

### Load

Effect mount → `sellerService.getSellerProfile()` → `GET /seller/profile` → map field snake_case sang form camelCase.

### Input

- `update(key, value)` cập nhật form và xóa lỗi.
- Phone/CCCD/account được giới hạn chữ số và độ dài ở input handler.
- `setLogo()` và `setCover()` nhận mảng ảnh từ `ImageUploadField`, lấy ảnh đầu làm URL.

### `save(event)`

- Field required: shopName, shopPhone, shopAddress.
- Dùng ba validator trong `sellerValidation.ts`.
- Gọi `sellerService.updateSellerProfile(form)` → `PUT /seller/profile`.
- Success map seller response về form và hiện thông báo thành công.
- Error ưu tiên message API.

## 17. Public shop và follow liên quan seller

File: `frontend/src/pages/ShopPublic.tsx`.

- Load shop → `sellerService.getPublicShop(sellerId)` → `GET /seller/shops/:sellerId`.
- Nếu đã login, load follow status → `GET /shops/:shopId/follow-status`.
- `handleFollow()` chọn:
  - chưa follow → `POST /shops/:shopId/follow`;
  - đang follow → `DELETE /shops/:shopId/follow`.
- Response cập nhật `isFollowing` và `followerCount` local.
- Backend tạo notification `new_follower`; NotificationBell của seller hiển thị ở lần poll tiếp theo.
- `shopFollowService.getSellerStats()` đã có endpoint `GET /seller/followers/stats`, nhưng Dashboard hiện chưa gọi nên chưa có widget thống kê follower.

## 18. Validation FE và BE

Nguyên tắc trong code hiện tại:

```txt
User nhập
-> FE kiểm tra format/rule đơn giản
-> hợp lệ mới gọi service
-> backend kiểm tra lại ownership, transaction và business rule
-> lỗi có code/message
-> API interceptor chuẩn hóa
-> page map code hoặc hiển thị message
```

FE validation giúp phản hồi nhanh, nhưng không phải lớp bảo mật. Không bỏ backend validation chỉ vì input đã có `required`, `min`, regex hoặc TypeScript.

## 19. Những điểm cần nhớ khi debug

1. Kiểm tra URL/query trước, vì nhiều loader phụ thuộc `searchParams`.
2. Kiểm tra `ecom_token` và user role nếu bị redirect khỏi `/seller`.
3. Đặt breakpoint ở handler click/submit của page.
4. Step vào service để xác nhận endpoint và payload.
5. Xem Network để kiểm tra status, `data.code` và response thực.
6. Nếu UI không đổi sau mutation, kiểm tra callback refetch hoặc local state update.
7. Với chat, kiểm tra cả REST history/recent và ba socket event `receiveMessage`, `messageSent`, `chatUnreadUpdated`.
8. Với chart, kiểm tra `analytics.series`; chart không tự lấy dữ liệu từ order list.
9. Với datetime, xem giá trị local trước và ISO sau `toISOString()`.
10. Với lỗi 403/409 checkout liên quan seller, phải kiểm tra đúng code `OWN_SHOP_PURCHASE_NOT_ALLOWED` hoặc `PRICE_CHANGED`, không xử lý theo status chung.
11. Với onboarding, kiểm tra `GET /seller/application` trước khi xem role local; role customer vẫn là đúng trong lúc pending.
12. Sau khi Admin duyệt, phải gọi `AuthContext.refreshUser()`, không sửa `ecom_user.role` thủ công.

## 20. Giới hạn FE hiện tại cần biết khi mở rộng

- Product UI chỉ dùng default variant.
- Seller Orders đang lọc danh sách đã tải ở FE, chưa dùng pagination server trong page hiện tại.
- Finance chỉ đọc, chưa có mutation payout/withdrawal.
- Shipping code/label chưa có workflow tự động; tracking code đang optional.
- Follower stats service chưa được gắn Dashboard.
- Notification dùng polling 30 giây; chat mới là realtime socket.
- Address chưa có map/provider adapter.
- Voucher Stats chưa chặn ngày tương lai ở component riêng; nếu backend từ chối, page hiển thị message API.
- Nút bỏ ảnh chỉ cập nhật form; cleanup file đã upload nhưng không còn được lưu chưa được tự động gọi.
- API interceptor có fallback message cũ cần giữ UTF-8 đúng khi chỉnh sửa để tránh lỗi font.
- Backend chưa trả `rejectionReason`; màn rejected hiện chỉ có thông báo chung và yêu cầu nhập lại dữ liệu.
- Admin approve/reject/suspend/reactivate không thuộc FE Seller; tài liệu tích hợp Admin quy định riêng contract này.
