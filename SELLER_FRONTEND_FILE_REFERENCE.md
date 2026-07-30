# Seller Frontend File Reference

Tài liệu này là bản đồ mã nguồn Frontend cho role Seller. Mục tiêu là giúp intern trả lời được bốn câu hỏi khi đọc hoặc debug code:

1. Dữ liệu bắt đầu từ đâu và đi qua những lớp nào?
2. Context, props và callback truyền dữ liệu như thế nào?
3. Mỗi file giữ state gì, có method nào và gọi API nào?
4. Sau khi API thành công hoặc thất bại, màn hình cập nhật ra sao?

Phạm vi tài liệu dừng ở endpoint API. Logic SQL, transaction và authorization phía Backend không được phân tích tại đây.

---

## 1. Luồng Frontend tổng quát

### 1.1 Sơ đồ khởi động ứng dụng

```txt
frontend/src/main.tsx
  -> render <App /> trong React.StrictMode

frontend/src/App.tsx
  -> <AppProviders>
       -> ThemeProvider
       -> AuthProvider
       -> CartProvider
  -> <BrowserRouter>
       -> <AppRoutes />

frontend/src/routes/AppRoutes.tsx
  -> lazy-load page
  -> kiểm tra route guard
  -> chọn layout
  -> render page qua <Outlet />
```

`StrictMode` có thể làm effect chạy lại trong môi trường development để phát hiện side effect không an toàn. Vì vậy các effect đăng ký timer, DOM event hoặc socket event phải luôn có hàm cleanup.

### 1.2 Luồng tương tác chuẩn

```txt
Seller click / nhập dữ liệu
  -> event handler trong page hoặc feature component
  -> FE validation
  -> gọi service function
  -> Axios request interceptor gắn JWT
  -> gọi endpoint Backend
  -> service bóc data cần dùng
  -> page cập nhật state hoặc refetch
  -> React render lại component con bằng props mới
```

Khi thất bại:

```txt
API trả lỗi
  -> Axios response interceptor chuẩn hóa lỗi
  -> service throw lỗi lên caller
  -> page/component catch lỗi
  -> utility map error code nếu có
  -> setError(...)
  -> giao diện hiển thị SellerStatePanel hoặc thông báo tại form
```

### 1.3 Nguyên tắc phân lớp hiện tại

| Lớp               | Trách nhiệm                                                   | Không nên làm                              |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Context           | State toàn ứng dụng như user, cart, theme                     | Không chứa logic riêng của một page seller |
| Route/Guard       | Chọn page, kiểm tra login và role                             | Không gọi nghiệp vụ seller                 |
| Layout            | Khung điều hướng, sidebar, notification, unread badge         | Không xử lý form sản phẩm/đơn hàng         |
| Page              | Giữ state màn hình, điều phối callback, validation và refetch | Không tự cấu hình Axios                    |
| Feature component | Xử lý một UI workflow con qua props                           | Không sở hữu toàn bộ state của page        |
| Service           | Tạo request, truyền params/body, bóc response                 | Không điều hướng route hoặc hiển thị UI    |
| Utility           | Rule thuần, mapping error/status                              | Không gọi API                              |
| Types             | Contract TypeScript                                           | Không chứa runtime logic                   |

---

## 2. Context, props và service phối hợp như thế nào

### 2.1 Context truyền từ trên xuống

`AppProviders` bọc toàn bộ router theo thứ tự:

```txt
ThemeProvider
  AuthProvider
    CartProvider
      BrowserRouter / AppRoutes / Pages
```

Hệ quả:

- Mọi page có thể đọc theme và auth.
- `CartProvider` có thể đọc `AuthContext` để tách giỏ hàng theo `user.id`.
- `SellerRoute`, `SellerLayout`, `SellerDashboard`, `SellerInbox`, `BecomeSeller` và `ShopPublic` đọc `AuthContext` trực tiếp.
- Page seller không nhận `user` qua nhiều tầng props; user được lấy từ context tại nơi cần dùng.

### 2.2 Props truyền từ page xuống component

Các feature component chủ yếu là controlled component:

```tsx
<AnalyticsPeriodFilter
  period={period}
  from={fromDraft}
  to={toDraft}
  onPeriodChange={handlePeriodChange}
  onFromChange={setFromDraft}
  onToChange={setToDraft}
  onApply={handleApplyRange}
/>
```

Quy ước:

- Page cha sở hữu state thật.
- Component con nhận `value` hoặc object dữ liệu qua props.
- Khi người dùng thao tác, component con gọi `onChange`, `onUpdated`, `onAdjusted`, `onConfirm` hoặc `onPageChange`.
- Page cha quyết định cập nhật state cục bộ hay gọi lại API.
- Callback có thể trả `Promise<void>` khi component con phải chờ cha refetch xong.

### 2.3 Service là ranh giới FE và BE

Page không gọi `axios` trực tiếp. Ví dụ:

```txt
SellerProducts.handleSubmit()
  -> sellerService.createProduct(payload)
  -> API.post('/seller/products', payload)
  -> request interceptor thêm Bearer token
  -> response interceptor trả response.data
  -> sellerService lấy product từ response
  -> SellerProducts đóng modal và loadProducts()
```

`frontend/src/services/api.ts` đang chuẩn hóa lỗi thành:

```ts
{
  message?: string;
  status?: number;
  data?: {
    code?: string;
    message?: string;
  };
}
```

Vì vậy code FE nên ưu tiên `error.data.code` cho nghiệp vụ và dùng `error.data.message || error.message` làm nội dung dự phòng.

### 2.4 URL là một phần của state danh sách

Các page sản phẩm, trả hàng, tài chính và review dùng `useSearchParams`.

```txt
filter/page trên URL thay đổi
  -> component render lại
  -> useCallback tạo query mới
  -> useEffect gọi load()
  -> refresh trang vẫn giữ filter hiện tại
```

Draft state và applied state được tách riêng ở những màn cần nút `Áp dụng`. Người dùng có thể sửa input mà chưa làm request cho tới khi submit filter.

### 2.5 REST và Socket trong chat

```txt
REST
  GET recent       -> dựng danh sách hội thoại
  GET history      -> khôi phục tin nhắn từ DB
  POST read        -> đánh dấu đã đọc

Socket.IO
  receiveMessage   -> nhận tin đối phương
  messageSent      -> nhận bản tin server xác nhận đã gửi
  chatUnreadUpdated-> cập nhật unread từng partner và tổng unread
```

REST bảo đảm dữ liệu tồn tại sau khi đóng/mở lại. Socket chỉ phụ trách cập nhật realtime.

---

## 3. Nhóm file khởi động, route và context

### 3.1 `frontend/src/main.tsx`

Vai trò:

- Tìm DOM node `#root`.
- Mount `<App />` bằng `createRoot`.
- Bọc `StrictMode` để phát hiện side effect không an toàn khi development.
- Import `index.css` một lần cho toàn ứng dụng.

