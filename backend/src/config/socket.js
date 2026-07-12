import { Server } from "socket.io";
import { messageService } from "../services/messageService.js";

const userSocketMap = new Map();

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket Connected] Socket ID: ${socket.id}`);

    socket.on("join", (userId) => {
      if (userId) {
        userSocketMap.set(userId, socket.id);
        socket.userId = userId;
        console.log(`[User Registered] User: ${userId} -> Socket: ${socket.id}`);
      }
    });

    socket.on("sendMessage", async (data) => {
      try {
        const { senderId, receiverId, messageText } = data;

        if (!senderId || !receiverId || !messageText) {
          console.warn("[Invalid Message Data]", data);
          return;
        }

        const savedMsg = await messageService.saveMessage({
          senderId,
          receiverId,
          messageText
        });

        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", savedMsg);
          const unreadSummary = await messageService.getUnreadSummary(receiverId, senderId);
          io.to(receiverSocketId).emit("chatUnreadUpdated", unreadSummary);
          console.log(`[Real-time Sent] Sent to User Socket: ${receiverSocketId}`);
        } else {
          console.log(`[Receiver Offline] User ${receiverId} is offline. Message saved to DB.`);
        }

        socket.emit("messageSent", savedMsg);
      } catch (error) {
        console.error("[Socket Message Error]", error.message);
        socket.emit("error", { message: "Send message failed. Please try again." });
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        userSocketMap.delete(socket.userId);
        console.log(`[Socket Disconnected] User: ${socket.userId} (Socket: ${socket.id})`);
      }
    });
  });

  return io;
};

export { userSocketMap };
