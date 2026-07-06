import { pool, sql } from '../config/db.js';

export const chatService = {
  /**
   * Get list of chat rooms for user based on role
   * @param {string} userId - ID of user
   * @param {string} role - 'customer' or 'seller'
   */
  getRooms: async (userId, role) => {
    if (role === 'seller') {
      // 1. Get shop owned by this seller
      const shopRes = await pool.request()
        .input('userId', sql.VarChar, userId)
        .query('SELECT id, shop_name FROM Shops WHERE user_id = @userId');
      
      const shop = shopRes.recordset[0];
      if (!shop) {
        throw new Error('Không tìm thấy thông tin cửa hàng của bạn');
      }

      // 2. Fetch all chat rooms for this shop, join with Users table to get customer info
      const result = await pool.request()
        .input('shopId', sql.VarChar, shop.id)
        .query(`
          SELECT cr.*, u.name AS customer_name, u.avatar_url AS customer_avatar,
                 (SELECT TOP 1 message_text FROM Messages WHERE room_id = cr.id ORDER BY created_at DESC) AS last_message,
                 (SELECT TOP 1 created_at FROM Messages WHERE room_id = cr.id ORDER BY created_at DESC) AS last_message_time
          FROM ChatRooms cr
          LEFT JOIN Users u ON cr.customer_id = u.id
          WHERE cr.shop_id = @shopId
          ORDER BY last_message_time DESC, cr.created_at DESC
        `);
      return { rooms: result.recordset, shop };
    } else {
      // For customer: Fetch all rooms, join with Shops to get shop info
      const result = await pool.request()
        .input('userId', sql.VarChar, userId)
        .query(`
          SELECT cr.*, s.shop_name, s.logo_url AS shop_logo,
                 (SELECT TOP 1 message_text FROM Messages WHERE room_id = cr.id ORDER BY created_at DESC) AS last_message,
                 (SELECT TOP 1 created_at FROM Messages WHERE room_id = cr.id ORDER BY created_at DESC) AS last_message_time
          FROM ChatRooms cr
          LEFT JOIN Shops s ON cr.shop_id = s.id
          WHERE cr.customer_id = @userId
          ORDER BY last_message_time DESC, cr.created_at DESC
        `);
      return { rooms: result.recordset };
    }
  },

  /**
   * Get all messages in a chat room
   */
  getMessages: async (roomId) => {
    const result = await pool.request()
      .input('roomId', sql.VarChar, roomId)
      .query(`
        SELECT m.*, u.name AS sender_name, u.role AS sender_role
        FROM Messages m
        LEFT JOIN Users u ON m.sender_id = u.id
        WHERE m.room_id = @roomId
        ORDER BY m.created_at ASC
      `);
    return result.recordset;
  },

  /**
   * Get or create a chat room between customer and shop
   */
  getOrCreateRoom: async (customerId, shopId) => {
    // 1. Check if room exists
    const checkRes = await pool.request()
      .input('customerId', sql.VarChar, customerId)
      .input('shopId', sql.VarChar, shopId)
      .query(`
        SELECT * FROM ChatRooms 
        WHERE customer_id = @customerId AND shop_id = @shopId
      `);
    
    if (checkRes.recordset[0]) {
      return checkRes.recordset[0];
    }

    // 2. Create new room if not exist
    const roomId = `rm_${Math.random().toString(36).substr(2, 9)}`;
    await pool.request()
      .input('id', sql.VarChar, roomId)
      .input('customerId', sql.VarChar, customerId)
      .input('shopId', sql.VarChar, shopId)
      .query(`
        INSERT INTO ChatRooms (id, customer_id, shop_id)
        VALUES (@id, @customerId, @shopId)
      `);

    const newRoomRes = await pool.request()
      .input('id', sql.VarChar, roomId)
      .query('SELECT * FROM ChatRooms WHERE id = @id');
    
    return newRoomRes.recordset[0];
  },

  /**
   * Save message to Database
   */
  saveMessage: async (senderId, roomId, messageText) => {
    const messageId = `msg_${Math.random().toString(36).substr(2, 9)}`;
    
    await pool.request()
      .input('id', sql.VarChar, messageId)
      .input('roomId', sql.VarChar, roomId)
      .input('senderId', sql.VarChar, senderId)
      .input('msgText', sql.NVarChar, messageText)
      .query(`
        INSERT INTO Messages (id, room_id, sender_id, message_text, is_read)
        VALUES (@id, @roomId, @senderId, @msgText, 0)
      `);

    const result = await pool.request()
      .input('id', sql.VarChar, messageId)
      .query(`
        SELECT m.*, u.name AS sender_name, u.role AS sender_role
        FROM Messages m
        LEFT JOIN Users u ON m.sender_id = u.id
        WHERE m.id = @id
      `);
    
    return result.recordset[0];
  }
};