File này không chứa route, context hoặc logic seller.

### 3.2 `frontend/src/App.tsx`

Vai trò:

- Ghép `AppProviders`, `BrowserRouter` và `AppRoutes`.
- Là composition root của FE.

Luồng component:

```txt
AppProviders(children = BrowserRouter)
  -> BrowserRouter(children = AppRoutes)
```

### 3.3 `frontend/src/app/AppProviders.tsx`

Props:

| Prop       | Kiểu        | Ý nghĩa              |
| ---------- | ----------- | -------------------- |
| `children` | `ReactNode` | Toàn bộ cây ứng dụng |

Method: không có handler nghiệp vụ. Component chỉ ghép `ThemeProvider -> AuthProvider -> CartProvider`.

### 3.4 `frontend/src/routes/AppRoutes.tsx`

Method chính: `AppRoutes()`.

Vai trò:

- `lazy()` từng page để giảm bundle tải ban đầu.
- `Suspense` dùng `PageLoader` trong lúc tải chunk.
- `AnimatePresence` giữ animation khi đổi URL.
- Toàn bộ `/seller/*` nằm trong `SellerRoute`.
- `/seller` tự chuyển tới `/seller/dashboard`.
- Các page seller dùng chung `SellerDashboardLayout`.

Route seller:

| URL                 | Page              |
| ------------------- | ----------------- |
| `/seller/dashboard` | `SellerDashboard` |
| `/seller/products`  | `SellerProducts`  |
| `/seller/inventory` | `SellerInventory` |
| `/seller/orders`    | `SellerOrders`    |
| `/seller/returns`   | `SellerReturns`   |
| `/seller/finance`   | `SellerFinance`   |
| `/seller/reviews`   | `SellerReviews`   |
| `/seller/vouchers`  | `SellerVouchers`  |
| `/seller/inbox`     | `SellerInbox`     |
| `/seller/profile`   | `SellerProfile`   |

Route liên quan seller ngoài dashboard:

- `/become-seller`: onboarding, yêu cầu đăng nhập.
- `/shops/:id`: shop công khai cho customer.

### 3.5 `frontend/src/routes/RouteGuards.tsx`

#### `PageLoader()`

Hiển thị loading chung khi auth hoặc lazy page chưa sẵn sàng.

#### `ProtectedRoute()`

```txt
AuthContext chưa sẵn sàng -> PageLoader
đã login                  -> Outlet
chưa login                -> /login
```

#### `SellerRoute()`

```txt
AuthContext đang loading -> PageLoader
chưa login               -> /login
role khác seller         -> /become-seller
role seller              -> GET /seller/application
application active       -> Outlet
application khác active  -> /become-seller
lỗi xác minh              -> màn lỗi có nút Thử lại
```

Guard chỉ cải thiện UX. Backend vẫn phải kiểm tra JWT, role và quyền sở hữu shop.

### 3.6 `frontend/src/routes/RouteLayouts.tsx`

| Component               | Vai trò                                               |
| ----------------------- | ----------------------------------------------------- |
| `StorefrontLayout`      | Header, Outlet, Footer, AI chat và customer live chat |
| `AuthLayout`            | Khung trang login/register                            |
| `FullPageLayout`        | Trang độc lập như payment return                      |
| `SellerDashboardLayout` | Bọc Outlet bằng `SellerLayout`                        |

`SellerDashboardLayout` truyền `<Outlet />` vào prop `children` của `SellerLayout`.

### 3.7 `frontend/src/context/AuthContext.tsx`

Context value theo `AuthContextType`:

| Field/method               | Vai trò                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `user`                     | User hiện tại hoặc `null`                                            |
| `isAuthenticated`          | Suy ra bằng `!!user`                                                 |
| `loading`                  | Đang restore/login/register                                          |
| `login(email, password)`   | Gọi login thường và lưu user vào state                               |
| `loginWithGoogle(idToken)` | Gọi Google login và lưu user                                         |
| `register(...)`            | Đăng ký tài khoản thường                                             |
| `logout()`                 | Ngắt socket, xóa session qua service, set user null                  |
| `updateUser(updatedUser)`  | Ghi `ecom_user` và cập nhật React state                              |
| `refreshUser()`            | Gọi `/auth/me`, đồng bộ role thật từ DB vào Context và local storage |

Effect khởi tạo:

1. Đọc `ecom_token` và user đã lưu.
2. Đặt user tạm thời từ local storage.
3. Với token thật, gọi `authService.getProfile()` để đồng bộ server.
4. Nếu token hết hạn, logout và disconnect socket.

`BecomeSeller` không tự gọi `updateUser()` sau khi gửi hồ sơ. Trong thời gian `pending`, role vẫn là customer. Khi API hồ sơ trả `active`, page gọi `refreshUser()` rồi mới chuyển vào Seller Dashboard.

### 3.8 `frontend/src/context/CartContext.tsx`

Đây là context customer nhưng ảnh hưởng trực tiếp tới seller vì ngăn rò giỏ hàng giữa tài khoản.

State chính:

- `cartItems`.
- `appliedCoupons` theo `sellerId`.
- `hydratedOwnerId` để tránh ghi nhầm state cũ sang user mới.

Storage key:

```txt
cart:<userId>
cart_coupons:<userId>
cart:guest
cart_coupons:guest
```

Method quan trọng:

| Method                | Vai trò                                                    |
| --------------------- | ---------------------------------------------------------- |
| `addToCart()`         | Thêm/tăng sản phẩm, xóa voucher của shop nếu cart thay đổi |
| `removeFromCart()`    | Xóa item và voucher liên quan                              |
| `updateQuantity()`    | Thay số lượng, tối thiểu 1                                 |
| `clearCart()`         | Xóa item và voucher của owner hiện tại                     |
| `applyDiscount()`     | Gọi validate coupon với item đúng shop                     |
| `refreshCartPrices()` | Gọi lại product API, cập nhật giá/stock và xóa item 404    |

`CartProvider` phụ thuộc `AuthContext.user.id`; khi đổi tài khoản, nó nạp đúng giỏ của owner mới và không merge tự động giỏ tài khoản trước.

---

## 4. Layout và component dùng chung của Seller

### 4.1 `frontend/src/components/seller/SellerLayout.tsx`

Props:

| Prop       | Kiểu        | Ý nghĩa                           |
| ---------- | ----------- | --------------------------------- |
| `children` | `ReactNode` | Page seller được render từ Outlet |

Context: đọc `AuthContext` để hiển thị tên seller và truyền `user` cho `NotificationBell`.

Logic:

- Khai báo `navItems` cho toàn bộ sidebar seller.
- `loadUnread()` gọi `chatService.getRecentChats()` rồi cộng `unread_count`.
- Poll unread mỗi 30 giây.
- Nghe custom event `seller-unread-changed` do `SellerInbox` phát ra.
- Cleanup timer và event listener khi unmount.
- Nút Home gọi `navigate('/')`.

