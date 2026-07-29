import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notificationService.js";

export const getNotifications = async (req, res, next) => {
  try {
    const data = await listNotifications(req.user.id, req.query);
    return res.status(200).json({ status: "success", data });
  } catch (error) {
    return next(error);
  }
};
export const readNotification = async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.user.id, req.params.id);
    return res.status(200).json({ status: "success", data: { notification } });
  } catch (error) {
    return next(error);
  }
};

export const readAllNotifications = async (req, res, next) => {
  try {
    const updated = await markAllNotificationsRead(req.user.id);
    return res.status(200).json({ status: "success", data: { updated } });
  } catch (error) {
    return next(error);
  }
};
