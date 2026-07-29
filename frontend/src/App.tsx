import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import { useContext, lazy, Suspense } from 'react';

// Layout components (eager loaded — always visible)
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AIChatWidget from './components/common/AIChatWidget';
import LiveChatWidget from './components/common/LiveChatWidget';
import SellerLayout from './components/seller/SellerLayout';
import AdminLayout from './components/admin/AdminLayout';

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

// Seller Pages
const BecomeSeller    = lazy(() => import('./pages/BecomeSeller'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const SellerProducts  = lazy(() => import('./pages/SellerProducts'));
const SellerOrders    = lazy(() => import('./pages/SellerOrders'));
const SellerVouchers  = lazy(() => import('./pages/SellerVouchers'));
const SellerInbox     = lazy(() => import('./pages/SellerInbox'));
const SellerProfile   = lazy(() => import('./pages/SellerProfile'));

// Admin Pages
const AdminSellerApplications = lazy(() => import('./pages/AdminSellerApplications'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSellerProducts = lazy(() => import('./pages/AdminSellerProducts'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const AdminBrands = lazy(() => import('./pages/AdminBrands'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminInventory = lazy(() => import('./pages/AdminInventory'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminTransactions = lazy(() => import('./pages/AdminTransactions'));
const AdminBanners = lazy(() => import('./pages/AdminBanners'));
const AdminCoupons = lazy(() => import('./pages/AdminCoupons'));
const AdminNotifications = lazy(() => import('./pages/AdminNotifications'));
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog'));

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

// Admin-only route guard
function AdminRoute({ children }: { children: React.ReactNode }) {
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
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const authCtx = useContext(AuthContext);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  const isFullPage  = isAuthPage || location.pathname === '/payment/return';
  const isSellerPage = location.pathname.startsWith('/seller/');
  const isAdminPage = location.pathname.startsWith('/admin/');

  return (
    <div className="app-root">
      {!isFullPage && !isSellerPage && !isAdminPage && <Header />}
      <main className={`app-main ${isAuthPage ? 'auth-page' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="popLayout">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/shops/:id" element={<ShopPublic />} />
              <Route path="/combos" element={<Combos />} />
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

              {/* Admin: quản lý shop người bán */}
              <Route path="/admin/sellers" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminSellerApplications />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminUsers />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/sellers/:sellerId/products" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminSellerProducts />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/reports" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminReports />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/categories" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminCategories />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/brands" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminBrands />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/orders" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminOrders />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/users/:userId" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminUserDetail />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/inventory" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminInventory />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/transactions" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminTransactions />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/banners" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminBanners />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/coupons" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminCoupons />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/notifications" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminNotifications />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin/audit-logs" element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminAuditLog />
                  </AdminLayout>
                </AdminRoute>
              } />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Fallback to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      {!isFullPage && !isSellerPage && !isAdminPage && <Footer />}
      {!isFullPage && !isSellerPage && !isAdminPage && <AIChatWidget />}
      {/* Live Chat Widget: hiển thị cho customer ở mọi trang (trừ auth + seller pages) */}
      {!isFullPage && !isSellerPage && !isAdminPage && <LiveChatWidget />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <AppContent />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

