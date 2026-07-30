# Hướng Dẫn Sử Dụng Kênh Người Bán

Tài liệu này dùng để đào tạo seller thao tác trên giao diện hiện tại của Volitify. Nội dung bám theo chức năng đang có trong code, không mô tả chức năng dự kiến như thể đã hoàn thành.

## 1. Phạm vi và điều kiện sử dụng

- Người dùng phải đăng nhập.
- Tài khoản có `role = seller` mới vào được các đường dẫn `/seller/*`.
- Tài khoản thường khi mở Kênh người bán sẽ được chuyển đến trang đăng ký shop.
- Kênh người bán hiện gồm: Tổng quan, Sản phẩm, Kho hàng, Đơn hàng, Trả hàng, Tài chính, Đánh giá, Voucher, Hộp thư và Hồ sơ shop.
- Nút hình ngôi nhà ở đầu thanh bên đưa seller về giao diện mua hàng.
- Chuông thông báo và số tin chưa đọc được cập nhật định kỳ; chat được cập nhật realtime qua Socket.IO.

## 2. Đăng ký trở thành seller

### Cách mở

1. Đăng nhập bằng tài khoản user.
2. Chọn **Đăng ký bán hàng/Kênh người bán** trên header.
3. Hệ thống mở `/become-seller`.

### Thông tin có thể nhập

- Tên shop.
- Số điện thoại shop.
- Địa chỉ shop và địa chỉ lấy hàng.
- Mô tả shop.
- Logo và ảnh bìa.
- Họ tên định danh và số CCCD.
- Ngân hàng, số tài khoản và chủ tài khoản.

### Điều kiện hợp lệ trên giao diện

- Tên shop, số điện thoại và địa chỉ shop là bắt buộc.
- Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng `0`.
- CCCD không bắt buộc; nếu nhập phải có đúng 12 chữ số.
- Số tài khoản không bắt buộc; nếu nhập phải có từ 6 đến 20 chữ số.
- Ảnh chỉ nhận JPG, PNG hoặc WebP; mỗi ảnh tối đa 5 MB.

### Sau khi đăng ký thành công

- FE nhận token và thông tin user mới từ API.
- Phiên đăng nhập được cập nhật thành seller.
- Người dùng được chuyển thẳng đến `/seller/dashboard`.
- Việc tên shop bị trùng hoặc dữ liệu nghiệp vụ không hợp lệ vẫn được backend kiểm tra lại và trả thông báo.

## 3. Bố cục chung Kênh người bán

### Thanh điều hướng

| Mục        | Mục đích                                             |
| ---------- | ---------------------------------------------------- |
| Tổng quan  | Việc cần làm, KPI, biểu đồ và sản phẩm bán chạy      |
| Sản phẩm   | Tạo, sửa, xóa, ẩn/hiện sản phẩm và flash sale        |
| Kho hàng   | Cảnh báo sắp hết hàng, điều chỉnh kho và lịch sử kho |
| Đơn hàng   | Xử lý từng sản phẩm thuộc shop trong các đơn         |
| Trả hàng   | Duyệt, từ chối và xác nhận đã nhận hàng trả          |
| Tài chính  | Đối soát doanh thu, voucher và giá trị trả hàng      |
| Đánh giá   | Xem review và phản hồi khách hàng                    |
| Voucher    | Quản lý voucher và xem hiệu quả sử dụng              |
| Hộp thư    | Chat realtime với từng customer                      |
| Hồ sơ shop | Cập nhật thông tin công khai, định danh và ngân hàng |

### Chuông thông báo

- Badge đỏ là tổng số thông báo chưa đọc.
- Bấm chuông để xem tối đa 8 thông báo gần nhất.
- Bấm một thông báo sẽ đánh dấu đã đọc và chuyển đến màn hình liên quan.
- **Đọc tất cả** đánh dấu toàn bộ thông báo là đã đọc.
- Điều hướng hiện tại:
  - Tin nhắn mới → Hộp thư.
  - Review mới → Đánh giá, lọc review chưa phản hồi.
  - Yêu cầu trả hàng → Trả hàng, lọc Chờ xử lý.
  - Sắp hết/hết hàng → Kho hàng.
  - Người theo dõi mới → Tổng quan.
  - Các thông báo đơn hàng khác → Đơn hàng.

### Badge Hộp thư

- Hiển thị tổng tin nhắn customer chưa đọc.
- Từ 10 tin trở lên hiển thị `9+`.
- Badge được đồng bộ từ danh sách chat và sự kiện chat realtime.

