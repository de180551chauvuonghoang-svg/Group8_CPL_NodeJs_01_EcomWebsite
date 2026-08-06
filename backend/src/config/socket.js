import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { messageService } from "../services/messageService.js";

// A user can be connected from several tabs or devices at the same time.
const userSocketMap = new Map();

const addUserSocket = (userId, socketId) => {
  const socketIds = userSocketMap.get(userId) || new Set();
  socketIds.add(socketId);
  userSocketMap.set(userId, socketIds);
};

const removeUserSocket = (userId, socketId) => {
  const socketIds = userSocketMap.get(userId);
  if (!socketIds) return;

  socketIds.delete(socketId);
  if (socketIds.size === 0) userSocketMap.delete(userId);
};

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

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

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
    addUserSocket(socket.userId, socket.id);
    console.log(`[Socket Connected] User: ${socket.userId} -> Socket: ${socket.id}`);

    socket.on("sendMessage", async (data) => {
      try {
        const receiverId = typeof data?.receiverId === "string"
          ? data.receiverId.trim()
          : "";
        const messageText = typeof data?.messageText === "string"
          ? data.messageText.trim()
          : "";
        const senderId = socket.userId;

        if (!senderId || !receiverId || !messageText || messageText.length > 2000) {
          console.warn("[Invalid Message Data]", data);
          socket.emit("error", {
            message: "Message must contain between 1 and 2000 characters."
          });
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

        const receiverSocketIds = userSocketMap.get(receiverId);
        if (receiverSocketIds?.size) {
          io.to([...receiverSocketIds]).emit("receiveMessage", savedMsg);
          const unreadSummary = await messageService.getUnreadSummary(receiverId, senderId);
          io.to([...receiverSocketIds]).emit("chatUnreadUpdated", unreadSummary);
          console.log(`[Real-time Sent] Sent to ${receiverSocketIds.size} user socket(s).`);
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
        removeUserSocket(socket.userId, socket.id);
        console.log(`[Socket Disconnected] User: ${socket.userId} (Socket: ${socket.id})`);
      }
    });
  });

  return io;
};

export { userSocketMap };
