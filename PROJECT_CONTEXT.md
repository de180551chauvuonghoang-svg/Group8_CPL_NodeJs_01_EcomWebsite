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
* [x] **Khắc phục lỗi giao diện & Đồng bộ HMR:** Khắc phục triệt để lỗi biên dịch CSS build-time v4 bằng cách hoàn tác `@tailwindcss/vite` và dọn dẹp `index.css`, khôi phục chạy mượt mà 100% cùng Tailwind Play CDN và cấu hình runtime.
* [x] **Mock Auth & Dữ liệu offline:** Tích hợp thành công cơ chế Đăng nhập giả lập linh hoạt (`AuthContext.tsx`) và danh sách 6 sản phẩm Premium dự phòng khi mất kết nối (`productService.ts`), hỗ trợ kiểm thử UI ngoại tuyến hoàn chỉnh.
* [x] **Trang Quên mật khẩu & Đặt lại mật khẩu mới:** Thiết kế và xây dựng hoàn chỉnh hai trang `ForgotPassword.tsx` và `ResetPassword.tsx` với hoạt ảnh Framer Motion trượt mượt mà, hiệu ứng 3D Parallax mượt mà 60fps trên GPU và tương tác kiểm tra độ mạnh mật khẩu thời gian thực.
* [x] **Bảo mật Git (.gitignore):** Bổ sung quy tắc bỏ qua file credentials nhạy cảm `client_secret_*.json` vào `.gitignore` để tránh bị push lộ thông tin lên Git.
* [x] **Xử lý triệt để lỗi hai thanh cuộn dọc (Double Scrollbars):** Tách biệt quy tắc CSS của `html` và `body` trong `index.css`, cấu hình chỉ một viewport scrollbar duy nhất ở root, loại bỏ hoàn toàn hiện tượng hai thanh cuộn trùng nhau gây xấu UI ở trang chủ.
* [x] **Hệ thống Tài liệu Tính năng (Feature-based Documentation):** Thiết lập quy trình tài liệu hóa chuẩn hóa trong thư mục `/docs`. Tạo thư mục riêng cho từng feature kèm file `README.md` hướng dẫn cực kỳ chi tiết (đã triển khai cho `auth-pages` và `double-scrollbars-fix`), đồng thời xây dựng file mục lục tổng quan `docs/README.md` chuyên nghiệp.

---

## 🚧 4. Trạng Thái Hiện Tại & Công Việc Đang Làm (Active Context)
* **Xác thực và Dữ liệu Offline:** Hệ thống Frontend hiện đã có khả năng chạy độc lập hoàn toàn ngoại tuyến phục vụ cho việc kiểm thử UI (Offline Testing). Đăng nhập chấp nhận mọi email/mật khẩu, và trang chủ tự động tải 6 sản phẩm mẫu đẹp mắt nếu server backend offline.
* **Luồng Xác thực Khép kín:** Login, Register, ForgotPassword, và ResetPassword đã được tích hợp đồng bộ hoàn hảo với các hiệu ứng hoạt ảnh Framer Motion cao cấp, mang lại trải nghiệm tối giản và cực kỳ premium.
* **Bảo mật:** File credentials Google Client đã được chặn Git theo dõi hoàn toàn thông qua `.gitignore`.

---

## 🔮 5. Kế Hoạch Tiếp Theo (Next Steps / Roadmap)
1. **Xây dựng API Backend:** Tạo REST API endpoints cho Products, Categories, Cart, Orders dựa trên schema mới.
2. **Kết nối Frontend với API thật:** Thay thế mock data bằng API calls thực từ SQL Server khi backend hoạt động.
3. **Quản lý Giỏ hàng (Cart Page):** Xây dựng trang Giỏ hàng và Thanh toán (Checkout).
4. **Trang Quản lý Sản phẩm (Admin Dashboard):** Giao diện Admin Thêm/Sửa/Xóa sản phẩm.
5. **Thiết lập DNS:** Hoàn tất cấu hình bản ghi A/CNAME cho `ecomfpt.app`.

---

## 📝 HƯỚNG DẪN CẬP NHẬT CHO AI:
1. Đọc lại file này để đảm bảo không đi lệch hướng thiết kế của dự án.
2. Cập nhật phần **3. Lịch Sự & Những Việc Đã Hoàn Thành** và **4. Trạng Trạng Hiện Tại** tương ứng với những gì bạn vừa code xong.

