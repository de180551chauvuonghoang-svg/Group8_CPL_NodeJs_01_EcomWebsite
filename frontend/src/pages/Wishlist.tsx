import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default function Wishlist() {
  const { wishlist, toggleWishlist, loading } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item: any) => {
    const product: Product = {
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.base_price,
      image: item.image_url || 'https://via.placeholder.com/150',
      category: item.category_name || 'Khác',
      rating: 5,
      reviewsCount: 0,
      stock: 10,
    };
    addToCart(product, 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Heart className="text-primary fill-primary" size={32} />
        <h1 className="text-3xl font-black">Sản phẩm Yêu thích</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
        </div>
      ) : wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant bg-surface-container py-20 text-center shadow-sm">
          <Heart size={64} className="mb-4 text-outline" />
          <h2 className="mb-2 text-xl font-bold">Danh sách yêu thích của bạn đang trống</h2>
          <p className="mb-6 text-sm text-on-surface-variant">Hãy khám phá thêm các sản phẩm tuyệt vời và lưu chúng lại nhé!</p>
          <Link
            to="/products"
            className="rounded-full bg-primary px-6 py-3 font-bold text-white transition-transform hover:scale-105 active:scale-95"
          >
            Khám phá ngay
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {wishlist.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-sm transition-all hover:shadow-xl"
              >
                <Link to={`/products/${item.id}`} className="relative aspect-square overflow-hidden bg-surface-container-lowest block">
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/eef2ff/4f46e5?text=No+Image'; }}
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleWishlist(item.id);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-error shadow-md transition-transform hover:scale-110 active:scale-95"
                      title="Xóa khỏi danh sách"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">
                    {item.category_name || 'Sản phẩm'}
                  </div>
                  <Link to={`/products/${item.id}`} className="mb-2 line-clamp-2 text-lg font-bold hover:text-primary">
                    {item.name}
                  </Link>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="text-xl font-black text-primary">{formatPrice(Number(item.base_price))}</span>
                  </div>
                  
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    <ShoppingCart size={18} />
                    Thêm vào giỏ
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