## 4. Trang Tổng quan

Đường dẫn: `/seller/dashboard`.

### 4.1 Việc cần làm

Khu vực này được đưa lên đầu để seller ưu tiên tác vụ vận hành. Bấm vào từng ô để mở đúng màn hình xử lý:

| Ô                    | Ý nghĩa                          | Khi bấm                           |
| -------------------- | -------------------------------- | --------------------------------- |
| Đơn cần xử lý        | Đơn đang ở `pending_fulfillment` | Mở Đơn hàng với bộ lọc Chờ xử lý  |
| Đơn xử lý trễ        | Đơn chờ shop xử lý quá 24 giờ    | Mở Đơn hàng với bộ lọc Chờ xử lý  |
| Tin chưa đọc         | Tin customer đang chờ phản hồi   | Mở Hộp thư                        |
| Sản phẩm hết hàng    | Sản phẩm active có stock bằng 0  | Mở Kho hàng                       |
| Sắp hết hàng         | Stock đã chạm ngưỡng cảnh báo    | Mở Kho hàng                       |
| Review chưa phản hồi | Review chưa có seller reply      | Mở Đánh giá với lọc Chưa phản hồi |
| Yêu cầu trả hàng     | Return đang chờ seller xử lý     | Mở Trả hàng với lọc Chờ xử lý     |

### 4.2 Các chỉ số nhanh

- **Sản phẩm**: tổng số sản phẩm của shop; bấm để mở Quản lý sản phẩm.
- **Đơn hàng**: tổng đơn hợp lệ của shop; bấm để mở Quản lý đơn hàng.
- **Doanh thu**: doanh thu gộp từ các item đã giao thành công.
- Đơn/item đã hủy không được tính như doanh thu hoàn thành.

### 4.3 Chọn kỳ thống kê

Seller có thể chọn:

- **Ngày**: mặc định 30 ngày gần nhất; khoảng tùy chỉnh tối đa 366 ngày.
- **Tháng**: mặc định 12 tháng gần nhất; khoảng tùy chỉnh tối đa 60 tháng.
- **Năm**: mặc định 5 năm gần nhất; khoảng tùy chỉnh tối đa 10 năm.

Quy trình:

1. Chọn Ngày, Tháng hoặc Năm.
2. Có thể để trống ngày để dùng kỳ mặc định của hệ thống.
3. Nếu lọc tùy chỉnh, phải chọn đủ Từ ngày và Đến ngày.
4. Từ ngày không được lớn hơn Đến ngày.
5. Bấm **Áp dụng** để tải số liệu mới.
6. Bấm **Đặt lại** để quay về khoảng mặc định của kỳ đang chọn.
7. Bấm biểu tượng làm mới để tải lại KPI, việc cần làm và biểu đồ.

### 4.4 Ý nghĩa KPI phân tích

- **Doanh thu gộp**: tổng giá trị item đã chuyển sang `delivered`, trước các mô hình quyết toán/rút tiền.
- **Đơn đã giao**: số order có item của shop đã giao thành công trong kỳ.
- **Đơn phát sinh**: số đơn được tạo trong kỳ.
- **Sản phẩm đã đặt**: tổng quantity được đặt trong kỳ.
- **Sản phẩm đã bán**: tổng quantity đã giao thành công.
- **Giá trị trung bình đơn đã giao**: doanh thu gộp chia cho số đơn đã giao.

### 4.5 Biểu đồ doanh thu và đơn hàng

- Cột thể hiện `gross_revenue` của từng ngày/tháng/năm.
- Đường thể hiện `orders_created` của cùng bucket thời gian.
- Trục X dùng nhãn thời gian backend trả về.
- Bucket không có dữ liệu vẫn được hiển thị bằng 0 để đường thời gian không bị đứt.
- Khi toàn bộ dữ liệu bằng 0, giao diện giữ vùng biểu đồ và hiện trạng thái chưa có dữ liệu.

### 4.6 Biểu đồ trạng thái

Biểu đồ stacked thể hiện số lần item chuyển vào từng trạng thái trong mỗi bucket:

- Chờ xử lý.
- Chờ lấy hàng.
- Đang giao.
- Đã giao.
- Đã hủy.

Đây là **lịch sử chuyển trạng thái trong kỳ**, không phải số lượng đang nằm ở trạng thái đó tại thời điểm hiện tại. Khu vực **Trạng thái hiện tại** bên cạnh mới là số item đang ở từng trạng thái.

