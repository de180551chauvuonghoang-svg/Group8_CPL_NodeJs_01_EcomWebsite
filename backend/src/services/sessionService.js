import { sql, pool } from "../config/db.js";

export const sessionService = {
  /**
   * Tạo session mới với refresh token
   * @param {string} userId - ID của user
   * @param {string} refreshToken - Refresh token cần lưu
   * @param {number} expiresIn - Thời gian hết hạn (milliseconds)
   * @returns {Promise<Object>} Session object
   */
  create: async (userId, refreshToken, expiresIn) => {
    try {
      const sessionId = `sess_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + expiresIn);

      await pool
        .request()
        .input("id", sql.VarChar, sessionId)
        .input("user_id", sql.VarChar, userId)
        .input("refresh_token", sql.VarChar, refreshToken)
        .input("expires_at", sql.DateTime2, expiresAt).query(`
          INSERT INTO Sessions (id, user_id, refresh_token, expires_at, is_active)
          VALUES (@id, @user_id, @refresh_token, @expires_at, 1)
        `);

      return {
        id: sessionId,
        user_id: userId,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        is_active: true,
        created_at: new Date(),
      };
    } catch (err) {
      throw new Error(`Failed to create session: ${err.message}`);
    }
  },

  /**
   * Tìm session theo refresh token
   * @param {string} refreshToken - Refresh token cần tìm
   * @returns {Promise<Object|null>} Session object hoặc null
   */
  findByRefreshToken: async (refreshToken) => {
    try {
      const result = await pool
        .request()
        .input("refresh_token", sql.VarChar, refreshToken).query(`
          SELECT * FROM Sessions 
          WHERE refresh_token = @refresh_token AND is_active = 1
        `);

      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Failed to find session: ${err.message}`);
    }
  },

  /**
   * Xác thực session - kiểm tra token còn hiệu lực không
   * @param {string} refreshToken - Refresh token cần xác thực
   * @returns {Promise<Object|null>} Session object nếu hợp lệ, null nếu hết hạn hoặc không tồn tại
   */
  validateSession: async (refreshToken) => {
    try {
      const result = await pool
        .request()
        .input("refresh_token", sql.VarChar, refreshToken)
        .input("now", sql.DateTime2, new Date()).query(`
          SELECT * FROM Sessions 
          WHERE refresh_token = @refresh_token 
          AND is_active = 1 
          AND expires_at > @now
        `);

      return result.recordset[0] || null;
    } catch (err) {
      throw new Error(`Failed to validate session: ${err.message}`);
    }
  },

  /**
   * Xoá session (logout)
   * @param {string} sessionId - ID của session cần xoá
   * @returns {Promise<boolean>} True nếu xoá thành công
   */
  deleteSession: async (sessionId) => {
    try {
      await pool.request().input("id", sql.VarChar, sessionId).query(`
          UPDATE Sessions SET is_active = 0 WHERE id = @id
        `);

      return true;
    } catch (err) {
      throw new Error(`Failed to delete session: ${err.message}`);
    }
  },

  /**
   * Xoá tất cả session của user (logout everywhere)
   * @param {string} userId - ID của user
   * @returns {Promise<boolean>} True nếu xoá thành công
   */
  deleteAllUserSessions: async (userId) => {
    try {
      await pool.request().input("user_id", sql.VarChar, userId).query(`
          UPDATE Sessions SET is_active = 0 WHERE user_id = @user_id
        `);

      return true;
    } catch (err) {
      throw new Error(`Failed to delete all user sessions: ${err.message}`);
    }
  },

  /**
   * Xoá session hết hạn (cleanup)
   * @returns {Promise<number>} Số sessions đã xoá
   */
  deleteExpiredSessions: async () => {
    try {
      const result = await pool
        .request()
        .input("now", sql.DateTime2, new Date()).query(`
          UPDATE Sessions SET is_active = 0 
          WHERE expires_at <= @now AND is_active = 1
        `);

      return result.rowsAffected[0] || 0;
    } catch (err) {
      throw new Error(`Failed to delete expired sessions: ${err.message}`);
    }
  },

  /**
   * Lấy tất cả session hoạt động của user
   * @param {string} userId - ID của user
   * @returns {Promise<Array>} Danh sách sessions
   */
  findByUserId: async (userId) => {
    try {
      const result = await pool
        .request()
        .input("user_id", sql.VarChar, userId)
        .input("now", sql.DateTime2, new Date()).query(`
          SELECT * FROM Sessions 
          WHERE user_id = @user_id AND is_active = 1 AND expires_at > @now
          ORDER BY created_at DESC
        `);

      return result.recordset || [];
    } catch (err) {
      throw new Error(`Failed to find user sessions: ${err.message}`);
    }
  },
};
