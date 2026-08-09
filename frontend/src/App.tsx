import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { useNotifications } from './context/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useContext, lazy, Suspense } from 'react';

// Layout components (eager loaded — always visible)
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AIChatWidget from './components/common/AIChatWidget';
import LiveChatWidget from './components/common/LiveChatWidget';
import SellerLayout from './components/seller/SellerLayout';

// Pages — lazy loaded for code splitting (reduces initial bundle by ~60%)
const Home         = lazy(() => import('./pages/Home'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const Cart         = lazy(() => import('./pages/Cart'));
const Checkout     = lazy(() => import('./pages/Checkout'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn'));
const Profile      = lazy(() => import('./pages/Profile'));
const Products     = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const ShopPublic    = lazy(() => import('./pages/ShopPublic'));
const Combos       = lazy(() => import('./pages/Combos'));
const Wishlist     = lazy(() => import('./pages/Wishlist'));

// Seller Pages
const BecomeSeller    = lazy(() => import('./pages/BecomeSeller'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const SellerProducts  = lazy(() => import('./pages/SellerProducts'));
const SellerOrders    = lazy(() => import('./pages/SellerOrders'));
const SellerVouchers  = lazy(() => import('./pages/SellerVouchers'));
const SellerInbox     = lazy(() => import('./pages/SellerInbox'));
const SellerProfile   = lazy(() => import('./pages/SellerProfile'));

// Loading spinner component
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background text-primary">
    <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
    <p className="mt-2 font-semibold">Đang tải...</p>
  </div>
);

// Route guard component to prevent flash of content for guests
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  if (!auth) return <>{children}</>;
  const { isAuthenticated, loading } = auth;
  
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background text-primary">
        <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
        <p className="mt-2 font-semibold">Đang tải...</p>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Seller-only route guard
function SellerRoute({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  if (!auth) return <>{children}</>;
  const { user, isAuthenticated, loading } = auth;
  
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background text-primary">
        <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
        <p className="mt-2 font-semibold">Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'seller') return <Navigate to="/become-seller" replace />;
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const authCtx = useContext(AuthContext);
  
  let notifContext = null;
  try { notifContext = useNotifications(); } catch(e) {}
  const { showPopup, closePopup } = notifContext || {};

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  const isFullPage  = isAuthPage || location.pathname === '/payment/return';
  const isSellerPage = location.pathname.startsWith('/seller/');

  return (
    <div className="app-root">
      {!isFullPage && !isSellerPage && <Header />}
      <main className={`app-main ${isAuthPage ? 'auth-page' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="popLayout">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/shops/:id" element={<ShopPublic />} />
              <Route path="/combos" element={<Combos />} />
              <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
              
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkouts" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/payment/return" element={<PaymentReturn />} />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Đăng ký làm seller */}
              <Route path="/become-seller" element={
                <ProtectedRoute>
                  <BecomeSeller />
                </ProtectedRoute>
              } />

              {/* Seller Dashboard (yêu cầu role seller) */}
              <Route path="/seller/dashboard" element={
                <SellerRoute>
                  <SellerLayout>
                    <SellerDashboard />
                  </SellerLayout>
                </SellerRoute>
              } />
              <Route path="/seller/products" element={
                <SellerRoute>
                  <SellerLayout>
                    <SellerProducts />
                  </SellerLayout>
                </SellerRoute>
              } />
              <Route path="/seller/orders" element={
                <SellerRoute>
                  <SellerLayout>
                    <SellerOrders />
                  </SellerLayout>
                </SellerRoute>
              } />
              <Route path="/seller/vouchers" element={
                <SellerRoute>
                  <SellerLayout>
                    <SellerVouchers />
                  </SellerLayout>
                </SellerRoute>
              } />
              <Route path="/seller/inbox" element={
                <SellerRoute>
                  <SellerLayout>
                    <SellerInbox />
                  </SellerLayout>
                </SellerRoute>
              } />
              <Route path="/seller/profile" element={
                <SellerRoute>
                  <SellerLayout>
                    <SellerProfile />
                  </SellerLayout>
                </SellerRoute>
              } />

              {/* Fallback to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      {!isFullPage && !isSellerPage && <Footer />}
      {!isFullPage && !isSellerPage && <AIChatWidget />}
      {/* Live Chat Widget: hiển thị cho customer ở mọi trang (trừ auth + seller pages) */}
      {!isFullPage && !isSellerPage && <LiveChatWidget />}
      
      {/* Notification Toast */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 left-4 z-50 p-4 bg-surface-container-high rounded-2xl shadow-2xl border border-primary/20 flex gap-3 max-w-sm"
          >
            <div className="shrink-0 pt-1">
              <span className={`material-symbols-outlined text-[24px] ${showPopup.type === 'promotion' ? 'text-error' : 'text-primary'}`}>
                {showPopup.type === 'promotion' ? 'redeem' : 'inventory_2'}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">{showPopup.title}</h4>
              <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{showPopup.message}</p>
            </div>
            <button onClick={closePopup} className="shrink-0 text-on-surface-variant hover:text-primary p-1">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <NotificationProvider>
              <Router>
                <AppContent />
              </Router>
            </NotificationProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