### 4.7 Top sản phẩm

- Chỉ tính sản phẩm đã giao thành công.
- Hiển thị số lượng bán và doanh thu gộp.
- Không dùng đơn hủy hoặc đơn chưa giao để xếp hạng.

## 5. Quản lý Sản phẩm

Đường dẫn: `/seller/products`.

### 5.1 Tìm và lọc

- Tìm theo tên hoặc SKU.
- Lọc theo danh mục.
- Lọc Tất cả, Đang bán, Đã ẩn, Sắp hết hoặc Hết hàng.
- Sắp xếp mới nhất, tên, giá hoặc tồn kho.
- Bộ lọc được giữ trên URL, nên có thể refresh hoặc chia sẻ đúng màn hình đang xem.
- Danh sách phân trang, mỗi trang hiện 12 sản phẩm.

### 5.2 Tạo sản phẩm

1. Bấm **Thêm sản phẩm**.
2. Nhập tên, giá, tồn kho, SKU, ngưỡng cảnh báo, danh mục và mô tả.
3. Tải tối thiểu một ảnh, tối đa 8 ảnh.
4. Chọn ảnh đại diện bằng thao tác đặt ảnh chính.
5. Chọn trạng thái hiển thị.
6. Bấm lưu.

Điều kiện FE:

- Tên, giá, danh mục và SKU là bắt buộc.
- Giá phải là số hữu hạn lớn hơn 0.
- Tồn kho phải là số nguyên không âm.
- SKU dài 3-100 ký tự, chỉ gồm chữ in hoa, số, dấu `.`, `_`, `-`.
- Ngưỡng cảnh báo là số nguyên từ 0 đến 1.000.000.
- Phải có ít nhất một ảnh.
- Mô tả tối đa 5.000 ký tự.

### 5.3 Sửa sản phẩm

- Bấm nút sửa trên card sản phẩm.
- Form được điền từ dữ liệu hiện tại.
- Nếu thay đổi số tồn kho, phải nhập lý do từ 3 đến 255 ký tự để tạo dấu vết điều chỉnh.
- Có thể đổi trạng thái active/inactive để hiện hoặc ẩn sản phẩm.

### 5.4 Xóa sản phẩm

- Bấm nút xóa và xác nhận trong hộp thoại.
- Sau khi API thành công, danh sách được tải lại.
- Nếu sản phẩm đang được tham chiếu bởi dữ liệu nghiệp vụ, backend có thể từ chối; giao diện hiển thị message trả về.

### 5.5 Flash sale

1. Chọn **Tạo sale** trên sản phẩm.
2. Nhập giá sale.
3. Chọn thời điểm bắt đầu và kết thúc.
4. Bấm tạo.

Điều kiện:

- Giá sale lớn hơn 0 và nhỏ hơn giá gốc.
- Phải có đủ hai mốc thời gian.
- Thời gian kết thúc phải sau thời gian bắt đầu.
- Sale đang chạy hoặc sắp chạy được gắn nhãn trên sản phẩm.
- Bấm **Ngừng sale** để gọi thao tác dừng/xóa flash sale hiện tại.
- Khi checkout, backend kiểm tra lại giá sale tại đúng thời điểm đặt hàng; giá lưu cũ trong cart không đảm bảo được mua theo giá đã hết hạn.

## 6. Quản lý Kho hàng

Đường dẫn: `/seller/inventory`.

### 6.1 Tab Sắp hết hàng

- Chỉ hiện product/variant đang active có stock nhỏ hơn hoặc bằng ngưỡng cảnh báo.
- `stock = 0` hiển thị Hết hàng.
- `0 < stock <= threshold` hiển thị Sắp hết hàng.
- Có phân trang và nút làm mới.

### 6.2 Điều chỉnh kho

1. Bấm **Điều chỉnh kho** tại một sản phẩm.
2. Chọn **Nhập kho** hoặc **Điều chỉnh thủ công**.
3. Nhập số lượng thay đổi và lý do.
4. Kiểm tra tồn kho sau thay đổi rồi xác nhận.

Rule:

- Số lượng phải là số nguyên khác 0.
- Nhập kho chỉ nhận số dương.
- Điều chỉnh thủ công có thể tăng hoặc giảm.
- Không được làm tồn kho mới nhỏ hơn 0.
- Lý do dài 3-255 ký tự.
- Thành công sẽ tải lại sản phẩm, cảnh báo kho và lịch sử.

