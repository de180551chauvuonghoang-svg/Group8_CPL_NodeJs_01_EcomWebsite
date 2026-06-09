import { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function AIBanner() {
  const [query, setQuery] = useState('');

  const handleAISearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Phát event mở cửa sổ chat và truyền query vào
    window.dispatchEvent(
      new CustomEvent('open-ai-chat', { detail: { query } })
    );
    setQuery('');
  };

  return (
    <section className="max-w-container-max mx-auto px-margin-desktop py-8 mb-8">
      <div className="relative overflow-hidden rounded-3xl bg-surface-container border border-outline-variant p-8 md:p-12 group">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
              <Sparkles size={14} className="animate-pulse" />
              <span>Trợ lý AI Volitify</span>
            </div>
            <h2 className="text-headline-md font-bold text-navy-dark mb-4 leading-tight">
              Không biết nên chọn gì? <br />
              <span className="text-primary">Để AI của chúng tôi tìm giúp bạn!</span>
            </h2>
            <p className="text-body-lg text-on-surface-variant mb-6">
              Bạn chỉ cần mô tả nhu cầu, AI sẽ tự động phân tích và chọn lọc các sản phẩm phù hợp nhất trong tầm giá của bạn. (VD: "Setup bếp chung cư 50 triệu")
            </p>
            
            <form onSubmit={handleAISearch} className="relative flex items-center max-w-xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập nhu cầu của bạn vào đây..."
                className="w-full pl-6 pr-32 py-4 rounded-full bg-surface-container-lowest border-2 border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-body-lg shadow-inner transition-all"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="absolute right-2 px-6 py-2.5 bg-primary text-white rounded-full font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/30"
              >
                Tư vấn <ArrowRight size={18} />
              </button>
            </form>
          </div>
          
          {/* Illustration/Image Area */}
          <div className="hidden md:flex w-72 h-72 items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/5 rounded-full animate-spin-slow"></div>
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDutVWXgXeNNxAFSw1LnTaGbiHDAiBPBjHHQg-AV_KcN_Mj2W6Lb6OLynbCfV-BQDJETcN3mBJtG3mccPgffl3chP2WTvlBJsiU3sZuQWLhZVeiaEhXysOCLIQygBQPupqpRZVr4cTDcUSE7YbcYACtESilfopmaqsE63q79l6iZgrolR50bM1h5_lEDkV314cOpO3NNTiToUCJh_9QK2hH4ZfCdZNkrR7fNgLYhitHs-ba52A9gbxH7tvHxthqln94pZA1NvbK_vMp" 
              alt="AI Assistant" 
              className="w-48 h-48 object-cover rounded-3xl rotate-12 group-hover:rotate-6 transition-transform duration-700 shadow-2xl border-4 border-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
