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

// Pages — lazy loaded for code splitting (reduces initial bundle by ~60%)
const Home         = lazy(() => import('./pages/Home'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const Cart         = lazy(() => import('./pages/Cart'));
const Profile      = lazy(() => import('./pages/Profile'));
const Products     = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Combos       = lazy(() => import('./pages/Combos'));
const Checkout     = lazy(() => import('./pages/Checkout'));

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

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';

  return (
    <div className="app-root">
      {!isAuthPage && <Header />}
      <main className={`app-main ${isAuthPage ? 'auth-page' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="popLayout">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/combos" element={<Combos />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Fallback to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <AIChatWidget />}
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
