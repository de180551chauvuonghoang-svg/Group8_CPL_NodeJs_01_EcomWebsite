# 📘 Hướng Dẫn Chi Tiết Cách Thiết Lập Animation Trượt Đẩy Trang (Auth Slide Transition)

Tài liệu này hướng dẫn chi tiết cách hoạt động và các bước thiết lập hiệu ứng hoạt ảnh lướt đẩy ngang (horizontal push slide transition) khi chuyển đổi qua lại giữa trang **Đăng nhập (Login)** và **Đăng ký (Register)** bằng **Framer Motion** kết hợp **React Router v7 (react-router-dom ^7.15.1)**.

---

## 💡 Ý Tưởng Cốt Lõi (Core Concept)

Để tạo ra hiệu ứng lướt đẩy ngang liên tục (khi Login trượt đi thì Register trượt vào cùng lúc):
1. **Trang Login (Trượt sang Trái):**
   - **Vào trang:** Trượt từ bên ngoài phía trái màn hình (`-100%`) đi vào giữa (`0`).
   - **Ra trang:** Trượt tiếp từ giữa (`0`) đi sang bên trái màn hình (`-100%`).
2. **Trang Register (Trượt sang Phải):**
   - **Vào trang:** Trượt từ bên ngoài phía phải màn hình (`100%`) đi vào giữa (`0`).
   - **Ra trang:** Trượt tiếp từ giữa (`0`) đi sang bên phải màn hình (`100%`).

---

## 🛠️ Các Bước Thiết Lập Chi Tiết

### Bước 1: Đồng Bộ Hóa Định Tuyến Router (`App.tsx`)

Bình thường, React Router sẽ lập tức thay thế component cũ bằng component mới mà không đợi hoạt ảnh hoàn thành. Để giữ lại component cũ và chạy song song hoạt ảnh, chúng ta bọc `<Routes>` trong `<AnimatePresence>` của **Framer Motion**:

```tsx
import { useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

function AppContent() {
  const location = useLocation();

  return (
    <main style={{ overflow: 'hidden', position: 'relative' }}>
      {/* 1. Sử dụng mode="popLayout" thay vì "wait" */}
      <AnimatePresence mode="popLayout">
        
        {/* 2. Truyền location và key={location.pathname} để Framer Motion nhận diện route thay đổi */}
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AnimatePresence>
    </main>
  );
}
```

#### 📌 Giải thích thông số quan trọng:
* **`mode="popLayout"`**:
  * Chế độ này sẽ tách (pop) component đang biến mất ra khỏi dòng bố cục thông thường (layout flow) và chuyển nó sang trạng thái **`absolute`**.
  * Nhờ vậy, component mới có thể nhảy lên chiếm chỗ và chạy hoạt ảnh xuất hiện **đồng thời** cùng component cũ, thay vì phải đợi component cũ ẩn hẳn đi (như chế độ `wait`).
* **`location={location}` & `key={location.pathname}`**:
  * Giúp `<Routes>` báo cho `AnimatePresence` biết chính xác khi nào một component được render và khi nào bị hủy bỏ để kích hoạt hàm `exit` (thoát trang).

---

### Bước 2: Thiết Lập Hoạt Ảnh Cho Trang Login (`Login.tsx`)

Chúng ta import `motion` từ thư viện `framer-motion`, đổi thẻ `div` bao bọc bên ngoài thành `<motion.div>` và thiết lập các trạng thái hoạt ảnh:

```tsx
import { motion } from 'framer-motion';

export default function Login() {
  return (
    <motion.div
      className="min-h-screen w-full bg-background"
      // Trạng thái ban đầu trước khi xuất hiện (Từ bên trái trượt vào)
      initial={{ x: '-100%', opacity: 0 }}
      // Trạng thái hiển thị hoàn chỉnh
      animate={{ x: 0, opacity: 1 }}
      // Trạng thái khi người dùng nhấn nút chuyển sang trang Register (Trượt tiếp ra bên trái)
      exit={{ x: '-100%', opacity: 0 }}
      // Định nghĩa kiểu chuyển động mượt mà
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
    >
      {/* Nội dung trang Login của bạn */}
    </motion.div>
  );
}
```

---

### Bước 3: Thiết Lập Hoạt Ảnh Cho Trang Đăng Ký (`Register.tsx`)

Tương tự như Login, nhưng hướng trượt của Register được thiết kế ngược lại (phía bên Phải màn hình):

```tsx
import { motion } from 'framer-motion';

export default function Register() {
  return (
    <motion.div
      className="min-h-screen w-full bg-surface"
      // Trạng thái ban đầu trước khi xuất hiện (Từ bên phải trượt vào)
      initial={{ x: '100%', opacity: 0 }}
      // Trạng thái hiển thị hoàn chỉnh
      animate={{ x: 0, opacity: 1 }}
      // Trạng thái khi người dùng nhấn nút chuyển sang trang Login (Trượt ngược ra bên phải)
      exit={{ x: '100%', opacity: 0 }}
      // Định nghĩa kiểu chuyển động đồng bộ
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
    >
      {/* Nội dung trang Register của bạn */}
    </motion.div>
  );
}
```

---

## 🎨 Tránh Lỗi Lệch Layout & Thanh Cuộn Ngang (CSS Polish)

Khi biểu mẫu trượt ra khỏi màn hình (`-100%` hoặc `100%`), trình duyệt mặc định sẽ phát hiện phần tử nằm ngoài khung nhìn và tạo ra **thanh cuộn ngang** ở dưới đáy, làm giao diện bị méo mó, giật lắc.

Để khắc phục triệt để lỗi này, chúng ta định cấu hình cho phần tử cha chứa cả hai trang (`<main>` trong `App.tsx`) thuộc tính CSS sau:
```css
overflow: hidden;
position: relative;
```
* **`overflow: hidden`**: Ẩn đi toàn bộ những phần tử tạm thời trượt ra khỏi khung màn hình trong quá trình hoạt ảnh chạy.
* **`position: relative`**: Giữ mốc tọa độ cố định để hiệu ứng định vị `absolute` của `popLayout` hoạt động đúng mà không làm nhảy lệch layout tổng thể của trang web.

---

## 🚀 Cách Tùy Chỉnh Hoạt Ảnh Nâng Cao (Tips & Tricks)

Bạn có thể dễ dàng thay đổi kiểu chuyển động hoặc thời gian trượt bằng cách thay đổi giá trị của thuộc tính `transition`:

### 1. Tạo hiệu ứng lò xo (Spring Physics) - cực trẻ trung và sống động:
Thay vì trượt đều (`tween`), bạn có thể dùng thuộc tính lò xo đàn hồi tự nhiên:
```tsx
transition={{ type: 'spring', stiffness: 100, damping: 20 }}
```

### 2. Tăng/Giảm thời gian trượt:
Thay đổi thông số `duration` (tính bằng giây):
* Nhanh, dứt khoát: `duration: 0.3`
* Êm ái, sang trọng (mặc định hiện tại): `duration: 0.5`
