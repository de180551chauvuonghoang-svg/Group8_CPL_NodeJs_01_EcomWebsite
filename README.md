# 🛍️ E-Com FPT - Premium E-Commerce Platform

Chào mừng bạn đến với **E-Com FPT**, một nền tảng thương mại điện tử hiện đại, tối ưu hóa hiệu năng, được thiết kế với giao diện **Glassmorphic** sang trọng và xây dựng dưới dạng cấu trúc **pnpm Monorepo** cực kỳ chuyên nghiệp.

Dự án tích hợp đầy đủ công nghệ **React 19 + TypeScript + Vite** ở phía Frontend và **Node.js + Express** ở phía Backend.

---

## 🚀 Hướng Dẫn Cài Đặt Chi Tiết từ A - Z

Theo dõi các bước dưới đây để cài đặt dự án chạy trên máy tính của bạn:

### 1. Yêu Cầu Cài Đặt Sẵn (Prerequisites)
* **Node.js** phiên bản `18.x` trở lên.
* **pnpm** (Trình quản lý gói tối ưu hóa dung lượng). Nếu máy bạn chưa cài đặt `pnpm`, hãy chạy lệnh sau trong terminal/cmd để cài đặt toàn cục:
  ```bash
  npm install -g pnpm
  ```

---

### 2. Tải Mã Nguồn Về Máy (Clone Code)
Mở terminal/cmd trên máy tính của bạn và chạy lệnh sau để tải dự án từ GitHub:

```bash
git clone https://github.com/de180551chauvuonghoang-svg/Group8_CPL_NodeJs_01_EcomWebsite.git
```

Di chuyển vào thư mục dự án vừa tải về:
```bash
cd Group8_CPL_NodeJs_01_EcomWebsite
```

---

### 3. Cài Đặt Dependencies (Thư Viện Liên Quan)
Nhờ sức mạnh của **pnpm Workspaces**, bạn không cần phải truy cập từng thư mục con để cài đặt. Chỉ cần đứng ở **thư mục gốc** và chạy duy nhất lệnh dưới đây:

```bash
pnpm install
```
*Lệnh này sẽ tự động phân tích và cài đặt toàn bộ thư viện cần thiết cho cả Frontend, Backend và Root.*

---

### 4. Khởi Động Dự Án Ở Chế Độ Phát Triển (Development)
Để chạy đồng thời cả máy chủ Backend và Frontend ở chế độ phát triển, hãy chạy lệnh sau ở thư mục gốc:

```bash
pnpm dev
```

Sau khi chạy thành công:
* **Frontend (Vite + TS)** sẽ khởi động tại: [http://localhost:5173](http://localhost:5173)
* **Backend (API Server)** sẽ khởi động tại: [http://localhost:5000](http://localhost:5000)
* **Health Check API**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Tài Khoản Thử Nghiệm (Seed Credentials)

Hệ thống backend đã được thiết lập sẵn một cơ sở dữ liệu giả lập (In-memory Database) đi kèm với 2 tài khoản test nhanh:

| Vai trò (Role) | Email | Mật khẩu (Password) |
| :--- | :--- | :--- |
| **Khách hàng (Customer)** | `customer@ecom.com` | `password123` |
| **Quản trị viên (Admin)** | `admin@ecom.com` | `password123` |

*Giao diện Đăng nhập trên frontend cũng được tích hợp sẵn các nút **Đăng nhập nhanh** tiện lợi để bạn chuyển đổi vai trò ngay lập tức.*

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Frontend (`/frontend`)
* **React 19** + **TypeScript** (Static Typing an toàn dữ liệu).
* **Vite** (Bundler siêu nhanh cho thời gian khởi động chớp nhoáng).
* **Lucide React** (Bộ thư viện icon sắc nét, hiện đại).
* **Framer Motion** (Tạo các hiệu ứng chuyển động & micro-animations mượt mà).
* **Axios** (Thư viện gọi API chuyên nghiệp với cơ chế interceptor xử lý lỗi tập trung).

### Backend (`/backend`)
* **Node.js** + **Express.js** (RESTful API Server gọn nhẹ).
* **Cors** (Xử lý an toàn chia sẻ tài nguyên giữa các nguồn khác nhau).
* **Nodemon** (Tự động tải lại server khi phát hiện thay đổi mã nguồn).

---

## 🌐 Deploy Lên Vercel (Frontend)

Khi deploy thư mục `/frontend` lên Vercel:
1. Đặt **Root Directory** là `frontend`.
2. Vercel sẽ tự nhận diện preset là **Vite** và chạy lệnh cài đặt bằng `pnpm`.
3. Bổ sung một **Environment Variable** bắt buộc sau trong thiết lập Vercel:
   * **Key**: `VITE_API_BASE_URL`
   * **Value**: Địa chỉ API Backend đã được deploy của bạn (Ví dụ: `https://ten-backend.onrender.com/api`).

docker start n8n