### 4.2 `frontend/src/components/seller/SellerPageHeader.tsx`

Props:

| Prop          | Kiểu         | Bắt buộc | Ý nghĩa                     |
| ------------- | ------------ | -------- | --------------------------- |
| `title`       | `string`     | Có       | Tiêu đề page                |
| `description` | `string`     | Có       | Mô tả ngắn                  |
| `icon`        | `LucideIcon` | Không    | Icon đầu trang              |
| `eyebrow`     | `string`     | Không    | Nhãn nhóm                   |
| `actions`     | `ReactNode`  | Không    | Nút hoặc thông tin góc phải |

Không có state và không gọi service.

### 4.3 `frontend/src/components/seller/SellerFilterBar.tsx`

Props: `children`, `onSubmit?`, `className?`, `ariaLabel?`.

Component tự `preventDefault()` rồi gọi `onSubmit`. Input và draft state vẫn do page cha quản lý.

### 4.4 `frontend/src/components/seller/SellerPagination.tsx`

Props: `page`, `totalPages`, `total`, `label?`, `loading?`, `onPageChange`.

Logic:

- Không render nếu chỉ có một trang.
- Disable nút trước/sau ở biên hoặc khi loading.
- Chỉ phát page mới qua `onPageChange`; page cha chịu trách nhiệm đổi URL/query và gọi API.

### 4.5 `frontend/src/components/seller/SellerConfirmDialog.tsx`

Props: `open`, `title`, `description`, `confirmLabel`, `busy?`, `tone?`, `onCancel`, `onConfirm`.

Logic:

- `open=false` trả `null`.
- `busy=true` khóa nút.
- `tone` chọn màu cảnh báo hoặc nguy hiểm.
- Không tự xóa dữ liệu; chỉ gọi callback cha.

### 4.6 `frontend/src/components/seller/SellerStatePanel.tsx`

Props: `state`, `title?`, `description?`, `icon?`, `actionLabel?`, `onAction?`, `compact?`.

Ba state chuẩn: `loading`, `empty`, `error`. Khi có `actionLabel` và `onAction`, panel trở thành retry/empty action.

### 4.7 `frontend/src/components/seller/SellerTabs.tsx`

Generic props:

```ts
value: T;
tabs: readonly SellerTab<T>[];
onChange: (value: T) => void;
ariaLabel: string;
```

Mỗi tab có `value`, `label`, `icon?`, `count?`. Component không tự đổi URL; nó phát tab mới cho page.

### 4.8 `frontend/src/components/seller/SellerTableViewport.tsx`

Props: `children`, `minWidthClass?`, `ariaLabel?`.

Bọc table trong vùng cuộn ngang có thể focus. Dùng cho inventory, return, finance và voucher stats.

### 4.9 `frontend/src/components/common/NotificationBell.tsx`

Props:

```ts
user: User;
panelAlign?: 'left' | 'right';
```

State: `open`, `loading`, `notifications`, `unreadCount`.

Method:

| Method                   | Xử lý                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| `load(silent)`           | GET 8 notification mới, cập nhật list và unread                            |
| `openNotification(item)` | Mark read nếu cần, đóng panel, điều hướng theo type/role                   |
| `markAllRead()`          | Mark tất cả và đưa badge về 0                                              |
| `getTarget()`            | Map notification seller tới inbox/review/return/inventory/dashboard/orders |

Effect poll mỗi 30 giây khi tab trình duyệt đang visible. Effect khác đóng panel khi click ngoài.

Endpoint:

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

### 4.10 `frontend/src/components/common/ImageUploadField.tsx`

Props:

```ts
label: string;
purpose: 'product' | 'shop_logo' | 'shop_cover';
images: ProductImage[];
onChange: (images: ProductImage[]) => void;
maxImages?: number;
disabled?: boolean;
  aspect?: 'square' | 'cover' | 'product';
  uploadScope?: 'seller' | 'application';
```

Method:

- `uploadFiles()`: giới hạn JPG/PNG/WebP, tối đa 5 MB, không vượt `maxImages`, upload song song rồi gọi `onChange`.
- `removeImage()`: xóa khỏi state form, sắp lại `sortOrder`, bảo đảm còn ảnh primary.
- `setPrimary()`: đánh dấu đúng một ảnh primary.

Endpoint theo scope:

- Mặc định `seller`: `POST /uploads/images` qua `uploadService.uploadImage()`.
- `application`: `POST /seller/application/uploads/images` cho logo/cover trước khi được duyệt.

Khi `uploadScope="application"`, `removeImage()` gọi API xóa ảnh application trước khi bỏ khỏi form. Với scope seller hiện tại, component vẫn chỉ bỏ ảnh khỏi state để tránh xóa nhầm ảnh đang được product/profile tham chiếu.

### 4.11 `frontend/src/components/common/DateTimePicker.tsx`

Props: `label?`, `value`, `onChange`, `min?`, `disabled?`, `compact?`, `align?`, `placement?`.

Method:

- `parseInputValue()` và `toInputValue()` chuyển đổi `YYYY-MM-DDTHH:mm`.
- `updatePosition()` đặt popover theo viewport, trigger và mobile breakpoint.
- `commit()` ép giá trị không nhỏ hơn `min` rồi gọi `onChange`.
- `selectDay()` giữ giờ/phút hiện tại khi đổi ngày.
- `updateTime()` đổi giờ hoặc phút.
- `isDayDisabled()` khóa ngày trước `min`.

Popover được render bằng portal; có cleanup click ngoài, Escape, resize và scroll listener.

---

## 5. Page Seller và method riêng

### 5.1 `frontend/src/pages/BecomeSeller.tsx`

Vai trò: gửi và theo dõi hồ sơ mở cửa hàng.

Context: `AuthContext` để gọi `refreshUser()` sau khi Admin đã duyệt.

State:

- `form`: tên shop, SĐT, địa chỉ, mô tả, logo, cover, pickup, định danh và ngân hàng.
- `checkingApplication`, `applicationError`: trạng thái request kiểm tra hồ sơ ban đầu.
- `application`: `null | pending | rejected | suspended | active`.
- `loading`, `error`: submit form và lỗi nghiệp vụ.

Method:

| Method              | Xử lý                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| `handleChange()`    | Ghi input text vào `form`                                                 |
| `loadApplication()` | GET trạng thái, điều hướng nếu active, dùng lại cho nút refresh/focus     |
| `handleSubmit()`    | Validate, gọi register rồi refetch application thật; không đổi token/role |

FE validation:

- Bắt buộc tên shop, SĐT, địa chỉ.
- SĐT đúng 10 số và bắt đầu bằng 0.
- CCCD nếu nhập phải đủ 12 số.
- STK nếu nhập phải 6-20 số.

Endpoint:

- `GET /seller/application`.
- `POST /seller/register`.
- `POST/DELETE /seller/application/uploads/images` qua `ImageUploadField`.

