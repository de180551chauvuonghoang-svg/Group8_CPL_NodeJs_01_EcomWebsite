import { pool } from '../config/db.js';
import sql from 'mssql';

// Hàm xử lý Đặt hàng & Thanh toán
export const createOrder = async (req, res) => {
  try {
    // 1. Nhận dữ liệu từ Frontend gửi lên
    const { 
      items,           // Mảng cartItems
      shippingAddress, // Thông tin địa chỉ
      paymentMethod,   // 'cod', 'qr', 'visa'
      totalAmount      // Tổng tiền
    } = req.body;

    const userId = req.user.id; // Lấy ID user từ token đăng nhập
    const orderId = `ORD_${Date.now()}`; // Tạo mã đơn hàng ngẫu nhiên

    // 2. Tạo Transaction để đảm bảo an toàn dữ liệu (nếu lỗi sẽ huỷ toàn bộ)
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Parse shipping address (Name | Phone \n Address, City)
      const addrLines = shippingAddress.split('\n');
      const firstLine = addrLines[0] || '';
      const [namePart, phonePart] = firstLine.split('|').map(s => s.trim());
      const shippingName = namePart || 'Unknown';
      const shippingPhone = phonePart || 'Unknown';
      const shippingAddr = addrLines[1] || shippingAddress;

      // 3. Insert vào bảng Orders
      const request = transaction.request();
      await request
        .input('id', sql.VarChar, orderId)
        .input('userId', sql.VarChar, userId)
        .input('subtotal', sql.Decimal(18,2), totalAmount)
        .input('total', sql.Decimal(18,2), totalAmount)
        .input('status', sql.VarChar, 'pending')
        .input('shippingName', sql.NVarChar, shippingName)
        .input('shippingPhone', sql.VarChar, shippingPhone)
        .input('shippingAddress', sql.NVarChar, shippingAddr)
        .query(`
          INSERT INTO Orders (id, user_id, subtotal, total, status, shipping_name, shipping_phone, shipping_address)
          VALUES (@id, @userId, @subtotal, @total, @status, @shippingName, @shippingPhone, @shippingAddress)
        `);

      // 4. Insert từng sản phẩm vào bảng OrderItems
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const orderItemId = `OI_${Date.now()}_${i}`;

        // Tìm variant_id hợp lệ cho product này để không bị lỗi Foreign Key
        const variantResult = await transaction.request()
          .input('pId', sql.VarChar, item.product.id)
          .query('SELECT TOP 1 id FROM ProductVariants WHERE product_id = @pId');
        
        let validVariantId = item.product.id;
        if (variantResult.recordset.length > 0) {
          validVariantId = variantResult.recordset[0].id;
        }

        await transaction.request()
          .input('oiId', sql.VarChar, orderItemId)
          .input('oId', sql.VarChar, orderId)
          .input('vId', sql.VarChar, validVariantId)
          .input('qty', sql.Int, item.quantity)
          .input('uPrice', sql.Decimal(18,2), item.product.price)
          .input('tPrice', sql.Decimal(18,2), item.product.price * item.quantity)
          .input('pName', sql.NVarChar, item.product.name || 'Sản phẩm')
          .query(`
            INSERT INTO OrderItems (id, order_id, variant_id, quantity, unit_price, total_price, product_name)
            VALUES (@oiId, @oId, @vId, @qty, @uPrice, @tPrice, @pName)
          `);

        // Trừ số lượng tồn kho (stock_qty) của biến thể sản phẩm.
        // Điều kiện 'stock_qty >= @qty' giúp ngăn chặn Race Condition (tránh số lượng tồn kho bị âm).
        const updateStockResult = await transaction.request()
          .input('vId', sql.VarChar, validVariantId)
          .input('qty', sql.Int, item.quantity)
          .query(`
            UPDATE ProductVariants
            SET stock_qty = stock_qty - @qty
            WHERE id = @vId AND stock_qty >= @qty
          `);

        // Nếu rowsAffected = 0, có nghĩa là sản phẩm đã hết hàng hoặc không đủ số lượng yêu cầu
        if (updateStockResult.rowsAffected[0] === 0) {
          throw new Error(`Sản phẩm "${item.product.name || 'Sản phẩm'}" không đủ số lượng tồn kho hoặc đã hết hàng.`);
        }

        // Ghi nhận lịch sử thay đổi kho hàng (InventoryLogs)
        const logId = `LOG_${Date.now()}_${i}`;
        await transaction.request()
          .input('logId', sql.VarChar, logId)
          .input('vId', sql.VarChar, validVariantId)
          .input('changeQty', sql.Int, -item.quantity)
          .input('reason', sql.NVarChar, `Đơn hàng ${orderId}`)
          .input('refId', sql.VarChar, orderId)
          .input('userId', sql.VarChar, userId)
          .query(`
            INSERT INTO InventoryLogs (id, variant_id, change_qty, reason, reference_id, created_by)
            VALUES (@logId, @vId, @changeQty, @reason, @refId, @userId)
          `);
      }

      // 5. Insert vào bảng Payments
      // Nếu là QR hoặc Visa thì trạng thái là pending_payment, COD là pending_cod
      const paymentStatus = paymentMethod === 'cod' ? 'pending_cod' : 'pending_payment';
      const paymentId = `PAY_${Date.now()}`;
      
      await transaction.request()
        .input('id', sql.VarChar, paymentId)
        .input('orderId', sql.VarChar, orderId)
        .input('method', sql.VarChar, paymentMethod)
        .input('amount', sql.Decimal(18,2), totalAmount)
        .input('status', sql.VarChar, paymentStatus)
        .query(`
          INSERT INTO Payments (id, order_id, method, amount, status)
          VALUES (@id, @orderId, @method, @amount, @status)
        `);

      await transaction.commit(); // Hoàn tất lưu DB

      // 6. Xử lý trả về cho Frontend dựa theo phương thức thanh toán
      if (paymentMethod === 'qr') {
        // TẠO MÃ VIETQR ĐỘNG
        // Cấu trúc: https://img.vietqr.io/image/<MÃ_NGÂN_HÀNG>-<SỐ_TÀI_KHOẢN>-<TEMPLATE>.png?amount=<SỐ_TIỀN>&addInfo=<NỘI_DUNG>&accountName=<TÊN_CHỦ_TK>
        // Bạn hãy thay mã ngân hàng và STK thật của bạn vào đây nhé!
        const bankId = 'mbbank'; // Ví dụ: mbbank, vcb, techcombank
        const accountNo = '123456789'; 
        const accountName = 'NGUYEN VAN A';
        
        const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${totalAmount}&addInfo=${orderId}&accountName=${accountName}`;
        
        return res.status(201).json({ 
          success: true, 
          message: 'Tạo đơn hàng QR thành công',
          orderId,
          qrUrl // Trả link ảnh QR về cho Frontend hiển thị
        });
      }

      // Mặc định trả về cho COD hoặc các phương thức khác
      res.status(201).json({ success: true, message: 'Đặt hàng thành công', orderId });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Lỗi tạo đơn hàng:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi server khi đặt hàng' });
  }
};
