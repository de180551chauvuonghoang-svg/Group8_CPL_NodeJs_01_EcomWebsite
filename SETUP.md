# Setup từ đầu trên máy trắng

Hướng dẫn dựng lại dự án (backend + frontend) trên một máy hoàn toàn mới, từ file zip/clone code.

## 0. Yêu cầu cài sẵn trên máy

- **Node.js ≥ 18** — kiểm tra: `node -v`
- **pnpm** — nếu chưa có:
  ```bash
  npm install -g pnpm
  ```
- **SQL Server** (Express/Developer đều được), yêu cầu:
  - Bật **SQL Server Authentication** (Mixed Mode), không chỉ Windows Auth
  - Bật **TCP/IP** trong SQL Server Configuration Manager → SQL Server Network Configuration → Protocols, cổng mặc định `1433`
  - Có 1 login SQL (vd: `sa`) với mật khẩu đã biết
  - Không cần cài driver ODBC riêng — package `mssql` dùng driver JS thuần (tedious)

## 1. Giải nén / clone code

```bash
cd đường/dẫn/tới/thư-mục-muốn-chứa-project
git clone <repo-url> Group8_CPL_NodeJs_01_EcomWebsite
cd Group8_CPL_NodeJs_01_EcomWebsite
```

(Nếu bạn giải nén từ file zip thì bỏ qua `git clone`, chỉ cần `cd` vào thư mục vừa giải nén.)

## 2. Cài dependencies

Chạy 1 lệnh duy nhất ở thư mục gốc (pnpm workspace tự cài cho cả `backend` và `frontend`):

```bash
pnpm install
```

## 3. Tạo file cấu hình `backend/.env`

File `.env` bị `.gitignore` nên **không có sẵn** nếu code lấy từ git clone. Copy từ file mẫu rồi sửa lại:

**Windows (cmd):**
```cmd
copy backend\.env.example backend\.env
```

**PowerShell:**
```powershell
Copy-Item backend\.env.example backend\.env
```

**macOS/Linux/Git Bash:**
```bash
cp backend/.env.example backend/.env
```

Mở `backend/.env` và điền các giá trị sau:

| Biến | Bắt buộc? | Ghi chú |
|---|---|---|
| `ACCESS_TOKEN_SECRET` | ✅ Có | Chuỗi bí mật bất kỳ để ký JWT (vd: chuỗi random 40+ ký tự). Thiếu biến này thì **login sẽ lỗi**. |
| `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`, `DB_INSTANCE` | ✅ Có | Khớp với SQL Server đã cài ở bước 0. Để `DB_INSTANCE=` (trống) nếu dùng default instance, hoặc `SQLEXPRESS` nếu cài bản Express. |
| `SEED_PASSWORD` | Khuyến nghị | Mật khẩu cho các tài khoản test tự seed (`admin@ecom.com`, `customer@ecom.com`). |
| `EMAIL_USER`, `EMAIL_PASS` | Tuỳ chọn | Để trống → OTP quên mật khẩu tự log ra console (chế độ mock). Điền Gmail + App Password thật nếu muốn gửi mail OTP thật. |
| `CLOUDINARY_*` | Tuỳ chọn | Chỉ cần nếu test upload ảnh. |
| `GOOGLE_CLIENT_ID` | Tuỳ chọn | Chỉ cần nếu test đăng nhập Google. |
| `MOMO_*` | Tuỳ chọn | Chỉ cần nếu test thanh toán MoMo. |

## 4. Chạy dự án

Ở thư mục gốc:

```bash
pnpm dev
```

Lệnh này chạy song song backend (nodemon, cổng `5000`) và frontend (Vite, cổng `5173`).

Lần chạy đầu tiên, backend sẽ **tự động**:
- Tạo database (nếu SQL Server chưa có database đó)
- Tạo toàn bộ 24 bảng + bảng AI
- Seed dữ liệu mẫu: user test, sản phẩm, category, coupon, đơn hàng mẫu...

→ Không cần chạy script SQL thủ công, chỉ cần SQL Server instance đã kết nối được.

## 5. Kiểm tra đã chạy đúng

- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health
- Swagger API docs: http://localhost:5000/api-docs
- Đăng nhập thử:
  - Customer: `customer@ecom.com` / giá trị `SEED_PASSWORD`
  - Admin: `admin@ecom.com` / giá trị `SEED_PASSWORD`

## Sự cố thường gặp

- **Login báo lỗi 500 / "ACCESS_TOKEN_SECRET is not configured"** → chưa điền `ACCESS_TOKEN_SECRET` trong `backend/.env`.
- **Backend không kết nối được DB (`ELOGIN`/`ECONNREFUSED`)** → kiểm tra lại `DB_USER`/`DB_PASSWORD`/`DB_SERVER`/`DB_INSTANCE`, và SQL Server đã bật TCP/IP + SQL Authentication chưa.
- **Gửi email OTP báo `535 Bad Credentials`** → `EMAIL_USER`/`EMAIL_PASS` sai hoặc App Password không thuộc đúng tài khoản Gmail đó; tạo lại App Password mới trong Google Account → Security → App passwords.
