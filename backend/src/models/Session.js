/**
 * Session Model - Define session-related constants and helper functions
 *
 * Session được dùng để quản lý refresh tokens của users.
 * Mỗi session lưu trữ một refresh token cùng với thông tin hết hạn.
 *
 * Database Table: Sessions (SQL Server)
 * - id: VARCHAR(50) PRIMARY KEY
 * - user_id: VARCHAR(50) FOREIGN KEY
 * - refresh_token: VARCHAR(255) UNIQUE
 * - expires_at: DATETIME2
 * - is_active: BIT (DEFAULT 1)
 * - created_at: DATETIME2
 * - updated_at: DATETIME2
 */

// Session status constants
export const SESSION_STATUS = {
  ACTIVE: 1,
  INACTIVE: 0,
};

// Token expiration constants (in milliseconds)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 30 * 60 * 1000, // 30 minutes
  REFRESH_TOKEN: 14 * 24 * 60 * 60 * 1000, // 14 days
  LONG_LIVED: 30 * 24 * 60 * 60 * 1000, // 30 days (for "remember me")
};

// Session schema definition for reference
export const SESSION_SCHEMA = {
  id: "VARCHAR(50)",
  user_id: "VARCHAR(50)",
  refresh_token: "VARCHAR(255)",
  expires_at: "DATETIME2",
  is_active: "BIT",
  created_at: "DATETIME2",
  updated_at: "DATETIME2",
};

/**
 * Kiểm tra xem session có hết hạn hay không
 * @param {Date} expiresAt - Thời gian hết hạn
 * @returns {boolean} True nếu session đã hết hạn
 */
export const isSessionExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

/**
 * Tính toán thời gian còn lại của session (tính bằng giây)
 * @param {Date} expiresAt - Thời gian hết hạn
 * @returns {number} Thời gian còn lại tính bằng giây
 */
export const getSessionRemainingTime = (expiresAt) => {
  const remainingMs = new Date(expiresAt) - new Date();
  return Math.floor(remainingMs / 1000);
};

/**
 * Tạo session ID duy nhất
 * @returns {string} Session ID
 */
export const generateSessionId = () => {
  return `sess_${Math.random().toString(36).substr(2, 9)}`;
};
