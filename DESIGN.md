# 🎨 E-Com FPT - DESIGN SYSTEM (GOOGLE STITCH SPECIFICATION)

> **LƯU Ý DÀNH CHO GOOGLE STITCH & AI AGENTS:** Đây là tài liệu đặc tả hệ thống thiết kế (Design System) của dự án **E-Com FPT**. Hãy sử dụng các định nghĩa, màu sắc và class CSS dưới đây khi thiết kế hoặc sinh ra (vibe coding) bất kỳ giao diện người dùng nào để đảm bảo tính đồng nhất tuyệt đối.

---

## 🎨 1. Hệ Màu Sắc (Color System - Premium Dark Theme)

Chúng tôi sử dụng một bảng màu tối cao cấp (Sleek Dark HSL), kết hợp với hiệu ứng chuyển sắc rực rỡ làm điểm nhấn.

| Token | Giá trị Hex / HSL | Mô tả |
| :--- | :--- | :--- |
| `bg-primary` | `#0a0b10` | Màu nền chính toàn trang |
| `bg-secondary` | `#121420` | Màu nền của container phụ |
| `bg-tertiary` | `#1a1d30` | Màu nền của các phần tử nhỏ hơn |
| `text-primary` | `#f3f4f6` | Màu chữ chính (sáng) |
| `text-secondary`| `#9ca3af` | Màu chữ phụ (trung tính) |
| `text-muted` | `#6b7280` | Màu chữ bị làm mờ / mô tả |
| `accent-primary`| `hsl(263, 85%, 65%)` | Tím sáng (Radiant Violet) |
| `accent-secondary`| `hsl(320, 80%, 60%)` | Hồng rực rỡ (Vibrant Pink/Magenta) |
| `accent-gradient`| `linear-gradient(135deg, accent-primary, accent-secondary)` | Giải chuyển sắc chủ đạo |

---

## ✨ 2. Hiệu Ứng Thẩm Mỹ Glassmorphism (Glassmorphism & Shadows)

Đây là phong cách đặc trưng nhất của giao diện E-Com FPT, tạo cảm giác mờ ảo, hiện đại và cao cấp:

* **Nền Glassmorphic (`--glass-bg`):** `rgba(18, 20, 32, 0.7)` kết hợp với `backdrop-filter: blur(16px)`.
* **Viền kính (`--glass-border`):** `1px solid rgba(255, 255, 255, 0.06)`.
* **Vùng phát sáng (`--glass-glow`):** `rgba(139, 92, 246, 0.15)`.
* **Bóng mờ (`--shadow-lg`):** `0 20px 40px -5px rgba(0, 0, 0, 0.5), 0 0 50px -10px rgba(139, 92, 246, 0.2)`.

---

## 📐 3. Bo Góc & Khoảng Cách (Radius & Borders)

* **Bo góc nhỏ (`--radius-sm`):** `8px` (dành cho input, badge).
* **Bo góc trung bình (`--radius-md`):** `14px` (dành cho nút bấm, card sản phẩm, header).
* **Bo góc lớn (`--radius-lg`):** `20px` (dành cho modal, các phần lớn của trang).
* **Bo góc tròn hẳn (`--radius-full`):** `9999px` (dành cho avatar, badge bo tròn).
* **Màu viền tiêu chuẩn (`--border-color`):** `rgba(255, 255, 255, 0.08)`.

---

## 🔤 4. Phông Chữ & Kiểu Dáng (Typography)

* **Font chữ chủ đạo:** `'Outfit'`, sans-serif (Google Fonts).
* **Độ dày phổ biến:** `300` (Light), `400` (Regular), `500` (Medium), `600` (Semi-Bold), `700` (Bold), `800` (Extra-Bold).
* **Heading (h1, h2, h3...):**
  * `font-weight: 700` hoặc `800`.
  * `letter-spacing: -0.02em`.
  * `line-height: 1.2`.

---

## 🧱 5. Các Class Tiêu Chuẩn Trong Codebase (Core CSS Classes)

Khi code UI, bạn phải tái sử dụng các class có sẵn tại `index.css` này:

### 1. Card / Panel Glassmorphic
```css
/* Sử dụng class .glass-panel */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-md);
  transition: var(--transition-smooth);
}
```

### 2. Nút bấm Chuyển Sắc (Primary Gradient Button)
```css
/* Sử dụng class .gradient-btn */
.gradient-btn {
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 15px -3px rgba(139, 92, 246, 0.4);
  transition: var(--transition-smooth);
}
```

### 3. Nút bấm Phụ (Secondary Button)
```css
/* Sử dụng class .secondary-btn */
.secondary-btn {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
```

### 4. Ô Nhập Liệu (Input Field)
```css
/* Sử dụng class .input-field */
.input-field {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}
```

### 5. Nhãn Trạng Thái (Status Badges)
* `badge badge-success` (Thành công - Xanh lá)
* `badge badge-warning` (Cảnh báo - Vàng)
* `badge badge-error` (Lỗi - Đỏ)
* `badge badge-info` (Thông tin - Xanh dương)

---

## 🤖 CHỈ THỊ DÀNH CHO VIỆC TẠO GIAO DIỆN (Generation Guidelines):
1. **Thiết kế Responsive:** Sử dụng Flexbox và CSS Grid. Đảm bảo giao diện hiển thị xuất sắc cả trên Mobile và Desktop.
2. **Icons:** Sử dụng thư viện `lucide-react` để đồng bộ về nét vẽ thanh lịch, mỏng nhẹ.
3. **Hiệu ứng hover:** Tất cả các thành phần tương tác (nút bấm, sản phẩm, thẻ danh mục) đều phải có hiệu ứng chuyển động nhỏ (như nhấc lên `-2px`, tăng bóng mờ, đổi viền sáng) thông qua `framer-motion` hoặc transition của CSS.
