# Hướng Dẫn Kỹ Thuật: Tối Ưu Hóa Dự Án Với PNPM (Performant NPM)

Tài liệu này cung cấp cái nhìn chi tiết về **pnpm** (Performant Node Package Manager), cách hoạt động kỹ thuật, lợi ích thực tế đối với dự án hiện tại (`ecomfpt`), hướng dẫn cài đặt và các lệnh sử dụng thực tế.

---

## 1. Cơ Chế Kỹ Thuật: PNPM Hoạt Động Như Thế Nào?

Khác biệt cốt lõi giữa **pnpm** và các trình quản lý truyền thống (**npm**, **yarn v1**) nằm ở cách tổ chức thư mục `node_modules` và cơ chế lưu trữ file.

### Sơ đồ so sánh cách lưu trữ thư viện:

```mermaid
graph TD
    subgraph Cơ chế NPM / YARN truyền thống (Bản sao vật lý trùng lặp)
        ProjA[Dự án A] --> node_modulesA[node_modules/lodash - 5MB]
        ProjB[Dự án B] --> node_modulesB[node_modules/lodash - 5MB]
    end

    subgraph Cơ chế PNPM (Global Store + Hard Links)
        Store[(Global Store ở ổ cứng: ~/.pnpm-store)]
        ProjC[Dự án C] -. Hard Link .-> Store
        ProjD[Dự án D] -. Hard Link .-> Store
    end
```

### Cơ chế kỹ thuật chi tiết:
1. **Global Content-Addressable Store:**
   * Tất cả các file của các package tải về từ npm registry được lưu trữ tại một thư mục duy nhất trên ổ cứng của bạn (ví dụ: `~/.pnpm-store` trên Windows hoặc Linux).
   * File được băm (hash) để định danh. Nếu hai package khác nhau dùng chung một file giống hệt nhau, pnpm chỉ lưu file đó đúng **một lần** duy nhất trên đĩa.
2. **Hard Links (Liên kết cứng):**
   * Khi bạn chạy `pnpm install`, pnpm không copy code từ Store về dự án của bạn. Thay vào đó, nó tạo các **Hard Links** trỏ từ `node_modules` của dự án đến vị trí của file đó trong Global Store.
   * Do đó, việc cài đặt gần như không tiêu tốn thêm dung lượng ổ cứng thực tế nào và diễn ra trong nháy mắt.
3. **Symlinks (Liên kết mềm) cấu trúc cây:**
   * pnpm tạo ra một thư mục `.pnpm` ẩn bên trong `node_modules` để chứa tất cả các dependencies thực tế dạng phẳng (flattened flat layout).
   * Sau đó, nó sử dụng Symlinks để chỉ hiển thị các thư viện bạn khai báo trong `package.json` ra ngoài lớp ngoài cùng của `node_modules`. Điều này ngăn chặn lỗi **Phantom Dependencies** (mã nguồn vô tình import một thư viện phụ thuộc gián tiếp mà không khai báo).

---

## 2. PNPM Giúp Gì Cho Dự Án Hiện Tại (`ecomfpt`)?

Dự án `ecomfpt` của bạn là một mô hình **Multi-package / Monorepo** thực tế với cấu trúc:
* Thư mục gốc (`ecomfpt/node_modules`)
* Backend (`ecomfpt/backend/node_modules`)
* Frontend (`ecomfpt/frontend/node_modules`)

### Những lợi ích to lớn khi áp dụng pnpm cho `ecomfpt`:

1. **Siêu tiết kiệm dung lượng ổ cứng:**
   * Hiện tại, bạn phải cài đặt `node_modules` ở 3 nơi độc lập. Nhiều thư viện phụ thuộc trùng lặp giữa React (Frontend) và Node.js (Backend) sẽ bị sao chép nhiều lần.
   * Sử dụng pnpm giúp dung lượng ổ cứng của dự án giảm tới **60% - 80%**.
2. **Tốc độ cài đặt thần tốc:**
   * Mỗi khi chạy lệnh setup dự án mới hoặc khi pull code mới về, việc cài đặt thư viện cho 3 thư mục bằng `npm` tốn vài phút. Với `pnpm`, tốc độ cài đặt giảm xuống chỉ còn **vài giây**.
3. **Hỗ trợ Monorepo Workspace cực mạnh:**
   * pnpm tích hợp sẵn tính năng Workspace giúp quản lý nhiều dự án con cực kỳ hiệu quả mà không cần cài đặt các công cụ phức tạp bên ngoài.

---

## 3. Cách Cài Đặt PNPM Trên Hệ Điều Hành Windows

Có 2 cách phổ biến và đơn giản nhất để cài đặt `pnpm` trên Windows:

### Cách 1: Sử dụng NPM (Nếu máy đã cài sẵn Node.js và NPM) - KHUYÊN DÙNG
Mở PowerShell hoặc Command Prompt và chạy lệnh cài đặt toàn cục:
```powershell
npm install -g pnpm
```

### Cách 2: Sử dụng Script cài đặt độc lập (Không cần NPM)
Mở PowerShell và chạy lệnh sau để tải và cài đặt trực tiếp bản build ổn định nhất:
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### Kiểm tra cài đặt thành công:
```powershell
pnpm -v
```
*(Nếu hiển thị số phiên bản, ví dụ `10.x.x`, nghĩa là bạn đã cài đặt thành công!)*

---

## 4. Hướng Dẫn Sử Dụng PNPM Cho Dự Án `ecomfpt`

Để chuyển đổi dự án hiện tại sang sử dụng `pnpm` hiệu quả nhất, hãy làm theo các bước dưới đây:

### Bước 1: Dọn dẹp các thư mục `node_modules` cũ
Bạn cần xóa toàn bộ `node_modules` và các file `package-lock.json` cũ để tránh xung đột:
```powershell
# Xóa node_modules ở thư mục gốc
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Xóa node_modules ở backend
Remove-Item -Recurse -Force backend/node_modules
Remove-Item -Force backend/package-lock.json

# Xóa node_modules ở frontend
Remove-Item -Recurse -Force frontend/node_modules
Remove-Item -Force frontend/package-lock.json
```

### Bước 2: Khai báo Workspace của pnpm (Tùy chọn nhưng Rất Khuyên Dùng)
Tạo một file có tên `pnpm-workspace.yaml` tại thư mục gốc để pnpm biết cấu trúc Monorepo của dự án:
```yaml
packages:
  - 'backend'
  - 'frontend'
```

### Bước 3: Cài đặt thư viện bằng pnpm
Chỉ cần đứng tại thư mục gốc và chạy duy nhất lệnh sau:
```powershell
pnpm install
```
*pnpm sẽ tự động phân tích và cài đặt cực nhanh cho tất cả các sub-folders (frontend, backend) và liên kết chúng lại với nhau.*

### Bước 4: Các lệnh chạy dự án hàng ngày
Thay thế tiền tố `npm` bằng `pnpm`:

* **Chạy dự án (Cả BE và FE):**
  ```powershell
  pnpm start
  ```
  hoặc
  ```powershell
  pnpm dev
  ```
* **Chạy riêng Backend:**
  ```powershell
  pnpm --filter backend dev
  ```
* **Chạy riêng Frontend:**
  ```powershell
  pnpm --filter frontend dev
  ```
* **Cài đặt thêm thư viện mới (ví dụ: `axios` vào frontend):**
  ```powershell
  pnpm --filter frontend add axios
  ```
