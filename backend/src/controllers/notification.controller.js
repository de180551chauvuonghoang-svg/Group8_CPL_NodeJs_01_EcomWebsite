import { notificationService } from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await notificationService.getNotifications(userId);
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      status: "success",
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await notificationService.markAsRead(userId, id);
    if (!success) {
      return res.status(404).json({
        status: "fail",
        message: "Không tìm thấy thông báo hoặc bạn không có quyền."
      });
    }

    res.status(200).json({
      status: "success",
      message: "Đã đánh dấu đã đọc"
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      status: "success",
      message: "Đã đánh dấu tất cả đã đọc"
    });
  } catch (error) {
    next(error);
  }
};
