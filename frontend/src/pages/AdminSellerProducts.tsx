import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Package, X } from 'lucide-react';
import { adminService, AdminProductRow, AdminProductDetail } from '../services/adminService';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export default function AdminSellerProducts() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    adminService.getSellerProducts(sellerId)
      .then(setProducts)
      .catch((err: any) => setError(err?.message || 'Không tải được danh sách sản phẩm.'))
      .finally(() => setLoading(false));
  }, [sellerId]);

  const openDetail = async (productId: string) => {
    setDetailLoading(true);
    try {
      const data = await adminService.getProductDetail(productId);
      setDetail(data);
    } catch (err: any) {
      setError(err?.message || 'Không tải được chi tiết sản phẩm.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/admin/sellers')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-semibold text-sm mb-4 transition-all"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách shop
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Package size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface">Sản Phẩm Của Shop</h1>
            <p className="text-on-surface-variant text-sm">Danh sách sản phẩm và chi tiết biến thể</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-error bg-error/10 border border-error/20 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-primary">
            <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
            <p className="mt-2 font-semibold">Đang tải...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <Package size={40} className="mb-3 opacity-50" />
            <p className="font-semibold">Shop này chưa có sản phẩm nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map(product => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => openDetail(product.id)}
                className="text-left bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/30 shadow-sm p-4 hover:border-primary/40 transition-all"
              >
                <div className="w-full aspect-square rounded-2xl bg-surface-container overflow-hidden mb-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <Package size={32} className="opacity-40" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-on-surface text-sm line-clamp-2 mb-1">{product.name}</h3>
                <p className="text-primary font-black text-sm">{formatMoney(product.base_price)}</p>
                <p className="text-xs text-on-surface-variant mt-1">Tồn kho: {product.stock_qty}</p>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {(detail || detailLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            >
              {detailLoading || !detail ? (
                <div className="flex flex-col items-center justify-center py-16 text-primary">
                  <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black text-on-surface">{detail.name}</h2>
                      <p className="text-sm text-on-surface-variant">{detail.seller_name}</p>
                    </div>
                    <button
                      onClick={() => setDetail(null)}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {detail.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mb-4">
                      {detail.images.map(img => (
                        <img
                          key={img.id}
                          src={img.image_url}
                          alt={img.alt_text || detail.name}
                          className="w-20 h-20 rounded-xl object-cover shrink-0 border border-outline-variant/30"
                        />
                      ))}
                    </div>
                  )}

                  {detail.short_desc && (
                    <p className="text-sm text-on-surface-variant mb-4">{detail.short_desc}</p>
                  )}

                  <h3 className="font-bold text-on-surface text-sm mb-2">
                    Biến thể ({detail.variants.length})
                  </h3>
                  <div className="space-y-2">
                    {detail.variants.map(variant => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between bg-surface-container rounded-2xl px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-on-surface">{variant.variant_label || variant.sku}</p>
                          <p className="text-xs text-on-surface-variant">SKU: {variant.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatMoney(variant.price)}</p>
                          <p className="text-xs text-on-surface-variant">Tồn: {variant.stock_qty}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
