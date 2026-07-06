# 🧠 E-Com FPT - PROJECT CONTEXT & MEMORY BANK

> **LƯU Ý DÀNH CHO AI ASSISTANT:** Đây là "bộ nhớ" duy nhất của dự án này. Hãy ĐỌC file này trước khi thực hiện bất kỳ thay đổi nào và luôn CẬP NHẬT file này sau khi hoàn thành một tính năng hoặc thay đổi kiến trúc lớn để lưu lại lịch sử làm việc cho phiên tiếp theo.

---

## 🎯 1. Thông Tin Chung & Mục Tiêu (Overview & Goal)
* **Tên dự án:** E-Com FPT
* **Mục tiêu:** Xây dựng một nền tảng Thương mại Điện tử (E-Commerce) hiện đại, cao cấp với giao diện Glassmorphism và tối ưu hóa hiệu năng cực cao.
* **Mô hình quản lý:** **pnpm Monorepo Workspaces**.

---

## 🛠️ 2. Công Nghệ & Cấu Trúc Dự Án (Tech Stack & Architecture)

### 💻 Frontend (`/frontend`)
* **Framework:** React 19 + Vite (Preset cực nhanh).
* **Ngôn ngữ:** **TypeScript (TS/TSX)** - Đã được chuyển đổi hoàn toàn từ JS sang TS, có typing đầy đủ và cực kỳ an toàn.
* **Styling:** CSS thuần (Vanilla CSS) với bộ thiết kế Glassmorphism tùy biến cao (sử dụng biến CSS tại `index.css`).
* **Animation:** Framer Motion (tạo micro-animations mượt mà).
* **API Client:** Axios (cấu hình tại `src/services/api.ts` tự động nhận `VITE_API_BASE_URL` cho deploy).
* **Routing:** React Router DOM v7.
* **Trạng thái:** Tương thích hoàn toàn với Vercel Deployment.

### ⚙️ Backend (`/backend`)
* **Framework:** Node.js + Express.js.
* **Môi trường chạy:** In-memory Database giả lập cho môi trường phát triển (test nhanh).
* **Tài khoản thử nghiệm mặc định:**
  * **Customer:** `customer@ecom.com` / `password123`
  * **Admin:** `admin@ecom.com` / `password123`

---

## 🏁 3. Lịch Sử & Những Việc Đã Hoàn Thành (Milestones Completed)
* [x] **TypeScript Migration:** Chuyển đổi toàn bộ Frontend từ JavaScript sang TypeScript, cấu hình `tsconfig.json` hoàn chỉnh không lỗi type.
* [x] **Vercel API Integration:** Thiết lập URL API động thông qua biến môi trường `VITE_API_BASE_URL` giúp deploy độc lập dễ dàng.
* [x] **Cấu hình Git & GitHub:** Kích hoạt Branch Protection Rule cho nhánh `main`.
* [x] **Tên miền & Vercel:** Cập nhật dự án trên Vercel và cấu hình Custom Domain riêng `ecomfpt.app`.
* [x] **Đổi tên hiển thị Web:** Đổi tiêu đề Tab trình duyệt thành **`E-Com FPT`**.
* [x] **Bộ hướng dẫn cài đặt:** Hoàn thành file `README.md` hướng dẫn cài đặt.
* [x] **Full Database Schema (24 bảng):** Thiết kế và implement đầy đủ schema SQL Server dựa trên ERD Mermaid:
  * `backend/src/config/schema.sql` — SQL script chạy trực tiếp trên SSMS
  * `backend/src/config/initDb.js` — Module Node.js tự động tạo bảng & seed data khi server start
  * Đã tách `db.js` thành module riêng, code sạch hơn
  * Seed data: 8 Categories (parent/child), 3 Attributes + 12 Values, 6 Products + 10 Variants
* [x] **Multi-vendor VLXD Platform:** Orders, Coupons (shop-scoped), Shipping Haversine, Chat Socket.IO, AI Advisor
* [x] **Frontend Pages:** Home (Quick Order + Chat Widget), MyOrders, SellerDashboard
* [x] **Bugfix Session 06/07/2026:** Voucher theo shop, Chat bubble draggable 68px, fix màn hình đen & socket leak — chi tiết tại `SRS_IMPLEMENTATION_LOG.md`

---

## 🚧 4. Trạng Thái Hiện Tại & Công Việc Đang Làm (Active Context)
* **Database Schema:** 25 bảng SQL Server + migrations (`shop_id` trên Products/Orders/Coupons).
* **API Backend:** REST đầy đủ cho Products, Orders, Coupons, Chat, Seller.
* **Frontend:** Kết nối API thật; Chat widget draggable; AI Advisor hoạt động (Gemini hoặc fallback).
* **Seed coupons:** `VLXDFPT2026` (toàn sàn), `GIAM10` (shop Hòa Phát).
* **Tài liệu SRS:** `SRS_IMPLEMENTATION_LOG.md` — log triển khai từ nhánh `main`.

---

## 🔮 5. Kế Hoạch Tiếp Theo (Next Steps / Roadmap)
1. **Giỏ hàng đa sản phẩm (Cart Page):** Thay Quick Order đơn lẻ bằng cart + checkout đầy đủ.
2. **Thanh toán online:** Tích hợp VNPay/MoMo.
3. **Admin Dashboard:** Quản lý toàn sàn, duyệt seller.
4. **Tests:** Unit/E2E cho checkout, coupon, chat.
5. **Thiết lập DNS:** Hoàn tất cấu hình bản ghi A/CNAME cho `ecomfpt.app`.

---

## 📝 HƯỚNG DẪN CẬP NHẬT CHO AI:
Mỗi khi bạn (AI) thực hiện một thay đổi lớn:
1. Đọc lại file này để đảm bảo không đi lệch hướng thiết kế của dự án.
2. Cập nhật phần **3. Lịch Sử & Những Việc Đã Hoàn Thành** và **4. Trạng Thái Hiện Tại** tương ứng với những gì bạn vừa code xong.
