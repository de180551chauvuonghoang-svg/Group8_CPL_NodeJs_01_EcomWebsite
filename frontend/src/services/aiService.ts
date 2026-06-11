import axios from 'axios';

// Nếu chưa có URL thật, dùng biến môi trường hoặc để trống
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

export interface AIChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  products?: any[]; // Nếu AI trả về danh sách sản phẩm
}

export const aiService = {
  /**
   * Gửi tin nhắn tới n8n webhook
   */
  async sendMessage(message: string, sessionId: string): Promise<{ reply: string, products?: any[] }> {
    if (!N8N_WEBHOOK_URL) {
      console.warn("Chưa cấu hình VITE_N8N_WEBHOOK_URL. Đang dùng mock response.");
      // Giả lập delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        reply: `Dạ em nghe ạ! Em là trợ lý AI của Volitify. Tính năng kết nối n8n đang chờ cấu hình Webhook URL. Anh/chị vừa nói: "${message}"`
      };
    }

    try {
      // Gọi tới n8n webhook (giả định n8n nhận POST với body là { sessionId, chatInput })
      const response = await axios.post(N8N_WEBHOOK_URL, {
        sessionId,
        chatInput: message
      });

      // Giả sử n8n trả về cấu trúc { output: "Câu trả lời của AI", data: [...] }
      // Tuỳ thuộc vào cách bạn thiết kế Webhook Response trong n8n mà điều chỉnh ở đây
      return {
        reply: response.data.output || response.data.text || response.data || "Xin lỗi, em chưa hiểu ý anh/chị.",
        products: response.data.data || []
      };
    } catch (error) {
      console.error('Lỗi khi gọi n8n AI:', error);
      throw new Error('Không thể kết nối đến Trợ lý AI lúc này.');
    }
  }
};