State machine:

```txt
null -> form
pending -> chờ duyệt
rejected -> form gửi lại
suspended -> khóa thao tác
active -> refreshUser -> dashboard
```

### 5.2 `frontend/src/pages/SellerDashboard.tsx`

Vai trò: tổng quan vận hành, việc cần làm, KPI và biểu đồ.

Context: đọc `AuthContext.user` để chào seller.

State chia thành ba nguồn độc lập:

- `stats`: tổng sản phẩm, doanh thu, đơn, top product.
- `actionStats`: đơn cần xử lý, đơn trễ, unread, hết hàng, review, return.
- `analytics`: summary và series biểu đồ.
- Filter analytics: `period`, `fromDraft`, `toDraft`, `appliedRange`.
- Loading riêng cho stats/actions/analytics và `analyticsError` riêng.

Method:

| Method                 | Endpoint/hiệu ứng                                  |
| ---------------------- | -------------------------------------------------- |
| `loadStats()`          | GET `/seller/dashboard-stats`                      |
| `loadActionStats()`    | GET `/seller/dashboard-tasks`                      |
| `loadAnalytics()`      | GET `/seller/dashboard-analytics` với period/range |
| `handlePeriodChange()` | Đổi day/month/year và reset custom range           |
| `handleApplyRange()`   | Chạy `getRangeError`, chỉ apply khi hợp lệ         |
| `handleResetRange()`   | Quay về khoảng mặc định của BE                     |
| `handleRefresh()`      | Chạy đồng thời cả ba request                       |

`getRangeError()` kiểm tra đủ from/to, from <= to và giới hạn 366 ngày, 60 tháng, 10 năm.

Component con:

- `AnalyticsPeriodFilter`: nhận filter state/callback.
- `RevenueOrdersChart`: nhận `analytics.series`.
- `StatusStackedChart`: nhận `analytics.series`.
- `StatCard`, `ActionCard`, `AnalyticsKpis`: component cục bộ chỉ trình bày dữ liệu và link.

### 5.3 `frontend/src/pages/SellerProducts.tsx`

Vai trò: danh sách, tạo/sửa/xóa sản phẩm, stock cơ bản và flash sale.

State nhóm danh sách:

- Filter từ URL: `page`, `search`, `categoryId`, `status`, `sort`.
- `searchDraft`, `products`, `pagination`, `categories`, `loading`, `error`.
- `flashSales` và map `saleByProduct`.

State nhóm modal:

- Product: `showModal`, `editProduct`, `form`, `submitting`.
- Delete: `deleteTarget`, `deleting`.
- Inventory: `adjustTarget`.
- Flash sale: `flashTarget`, `flashForm`, `flashSubmitting`, `stoppingSaleId`.

Method:

| Method                   | Xử lý                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `updateQuery()`          | Ghi filter/page vào URL                                            |
| `loadProducts()`         | GET page sản phẩm theo filter                                      |
| `loadFlashSales()`       | GET flash sale, fallback mảng rỗng nếu request lỗi                 |
| `openCreate()`           | Reset form và mở modal create                                      |
| `openEdit(product)`      | Map dữ liệu product vào form edit                                  |
| `handleSubmit()`         | Validate, build `SellerProductPayload`, gọi create/update, refetch |
| `deleteProduct()`        | DELETE product được xác nhận, refetch list                         |
| `openFlashSale(product)` | Gắn target và giá/thời gian mặc định                               |
| `createFlashSale()`      | Validate giá và thời gian, POST flash sale, refetch                |
| `stopFlashSale(sale)`    | DELETE flash sale rồi refetch                                      |

FE validation product:

- Tên, category, SKU bắt buộc.
- Giá phải hữu hạn và > 0.
- Stock và threshold phải là số nguyên không âm.
- Phải có ảnh sản phẩm.
- Khi edit làm thay đổi stock, yêu cầu `stockReason`.

FE validation flash sale:

- Sale price > 0 và nhỏ hơn original price.
- Có start/end và start < end.
- End phải lớn hơn thời điểm hiện tại.

Endpoint:

- `GET /seller/products`
- `GET /seller/categories`
- `POST /seller/products`
- `PUT /seller/products/:id`
- `DELETE /seller/products/:id`
- `GET|POST /seller/flash-sales`
- `DELETE /seller/flash-sales/:id`

Component cục bộ:

- `IconButton`: icon command với tooltip/disabled.
- `ModalShell`: khung modal và callback close.
- `TextField`: input controlled nhận value/onChange.

### 5.4 `frontend/src/pages/SellerInventory.tsx`

Vai trò: tab sắp hết hàng và lịch sử kho.

State:

- `activeTab`: `low-stock` hoặc `logs`.
- `products`, `lowStock`, `logs`.
- Pagination riêng cho hai tab.
- Loading riêng theo nguồn.
- `filterDraft` và `filters` cho log.
- `adjustTarget`, `error`, `success`.

Method:

| Method                  | Xử lý                                                     |
| ----------------------- | --------------------------------------------------------- |
| `loadProducts()`        | Lấy product/variant để dựng lựa chọn filter               |
| `loadLowStock(page)`    | GET low-stock                                             |
| `loadLogs(page, query)` | GET inventory logs                                        |
| `refreshInventory()`    | Refetch products, low-stock và logs                       |
| `openAdjust(variant)`   | Chuyển variant thành `InventoryVariantTarget` và mở modal |
| `applyFilters()`        | Validate date rồi áp filter, về page 1                    |
| `resetFilters()`        | Xóa filter log                                            |

Endpoint:

- `GET /seller/products`
- `GET /seller/inventory/low-stock`
- `GET /seller/inventory/logs`

Mutation được giao cho `InventoryAdjustModal` và `StockThresholdEditor`; callback của hai component sẽ refetch dữ liệu cha.

### 5.5 `frontend/src/pages/SellerOrders.tsx`

Vai trò: xem và chuyển trạng thái từng order item thuộc shop.

Component cục bộ `ItemActions` nhận:

```ts
item: SellerOrderItem;
onUpdated: (result) => void | Promise<void>;
onRefresh: () => void | Promise<void>;
```

State trong `ItemActions`: `loadingStatus`, `cancelReason`, `trackingCode`, `errorMessage`.

`updateStatus(nextStatus)`:

1. Validate lý do khi hủy.
2. Với shipping, tracking code được gửi dạng chuỗi hoặc `null`; hiện FE cho phép để trống do shipping integration chưa hoàn tất.
3. Gọi `sellerService.updateOrderItem()`.
4. Gọi `onUpdated(result)` để cha cập nhật/refetch.
5. Map error code bằng `getUpdateErrorMessage()`.

State page:

- `orders`, `loading`, `errorMessage`.
- Filter cục bộ `query`, `status`.
- Timeline: `timelineOrderId`, `timeline`, `timelineLoading`, `timelineError`.

