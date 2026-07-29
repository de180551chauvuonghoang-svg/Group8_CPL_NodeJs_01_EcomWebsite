import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Circle, Loader2, MessageSquare, Send, Store, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { ChatPartner, ChatUnreadUpdate, Message } from '../../types';

const SELLER_CHAT_KEY = 'ecom_chat_seller_id';

type ChatTargetMeta = {
  sellerId: string;
  name?: string;
  avatarUrl?: string;
  shopId?: string;
};

const normalizePartner = (partner: Partial<ChatPartner> & { id: string }): ChatPartner => ({
  id: partner.id,
  name: partner.shop_name || partner.name || 'Shop',
  email: partner.email || '',
  avatar_url: partner.shop_logo_url || partner.avatar_url,
  seller_id: partner.seller_id,
  shop_name: partner.shop_name,
  shop_logo_url: partner.shop_logo_url,
  last_message: partner.last_message,
  last_message_time: partner.last_message_time,
  unread_count: Number(partner.unread_count || 0),
});

export default function LiveChatWidget() {
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user;

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatPartner[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messagesByPartner, setMessagesByPartner] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState('');
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(item => item.id === activePartnerId) || null;
  const activeMessages = activePartnerId ? messagesByPartner[activePartnerId] || [] : [];
  const totalUnread = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);

  const sortConversations = useCallback((items: ChatPartner[]) => {
    return [...items].sort((a, b) => {
      const unreadDiff = Number(b.unread_count || 0) - Number(a.unread_count || 0);
      if (unreadDiff !== 0) return unreadDiff;
      return new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime();
    });
  }, []);

  const upsertConversation = useCallback((partner: ChatPartner) => {
    setConversations(prev => sortConversations([
      normalizePartner(partner),
      ...prev.filter(item => item.id !== partner.id),
    ]));
  }, [sortConversations]);

  const loadRecent = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRecent(true);
    try {
      const data = await chatService.getRecentChats();
      const next = Array.isArray(data)
        ? data.map(normalizePartner).filter(item => item.id !== user.id)
        : [];
      setConversations(sortConversations(next));
      const savedSellerId = sessionStorage.getItem(SELLER_CHAT_KEY);
      if (savedSellerId && next.some(item => item.id === savedSellerId)) {
        setActivePartnerId(savedSellerId);
      } else if (!activePartnerId && next[0]) {
        setActivePartnerId(next[0].id);
      }
    } finally {
      setLoadingRecent(false);
    }
  }, [activePartnerId, sortConversations, user?.id]);

  const loadHistory = useCallback(async (partnerId: string) => {
    if (!partnerId) return;
    setLoadingHistory(true);
    try {
      const history = await chatService.getChatHistory(partnerId);
      setMessagesByPartner(prev => ({ ...prev, [partnerId]: Array.isArray(history) ? history : [] }));
      await chatService.markChatAsRead(partnerId);
      setConversations(prev => prev.map(item => item.id === partnerId ? { ...item, unread_count: 0 } : item));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    socketService.connect(user.id);
    loadRecent();
    return () => {
      socketService.offReceiveMessage();
      socketService.offMessageSent();
      socketService.offChatUnreadUpdated();
    };
  }, [loadRecent, user?.id]);

  useEffect(() => {
    const handleNewTarget = (event: Event) => {
      const detail = (event as CustomEvent<ChatTargetMeta>).detail;
      if (!detail?.sellerId) return;

      const partner = normalizePartner({
        id: detail.sellerId,
        name: detail.name,
        avatar_url: detail.avatarUrl,
        seller_id: detail.shopId,
        shop_name: detail.name,
        shop_logo_url: detail.avatarUrl,
        email: '',
        unread_count: 0,
      });

      sessionStorage.setItem(SELLER_CHAT_KEY, detail.sellerId);
      upsertConversation(partner);
      setActivePartnerId(detail.sellerId);
      setIsOpen(true);
      loadHistory(detail.sellerId);
    };

    window.addEventListener('seller-chat-target', handleNewTarget);
    return () => window.removeEventListener('seller-chat-target', handleNewTarget);
  }, [loadHistory, upsertConversation]);

  useEffect(() => {
    if (isOpen) loadRecent();
  }, [isOpen, loadRecent]);

  useEffect(() => {
    if (isOpen && activePartnerId && !messagesByPartner[activePartnerId]) {
      loadHistory(activePartnerId);
    }
  }, [activePartnerId, isOpen, loadHistory, messagesByPartner]);

  useEffect(() => {
    socketService.offReceiveMessage();
    socketService.onReceiveMessage((msg: Message) => {
      if (!user?.id) return;
      if (msg.sender_id === user.id) return;
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (partnerId === user.id) return;
      setMessagesByPartner(prev => {
        const current = prev[partnerId] || [];
        if (current.some(item => item.id === msg.id)) return prev;
        return { ...prev, [partnerId]: [...current, msg] };
      });

      setConversations(prev => {
        const existing = prev.find(item => item.id === partnerId);
        const unread = msg.sender_id !== user.id && (!isOpen || activePartnerId !== partnerId)
          ? Number(existing?.unread_count || 0) + 1
          : Number(existing?.unread_count || 0);
        const partner = normalizePartner({
          id: partnerId,
          name: existing?.name || 'Shop',
          avatar_url: existing?.avatar_url,
          seller_id: existing?.seller_id,
          shop_name: existing?.shop_name,
          shop_logo_url: existing?.shop_logo_url,
          email: existing?.email || '',
          last_message: msg.message_text,
          last_message_time: msg.created_at,
          unread_count: unread,
        });
        return sortConversations([partner, ...prev.filter(item => item.id !== partnerId)]);
      });
    });
    return () => socketService.offReceiveMessage();
  }, [activePartnerId, isOpen, sortConversations, user?.id]);

  useEffect(() => {
    socketService.offMessageSent();
    socketService.onMessageSent((msg: Message) => {
      if (!user?.id) return;
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      setMessagesByPartner(prev => {
        const current = prev[partnerId] || [];
        const withoutPending = current.filter(item =>
          !(item.id.startsWith('pending_')
            && item.sender_id === msg.sender_id
            && item.receiver_id === msg.receiver_id
            && item.message_text === msg.message_text)
        );
        const messages = withoutPending.some(item => item.id === msg.id) ? withoutPending : [...withoutPending, msg];
        return { ...prev, [partnerId]: messages };
      });
      setSending(false);
    });
    return () => socketService.offMessageSent();
  }, [user?.id]);

  useEffect(() => {
    socketService.offChatUnreadUpdated();
    socketService.onChatUnreadUpdated((payload: ChatUnreadUpdate) => {
      if (payload.partnerId === user?.id) return;
      const partner = normalizePartner({
        id: payload.partnerId,
        name: payload.partnerName || payload.shop_name || 'Shop',
        avatar_url: payload.partnerAvatarUrl || payload.shop_logo_url,
        seller_id: payload.seller_id,
        shop_name: payload.shop_name,
        shop_logo_url: payload.shop_logo_url,
        email: '',
        last_message: payload.last_message || undefined,
        last_message_time: payload.last_message_time || undefined,
        unread_count: activePartnerId === payload.partnerId && isOpen ? 0 : payload.unread_count,
      });
      setConversations(prev => sortConversations([partner, ...prev.filter(item => item.id !== payload.partnerId)]));
    });
    return () => socketService.offChatUnreadUpdated();
  }, [activePartnerId, isOpen, sortConversations, user?.id]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isOpen]);

  const openConversation = async (partnerId: string) => {
    setActivePartnerId(partnerId);
    sessionStorage.setItem(SELLER_CHAT_KEY, partnerId);
    setConversations(prev => prev.map(item => item.id === partnerId ? { ...item, unread_count: 0 } : item));
    await loadHistory(partnerId);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!activePartnerId && conversations[0]) {
      setActivePartnerId(conversations[0].id);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !user?.id || !activePartnerId) return;
    const messageText = inputText.trim();
    const pendingMessage: Message = {
      id: `pending_${Date.now()}`,
      sender_id: user.id,
      receiver_id: activePartnerId,
      message_text: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessagesByPartner(prev => ({
      ...prev,
      [activePartnerId]: [...(prev[activePartnerId] || []), pendingMessage],
    }));
    setConversations(prev => prev.map(item => item.id === activePartnerId
      ? { ...item, last_message: messageText, last_message_time: pendingMessage.created_at }
      : item
    ));
    socketService.sendMessage(activePartnerId, messageText);
    setInputText('');
    setSending(true);
    window.setTimeout(() => setSending(false), 5000);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const sortedConversations = useMemo(() => sortConversations(conversations), [conversations, sortConversations]);

  if (!user || user.role === 'seller' || user.role === 'admin') return null;

  return (
    <>
      <div className="fixed bottom-6 right-24 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpen}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.35)]"
            >
              <Store size={22} />
              {totalUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[10px] font-black text-white">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[520px] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
          >
            <aside className="w-40 shrink-0 border-r border-outline-variant/30 bg-surface-container-low">
              <div className="flex h-14 items-center gap-2 border-b border-outline-variant/30 px-3">
                <MessageSquare size={17} className="text-emerald-600" />
                <span className="text-sm font-black">Tin nhắn</span>
              </div>
              <div className="max-h-[446px] overflow-y-auto">
                {loadingRecent && sortedConversations.length === 0 ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-primary" />
                  </div>
                ) : sortedConversations.length === 0 ? (
                  <div className="px-3 py-10 text-center">
                    <MessageSquare size={24} className="mx-auto mb-2 text-on-surface-variant/30" />
                    <p className="text-xs font-semibold text-on-surface-variant">Chưa có cuộc chat</p>
                  </div>
                ) : (
                  sortedConversations.map(conversation => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openConversation(conversation.id)}
                      className={`flex w-full items-center gap-2 border-b border-outline-variant/20 px-3 py-3 text-left transition ${
                        activePartnerId === conversation.id ? 'bg-emerald-50' : 'hover:bg-surface-container'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {conversation.avatar_url ? (
                          <img src={conversation.avatar_url} alt={conversation.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Store size={15} />
                          </div>
                        )}
                        {(conversation.unread_count || 0) > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-black text-white">
                            {(conversation.unread_count || 0) > 9 ? '9+' : conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-on-surface">{conversation.name}</p>
                        <p className="truncate text-[10px] text-on-surface-variant">{conversation.last_message || 'Bắt đầu chat'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
              <header className="flex h-14 shrink-0 items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 px-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-white">{activeConversation?.name || 'Shop'}</h3>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Circle size={5} className="fill-white/70 text-white/70" />
                    <span className="text-[10px] text-white/80">Đang hoạt động</span>
                  </div>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:bg-white/20">
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-surface/50 to-surface-container-lowest p-3">
                {loadingHistory ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-primary" />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-5 text-center">
                    <div>
                      <MessageSquare size={34} className="mx-auto mb-2 text-on-surface-variant/30" />
                      <p className="text-xs text-on-surface-variant">
                        {activePartnerId ? 'Gửi tin nhắn để hỏi shop về sản phẩm.' : 'Chọn một shop để bắt đầu chat.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  activeMessages.map((msg, index) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <motion.div key={msg.id || index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                        {!isMe && (
                          <div className="mt-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Store size={12} />
                          </div>
                        )}
                        <div className="max-w-[78%]">
                          <div className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            isMe
                              ? 'rounded-tr-sm bg-primary text-white'
                              : 'rounded-tl-sm border border-outline-variant/30 bg-white text-on-surface shadow-sm'
                          }`}>
                            {msg.message_text}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="shrink-0 border-t border-outline-variant/30 bg-white p-3">
                <div className="flex items-center gap-2 rounded-full border-2 border-outline-variant/50 bg-surface-container-lowest py-1.5 pl-4 pr-1.5 focus-within:border-primary/50">
                  <input
                    type="text"
                    value={inputText}
                    onChange={event => setInputText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhắn tin với shop..."
                    disabled={sending || !activePartnerId}
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50"
                  />
                  <button type="button" onClick={handleSend} disabled={!inputText.trim() || sending || !activePartnerId} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow disabled:opacity-50">
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              </footer>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export const setLiveChatSeller = (sellerUserId: string, meta?: { name?: string; avatarUrl?: string; shopId?: string }) => {
  sessionStorage.setItem(SELLER_CHAT_KEY, sellerUserId);
  window.dispatchEvent(new CustomEvent<ChatTargetMeta>('seller-chat-target', {
    detail: {
      sellerId: sellerUserId,
      name: meta?.name,
      avatarUrl: meta?.avatarUrl,
      shopId: meta?.shopId,
    },
  }));
};
