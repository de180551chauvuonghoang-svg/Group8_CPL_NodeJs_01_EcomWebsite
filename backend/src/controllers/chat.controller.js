import { chatService } from '../services/chatService.js';
import { aiService } from '../services/aiService.js';

export const getRooms = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role; // customer or seller

    const result = await chatService.getRooms(userId, role);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await chatService.getMessages(roomId);

    res.status(200).json({
      status: 'success',
      data: { messages }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { roomId, shopId, messageText } = req.body;

    if (!messageText || !messageText.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Nội dung tin nhắn không được để trống'
      });
    }

    let activeRoomId = roomId;

    // If roomId is not provided but shopId is, get or create the room
    if (!activeRoomId && shopId) {
      const room = await chatService.getOrCreateRoom(senderId, shopId);
      activeRoomId = room.id;
    }

    if (!activeRoomId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Thiếu thông tin phòng chat (roomId hoặc shopId)'
      });
    }

    // Save message
    const savedMessage = await chatService.saveMessage(senderId, activeRoomId, messageText);

    // Broadcast the message real-time via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(activeRoomId).emit('receive_message', savedMessage);
    }

    res.status(201).json({
      status: 'success',
      data: { 
        roomId: activeRoomId,
        message: savedMessage 
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const aiConsult = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Vui lòng nhập câu hỏi tư vấn'
      });
    }

    const result = await aiService.consult(message);

    res.status(200).json({
      status: 'success',
      data: {
        text: result.text,
        recommendedProductIds: result.recommendedProductIds
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
