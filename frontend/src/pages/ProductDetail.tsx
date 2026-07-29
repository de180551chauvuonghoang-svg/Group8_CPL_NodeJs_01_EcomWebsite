import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { productService } from '../services/productService';
import { reviewService, Review } from '../services/reviewService';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { Product } from '../types';
import { setLiveChatSeller } from '../components/common/LiveChatWidget';

/* ─── Helpers ─── */
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

/* Generate extra gallery images from the same CDN URL with slight variation */
const buildGallery = (main: string): string[] => {
  if (!main) return [];
  // Use the same image as all thumbnails (backend only returns 1 image)
  return [main, main, main, main];
};

/* Static specs per category */
const SPECS_BY_CATEGORY: Record<string, Record<string, string>> = {
  Audio: {
    'Kết nối':       'Bluetooth 5.3, LDAC',
    'Driver':        '40mm Titanium',
    'Tần số':        '20Hz – 40,000Hz',
    'ANC':           'Hybrid Active Noise Cancelling',
    'Thời lượng pin':'40 giờ (ANC bật: 28 giờ)',
    'Sạc':           'USB-C, 10 phút = 4 giờ nghe',
    'Trọng lượng':   '250g',
  },
  Wearables: {
    'Màn hình':      'AMOLED 1.43", 466×466px',
    'Chip':          'Dual-core ARM Cortex-M33',
    'Pin':           '14 ngày (chế độ thường)',
    'GPS':           'Built-in GPS + GLONASS',
    'Cảm biến':      'SpO2, HR, Stress, Nhiệt độ',
    'Kháng nước':    '5ATM (50m)',
    'Tương thích':   'Android 6.0+, iOS 12+',
  },
  Electronics: {
    'Màn hình':      'OLED 11", 2560×1600px, 120Hz',
    'Chip':          'Octa-core 4nm',
    'RAM':           '12 GB LPDDR5',
    'Bộ nhớ':        '256 GB UFS 3.1',
    'Camera':        '13MP + 5MP (selfie)',
    'Pin':           '10,090 mAh, sạc 45W',
    'HĐH':           'Android 14',
  },
  Accessories: {
    'Kết nối':       'Wi-Fi 6, Zigbee, Z-Wave, BLE',
    'Tương thích':   'Google Home, Alexa, Apple Home',
    'Nguồn':         'DC 5V/2A',
    'Màu sắc LED':   '16 triệu màu',
    'Kích thước':    '120×120×25mm',
    'Trọng lượng':   '220g',
  },
  'Home & Kitchen': {
    'Công suất':     '1800W',
    'Thể tích':      '30 lít',
    'Nhiệt độ':      '30°C – 230°C',
    'Chế độ':        'Nướng, Sấy, Tối ưu',
    'Kết nối':       'Wi-Fi 2.4GHz',
    'Camera':        'HD 1080p nội thất',
    'Kích thước':    '48×40×35cm',
  },
};

/* ─── Star Rating Component ─── */
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(rating);
      const half   = !filled && i < rating;
      return (
        <span key={i} className={`text-[18px] ${filled || half ? 'text-warning' : 'text-outline-variant'}`}>
          {filled ? '★' : half ? '⯨' : '☆'}
        </span>
      );
    })}
  </div>
);

/* ─── Related Product Card ─── */
const RelatedCard = ({ product }: { product: Product }) => (
  <Link
    to={`/products/${product.id}`}
    className="group flex flex-col rounded-2xl overflow-hidden border border-outline-variant/40
               hover:border-primary/30 hover:shadow-lg bg-surface-container transition-all duration-300"
  >
    <div className="aspect-square overflow-hidden bg-surface-container-low">
      <img
        src={product.image || '/placeholder.png'}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/eef2ff/4f46e5?text=No+Image'; }}
      />
    </div>
    <div className="p-3">
      <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{product.category}</p>
      <p className="text-sm font-bold text-on-surface line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">{product.name}</p>
      <p className="text-primary font-black text-sm mt-1">{fmt(product.price)}</p>
    </div>
  </Link>
);

/* ─── Tabs ─── */
type Tab = 'description' | 'specs' | 'reviews';

