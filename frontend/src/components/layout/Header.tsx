import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Logo URL constructed with env var fallback
const logoUrl = import.meta.env.VITE_CDN_URL 
  ? `${import.meta.env.VITE_CDN_URL}/favicon.png` 
  : '/favicon.png';


export default function Header() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('Header must be used within an AuthProvider');
  }
  const { user, logout, isAuthenticated } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');

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

    // Merge search query with existing parameters
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
  };

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
    <header className="sticky top-0 z-50 bg-surface/80 dark:bg-inverse-surface/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-container-max mx-auto px-margin-desktop py-4 flex justify-between items-center w-full">
        <div className="flex items-center gap-8">
          {/* Logo Link */}
          <Link className="flex items-center gap-2" to="/">
            <img
              alt="Volitify Logo"
              className="h-10 w-auto shrink-0 object-contain"
              src={logoUrl}
            />
            <span className="text-title-lg font-black tracking-tight text-primary dark:text-inverse-primary hidden md:block">
              VOLITIFY
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <div className="mega-menu-trigger relative py-2">
              <button className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 flex items-center gap-1">
                TV &amp; Video <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              <div className="mega-menu absolute top-full left-0 w-[800px] bg-surface-container-lowest shadow-2xl rounded-3xl p-8 border border-outline-variant mt-2">
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h4 className="font-bold text-primary mb-4">Loại Tivi</h4>
                    <ul className="space-y-2">
                      <li>
                        <button onClick={() => handleCategoryClick('Electronics')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full">
                          OLED TVs
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleCategoryClick('Electronics')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full">
                          QLED TVs
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleCategoryClick('Electronics')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full">
                          8K Ultra HD
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary mb-4">Phụ Kiện</h4>
                    <ul className="space-y-2">
                      <li>
                        <button onClick={() => handleCategoryClick('Audio')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full">
                          Loa Soundbar
                        </button>
                      </li>
                      <li>
                        <button onClick={() => handleCategoryClick('Accessories')} className="text-body-md text-on-surface-variant hover:text-primary transition-colors text-left w-full">
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
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <span className="text-white font-bold">Dòng OLED 2024 Mới Nhất</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => handleCategoryClick('Home & Kitchen')} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200">
              Bếp
            </button>
            <button onClick={() => handleCategoryClick('Accessories')} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200">
              Nhà Thông Minh
            </button>
            <button onClick={() => handleCategoryClick('Wearables')} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200">
              Gaming
            </button>
            <button onClick={() => handleCategoryClick('Home & Kitchen')} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200">
              Gia Dụng
            </button>
          </nav>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-6 flex-1 max-w-xl mx-12">
          <div className="relative w-full group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              className="w-full h-12 pl-12 pr-4 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary transition-all text-body-md text-on-surface"
              placeholder="Tìm kiếm..."
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Authentication Buttons */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-body-md font-bold leading-tight">{user.name}</p>
                  <p className="text-xs text-on-surface-variant leading-none">{user.role || 'customer'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-error font-bold border border-error/30 rounded-lg hover:bg-error/5 transition-all text-sm"
                title="Đăng xuất"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link
                className="px-5 py-2 text-primary font-bold border border-primary rounded-lg hover:bg-primary/5 transition-all"
                to="/login"
              >
                Đăng nhập
              </Link>
              <Link
                className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                to="/register"
              >
                Gia nhập ngay
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
