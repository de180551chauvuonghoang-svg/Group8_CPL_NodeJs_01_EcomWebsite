import React, { useState, useEffect, useContext } from 'react';
import { Search, SlidersHorizontal, Star, ShoppingBag } from 'lucide-react';
import { productService } from '../services/productService.js';
import { AuthContext } from '../context/AuthContext.jsx';
import Spinner from '../components/common/Spinner.jsx';

export default function Home() {
  const { isAuthenticated, user } = useContext(AuthContext);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

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

  return (
    <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{
        padding: '3.5rem 2rem',
        marginBottom: '2.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(236, 72, 153, 0.04) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'var(--accent-glow)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          Trải Nghiệm Mua Sắm <span className="gradient-text">Thời Thượng</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '650px', lineHeight: 1.6 }}>
          {isAuthenticated ? `Chào mừng quay trở lại, ${user?.name || 'Bạn'}! ` : ''}Khám phá những thiết bị công nghệ hiện đại và tiện ích gia đình cao cấp với cấu trúc codebase chuẩn mực.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '400px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Categories filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCategory('')}
            className={category === '' ? 'gradient-btn' : 'secondary-btn'}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', height: '40px' }}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={category === cat ? 'gradient-btn' : 'secondary-btn'}
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', height: '40px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <Spinner message="Đang tải danh sách sản phẩm..." />
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <SlidersHorizontal size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>Không tìm thấy sản phẩm nào</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Thử đổi từ khóa hoặc bộ lọc danh mục xem sao nhé.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          {products.map((product) => (
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
                transition: 'var(--transition-normal)',
                cursor: 'default'
              }}
            >
              {/* Product Image */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '65%', overflow: 'hidden', background: '#0a0a0f' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease'
                  }}
                  className="card-image"
                />
                
                {/* Category Badge */}
                <span className="badge badge-info" style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(10, 11, 16, 0.8)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid var(--border-color)'
                }}>
                  {product.category}
                </span>

                {/* Rating Badge */}
                <span className="badge badge-warning" style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(10, 11, 16, 0.8)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid var(--border-color)'
                }}>
                  <Star size={12} fill="var(--warning)" style={{ color: 'var(--warning)' }} />
                  {product.rating}
                </span>
              </div>

              {/* Product Info */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.4, height: '44px', overflow: 'hidden' }}>
                  {product.name}
                </h3>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem', 
                  marginBottom: '1.2rem', 
                  lineHeight: 1.5,
                  height: '52px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {product.description}
                </p>

                {/* Price and Stock details */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                      ${product.price.toFixed(2)}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Còn {product.stock} trong kho
                    </span>
                  </div>

                  <span className="badge badge-info" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <ShoppingBag size={12} />
                    Sẵn sàng
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global CSS injection for Card Hover Zoom effects */}
      <style dangerouslySetInnerHTML={{__html: `
        .product-card:hover .card-image {
          transform: scale(1.08);
        }
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px -10px rgba(139, 92, 246, 0.25) !important;
          border-color: rgba(139, 92, 246, 0.25) !important;
        }
      `}} />
    </div>
  );
}