/* ─── Main Page ─── */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user;

  const [product, setProduct]   = useState<Product | null>(null);
  const [related, setRelated]   = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty]           = useState(1);
  const [tab, setTab]           = useState<Tab>('description');
  const [added, setAdded]       = useState(false);
  const [boughtNow, setBoughtNow] = useState(false);
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  /* Fetch product */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    setQty(1);
    setActiveImg(0);
    setTab('description');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    (async () => {
      try {
        const p = await productService.getById(id);
        setProduct(p);
        const rel = await productService.getRelated(id, p.category);
        setRelated(rel);
      } catch {
        setError('Không tìm thấy sản phẩm.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* Fetch reviews when the Reviews tab is opened */
  useEffect(() => {
    if (tab !== 'reviews' || !id) return;
    setReviewsLoading(true);
    reviewService.getProductReviews(id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [tab, id]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, addToCart]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    addToCart(product);
    navigate('/cart');
  }, [product, addToCart, navigate]);

  const handleChatWithSeller = useCallback(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (product?.seller_user_id) {
      setLiveChatSeller(product.seller_user_id, {
        name: product.seller_name || 'Shop',
        avatarUrl: product.seller_logo_url,
        shopId: product.seller_id,
      });
    }
  }, [user, product, navigate]);

  /* ─── Loading skeleton ─── */
  if (loading) return (
    <div className="max-w-container-max mx-auto px-margin-desktop py-10 animate-pulse">
      <div className="h-4 bg-surface-container rounded-full w-48 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-3">
          <div className="aspect-square rounded-3xl bg-surface-container" />
          <div className="grid grid-cols-4 gap-2">
            {[0,1,2,3].map(i => <div key={i} className="aspect-square rounded-xl bg-surface-container" />)}
          </div>
        </div>
        <div className="space-y-4 pt-4">
          <div className="h-3 bg-surface-container rounded-full w-20" />
          <div className="h-8 bg-surface-container rounded-full w-3/4" />
          <div className="h-4 bg-surface-container rounded-full w-32" />
          <div className="h-10 bg-surface-container rounded-full w-48" />
          <div className="h-12 bg-surface-container rounded-2xl w-full mt-8" />
          <div className="h-12 bg-surface-container rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );

  /* ─── Error state ─── */
  if (error || !product) return (
    <div className="flex flex-col items-center justify-center py-40 text-center">
      <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4">error_outline</span>
      <h2 className="text-xl font-bold text-on-surface mb-2">{error || 'Sản phẩm không tồn tại'}</h2>
      <Link to="/products" className="mt-4 px-6 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:brightness-110">
        Quay lại danh sách
      </Link>
    </div>
  );

  const gallery    = buildGallery(product.image);
  const specs      = SPECS_BY_CATEGORY[product.category] ?? {};
  const rating     = product.rating ?? 0;
  const reviewCount = product.reviewsCount ?? (rating > 0 ? Math.floor(rating * 18 + 12) : 0);
  const isOutOfStock = product.stock === 0;
  const stockLow   = product.stock > 0 && product.stock <= 5;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-container-max mx-auto px-margin-desktop py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-8 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to="/products" className="hover:text-primary transition-colors">Sản phẩm</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* ── Product layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* Left — Images */}
          <div className="space-y-3">
            {/* Main image */}
            <motion.div
              key={activeImg}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="relative aspect-square rounded-3xl overflow-hidden bg-surface-container-low border border-outline-variant/30"
            >
              <img
                src={gallery[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/eef2ff/4f46e5?text=No+Image'; }}
              />
              {/* Stock badge overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-error font-black text-lg border-4 border-error rounded-2xl px-6 py-2 rotate-[-8deg]">HẾT HÀNG</span>
                </div>
              )}
            </motion.div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200
                    ${activeImg === i ? 'border-primary shadow-md' : 'border-outline-variant/40 hover:border-primary/40'}`}
                >
                  <img src={src} alt={`View ${i+1}`} className="w-full h-full object-cover"
                       onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x120/eef2ff/4f46e5?text=+'; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right — Info */}
          <div className="flex flex-col">
            {/* Category */}
            <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{product.category}</span>

            {/* Name */}
            <h1 className="text-2xl lg:text-3xl font-black text-navy-dark leading-tight mb-3">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <StarRating rating={rating} />
              <span className="text-sm font-semibold text-on-surface">{rating.toFixed(1)}</span>
              <span className="text-sm text-on-surface-variant">({reviewCount} đánh giá)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-black text-primary">{fmt(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-lg text-on-surface-variant line-through">{fmt(product.originalPrice)}</span>
                  <span className="text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </span>
                </>
              )}
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-6">
              {isOutOfStock ? (
                <span className="flex items-center gap-1.5 text-error text-sm font-semibold">
                  <span className="material-symbols-outlined text-[16px]">cancel</span> Hết hàng
                </span>
              ) : stockLow ? (
                <span className="flex items-center gap-1.5 text-warning text-sm font-semibold">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Chỉ còn {product.stock} sản phẩm
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-success text-sm font-semibold">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Còn hàng ({product.stock} sản phẩm)
                </span>
              )}
            </div>

            {/* Short description */}
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6 border-t border-outline-variant/30 pt-4">
              {product.description}
            </p>

            {/* Quantity */}
            {!isOutOfStock && (
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-semibold text-on-surface-variant">Số lượng:</span>
                <div className="flex items-center border border-outline-variant rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="w-10 h-10 flex items-center justify-center text-on-surface-variant
                               hover:bg-surface-container disabled:opacity-40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">remove</span>
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center font-bold text-on-surface text-sm border-x border-outline-variant">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                    className="w-10 h-10 flex items-center justify-center text-on-surface-variant
                               hover:bg-surface-container disabled:opacity-40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200
                  ${isOutOfStock
                    ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                    : added
                    ? 'bg-success text-white'
                    : 'border-2 border-primary text-primary hover:bg-primary hover:text-white active:scale-98'
                  }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {added ? 'check_circle' : 'add_shopping_cart'}
                </span>
                {added ? 'Đã thêm vào giỏ!' : 'Thêm vào giỏ hàng'}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2
                           bg-primary text-white hover:brightness-110 active:scale-98 transition-all duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: isOutOfStock ? undefined : 'var(--accent-gradient)' }}
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                Mua ngay
              </button>
            </div>

            {product.seller_id && (
              <Link
                to={`/shops/${product.seller_id}`}
                className="w-full h-12 mb-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-outline hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all duration-200 active:scale-98"
              >
                <span className="material-symbols-outlined text-[20px]">storefront</span>
                Xem shop
              </Link>
            )}

            {/* Chat with Seller Button */}
            {product.seller_user_id && (!user || (user.id !== product.seller_user_id && user.role !== 'admin')) && (
              <button
                onClick={handleChatWithSeller}
                className="w-full h-12 mb-8 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-outline hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all duration-200 active:scale-98"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                Chat với người bán
              </button>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-outline-variant/30">
              {[
                { icon: 'local_shipping', text: 'Miễn phí vận chuyển' },
                { icon: 'verified_user',  text: 'Bảo hành 12 tháng' },
                { icon: 'autorenew',      text: 'Đổi trả 30 ngày' },
              ].map(b => (
                <div key={b.icon} className="flex flex-col items-center text-center gap-1.5 p-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">{b.icon}</span>
                  <span className="text-[11px] text-on-surface-variant font-medium leading-tight">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="mt-14 border-t border-outline-variant/30 pt-8">
          {/* Tab headers */}
          <div className="flex gap-1 mb-8 border-b border-outline-variant/30">
            {([
              { key: 'description', label: 'Mô tả sản phẩm', icon: 'description' },
              { key: 'specs',       label: 'Thông số kỹ thuật', icon: 'tune' },
              { key: 'reviews',     label: `Đánh giá (${tab === 'reviews' && !reviewsLoading ? reviews.length : reviewCount})`, icon: 'star' },
            ] as { key: Tab; label: string; icon: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200
                  ${tab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'description' && (
                <div className="max-w-2xl text-on-surface-variant leading-relaxed space-y-4 text-sm">
                  <p>{product.description}</p>
                  <p>
                    Sản phẩm được thiết kế dành riêng cho những người dùng đòi hỏi cao về chất lượng và hiệu năng.
                    Với công nghệ tiên tiến và vật liệu cao cấp, {product.name} mang đến trải nghiệm vượt trội trong phân khúc của mình.
                  </p>
                  <p>
                    Được sản xuất theo tiêu chuẩn quốc tế, sản phẩm đã đạt các chứng chỉ CE, FCC và đảm bảo an toàn người dùng.
                    Bảo hành chính hãng 12 tháng, hỗ trợ kỹ thuật 24/7.
                  </p>
                </div>
              )}

              {tab === 'specs' && (
                <div className="max-w-lg">
                  {Object.keys(specs).length > 0 ? (
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(specs).map(([k, v], i) => (
                          <tr key={k} className={i % 2 === 0 ? 'bg-surface-container/40' : ''}>
                            <td className="py-3 px-4 font-semibold text-on-surface-variant w-40 rounded-l-lg">{k}</td>
                            <td className="py-3 px-4 text-on-surface rounded-r-lg">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-on-surface-variant text-sm">Chưa có thông số kỹ thuật cho sản phẩm này.</p>
                  )}
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-4 max-w-xl">
                  {reviewsLoading ? (
                    <div className="flex items-center gap-2 text-on-surface-variant py-6">
                      <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                      Đang tải đánh giá...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">rate_review</span>
                      <p className="mt-3 text-on-surface-variant text-sm">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                      <p className="text-xs text-on-surface-variant/60 mt-1">Mua hàng xong, vào Đơn hàng → Đánh giá sản phẩm.</p>
                    </div>
                  ) : (
                    <>
                      {/* Rating summary — calculated from real reviews */}
                      <div className="flex items-center gap-6 p-5 rounded-2xl bg-surface-container">
                        <div className="text-center shrink-0">
                          <div className="text-5xl font-black text-primary">
                            {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                          </div>
                          <StarRating rating={reviews.reduce((s, r) => s + r.rating, 0) / reviews.length} />
                          <p className="text-xs text-on-surface-variant mt-1">{reviews.length} đánh giá</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = reviews.filter(r => r.rating === star).length;
                            const pct   = Math.round((count / reviews.length) * 100);
                            return (
                              <div key={star} className="flex items-center gap-2 text-xs">
                                <span className="w-3 text-on-surface-variant">{star}</span>
                                <span className="text-warning text-[10px]">★</span>
                                <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                                  <div className="h-full rounded-full bg-warning transition-all duration-500"
                                       style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-7 text-right text-on-surface-variant">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Review cards */}
                      {reviews.map(r => {
                        const initials = r.user_name?.slice(0, 1).toUpperCase() || '?';
                        const dateStr  = new Date(r.created_at).toLocaleDateString('vi-VN');
                        return (
                          <div key={r.id} className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                {r.avatar_url ? (
                                  <img src={r.avatar_url} alt={r.user_name}
                                       className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {initials}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-on-surface">{r.user_name}</p>
                                  <p className="text-[10px] text-on-surface-variant">{dateStr}</p>
                                </div>
                              </div>
                              <div className="flex text-warning text-sm shrink-0">
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                              </div>
                            </div>
                            {r.title && (
                              <p className="text-sm font-semibold text-on-surface mb-1">{r.title}</p>
                            )}
                            {r.body && (
                              <p className="text-sm text-on-surface-variant leading-relaxed">{r.body}</p>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-outline-variant/30 pt-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-navy-dark">Sản phẩm liên quan</h2>
              <Link
                to={`/products?category=${product.category_slug || product.category}`}
                className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
              >
                Xem tất cả
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map(p => <RelatedCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky mobile add-to-cart ── */}
      {!isOutOfStock && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 p-4 safe-area-inset-bottom">
          <div className="flex gap-3 max-w-sm mx-auto">
            <button
              onClick={handleAddToCart}
              className={`flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2
                border-2 border-primary transition-all duration-200
                ${added ? 'bg-success border-success text-white' : 'text-primary hover:bg-primary hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[18px]">{added ? 'check_circle' : 'add_shopping_cart'}</span>
              {added ? 'Đã thêm!' : 'Thêm giỏ'}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Mua ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
