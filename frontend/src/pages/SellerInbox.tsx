import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, Loader2, MessageSquare, Send, Users } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import { ChatPartner, ChatUnreadUpdate, Message } from '../types';

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const sortChats = (items: ChatPartner[]) =>
  [...items].sort((a, b) => {
    const unreadDiff = Number(b.unread_count || 0) - Number(a.unread_count || 0);
    if (unreadDiff !== 0) return unreadDiff;
    return (
      new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
    );
  });

const filterSellerChats = (items: ChatPartner[], currentUserId?: string) => {
  return items.filter((chat) => {
    if (!chat?.id) return false;
    if (chat.id === currentUserId) return false;
    if (chat.seller_id || chat.shop_name || chat.shop_logo_url) return false;
    return true;
  });
};

export default function SellerInbox() {
  const authCtx = useContext(AuthContext);
  const user = authCtx?.user;

  const [chats, setChats] = useState<ChatPartner[]>([]);
  const [activeChat, setActiveChat] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const applyChats = useCallback(
    (items: ChatPartner[]) => {
      setChats(sortChats(filterSellerChats(items, user?.id)));
    },
    [user?.id],
  );

  useEffect(() => {
    if (!user?.id) return;
    socketService.connect();
    return () => {
      socketService.offReceiveMessage();
      socketService.offMessageSent();
      socketService.offChatUnreadUpdated();
    };
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    const loadChats = async () => {
      try {
        const data = await chatService.getRecentChats();
        if (mounted) applyChats(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setChats([]);
      } finally {
        if (mounted) setLoadingChats(false);
      }
    };

    loadChats();
    return () => {
      mounted = false;
    };
  }, [applyChats]);

  useEffect(() => {
    socketService.offReceiveMessage();
    socketService.onReceiveMessage((msg: Message) => {
      if (!user?.id) return;
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (partnerId === user.id) return;

      const belongsToActiveChat = Boolean(activeChat && partnerId === activeChat.id);
      if (belongsToActiveChat) appendMessage(msg);

      setChats((prev) => {
        const existing = prev.find((chat) => chat.id === partnerId);
        if (!existing && msg.sender_id === user.id) return prev;

        const partner: ChatPartner = existing || {
          id: partnerId,
          name: 'Khách hàng',
          email: '',
          unread_count: 0,
        };

        const unread =
          msg.sender_id !== user.id && !belongsToActiveChat
            ? Number(partner.unread_count || 0) + 1
            : Number(partner.unread_count || 0);

        const nextPartner = {
          ...partner,
          last_message: msg.message_text,
          last_message_time: msg.created_at,
          unread_count: belongsToActiveChat ? 0 : unread,
        };

        return sortChats([nextPartner, ...prev.filter((chat) => chat.id !== partnerId)]);
      });
    });

    return () => socketService.offReceiveMessage();
  }, [activeChat, appendMessage, user?.id]);

  useEffect(() => {
    socketService.offChatUnreadUpdated();
    socketService.onChatUnreadUpdated((payload: ChatUnreadUpdate) => {
      if (!user?.id) return;
      if (
        payload.partnerId === user.id ||
        payload.seller_id ||
        payload.shop_name ||
        payload.shop_logo_url
      )
        return;

      setChats((prev) => {
        const partner: ChatPartner = {
          id: payload.partnerId,
          name: payload.partnerName || 'Khách hàng',
          email: '',
          avatar_url: payload.partnerAvatarUrl,
          last_message: payload.last_message || undefined,
          last_message_time: payload.last_message_time || undefined,
          unread_count: activeChat?.id === payload.partnerId ? 0 : payload.unread_count,
        };

        return sortChats([partner, ...prev.filter((chat) => chat.id !== payload.partnerId)]);
      });
    });
    return () => socketService.offChatUnreadUpdated();
  }, [activeChat?.id, user?.id]);

  useEffect(() => {
    socketService.offMessageSent();
    socketService.onMessageSent((msg: Message) => {
      setMessages((prev) => {
        const withoutPending = prev.filter(
          (item) =>
            !(
              item.id.startsWith('pending_') &&
              item.sender_id === msg.sender_id &&
              item.receiver_id === msg.receiver_id &&
              item.message_text === msg.message_text
            ),
        );
        if (withoutPending.some((item) => item.id === msg.id)) return withoutPending;
        return [...withoutPending, msg];
      });
      setSending(false);
    });

    return () => socketService.offMessageSent();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unread = chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0);
    window.dispatchEvent(new CustomEvent('seller-unread-changed', { detail: { unread } }));
  }, [chats]);

  const openChat = useCallback(async (partner: ChatPartner) => {
    setActiveChat(partner);
    setLoadingMessages(true);
    try {
      const history = await chatService.getChatHistory(partner.id);
      setMessages(Array.isArray(history) ? history : []);
      await chatService.markChatAsRead(partner.id);
      setChats((prev) =>
        prev.map((chat) => (chat.id === partner.id ? { ...chat, unread_count: 0 } : chat)),
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleSend = () => {
    if (!inputText.trim() || !activeChat || !user) return;
    const messageText = inputText.trim();
    const pendingMessage: Message = {
      id: `pending_${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeChat.id,
      message_text: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (!socketService.sendMessage(activeChat.id, messageText)) return;

    appendMessage(pendingMessage);
    setSending(true);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? { ...chat, last_message: messageText, last_message_time: pendingMessage.created_at }
          : chat,
      ),
    );
    setInputText('');
    window.setTimeout(() => setSending(false), 5000);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <aside className="flex w-80 shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/30 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="font-black text-on-surface">Hộp thư</h2>
              <p className="text-xs text-on-surface-variant">{chats.length} cuộc trò chuyện</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : chats.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Users size={40} className="mx-auto mb-3 text-on-surface-variant/30" />
              <p className="text-sm text-on-surface-variant">Chưa có tin nhắn nào</p>
            </div>
          ) : (
            chats.map((chat) => (
              <motion.button
                key={chat.id}
                onClick={() => openChat(chat)}
                whileHover={{ backgroundColor: 'rgba(0,74,198,0.05)' }}
                className={`flex w-full items-center gap-3 border-b border-outline-variant/20 px-4 py-3.5 text-left transition ${
                  activeChat?.id === chat.id ? 'border-l-2 border-l-primary bg-primary/10' : ''
                }`}
              >
                <div className="relative shrink-0">
                  {chat.avatar_url ? (
                    <img
                      src={chat.avatar_url}
                      alt={chat.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
                      <span className="text-sm font-black text-primary">
                        {chat.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {(chat.unread_count ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-black text-white">
                      {(chat.unread_count || 0) > 9 ? '9+' : chat.unread_count}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-bold text-on-surface">{chat.name}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-on-surface-variant">
                      {formatTime(chat.last_message_time)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                    {chat.last_message || 'Bắt đầu trò chuyện'}
                  </p>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {!activeChat ? (
          <div className="flex flex-1 items-center justify-center bg-surface">
            <div className="text-center">
              <MessageSquare size={60} className="mx-auto mb-4 text-on-surface-variant/20" />
              <h3 className="text-lg font-bold text-on-surface">Chọn cuộc hội thoại</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Chọn một khách hàng từ danh sách để bắt đầu chat
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-outline-variant/30 bg-surface-container-lowest/80 p-4 backdrop-blur">
              {activeChat.avatar_url ? (
                <img
                  src={activeChat.avatar_url}
                  alt={activeChat.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <span className="font-black text-primary">
                    {activeChat.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-bold text-on-surface">{activeChat.name}</p>
                <div className="flex items-center gap-1">
                  <Circle size={6} className="fill-emerald-500 text-emerald-500" />
                  <span className="text-xs text-on-surface-variant">Đang hoạt động</span>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-surface to-surface-container-lowest/30 p-4">
              {loadingMessages ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-sm text-on-surface-variant">
                  Bắt đầu cuộc trò chuyện với {activeChat.name}
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      {!isMe && (
                        <div className="mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <span className="text-xs font-black text-primary">
                            {activeChat.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="max-w-[72%]">
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? 'rounded-tr-sm bg-primary text-white'
                              : 'rounded-tl-sm border border-outline-variant/40 bg-surface-container-lowest text-on-surface'
                          }`}
                        >
                          {msg.message_text}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="shrink-0 border-t border-outline-variant/30 bg-surface-container-lowest/80 p-4 backdrop-blur">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-outline-variant/50 bg-surface-container px-3 py-2 focus-within:border-primary/50">
                <input
                  type="text"
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={2000}
                  placeholder={`Nhắn tin với ${activeChat.name}...`}
                  disabled={sending}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-md disabled:opacity-50"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
