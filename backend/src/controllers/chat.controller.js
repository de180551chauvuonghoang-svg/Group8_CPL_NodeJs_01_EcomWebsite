import { messageService } from "../services/messageService.js";

export const getRecentChats = async (req, res, next) => {
  try {
    const chats = await messageService.getRecentChats(req.user.id);
    res.status(200).json({
      status: "success",
      data: { chats }
    });
  } catch (err) {
    next(err);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const history = await messageService.getChatHistory(req.user.id, req.params.partnerId);
    res.status(200).json({
      status: "success",
      data: { history }
    });
  } catch (err) {
    next(err);
  }
};

export const markChatAsRead = async (req, res, next) => {
  try {
    await messageService.markAsRead(req.params.partnerId, req.user.id);
    res.status(200).json({
      status: "success",
      message: "Chat marked as read."
    });
  } catch (err) {
    next(err);
  }
};
