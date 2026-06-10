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
    <section className="max-w-container-max mx-auto px-margin-desktop py-12 mb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-secondary p-8 md:p-14 group shadow-2xl shadow-primary/20">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-1000"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-black/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center justify-between">
          <div className="flex-1 max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white font-bold text-xs uppercase tracking-widest mb-6 backdrop-blur-md border border-white/30 shadow-sm">
              <Sparkles size={16} className="animate-pulse text-warning" />
              <span>Trợ lý AI Volitify</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight drop-shadow-md">
              Không biết nên chọn gì? <br />
              <span className="text-warning">Để AI tìm giúp bạn!</span>
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-xl leading-relaxed">
              Bạn chỉ cần mô tả nhu cầu bằng ngôn ngữ tự nhiên. Chuyên gia AI của chúng tôi sẽ tự động phân tích và chọn lọc các sản phẩm phù hợp nhất với phong cách và ngân sách của bạn.
            </p>
            
            <form onSubmit={handleAISearch} className="relative flex items-center max-w-xl group/form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="VD: Setup bếp chung cư 50 triệu..."
                className="w-full pl-6 pr-36 py-4.5 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 focus:border-white focus:bg-white/20 outline-none text-white placeholder:text-white/60 font-medium text-lg shadow-inner transition-all"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="absolute right-2 px-7 py-3 bg-white text-primary rounded-full font-black flex items-center gap-2 hover:bg-surface-container-lowest hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
              >
                Tư vấn <ArrowRight size={20} className="group-focus-within/form:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
          
          {/* Illustration/Image Area */}
          <div className="hidden lg:flex w-80 h-80 items-center justify-center relative perspective-[1000px]">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
            {/* Vòng xoay */}
            <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-full animate-[spin_15s_linear_infinite]"></div>
            <div className="absolute inset-8 border-2 border-white/10 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
            
            <img 
              src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop" 
              alt="AI Core" 
              className="w-56 h-56 object-cover rounded-[2rem] transform group-hover:rotate-y-12 group-hover:rotate-x-12 group-hover:scale-110 transition-all duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/20 relative z-10"
              style={{ transformStyle: 'preserve-3d' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
