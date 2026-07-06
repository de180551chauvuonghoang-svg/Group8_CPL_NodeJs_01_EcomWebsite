# SRS Implementation Log — E-Com FPT
> Tài liệu tổng hợp các tính năng đã triển khai kể từ nhánh `main`, phục vụ viết **Software Requirements Specification (SRS)**.
> Cập nhật lần cuối: **06/07/2026**

---

## 1. Tổng quan thay đổi

Dự án chuyển từ nền tảng e-commerce demo cơ bản sang **sàn VLXD đa người bán (multi-vendor)** với:
- Đặt hàng nhanh + tính phí ship Haversine
- Voucher theo shop / toàn sàn
- Chat real-time Customer ↔ Seller (Socket.IO)
- AI Advisor tư vấn sản phẩm (Gemini + fallback rule-based)
- Dashboard Seller + trang đơn hàng Customer

---

## 2. Backend — API & Services mới

### 2.1. Orders (`/api/orders`)
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/checkout` | POST | Tạo đơn hàng, tách theo shop, tính ship Haversine, áp voucher |
| `/my-orders` | GET | Danh sách đơn của customer (filter status, pagination) |
| `/my-orders/:id` | GET | Chi tiết đơn hàng |
| `/my-orders/:id/cancel` | PATCH | Hủy đơn (trạng thái cho phép) |

**Service:** `customerOrderService.js`
- Nhóm sản phẩm theo `shop_id`
- Tính khoảng cách km từ kho shop → tọa độ khách (Haversine)
- Phí ship = `distance_km × shipping_fee_per_km`
- Validate & trừ voucher qua `couponService`

### 2.2. Coupons (`/api/coupons`)
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/validate` | POST | Kiểm tra mã giảm giá (code, subtotal, **shopId**) |

**Service:** `couponService.js`
- Kiểm tra: tồn tại, thời hạn, usage limit, user limit, min order
- Hỗ trợ `discount_type`: `fixed` | `percentage`
- **Shop-scoped:** cột `Coupons.shop_id` — NULL = áp dụng mọi shop

**Mã seed:**
| Code | Loại | Giá trị | Min order | Shop |
|------|------|---------|-----------|------|
| `VLXDFPT2026` | fixed | 50.000đ | 100.000đ | Toàn sàn |
| `GIAM10` | percentage 10% | max 100.000đ | 200.000đ | `shop_hoaphat` |

### 2.3. Chat (`/api/chat`)
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/rooms` | GET | Phòng chat (customer: theo shop; seller: theo cửa hàng) |
| `/rooms/:roomId/messages` | GET | Lịch sử tin nhắn |
| `/messages` | POST | Gửi tin (tạo room nếu chưa có qua `shopId`) |
| `/ai` | POST | AI tư vấn sản phẩm |

**Real-time:** Socket.IO (`server.js`)
- Events: `join_room`, `leave_room`, `receive_message`
- Broadcast tin nhắn mới tới room

**Service:** `aiService.js`
- Primary: Google Gemini 1.5 Flash (env `GEMINI_API_KEY`)
- Fallback: keyword matching tiếng Việt (gạch/xi măng, thép, sơn...)

### 2.4. Seller (`/api/seller`)
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/shop` | GET/PUT | Thông tin cửa hàng |
| `/products` | CRUD | Quản lý sản phẩm của shop |
| `/orders` | GET/PATCH | Quản lý đơn hàng seller |
| `/stats` | GET | Thống kê doanh thu |

**Middleware mới:** `requireSellerShop` — gắn `req.shopId` cho seller

### 2.5. Products (cập nhật)
- Trả về `shop_id` trên mỗi sản phẩm
- Filter theo shop, category, search
- Tạo variant mặc định `var_{productId}_default` khi thêm SP

### 2.6. Database (`initDb.js`)
**Bảng mới / mở rộng:**
- `Shops`, `ChatRooms`, `Messages`
- `Coupons.shop_id` (migration)
- `Products.shop_id`, `Orders.shop_id`, `Orders.distance_km`

**Seed shops:**
- `shop_dongtam` — VLXD Đồng Tâm (lat/lng Q.7)
- `shop_hoaphat` — VLXD Hòa Phát (lat/lng Q.9)

---

## 3. Frontend — Giao diện & luồng người dùng

### 3.1. Trang Home (`Home.tsx`)
- Hero + danh mục VLXD + lưới sản phẩm (glassmorphism)
- **Quick Order Modal:** form đặt hàng, tọa độ giả lập, preview ship km/fee
- **Voucher:** nhập mã → validate kèm `shopId` của sản phẩm đang đặt
- **Chat Widget:**
  - Tab *Nhân viên*: chat với shop (chọn Đồng Tâm / Hòa Phát)
  - Tab *AI Advisor*: hỏi tư vấn, hiển thị SP gợi ý
  - Bubble **68×68px**, icon **32px**, **kéo thả** (pointer events)
  - Lưu vị trí bubble vào `localStorage`

**Components mới:**
- `components/chat/ChatPanel.tsx`
- `components/chat/ChatBubbleLauncher.tsx`

### 3.2. Trang My Orders (`MyOrders.tsx`)
- Danh sách đơn hàng customer
- Modal chi tiết + hủy đơn

