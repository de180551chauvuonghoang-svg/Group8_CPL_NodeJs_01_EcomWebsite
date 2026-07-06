import React, { useRef, useState, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Store } from 'lucide-react';
import { Product } from '../../types';

interface ChatMessage {
  id: string;
  sender_role: string;
  message_text: string;
  created_at: string;
  sender_name?: string;
}

interface ShopCoords {
  name: string;
  lat: number;
  lng: number;
  feePerKm: number;
  maxDist: number;
}

interface ChatPanelProps {
  onClose: () => void;
  chatTab: 'shop' | 'ai';
  onTabChange: (tab: 'shop' | 'ai') => void;
  selectedShopId: string;
  onShopChange: (shopId: string) => void;
  SHOPS_COORDS: Record<string, ShopCoords>;
  aiChatMessages: ChatMessage[];
  customerChatMessages: ChatMessage[];
  aiRecommendedProducts: Record<string, string[]>;
  isAiLoading: boolean;
  products: Product[];
  onOpenOrder: (product: Product) => void;
  aiMsgText: string;
  onAiMsgChange: (text: string) => void;
  onSendAi: (e: React.FormEvent) => void;
  customerMsgText: string;
  onCustomerMsgChange: (text: string) => void;
  onSendShop: (e: React.FormEvent) => void;
}

const BUBBLE_SIZE = 68;
const ICON_SIZE = 32;
const PANEL_WIDTH = 384;
const PANEL_HEIGHT = 500;

export default function ChatPanel({
  onClose,
  chatTab,
  onTabChange,
  selectedShopId,
  onShopChange,
  SHOPS_COORDS,
  aiChatMessages,
  customerChatMessages,
  aiRecommendedProducts,
  isAiLoading,
  products,
  onOpenOrder,
  aiMsgText,
  onAiMsgChange,
  onSendAi,
  customerMsgText,
  onCustomerMsgChange,
  onSendShop
}: ChatPanelProps) {
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('ecom_chat_bubble_pos');
      if (saved) return JSON.parse(saved) as { x: number; y: number };
    } catch { /* ignore */ }
    return { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, moved: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = chatTab === 'shop' ? customerChatMessages : aiChatMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isAiLoading, chatTab]);

  useEffect(() => {
    localStorage.setItem('ecom_chat_bubble_pos', JSON.stringify(position));
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      moved: false
    };
    e.currentTarget.setPointerCapture(e.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.moved = true;
        setIsDragging(true);
      }
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy
      });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      setTimeout(() => setIsDragging(false), 0);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = (msg: ChatMessage, isAiTab: boolean) => {
    const isOwn = msg.sender_role === 'customer';
    const isAi = msg.sender_role === 'ai';
    const recommended = isAiTab && isAi ? aiRecommendedProducts[msg.id] : undefined;

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          marginBottom: '0.75rem'
        }}
      >
        <div
          style={{
            maxWidth: '85%',
            padding: '0.6rem 0.85rem',
            borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isOwn
              ? 'var(--accent-gradient)'
              : isAi
                ? 'rgba(139, 92, 246, 0.15)'
                : 'rgba(255,255,255,0.06)',
            border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {!isOwn && msg.sender_name && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '2px', fontWeight: 600 }}>
              {msg.sender_name}
            </div>
          )}
          {msg.message_text}
        </div>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {formatTime(msg.created_at)}
        </span>

        {recommended && recommended.length > 0 && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', maxWidth: '85%' }}>
            {recommended.map((prodId) => {
              const prod = products.find(p => p.id === prodId);
              if (!prod) return null;
              return (
                <button
                  key={prodId}
                  type="button"
                  onClick={() => onOpenOrder(prod)}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.6rem',
                    cursor: 'pointer',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    background: 'rgba(139, 92, 246, 0.08)',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <img src={prod.image} alt={prod.name} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>{prod.price.toLocaleString('vi-VN')} đ</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        transform: `translate(${position.x}px, ${position.y}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      {/* Chat Panel */}
      <div
        className="glass-panel"
        style={{
          width: PANEL_WIDTH,
          height: PANEL_HEIGHT,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'auto',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.15)',
          animation: 'fadeIn 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'var(--accent-gradient)',
          padding: '0.85rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => onTabChange('shop')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: chatTab === 'shop' ? '#fff' : 'rgba(255,255,255,0.15)',
                color: chatTab === 'shop' ? 'var(--accent-primary)' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <Store size={12} /> Nhân viên
            </button>
            <button
              type="button"
              onClick={() => onTabChange('ai')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: chatTab === 'ai' ? '#fff' : 'rgba(255,255,255,0.15)',
                color: chatTab === 'ai' ? 'var(--accent-primary)' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <Bot size={12} /> AI Advisor
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            aria-label="Đóng chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shop selector (shop tab only) */}
        {chatTab === 'shop' && (
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <select
              className="input-field"
              value={selectedShopId}
              onChange={(e) => onShopChange(e.target.value)}
              style={{ height: 34, fontSize: '0.8rem', padding: '0 0.5rem' }}
            >
              {Object.entries(SHOPS_COORDS).map(([id, shop]) => (
                <option key={id} value={id}>{shop.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.15)' }}>
          {activeMessages.length === 0 && chatTab === 'shop' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
              Chưa có tin nhắn. Hãy gửi lời chào tới {SHOPS_COORDS[selectedShopId]?.name || 'đại lý'}!
            </p>
          )}
          {activeMessages.map(msg => renderMessage(msg, chatTab === 'ai'))}
          {isAiLoading && chatTab === 'ai' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <span className="typing-dots">AI đang tư vấn</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={chatTab === 'shop' ? onSendShop : onSendAi}
          style={{
            padding: '0.65rem 0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            gap: '0.5rem',
            flexShrink: 0,
            background: 'rgba(18, 20, 32, 0.6)'
          }}
        >
          <input
            type="text"
            className="input-field"
            placeholder={chatTab === 'shop' ? 'Nhắn tin cho nhân viên...' : 'Hỏi AI về vật tư xây dựng...'}
            value={chatTab === 'shop' ? customerMsgText : aiMsgText}
            onChange={(e) => chatTab === 'shop' ? onCustomerMsgChange(e.target.value) : onAiMsgChange(e.target.value)}
            style={{ flex: 1, height: 40, fontSize: '0.85rem' }}
            disabled={chatTab === 'ai' && isAiLoading}
          />
          <button
            type="submit"
            className="gradient-btn"
            disabled={chatTab === 'ai' && isAiLoading}
            style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            aria-label="Gửi tin nhắn"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Draggable Bubble */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onClick={() => {
          if (!dragRef.current.moved && !isDragging) {
            /* bubble stays visible while panel open — click closes via header X */
          }
        }}
        className="gradient-btn"
        style={{
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(139, 92, 246, 0.5)',
          cursor: isDragging ? 'grabbing' : 'grab',
          border: 'none',
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none'
        }}
        aria-label="Kéo để di chuyển chat"
      >
        <MessageSquare size={ICON_SIZE} style={{ color: '#fff', pointerEvents: 'none' }} />
      </button>

      <style>{`
        .typing-dots::after {
          content: '...';
          animation: typingDots 1.2s infinite;
        }
        @keyframes typingDots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      `}</style>
    </div>
  );
}