Method page:

| Method                               | Xử lý                                            |
| ------------------------------------ | ------------------------------------------------ |
| `fetchOrders()`                      | GET `/seller/orders`                             |
| `loadTimeline(orderId)`              | GET timeline của order                           |
| `handleTimelineToggle(orderId)`      | Mở/đóng và lazy-load timeline                    |
| `handleItemUpdated(orderId, result)` | Đồng bộ item, refetch order và timeline đang mở  |
| `filteredOrders`                     | `useMemo` lọc theo từ khóa và fulfillment status |

Trạng thái hợp lệ FE:

```txt
pending_fulfillment -> ready_to_ship | cancelled
ready_to_ship       -> shipping | cancelled
shipping            -> delivered
delivered/cancelled -> không có nút chuyển tiếp
```

### 5.6 `frontend/src/pages/SellerReturns.tsx`

Vai trò: list, detail và xử lý yêu cầu trả hàng.

URL state: `page`, `status`, `search`.

State: `searchDraft`, `returns`, `pagination`, loading list/detail/action, `selected`, `sellerResponse`, `error`.

Method:

| Method                     | Xử lý                                                   |
| -------------------------- | ------------------------------------------------------- |
| `updateQuery()`            | Ghi filter/page vào URL                                 |
| `load()`                   | GET list return của seller                              |
| `openDetail(returnId)`     | GET detail và history, mở drawer                        |
| `changeStatus(nextStatus)` | Validate phản hồi, PATCH status, lấy lại detail và list |
| `resultLabel`              | `useMemo` map trạng thái selected sang nội dung         |

Status gửi lên API:

```txt
accepted      -> response approved
rejected      -> response rejected
item_returned -> response received
```

Endpoint:

- `GET /seller/returns`
- `GET /seller/returns/:returnId`
- `PATCH /seller/returns/:returnId`

### 5.7 `frontend/src/pages/SellerFinance.tsx`

Vai trò: báo cáo tài chính chỉ đọc.

URL state: `page`, `type`, `search`, `from`, `to`.

State:

- `draft`: giá trị đang nhập chưa apply.
- `summary`, `transactions`, `pagination`.
- `loading`, `error`.

Method:

| Method               | Xử lý                                                     |
| -------------------- | --------------------------------------------------------- |
| `updateQuery()`      | Ghi filter/page vào URL                                   |
| `load()`             | Gọi summary và transactions song song bằng `Promise.all`  |
| `submitFilters()`    | Validate đủ ngày, from <= to, to <= hôm nay rồi apply URL |
| `getVietnamToday()`  | Tạo ngày hiện tại theo Asia/Ho_Chi_Minh                   |
| `formatFilterDate()` | Hiển thị ngày đang áp dụng                                |

Endpoint:

- `GET /seller/finance/summary`
- `GET /seller/finance/transactions`

Các KPI dùng trực tiếp dữ liệu BE; FE không tự cộng doanh thu từ order.

### 5.8 `frontend/src/pages/SellerReviews.tsx`

Vai trò: lọc review và phản hồi customer.

URL state: `page`, `rating`, `replied`.

State page: `data`, `loading`, `error`. `loadReviews()` gọi API theo query hiện tại.

`SellerReviewRow` nhận:

```ts
review: SellerReview;
onReplied: () => void;
```

State row: draft reply, submitting và error riêng.

`submitReply()`:

1. Trim reply.
2. Không cho gửi rỗng.
3. Gọi `reviewService.replyToReview()`.
4. Gọi `onReplied()` để page refetch.
5. Map error qua `getReviewErrorMessage()`.

Endpoint:

- `GET /seller/reviews`
- `PUT /seller/reviews/:reviewId/reply`

### 5.9 `frontend/src/pages/SellerVouchers.tsx`

Vai trò: hai tab quản lý voucher và hiệu quả voucher.

Tab state nằm trên query `tab=management|performance`.

State:

- `coupons`, `loading`, `error`.
- Create: `form`, `submitting`.
- Row action: `workingId`, `dateDrafts`, `deleteTarget`.
- `statsRefreshKey` để yêu cầu `VoucherStatsPanel` refetch sau mutation.

Method:

| Method           | Xử lý                                           |
| ---------------- | ----------------------------------------------- |
| `fetchCoupons()` | GET coupon list và tạo date draft từng coupon   |
| `updateForm()`   | Cập nhật field create controlled                |
| `validateForm()` | Kiểm tra code, value, usage, start/end          |
| `createCoupon()` | POST, reset form, refetch list và stats         |
| `toggleCoupon()` | PATCH `isActive`                                |
| `updateDates()`  | PATCH `startsAt/expiresAt` sau validation       |
| `deleteCoupon()` | DELETE sau confirm, refetch và tăng refresh key |
| `changeTab()`    | Ghi tab vào URL                                 |

Endpoint:

- `GET|POST /seller/coupons`
- `PATCH|DELETE /seller/coupons/:id`
- `GET /seller/coupons/stats` qua panel con.

### 5.10 `frontend/src/pages/SellerInbox.tsx`

Vai trò: chat realtime giữa seller và từng customer.

Context: cần `AuthContext.user` để phân biệt sender/receiver.

State: `chats`, `activeChat`, `messages`, `inputText`, loading list/history và `sending`.

Method:

| Method               | Xử lý                                               |
| -------------------- | --------------------------------------------------- |
| `appendMessage(msg)` | Dedupe theo message id trước khi thêm               |
| `applyChats(chats)`  | Sort hội thoại và phát tổng unread cho SellerLayout |
| `openChat(partner)`  | GET history, POST read, clear unread partner        |
| `handleSend()`       | Trim text, kiểm tra socket, emit message            |
| `handleKeyDown()`    | Enter gửi; Shift+Enter xuống dòng                   |

Socket effect:

- `receiveMessage`: append đúng conversation, cập nhật recent/unread.
- `messageSent`: append message server xác nhận; không tự nhân đôi optimistic message.
- `chatUnreadUpdated`: cập nhật metadata và badge.
- Cleanup toàn bộ listener khi unmount.

Endpoint REST:

- `GET /chat/recent`
- `GET /chat/history/:partnerId`
- `POST /chat/read/:partnerId`

Socket emit/listen:

- emit `sendMessage`
- listen `receiveMessage`, `messageSent`, `chatUnreadUpdated`

### 5.11 `frontend/src/pages/SellerProfile.tsx`

Vai trò: đọc và cập nhật hồ sơ shop.

State: `seller`, `form`, `loading`, `saving`, `message`, `error`.

Method:

| Method               | Xử lý                                                          |
| -------------------- | -------------------------------------------------------------- |
| effect mount         | GET profile và map dữ liệu vào form                            |
| `update(key, value)` | Cập nhật một field form                                        |
| `setLogo(images)`    | Lấy ảnh đầu làm `logoUrl`                                      |
| `setCover(images)`   | Lấy ảnh đầu làm `coverUrl`                                     |
| `save(event)`        | Validate, PUT profile, cập nhật seller/form và success message |

