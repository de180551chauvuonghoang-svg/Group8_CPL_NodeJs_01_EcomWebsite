import { useContext, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { sellerService } from '../services/sellerService';

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
  const [sellerAccess, setSellerAccess] = useState<'checking' | 'active' | 'inactive' | 'error'>(
    'checking',
  );
  const [verificationKey, setVerificationKey] = useState(0);

  useEffect(() => {
    if (auth?.loading || !auth?.isAuthenticated || auth.user?.role !== 'seller') {
      setSellerAccess('checking');
      return undefined;
    }

    let cancelled = false;
    sellerService
      .getSellerApplication()
      .then((application) => {
        if (!cancelled) setSellerAccess(application?.status === 'active' ? 'active' : 'inactive');
      })
      .catch((error: any) => {
        if (cancelled) return;
        const code = error?.data?.code;
        setSellerAccess(code === 'SELLER_NOT_ACTIVE' ? 'inactive' : 'error');
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.isAuthenticated, auth?.loading, auth?.user?.id, auth?.user?.role, verificationKey]);

  if (!auth || auth.loading) {
    return <PageLoader />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user?.role !== 'seller') {
    return <Navigate to="/become-seller" replace />;
  }

  if (sellerAccess === 'checking') {
    return <PageLoader />;
  }

  if (sellerAccess === 'inactive') {
    return <Navigate to="/become-seller" replace />;
  }

  if (sellerAccess === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4 text-center">
        <p className="font-semibold text-on-surface">Không thể xác minh trạng thái cửa hàng.</p>
        <button
          type="button"
          onClick={() => {
            setSellerAccess('checking');
            setVerificationKey((current) => current + 1);
          }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return <Outlet />;
}
