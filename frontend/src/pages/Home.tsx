import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  Star, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Clock, 
  CreditCard, 
  Sparkles, 
  Flame, 
  CheckCircle, 
  Percent,
  MapPin,
  MessageSquare,
  Send
} from 'lucide-react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { chatService } from '../services/chatService';
import { AuthContext } from '../context/AuthContext';
import { Product } from '../types';
import Spinner from '../components/common/Spinner';
import ChatPanel from '../components/chat/ChatPanel';
import ChatBubbleLauncher from '../components/chat/ChatBubbleLauncher';

export default function Home() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  
  if (!auth) {
    throw new Error('Home must be used within an AuthProvider');
  }
  const { isAuthenticated, user } = auth;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Quick Order Modal States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  
  // Quick Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    quantity: 1,
    latitude: 10.7380, // Default near shop
    longitude: 106.7218,
    note: ''
  });

  // Shipping Calculation preview state (calculated via simulated client/server logic)
  const [distancePreview, setDistancePreview] = useState<number | null>(null);
  const [shippingFeePreview, setShippingFeePreview] = useState<number | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingWarning, setShippingWarning] = useState<string | null>(null);

  // Coupon States
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);

  // Customer Chat States
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState<boolean>(false);
  const [chatTab, setChatTab] = useState<'shop' | 'ai'>('ai');
  const [selectedShopId, setSelectedShopId] = useState<string>('shop_dongtam');
  const [customerChatMessages, setCustomerChatMessages] = useState<any[]>([]);
  const [aiChatMessages, setAiChatMessages] = useState<any[]>([
    { id: 'ai_welcome', sender_role: 'ai', message_text: 'Xin chào! Tôi là Trợ lý AI tư vấn vật tư của E-Com FPT. Bạn cần tôi giúp gì hôm nay? Bạn có thể hỏi ví dụ: "Tư vấn gạch ốp lát nền" hoặc "Thép đổ móng loại nào tốt?"', created_at: new Date().toISOString() }
  ]);
  const [customerMsgText, setCustomerMsgText] = useState<string>('');
  const [aiMsgText, setAiMsgText] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<any | null>(null);
  const [aiRecommendedProducts, setAiRecommendedProducts] = useState<Record<string, string[]>>({});
  const currentRoomRef = useRef<any | null>(null);
  const socketHandlerRef = useRef<((msg: any) => void) | null>(null);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Shop details mapping (hardcoded for UI preview during checkout before submitting)
  const SHOPS_COORDS: Record<string, { name: string, lat: number, lng: number, feePerKm: number, maxDist: number }> = {
    'shop_dongtam': {
      name: 'VLXD Đồng Tâm',
      lat: 10.7380,
      lng: 106.7218,
      feePerKm: 15000,
      maxDist: 50
    },
    'shop_hoaphat': {
      name: 'VLXD Hòa Phát',
      lat: 10.8480,
      lng: 106.7830,
      feePerKm: 12000,
      maxDist: 40
    }
  };

  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await productService.getAll({ category, search });
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [category, search]);

  const categories = [
    'Xi măng - Gạch - Cát',
    'Sắt thép - Vật liệu thô',
    'Sơn nước - Chất chống thấm',
    'Phụ kiện - Thiết bị xây dựng'
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText('VLXDFPT2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollToProducts = () => {
    const element = document.getElementById('products-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ─── QUICK ORDER MODAL LOGIC ─────────────────────────────────

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Vui lòng nhập mã giảm giá');
      setCouponSuccess(null);
      setDiscountAmount(0);
      return;
    }
    if (!selectedProduct) return;

    setIsValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const subtotal = selectedProduct.price * checkoutForm.quantity;
      const shopId = selectedProduct.shop_id;
      if (!shopId) {
        setCouponError('Không xác định được cửa hàng của sản phẩm. Voucher cần gắn với shop cụ thể.');
        return;
      }
      const res = await orderService.validateCoupon(couponCode, subtotal, shopId);
      setDiscountAmount(res.discountAmount);
      const shopName = SHOPS_COORDS[shopId]?.name || 'cửa hàng này';
      setCouponSuccess(`Áp dụng thành công tại ${shopName}! Giảm ${res.discountAmount.toLocaleString('vi-VN')} đ`);
    } catch (err: any) {
      setCouponError(err.message || 'Mã giảm giá không hợp lệ');
      setDiscountAmount(0);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Reset chat state when user logs out or switches account
  useEffect(() => {
    if (!isAuthenticated) {
      chatService.disconnectSocket();
      setCustomerChatMessages([]);
      setCurrentRoom(null);
      setIsChatWidgetOpen(false);
      setCustomerMsgText('');
    }
  }, [isAuthenticated, user?.id]);

  // ─── CUSTOMER CHAT LOGIC ──────────────────────────────────────

  const handleIncomingMessage = useCallback((msg: any) => {
    const roomId = currentRoomRef.current?.id;
    if (roomId && msg.room_id && msg.room_id !== roomId) return;

    setCustomerChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    if (!isChatWidgetOpen || !isAuthenticated) return;

    chatService.initSocket();
    socketHandlerRef.current = handleIncomingMessage;
    chatService.onReceiveMessage(handleIncomingMessage);

    return () => {
      if (socketHandlerRef.current) {
        chatService.offReceiveMessage(socketHandlerRef.current);
        socketHandlerRef.current = null;
      }
    };
  }, [isChatWidgetOpen, isAuthenticated, handleIncomingMessage]);

  useEffect(() => {
    return () => {
      chatService.disconnectSocket();
    };
  }, []);

  // Load shop chat rooms and messages when shop or tab changes
  useEffect(() => {
    if (isChatWidgetOpen && isAuthenticated && chatTab === 'shop') {
      loadShopChat();
    }
  }, [selectedShopId, chatTab, isChatWidgetOpen, isAuthenticated]);

  const loadShopChat = async () => {
    try {
      if (currentRoomRef.current?.id) {
        chatService.leaveRoom(currentRoomRef.current.id);
      }
      const roomsData = await chatService.getRooms();
      const shopRoom = roomsData.rooms.find((r: any) => r.shop_id === selectedShopId);
      if (shopRoom) {
        setCurrentRoom(shopRoom);
        chatService.joinRoom(shopRoom.id);
        const msgs = await chatService.getMessages(shopRoom.id);
        setCustomerChatMessages(msgs);
      } else {
        setCurrentRoom(null);
        setCustomerChatMessages([]);
      }
    } catch (err) {
      console.error('Error loading shop chat:', err);
    }
  };

  const handleSendShopMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerMsgText.trim()) return;

    try {
      const text = customerMsgText;
      setCustomerMsgText('');

      // chatService.sendMessage trả về { roomId, message } sau khi interceptor unwrap
      const res = await chatService.sendMessage({
        roomId: currentRoom?.id,
        shopId: selectedShopId,
        messageText: text
      });

      if (!currentRoom) {
        setCurrentRoom({ id: res.roomId, shop_id: selectedShopId });
        chatService.joinRoom(res.roomId);
      }

      setCustomerChatMessages(prev => {
        if (prev.some(m => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
    } catch (err: any) {
      alert('Không thể gửi tin nhắn: ' + err.message);
    }
  };

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMsgText.trim() || isAiLoading) return;

    const userText = aiMsgText;
    setAiMsgText('');

    const userMsgId = `user_${Math.random().toString(36).substr(2, 9)}`;
    const newMsg = {
      id: userMsgId,
      sender_role: 'customer',
      message_text: userText,
      created_at: new Date().toISOString()
    };

    setAiChatMessages(prev => [...prev, newMsg]);
    setIsAiLoading(true);

    try {
      // chatService.aiConsult trả về { text, recommendedProductIds } sau khi interceptor unwrap
      const res = await chatService.aiConsult(userText);
      
      const aiMsgId = `ai_${Math.random().toString(36).substr(2, 9)}`;
      const aiMsg = {
        id: aiMsgId,
        sender_role: 'ai',
        message_text: res.text || 'Xin lỗi, AI chưa có thông tin để tư vấn.',
        created_at: new Date().toISOString()
      };

      setAiChatMessages(prev => [...prev, aiMsg]);
      
      if (res.recommendedProductIds && res.recommendedProductIds.length > 0) {
        setAiRecommendedProducts(prev => ({
          ...prev,
          [aiMsgId]: res.recommendedProductIds
        }));
      }
    } catch (err: any) {
      const errorMsg = {
        id: `ai_err_${Date.now()}`,
        sender_role: 'ai',
        message_text: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau!',
        created_at: new Date().toISOString()
      };
      setAiChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleOpenQuickOrder = (product: Product) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để thực hiện đặt hàng!');
      navigate('/login');
      return;
    }

    setSelectedProduct(product);

    if (product.shop_id) {
      setSelectedShopId(product.shop_id);
    }

    // Auto-fill customer name & phone if available from auth
    setCheckoutForm({
      name: user?.name || '',
      phone: '',
      address: '',
      quantity: 1,
      latitude: 10.7500, // Coords near HCMC center
      longitude: 106.7000,
      note: ''
    });
    setDistancePreview(null);
    setShippingFeePreview(null);
    setShippingError(null);
    setShippingWarning(null);
    setCouponCode('');
    setDiscountAmount(0);
    setCouponError(null);
    setCouponSuccess(null);
    setIsOrderModalOpen(true);
  };

  // Haversine client-side distance helper for live preview in Modal
  const calculateClientDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Trigger calculation when coordinates or quantity changes in form
  const triggerShippingPreview = () => {
    if (!selectedProduct || !selectedProduct.shop_id) return;
    
    const shopMeta = SHOPS_COORDS[selectedProduct.shop_id];
    if (!shopMeta) {
      setShippingError('Không xác định được tọa độ shop này.');
      setShippingWarning(null);
      return;
    }

    const dist = calculateClientDistance(
      shopMeta.lat,
      shopMeta.lng,
      checkoutForm.latitude,
      checkoutForm.longitude
    );

    const fee = Math.round(dist * shopMeta.feePerKm);
    setDistancePreview(dist);
    setShippingFeePreview(fee);
    setShippingError(null);
    
    if (dist > shopMeta.maxDist) {
      setShippingWarning(`⚠️ Chú ý: Khoảng cách giao hàng khá xa (${dist}km), vượt cự ly khuyên dùng của shop (${shopMeta.maxDist}km). Đơn hàng vẫn có thể được tạo với chi phí vận chuyển tính theo thực tế.`);
    } else {
      setShippingWarning(null);
    }
  };

  const generateRandomCoordsNearShop = () => {
    if (!selectedProduct || !selectedProduct.shop_id) return;
    const shopMeta = SHOPS_COORDS[selectedProduct.shop_id];
    if (!shopMeta) return;

    // Simulate coordinates within 2-45 km of shop
    const latOffset = (Math.random() - 0.5) * 0.45;
    const lngOffset = (Math.random() - 0.5) * 0.45;
    const simulatedLat = Math.round((shopMeta.lat + latOffset) * 1000000) / 1000000;
    const simulatedLng = Math.round((shopMeta.lng + lngOffset) * 1000000) / 1000000;

    setCheckoutForm(prev => {
      const updated = {
        ...prev,
        latitude: simulatedLat,
        longitude: simulatedLng,
        address: prev.address || 'Khu dân cư giả định gần kho'
      };
      
      const dist = calculateClientDistance(shopMeta.lat, shopMeta.lng, simulatedLat, simulatedLng);
      const fee = Math.round(dist * shopMeta.feePerKm);
      setDistancePreview(dist);
      setShippingFeePreview(fee);
      setShippingError(null);
      
      if (dist > shopMeta.maxDist) {
        setShippingWarning(`⚠️ Chú ý: Khoảng cách giao hàng khá xa (${dist}km), vượt cự ly khuyên dùng của shop (${shopMeta.maxDist}km). Đơn hàng vẫn có thể được tạo với chi phí vận chuyển tính theo thực tế.`);
      } else {
        setShippingWarning(null);
      }
      
      return updated;
    });
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (shippingError) {
      alert('Lỗi: ' + shippingError);
      return;
    }

    setCheckoutLoading(true);
    try {
      const payloadItems = [
        {
          variantId: `var_${selectedProduct.id}_default`, // fallback default variant
          quantity: checkoutForm.quantity
        }
      ];

      const shippingInfo = {
        name: checkoutForm.name,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        latitude: checkoutForm.latitude,
        longitude: checkoutForm.longitude,
        note: checkoutForm.note,
        couponCode: couponCode
      };

      await orderService.checkout(payloadItems, shippingInfo);
      alert('Đặt hàng thành công! Đang chuyển hướng đến danh sách đơn hàng của bạn.');
      setIsOrderModalOpen(false);
      navigate('/my-orders');
    } catch (err: any) {
      alert('Đặt hàng thất bại: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', position: 'relative' }}>
      
      {/* Background Decorative Glowing Blobs */}
      <div className="glow-blob blob-1" />
      <div className="glow-blob blob-2" />

      {/* Hero Banner Section */}
      <div className="glass-panel hero-section" style={{
        padding: '4rem 3rem',
        marginBottom: '3rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '2rem'
      }}>
        <div style={{ flex: '2', minWidth: '300px', zIndex: 2 }}>
          {/* Animated Promo Badge */}
          <div className="promo-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#c084fc',
            marginBottom: '1.5rem',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.1)'
          }}>
            <Sparkles size={14} className="animate-sparkle" />
            <span>NỀN TẢNG CUNG CẤP VLXD ĐA NGƯỜI BÁN 2026</span>
          </div>

          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1.2rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Vật Liệu Xây Dựng <br />
            <span className="gradient-text" style={{ position: 'relative' }}>
              Chuẩn Xác Cự Ly - Tối Ưu Chi Phí
              <span className="text-underline" />
            </span>
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '700px', lineHeight: 1.65, marginBottom: '2rem' }}>
            {isAuthenticated ? (
              <span>Chào mừng quay trở lại, <strong style={{ color: '#fff' }}>{user?.name || 'Bạn'}</strong>! </span>
            ) : null}
            Hệ thống tính toán khoảng cách tự động từ kho hàng gần nhất bằng công thức Haversine. Phí vận chuyển minh bạch, thời gian giao hàng chuẩn xác cho gạch, xi măng, sắt thép và thiết bị hoàn thiện.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={handleScrollToProducts} className="gradient-btn hero-btn" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
              <span>Xem Sản Phẩm VLXD</span>
              <ArrowRight size={18} />
            </button>
            {!isAuthenticated && (
              <a href="/login" className="secondary-btn hero-btn-sec" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
                Đăng Nhập
              </a>
            )}
          </div>
        </div>

        {/* Hero Decorative Side Stats Grid */}
        <div style={{ flex: '1', minWidth: '300px', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <Flame size={24} style={{ color: 'var(--accent-secondary)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Đa Cửa Hàng</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Nhiều đại lý VLXD</p>
          </div>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <Truck size={24} style={{ color: 'var(--info)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Haversine</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Tự động tính km</p>
          </div>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <ShieldCheck size={24} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Đúng Giá Kho</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Không đội chi phí ship</p>
          </div>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <Sparkles size={24} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Chính Hãng</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Đồng Tâm, Hòa Phát...</p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        <div className="feature-item">
          <Truck className="feature-icon" style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h5>Vận Chuyển Chuyên Nghiệp</h5>
            <p>Xe ben, xe cẩu giao tận chân công trình</p>
          </div>
        </div>
        <div className="feature-item">
          <ShieldCheck className="feature-icon" style={{ color: 'var(--success)' }} />
          <div>
            <h5>Kiểm Hàng Nhận Tiền</h5>
            <p>Thanh toán COD linh hoạt</p>
          </div>
        </div>
        <div className="feature-item">
          <Clock className="feature-icon" style={{ color: 'var(--warning)' }} />
          <div>
            <h5>Hỗ Trợ Công Trình</h5>
            <p>Tư vấn định lượng vật tư tối ưu</p>
          </div>
        </div>
        <div className="feature-item">
          <CreditCard className="feature-icon" style={{ color: 'var(--accent-secondary)' }} />
          <div>
            <h5>Hóa Đơn VAT</h5>
            <p>Đầy đủ chứng từ xuất xưởng</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div id="products-section" style={{
        scrollMarginTop: '80px',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: '2rem',
          marginBottom: '2.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Kho Vật Liệu Xây Dựng</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>Chọn nhóm vật tư bạn đang cần cho công trình</p>
            </div>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                placeholder="Tìm sản phẩm theo tên..."
                className="input-field search-box"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.7rem', height: '46px', background: 'rgba(18, 20, 32, 0.4)' }}
              />
            </div>
          </div>

          {/* Categories Horizontal Tabs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setCategory('')}
              className={`category-tab ${category === '' ? 'active' : ''}`}
            >
              Tất cả vật tư
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`category-tab ${category === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product List Section */}
      {loading ? (
        <Spinner message="Đang khám phá kho hàng..." />
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <SlidersHorizontal size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1.2rem', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Không Tìm Thấy Vật Tư Phù Hợp</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc danh mục phía trên.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '2.5rem',
          marginBottom: '5rem'
        }}>
          {products.map((product) => {
            const isLowStock = product.stock <= 15;
            const stockPercent = Math.min((product.stock / 200) * 100, 100);
            
            // Get Shop preview name
            const shopName = product.shop_id ? (SHOPS_COORDS[product.shop_id]?.name || 'Đối tác đại lý') : 'Đang cập nhật';

            return (
              <div 
                key={product.id} 
                className="glass-panel product-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  background: 'rgba(18, 20, 32, 0.45)',
                  cursor: 'default'
                }}
              >
                {/* Product Image Cover Container */}
                <div style={{ position: 'relative', width: '100%', paddingTop: '75%', overflow: 'hidden', background: '#08080c' }}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    className="card-image"
                  />
                  
                  {/* Glowing Backlight Overlay */}
                  <div className="card-overlay" />

                  {/* Hot Deal / Stock Alert Overlay Tag */}
                  {isLowStock && (
                    <span className="badge-hot" style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                      zIndex: 3
                    }}>
                      SẮP HẾT HÀNG 🔥
                    </span>
                  )}

                  {/* Category badge */}
                  <span className="badge badge-category" style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(10, 11, 16, 0.75)',
                    color: '#c084fc',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    zIndex: 3,
                    maxWidth: '80%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {product.category}
                  </span>

                  {/* Star Rating Badge */}
                  <span className="badge badge-rating" style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(10, 11, 16, 0.85)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    zIndex: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 700
                  }}>
                    <Star size={12} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                    <span style={{ color: '#fff' }}>{product.rating}</span>
                  </span>
                </div>

                {/* Product Detail Info */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1, position: 'relative' }}>
                  
                  {/* Shop Owner Tag */}
                  <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.4rem' }}>
                    🏪 {shopName}
                  </div>

                  {/* Title */}
                  <h3 className="product-title" style={{ 
                    fontSize: '1.15rem', 
                    fontWeight: 600, 
                    marginBottom: '0.6rem', 
                    lineHeight: 1.4, 
                    height: '46px', 
                    overflow: 'hidden',
                    color: '#fff',
                    transition: 'color 0.2s ease'
                  }}>
                    {product.name}
                  </h3>

                  {/* Description text */}
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem', 
                    marginBottom: '1.25rem', 
                    lineHeight: 1.5,
                    height: '52px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {product.description}
                  </p>

                  {/* Progress Stock Indicator */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span style={{ color: isLowStock ? '#fb923c' : 'var(--text-secondary)' }}>
                        {isLowStock ? `Sắp cháy kho (Còn ${product.stock})` : `Còn lại: ${product.stock} đơn vị`}
                      </span>
                      <span style={{ fontWeight: 600 }}>{product.stock}</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${stockPercent}%`, 
                        height: '100%', 
                        background: isLowStock ? 'linear-gradient(90deg, #f97316, #ef4444)' : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                  </div>

                  {/* Footer Card Pricing & Interactive Buttons */}
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                    <div>
                      <span className="price-tag" style={{ fontSize: '1.35rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {product.price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <button 
                      onClick={() => handleOpenQuickOrder(product)}
                      className="card-quick-buy" 
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <ShoppingBag size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Đặt mua ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Special Promotional Banner Section */}
      <div className="glass-panel promo-banner" style={{
        padding: '3rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '2rem',
        marginBottom: '3rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(236, 72, 153, 0.15)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#f472b6',
            marginBottom: '1rem'
          }}>
            <Percent size={12} />
            <span>KHUYẾN MÃI VẬN CHUYỂN</span>
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
            Hỗ Trợ 50% Phí Vận Chuyển Xa
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px' }}>
            Nhập mã ưu đãi khi thanh toán để được hỗ trợ cự ly lên đến 50km từ kho hàng tổng.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 2, flexWrap: 'wrap' }}>
          <div style={{
            border: '2px dashed rgba(236, 72, 153, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.5rem',
            background: 'rgba(0,0,0,0.2)',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '1px',
            color: '#f472b6'
          }}>
            VLXDFPT2026
          </div>
          <button 
            onClick={handleCopyCode} 
            className="gradient-btn" 
            style={{ 
              height: '48px', 
              padding: '0 1.5rem', 
              fontSize: '0.9rem',
              boxShadow: '0 4px 15px -3px rgba(236, 72, 153, 0.4)',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
            }}
          >
            {copied ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Đã Sao Chép!
              </span>
            ) : 'Sao Chép Mã'}
          </button>
        </div>
      </div>

      {/* ─── QUICK ORDER MODAL ─── */}
      {isOrderModalOpen && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '550px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🏗️ Đặt hàng nhanh VLXD</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsOrderModalOpen(false)}>×</button>
            </div>

            {/* Selected Product Specs */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{selectedProduct.name}</div>
                <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  Đơn giá: {selectedProduct.price.toLocaleString('vi-VN')} đ
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cung cấp bởi: {selectedProduct.shop_id ? (SHOPS_COORDS[selectedProduct.shop_id]?.name || 'Đối tác đại lý') : 'Đang cập nhật'}</div>
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleConfirmOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Họ tên người nhận</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required
                    value={checkoutForm.name}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Số điện thoại</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Địa chỉ nhận hàng (Công trình)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  placeholder="Ví dụ: 123 Lê Lợi, Quận 1, TP.HCM"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Số lượng đặt mua</label>
                  <input 
                    type="number" 
                    min={1}
                    max={selectedProduct.stock}
                    className="input-field" 
                    required
                    value={checkoutForm.quantity}
                    onChange={(e) => {
                      setCheckoutForm({ ...checkoutForm, quantity: Math.min(parseInt(e.target.value) || 1, selectedProduct.stock) });
                      setDiscountAmount(0);
                      setCouponSuccess(null);
                      setCouponError(null);
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="secondary-btn" 
                    style={{ width: '100%', height: '44px', gap: '4px', fontSize: '0.8rem', padding: '0 0.5rem' }} 
                    onClick={generateRandomCoordsNearShop}
                  >
                    <MapPin size={14} /> Tọa độ giả định
                  </button>
                </div>
              </div>

              {/* Coordinates fields for Dev calculation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vĩ độ Khách hàng (Lat)</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    className="input-field" 
                    value={checkoutForm.latitude}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, latitude: parseFloat(e.target.value) })}
                    style={{ height: '36px', fontSize: '0.8rem', padding: '0.4rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kinh độ Khách hàng (Lng)</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    className="input-field" 
                    value={checkoutForm.longitude}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, longitude: parseFloat(e.target.value) })}
                    style={{ height: '36px', fontSize: '0.8rem', padding: '0.4rem' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="secondary-btn" 
                    style={{ padding: '0.2rem 0.8rem', fontSize: '0.75rem', height: '28px' }}
                    onClick={triggerShippingPreview}
                  >
                    🧮 Live tính cự ly & ship
                  </button>
                </div>
              </div>

              {/* Shipping Calculation Preview Box */}
              {shippingError && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  borderLeft: '4px solid var(--error)',
                  padding: '0.8rem 1rem', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ color: 'var(--error)', fontWeight: 600 }}>⚠️ Lỗi: {shippingError}</div>
                </div>
              )}

              {distancePreview !== null && !shippingError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {/* Warning message if distance exceeds recommendation */}
                  {shippingWarning && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderLeft: '4px solid var(--warning)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      color: 'var(--warning)',
                      fontWeight: 500
                    }}>
                      {shippingWarning}
                    </div>
                  )}

                  {/* Standard shipping details */}
                  <div style={{ 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    borderLeft: '4px solid var(--success)',
                    padding: '0.8rem 1rem', 
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ color: 'var(--text-primary)' }}>🛣️ Cự ly đường chim bay: <strong>{distancePreview} km</strong></div>
                      <div style={{ color: 'var(--success)' }}>🚚 Phí vận chuyển: <strong>{shippingFeePreview?.toLocaleString('vi-VN')} đ</strong></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>*(Đã tính theo cự ly thực tế từ kho)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coupon Field */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  Mã giảm giá (Voucher)
                  {selectedProduct.shop_id && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                      — Shop: {SHOPS_COORDS[selectedProduct.shop_id]?.name || selectedProduct.shop_id}
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Nhập mã voucher (ví dụ: VLXDFPT2026)" 
                    className="input-field" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button 
                    type="button" 
                    className="secondary-btn" 
                    style={{ height: '44px', flexShrink: 0, padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon}
                  >
                    {isValidatingCoupon ? '...' : 'Áp dụng'}
                  </button>
                </div>
                {couponError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem' }}>❌ {couponError}</div>
                )}
                {couponSuccess && (
                  <div style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.3rem' }}>✅ {couponSuccess}</div>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Gợi ý: <strong>VLXDFPT2026</strong> (giảm 50.000đ, mọi shop) · <strong>GIAM10</strong> (giảm 10%, chỉ Shop Hòa Phát)
                </div>
              </div>

              {/* Total Summary */}
              {!shippingError && distancePreview !== null && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Tiền hàng: <strong>{(selectedProduct.price * checkoutForm.quantity).toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Phí vận chuyển: <strong>{shippingFeePreview?.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                      Giảm giá: <strong>-{discountAmount.toLocaleString('vi-VN')} đ</strong>
                    </div>
                  )}
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                    Tổng thanh toán: {((selectedProduct.price * checkoutForm.quantity) + (shippingFeePreview || 0) - discountAmount).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsOrderModalOpen(false)}>Hủy</button>
                <button 
                  type="submit" 
                  className="gradient-btn" 
                  disabled={checkoutLoading || !!shippingError || distancePreview === null}
                >
                  {checkoutLoading ? 'Đang gửi đơn hàng...' : '🏗️ Xác nhận đặt hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CHAT WIDGET ─── */}
      {!isChatWidgetOpen && (
        <ChatBubbleLauncher
          onOpen={() => {
            if (!isAuthenticated) {
              alert('Vui lòng đăng nhập để chat với đại lý hoặc Trợ lý AI!');
              navigate('/login');
              return;
            }
            setIsChatWidgetOpen(true);
          }}
        />
      )}

      {isChatWidgetOpen && (
        <ChatPanel
          onClose={() => setIsChatWidgetOpen(false)}
          chatTab={chatTab}
          onTabChange={setChatTab}
          selectedShopId={selectedShopId}
          onShopChange={setSelectedShopId}
          SHOPS_COORDS={SHOPS_COORDS}
          aiChatMessages={aiChatMessages}
          customerChatMessages={customerChatMessages}
          aiRecommendedProducts={aiRecommendedProducts}
          isAiLoading={isAiLoading}
          products={products}
          onOpenOrder={handleOpenQuickOrder}
          aiMsgText={aiMsgText}
          onAiMsgChange={setAiMsgText}
          onSendAi={handleSendAiMessage}
          customerMsgText={customerMsgText}
          onCustomerMsgChange={setCustomerMsgText}
          onSendShop={handleSendShopMessage}
        />
      )}

      {/* Global CSS Inject for Premium Aesthetics */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Pulsating Blur Blob Effects */
        .glow-blob {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
          animation: floatBlob 10s ease-in-out infinite alternate;
        }
        .blob-1 {
          background: var(--accent-primary);
          top: 10%;
          right: -100px;
        }
        .blob-2 {
          background: var(--accent-secondary);
          bottom: 20%;
          left: -150px;
          animation-delay: -5s;
        }
        @keyframes floatBlob {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(40px) scale(1.15); }
        }

        /* Hero Text Highlights */
        .text-underline {
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 4px;
          background: var(--accent-gradient);
          border-radius: var(--radius-full);
          opacity: 0.7;
        }

        /* Hero buttons styling */
        .hero-btn, .hero-btn-sec {
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s ease;
        }
        .hero-btn:hover {
          transform: translateY(-3px) scale(1.02);
        }
        .hero-btn-sec:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.08);
        }

        /* Feature items */
        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: rgba(18, 20, 32, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-md);
          transition: all 0.3s ease;
        }
        .feature-item:hover {
          transform: translateY(-3px);
          background: rgba(18, 20, 32, 0.5);
          border-color: rgba(255,255,255,0.08);
          box-shadow: 0 8px 20px -10px rgba(0,0,0,0.3);
        }
        .feature-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }
        .feature-item h5 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 2px;
        }
        .feature-item p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        /* Category Tab Pills */
        .category-tab {
          padding: 0.6rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(18, 20, 32, 0.4);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .category-tab:hover {
          border-color: rgba(139, 92, 246, 0.3);
          color: #fff;
          transform: translateY(-1px);
        }
        .category-tab.active {
          background: var(--accent-gradient);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 15px -4px rgba(139, 92, 246, 0.5);
        }

        /* Product Card & Hover Effects */
        .product-card {
          transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), border-color 0.3s ease, box-shadow 0.4s ease;
        }
        .product-card:hover {
          transform: translateY(-8px);
          border-color: rgba(139, 92, 246, 0.3) !important;
          box-shadow: 0 20px 35px -10px rgba(139, 92, 246, 0.15), var(--shadow-lg) !important;
        }
        .product-card:hover .card-image {
          transform: scale(1.06);
        }
        .product-card:hover .product-title {
          color: var(--accent-primary) !important;
        }
        .card-image {
          transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
        }
        .card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to top, rgba(8, 8, 12, 0.5) 0%, transparent 100%);
          z-index: 2;
          pointer-events: none;
        }

        /* Card Button styling */
        .card-quick-buy:hover {
          background: var(--accent-gradient) !important;
          border-color: transparent !important;
          box-shadow: 0 4px 12px -2px rgba(139, 92, 246, 0.4);
          transform: scale(1.05);
        }
        .card-quick-buy:hover svg {
          color: #fff !important;
        }

        /* Stats Cards in Hero */
        .stat-card {
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.12) !important;
        }

        /* Keyframes */
        @keyframes sparkleAnimation {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        .animate-sparkle {
          animation: sparkleAnimation 2s infinite ease-in-out;
        }
      `}} />
    </div>
  );
}