Validation giống onboarding: field bắt buộc, phone 10 số bắt đầu 0, CCCD 12 số nếu nhập, STK 6-20 số nếu nhập.

Component cục bộ:

- `Field`: controlled input nhận label/value/onChange.
- `PreviewRow`: hiển thị cặp label/value, không có state.

Endpoint:

- `GET /seller/profile`
- `PUT /seller/profile`
- Upload logo/cover qua `POST /uploads/images`.

### 5.12 `frontend/src/pages/ShopPublic.tsx`

Vai trò: mặt shop mà customer nhìn thấy; đây là điểm tích hợp ngược từ seller sang storefront.

Context: đọc user để yêu cầu login khi follow/chat và tránh tự follow shop mình nếu UI/BE chặn.

State: `data`, `loading`, `categoryFilter`, `sortKey`, `isFollowing`, `followerCount`, `followLoading`.

Method:

| Method            | Xử lý                                            |
| ----------------- | ------------------------------------------------ |
| effect shop       | GET shop public theo URL `:id`                   |
| effect follow     | GET follow status khi user đã login              |
| `categories`      | `useMemo` tạo danh mục từ product của shop       |
| `visibleProducts` | `useMemo` filter category và sort                |
| `handleChat()`    | Gọi `openSellerChat(shop.user_id, metadata)`     |
| `toggleFollow()`  | POST follow hoặc DELETE unfollow, cập nhật count |

Endpoint:

- `GET /seller/shops/:sellerId`
- `GET /shops/:shopId/follow-status`
- `POST|DELETE /shops/:shopId/follow`

---

## 6. Feature component chuyên biệt

### 6.1 `frontend/src/components/analytics/AnalyticsPeriodFilter.tsx`

Props đầy đủ:

```ts
period: 'day' | 'month' | 'year';
from: string;
to: string;
loading: boolean;
onPeriodChange(period): void;
onFromChange(value): void;
onToChange(value): void;
onApply(): void;
onReset(): void;
onRefresh(): void;
```

Không gọi API. Mọi thao tác được phát về `SellerDashboard`.

### 6.2 `frontend/src/components/analytics/RevenueOrdersChart.tsx`

Prop: `series: SellerAnalyticsSeriesPoint[]`.

Method/helper:

- `formatCompactNumber()` cho trục doanh thu.
- `formatCurrency()` cho tooltip.
- `RevenueTooltip()` tách `gross_revenue` và `orders_created`.
- `hasData` quyết định empty overlay.
- `showDots` tắt dot khi series dài hơn 45 bucket.

Dùng Recharts: `ComposedChart`, `Bar`, `Line`, hai `YAxis`, `Tooltip`, `Legend`.

### 6.3 `frontend/src/components/analytics/StatusStackedChart.tsx`

Prop: `series: SellerAnalyticsSeriesPoint[]`.

`STATUS_CONFIG` là nguồn duy nhất map năm trạng thái sang label/màu. `StatusTooltip` chỉ hiện trạng thái có value > 0. Chart dùng stacked bar và có empty overlay khi toàn bộ series bằng 0.

### 6.4 `frontend/src/components/inventory/InventoryAdjustModal.tsx`

Props:

```ts
variant: InventoryVariantTarget | null;
onClose(): void;
onAdjusted(result): void | Promise<void>;
```

`InventoryVariantTarget` chứa `variantId`, `productId`, `productName`, `sku`, `stockQty`.

State: type, quantity, reason, error, submitting. Khi `variant` thay đổi, effect reset form.

`handleSubmit()` validate:

- Quantity là số nguyên khác 0.
- `restock` chỉ nhận số dương.
- Stock sau điều chỉnh không âm.
- Reason dài 3-255 ký tự.

Sau POST thành công, component chờ `onAdjusted(result)` rồi mới đóng modal.

Endpoint: `POST /seller/inventory/adjust`.

### 6.5 `frontend/src/components/inventory/StockThresholdEditor.tsx`

Props:

```ts
productId: string;
variantId: string;
value: number;
onUpdated(value): void | Promise<void>;
```

State: `editing`, `draft`, `saving`, `error`.

- Effect đồng bộ draft khi prop value đổi.
- `cancel()` khôi phục prop value.
- `save()` validate số nguyên 0-1.000.000, PATCH, gọi `onUpdated`, đóng edit.

### 6.6 `frontend/src/components/orders/OrderTimeline.tsx`

Props:

```ts
items: CustomerOrderItem[];
showActor?: boolean;
```

Method/helper:

- `formatTime()` format timestamp.
- `getFulfillmentMeta()` lấy label/badge.
- `sourceLabels` map seller/customer/system/payment.
- Nếu `showActor=true`, ưu tiên `changed_by_name`.

Không gọi API; page cha phải load timeline trước.

### 6.7 `frontend/src/components/vouchers/VoucherStatsPanel.tsx`

Prop: `refreshKey: number`.

State:

- `draft`: form filter chưa áp dụng.
- `query`: filter đang áp dụng và pagination.
- `data`, `loading`, `error`.

Effect phụ thuộc `[query, refreshKey]`. Khi page cha tăng `refreshKey` sau create/update/delete coupon, panel tự gọi lại stats.

Method:

- `applyFilters()`: kiểm tra from/to đi cùng nhau và from <= to.
- `resetFilters()`: quay về status all, sort redemptions desc.
- `changePage()`: đổi page trong query.
- `summaryCards()`: chuyển summary thành bốn KPI.
- `UsageCell()`: hiển thị progress khi voucher có usage limit.

Endpoint: `GET /seller/coupons/stats`.

---

## 7. Service layer Seller

### 7.1 `frontend/src/services/api.ts`

Vai trò chung:

- Tạo Axios instance với `VITE_API_BASE_URL` hoặc localhost.
- Timeout 10 giây.
- Request interceptor đọc `ecom_token` và thêm Bearer token.
- Success interceptor trả `response.data`.
- Error interceptor log lỗi và reject object chuẩn hóa.

Do success đã được unwrap, service thường phải hỗ trợ các dạng `response.data || response` tùy envelope BE.

### 7.2 `frontend/src/services/sellerService.ts`

