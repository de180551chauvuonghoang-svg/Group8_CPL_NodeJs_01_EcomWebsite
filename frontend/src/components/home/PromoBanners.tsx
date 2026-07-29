import { useEffect, useState } from 'react';
import { bannerService, PublicBanner } from '../../services/bannerService';

// Banner khuyến mãi do Admin quản lý (A004) — tự ẩn khi không có banner nào đang hiển thị
export default function PromoBanners() {
  const [banners, setBanners] = useState<PublicBanner[]>([]);

  useEffect(() => {
    bannerService.getActiveBanners().then(setBanners);
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="max-w-container-max mx-auto px-margin-desktop py-8">
      <div className={`grid gap-gutter ${banners.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {banners.map(banner => {
          const content = (
            <div className="relative rounded-3xl overflow-hidden group aspect-[21/9] md:aspect-[16/6]">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-white font-black text-xl md:text-2xl drop-shadow-md">{banner.title}</h3>
              </div>
            </div>
          );
          return banner.link_url ? (
            <a key={banner.id} href={banner.link_url} className="block">
              {content}
            </a>
          ) : (
            <div key={banner.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
