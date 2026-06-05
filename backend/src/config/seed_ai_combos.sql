-- Script Seed dữ liệu 10 Combo mẫu cho AI
-- Dành cho bảng ProductCombos đã có sẵn trong initDb.js

INSERT INTO ProductCombos (name, description, price, category, use_case, specs_summary)
VALUES 
-- 5 Combo Điện Tử (Máy tính)
(N'Bộ PC Sinh Viên - Văn Phòng', N'Bộ PC cơ bản, cực kỳ tiết kiệm. Đáp ứng mượt mà các tác vụ Word, Excel, lướt web, học online.', 8500000.00, N'PC', N'văn phòng, sinh viên, giá rẻ', N'Core i3, 8GB RAM, 256GB SSD'),
(N'Bộ PC Esport - Quốc dân', N'Sự lựa chọn quốc dân cho sinh viên và game thủ nhẹ nhàng. Cân mượt max setting các game LoL, FO4, Valorant.', 15000000.00, N'PC', N'chơi game, esport, liên minh, 15 triệu', N'Core i5, 16GB RAM, GTX 1650, 512GB SSD'),
(N'Bộ PC Đa Năng - Cân Đồ Họa', N'Best choice trong tầm giá 25 triệu. Vừa chơi game AAA mượt, vừa làm Photoshop/Premiere êm ru. Thiết kế vỏ case đen.', 25000000.00, N'PC', N'đồ họa, chơi game mượt, màu đen, 25 triệu', N'Core i5 Gen 13, 16GB RAM, RTX 4060, 1TB SSD'),
(N'Bộ PC Streamer - Đẹp Lấp Lánh', N'Setup Full Trắng (All White) cực đẹp với nhiều đèn LED RGB. Phù hợp cho streamer hoặc decor phòng.', 35000000.00, N'PC', N'streamer, đẹp, màu trắng, 35 triệu', N'Core i7, 32GB RAM, RTX 4060Ti Trắng'),
(N'Bộ PC Máy Trạm - Render 3D', N'Quái vật hiệu năng dành cho dân chuyên nghiệp, kiến trúc sư, dựng phim 4K.', 60000000.00, N'PC', N'máy trạm, render, 3d, cao cấp, 60 triệu', N'Core i9, 64GB RAM, RTX 4080, Tản nhiệt nước'),

-- 5 Combo Gia dụng (Bếp/SmartHome)
(N'Bếp Nhỏ Nấu Nhanh (Phòng Trọ)', N'Giải pháp cho không gian hẹp. Gọn gàng, dễ dọn dẹp, đủ nấu ăn cơ bản.', 3500000.00, N'Kitchen', N'phòng trọ, sinh viên, độc thân, nhỏ gọn, 3 triệu', N'Bếp từ đơn, Nồi cơm mini, Ấm siêu tốc'),
(N'Tổ Ấm Mới Cưới (Chung Cư)', N'Đầy đủ tiện nghi cơ bản cho gia đình trẻ ở chung cư, thiết kế tối giản hiện đại.', 14500000.00, N'Kitchen', N'chung cư, vợ chồng mới cưới, cơ bản, 14 triệu', N'Bếp từ đôi, Hút mùi kính cong, Lò vi sóng'),
(N'Bếp Hiện Đại - Tông Đen Huyền Bí', N'Đồng bộ 100% màu đen kính sang trọng, chống bám bẩn. Mang lại vẻ đẹp huyền bí cho gian bếp.', 28000000.00, N'Kitchen', N'màu đen, hiện đại, sang trọng, 28 triệu, bếp từ', N'Bếp từ 3 vùng nấu, Hút mùi âm tủ, Lò nướng âm đen'),
(N'Phòng Khách Điện Ảnh', N'Biến phòng khách thành rạp phim mini, trải nghiệm âm thanh hình ảnh tuyệt đỉnh.', 35000000.00, N'SmartHome', N'phòng khách, tivi, xem phim, loa, 35 triệu', N'Smart TV OLED 65 inch, Loa Soundbar 5.1'),
(N'Ngôi Nhà Thông Minh Toàn Diện', N'Setup hệ sinh thái Smart Home tự động hóa, điều khiển qua điện thoại.', 45000000.00, N'SmartHome', N'thông minh, smarthome, camera, tự động, 45 triệu', N'Tủ lạnh mặt gương, Máy giặt AI, Khóa vân tay, Camera');

PRINT 'Đã chèn thành công 10 Combo mẫu vào bảng ProductCombos!';