| Method                    | HTTP   | Endpoint                           | Trả về chính           |
| ------------------------- | ------ | ---------------------------------- | ---------------------- |
| `getSellerApplication()`  | GET    | `/seller/application`              | application hoặc null  |
| `registerSeller()`        | POST   | `/seller/register`                 | application pending    |
| `getSellerProfile()`      | GET    | `/seller/profile`                  | seller                 |
| `updateSellerProfile()`   | PUT    | `/seller/profile`                  | seller                 |
| `getPublicShop()`         | GET    | `/seller/shops/:id`                | shop, products, stats  |
| `getDashboardStats()`     | GET    | `/seller/dashboard-stats`          | dashboard cards        |
| `getDashboardAnalytics()` | GET    | `/seller/dashboard-analytics`      | summary + series       |
| `getDashboardTasks()`     | GET    | `/seller/dashboard-tasks`          | việc cần làm           |
| `getProductsPage()`       | GET    | `/seller/products`                 | products + pagination  |
| `getProducts()`           | GET    | `/seller/products`                 | product array          |
| `getCategories()`         | GET    | `/seller/categories`               | category array         |
| `createProduct()`         | POST   | `/seller/products`                 | product                |
| `updateProduct()`         | PUT    | `/seller/products/:id`             | response               |
| `deleteProduct()`         | DELETE | `/seller/products/:id`             | response               |
| `getOrdersPage()`         | GET    | `/seller/orders`                   | orders + pagination    |
| `getOrders()`             | GET    | `/seller/orders`                   | order array            |
| `updateOrderItem()`       | PATCH  | `/seller/orders/items/:itemId`     | normalized item result |
| `getOrderTimeline()`      | GET    | `/seller/orders/:orderId/timeline` | timeline               |
| `getCouponsPage()`        | GET    | `/seller/coupons`                  | coupons + pagination   |
| `getCoupons()`            | GET    | `/seller/coupons`                  | coupon array           |
| `getCouponStats()`        | GET    | `/seller/coupons/stats`            | stats + pagination     |
| `createCoupon()`          | POST   | `/seller/coupons`                  | coupon                 |
| `updateCoupon()`          | PATCH  | `/seller/coupons/:id`              | response               |
| `deleteCoupon()`          | DELETE | `/seller/coupons/:id`              | response               |
| `getFlashSales()`         | GET    | `/seller/flash-sales`              | flash sale array       |
| `createFlashSale()`       | POST   | `/seller/flash-sales`              | flash sale             |
| `updateFlashSale()`       | PATCH  | `/seller/flash-sales/:id`          | flash sale             |
| `deleteFlashSale()`       | DELETE | `/seller/flash-sales/:id`          | response               |

`registerSeller()` không còn xử lý session. BE không trả token/user mới khi gửi hồ sơ; service chỉ trả `data.application`.

### 7.3 `frontend/src/services/inventoryService.ts`

| Method                     | Endpoint                                                            | Ý nghĩa                |
| -------------------------- | ------------------------------------------------------------------- | ---------------------- |
| `getLowStock(page, limit)` | GET `/seller/inventory/low-stock`                                   | Variant chạm threshold |
| `getLogs(query)`           | GET `/seller/inventory/logs`                                        | Lịch sử kho có filter  |
| `adjust(payload)`          | POST `/seller/inventory/adjust`                                     | Nhập/điều chỉnh kho    |
| `updateStockAlert(...)`    | PATCH `/seller/products/:productId/variants/:variantId/stock-alert` | Đổi threshold          |

### 7.4 `frontend/src/services/financeService.ts`

- `getSummary(query)`: GET `/seller/finance/summary`.
- `getTransactions(query)`: GET `/seller/finance/transactions`.

Query summary chỉ có from/to. Query transaction thêm page, limit, status và search.

### 7.5 `frontend/src/services/returnService.ts`

Seller dùng:

- `getSellerReturns(query)`.
- `getSellerReturn(returnId)`.
- `updateSellerReturn(returnId, status, sellerResponse)`.

`create()` và `getMine()` thuộc customer, nhưng cùng service để giữ contract return tập trung.

### 7.6 `frontend/src/services/reviewService.ts`

Seller dùng:

- `getSellerReviews({ rating, replied, page, limit })`.
- `replyToReview(reviewId, reply)`.

Các method public/customer trong cùng file: get product reviews, reviewable items, my reviews, create/update/delete review. Chúng giúp product detail và customer order hiển thị dữ liệu tương thích với seller reply.

### 7.7 `frontend/src/services/chatService.ts`

- `getRecentChats()` -> GET `/chat/recent`.
- `getChatHistory(partnerId)` -> GET `/chat/history/:partnerId`.
- `markChatAsRead(partnerId)` -> POST `/chat/read/:partnerId`.

`partnerId` luôn là `user_id` của đối phương, không phải `seller_id` của shop.

### 7.8 `frontend/src/services/socketService.ts`

Singleton class giữ một socket duy nhất.

| Method                      | Vai trò                                                |
| --------------------------- | ------------------------------------------------------ |
| `connect()`                 | Đọc token, kết nối WebSocket, không tạo socket thứ hai |
| `disconnect()`              | Ngắt và set instance null                              |
| `sendMessage()`             | Emit `sendMessage`, trả boolean thành công cục bộ      |
| `on/offReceiveMessage()`    | Đăng ký/hủy listener tin đến                           |
| `on/offMessageSent()`       | Đăng ký/hủy listener xác nhận gửi                      |
| `on/offChatUnreadUpdated()` | Đăng ký/hủy listener unread                            |

Socket URL lấy từ `VITE_API_BASE_URL` sau khi bỏ `/api`, fallback `http://localhost:5000`.

### 7.9 `frontend/src/services/notificationService.ts`

- `getNotifications(query)`.
- `markRead(id)`.
- `markAllRead()`.

Service không poll; `NotificationBell` chịu trách nhiệm timer.

### 7.10 `frontend/src/services/shopFollowService.ts`

- `getStatus(shopId)`.
- `follow(shopId)`.
- `unfollow(shopId)`.
- `getSellerStats()`.

Ba method đầu đang dùng tại `ShopPublic`. `getSellerStats()` đã có nhưng hiện chưa được nối thành card follower riêng trên dashboard seller.

### 7.11 `frontend/src/services/uploadService.ts`

- `uploadImage(file, purpose)`: tạo `FormData`, POST multipart.
- `deleteImage(publicId)`: DELETE ảnh cloud theo body.
- `uploadApplicationImage(file, purpose)`: upload `shop_logo|shop_cover` trước khi user được duyệt.
- `deleteApplicationImage(publicId)`: xóa ảnh hồ sơ thuộc đúng user hiện tại.

`ImageUploadField` chọn method theo `uploadScope`. Delete tự động mới chỉ bật cho application scope; ảnh product/profile vẫn cần chính sách xóa riêng để tránh xóa nhầm file đang dùng.

### 7.12 `frontend/src/services/authService.ts`

Liên quan seller session:

- Login thường/Google lưu token và user.
- `getProfile()` đồng bộ role mới từ server.
- `getCurrentUser()` đọc local storage.
- `logout()` xóa session.

`AuthContext` là caller chính; page seller không gọi auth service trực tiếp.

---

## 8. Utility và type contract

### 8.1 `frontend/src/utils/sellerValidation.ts`

