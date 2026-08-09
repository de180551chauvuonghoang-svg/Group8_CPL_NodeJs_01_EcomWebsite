import { sql, pool } from "../config/db.js";
import { emitNotificationToUser, broadcastNotification } from "../config/socket.js";

export const notificationService = {
  getNotifications: async (userId) => {
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT * FROM Notifications
        WHERE user_id = @userId
        ORDER BY created_at DESC
      `);
    return result.recordset;
  },

  getUnreadCount: async (userId) => {
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        SELECT COUNT(*) as count FROM Notifications
        WHERE user_id = @userId AND is_read = 0
      `);
    return result.recordset[0].count;
  },

  markAsRead: async (userId, notificationId) => {
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .input('id', sql.VarChar, notificationId)
      .query(`
        UPDATE Notifications
        SET is_read = 1
        WHERE id = @id AND user_id = @userId
      `);
    return result.rowsAffected[0] > 0;
  },

  markAllAsRead: async (userId) => {
    const result = await pool.request()
      .input('userId', sql.VarChar, userId)
      .query(`
        UPDATE Notifications
        SET is_read = 1
        WHERE user_id = @userId AND is_read = 0
      `);
    return result.rowsAffected[0] > 0;
  },

  createNotification: async ({ userId, title, message, type, relatedId }) => {
    const id = `notif_${Math.random().toString(36).substr(2, 9)}`;
    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .input('userId', sql.VarChar, userId)
      .input('title', sql.NVarChar, title)
      .input('message', sql.NVarChar, message)
      .input('type', sql.VarChar, type)
      .input('relatedId', sql.VarChar, relatedId || null)
      .query(`
        INSERT INTO Notifications (id, user_id, title, message, type, related_id, is_read, created_at)
        OUTPUT inserted.*
        VALUES (@id, @userId, @title, @message, @type, @relatedId, 0, GETDATE())
      `);
      
    const notification = result.recordset[0];
    emitNotificationToUser(userId, notification);
    return notification;
  },

  createBroadcastNotification: async ({ title, message, type, relatedId }) => {
    // Lấy tất cả user
    const usersResult = await pool.request().query("SELECT id FROM Users WHERE is_active = 1");
    const users = usersResult.recordset;

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const createdNotifications = [];
    try {
      for (const user of users) {
        const id = `notif_${Math.random().toString(36).substr(2, 9)}`;
        const result = await transaction.request()
          .input('id', sql.VarChar, id)
          .input('userId', sql.VarChar, user.id)
          .input('title', sql.NVarChar, title)
          .input('message', sql.NVarChar, message)
          .input('type', sql.VarChar, type)
          .input('relatedId', sql.VarChar, relatedId || null)
          .query(`
            INSERT INTO Notifications (id, user_id, title, message, type, related_id, is_read, created_at)
            OUTPUT inserted.*
            VALUES (@id, @userId, @title, @message, @type, @relatedId, 0, GETDATE())
          `);
        const notification = result.recordset[0];
        createdNotifications.push(notification);
        broadcastNotification(notification); // Emit cho tất cả đang online
      }
      await transaction.commit();
      return createdNotifications;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
