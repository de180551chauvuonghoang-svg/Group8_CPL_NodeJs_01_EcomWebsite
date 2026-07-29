import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User } from 'lucide-react';
import { aiService, AIChatMessage } from '../../services/aiService';
import { useNavigate } from 'react-router-dom';

const logoUrl =
  import.meta.env.VITE_CDN_URL && import.meta.env.VITE_CDN_URL !== 'undefined'
    ? `${import.meta.env.VITE_CDN_URL}/favicon.png`
    : '/favicon.png';

export default function AIChatWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'ai',
      content:
        'Chào bạn! Mình là Trợ lý AI của Volitify ✨. Mình có thể giúp gì cho bạn hôm nay? (Ví dụ: "Tôi muốn tìm laptop gaming dưới 25 triệu")',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Tạo sessionId ngẫu nhiên cho phiên chat
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = useCallback(
    async (text: string = inputValue) => {
      if (!text.trim()) return;

      const userMsg: AIChatMessage = {
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      setIsLoading(true);

      try {
        const response = await aiService.sendMessage(text, sessionId);
        const aiMsg: AIChatMessage = {
          role: 'ai',
          content: response.reply,
          products: response.products,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        const errorMsg: AIChatMessage = {
          role: 'ai',
          content:
            'Xin lỗi, hiện tại mình đang gặp sự cố kết nối. Bạn vui lòng thử lại sau nhé! 😥',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, sessionId],
  );

  // Lắng nghe sự kiện mở chat từ các nơi khác (ví dụ: Banner)
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
      setIsOpen(true);
      if (e.detail?.query) {
        handleSendMessage(e.detail.query);
      }
    };

    window.addEventListener('open-ai-chat', handleOpenChat as EventListener);
    return () => window.removeEventListener('open-ai-chat', handleOpenChat as EventListener);
  }, [handleSendMessage]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Hàm này biến văn bản thường thành giao diện
  const renderMessageContent = (text: string) => {
    // 1. Dọn dẹp rác: Loại bỏ các đoạn <function>...</function> do AI bị lỗi tuồn ra
    let cleanText = text.replace(/<function\b[^>]*>[\s\S]*?<\/function>/gi, '').trim();

    // 2. Tìm kiếm mật mã theo chuẩn [LINK_TO_COMBO|xxx]
    const comboRegex = /\[LINK_TO_COMBO\|(.*?)\]/g;

    // Nếu trong câu không có mật mã, in ra chữ bình thường
    if (!comboRegex.test(cleanText)) {
      return <p className="whitespace-pre-wrap leading-relaxed">{cleanText}</p>;
    }

    // Nếu CÓ mật mã, ta sẽ cắt phần chữ hiển thị, và lấy phần Category ra để làm Nút
    const matches = cleanText.match(/\[LINK_TO_COMBO\|(.*?)\]/);
    const category = matches ? matches[1] : '';
    cleanText = cleanText.replace(comboRegex, '').trim(); // Cắt bỏ chữ [LINK_TO_COMBO|...] khỏi câu nói

    return (
      <div className="flex flex-col gap-4 mt-1">
        <p className="whitespace-pre-wrap leading-relaxed">{cleanText}</p>

        {/* Vẽ nút bấm ở đây */}
        <button
          onClick={() => {
            setIsOpen(false); // Đóng cửa sổ chat lại cho gọn
            navigate(`/combos?category=${category}`); // Nhảy sang trang Combo kèm bộ lọc
          }}
          className="group flex items-center justify-between bg-gradient-to-r from-primary to-secondary text-white px-5 py-3 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <span>Xem các bộ Combo {category}</span>
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Nút bấm mở/đóng Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 bg-gradient-to-br from-primary to-secondary text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-primary/40 transition-all duration-300 relative overflow-hidden group border-2 border-white/20"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
              <img
                src={logoUrl}
                alt="AI"
                className="w-8 h-8 object-contain drop-shadow-md brightness-0 invert"
              />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-error border-2 border-white"></span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Cửa sổ Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-[350px] md:w-[420px] h-[600px] max-h-[80vh] bg-surface-container-lowest rounded-[2rem] shadow-2xl border border-outline-variant/30 flex flex-col z-50 overflow-hidden"
          >
            {/* Header Premium */}
            <div className="bg-gradient-to-br from-primary via-primary to-secondary p-5 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg p-2 border-2 border-white/50">
                  <img src={logoUrl} alt="Volitify" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tight leading-tight">Volitify AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    <p className="text-xs text-white/90 font-medium">
                      Đang trực tuyến - Sẵn sàng tư vấn
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors relative z-10 backdrop-blur-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tin nhắn */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-surface/50 to-surface-container-lowest">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-secondary text-white'
                        : 'bg-white text-primary border-2 border-primary/20'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User size={18} />
                    ) : (
                      <img src={logoUrl} alt="AI" className="w-6 h-6 object-contain" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm shadow-sm relative group ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-tr-sm'
                        : 'bg-white text-on-surface border border-outline-variant/30 rounded-tl-sm'
                    }`}
                  >
                    {renderMessageContent(msg.content)}

                    {/* Render Product Cards if AI returns products */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {msg.products.map((p, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/50 items-center hover:bg-surface-container hover:border-primary/30 transition-all cursor-pointer shadow-sm group/product"
                          >
                            {p.image && (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-14 h-14 rounded-lg object-cover group-hover/product:scale-105 transition-transform"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs truncate text-on-surface leading-tight mb-1">
                                {p.name || 'Sản phẩm'}
                              </h4>
                              <p className="text-primary font-black text-sm">
                                {(p.price || 0).toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-primary opacity-0 group-hover/product:opacity-100 transition-opacity">
                              chevron_right
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <span
                      className={`text-[9px] absolute -bottom-5 opacity-0 group-hover:opacity-100 transition-opacity font-medium ${msg.role === 'user' ? 'right-1 text-on-surface-variant/60' : 'left-1 text-on-surface-variant/60'}`}
                    >
                      {msg.timestamp.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-white text-primary border-2 border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src={logoUrl}
                      alt="AI"
                      className="w-6 h-6 object-contain opacity-50 animate-pulse"
                    />
                  </div>
                  <div className="bg-white border border-outline-variant/30 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-2 items-center shadow-sm">
                    <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" />
                    <div
                      className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <div
                      className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Khu vực nhập text */}
            <div className="p-4 bg-white border-t border-outline-variant/30 shrink-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-3 bg-surface-container-lowest rounded-full pl-5 pr-2 py-2 border-2 border-outline-variant/50 focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_rgba(var(--color-primary),0.1)] transition-all"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Chat với AI..."
                  className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 text-on-surface placeholder:text-on-surface-variant/50 font-medium"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white disabled:opacity-50 disabled:from-surface-container-high disabled:to-surface-container-high disabled:text-on-surface-variant transition-all shadow-md hover:shadow-lg transform active:scale-95"
                >
                  <Send
                    size={18}
                    className={inputValue.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''}
                  />
                </button>
              </form>
              <div className="text-center mt-3">
                <span className="text-[10px] text-on-surface-variant/50 font-medium uppercase tracking-widest">
                  Powered by Volitify AI ✨
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
