import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { Order } from '../types';

export default function MyOrders() {
  const auth = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  useEffect(() => {
    if (auth?.isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [auth?.isAuthenticated]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await orderService.getMyOrders();
      setOrders(result.orders || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (orderId: string) => {
    setModalLoading(true);
    setIsModalOpen(true);
    try {
      const detail = await orderService.getMyOrderDetail(orderId);
      setSelectedOrder(detail);
    } catch (err: any) {
      alert('Không thể tải chi tiết đơn hàng: ' + err.message);
      setIsModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    try {
      const updated = await orderService.cancelMyOrder(orderId);
      // Update in list
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
      // Update in modal
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      alert('Hủy đơn hàng thành công!');
    } catch (err: any) {
      alert('Lỗi khi hủy đơn hàng: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Đang tải đơn hàng của bạn...</div>
      </div>
    );
  }

  if (!auth?.isAuthenticated) {
    return (
      <div style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--error)' }}>Yêu cầu đăng nhập</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Vui lòng đăng nhập tài khoản khách hàng để xem lịch sử mua hàng.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', width: '90%', margin: '2rem auto', paddingBottom: '4rem' }} className="fade-in">
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>📦 Đơn hàng của tôi</h1>

      {error && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--error)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Bạn chưa đặt đơn hàng nào.</p>
          <button className="gradient-btn" onClick={() => window.location.href = '/'}>
            🛒 Mua sắm ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map(o => {
            let badgeClass = 'badge-info';
            if (o.status === 'delivered') badgeClass = 'badge-success';
            if (o.status === 'cancelled') badgeClass = 'badge-error';
            if (o.status === 'pending') badgeClass = 'badge-warning';

            return (
              <div key={o.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{o.id}</span>
                    <span className={`badge ${badgeClass}`}>{o.status.toUpperCase()}</span>
                  </div>
                  
                  <div style={{ marginTop: '0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div>🏪 Cửa hàng: <strong>{o.shop_name || 'Vật liệu xây dựng'}</strong></div>
                    <div>🛣️ Khoảng cách: <strong>{o.distance_km} km</strong> | Phí ship: <strong>{o.shipping_fee.toLocaleString('vi-VN')} đ</strong></div>
                    <div>📅 Ngày đặt: {new Date(o.created_at).toLocaleString('vi-VN')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {o.total.toLocaleString('vi-VN')} đ
                  </div>
                  <button className="secondary-btn" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }} onClick={() => handleOpenDetail(o.id)}>
                    🔍 Xem chi tiết đơn
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {modalLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Đang tải chi tiết đơn hàng...</div>
              </div>
            ) : selectedOrder ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Chi tiết Đơn hàng: <span style={{ fontFamily: 'monospace' }}>{selectedOrder.id}</span></h3>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>×</button>
                </div>

                {/* Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>Trạng thái đơn: </span>
                  <span className={`badge ${
                    selectedOrder.status === 'delivered' ? 'badge-success' :
                    selectedOrder.status === 'cancelled' ? 'badge-error' :
                    selectedOrder.status === 'pending' ? 'badge-warning' : 'badge-info'
                  }`}>{selectedOrder.status.toUpperCase()}</span>
                </div>

                {/* Shop and Delivery Info */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>🏪 <strong>Cửa hàng:</strong> {selectedOrder.shop_name}</div>
                  <div>🛣️ <strong>Khoảng cách vận chuyển:</strong> {selectedOrder.distance_km} km — Phí ship: <strong>{selectedOrder.shipping_fee.toLocaleString('vi-VN')} đ</strong></div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>
                    👤 <strong>Người nhận:</strong> {selectedOrder.shipping_name} — 📞 {selectedOrder.shipping_phone}
                  </div>
                  <div>📍 <strong>Địa chỉ nhận hàng:</strong> {selectedOrder.shipping_address}{selectedOrder.shipping_city ? `, ${selectedOrder.shipping_city}` : ''}</div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem', color: 'var(--text-secondary)' }}>Danh sách sản phẩm mua</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {selectedOrder.items?.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                          <img src={item.variant_image || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80'} alt={item.product_name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.product_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.variant_info}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                          <div>{item.unit_price.toLocaleString('vi-VN')} đ</div>
                          <div style={{ color: 'var(--text-muted)' }}>x{item.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary Totals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', alignItems: 'flex-end', fontSize: '0.9rem' }}>
                  <div>Tiền hàng: <strong>{selectedOrder.subtotal.toLocaleString('vi-VN')} đ</strong></div>
                  <div>Phí giao hàng: <strong>{selectedOrder.shipping_fee.toLocaleString('vi-VN')} đ</strong></div>
                  <div style={{ fontSize: '1.15rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                    Tổng thanh toán: {selectedOrder.total.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                {/* Cancel Button */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
                  {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') ? (
                    <button className="secondary-btn" style={{ color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleCancelOrder(selectedOrder.id)}>
                      ✕ Hủy đơn hàng này
                    </button>
                  ) : <div></div>}
                  <button className="secondary-btn" onClick={() => setIsModalOpen(false)}>Đóng</button>
                </div>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy thông tin đơn hàng.</p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
