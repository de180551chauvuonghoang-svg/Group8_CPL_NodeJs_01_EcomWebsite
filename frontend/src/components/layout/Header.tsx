import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../common/NotificationBell';

// Logo URL - use local favicon.png
const logoUrl =
  import.meta.env.VITE_CDN_URL && import.meta.env.VITE_CDN_URL !== 'undefined'
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
  const searchDebounceRef = useRef<number | null>(null);

  // Keep searchValue in sync with URL search params
  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

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

    navigate(`/?${newParams.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-surface/80 dark:bg-surface-container-low/90 backdrop-blur-xl shadow-sm border-b border-outline-variant/30 transition-colors duration-300">
      <div className="max-w-container-max mx-auto px-margin-desktop py-3.5 flex justify-between items-center w-full">
        <div className="flex items-center gap-6 xl:gap-8">
          {/* Logo Link */}
          <Link className="flex items-center gap-2" to="/">
            <img alt="Volitify Logo" className="h-9 w-auto shrink-0 object-contain" src={logoUrl} />
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent hidden md:block">
              VOLITIFY
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 xl:gap-6 text-sm font-semibold tracking-wide whitespace-nowrap">
            <Link
              to="/products"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Sản phẩm
            </Link>
            <div className="mega-menu-trigger relative py-2">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-0.5 cursor-pointer">
                TV &amp; Video{' '}
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 w-[800px] bg-surface-container-lowest shadow-2xl rounded-3xl p-8 border border-outline-variant/50 mt-2">
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h4 className="font-bold text-primary mb-4">Loại Tivi</h4>
                    <ul className="space-y-2">
                      <li>
                        <button
                          onClick={() => handleCategoryClick('Electronics')}
                          className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer"
                        >
                          OLED TVs
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleCategoryClick('Electronics')}
                          className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer"
                        >
                          QLED TVs
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleCategoryClick('Electronics')}
                          className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer"
                        >
                          8K Ultra HD
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary mb-4">Phụ Kiện</h4>
                    <ul className="space-y-2">
                      <li>
                        <button
                          onClick={() => handleCategoryClick('Audio')}
                          className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer"
                        >
                          Loa Soundbar
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => handleCategoryClick('Accessories')}
                          className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full cursor-pointer"
                        >
                          Giá Treo Tivi
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-2xl overflow-hidden relative h-48">
                    <img
                      alt="Featured TV"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_9Dls69zaIcfO3vhKm0-Fqk_xuPOT5MtRxQiKiScdciorPGe5jvcNba9dTBiyVHJrL5b7CDtR6yBDDlP2le0t43FyZjrFcwgEhpG-4jxoeDCyvek3mJUSOjr0JilqlKzEh7q6TMoUEGNgtVN27aDVHB40kXAPWLSnjDp64ecR-Yi7GQgzXIXMDqSot22mqZmva9QZJRpvzwsAYG1JW06250KLFvxcJLzIlzjOdM1kyeyl4wwf7-Gjg4DhF1oYmAWuTZiuPpDq7-J1"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <span className="text-white font-bold">Dòng OLED 2024 Mới Nhất</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/combos"
              className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer"
            >
              Combo
            </Link>
            <button
              onClick={() => handleCategoryClick('Accessories')}
              className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer"
            >
              Nhà Thông Minh
            </button>
            <button
              onClick={() => handleCategoryClick('Wearables')}
              className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer"
            >
              Gaming
            </button>
            <button
              onClick={() => handleCategoryClick('Home & Kitchen')}
              className="text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer"
            >
              Gia Dụng
            </button>
          </nav>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-6 flex-1 max-w-md mx-4 lg:mx-8 xl:mx-12">
          <div className="relative w-full group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              className="w-full h-10 pl-11 pr-4 bg-surface-container-low dark:bg-surface-container-high border border-outline-variant/30 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-full text-sm text-on-surface focus:outline-none"
              placeholder="Tìm sản phẩm..."
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Cart + Auth + Theme Toggle */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
            className="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-all duration-200 active:scale-90 cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[22px] transition-all duration-300"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-outline-variant/50 shrink-0" />

          {/* Cart Icon */}
          <Link
            to="/cart"
            className="relative w-10 h-10 text-primary hover:bg-primary/8 active:scale-95 transition-all rounded-full flex items-center justify-center shrink-0"
            title="Giỏ hàng"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
            {cartItems.length > 0 && (
              <span className="absolute top-0 right-0 bg-error text-on-error text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold shadow-md leading-none">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>

          {/* Divider */}
          <div className="w-px h-5 bg-outline-variant/50 shrink-0" />

          {/* Authentication Buttons */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <NotificationBell user={user} />
              {user.role === 'seller' ? (
                <Link
                  to="/seller/dashboard"
                  title="Kênh người bán"
                  className="hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/20 px-3 text-sm font-bold text-primary transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] md:flex xl:px-4"
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  <span className="hidden xl:inline">Kênh người bán</span>
                </Link>
              ) : user.role !== 'admin' ? (
                <Link
                  to="/become-seller"
                  title="Đăng ký bán hàng"
                  className="hidden md:flex items-center gap-1.5 h-10 px-4 rounded-full border border-outline-variant/60 hover:border-primary/40 hover:bg-primary/5 text-on-surface-variant font-bold text-sm transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  Đăng ký bán hàng
                </Link>
              ) : null}

              {/* User profile pill */}
              <Link
                to="/profile"
                title="Chỉnh sửa hồ sơ"
                className="flex items-center gap-2.5 h-10 pl-1 pr-4 rounded-full border border-outline-variant/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
              >
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover shadow-sm border-2 border-surface shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Name + role */}
                <div className="hidden lg:flex flex-col min-w-0 max-w-[140px]">
                  <span className="text-xs font-bold text-on-surface leading-tight truncate group-hover:text-primary transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-none capitalize font-medium">
                    {user.role || 'customer'}
                  </span>
                </div>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/8 transition-all duration-200 active:scale-90 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Đăng nhập — outline pill */}
              <Link
                to="/login"
                className="h-10 px-4 xl:px-5 flex items-center justify-center text-primary font-bold border border-primary/20 rounded-full hover:bg-primary/5 hover:border-primary/60 transition-all text-sm whitespace-nowrap"
              >
                Đăng nhập
              </Link>
              {/* Gia nhập ngay — filled pill with gradient */}
              <Link
                to="/register"
                className="h-10 px-4 xl:px-5 flex items-center justify-center bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-sm hover:shadow-lg hover:shadow-primary/20 hover:brightness-105 active:scale-98 transition-all text-sm whitespace-nowrap"
              >
                Gia nhập ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
