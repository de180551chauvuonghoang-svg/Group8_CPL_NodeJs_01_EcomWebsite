import { io, Socket } from "socket.io-client";

// URL của Backend API (dựa vào file api.ts hoặc lấy base URL tương đương)
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace("/api", "") 
  : "http://localhost:5000";

class SocketService {
  private socket: Socket | null = null;

  // Kết nối và đăng ký userId
  connect(userId: string) {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true
    });

    this.socket.on("connect", () => {
      console.log("[🔌 Socket Connected] Connected to Socket Server");
      this.socket?.emit("join", userId);
    });

    this.socket.on("disconnect", () => {
      console.log("[🔌 Socket Disconnected] Disconnected from Socket Server");
    });
  }

  // Ngắt kết nối
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Gửi tin nhắn
  sendMessage(senderId: string, receiverId: string, messageText: string) {
    if (!this.socket) {
      console.warn("[⚠️ Socket Offline] Cannot send message, socket is not connected.");
      return;
    }
    this.socket.emit("sendMessage", { senderId, receiverId, messageText });
  }

  // Đăng ký lắng nghe nhận tin nhắn
  onReceiveMessage(callback: (msg: any) => void) {
    if (!this.socket) return;
    // Tắt các listener cũ để tránh trùng lặp listener
    this.socket.off("receiveMessage");
    this.socket.on("receiveMessage", callback);
  }

  // Huỷ đăng ký nhận tin nhắn (Cleanup)
  offReceiveMessage() {
    if (this.socket) {
      this.socket.off("receiveMessage");
    }
  }

  // Lắng nghe xác nhận gửi tin nhắn thành công
  onMessageSent(callback: (msg: any) => void) {
    if (!this.socket) return;
    this.socket.off("messageSent");
    this.socket.on("messageSent", callback);
  }

  offMessageSent() {
    if (this.socket) {
      this.socket.off("messageSent");
    }
  }

  onChatUnreadUpdated(callback: (payload: any) => void) {
    if (!this.socket) return;
    this.socket.off("chatUnreadUpdated");
    this.socket.on("chatUnreadUpdated", callback);
  }

  offChatUnreadUpdated() {
    if (this.socket) {
      this.socket.off("chatUnreadUpdated");
    }
  }
}

export const socketService = new SocketService();
