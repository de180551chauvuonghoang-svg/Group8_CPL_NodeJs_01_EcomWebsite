import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

// Logo URL - use local favicon.png
const logoUrl = (import.meta.env.VITE_CDN_URL && import.meta.env.VITE_CDN_URL !== 'undefined')
  ? `${import.meta.env.VITE_CDN_URL}/favicon.png`
  : '/favicon.png';


export default function Header() {
  const { cartItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('Header must be used within an AuthProvider');
  }
  const { user, logout, isAuthenticated } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  // Keep searchValue in sync with URL search params
  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);

    // Debounce URL params update 300ms
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (val) {
        newParams.set('search', val);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);

      // If not on Home page, redirect to Home with the merged parameters
      if (location.pathname !== '/') {
        navigate(`/?${newParams.toString()}`);
      }
    }, 300);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleCategoryClick = (categoryName: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (categoryName === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryName);
    }

    setIsMobileMenuOpen(false);
    navigate(`/?${newParams.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/80 dark:bg-surface-container-low/90 backdrop-blur-xl shadow-sm border-b border-outline-variant/30 transition-colors duration-300">
      <div className="max-w-container-max mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between w-full gap-2 lg:gap-4">
        
        {/* Left Section: Logo & Nav */}
        <div className="flex items-center gap-3 lg:gap-5 xl:gap-7 shrink-0">
          {/* Logo Link */}
          <Link className="flex items-center gap-2 shrink-0" to="/">
            <img
              alt="Volitify Logo"
              className="h-8 sm:h-9 w-auto shrink-0 object-contain"
              src={logoUrl}
            />
            <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent hidden sm:inline-block whitespace-nowrap">
              VOLITIFY
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2.5 xl:gap-4 text-xs xl:text-sm font-semibold tracking-wide whitespace-nowrap shrink-0">
            <Link
              to="/products"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Sản phẩm
            </Link>
            <div className="mega-menu-trigger relative py-1.5">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-0.5 cursor-pointer">
                TV &amp; Video <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 w-[750px] bg-surface-container-lowest shadow-2xl rounded-3xl p-6 border border-outline-variant/50 mt-2">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-bold text-primary mb-3">Loại Tivi</h4>
                    <ul className="space-y-2">
                      <li>
                        <button onClick={() => handleCategoryClick('Electronics')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer">
                          OLED TVs
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleCategoryClick('Electronics')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer">
                          QLED TVs
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleCategoryClick('Electronics')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer">
                          8K Ultra HD
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary mb-3">Phụ Kiện</h4>
                    <ul className="space-y-2">
                      <li>
                        <button onClick={() => handleCategoryClick('Audio')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer">
                          Loa Soundbar
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleCategoryClick('Accessories')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer">
                          Giá Treo Tivi
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-2xl overflow-hidden relative h-44">
                    <img
                      alt="Featured TV"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_9Dls69zaIcfO3vhKm0-Fqk_xuPOT5MtRxQiKiScdciorPGe5jvcNba9dTBiyVHJrL5b7CDtR6yBDDlP2le0t43FyZjrFcwgEhpG-4jxoeDCyvek3mJUSOjr0JilqlKzEh7q6TMoUEGNgtVN27aDVHB40kXAPWLSnjDp64ecR-Yi7GQgzXIXMDqSot22mqZmva9QZJRpvzwsAYG1JW06250KLFvxcJLzIlzjOdM1kyeyl4wwf7-Gjg4DhF1oYmAWuTZiuPpDq7-J1"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <span className="text-white font-bold text-xs">Dòng OLED 2024 Mới Nhất</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/combos" className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer">
              Combo
            </Link>
            <button onClick={() => handleCategoryClick('Accessories')} className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer">
              Nhà Thông Minh
            </button>
            <button onClick={() => handleCategoryClick('Wearables')} className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer">
              Gaming
            </button>
            <button onClick={() => handleCategoryClick('Home & Kitchen')} className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer">
              Gia Dụng
            </button>
          </nav>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center flex-1 min-w-[120px] max-w-[220px] xl:max-w-md mx-1 sm:mx-2">
          <div className="relative w-full group">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-3 bg-surface-container-low dark:bg-surface-container-high border border-outline-variant/30 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-full text-xs xl:text-sm text-on-surface focus:outline-none"
              placeholder="Tìm sản phẩm..."
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Cart + Auth + Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
            className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-all duration-200 active:scale-90 cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[20px] transition-all duration-300"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-outline-variant/50 shrink-0" />

          {/* Cart Icon */}
          <Link
            to="/cart"
            className="relative w-9 h-9 text-primary hover:bg-primary/8 active:scale-95 transition-all rounded-full flex items-center justify-center shrink-0"
            title="Giỏ hàng"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {cartItems.length > 0 && (
              <span className="absolute top-0 right-0 bg-error text-on-error text-[9px] w-[16px] h-[16px] flex items-center justify-center rounded-full font-bold shadow-md leading-none">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>

          {/* Divider */}
          <div className="w-px h-4 bg-outline-variant/50 shrink-0 hidden sm:block" />

          {/* Authentication Buttons */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {user.role === 'seller' ? (
                <Link
                  to="/seller/dashboard"
                  title="Kênh người bán"
                  className="hidden md:flex items-center justify-center gap-1.5 h-9 px-2.5 xl:px-3.5 rounded-full border border-primary/20 hover:bg-primary/5 hover:border-primary/60 text-primary font-bold text-xs xl:text-sm whitespace-nowrap shrink-0 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  <span className="hidden 2xl:inline">Kênh người bán</span>
                </Link>
              ) : user.role !== 'admin' ? (
                <Link
                  to="/become-seller"
                  title="Đăng ký bán hàng"
                  className="hidden md:flex items-center justify-center gap-1.5 h-9 px-2.5 xl:px-3.5 rounded-full border border-outline-variant/60 hover:border-primary/40 hover:bg-primary/5 text-on-surface-variant font-bold text-xs xl:text-sm whitespace-nowrap shrink-0 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  <span className="hidden 2xl:inline">Đăng ký bán hàng</span>
                </Link>
              ) : null}

              {/* User profile pill */}
              <Link
                to="/profile"
                title="Chỉnh sửa hồ sơ"
                className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-full sm:pr-2.5 border border-outline-variant/60 hover:border-primary/40 hover:bg-primary/5 whitespace-nowrap shrink-0 transition-all duration-200 group"
              >
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover shadow-sm border-2 border-surface shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Name + role */}
                <div className="hidden xl:flex flex-col min-w-0 max-w-[85px] 2xl:max-w-[120px]">
                  <span className="text-xs font-bold text-on-surface leading-tight truncate group-hover:text-primary transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[9px] text-on-surface-variant leading-none capitalize font-medium">
                    {user.role || 'customer'}
                  </span>
                </div>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="flex items-center justify-center gap-1 h-9 px-2 sm:px-3 rounded-full text-error bg-error/5 hover:bg-error/15 border border-error/20 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 font-bold text-xs shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden 2xl:inline whitespace-nowrap">Đăng xuất</span>
              </button>
            </div>

          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Đăng nhập — outline pill */}
              <Link
                to="/login"
                className="h-9 px-3 xl:px-4 flex items-center justify-center text-primary font-bold border border-primary/20 rounded-full hover:bg-primary/5 hover:border-primary/60 transition-all text-xs xl:text-sm whitespace-nowrap shrink-0"
              >
                Đăng nhập
              </Link>
              {/* Gia nhập ngay — filled pill with gradient */}
              <Link
                to="/register"
                className="hidden sm:flex h-9 px-3 xl:px-4 items-center justify-center bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:brightness-105 active:scale-98 transition-all text-xs xl:text-sm whitespace-nowrap shrink-0"
              >
                Gia nhập ngay
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high active:scale-90 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle mobile navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile Slide-over Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 w-full max-w-xs bg-surface dark:bg-surface-container-lowest h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-outline-variant/30">
            <div className="space-y-6">
              
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <img alt="Volitify Logo" className="h-8 w-auto shrink-0" src={logoUrl} />
                  <span className="text-lg font-black text-primary">VOLITIFY</span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* User Account Info inside Mobile Drawer */}
              {isAuthenticated && user ? (
                <div className="bg-surface-container-low dark:bg-surface-container-high p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-on-surface truncate">{user.name}</p>
                      <p className="text-xs text-on-surface-variant capitalize">{user.role || 'customer'}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    {user.role === 'seller' ? (
                      <Link
                        to="/seller/dashboard"
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/10 text-primary rounded-xl font-bold text-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">storefront</span>
                        Kênh người bán
                      </Link>
                    ) : user.role !== 'admin' ? (
                      <Link
                        to="/become-seller"
                        className="flex items-center justify-center gap-2 py-2 px-3 border border-outline-variant text-on-surface rounded-xl font-bold text-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">storefront</span>
                        Đăng ký bán hàng
                      </Link>
                    ) : null}

                    <Link
                      to="/profile"
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-surface-container text-on-surface rounded-xl font-bold text-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      Hồ sơ cá nhân
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="py-2.5 text-center text-primary font-bold border border-primary/30 rounded-xl text-sm"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="py-2.5 text-center bg-primary text-white font-bold rounded-xl text-sm"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}

              {/* Mobile Navigation Links */}
              <div className="space-y-1 pt-2">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider px-3 mb-2">Danh mục sản phẩm</p>
                <Link
                  to="/products"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low font-semibold text-sm text-on-surface"
                >
                  <span>Tất cả sản phẩm</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </Link>

                <div className="space-y-1 pl-2 border-l-2 border-primary/20 my-2">
                  <p className="text-xs font-bold text-primary px-3 py-1">TV & Video</p>
                  <button onClick={() => handleCategoryClick('Electronics')} className="w-full text-left px-3 py-1.5 text-xs text-on-surface-variant hover:text-primary">
                    • OLED &amp; QLED TVs
                  </button>
                  <button onClick={() => handleCategoryClick('Audio')} className="w-full text-left px-3 py-1.5 text-xs text-on-surface-variant hover:text-primary">
                    • Loa Soundbar
                  </button>
                </div>

                <Link
                  to="/combos"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low font-semibold text-sm text-on-surface"
                >
                  <span>Combo Ưu Đãi</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </Link>

                <button
                  onClick={() => handleCategoryClick('Accessories')}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low font-semibold text-sm text-on-surface text-left"
                >
                  <span>Nhà Thông Minh</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>

                <button
                  onClick={() => handleCategoryClick('Wearables')}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low font-semibold text-sm text-on-surface text-left"
                >
                  <span>Gaming</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>

                <button
                  onClick={() => handleCategoryClick('Home & Kitchen')}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low font-semibold text-sm text-on-surface text-left"
                >
                  <span>Gia Dụng</span>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>

            </div>

            {/* Mobile Drawer Bottom: Logout & Copyright */}
            <div className="pt-6 border-t border-outline-variant/40 space-y-4">
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-error bg-error/10 rounded-xl font-bold text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Đăng xuất tài khoản
                </button>
              )}

              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Chế độ giao diện</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-surface-container-high flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-sm">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                  <span>{theme === 'dark' ? 'Sáng' : 'Tối'}</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-on-surface-variant/70">
                © {new Date().getFullYear()} Volitify Systems
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
