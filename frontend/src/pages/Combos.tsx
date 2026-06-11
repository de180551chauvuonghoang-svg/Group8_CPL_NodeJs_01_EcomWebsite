import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';

// Định nghĩa kiểu dữ liệu Combo từ SQL Server
export interface Combo {
  combo_id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  use_case: string;
  specs_summary: string;
  image_url: string; // Đã đổi tên thành image_url như trong SQL
  tags?: string[];
  rating?: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const CATEGORIES = [
  { key: '', label: 'Tất cả Combo' },
  { key: 'PC', label: 'PC & Gaming' },
  { key: 'Kitchen', label: 'Nhà Bếp' },
  { key: 'SmartHome', label: 'Smart Home' },
];

export default function Combos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlCategory = searchParams.get('category') || '';
  const [selectedCat, setSelectedCat] = useState(urlCategory);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  // Gọi API lấy dữ liệu thật từ SQL Server
  useEffect(() => {
    const fetchCombos = async () => {
      setLoading(true);
      try {
        // Sử dụng API instance (đã có sẵn baseURL http://localhost:5000/api) thay vì axios
        const response: any = await API.get('/ai/combos', {
          params: selectedCat ? { query: selectedCat } : {}
        });
        
        // Vì API instance đã tự động parse response.data nên mình chỉ cần gọi response.status
        if (response.status === 'success') {
          const processedCombos = response.data.map((c: any) => ({
            ...c,
            tags: c.use_case ? c.use_case.split(',').map((t: string) => t.trim()).slice(0, 3) : ['Đề xuất'],
            rating: 4.5 + Math.random() * 0.5 // Giữ mock rating cho đẹp
          }));
          setCombos(processedCombos);
        }
      } catch (error) {
        console.error("Lỗi khi tải Combos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCombos();
  }, [selectedCat]);

  // Cập nhật URL khi chọn Category
  useEffect(() => {
    const p = new URLSearchParams();
    if (selectedCat) p.set('category', selectedCat);
    setSearchParams(p, { replace: true });
  }, [selectedCat]);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── Hero Banner dành riêng cho Combo ── */}
      <div className="relative bg-gradient-to-r from-primary/90 to-secondary/90 overflow-hidden text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-container-max mx-auto px-margin-desktop py-16 relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-widest uppercase mb-4 backdrop-blur-sm border border-white/30">
              Đề xuất bởi AI
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
              Khám Phá Các<br />Bộ Combo Hoàn Hảo
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              Không cần đau đầu chọn từng món. Các chuyên gia và AI của chúng tôi đã phối ghép sẵn những cấu hình tối ưu nhất cho không gian của bạn.
            </p>
          </div>
          <div className="hidden md:block w-72 h-72 relative">
            {/* Vòng sáng trang trí */}
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
            <img 
              src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop" 
              alt="Combo Illustration" 
              className="w-full h-full object-cover rounded-full border-4 border-white/20 shadow-2xl relative z-10 animate-[float_6s_ease-in-out_infinite]"
            />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-container-max mx-auto px-margin-desktop py-10 flex flex-col lg:flex-row gap-8">
        
        {/* ── Sidebar (Categories) ── */}
        <aside className="lg:w-64 shrink-0">
          <div className="sticky top-24">
            <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant mb-4">Danh mục Combo</h2>
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCat(cat.key)}
                  className={`shrink-0 text-left px-4.5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer
                    ${selectedCat === cat.key
                      ? 'bg-primary/10 text-primary shadow-sm scale-[1.02]'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant/30 hover:border-primary/30'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main Grid ── */}
        <main className="flex-1 min-w-0">
          <div className="mb-6 flex justify-between items-end">
            <h2 className="text-2xl font-black text-on-surface">
              {selectedCat ? CATEGORIES.find(c => c.key === selectedCat)?.label : 'Tất cả Combo'}
            </h2>
            <p className="text-on-surface-variant text-sm font-medium">{combos.length} bộ được tìm thấy</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-surface-container animate-pulse rounded-3xl"></div>
              ))}
            </div>
          ) : combos.length === 0 ? (
            <div className="py-20 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/50">
              <span className="material-symbols-outlined text-[60px] text-on-surface-variant mb-4">inventory_2</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">Chưa có combo nào</h3>
              <p className="text-on-surface-variant">Hiện chưa có bộ combo nào trong danh mục này. Bạn hãy nhờ AI tư vấn nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {combos.map((combo, idx) => (
                  <motion.div
                    key={combo.combo_id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.4, ease: "easeOut" }}
                    className="group flex flex-col premium-card overflow-hidden"
                  >
                    {/* Hình ảnh siêu đẹp */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 z-10"></div>
                      <img 
                        src={combo.image_url} 
                        alt={combo.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2 flex-wrap">
                        {combo.tags?.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Thông tin */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-black text-on-surface group-hover:text-primary transition-colors leading-tight">
                          {combo.name}
                        </h3>
                        <div className="flex items-center gap-1 bg-warning/10 text-warning px-2 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-[14px]">star</span>
                          <span className="text-xs font-bold">{combo.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">
                        {combo.description}
                      </p>

                      {combo.specs_summary && (
                        <div className="mb-6 p-3 bg-surface-container rounded-2xl text-xs text-on-surface-variant font-semibold flex items-center gap-2 border border-outline-variant/30">
                          <span className="material-symbols-outlined text-[16px] text-primary">memory</span>
                          <span className="line-clamp-1">{combo.specs_summary}</span>
                        </div>
                      )}

                      <div className="mt-auto flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-1">Giá trọn bộ</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-primary">{fmt(combo.price)}</span>
                            {combo.originalPrice && (
                              <span className="text-sm text-on-surface-variant line-through">{fmt(combo.originalPrice)}</span>
                            )}
                          </div>
                        </div>
                        <button className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-lg shadow-primary/30 group-hover:-translate-y-1 group-hover:scale-105 duration-300 cursor-pointer">
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}
