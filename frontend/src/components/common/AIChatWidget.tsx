import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Bot, User } from 'lucide-react';
import { aiService, AIChatMessage } from '../../services/aiService';
import { useNavigate } from 'react-router-dom';

export default function AIChatWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'ai',
      content: 'Chào bạn! Mình là Trợ lý AI của Volitify ✨. Mình có thể giúp gì cho bạn hôm nay? (Ví dụ: "Tôi muốn tìm laptop gaming dưới 25 triệu")',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Tạo sessionId ngẫu nhiên cho phiên chat
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, []);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;
    
    const userMsg: AIChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(text, sessionId);
      const aiMsg: AIChatMessage = {
        role: 'ai',
        content: response.reply,
        products: response.products,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: AIChatMessage = {
        role: 'ai',
        content: 'Xin lỗi, hiện tại mình đang gặp sự cố kết nối. Bạn vui lòng thử lại sau nhé! 😥',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm này biến văn bản thường thành giao diện
  const renderMessageContent = (text: string) => {
    // Tìm kiếm mật mã theo chuẩn [LINK_TO_COMBO|xxx]
    const comboRegex = /\[LINK_TO_COMBO\|(.*?)\]/g;
    
    // Nếu trong câu không có mật mã, in ra chữ bình thường
    if (!comboRegex.test(text)) {
      return <p className="whitespace-pre-wrap">{text}</p>;
    }

    // Nếu CÓ mật mã, ta sẽ cắt phần chữ hiển thị, và lấy phần Category ra để làm Nút
    const cleanText = text.replace(comboRegex, ''); // Cắt bỏ chữ [LINK_TO_COMBO|...] khỏi câu nói
    const matches = text.match(/\[LINK_TO_COMBO\|(.*?)\]/);
    const category = matches ? matches[1] : '';

    return (
      <div className="flex flex-col gap-3">
        <p className="whitespace-pre-wrap">{cleanText}</p>
        
        {/* Vẽ nút bấm ở đây */}
        <button 
          onClick={() => {
            setIsOpen(false); // Đóng cửa sổ chat lại cho gọn
            navigate(`/combos?category=${category}`); // Nhảy sang trang Combo kèm bộ lọc
          }}
          className="bg-white text-primary px-4 py-2 rounded-xl font-bold border border-primary hover:bg-primary/10 transition-colors text-sm shadow-sm"
        >
          👉 Đến trang Combo {category} ngay
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
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-primary/50 transition-shadow relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
              <MessageSquare size={24} />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-warning border-2 border-primary"></span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Cửa sổ Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-80 md:w-[380px] h-[550px] max-h-[70vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-title-md leading-tight">Volitify AI</h3>
                  <p className="text-xs text-white/80">Sẵn sàng tư vấn</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tin nhắn */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/50">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-container-high text-primary'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-surface-container-low text-on-surface border border-outline-variant rounded-tl-none'
                  }`}>
                    {renderMessageContent(msg.content)}
                    
                    {/* Render Product Cards if AI returns products */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.products.map((p, i) => (
                          <div key={i} className="flex gap-2 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant items-center hover:bg-surface-container transition-colors cursor-pointer">
                            {p.image && <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs truncate text-on-surface">{p.name || 'Sản phẩm'}</h4>
                              <p className="text-primary font-bold text-xs">{(p.price || 0).toLocaleString('vi-VN')}đ</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Khu vực nhập text */}
            <div className="p-3 bg-surface-container-lowest border-t border-outline-variant shrink-0">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2 bg-surface-container-low rounded-full px-4 py-2 border border-outline-variant focus-within:border-primary transition-colors"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Hỏi AI tư vấn..."
                  className="flex-1 bg-transparent border-none outline-none text-sm py-1"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 disabled:bg-surface-container-high disabled:text-on-surface-variant transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-on-surface-variant/60">Powered by Volitify AI</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
