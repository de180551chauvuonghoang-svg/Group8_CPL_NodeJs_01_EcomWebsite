import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, MessageSquare, Package, Store, UserCheck, UserPlus } from 'lucide-react';
import { sellerService } from '../services/sellerService';
import { shopFollowService } from '../services/shopFollowService';
import { AuthContext } from '../context/AuthContext';
import { openSellerChat } from '../utils/liveChat';
import { Product } from '../types';

type PublicShop = {
  shop: {
    id: string;
    user_id: string;
    shop_name: string;
    logo_url?: string;
    cover_url?: string;
    description?: string;
    created_at?: string;
  };
  products: Product[];
  stats: { total_products: number };
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export default function ShopPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user;

  const [data, setData] = useState<PublicShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState('newest');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    setLoading(true);
    sellerService
      .getPublicShop(id)
      .then((response) => {
        if (mounted) setData(response as PublicShop);
      })
      .catch(() => {
        if (mounted) setData(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    shopFollowService
      .getStatus(id)
      .then((status) => {
        setIsFollowing(Boolean(status.is_following));
        setFollowerCount(Number(status.follower_count || 0));
      })
      .catch(() => {
        setIsFollowing(false);
        setFollowerCount(0);
      });
  }, [id, user]);

  const shop = data?.shop;
  const products = useMemo(() => data?.products || [], [data]);
  const stats = data?.stats || { total_products: 0 };

  const categories = useMemo(() => {
    const names = products.map((product) => product.category).filter(Boolean);
    return ['all', ...Array.from(new Set(names))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const filtered =
      categoryFilter === 'all'
        ? products
        : products.filter((product) => product.category === categoryFilter);

    return [...filtered].sort((a, b) => {
      if (sortKey === 'price-asc') return a.price - b.price;
      if (sortKey === 'price-desc') return b.price - a.price;
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'vi');
      return 0;
    });
  }, [categoryFilter, products, sortKey]);

  const handleChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (shop?.user_id) {
      openSellerChat(shop.user_id, {
        name: shop.shop_name,
        avatarUrl: shop.logo_url,
        shopId: shop.id,
      });
    }
  };

  const toggleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!shop || shop.user_id === user.id) return;

    setFollowLoading(true);
    try {
      const status = isFollowing
        ? await shopFollowService.unfollow(shop.id)
        : await shopFollowService.follow(shop.id);
      setIsFollowing(Boolean(status.is_following));
      setFollowerCount(Number(status.follower_count || 0));
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={30} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Store size={46} className="mx-auto mb-4 text-on-surface-variant/50" />
        <h1 className="text-2xl font-black">Không tìm thấy shop</h1>
        <Link
          to="/products"
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
        >
          Xem sản phẩm
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="bg-surface-container">
        <div className="h-64 bg-surface-container-high md:h-72">
          {shop.cover_url ? (
            <img src={shop.cover_url} alt={shop.shop_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-surface-container-high to-secondary/10">
              <Store size={52} className="text-primary/50" />
            </div>
          )}
        </div>

        <div className="mx-auto max-w-container-max px-6 pb-8 md:px-margin-desktop">
          <div className="relative -mt-14 rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-outline-variant/40 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-white ring-4 ring-surface-container-lowest">
                  {shop.logo_url ? (
                    <img
                      src={shop.logo_url}
                      alt={shop.shop_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store size={34} />
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="break-words text-3xl font-black text-on-surface">
                    {shop.shop_name}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                    {shop.description || 'Shop đang cập nhật hồ sơ.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-on-surface-variant">
                    <span className="rounded-lg bg-surface-container px-3 py-1.5">
                      {stats.total_products} sản phẩm
                    </span>
                    <span className="rounded-lg bg-surface-container px-3 py-1.5">
                      Đang hoạt động
                    </span>
                    <span className="rounded-lg bg-surface-container px-3 py-1.5">
                      {followerCount.toLocaleString('vi-VN')} người theo dõi
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {shop.user_id !== user?.id && (
                  <button
                    type="button"
                    onClick={() => void toggleFollow()}
                    disabled={followLoading}
                    className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition disabled:opacity-60 ${isFollowing ? 'border border-outline-variant text-on-surface hover:bg-surface-container' : 'bg-primary text-white hover:bg-primary/90'}`}
                  >
                    {followLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isFollowing ? (
                      <UserCheck size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    {isFollowing ? 'Đang theo dõi' : 'Theo dõi shop'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleChat}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-primary/30 px-4 text-sm font-bold text-primary transition hover:bg-primary/10"
                >
                  <MessageSquare size={16} />
                  Chat với shop
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-6 py-10 md:px-margin-desktop">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black">Sản phẩm của shop</h2>
            <span className="text-sm text-on-surface-variant">
              {visibleProducts.length} sản phẩm đang hiển thị
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Tất cả danh mục' : category}
                </option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
              className="h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm font-semibold outline-none focus:border-primary"
            >
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
              <option value="name">Tên A đến Z</option>
            </select>
          </div>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <Package size={36} className="mx-auto mb-3 text-on-surface-variant/50" />
            <p className="font-bold">Shop chưa có sản phẩm đang bán</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="group overflow-hidden rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-surface-container">
                  <img
                    src={product.image || 'https://placehold.co/600x600/eef2ff/4f46e5?text=Shop'}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="absolute left-3 top-3 rounded-full bg-error px-2.5 py-1 text-[10px] font-black uppercase text-white">
                      Sale
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-bold">{product.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-primary">{formatPrice(product.price)}</p>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <p className="text-xs font-semibold text-on-surface-variant line-through">
                        {formatPrice(product.originalPrice)}
                      </p>
                    )}
                  </div>
                  {typeof product.stock === 'number' && (
                    <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                      {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