### 6.3 Ngưỡng cảnh báo

- Bấm sửa ngưỡng tại sản phẩm.
- Giá trị phải là số nguyên từ 0 đến 1.000.000.
- Ngưỡng 0 nghĩa là chỉ cảnh báo khi hết hàng.

### 6.4 Tab Lịch sử kho

Có thể lọc theo:

- Sản phẩm/SKU.
- Loại: Bán hàng, Hoàn kho do hủy đơn, Nhập kho, Điều chỉnh thủ công, Hoàn hàng/hoàn tiền.
- Từ ngày và đến ngày.

Mỗi dòng hiển thị dạng `10 → 7 (-3)` hoặc `7 → 12 (+5)`, lý do, người thao tác và thời gian. Từ ngày không được sau Đến ngày.

## 7. Quản lý Đơn hàng

Đường dẫn: `/seller/orders`.

### 7.1 Tìm kiếm và trạng thái

- Tìm theo mã đơn hoặc tên sản phẩm.
- Lọc Chờ xử lý, Chờ lấy hàng, Đang giao, Đã giao hoặc Đã hủy.
- Mỗi item trong đơn có trạng thái riêng vì một đơn customer có thể chứa nhiều shop.
- Seller chỉ thấy item thuộc shop mình.

### 7.2 Vòng đời thao tác

| Trạng thái hiện tại | Thao tác có thể làm          |
| ------------------- | ---------------------------- |
| Chờ xử lý           | Xác nhận đóng gói hoặc Hủy   |
| Chờ lấy hàng        | Bắt đầu giao hoặc Hủy        |
| Đang giao           | Xác nhận Đã giao             |
| Đã giao             | Không còn nút đổi trạng thái |
| Đã hủy              | Không còn nút đổi trạng thái |

- Không thể nhảy thẳng từ Chờ xử lý sang Đã giao.
- Hủy đơn bắt buộc nhập lý do.
- Mã vận đơn hiện là tùy chọn, tối đa 100 ký tự, vì tích hợp đơn vị vận chuyển chưa hoàn thiện.
- Gửi lại đúng trạng thái có thể được backend coi là không thay đổi và không tạo history thừa.

### 7.3 Xem hành trình

- Bấm **Hành trình** trên đơn.
- FE gọi timeline và mở lịch sử từng item.
- Seller thấy trạng thái cũ, trạng thái mới, thời gian, nguồn thay đổi và người thao tác nếu API cung cấp.
- Sau khi cập nhật trạng thái, timeline đang mở được tải lại.

## 8. Quản lý Trả hàng

Đường dẫn: `/seller/returns`.

### 8.1 Danh sách

- Tìm theo mã đơn, sản phẩm hoặc customer.
- Lọc Tất cả, Chờ xử lý, Đã chấp nhận, Đã từ chối hoặc Đã nhận hàng.
- Bấm một dòng để mở panel chi tiết.

### 8.2 Xử lý yêu cầu

- Yêu cầu `requested`:
  - **Chấp nhận**: phản hồi có thể để trống.
  - **Từ chối**: bắt buộc nhập lý do từ 3 ký tự.
- Yêu cầu `approved`:
  - Bấm xác nhận đã nhận hàng để gửi trạng thái `item_returned`.
- Sau khi nhận hàng thành công, hệ thống backend cộng lại tồn kho, ghi lịch sử kho và gửi thông báo cho customer.
- Panel chi tiết hiển thị số lượng trả, giá trị, lý do và timeline xử lý.

## 9. Tài chính cửa hàng

Đường dẫn: `/seller/finance`.

### 9.1 Bộ lọc

- Tìm theo mã đơn, sản phẩm hoặc customer.
- Chọn Từ ngày và Đến ngày.
- Chọn Tất cả giao dịch, Bán hàng hoặc Trả hàng.
- Bấm **Áp dụng** mới dùng bộ lọc đang nhập.
- URL lưu bộ lọc đã áp dụng; refresh trang vẫn giữ đúng khoảng.

Rule ngày:

- Phải chọn đủ cả Từ ngày và Đến ngày hoặc để trống cả hai.
- Từ ngày không được sau Đến ngày.
- Đến ngày không được lớn hơn ngày hiện tại theo múi giờ Việt Nam.
- Khu vực **Khoảng đang xem** hiển thị khoảng đã áp dụng; nếu không lọc sẽ ghi Toàn bộ thời gian.

