import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { productService } from '../services/productService';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

/* ─── Helpers ─── */
const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const STAR_RATING = (r: number) =>
  Array.from({ length: 5 }, (_, i) => i < Math.floor(r) ? '★' : i < r ? '½' : '☆').join('');

const CATEGORIES = [
  { key: '',            label: 'Tất cả' },
  { key: 'Audio',       label: 'Audio & Âm Thanh' },
  { key: 'Wearables',   label: 'Thiết Bị Đeo' },
  { key: 'Electronics', label: 'Điện Tử' },
  { key: 'Accessories', label: 'Phụ Kiện' },
  { key: 'Home & Kitchen', label: 'Nhà & Bếp' },
];

const SORT_OPTIONS = [
  { key: 'featured',   label: 'Nổi bật' },
  { key: 'price-asc',  label: 'Giá: Thấp → Cao' },
  { key: 'price-desc', label: 'Giá: Cao → Thấp' },
  { key: 'rating',     label: 'Đánh giá cao nhất' },
  { key: 'name',       label: 'Tên A → Z' },
];

/* ─── Skeleton Card ─── */
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-surface-container animate-pulse">
    <div className="aspect-square bg-surface-container-high" />
    <div className="p-4 space-y-2">
      <div className="h-3 bg-surface-container-high rounded-full w-1/3" />
      <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
      <div className="h-3 bg-surface-container-high rounded-full w-1/2" />
      <div className="h-5 bg-surface-container-high rounded-full w-2/5 mt-2" />
    </div>
  </div>
);

/* ─── Product Card ─── */
const ProductCard = ({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product) => void }) => {
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const isOutOfStock = product.stock === 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const rating = product.rating ?? 0;
  const reviewCount = product.reviewsCount ?? (rating > 0 ? Math.floor(rating * 18 + 12) : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        to={`/products/${product.id}`}
        className="group block premium-card overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-surface-container-low">
          <img
            src={product.image || '/placeholder.png'}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ willChange: 'transform' }}
            onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/eef2ff/4f46e5?text=No+Image'; }}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isOutOfStock && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/90 text-on-error">Hết hàng</span>
            )}
            {!isOutOfStock && product.stock <= 5 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/90 text-white">Sắp hết</span>
            )}
          </div>

          {/* Quick-add button */}
          <AnimatePresence>
            {hovered && !isOutOfStock && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                onClick={handleAdd}
                className={`absolute bottom-3 left-3 right-3 py-2 rounded-xl text-xs font-bold
                           flex items-center justify-center gap-1.5 transition-colors
                           ${added
                             ? 'bg-success text-white'
                             : 'bg-primary text-white hover:bg-primary-container'
                           }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {added ? 'check_circle' : 'add_shopping_cart'}
                </span>
                {added ? 'Đã thêm!' : 'Thêm vào giỏ'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[11px] text-primary font-semibold uppercase tracking-wide mb-1">
            {product.category}
          </p>
          <h3 className="text-sm font-bold text-on-surface line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
            {product.name}
          </h3>

          {/* Rating — chỉ hiển thị nếu có rating */}
          {rating > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-warning text-[13px] tracking-tighter">
                {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {rating.toFixed(1)}{reviewCount > 0 && ` (${reviewCount})`}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-primary">{fmt(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-on-surface-variant line-through">{fmt(product.originalPrice)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

/* ─── Main Page ─── */
export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const urlCategory = searchParams.get('category') || '';
  const urlSearch   = searchParams.get('search')   || '';
  const urlSort     = searchParams.get('sort')      || 'featured';

  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCat, setSelectedCat] = useState(urlCategory);
  const [sortKey, setSortKey]       = useState(urlSort);
  const [searchVal, setSearchVal]   = useState(urlSearch);
  const [filterOpen, setFilterOpen] = useState(false); // mobile filter
  const [addedId, setAddedId]       = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);

  /* Fetch products */
  useEffect(() => {
    setLoading(true);
    setVisibleCount(12);
    const t = setTimeout(async () => {
      try {
        const data = await productService.getAll({ category: selectedCat, search: searchVal });
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [selectedCat, searchVal]);

  /* Sync URL */
  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCat) p.set('category', selectedCat);
    if (searchVal)   p.set('search', searchVal);
    if (sortKey !== 'featured') p.set('sort', sortKey);
    setSearchParams(p, { replace: true });
  }, [selectedCat, searchVal, sortKey]);

  /* Sort */
  const sorted = [...products].sort((a, b) => {
    if (sortKey === 'price-asc')  return a.price - b.price;
    if (sortKey === 'price-desc') return b.price - a.price;
    if (sortKey === 'rating')     return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortKey === 'name')       return a.name.localeCompare(b.name, 'vi');
    return 0;
  });

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1800);
  }, [addToCart]);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Banner ── */}
      <div className="relative bg-gradient-to-br from-primary/8 via-background to-secondary/5 border-b border-outline-variant/30">
        <div className="max-w-container-max mx-auto px-margin-desktop py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
            <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-semibold">Sản phẩm</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-navy-dark tracking-tight">
                {selectedCat ? CATEGORIES.find(c => c.key === selectedCat)?.label ?? selectedCat : 'Tất cả sản phẩm'}
              </h1>
              {!loading && (
                <p className="text-on-surface-variant text-sm mt-1">
                  {sorted.length} sản phẩm{searchVal && ` cho "${searchVal}"`}
                </p>
              )}
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/60 bg-surface
                           text-on-surface placeholder:text-on-surface-variant/50 text-sm
                           focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10
                           transition-all duration-200"
              />
              {searchVal && (
                <button
                  onClick={() => setSearchVal('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-container-max mx-auto px-margin-desktop py-8 flex gap-8">

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-6">

            {/* Categories */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Danh mục</h2>
              <div className="space-y-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCat(cat.key)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer
                      ${selectedCat === cat.key
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Sắp xếp</h2>
              <div className="space-y-1">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setSortKey(opt.key)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer
                      ${sortKey === opt.key
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Grid ── */}
        <main className="flex-1 min-w-0">

          {/* Mobile filter bar */}
          <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCat(cat.key)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all
                  ${selectedCat === cat.key
                    ? 'bg-primary text-white border-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort (mobile) */}
          <div className="lg:hidden flex items-center justify-end mb-4">
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="text-sm border border-outline-variant rounded-lg px-3 py-1.5 bg-surface text-on-surface focus:outline-none focus:border-primary/60"
            >
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : sorted.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-surface-container flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[40px] text-on-surface-variant">search_off</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">Không tìm thấy sản phẩm</h3>
              <p className="text-on-surface-variant text-sm max-w-xs mb-6">
                {searchVal ? `Không có kết quả cho "${searchVal}".` : 'Danh mục này hiện chưa có sản phẩm.'}
              </p>
              <button
                onClick={() => { setSearchVal(''); setSelectedCat(''); }}
                className="px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:brightness-110 transition-all"
              >
                Xem tất cả sản phẩm
              </button>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {visible.map((product, idx) => (
                    <motion.div key={product.id} transition={{ delay: Math.min(idx * 0.04, 0.3) }}>
                      <ProductCard product={product} onAddToCart={handleAddToCart} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setVisibleCount(c => c + 12)}
                    className="pill-button pill-button--accent font-bold"
                  >
                    Xem thêm ({sorted.length - visibleCount} sản phẩm)
                  </button>
                </div>
            </>
          )}
        </main>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {addedId && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface
                       px-5 py-3 rounded-full shadow-2xl text-sm font-semibold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
            Đã thêm vào giỏ hàng!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