| Function                          | Rule                 |
| --------------------------------- | -------------------- |
| `isValidShopPhone()`              | `^0\d{9}$`           |
| `isValidOptionalIdentityNumber()` | Rỗng hoặc đúng 12 số |
| `isValidOptionalBankAccount()`    | Rỗng hoặc 6-20 số    |
| `isPositivePrice()`               | Số hữu hạn > 0       |
| `isNonNegativeInteger()`          | Số nguyên >= 0       |

Dùng ở onboarding, profile và product form.

### 8.2 Error utilities

| File                 | Chức năng                                             |
| -------------------- | ----------------------------------------------------- |
| `analyticsErrors.ts` | Map error code analytics sang tiếng Việt              |
| `inventoryErrors.ts` | Map lỗi quantity, reason, threshold, date, pagination |
| `reviewErrors.ts`    | Map lỗi review/reply                                  |

Quy tắc fallback chung: code đã biết -> message BE -> message tổng quát của page.

### 8.3 `frontend/src/utils/orderStatus.ts`

- `FULFILLMENT_STATUS_META`: label và badge class của năm trạng thái.
- `getFulfillmentMeta(status)`: đọc metadata.
- `isFinalFulfillmentStatus(status)`: true với delivered/cancelled.

Seller order và timeline dùng chung utility này để tránh lệch label.

### 8.4 `frontend/src/utils/liveChat.ts`

`openSellerChat(sellerUserId, meta)`:

1. Lưu target vào session storage.
2. Phát custom event `seller-chat-target`.
3. `LiveChatWidget` bắt event và mở đúng hội thoại.

`sellerUserId` là user id của chủ shop; `shopId` chỉ là metadata.

### 8.5 `frontend/src/types.ts`

Các nhóm contract seller:

| Nhóm                | Type chính                                                                            |
| ------------------- | ------------------------------------------------------------------------------------- |
| Auth/shop           | `User`, `Seller`, `SellerApplication`, `SellerApplicationStatus`, `AuthContextType`   |
| Product             | `Product`, `ProductImage`, `SellerProduct`, `SellerProductVariant`, `SellerFlashSale` |
| Analytics           | `AnalyticsPeriod`, `SellerDashboardAnalytics`, `SellerDashboardTasks`                 |
| Inventory           | `LowStockVariant`, `InventoryLog`, `InventoryAdjustmentResult`                        |
| Order               | `FulfillmentStatus`, `SellerOrder`, `SellerOrderItem`, `OrderTimelineData`            |
| Voucher             | `SellerCoupon`, `CouponStatsQuery`, `SellerCouponStatsData`                           |
| Review              | `SellerReview`, `SellerReviewsData`, `ReviewRating`                                   |
| Chat                | `Message`, `ChatPartner`, `ChatUnreadUpdate`                                          |
| Notification/follow | `AppNotification`, `NotificationType`, `ShopFollowStatus`                             |
| Return/finance      | `ReturnRequest`, `SellerReturnDetail`, `FinanceSummary`, `FinanceTransaction`         |

`types.ts` không chạy ở runtime. Nó giúp TypeScript phát hiện page/service dùng sai field trước khi build.

---

## 9. Luồng callback tiêu biểu

### 9.1 Điều chỉnh kho

```txt
SellerInventory.openAdjust(variant)
  -> setAdjustTarget(...)
  -> InventoryAdjustModal nhận prop variant
  -> handleSubmit()
  -> inventoryService.adjust()
  -> POST /seller/inventory/adjust
  -> onAdjusted(result)
  -> SellerInventory.refreshInventory()
  -> onClose()
```

### 9.2 Cập nhật đơn

```txt
ItemActions.updateStatus(nextStatus)
  -> sellerService.updateOrderItem()
  -> PATCH /seller/orders/items/:itemId
  -> onUpdated(result)
  -> SellerOrders.handleItemUpdated()
  -> fetchOrders()
  -> nếu timeline đang mở: loadTimeline()
```

### 9.3 Tạo voucher và refresh thống kê

```txt
SellerVouchers.createCoupon()
  -> sellerService.createCoupon()
  -> fetchCoupons()
  -> setStatsRefreshKey(key + 1)
  -> VoucherStatsPanel effect nhận refreshKey mới
  -> sellerService.getCouponStats()
```

### 9.4 Tin nhắn và unread sidebar

```txt
SellerInbox nhận chatUnreadUpdated
  -> update chats
  -> applyChats()
  -> dispatch 'seller-unread-changed'
  -> SellerLayout listener nhận tổng unread
  -> cập nhật badge Hộp thư
```

---

## 10. Điểm cần nhớ khi sửa hoặc review

1. Page seller không được gọi Axios trực tiếp; thêm method vào service phù hợp.
2. Không truyền token qua props; `api.ts` tự đọc token.
3. Không dùng `seller_id` làm chat partner; phải dùng user id của đối phương.
4. Mọi effect có timer, DOM event hoặc socket listener phải cleanup.
5. List có filter nên giữ URL query để refresh không mất trạng thái.
6. Mutation thành công phải xác định rõ cập nhật state cục bộ hay refetch nguồn dữ liệu.
7. Validation FE giúp phản hồi nhanh nhưng không thay thế validation BE.
8. Error nghiệp vụ phải ưu tiên `error.data.code`, không so sánh riêng text message.
9. Dữ liệu tiền, stock, quyền sở hữu và trạng thái cuối cùng phải tin response BE.
10. Khi thêm type response mới, cập nhật `types.ts` trước rồi dùng cùng contract ở service và page.

## 11. Khoảng trống hiện tại cần biết

- Shipping provider chưa tích hợp; tracking code đang được phép để trống khi bắt đầu giao.
- `shopFollowService.getSellerStats()` chưa có màn follower analytics riêng.
- Bỏ ảnh đã upload khỏi form chưa gọi API xóa cloud.
- Notification và unread chat đang dùng polling 30 giây kết hợp socket chat; notification chưa có socket realtime riêng.
- Seller finance hiện chỉ đối soát, chưa có ví shop/rút tiền.
- Một số service phải hỗ trợ nhiều dạng response envelope (`response.data || response`); về lâu dài nên chuẩn hóa response BE thống nhất.
- API hồ sơ chưa trả `rejectionReason` hoặc dữ liệu nhạy cảm đã nộp; màn rejected chỉ hiển thị thông báo chung và form nhập lại.
- Phần Admin duyệt/từ chối/tạm ngưng/kích hoạt lại không nằm trong FE Seller.

---

## 12. Trình tự đọc code đề xuất cho intern

```txt
1. App.tsx + AppProviders.tsx
2. AppRoutes.tsx + RouteGuards.tsx + RouteLayouts.tsx
3. AuthContext.tsx
4. SellerLayout.tsx
5. Page đang cần sửa
6. Component con mà page import
7. Service được handler gọi
8. api.ts
9. types.ts và utility validation/error liên quan
```

Đọc theo thứ tự này giúp nhìn được cả luồng mà không sa vào JSX/CSS trước khi hiểu state và dữ liệu.
