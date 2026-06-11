import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { addressService } from '../services/addressService';

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [qrUrl, setQrUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');

  // Lấy địa chỉ mặc định từ Sổ địa chỉ
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const addresses = await addressService.getAddresses();
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        if (defaultAddr) {
          setShippingAddress(`${defaultAddr.recipient_name} | ${defaultAddr.phone_number}\n${defaultAddr.street_address}, ${defaultAddr.city}`);
        }
      } catch (err) {
        console.error("Lỗi lấy sổ địa chỉ:", err);
      }
    };
    fetchAddress();
  }, []);

  // Tính tổng tiền
  const totalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);

    try {
      // Gọi API Backend vừa viết ở Bước 1
      const response = await fetch('http://localhost:5000/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ecom_token')}` // Bật gửi Token xác thực
        },
        body: JSON.stringify({
          items: cartItems,
          shippingAddress: (document.getElementById('shipping-address-input') as HTMLTextAreaElement)?.value || 'Không có địa chỉ',
          paymentMethod,
          totalAmount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Lỗi từ máy chủ');
      }

      if (paymentMethod === 'qr' && data.qrUrl) {
        // Nếu là QR -> Hiển thị mã QR lên màn hình
        setQrUrl(data.qrUrl);
      } else {
        // Nếu là COD -> Đặt hàng thành công luôn
        alert('🎉 Đặt hàng thành công!');
        clearCart();
        navigate('/');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Lỗi đặt hàng! Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return <div className="pt-40 text-center font-bold text-xl">Giỏ hàng của bạn đang trống!</div>;
  }

  return (
    <div className="pt-32 pb-20 max-w-5xl mx-auto px-6 min-h-screen">
      <h1 className="text-4xl font-black mb-10 text-slate-800">Thanh toán</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* CỘT TRÁI: Thông tin & Phương thức */}
        <div className="md:col-span-7 space-y-8">
          
          {/* Thông tin giao hàng */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">local_shipping</span>
                Thông tin nhận hàng
              </h2>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Mặc định</span>
            </div>
            
            <div className="relative group">
              <div className="absolute top-4 left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <span className="material-symbols-outlined">location_on</span>
              </div>
              <textarea 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-medium focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none shadow-inner"
                rows={3}
                placeholder="Nhập tên, số điện thoại và địa chỉ nhận hàng..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                id="shipping-address-input"
              ></textarea>
              <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="material-symbols-outlined text-[14px]">edit</span>
                Nhấn vào để sửa
              </div>
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Phương thức thanh toán</h2>
          
          <label className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
            <input type="radio" name="payment" value="cod" className="w-5 h-5 accent-blue-600" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
            <div>
              <p className="font-bold text-lg text-slate-800">Thanh toán khi nhận hàng (COD)</p>
              <p className="text-sm text-slate-500">Trả tiền mặt khi shipper giao hàng tới.</p>
            </div>
          </label>

          <label className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'qr' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
            <input type="radio" name="payment" value="qr" className="w-5 h-5 accent-blue-600" checked={paymentMethod === 'qr'} onChange={() => setPaymentMethod('qr')} />
            <div>
              <p className="font-bold text-lg text-slate-800">Chuyển khoản VietQR</p>
              <p className="text-sm text-slate-500">Quét mã QR bằng App Ngân hàng bất kỳ.</p>
            </div>
          </label>
          </div>
        </div>

        {/* CỘT PHẢI: Tổng tiền & Nút xác nhận */}
        <div className="md:col-span-5">
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-bold mb-6 text-slate-800">Tổng kết đơn hàng</h2>
            <div className="flex justify-between items-center font-bold text-xl mb-8">
              <span className="text-slate-600">Tổng thanh toán:</span>
              <span className="text-blue-600 text-3xl">{new Intl.NumberFormat('vi-VN').format(totalAmount)}₫</span>
            </div>

            {/* Logic hiển thị nút bấm hoặc mã QR */}
            {!qrUrl ? (
              <button 
                onClick={handlePlaceOrder} 
                disabled={isProcessing}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận Đặt hàng'}
              </button>
            ) : (
              <div className="text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold mb-4 inline-block">
                  Vui lòng quét mã QR dưới đây
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-lg inline-block border">
                  {/* Ảnh QR sinh ra từ API VietQR */}
                  <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain rounded-xl" />
                </div>
                <button 
                  onClick={() => { clearCart(); navigate('/'); }}
                  className="mt-6 w-full py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                >
                  Tôi đã thanh toán xong
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