### 9.2 Ý nghĩa số liệu

- **Doanh thu gộp**: tổng doanh thu đã ghi nhận theo rule backend.
- **Giảm qua voucher**: tổng phần giảm giá gắn với giao dịch.
- **Giá trị trả hàng**: tổng giá trị return trong phạm vi lọc.
- **Doanh thu ước tính**: giá trị ròng sau giảm và trả hàng theo response.
- **Đơn đã giao**, **Đơn đang xử lý**, **Doanh thu chờ ghi nhận** là thông tin đối soát bổ sung.

### 9.3 Lịch sử giao dịch

- Hiển thị giao dịch bán hoặc trả hàng.
- Có mã đơn, sản phẩm, customer, doanh thu gộp, giảm/hoàn, giá trị ròng và thời gian ghi nhận.
- Trang hiện chỉ đọc để đối soát; chưa có ví shop hoặc yêu cầu rút tiền.

## 10. Đánh giá của khách hàng

Đường dẫn: `/seller/reviews`.

- Lọc theo số sao.
- Lọc Tất cả, Đã phản hồi hoặc Chưa phản hồi.
- Mỗi review hiển thị sản phẩm, customer, số sao, thời gian, tiêu đề, nội dung và nhãn Đã mua hàng khi có `is_verified`.
- Bấm phản hồi, nhập nội dung rồi gửi.
- Phản hồi không được trống và tối đa 2.000 ký tự.
- Nếu review đã có phản hồi, seller có thể sửa; lần PUT tiếp theo thay thế nội dung cũ.
- Seller không xóa/sửa review của customer, chỉ phản hồi.

## 11. Voucher

Đường dẫn: `/seller/vouchers`.

### 11.1 Tab Quản lý voucher

Seller có thể:

- Tạo voucher theo phần trăm hoặc số tiền cố định.
- Nhập đơn tối thiểu.
- Nhập giảm tối đa cho voucher phần trăm.
- Giới hạn lượt dùng.
- Chọn chính xác ngày giờ bắt đầu và kết thúc.
- Bật/tắt voucher.
- Sửa khoảng hiệu lực.
- Xóa voucher.

Rule chính:

- Mã voucher bắt buộc.
- Giá trị giảm phải lớn hơn 0.
- Giảm phần trăm không vượt 100%.
- Giới hạn lượt dùng nếu nhập phải lớn hơn 0.
- Phải có đủ thời gian bắt đầu/kết thúc; bắt đầu phải trước kết thúc.
- Thời gian hết hạn không được nhỏ hơn thời điểm tối thiểu của form.
- Xóa thành công làm voucher biến mất và mã cũ có thể được backend giải phóng để tạo lại.

### 11.2 Tab Hiệu quả

- Tổng lượt sử dụng.
- Số customer duy nhất đã dùng.
- Tổng tiền đã giảm.
- Giá trị đơn gắn với voucher và doanh thu đã giao.
- Trạng thái: Đang hoạt động, Sắp diễn ra, Đã hết hạn, Đã tắt, Hết lượt.
- Bảng theo voucher: lượt dùng/giới hạn, tỷ lệ dùng, doanh thu, tiền giảm và lần dùng cuối.
- Có tìm kiếm, lọc trạng thái, khoảng ngày, sắp xếp và phân trang.
- Voucher không giới hạn lượt dùng hiển thị Không giới hạn thay vì phần trăm giả.

Voucher shop chỉ giảm trên phần sản phẩm đủ điều kiện của shop phát hành; số tiền giảm cuối cùng do backend tính.

## 12. Hộp thư

Đường dẫn: `/seller/inbox`.

- Cột trái là danh sách từng customer đã chat với shop.
- Cuộc trò chuyện có tin chưa đọc được ưu tiên lên trên.
- Bấm customer để tải lịch sử từ database và đánh dấu tin của customer là đã đọc.
- Nhập nội dung và bấm gửi hoặc Enter.
- `Shift + Enter` để xuống dòng.
- Tin gửi được hiển thị tạm thời; khi server xác nhận, FE thay tin tạm bằng message thật để tránh nhân đôi.
- Nếu gửi thất bại hoặc socket chưa kết nối, FE không coi đó là tin đã lưu thành công.
- Mỗi customer là một cuộc trò chuyện riêng; không dùng chung lịch sử giữa nhiều người.

## 13. Hồ sơ shop

Đường dẫn: `/seller/profile`.

Seller có thể xem và sửa:

- Tên, điện thoại, địa chỉ và địa chỉ lấy hàng.
- Mô tả shop.
- Logo và ảnh bìa.
- Họ tên định danh, CCCD.
- Ngân hàng, số tài khoản và chủ tài khoản.

Validation giống đăng ký seller:

- Tên, điện thoại, địa chỉ bắt buộc.
- Điện thoại đúng 10 số, bắt đầu `0`.
- CCCD nếu nhập phải đúng 12 số.
- Số tài khoản nếu nhập phải có 6-20 số.
- Mô tả tối đa 2.000 ký tự.
- Logo/cover theo rule file ảnh chung.

Preview bên cạnh giúp xem nhanh hồ sơ sau khi nhập. Sau khi bấm lưu và API thành công, dữ liệu shop được cập nhật.

## 14. Customer theo dõi và xem shop

- Customer mở `/shops/:sellerId` để xem ảnh bìa, logo, mô tả, sản phẩm, danh mục, sắp xếp giá, tồn kho và flash sale.
- Customer có thể Theo dõi/Bỏ theo dõi.
- Khi có người theo dõi mới, seller nhận notification `new_follower`.
- Customer có thể bấm Chat với shop để mở đúng cuộc trò chuyện với user sở hữu shop.

## 15. Quy trình vận hành đề xuất mỗi ngày

1. Mở Tổng quan, xử lý các ô **Đơn xử lý trễ**, **Đơn cần xử lý** và **Yêu cầu trả hàng** trước.
2. Kiểm tra Hộp thư và Review chưa phản hồi.
3. Mở Kho hàng, xử lý Hết hàng/Sắp hết hàng và ghi lý do khi điều chỉnh.
4. Xác nhận đóng gói đơn mới.
5. Khi giao hàng thực tế bắt đầu, chuyển item sang Đang giao; khi giao xong chuyển Đã giao.
6. Kiểm tra Tài chính theo khoảng ngày cần đối soát.
7. Theo dõi hiệu quả voucher và dừng các chương trình không còn phù hợp.
8. Kiểm tra hồ sơ shop, ảnh và mô tả khi có thay đổi thương hiệu.

## 16. Chức năng chưa hoàn chỉnh hoặc chủ động để sau

1. **Vận chuyển**: chưa tích hợp API hãng vận chuyển, webhook, tạo tracking code tự động hoặc shipping label. Mã vận đơn hiện cho phép để trống và trạng thái giao hàng do seller thao tác thủ công.
2. **Tài chính**: mới là báo cáo đối soát, chưa có ShopWallet, số dư khả dụng, tiền đóng băng, yêu cầu rút tiền hoặc lịch sử payout.
3. **Địa chỉ**: chưa tích hợp bản đồ và mã tỉnh/huyện của đối tác vận chuyển; địa chỉ đang lưu dạng text.
4. **Biến thể sản phẩm**: giao diện seller hiện quản lý một variant mặc định cho mỗi sản phẩm; chưa có ma trận hai nhóm như Màu × Kích thước. Đây là phạm vi đã chủ động bỏ để tránh làm phức tạp tồn kho/review.
5. **Follower**: seller nhận thông báo người theo dõi mới, nhưng chưa có trang danh sách follower, biểu đồ tăng trưởng follower hoặc công cụ gửi chiến dịch.
6. **Thông báo**: danh sách thông báo dùng polling 30 giây, chưa phải realtime socket như chat.
7. **Duyệt seller**: FE hiện cập nhật phiên seller ngay khi đăng ký thành công; chưa có màn chờ admin duyệt trong Kênh người bán.
8. **Trả hàng nâng cao**: chưa có upload bằng chứng ảnh/video, địa chỉ gửi trả hoặc quy trình hoàn tiền chi tiết trên seller FE.
9. **Quản lý hàng loạt**: chưa có import/export sản phẩm, sửa hàng loạt, in phiếu đóng gói hoặc xử lý nhiều đơn cùng lúc.
10. **Follower notification destination**: bấm thông báo follower mới hiện đưa về Dashboard vì chưa có trang follower riêng.
11. **Admin**: các thao tác duyệt seller, xử lý payout, quản lý tranh chấp và cấu hình phí thuộc role admin, không nằm trong tài liệu này.
12. **Dọn file ảnh**: bỏ một ảnh khỏi form chỉ loại ảnh khỏi dữ liệu đang chỉnh sửa; FE chưa tự gọi API xóa file upload không còn sử dụng.
