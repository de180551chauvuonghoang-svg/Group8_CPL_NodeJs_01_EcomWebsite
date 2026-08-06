import { Outlet } from 'react-router-dom';
import AIChatWidget from '../components/common/AIChatWidget';
import LiveChatWidget from '../components/common/LiveChatWidget';
import Footer from '../components/layout/Footer';
import Header from '../components/layout/Header';
import SellerLayout from '../components/seller/SellerLayout';

export function StorefrontLayout() {
  return (
    <div className="app-root">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
      <AIChatWidget />
      <LiveChatWidget />
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="app-root">
      <main className="app-main auth-page">
        <Outlet />
      </main>
    </div>
  );
}

export function FullPageLayout() {
  return (
    <div className="app-root">
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export function SellerDashboardLayout() {
  return (
    <div className="app-root">
      <main className="app-main">
        <SellerLayout>
          <Outlet />
        </SellerLayout>
      </main>
    </div>
  );
}
