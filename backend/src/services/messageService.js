import { sql, pool } from "../config/db.js";

export const messageService = {
  saveMessage: async ({ senderId, receiverId, messageText }) => {
    const id = `msg_${Math.random().toString(36).substr(2, 9)}`;
    await pool.request()
      .input("id", sql.VarChar, id)
      .input("sender_id", sql.VarChar, senderId)
      .input("receiver_id", sql.VarChar, receiverId)
      .input("message_text", sql.NVarChar, messageText)
      .query(`
        INSERT INTO Messages (id, sender_id, receiver_id, message_text, is_read, created_at)
        VALUES (@id, @sender_id, @receiver_id, @message_text, 0, GETDATE())
      `);

    const selectResult = await pool.request()
      .input("id", sql.VarChar, id)
      .query("SELECT * FROM Messages WHERE id = @id");
    return selectResult.recordset[0];
  },

  getChatHistory: async (user1, user2) => {
    const result = await pool.request()
      .input("user1", sql.VarChar, user1)
      .input("user2", sql.VarChar, user2)
      .query(`
        SELECT *
        FROM Messages
        WHERE (sender_id = @user1 AND receiver_id = @user2)
           OR (sender_id = @user2 AND receiver_id = @user1)
        ORDER BY created_at ASC
      `);
    return result.recordset;
  },

  getRecentChats: async (currentUserId) => {
    const result = await pool.request()
      .input("currentUserId", sql.VarChar, currentUserId)
      .query(`
        WITH LastMessages AS (
          SELECT
            CASE WHEN sender_id = @currentUserId THEN receiver_id ELSE sender_id END AS chat_partner_id,
            message_text,
            is_read,
            sender_id,
            created_at,
            ROW_NUMBER() OVER (
              PARTITION BY CASE WHEN sender_id = @currentUserId THEN receiver_id ELSE sender_id END
              ORDER BY created_at DESC
            ) AS rn
          FROM Messages
          WHERE sender_id = @currentUserId OR receiver_id = @currentUserId
        )
        SELECT
          u.id,
          COALESCE(s.shop_name, u.name) AS name,
          u.name AS user_name,
          u.email,
          COALESCE(s.logo_url, u.avatar_url) AS avatar_url,
          u.avatar_url AS user_avatar_url,
          s.id AS seller_id,
          s.shop_name,
          s.logo_url AS shop_logo_url,
          lm.message_text AS last_message,
          lm.created_at AS last_message_time,
          (
            SELECT COUNT(*)
            FROM Messages m2
            WHERE m2.sender_id = u.id
              AND m2.receiver_id = @currentUserId
              AND m2.is_read = 0
          ) AS unread_count
        FROM LastMessages lm
        JOIN Users u ON lm.chat_partner_id = u.id
        LEFT JOIN Sellers s ON s.user_id = u.id
        WHERE lm.rn = 1
          AND lm.chat_partner_id <> @currentUserId
        ORDER BY lm.created_at DESC
      `);
    return result.recordset;
  },

  getRecentChatsForSeller: async (sellerUserId) => {
    return messageService.getRecentChats(sellerUserId);
  },

  getUnreadSummary: async (currentUserId, partnerId) => {
    const result = await pool.request()
      .input("currentUserId", sql.VarChar, currentUserId)
      .input("partnerId", sql.VarChar, partnerId)
      .query(`
        SELECT
          (
            SELECT COUNT(*)
            FROM Messages
            WHERE sender_id = @partnerId
              AND receiver_id = @currentUserId
              AND is_read = 0
          ) AS unread_count,
          (
            SELECT COUNT(*)
            FROM Messages
            WHERE receiver_id = @currentUserId
              AND is_read = 0
          ) AS total_unread,
          (
            SELECT TOP 1 message_text
            FROM Messages
            WHERE (sender_id = @currentUserId AND receiver_id = @partnerId)
               OR (sender_id = @partnerId AND receiver_id = @currentUserId)
            ORDER BY created_at DESC
          ) AS last_message,
          (
            SELECT TOP 1 created_at
            FROM Messages
            WHERE (sender_id = @currentUserId AND receiver_id = @partnerId)
               OR (sender_id = @partnerId AND receiver_id = @currentUserId)
            ORDER BY created_at DESC
          ) AS last_message_time,
          u.name AS user_name,
          u.avatar_url AS user_avatar_url,
          s.id AS seller_id,
          s.shop_name,
          s.logo_url AS shop_logo_url
        FROM Users u
        LEFT JOIN Sellers s ON s.user_id = u.id
        WHERE u.id = @partnerId
      `);

    return {
      partnerId,
      partnerName: result.recordset[0]?.shop_name || result.recordset[0]?.user_name || null,
      partnerAvatarUrl: result.recordset[0]?.shop_logo_url || result.recordset[0]?.user_avatar_url || null,
      seller_id: result.recordset[0]?.seller_id || null,
      shop_name: result.recordset[0]?.shop_name || null,
      shop_logo_url: result.recordset[0]?.shop_logo_url || null,
      unread_count: Number(result.recordset[0]?.unread_count || 0),
      total_unread: Number(result.recordset[0]?.total_unread || 0),
      last_message: result.recordset[0]?.last_message || null,
      last_message_time: result.recordset[0]?.last_message_time || null
    };
  },

  markAsRead: async (senderId, receiverId) => {
    await pool.request()
      .input("senderId", sql.VarChar, senderId)
      .input("receiverId", sql.VarChar, receiverId)
      .query(`
        UPDATE Messages
        SET is_read = 1
        WHERE sender_id = @senderId AND receiver_id = @receiverId AND is_read = 0
      `);
    return true;
  }
};
