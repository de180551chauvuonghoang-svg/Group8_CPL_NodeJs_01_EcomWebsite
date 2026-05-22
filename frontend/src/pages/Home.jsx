import React, { useState, useEffect, useContext } from 'react';
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
  Percent 
} from 'lucide-react';
import { productService } from '../services/productService.js';
import { AuthContext } from '../context/AuthContext.jsx';
import Spinner from '../components/common/Spinner.jsx';

export default function Home() {
  const { isAuthenticated, user } = useContext(AuthContext);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [copied, setCopied] = useState(false);

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

    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [category, search]);

  const categories = ['Audio', 'Accessories', 'Wearables', 'Home & Kitchen', 'Electronics'];

  const handleCopyCode = () => {
    navigator.clipboard.writeText('ECOM2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollToProducts = () => {
    const element = document.getElementById('products-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
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
        <div style={{ flex: '1', minWidth: '300px', zIndex: 2 }}>
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
            <span>BỘ SƯU TẬP THỜI THƯỢNG 2026</span>
          </div>

          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, marginBottom: '1.2rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Trải Nghiệm Mua Sắm <br />
            <span className="gradient-text" style={{ position: 'relative' }}>
              Thời Thượng & Đột Phá
              <span className="text-underline" />
            </span>
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '600px', lineHeight: 1.65, marginBottom: '2rem' }}>
            {isAuthenticated ? (
              <span>Chào mừng quay trở lại, <strong style={{ color: '#fff' }}>{user?.name || 'Bạn'}</strong>! </span>
            ) : null}
            Khám phá những thiết bị công nghệ hiện đại, phụ kiện độc đáo và các giải pháp thông minh tối ưu hóa trải nghiệm cuộc sống của bạn.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={handleScrollToProducts} className="gradient-btn hero-btn" style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}>
              <span>Mua Sắm Ngay</span>
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
            <h4 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>99%</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Khách hàng hài lòng</p>
          </div>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <Truck size={24} style={{ color: 'var(--info)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>2 Giờ</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Giao nhanh nội thành</p>
          </div>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <ShieldCheck size={24} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>100%</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Bảo hành chính hãng</p>
          </div>
          <div className="glass-panel stat-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <Sparkles size={24} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>50k+</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Sản phẩm đã bán</p>
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
            <h5>Giao Hàng Toàn Quốc</h5>
            <p>Miễn phí đơn hàng từ $500</p>
          </div>
        </div>
        <div className="feature-item">
          <ShieldCheck className="feature-icon" style={{ color: 'var(--success)' }} />
          <div>
            <h5>Thanh Toán An Toàn</h5>
            <p>Bảo mật giao dịch 100%</p>
          </div>
        </div>
        <div className="feature-item">
          <Clock className="feature-icon" style={{ color: 'var(--warning)' }} />
          <div>
            <h5>Hỗ Trợ 24/7</h5>
            <p>Đội ngũ chuyên nghiệp tận tâm</p>
          </div>
        </div>
        <div className="feature-item">
          <CreditCard className="feature-icon" style={{ color: 'var(--accent-secondary)' }} />
          <div>
            <h5>Trả Góp 0%</h5>
            <p>Thủ tục xét duyệt trực tuyến nhanh</p>
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
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Danh Mục Sản Phẩm</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>Chọn nhóm sản phẩm yêu thích của bạn</p>
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
              Tất cả sản phẩm
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
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Không Tìm Thấy Sản Phẩm Phù Hợp</h3>
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
            const stockPercent = Math.min((product.stock / 50) * 100, 100);

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
                      BÁN CHẠY 🔥
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
                    zIndex: 3
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
                  
                  {/* Title & Brand */}
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
                        {isLowStock ? `Sắp cháy hàng (Còn ${product.stock})` : `Còn lại: ${product.stock} sản phẩm`}
                      </span>
                      <span style={{ fontWeight: 600 }}>{product.stock} sản phẩm</span>
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
                      <span className="price-tag" style={{ fontSize: '1.5rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ${product.price.toFixed(2)}
                      </span>
                    </div>

                    <button className="card-quick-buy" style={{
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
                    }}>
                      <ShoppingBag size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Chọn mua</span>
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
            <span>ƯU ĐÃI VIP HÔM NAY</span>
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
            Giảm Ngay 15% Cho Đơn Hàng Đầu Tiên
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px' }}>
            Nhập mã ưu đãi khi thanh toán để được chiết khấu trực tiếp và nhận phần quà công nghệ giới hạn.
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
            ECOM2026
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

