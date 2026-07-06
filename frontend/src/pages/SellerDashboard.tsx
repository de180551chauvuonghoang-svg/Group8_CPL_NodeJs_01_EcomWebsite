import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { sellerService } from '../services/sellerService';
import { Shop, Product, Order } from '../types';
import { chatService } from '../services/chatService';

export default function SellerDashboard() {
  const auth = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'settings' | 'chat'>('overview');
  
  // Data States
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Product Form Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    description: '',
    category: 'Gạch & Xi Măng',
    image: '',
    stock: 100
  });

  // Order Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Chat States
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMsgText, setNewMsgText] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Load chat rooms and bind socket
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatRooms();
      
      const socket = chatService.initSocket();
      
      chatService.onReceiveMessage((msg: any) => {
        setChatMessages(prev => {
          if (prev.length > 0 && prev[0].room_id === msg.room_id) {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          }
          return prev;
        });
        fetchChatRooms(false);
      });

      return () => {
        chatService.offReceiveMessage();
      };
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedRoom) {
      chatService.joinRoom(selectedRoom.id);
      fetchRoomMessages(selectedRoom.id);

      return () => {
        chatService.leaveRoom(selectedRoom.id);
      };
    }
  }, [selectedRoom]);

  const fetchChatRooms = async (showLoading = true) => {
    if (showLoading) setChatLoading(true);
    try {
      const res = await chatService.getRooms();
      setChatRooms(res.rooms || []);
    } catch (err: any) {
      console.error('Error fetching rooms:', err);
    } finally {
      if (showLoading) setChatLoading(false);
    }
  };

  const fetchRoomMessages = async (roomId: string) => {
    try {
      const msgs = await chatService.getMessages(roomId);
      setChatMessages(msgs);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || !selectedRoom) return;

    try {
      const text = newMsgText;
      setNewMsgText('');
      
      const res = await chatService.sendMessage({
        roomId: selectedRoom.id,
        messageText: text
      });

      setChatMessages(prev => {
        if (prev.some(m => m.id === res.data.message.id)) return prev;
        return [...prev, res.data.message];
      });
      fetchChatRooms(false);
    } catch (err: any) {
      alert('Không thể gửi tin nhắn: ' + err.message);
    }
  };

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    shop_name: '',
    phone_number: '',
    warehouse_address: '',
    latitude: 10.8231,
    longitude: 106.6297,
    shipping_fee_per_km: 15000,
    max_delivery_distance: 50,
    description: ''
  });

  // Load Initial Seller Data
  useEffect(() => {
    if (auth?.user?.role === 'seller') {
      fetchSellerData();
    } else {
      setLoading(false);
    }
  }, [auth?.user]);

  const fetchSellerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Shop profile
      const shopProfile = await sellerService.getProfile();
      setShop(shopProfile);
      setSettingsForm({
        shop_name: shopProfile.shop_name,
        phone_number: shopProfile.phone_number,
        warehouse_address: shopProfile.warehouse_address,
        latitude: Number(shopProfile.latitude),
        longitude: Number(shopProfile.longitude),
        shipping_fee_per_km: Number(shopProfile.shipping_fee_per_km),
        max_delivery_distance: Number(shopProfile.max_delivery_distance),
        description: shopProfile.description || ''
      });

      // 2. Get Products
      const shopProducts = await sellerService.getProducts();
      setProducts(shopProducts);

      // 3. Get Orders
      const orderRes = await sellerService.getOrders({ limit: 100 });
      setOrders(orderRes.orders || []);

      // 4. Get Stats
      const shopStats = await sellerService.getStats();
      setStats(shopStats);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi tải dữ liệu cửa hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ─── PRODUCT ACTIONS ──────────────────────────────────────────

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: 150000,
      description: '',
      category: 'Gạch & Xi Măng',
      image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80',
      stock: 50
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      price: p.price,
      description: p.description,
      category: p.category,
      image: p.image,
      stock: p.stock
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Update
        const updated = await sellerService.updateProduct(editingProduct.id, productForm);
        setProducts(products.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        // Create
        const created = await sellerService.createProduct(productForm);
        setProducts([created, ...products]);
      }
      setIsProductModalOpen(false);
      // Reload stats in background
      sellerService.getStats().then(setStats);
    } catch (err: any) {
      alert('Không thể lưu sản phẩm: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;
    try {
      await sellerService.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      sellerService.getStats().then(setStats);
    } catch (err: any) {
      alert('Không thể xóa sản phẩm: ' + err.message);
    }
  };

  // ─── ORDER ACTIONS ─────────────────────────────────────────────

  const handleOpenOrderDetail = async (orderId: string) => {
    try {
      const detail = await sellerService.getOrderDetail(orderId);
      setSelectedOrder(detail);
      setIsOrderModalOpen(true);
    } catch (err: any) {
      alert('Không thể lấy chi tiết đơn hàng: ' + err.message);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const updated = await sellerService.updateOrderStatus(orderId, nextStatus);
      // Update order in list
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: updated.status } : o));
      // Update selected order details
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      // Refresh statistics and profiles
      sellerService.getStats().then(setStats);
    } catch (err: any) {
      alert('Lỗi cập nhật trạng thái: ' + err.message);
    }
  };

  // ─── SETTINGS ACTIONS ──────────────────────────────────────────

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const freshShop = await sellerService.updateProfile(settingsForm);
      setShop(freshShop);
      alert('Cập nhật cấu hình cửa hàng thành công!');
    } catch (err: any) {
      alert('Lỗi cập nhật cấu hình: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Đang tải dữ liệu cửa hàng...</div>
      </div>
    );
  }

  if (auth?.user?.role !== 'seller') {
    return (
      <div style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--error)' }}>Quyền truy cập bị từ chối</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Tài khoản của bạn không được phân quyền Người bán (Seller). Vui lòng đăng nhập với tài khoản Seller hoặc liên hệ Admin.</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--error)' }}>Đã xảy ra lỗi</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error || 'Không tìm thấy hồ sơ cửa hàng của bạn.'}</p>
        <button className="gradient-btn" onClick={fetchSellerData}>Thử lại</button>
      </div>
    );
  }

  // Helper values for overview
  const totalRevenue = stats.reduce((sum, item) => sum + (item.status !== 'cancelled' ? item.total_revenue : 0), 0);
  const totalOrdersCount = stats.reduce((sum, item) => sum + item.count, 0);
  const deliveredOrders = stats.find(item => item.status === 'delivered')?.count || 0;
  const pendingOrders = stats.find(item => item.status === 'pending')?.count || 0;

  return (
    <div style={{ maxWidth: '1200px', width: '90%', margin: '2rem auto', paddingBottom: '4rem' }}>
      
      {/* Shop Header Banner */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: 'white', boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}>
          {shop.shop_name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem' }}>{shop.shop_name}</h1>
            <span className="badge badge-success">✓ Đối tác xác minh</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            📍 {shop.warehouse_address} | 📞 {shop.phone_number}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className={`secondary-btn ${activeTab === 'settings' ? 'active' : ''}`} style={{ borderColor: activeTab === 'settings' ? 'var(--accent-primary)' : '' }} onClick={() => setActiveTab('settings')}>
            ⚙️ Cấu hình Shop
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ background: 'none', border: 'none', padding: '0.8rem 1.5rem', color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : 'none', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)' }}
        >
          📊 Tổng quan
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          style={{ background: 'none', border: 'none', padding: '0.8rem 1.5rem', color: activeTab === 'products' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'products' ? '2px solid var(--accent-primary)' : 'none', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)' }}
        >
          📦 Sản phẩm ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          style={{ background: 'none', border: 'none', padding: '0.8rem 1.5rem', color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'orders' ? '2px solid var(--accent-primary)' : 'none', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)' }}
        >
          📋 Đơn hàng ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          style={{ background: 'none', border: 'none', padding: '0.8rem 1.5rem', color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'chat' ? '2px solid var(--accent-primary)' : 'none', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)' }}
        >
          💬 Tin nhắn
        </button>
      </div>

      {/* Tab Contents */}
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>💰 Doanh thu ước tính</span>
              <span className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>{totalRevenue.toLocaleString('vi-VN')} đ</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(Không tính đơn hàng đã hủy)</span>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>🛒 Tổng đơn hàng</span>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>{totalOrdersCount}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{pendingOrders} đơn hàng đang chờ xác nhận</span>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>✅ Đơn giao thành công</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>{deliveredOrders}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Đã ghi nhận trừ kho và cập nhật doanh số</span>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>🚚 Vận chuyển VLXD</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--info)' }}>{shop.shipping_fee_per_km.toLocaleString('vi-VN')} đ/km</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Giới hạn cự ly: tối đa {shop.max_delivery_distance} km</span>
            </div>
          </div>

          {/* Quick Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Trạng thái Đơn hàng</h3>
              {stats.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Chưa có số liệu thống kê đơn hàng.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stats.map(item => {
                    const pct = totalOrdersCount > 0 ? (item.count / totalOrdersCount) * 100 : 0;
                    let color = 'var(--accent-primary)';
                    if (item.status === 'delivered') color = 'var(--success)';
                    if (item.status === 'cancelled') color = 'var(--error)';
                    if (item.status === 'pending') color = 'var(--warning)';

                    return (
                      <div key={item.status} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{item.status}</span>
                          <span>{item.count} đơn ({Math.round(pct)}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Cơ chế tính khoảng cách và phí vận chuyển</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Hệ thống áp dụng công thức <strong>Haversine</strong> để tính khoảng cách thực tế (theo cự ly đường chim bay) từ tọa độ kho hàng của bạn đến địa chỉ của khách hàng.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '0.4rem' }}>🏠 <strong>Gốc kho hàng của bạn:</strong> (lat: {shop.latitude}, lng: {shop.longitude})</div>
                <div>💰 <strong>Công thức tính tiền:</strong> <code>Cự ly (km) x Phí ship ({shop.shipping_fee_per_km.toLocaleString('vi-VN')} đ/km)</code></div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                * Khách hàng vượt quá cự ly {shop.max_delivery_distance} km sẽ thấy cảnh báo nhưng vẫn có thể đặt hàng. Phí ship sẽ được tính theo thực tế.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>Sản phẩm của cửa hàng</h2>
            <button className="gradient-btn" onClick={handleOpenAddProduct}>
              ➕ Thêm sản phẩm mới
            </button>
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1.2rem' }}>Hình ảnh</th>
                  <th style={{ padding: '1.2rem' }}>Tên sản phẩm</th>
                  <th style={{ padding: '1.2rem' }}>Danh mục</th>
                  <th style={{ padding: '1.2rem' }}>Giá cơ bản</th>
                  <th style={{ padding: '1.2rem' }}>Tồn kho</th>
                  <th style={{ padding: '1.2rem' }}>Đánh giá</th>
                  <th style={{ padding: '1.2rem', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Không có sản phẩm nào. Hãy đăng bán sản phẩm đầu tiên!
                    </td>
                  </tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.95rem' }}>
                      <td style={{ padding: '1rem' }}>
                        <img src={p.image} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.category}</td>
                      <td style={{ padding: '1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{p.price.toLocaleString('vi-VN')} đ</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: p.stock < 10 ? 'var(--error)' : 'inherit', fontWeight: p.stock < 10 ? 600 : 500 }}>
                          {p.stock}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#f59e0b' }}>⭐ {p.rating}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleOpenEditProduct(p)}>
                            ✏️ Sửa
                          </button>
                          <button className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteProduct(p.id)}>
                            🗑️ Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="fade-in">
          <h2 style={{ marginBottom: '1.5rem' }}>Quản lý Đơn hàng</h2>

          <div className="glass-panel" style={{ overflowX: 'auto', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1.2rem' }}>Mã đơn hàng</th>
                  <th style={{ padding: '1.2rem' }}>Khách hàng</th>
                  <th style={{ padding: '1.2rem' }}>Cự ly ship</th>
                  <th style={{ padding: '1.2rem' }}>Phí ship</th>
                  <th style={{ padding: '1.2rem' }}>Tổng tiền đơn</th>
                  <th style={{ padding: '1.2rem' }}>Trạng thái</th>
                  <th style={{ padding: '1.2rem' }}>Ngày đặt</th>
                  <th style={{ padding: '1.2rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa nhận được đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  orders.map(o => {
                    let badgeClass = 'badge-info';
                    if (o.status === 'delivered') badgeClass = 'badge-success';
                    if (o.status === 'cancelled') badgeClass = 'badge-error';
                    if (o.status === 'pending') badgeClass = 'badge-warning';

                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.95rem' }}>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600 }}>{o.id}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{o.shipping_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.shipping_phone}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>🛣️ {o.distance_km} km</td>
                        <td style={{ padding: '1rem' }}>{o.shipping_fee.toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{o.total.toLocaleString('vi-VN')} đ</td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge ${badgeClass}`}>{o.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {new Date(o.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button className="secondary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleOpenOrderDetail(o.id)}>
                            👁️ Chi tiết / Xử lý
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="fade-in" style={{ maxWidth: '700px' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Cấu hình Cửa hàng</h2>
          <form className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleSaveSettings}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tên Shop</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={settingsForm.shop_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shop_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Số điện thoại</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={settingsForm.phone_number}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone_number: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Địa chỉ kho hàng (VLXD)</label>
              <input 
                type="text" 
                className="input-field" 
                required
                value={settingsForm.warehouse_address}
                onChange={(e) => setSettingsForm({ ...settingsForm, warehouse_address: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tọa độ Vĩ độ (Latitude)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  className="input-field" 
                  required
                  value={settingsForm.latitude}
                  onChange={(e) => setSettingsForm({ ...settingsForm, latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tọa độ Kinh độ (Longitude)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  className="input-field" 
                  required
                  value={settingsForm.longitude}
                  onChange={(e) => setSettingsForm({ ...settingsForm, longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Phí giao hàng mỗi km (đ)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  required
                  value={settingsForm.shipping_fee_per_km}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shipping_fee_per_km: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Phạm vi giao hàng tối đa (km)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  required
                  value={settingsForm.max_delivery_distance}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_delivery_distance: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Mô tả dịch vụ / cửa hàng</label>
              <textarea 
                rows={4}
                className="input-field" 
                value={settingsForm.description}
                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="gradient-btn" style={{ width: 'fit-content', alignSelf: 'flex-start', marginTop: '1rem' }}>
              💾 Lưu Cấu hình
            </button>
          </form>
        </div>
      )}

      {/* 5. CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="fade-in glass-panel" style={{ display: 'flex', height: '600px', padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {/* Rooms Sidebar */}
          <div style={{ width: '30%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '1.1rem' }}>
              💬 Khách hàng nhắn tin
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {chatLoading && chatRooms.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách phòng...</div>
              ) : chatRooms.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có cuộc hội thoại nào.</div>
              ) : (
                chatRooms.map(room => {
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <div 
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      style={{
                        padding: '1rem 1.2rem',
                        borderBottom: '1px solid rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        borderLeft: isSelected ? '4px solid var(--accent-primary)' : '4px solid transparent',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem'
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                        {room.customer_name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: isSelected ? '#fff' : 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{room.customer_name || 'Khách hàng'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {room.last_message || 'Bắt đầu cuộc trò chuyện'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window Box */}
          <div style={{ width: '70%', display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.1)' }}>
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    {selectedRoom.customer_name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{selectedRoom.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>● Đang kết nối real-time</div>
                  </div>
                </div>

                {/* Messages List Area */}
                <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {chatMessages.map((msg, index) => {
                    const isMe = msg.sender_role === 'seller';
                    return (
                      <div 
                        key={msg.id || index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%'
                        }}
                      >
                        <div 
                          style={{
                            padding: '0.75rem 1.1rem',
                            borderRadius: '16px',
                            background: isMe ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            fontSize: '0.92rem',
                            lineHeight: 1.4,
                            borderTopRightRadius: isMe ? '4px' : '16px',
                            borderTopLeftRadius: isMe ? '16px' : '4px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                          }}
                        >
                          {msg.message_text}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Input form */}
                <form 
                  onSubmit={handleSendChatMessage}
                  style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.2)' }}
                >
                  <input 
                    type="text"
                    placeholder="Nhập tin nhắn phản hồi..."
                    className="input-field"
                    value={newMsgText}
                    onChange={(e) => setNewMsgText(e.target.value)}
                    style={{ height: '44px', background: 'rgba(0,0,0,0.2)' }}
                  />
                  <button 
                    type="submit"
                    className="gradient-btn"
                    style={{ height: '44px', padding: '0 1.5rem', flexShrink: 0 }}
                  >
                    Gửi
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
                <span style={{ fontSize: '3rem' }}>💬</span>
                <div>Chọn một khách hàng trong danh sách để bắt đầu trò chuyện real-time</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PRODUCT MODAL (Add/Edit) ─────────────────────────── */}
      {isProductModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '550px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{editingProduct ? '✏️ Cập nhật sản phẩm' : '➕ Đăng bán sản phẩm mới'}</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Tên sản phẩm VLXD</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Giá bán (đ)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Tồn kho ban đầu</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Danh mục sản phẩm</label>
                <select 
                  className="input-field"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                >
                  <option value="cat_cement">Xi măng - Gạch - Cát</option>
                  <option value="cat_steel">Sắt thép - Vật liệu thô</option>
                  <option value="cat_paint">Sơn nước - Chất chống thấm</option>
                  <option value="cat_accessories">Phụ kiện - Thiết bị xây dựng</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Hình ảnh sản phẩm (URL)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Mô tả sản phẩm</label>
                <textarea 
                  rows={3}
                  className="input-field" 
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsProductModalOpen(false)}>Hủy</button>
                <button type="submit" className="gradient-btn">Lưu sản phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ORDER DETAIL MODAL (Status Transition) ───────────── */}
      {isOrderModalOpen && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Chi tiết Đơn hàng: <span style={{ fontFamily: 'monospace' }}>{selectedOrder.id}</span></h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsOrderModalOpen(false)}>×</button>
            </div>

            {/* Customer Details */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>👤 Khách hàng nhận</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.shipping_name}</div>
                <div style={{ fontSize: '0.85rem' }}>📞 {selectedOrder.shipping_phone}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>📍 Địa chỉ giao hàng</div>
                <div>{selectedOrder.shipping_address}</div>
                {selectedOrder.shipping_city && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedOrder.shipping_city}</div>}
              </div>
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem', display: 'flex', gap: '2rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>🛣️ Cự ly ship: </span>
                  <strong>{selectedOrder.distance_km} km</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>🚚 Phí ship: </span>
                  <strong>{selectedOrder.shipping_fee.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
              {selectedOrder.note && (
                <div style={{ gridColumn: 'span 2', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--warning)', padding: '0.5rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  📝 Ghi chú: {selectedOrder.note}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem', color: 'var(--text-secondary)' }}>Mặt hàng xây dựng đã mua</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {selectedOrder.items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <img src={item.variant_image || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=80&q=80'} alt={item.product_name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.product_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.variant_info}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: 600 }}>{item.unit_price.toLocaleString('vi-VN')} đ</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Số lượng: x{item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', alignItems: 'flex-end', fontSize: '0.9rem' }}>
              <div>Tiền hàng: <strong>{selectedOrder.subtotal.toLocaleString('vi-VN')} đ</strong></div>
              <div>Phí vận chuyển: <strong>{selectedOrder.shipping_fee.toLocaleString('vi-VN')} đ</strong></div>
              <div style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', fontWeight: 800, marginTop: '0.3rem' }}>
                Tổng thanh toán: {(selectedOrder.total).toLocaleString('vi-VN')} đ
              </div>
            </div>

            {/* Status lifecycle actions */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem' }}>Quy trình xử lý đơn hàng</h4>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {selectedOrder.status === 'pending' && (
                  <>
                    <button className="gradient-btn" onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}>
                      ✓ Xác nhận đơn
                    </button>
                    <button className="secondary-btn" style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}>
                      ✕ Hủy đơn hàng
                    </button>
                  </>
                )}
                
                {selectedOrder.status === 'confirmed' && (
                  <>
                    <button className="gradient-btn" onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}>
                      🏗️ Chuẩn bị hàng xong / Đóng gói
                    </button>
                    <button className="secondary-btn" style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}>
                      ✕ Hủy đơn hàng
                    </button>
                  </>
                )}

                {selectedOrder.status === 'processing' && (
                  <button className="gradient-btn" onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped')}>
                    🚚 Bàn giao vận chuyển (Shipped)
                  </button>
                )}

                {selectedOrder.status === 'shipped' && (
                  <button className="gradient-btn" onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')} style={{ background: 'var(--success)' }}>
                    ✅ Xác nhận giao thành công (Delivered)
                  </button>
                )}

                {selectedOrder.status === 'delivered' && (
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>🎉 Đơn hàng đã giao thành công và trừ kho tự động.</span>
                )}

                {selectedOrder.status === 'cancelled' && (
                  <span style={{ color: 'var(--error)', fontWeight: 600 }}>❌ Đơn hàng đã bị hủy.</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="secondary-btn" onClick={() => setIsOrderModalOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
