import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { messageService } from "../services/messageService.js";

const userSocketMap = new Map();

const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ];

  if (process.env.FRONTEND_URL) {
    origins.push(...process.env.FRONTEND_URL.split(",").map(url => url.trim()).filter(Boolean));
  }

  return origins;
};

let ioInstance = null;

export const getIO = () => ioInstance;

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Socket authentication required."));
      }

      if (!process.env.ACCESS_TOKEN_SECRET) {
        return next(new Error("ACCESS_TOKEN_SECRET is not configured."));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const userId = decoded.userID || decoded.id;
      if (!userId) {
        return next(new Error("Invalid socket token."));
      }

      socket.userId = userId;
      next();
    } catch (error) {
      next(new Error("Invalid or expired socket token."));
    }
  });

  io.on("connection", (socket) => {
    userSocketMap.set(socket.userId, socket.id);
    console.log(`[Socket Connected] User: ${socket.userId} -> Socket: ${socket.id}`);

    socket.on("sendMessage", async (data) => {
      try {
        const { receiverId, messageText } = data;
        const senderId = socket.userId;

        if (!senderId || !receiverId || !messageText) {
          console.warn("[Invalid Message Data]", data);
          return;
        }

        if (senderId === receiverId) {
          socket.emit("error", { message: "Cannot send message to yourself." });
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
