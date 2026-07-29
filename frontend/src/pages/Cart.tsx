import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Gift,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import { useCart, type CartItem } from '../context/CartContext';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

interface ShopGroup {
  sellerId: string;
  shopName: string;
  items: CartItem[];
  subtotal: number;
}

export default function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    appliedCoupons,
    discountAmount,
    removeFromCart,
    updateQuantity,
    applyDiscount,
    clearDiscount,
    refreshCartPrices,
  } = useCart();
  const [promoInputs, setPromoInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [applyingSellerId, setApplyingSellerId] = useState('');
  const [cartNotice, setCartNotice] = useState('');

  useEffect(() => {
    refreshCartPrices()
      .then(({ pricesChanged, removedUnavailableItems }) => {
        if (removedUnavailableItems > 0) {
          setCartNotice(
            `${removedUnavailableItems} sản phẩm không còn khả dụng đã được xóa khỏi giỏ hàng.`,
          );
        } else if (pricesChanged) {
          setCartNotice('Giá hoặc tồn kho vừa thay đổi. Voucher đã được xóa để bạn kiểm tra lại.');
        }
      })
      .catch(() => setCartNotice('Chưa thể kiểm tra giá mới nhất. Vui lòng tải lại trang.'));
  }, [refreshCartPrices]);

  const shopGroups = useMemo<ShopGroup[]>(() => {
    const groups = new Map<string, ShopGroup>();
    cartItems.forEach((item) => {
      const sellerId = item.product.seller_id || `unknown:${item.product.id}`;
      const current = groups.get(sellerId) || {
        sellerId,
        shopName: item.product.seller_name || 'Cửa hàng',
        items: [],
        subtotal: 0,
      };
      current.items.push(item);
      current.subtotal += item.product.price * item.quantity;
      groups.set(sellerId, current);
    });
    return [...groups.values()];
  }, [cartItems]);

  const totals = useMemo(() => {
    const subtotal = shopGroups.reduce((sum, group) => sum + group.subtotal, 0);
    const vat = Math.round(subtotal * 0.1);
    const discount = Math.min(discountAmount, subtotal);
    return {
      subtotal,
      vat,
      discount,
      total: Math.max(0, subtotal + vat - discount),
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [cartItems, discountAmount, shopGroups]);

  const handleApplyPromo = async (sellerId: string) => {
    const code = (promoInputs[sellerId] || '').trim();
    if (!code) {
      setFeedback((current) => ({
        ...current,
        [sellerId]: { ok: false, message: 'Vui lòng nhập mã voucher.' },
      }));
      return;
    }

    setApplyingSellerId(sellerId);
    const result = await applyDiscount(sellerId, code);
    setApplyingSellerId('');
    setFeedback((current) => ({
      ...current,
      [sellerId]: { ok: result.ok, message: result.message },
    }));
  };

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-background px-6 pb-20 pt-28">
        <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <ShoppingCart size={34} />
          </div>
          <h1 className="text-3xl font-black text-on-surface">Giỏ hàng trống</h1>
          <p className="mt-3 text-on-surface-variant">
            Bạn chưa có sản phẩm nào trong giỏ. Hãy chọn thêm vài món trước khi thanh toán.
          </p>
          <Link
            to="/products"
            className="mt-8 inline-flex h-12 items-center rounded-xl bg-primary px-6 text-sm font-bold text-white"
          >
            Tiếp tục mua sắm
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-24 md:px-margin-desktop md:pt-28">
      <section className="mx-auto max-w-container-max">
        <header className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-on-surface md:text-4xl">Giỏ hàng của bạn</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {totals.itemCount} sản phẩm từ {shopGroups.length} shop
            </p>
          </div>
        </header>

        {cartNotice && (
          <p className="mb-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-on-surface">
            {cartNotice}
          </p>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="space-y-5 lg:col-span-8">
            {shopGroups.map((group) => {
              const coupon = appliedCoupons[group.sellerId];
              const canUseCoupon = !group.sellerId.startsWith('unknown:');
              return (
                <section
                  key={group.sellerId}
                  className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-sm"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Store size={19} className="text-primary" />
                      <div>
                        <h2 className="font-black text-on-surface">{group.shopName}</h2>
                        <p className="text-xs text-on-surface-variant">
                          {group.items.length} sản phẩm · {formatPrice(group.subtotal)}
                        </p>
                      </div>
                    </div>
                    {canUseCoupon && (
                      <div className="flex min-w-0 flex-1 justify-end gap-2 sm:flex-none">
                        <input
                          value={promoInputs[group.sellerId] || coupon?.code || ''}
                          onChange={(event) => {
                            setPromoInputs((current) => ({
                              ...current,
                              [group.sellerId]: event.target.value,
                            }));
                            setFeedback((current) => {
                              const next = { ...current };
                              delete next[group.sellerId];
                              return next;
                            });
                          }}
                          placeholder="Voucher của shop"
                          className="h-10 min-w-0 max-w-48 rounded-xl border border-outline-variant bg-surface-container px-3 text-sm outline-none focus:border-primary"
                        />
                        {coupon ? (
                          <button
                            type="button"
                            onClick={() => clearDiscount(group.sellerId)}
                            className="h-10 rounded-xl border border-error/30 px-3 text-sm font-bold text-error"
                          >
                            Bỏ mã
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={applyingSellerId === group.sellerId}
                            onClick={() => void handleApplyPromo(group.sellerId)}
                            className="h-10 rounded-xl bg-primary px-3 text-sm font-bold text-white disabled:opacity-60"
                          >
                            Áp dụng
                          </button>
                        )}
                      </div>
                    )}
                  </header>

                  {feedback[group.sellerId] && (
                    <p
                      className={`border-b border-outline-variant/30 px-5 py-2 text-xs font-semibold ${feedback[group.sellerId].ok ? 'text-success' : 'text-error'}`}
                    >
                      {feedback[group.sellerId].message}
                    </p>
                  )}

                  <div className="divide-y divide-outline-variant/30">
                    {group.items.map((item) => (
                      <article
                        key={item.id}
                        className="grid gap-4 p-4 sm:grid-cols-[128px_1fr] md:p-5"
                      >
                        <Link
                          to={`/products/${item.product.id}`}
                          className="overflow-hidden rounded-xl bg-surface-container"
                        >
                          <img
                            src={item.product.image || '/placeholder.png'}
                            alt={item.product.name}
                            className="aspect-square h-full w-full object-cover"
                          />
                        </Link>
                        <div className="flex min-w-0 flex-col justify-between gap-4">
                          <div className="flex justify-between gap-4">
                            <div className="min-w-0">
                              <Link
                                to={`/products/${item.product.id}`}
                                className="line-clamp-2 text-base font-black text-on-surface hover:text-primary"
                              >
                                {item.product.name}
                              </Link>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                Còn {item.product.stock} sản phẩm · SKU{' '}
                                {item.product.sku || 'Mặc định'}
                              </p>
                            </div>
                            <p className="shrink-0 font-black text-primary">
                              {formatPrice(item.product.price * item.quantity)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center rounded-xl border border-outline-variant p-1">
                              <button
                                onClick={() => updateQuantity(item.id, 'remove')}
                                disabled={item.quantity <= 1}
                                className="flex h-8 w-8 items-center justify-center text-primary disabled:opacity-30"
                                aria-label="Giảm số lượng"
                              >
                                <Minus size={15} />
                              </button>
                              <span className="w-9 text-center font-black">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 'add')}
                                disabled={item.quantity >= item.product.stock}
                                className="flex h-8 w-8 items-center justify-center text-primary disabled:opacity-30"
                                aria-label="Tăng số lượng"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-bold text-error hover:bg-error/10"
                            >
                              <Trash2 size={15} /> Xóa
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              <ArrowLeft size={18} /> Tiếp tục mua sắm
            </Link>
          </section>

          <aside className="lg:col-span-4">
            <div className="sticky top-28 overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xl">
              <div className="bg-[#0f172a] px-6 py-5 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Đơn hàng
                </p>
                <h2 className="mt-1 text-2xl font-black">Tóm tắt</h2>
              </div>
              <div className="space-y-5 p-6">
                <div className="space-y-3 border-b border-outline-variant/50 pb-5 text-sm">
                  <div className="flex justify-between">
                    <span>Tạm tính</span>
                    <strong>{formatPrice(totals.subtotal)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí vận chuyển</span>
                    <strong className="text-primary">Miễn phí</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế VAT 10%</span>
                    <strong>{formatPrice(totals.vat)}</strong>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Voucher</span>
                      <strong>-{formatPrice(totals.discount)}</strong>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">Tổng thanh toán</span>
                  <span className="text-2xl font-black text-primary">
                    {formatPrice(totals.total)}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/checkouts')}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary font-black text-white shadow-lg shadow-primary/20"
                >
                  <CreditCard size={20} /> Thanh toán ngay
                </button>
                <div className="grid grid-cols-3 gap-3 text-center text-[11px] font-semibold text-on-surface-variant">
                  <span className="flex flex-col items-center gap-1">
                    <ShieldCheck size={18} />
                    Bảo mật
                  </span>
                  <span className="flex flex-col items-center gap-1">
                    <Truck size={18} />
                    Miễn phí
                  </span>
                  <span className="flex flex-col items-center gap-1">
                    <Gift size={18} />
                    Theo shop
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
