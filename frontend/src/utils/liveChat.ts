export const LIVE_CHAT_SELLER_KEY = 'ecom_chat_seller_id';
export const LIVE_CHAT_TARGET_EVENT = 'seller-chat-target';

export type LiveChatTarget = {
  sellerId: string;
  name?: string;
  avatarUrl?: string;
  shopId?: string;
};

type SellerChatMeta = Omit<LiveChatTarget, 'sellerId'>;

export function openSellerChat(sellerUserId: string, meta?: SellerChatMeta) {
  sessionStorage.setItem(LIVE_CHAT_SELLER_KEY, sellerUserId);
  window.dispatchEvent(
    new CustomEvent<LiveChatTarget>(LIVE_CHAT_TARGET_EVENT, {
      detail: {
        sellerId: sellerUserId,
        name: meta?.name,
        avatarUrl: meta?.avatarUrl,
        shopId: meta?.shopId,
      },
    }),
  );
}
