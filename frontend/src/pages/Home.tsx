import { useState, useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Star, 
  ShoppingBag, 
  ArrowRight, 
  Sparkles, 
  CheckCircle, 
  Percent, 
  Truck, 
  Inbox
} from 'lucide-react';
import { productService } from '../services/productService';
import { AuthContext } from '../context/AuthContext';
import { Product } from '../types';
import Spinner from '../components/common/Spinner';
import AIBanner from '../components/home/AIBanner';

export default function Home() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('Home must be used within an AuthProvider');
  }
  const { isAuthenticated, user } = auth;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Read search & category parameters from the URL
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

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
    }, 250);

    return () => clearTimeout(timer);
  }, [category, search]);

  const categories = [
    { key: '', label: 'Tất cả sản phẩm' },
    { key: 'Audio', label: 'Audio & Âm Thanh' },
    { key: 'Accessories', label: 'Phụ Kiện' },
    { key: 'Wearables', label: 'Thiết Bị Đeo' },
    { key: 'Home & Kitchen', label: 'Bếp & Gia Dụng' },
    { key: 'Electronics', label: 'Điện Tử' }
  ];

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

  const handleCategorySelect = (catKey: string) => {
    const params: Record<string, string> = {};
    if (catKey) {
      params.category = catKey;
    }
    if (search && search.trim() !== '') {
      params.search = search;
    }
    setSearchParams(params);
  };

  return (
    <div className="bg-background text-on-surface select-none">
      {/* Hero Section (Cinematic Enterprise style) */}
      <section className="relative h-[80vh] overflow-hidden transition-all duration-1000 opacity-100 translate-y-0">
        <div className="absolute inset-0 z-0">
          <img
            alt="Cinematic Hero"
            className="w-full h-full object-cover scale-105 transition-transform duration-[20s] hover:scale-100"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDutVWXgXeNNxAFSw1LnTaGbiHDAiBPBjHHQg-AV_KcN_Mj2W6Lb6OLynbCfV-BQDJETcN3mBJtG3mccPgffl3chP2WTvlBJsiU3sZuQWLhZVeiaEhXysOCLIQygBQPupqpRZVr4cTDcUSE7YbcYACtESilfopmaqsE63q79l6iZgrolR50bM1h5_lEDkV314cOpO3NNTiToUCJh_9QK2hH4ZfCdZNkrR7fNgLYhitHs-ba52A9gbxH7tvHxthqln94pZA1NvbK_vMp"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-container-max mx-auto px-margin-desktop h-full flex flex-col justify-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-label-md mb-6 uppercase tracking-widest w-fit">
            RA MẮT THẾ HỆ MỚI
          </span>
          <h1 className="font-display-lg text-display-lg max-w-3xl mb-8 leading-tight text-navy-dark tracking-tighter text-balance">
            Nâng tầm trải nghiệm sống thông minh
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mb-10">
            {isAuthenticated && user ? (
              <span className="block mb-2 font-semibold">Chào mừng trở lại, {user.name}! 👋</span>
            ) : null}
            Khám phá hệ sinh thái thiết bị điện tử cao cấp, được thiết kế để mang lại sự tiện nghi và hiệu suất tối ưu cho ngôi nhà của bạn.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleScrollToProducts}
              className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              Khám phá ngay <ArrowRight size={18} />
            </button>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-outline/60 text-on-surface px-8 py-4 rounded-full font-bold hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              Xem phim giới thiệu
            </a>
          </div>
        </div>
      </section>

      {/* AI Banner Section */}
      <AIBanner />

      {/* Featured Categories (Bento Grid with Glow Effect) */}
      <section className="py-24 max-w-container-max mx-auto px-margin-desktop transition-all duration-1000 opacity-100 translate-y-0">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="font-headline-md text-headline-md mb-2 text-navy-dark">Danh mục nổi bật</h2>
            <div className="w-20 h-1.5 bg-primary rounded-full"></div>
          </div>
          <button
            onClick={() => handleCategorySelect('')}
            className="text-primary font-bold flex items-center gap-2 hover:underline"
          >
            Xem tất cả danh mục <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-gutter h-auto md:h-[600px]">
          {/* Smart Kitchen (Large) */}
          <div 
            onClick={() => {
              handleCategorySelect('Home & Kitchen');
              handleScrollToProducts();
            }}
            className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-3xl bg-surface-container-low cursor-pointer active:scale-[0.99] transition-all duration-300"
          >
            <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/40 rounded-3xl transition-all duration-300 z-20 pointer-events-none"></div>
            <img
              alt="Smart Kitchen"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC12OlJza_aD8AP2I4nnng3dAjNvaQJHLfZXV_WU0zA-9O44JTitmrqVOloEu0Igr8lG3Wsh_2mS3rxDMEzyyeU9Ly76jXFf_MnTG9xoXIji_Li51R0iMCg-f2aRfGDt4SOuVWSWpZjlL2halI0Qc_jA0XsMlPrV4DqrnBJkc4wS_Ii1TzxIfWQQL4XK8e3bL-i_smxMJEdrvzcmZM0KXmZ6fAxaX_PSfrfdZnm1KC6aAMUlI0OhLIwE2v8ihF0CHwpX39UIXcDH-ci"
              loading="lazy"
              decoding="async"
              style={{ willChange: 'transform' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end z-10">
              <h3 className="text-white font-headline-md text-headline-md tracking-tight">Smart Kitchen</h3>
              <p className="text-white/70 mb-4 font-body-md">Công nghệ nấu nướng hiện đại nhất</p>
              <button className="bg-white text-black px-6 py-2 rounded-full w-fit font-bold opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                Khám Phá
              </button>
            </div>
          </div>

          {/* Premium Audio */}
          <div 
            onClick={() => {
              handleCategorySelect('Audio');
              handleScrollToProducts();
            }}
            className="relative group overflow-hidden rounded-3xl bg-surface-container-low cursor-pointer active:scale-[0.99] transition-all duration-300"
          >
            <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/40 rounded-3xl transition-all duration-300 z-20 pointer-events-none"></div>
            <img
              alt="Premium Audio"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtTsPD5PQ5XucxbkZDcdTHqotWhjcwvxKG6CcyacrvneZbqdhOkrFAXl3WDehncpvRHybj1g6LO4h3iezqDrRts12cDbBP6TaZQ2pRPevruGnG4k20JQMjYN3MSug9iXbD54pdhMfsvo478E3akj2YNWY36uAwCjaId0PUfEzvdR8_OmiYkFj8egHkg9krdGXuGHD5mGOqgVTQr7QPLgk6YaVrwJsert9ccCGYm4pTy3hY4rIYEOXIGLQ5oDVSH0muDXJEdavOq03p"
              loading="lazy"
              decoding="async"
              style={{ willChange: 'transform' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end z-10">
              <h3 className="text-white font-bold font-title-lg tracking-tight">Premium Audio</h3>
            </div>
          </div>

          {/* Home Cinema */}
          <div 
            onClick={() => {
              handleCategorySelect('Electronics');
              handleScrollToProducts();
            }}
            className="relative group overflow-hidden rounded-3xl bg-surface-container-low cursor-pointer active:scale-[0.99] transition-all duration-300"
          >
            <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/40 rounded-3xl transition-all duration-300 z-20 pointer-events-none"></div>
            <img
              alt="Home Cinema"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFshPtdsmM01VDSzYJCRjrjrXxU5gCJgfZvD0Wwq4-N33lAoZKWuJbRH_hEFP1fk9K6VjvgpG92e16iXooBfIP3YKzzZelouhFIs93jtQAWoOy-AiUzlzm-4a6aHZixvt_l57ZIntn1xfuLOY95UJyh5jDBlQoFiLyDqZpXU9lgehNUZdDEXfYif-K0sPKJ-5Dvz4GuirwqR4h--kf9jSuy4nx3s_PsX2oPwQ62OO3ACZDHdJwnT_-IU7ZBfqdbpX4CAM8oEWmqS7h"
              loading="lazy"
              decoding="async"
              style={{ willChange: 'transform' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end z-10">
              <h3 className="text-white font-bold font-title-lg tracking-tight">Home Cinema</h3>
            </div>
          </div>

          {/* Air Treatment */}
          <div 
            onClick={() => {
              handleCategorySelect('Accessories');
              handleScrollToProducts();
            }}
            className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-surface-container-low cursor-pointer active:scale-[0.99] transition-all duration-300"
          >
            <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/40 rounded-3xl transition-all duration-300 z-20 pointer-events-none"></div>
            <img
              alt="Air Treatment"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-w28NnAFIInT0qFs4n_V8zgeaUNCHCvBPOSmhOHuWEj3maUBIS86W3u2DDIFlWY-OHefYL187WXQYT-EULQuHQZ3lU8CED5aPQ_8pY5mdg9MFULmp66LCnLizB-V-n_TT21wphm0QEpmgQXoVsTHMoJkIlvmaoUcQEbfBFSKPAyY76631aG5rfvVDZZHox--CUDRnDrxreXl_tn37ntExPfm68FN-pZgxsKLfrarGaiImFelJ4MqKq5zheNgNsStKPvLFyqrtfIiM"
              loading="lazy"
              decoding="async"
              style={{ willChange: 'transform' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end z-10">
              <h3 className="text-white font-title-lg text-headline-md tracking-tight">Air Treatment</h3>
              <p className="text-white/70 font-body-md">Không khí trong lành, cuộc sống khỏe mạnh</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Products Catalog */}
      <section 
        id="products-section"
        className="py-20 max-w-container-max mx-auto px-margin-desktop border-t border-outline-variant"
        style={{ scrollMarginTop: '90px' }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h2 className="font-headline-md text-headline-md mb-2 text-navy-dark">Bộ Sưu Tập Sản Phẩm</h2>
            <p className="text-on-surface-variant font-body-md">
              {search ? `Kết quả tìm kiếm cho "${search}"` : 'Những thiết bị đỉnh cao nhất phục vụ cuộc sống của bạn'}
            </p>
          </div>

          {/* Categories Tab Pills */}
          <div className="flex flex-wrap gap-2 overflow-x-auto w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategorySelect(cat.key)}
                className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                  category === cat.key
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic List */}
        {loading ? (
          <div className="py-20 flex justify-center w-full">
            <Spinner message="Đang kết nối kho hàng..." />
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center rounded-3xl bg-surface-container-low border border-outline-variant p-10 flex flex-col items-center">
            <Inbox size={48} className="text-outline mb-4" />
            <h3 className="text-title-lg font-bold mb-2 text-navy-dark">Không tìm thấy sản phẩm</h3>
            <p className="text-on-surface-variant max-w-md">
              Hiện tại không có sản phẩm nào khớp với từ khóa tìm kiếm hoặc bộ lọc danh mục đã chọn. Vui lòng thử lại.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => {
              const stock = product.stock || 0;
              const isLowStock = stock <= 10;
              const stockPercent = Math.min((stock / 50) * 100, 100);

              return (
                <div
                  key={product.id}
                  className="premium-card overflow-hidden flex flex-col group relative"
                >
                  {/* Image Frame */}
                  <div className="relative pt-[75%] overflow-hidden bg-surface-container">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      style={{ willChange: 'transform' }}
                    />
                    {isLowStock && (
                      <span className="absolute top-4 right-4 bg-error text-white font-bold text-[10px] px-3 py-1 rounded-full shadow-md">
                        SẮP HẾT HÀNG
                      </span>
                    )}
                    <span className="absolute top-4 left-4 bg-white/80 dark:bg-black/60 text-primary dark:text-inverse-primary backdrop-blur-md font-bold text-xs px-3 py-1 rounded-full border border-outline-variant">
                      {product.category}
                    </span>
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Star size={12} className="fill-warning text-warning" />
                      <span>{product.rating}</span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-bold text-body-lg text-on-surface group-hover:text-primary transition-colors line-clamp-1 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-on-surface-variant text-body-md line-clamp-2 mb-4 h-12">
                      {product.description}
                    </p>

                    {/* Stock Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-semibold mb-2">
                        <span className={isLowStock ? 'text-error' : 'text-on-surface-variant'}>
                          {isLowStock ? `Chỉ còn ${stock} sản phẩm` : `Kho: ${stock}`}
                        </span>
                        <span className="text-on-surface-variant">{stock} SP</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          style={{ width: `${stockPercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLowStock ? 'bg-error' : 'bg-primary'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="mt-auto flex justify-between items-center">
                      <span className="font-display-lg text-primary text-title-lg font-black tracking-tight">
                        ${(product.price || 0).toLocaleString('vi-VN')}
                      </span>
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 hover:bg-primary hover:text-white text-primary font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer">
                        <ShoppingBag size={14} />
                        <span>Chọn mua</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Member Benefits Section (Styled like Showcase Section) */}
      <section className="bg-inverse-surface py-32 relative overflow-hidden transition-all duration-1000 opacity-100 translate-y-0 border-t border-outline-variant">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_50%)]"></div>
        <div className="max-w-container-max mx-auto px-margin-desktop relative z-10">
          <div className="text-center mb-16">
            <span className="text-primary font-bold tracking-[0.3em] uppercase mb-4 block">CỘNG ĐỒNG VOLITIFY</span>
            <h2 className="text-display-md font-display-md text-white mb-6 leading-tight">Đặc quyền Thành viên</h2>
            <p className="text-body-lg text-surface-variant/80 max-w-2xl mx-auto">
              Tham gia cộng đồng Volitify ngay hôm nay để nhận được những ưu đãi độc quyền và trải nghiệm mua sắm cá nhân hóa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Percent size={30} className="text-primary" />
              </div>
              <h4 className="font-bold text-headline-md text-white mb-4">Giảm 10%</h4>
              <p className="text-body-md text-surface-variant/70 leading-relaxed">
                Cho đơn hàng đầu tiên khi bạn đăng ký tài khoản mới.
              </p>
            </div>
            <div className="p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Truck size={30} className="text-primary" />
              </div>
              <h4 className="font-bold text-headline-md text-white mb-4">Miễn phí vận chuyển</h4>
              <p className="text-body-md text-surface-variant/70 leading-relaxed">
                Giao hàng tận nơi miễn phí cho mọi đơn hàng trên toàn quốc.
              </p>
            </div>
            <div className="p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles size={30} className="text-primary" />
              </div>
              <h4 className="font-bold text-headline-md text-white mb-4">Truy cập sớm</h4>
              <p className="text-body-md text-surface-variant/70 leading-relaxed">
                Ưu tiên trải nghiệm và đặt trước các sản phẩm mới ra mắt.
              </p>
            </div>
          </div>
          <div className="mt-20 text-center">
            <button className="bg-primary text-white px-12 py-5 rounded-full font-bold hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all text-title-lg">
              Gia nhập ngay
            </button>
            {!isAuthenticated && (
              <p className="mt-6 text-surface-variant/40 font-body-md">
                Đã có tài khoản? <Link className="text-primary hover:underline" to="/login">Đăng nhập</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Special Promotional Banner Section */}
      <section className="py-20 max-w-container-max mx-auto px-margin-desktop">
        <div className="p-12 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-outline-variant flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
              <Percent size={12} />
              <span>ƯU ĐÃI VIP HÔM NAY</span>
            </div>
            <h3 className="text-headline-md font-bold text-on-surface mb-3">
              Giảm Ngay 15% Cho Đơn Hàng Đầu Tiên
            </h3>
            <p className="text-on-surface-variant font-body-md max-w-xl">
              Nhập mã ưu đãi khi thanh toán để được chiết khấu trực tiếp và nhận phần quà công nghệ giới hạn cực kỳ hấp dẫn.
            </p>
          </div>

          <div className="flex items-center gap-4 z-10 flex-wrap shrink-0">
            <div className="border-2 border-dashed border-primary/40 rounded-2xl px-6 py-3 bg-surface-container font-black text-xl tracking-wider text-primary">
              ECOM2026
            </div>
            <button
              onClick={handleCopyCode}
              className="bg-primary text-on-primary px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl transition-all"
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={16} /> Đã Sao Chép!
                </span>
              ) : (
                'Sao Chép Mã'
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