### 3.3. Seller Dashboard (`SellerDashboard.tsx`)
- Tab: Overview, Products, Orders, Settings, Chat
- CRUD sản phẩm, cập nhật trạng thái đơn
- Chat real-time với khách

### 3.4. Routing (`App.tsx`)
```
/                  → Home
/login, /register  → Auth
/my-orders         → Customer orders
/seller/dashboard  → Seller portal
```

### 3.5. Services FE
| File | Chức năng |
|------|-----------|
| `orderService.ts` | checkout, validate coupon, my orders |
| `chatService.ts` | HTTP chat + Socket.IO client |
| `sellerService.ts` | seller API |
| `api.ts` | Axios + JWT interceptor |

**Chuẩn unwrap API:** interceptor trả `{ status, data }` → services dùng helper `unwrap()` để lấy `data`.

---

## 4. Bug fixes (phiên 06/07/2026)

| # | Lỗi | Nguyên nhân | Cách sửa |
|---|-----|-------------|----------|
| 1 | Voucher báo lỗi khi áp dụng | Không truyền `shopId`; mã shop-specific dùng sai shop | FE gửi `shopId` từ sản phẩm; BE validate `Coupons.shop_id` |
| 2 | Chat bubble cố định, icon nhỏ | Chưa có component drag; bubble cũ 44px | `ChatBubbleLauncher` + `ChatPanel` 68px, icon 32px |
| 3 | Màn hình đen sau gửi chat | Syntax error JSX + thiếu `ChatPanel` component | Sửa JSX, tạo `ChatPanel.tsx` |
| 4 | Tin nhắn còn sau logout/đổi role | Socket listener không cleanup | `disconnectSocket()` on logout; reset state; off listener cụ thể |
| 5 | AI Advisor không hoạt động | Response API unwrap sai (`res.data.data`) | Chuẩn hóa `unwrap()` trong `chatService` |
| 6 | Socket không nhận tin khi list rỗng | Logic `prev.length > 0` chặn append | Filter theo `currentRoom.id`, bỏ điều kiện length |

---

## 5. Yêu cầu phi chức năng (NFR) đã áp dụng

- **Auth:** JWT Bearer trên mọi API protected (orders, coupons, chat, seller)
- **UI:** Dark glassmorphism, Framer Motion, responsive grid
- **Dev:** SQL Server seed tự động; mock tọa độ giao hàng
- **Socket CORS:** localhost:5173/5174
- **Rate limit:** 100 req/15 phút/IP

---

## 6. Biến môi trường

| Biến | Mô tả |
|------|-------|
| `VITE_API_BASE_URL` | URL backend API (FE) |
| `VITE_SOCKET_URL` | URL Socket.IO (mặc định `:5001`) |
| `JWT_SECRET` | Ký JWT |
| `GEMINI_API_KEY` | AI Advisor (optional) |
| `SEED_PASSWORD` | Mật khẩu seed user dev |

---

## 7. Tài khoản demo

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@ecom.com` | `password123` |
| Admin | `admin@ecom.com` | `password123` |
| Seller | *(seed trong initDb nếu có)* | `password123` |

---

## 8. Luồng nghiệp vụ chính (cho SRS Use Case)

### UC-01: Đặt hàng nhanh
1. Customer đăng nhập → chọn SP → "Đặt mua ngay"
2. Nhập thông tin giao hàng + tọa độ (hoặc random)
3. Tính cự ly & phí ship
4. (Tuỳ chọn) Nhập voucher → Áp dụng
5. Xác nhận → Backend tạo order → redirect `/my-orders`

### UC-02: Chat với Seller
1. Mở bubble chat → tab Nhân viên
2. Chọn shop → gửi tin
3. Socket broadcast → Seller nhận trên Dashboard

### UC-03: AI tư vấn
1. Tab AI Advisor → nhập câu hỏi (VD: "Tư vấn gạch ốp lát")
2. Backend trả text + `recommendedProductIds`
3. FE hiển thị card SP → click mở Quick Order

### UC-04: Seller quản lý
1. Login seller → `/seller/dashboard`
2. Quản lý SP, cập nhật trạng thái đơn, trả lời chat

---

## 9. Việc tiếp theo (Backlog gợi ý cho SRS v2)

- [ ] Giỏ hàng đa sản phẩm (Cart page) thay vì Quick Order đơn lẻ
- [ ] Thanh toán online (VNPay/MoMo) thay COD
- [ ] Upload ảnh sản phẩm thật (Cloudinary/S3)
- [ ] Push notification tin nhắn chưa đọc
- [ ] Admin dashboard quản lý toàn sàn
- [ ] Unit/E2E tests cho checkout & coupon

---

## 10. Cấu trúc file mới (so với `main`)

```
backend/src/
  controllers/  chat.controller.js, coupon.controller.js, order.controller.js, seller.controller.js
  routes/       chat.routes.js, coupon.routes.js, order.routes.js, seller.routes.js
  services/     aiService.js, chatService.js, couponService.js, customerOrderService.js,
                sellerOrderService.js, shippingService.js, shopService.js

frontend/src/
  components/chat/  ChatPanel.tsx, ChatBubbleLauncher.tsx
  pages/            MyOrders.tsx, SellerDashboard.tsx
  services/         chatService.ts, orderService.ts, sellerService.ts
```

---

*Tài liệu này có thể copy trực tiếp vào mục "Implementation Status" hoặc "Functional Requirements Traceability" trong SRS.*
