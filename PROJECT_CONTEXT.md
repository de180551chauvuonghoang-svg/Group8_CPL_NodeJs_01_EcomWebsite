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
* [x] **Trang chủ mới Volitify (Tailwind CSS):** Thay thế giao diện trang chủ cũ bằng template Volitify cao cấp, thiết kế Bento Grid, banner ưu đãi VIP, và tích hợp hoàn chỉnh hệ thống tìm kiếm/bộ lọc sản phẩm động kết nối trực tiếp với Database/API.

---

## 🚧 4. Trạng Thái Hiện Tại & Công Việc Đang Làm (Active Context)
* **Database Schema:** Đã implement đầy đủ 24 bảng (SQL Server). Chạy server backend sẽ tự động tạo bảng và seed data.
* **Cấu trúc DB:** 7 nhóm nghiệp vụ: Users, Categories, Products/Catalog, Reviews, Cart/Wishlist, Orders/Payments, Coupons.
* **Seed data sẵn sàng:** 2 Users (`admin@ecom.com` + `customer@ecom.com`, mật khẩu từ env `SEED_PASSWORD`, mặc định `password123` ở dev), 8 Categories (có sub-category), 3 Attributes + 12 AttributeValues, 6 Products với 10 Variants. Seed **bị tắt trong `NODE_ENV=production`**.

---

## 🔮 5. Kế Hoạch Tiếp Theo (Next Steps / Roadmap)
1. **Xây dựng API Backend:** Tạo REST API endpoints cho Products, Categories, Cart, Orders dựa trên schema mới.
2. **Kết nối Frontend với API thật:** Thay thế mock data bằng API calls thực từ SQL Server.
3. **Quản lý Giỏ hàng (Cart Page):** Xây dựng trang Giỏ hàng và Thanh toán (Checkout).
4. **Trang Quản lý Sản phẩm (Admin Dashboard):** Giao diện Admin Thêm/Sửa/Xóa sản phẩm.
5. **Thiết lập DNS:** Hoàn tất cấu hình bản ghi A/CNAME cho `ecomfpt.app`.

---

## 📝 HƯỚNG DẪN CẬP NHẬT CHO AI:
Mỗi khi bạn (AI) thực hiện một thay đổi lớn:
1. Đọc lại file này để đảm bảo không đi lệch hướng thiết kế của dự án.
2. Cập nhật phần **3. Lịch Sử & Những Việc Đã Hoàn Thành** và **4. Trạng Thái Hiện Tại** tương ứng với những gì bạn vừa code xong.
