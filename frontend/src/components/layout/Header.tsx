import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Logo URL - use local favicon.png
const logoUrl = (import.meta.env.VITE_CDN_URL && import.meta.env.VITE_CDN_URL !== 'undefined')
  ? `${import.meta.env.VITE_CDN_URL}/favicon.png`
  : '/favicon.png';


export default function Header() {
  const { cartItems } = useCart();
  const { wishlist } = useWishlist();
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
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  let notifContext = null;
  try { notifContext = useNotifications(); } catch(e) {}
  const { notifications = [], unreadCount = 0, markAsRead, markAllAsRead } = notifContext || {};

  // Keep searchValue in sync with URL search params
  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (val) {
        newParams.set('search', val);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);

      if (location.pathname !== '/') {
        navigate(`/?${newParams.toString()}`);
      }
    }, 300);
  };

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
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-surface-container-low/95 backdrop-blur-md shadow-xs border-b border-slate-100 dark:border-outline-variant/20 transition-all duration-300">
      <div className="max-w-container-max mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between w-full gap-3 lg:gap-6">
        
        {/* 1. Left Section: Logo & Primary Nav Links */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <Link className="flex items-center gap-2.5 shrink-0 group" to="/">
            <img
              alt="Volitify Logo"
              className="h-9 w-auto shrink-0 object-contain group-hover:scale-105 transition-transform"
              src={logoUrl}
            />
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent hidden sm:inline-block whitespace-nowrap">
              VOLITIFY
            </span>
          </Link>

          {/* Quick Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-sm font-semibold tracking-wide text-on-surface-variant">
            <Link to="/products" className="hover:text-primary transition-colors">
              Sản phẩm
            </Link>
            
            {/* Category Dropdown */}
            <div className="mega-menu-trigger relative py-1">
              <button className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                Danh mục <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 w-[640px] bg-white dark:bg-surface-container-lowest shadow-2xl rounded-3xl p-6 border border-slate-100 dark:border-outline-variant/30 mt-2">
                <div className="grid grid-cols-3 gap-6 text-xs">
                  <div>
                    <h4 className="font-bold text-primary mb-3 text-sm">Điện tử &amp; Tivi</h4>
                    <ul className="space-y-2">
                      <li><button onClick={() => handleCategoryClick('Electronics')} className="hover:text-primary text-left w-full">OLED &amp; QLED TVs</button></li>
                      <li><button onClick={() => handleCategoryClick('Electronics')} className="hover:text-primary text-left w-full">8K Ultra HD</button></li>
                      <li><button onClick={() => handleCategoryClick('Audio')} className="hover:text-primary text-left w-full">Loa Soundbar</button></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary mb-3 text-sm">Phụ kiện &amp; Gia dụng</h4>
                    <ul className="space-y-2">
                      <li><button onClick={() => handleCategoryClick('Accessories')} className="hover:text-primary text-left w-full">Nhà thông minh</button></li>
                      <li><button onClick={() => handleCategoryClick('Wearables')} className="hover:text-primary text-left w-full">Gaming Gear</button></li>
                      <li><button onClick={() => handleCategoryClick('Home & Kitchen')} className="hover:text-primary text-left w-full">Thiết bị gia dụng</button></li>
                    </ul>
                  </div>
                  <div className="rounded-2xl overflow-hidden relative h-36 border border-slate-100">
                    <img
                      alt="Featured TV"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_9Dls69zaIcfO3vhKm0-Fqk_xuPOT5MtRxQiKiScdciorPGe5jvcNba9dTBiyVHJrL5b7CDtR6yBDDlP2le0t43FyZjrFcwgEhpG-4jxoeDCyvek3mJUSOjr0JilqlKzEh7q6TMoUEGNgtVN27aDVHB40kXAPWLSnjDp64ecR-Yi7GQgzXIXMDqSot22mqZmva9QZJRpvzwsAYG1JW06250KLFvxcJLzIlzjOdM1kyeyl4wwf7-Gjg4DhF1oYmAWuTZiuPpDq7-J1"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2.5">
                      <span className="text-white font-bold text-[11px]">Dòng OLED 2024</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/combos" className="hover:text-primary transition-colors">
              Combo ưu đãi
            </Link>
          </nav>
        </div>

        {/* 2. Center Section: Expanded Search Bar */}
        <div className="flex-1 max-w-lg mx-2 sm:mx-4">
          <div className="relative w-full group">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary text-[20px] transition-colors">
              search
            </span>
            <input
              className="w-full h-10 pl-10 pr-4 bg-slate-100/80 dark:bg-surface-container-high border border-transparent focus:border-primary/40 focus:bg-white dark:focus:bg-surface-container focus:ring-4 focus:ring-primary/10 transition-all rounded-full text-xs sm:text-sm text-on-surface focus:outline-none placeholder:text-slate-400"
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* 3. Right Section: Action Icons & User Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Sáng' : 'Tối'}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/8 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Notification Icon */}
          {isAuthenticated && (
            <div className="relative shrink-0 flex items-center">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-9 h-9 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/8 active:scale-95 transition-all rounded-full flex items-center justify-center shrink-0"
                title="Thông báo"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] w-[16px] h-[16px] flex items-center justify-center rounded-full font-bold shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-[320px] sm:w-[360px] max-h-[80vh] overflow-y-auto bg-white dark:bg-surface-container-lowest shadow-2xl rounded-2xl border border-slate-100 dark:border-outline-variant/30 z-50 flex flex-col"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-outline-variant/30 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-surface-container-lowest/90 backdrop-blur-md z-10">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white">Thông báo</h3>
                        {unreadCount > 0 && (
                          <button onClick={() => markAllAsRead?.()} className="text-xs text-primary font-bold hover:underline">
                            Đã đọc tất cả
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-[100px]">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                            <p className="text-xs">Chưa có thông báo nào</p>
                          </div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              onClick={() => { if(!notif.is_read) markAsRead?.(notif.id); }}
                              className={`p-4 border-b border-slate-100/60 dark:border-outline-variant/10 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${!notif.is_read ? 'bg-primary/5' : ''}`}
                            >
                              <div className="shrink-0 pt-1">
                                <span className={`material-symbols-outlined text-[20px] ${notif.type === 'promotion' ? 'text-red-500' : 'text-primary'}`}>
                                  {notif.type === 'promotion' ? 'redeem' : 'inventory_2'}
                                </span>
                              </div>
                              <div>
                                <h4 className={`text-xs ${!notif.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
                                  {notif.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Wishlist Icon */}
          <Link
            to="/wishlist"
            className="relative w-9 h-9 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/8 active:scale-95 transition-all rounded-full flex items-center justify-center shrink-0"
            title="Yêu thích"
          >
            <span className="material-symbols-outlined text-[20px]">favorite</span>
            {wishlist.length > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-white text-[9px] w-[16px] h-[16px] flex items-center justify-center rounded-full font-bold shadow-xs">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* Cart Icon */}
          <Link
            to="/cart"
            className="relative w-9 h-9 text-primary hover:bg-primary/8 active:scale-95 transition-all rounded-full flex items-center justify-center shrink-0"
            title="Giỏ hàng"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {cartItems.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] w-[16px] h-[16px] flex items-center justify-center rounded-full font-bold shadow-xs">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>

          {/* Seller Action Button */}
          {isAuthenticated && user && (
            user.role === 'seller' ? (
              <Link
                to="/seller/dashboard"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>Kênh bán hàng</span>
              </Link>
            ) : user.role !== 'admin' ? (
              <Link
                to="/become-seller"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:border-primary hover:text-primary font-bold text-xs transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>Bán hàng</span>
              </Link>
            ) : null
          )}

          <div className="w-px h-4 bg-slate-200 dark:bg-outline-variant/40 shrink-0 mx-1 hidden sm:block" />

          {/* 4. USER PROFILE DROPDOWN MENU */}
          {isAuthenticated && user ? (
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200 dark:border-outline-variant/40 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-surface-container transition-all cursor-pointer"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover shadow-xs border border-white"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[90px] truncate hidden sm:inline-block">
                  {user.name.split(' ').pop() || user.name}
                </span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>

              {/* User Dropdown Panel */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute top-full right-0 mt-2 w-60 bg-white dark:bg-surface-container-lowest shadow-2xl rounded-2xl border border-slate-100 dark:border-outline-variant/30 p-2 z-50 text-slate-700 dark:text-slate-200 text-xs font-medium"
                  >
                    {/* User Header */}
                    <div className="p-3 border-b border-slate-100 dark:border-outline-variant/30 flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-primary" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{user.role || 'Khách hàng'}</p>
                      </div>
                    </div>

                    {/* Menu Links */}
                    <div className="py-1.5 space-y-0.5">
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-container font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-500">person</span>
                        Hồ sơ cá nhân
                      </Link>

                      <Link
                        to="/profile"
                        state={{ tab: 'orders' }}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-container font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-500">receipt_long</span>
                        Đơn hàng của tôi
                      </Link>

                      <Link
                        to="/wishlist"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-container font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-500">favorite</span>
                        Sản phẩm yêu thích
                      </Link>

                      {user.role === 'seller' && (
                        <Link
                          to="/seller/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-primary/10 text-primary font-bold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">storefront</span>
                          Kênh người bán
                        </Link>
                      )}
                    </div>

                    {/* Logout Button */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-outline-variant/30">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/login"
                className="h-9 px-4 flex items-center justify-center text-primary font-bold border border-primary/30 rounded-full hover:bg-primary/5 transition-all text-xs whitespace-nowrap"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="hidden sm:flex h-9 px-4 items-center justify-center bg-primary text-white font-bold rounded-full shadow-xs hover:bg-primary-container transition-all text-xs whitespace-nowrap"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 active:scale-90 transition-colors shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative z-10 w-full max-w-xs bg-white dark:bg-surface-container-lowest h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                  <img alt="Volitify Logo" className="h-8 w-auto" src={logoUrl} />
                  <span className="text-lg font-black text-primary">VOLITIFY</span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Mobile links */}
              <div className="space-y-2 text-sm font-semibold text-slate-700">
                <Link to="/products" className="block p-2.5 rounded-xl hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Tất cả sản phẩm</Link>
                <Link to="/combos" className="block p-2.5 rounded-xl hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Combo ưu đãi</Link>
                <Link to="/profile" className="block p-2.5 rounded-xl hover:bg-slate-50" onClick={() => setIsMobileMenuOpen(false)}>Hồ sơ cá nhân</Link>
              </div>
            </div>

            {isAuthenticated && (
              <button onClick={handleLogout} className="w-full py-2.5 text-red-600 bg-red-50 font-bold rounded-xl text-xs">
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
                © {new Date().getFullYear()} Volitify Systems
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
