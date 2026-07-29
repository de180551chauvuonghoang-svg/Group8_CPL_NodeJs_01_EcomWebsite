import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background text-primary">
      <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
      <p className="mt-2 font-semibold">Đang tải...</p>
    </div>
  );
}

export function ProtectedRoute() {
  const auth = useContext(AuthContext);

  if (!auth || auth.loading) {
    return <PageLoader />;
  }

  return auth.isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function SellerRoute() {
  const auth = useContext(AuthContext);

  if (!auth || auth.loading) {
    return <PageLoader />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user?.role !== 'seller') {
    return <Navigate to="/become-seller" replace />;
  }

  return <Outlet />;
}
