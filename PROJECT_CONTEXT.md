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
* [x] **Cấu hình Git & GitHub:** Kích hoạt Branch Protection Rule cho nhánh `main` (chỉ cho phép Owner bypass và cấm các collaborator khác push trực tiếp không qua PR).
* [x] **Tên miền & Vercel:** Cập nhật dự án trên Vercel và cấu hình Custom Domain riêng `ecomfpt.app` (cần trỏ DNS A/CNAME về Vercel).
* [x] **Đổi tên hiển thị Web:** Đổi tiêu đề Tab trình duyệt mặc định từ `frontend` thành **`E-Com FPT`** trong file `frontend/index.html`.
* [x] **Bộ hướng dẫn cài đặt:** Hoàn thành file `README.md` hướng dẫn cài đặt chi tiết bằng tiếng Việt bắt đầu từ `git clone` và `pnpm install`.

---

## 🚧 4. Trạng Thái Hiện Tại & Công Việc Đang Làm (Active Context)
* **Trạng thái deploy:** Frontend đang kết nối tên miền `ecomfpt.app` trên Vercel (đang đợi cấu hình DNS trỏ IP `76.76.21.21`).
* **Tính năng:** Đăng nhập, Đăng ký, và hiển thị Cửa hàng (Trang chủ) đang chạy tốt ở môi trường Local.

---

## 🔮 5. Kế Hoạch Tiếp Theo (Next Steps / Roadmap)
1. **Thiết lập DNS:** Hoàn tất cấu hình bản ghi A (`76.76.21.21`) và CNAME (`cname.vercel-dns.com`) để kích hoạt website chạy online.
2. **Quản lý Giỏ hàng (Cart Page):** Xây dựng trang Giỏ hàng và trang Thanh toán (Checkout) cho người dùng.
3. **Trang Quản lý Sản phẩm (Admin Dashboard):** Bổ sung giao diện quản trị Admin để Thêm/Sửa/Xóa sản phẩm trực tiếp từ Frontend.
4. **Kết nối Database thật:** Chuyển từ In-memory Database sang MongoDB hoặc PostgreSQL cho Backend.

---

## 📝 HƯỚNG DẪN CẬP NHẬT CHO AI:
Mỗi khi bạn (AI) thực hiện một thay đổi lớn:
1. Đọc lại file này để đảm bảo không đi lệch hướng thiết kế của dự án.
2. Cập nhật phần **3. Lịch Sử & Những Việc Đã Hoàn Thành** và **4. Trạng Thái Hiện Tại** tương ứng với những gì bạn vừa code xong.
