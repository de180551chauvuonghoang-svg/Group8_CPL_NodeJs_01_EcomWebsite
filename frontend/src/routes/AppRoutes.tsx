import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, PageLoader, SellerRoute } from './RouteGuards';
import {
  AuthLayout,
  FullPageLayout,
  SellerDashboardLayout,
  StorefrontLayout,
} from './RouteLayouts';

const Home = lazy(() => import('../pages/Home'));
const Products = lazy(() => import('../pages/Products'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const ShopPublic = lazy(() => import('../pages/ShopPublic'));
const Combos = lazy(() => import('../pages/Combos'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Profile = lazy(() => import('../pages/Profile'));

const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const PaymentReturn = lazy(() => import('../pages/PaymentReturn'));

const BecomeSeller = lazy(() => import('../pages/BecomeSeller'));
const SellerDashboard = lazy(() => import('../pages/SellerDashboard'));
const SellerProducts = lazy(() => import('../pages/SellerProducts'));
const SellerOrders = lazy(() => import('../pages/SellerOrders'));
const SellerVouchers = lazy(() => import('../pages/SellerVouchers'));
const SellerInbox = lazy(() => import('../pages/SellerInbox'));
const SellerProfile = lazy(() => import('../pages/SellerProfile'));
const SellerReviews = lazy(() => import('../pages/SellerReviews'));
const SellerInventory = lazy(() => import('../pages/SellerInventory'));
const SellerReturns = lazy(() => import('../pages/SellerReturns'));
const SellerFinance = lazy(() => import('../pages/SellerFinance'));
const SellerWallet = lazy(() => import('../pages/SellerWallet'));
const SellerBank = lazy(() => import('../pages/SellerBank'));

export default function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="popLayout">
        <Routes location={location} key={location.pathname}>
          <Route element={<StorefrontLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="shops/:id" element={<ShopPublic />} />
            <Route path="combos" element={<Combos />} />
            <Route path="cart" element={<Cart />} />

            <Route element={<ProtectedRoute />}>
              <Route path="checkouts" element={<Checkout />} />
              <Route path="profile" element={<Profile />} />
              <Route path="become-seller" element={<BecomeSeller />} />
            </Route>
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          <Route element={<FullPageLayout />}>
            <Route path="payment/return" element={<PaymentReturn />} />
          </Route>

          <Route element={<SellerRoute />}>
            <Route path="seller" element={<SellerDashboardLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="products" element={<SellerProducts />} />
              <Route path="orders" element={<SellerOrders />} />
              <Route path="reviews" element={<SellerReviews />} />
              <Route path="inventory" element={<SellerInventory />} />
              <Route path="returns" element={<SellerReturns />} />
              <Route path="finance" element={<SellerFinance />} />
              <Route path="wallet" element={<SellerWallet />} />
              <Route path="vouchers" element={<SellerVouchers />} />
              <Route path="inbox" element={<SellerInbox />} />
              <Route path="profile" element={<SellerProfile />} />
              <Route path="bank" element={<SellerBank />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
