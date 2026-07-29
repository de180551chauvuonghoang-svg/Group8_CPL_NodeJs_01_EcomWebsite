import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import {
  paginationMeta,
  parsePagination,
  queryError
} from "../utils/queryUtils.js";

const requestFor = (db) => db.request();

const toNotification = (item) => ({
  ...item,
  data: item.data_json ? JSON.parse(item.data_json) : null,
  data_json: undefined,
  is_read: Boolean(item.is_read)
});

export const createNotification = async (db, {
  userId,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  data = null,
  dedupeKey = null
}) => {
  const id = `noti_${uuidv4().replace(/-/g, "")}`;
  const result = await requestFor(db)
    .input("id", sql.VarChar, id)
    .input("userId", sql.VarChar, userId)
    .input("type", sql.VarChar, type)
    .input("title", sql.NVarChar, title)
    .input("message", sql.NVarChar, message)
    .input("entityType", sql.VarChar, entityType)
    .input("entityId", sql.VarChar, entityId)
    .input("dataJson", sql.NVarChar, data === null ? null : JSON.stringify(data))
    .input("dedupeKey", sql.VarChar, dedupeKey)
    .query(`
      INSERT INTO Notifications (
        id, user_id, type, title, message, entity_type,
        entity_id, data_json, dedupe_key, is_read, created_at
      )
      OUTPUT inserted.*
      SELECT
        @id, @userId, @type, @title, @message, @entityType,
        @entityId, @dataJson, @dedupeKey, 0, GETDATE()
      WHERE @dedupeKey IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM Notifications WITH (UPDLOCK, HOLDLOCK)
           WHERE dedupe_key = @dedupeKey
         )
    `);
  return result.recordset[0] || null;
};

export const listNotifications = async (userId, query = {}) => {
  const { page, limit, offset } = parsePagination(query);
  const type = String(query.type || "").trim();
  const readFilter = query.isRead === undefined || query.isRead === ""
    ? null
    : String(query.isRead).toLowerCase();
  if (readFilter !== null && !["true", "false"].includes(readFilter)) {
    throw queryError("INVALID_READ_FILTER", "isRead chi nhan true hoac false.");
  }

  const request = pool.request()
    .input("userId", sql.VarChar, userId)
    .input("type", sql.VarChar, type)
    .input("isRead", sql.Bit, readFilter === null ? null : readFilter === "true")
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit);
  const result = await request.query(`
    SELECT COUNT(*) AS total_count
    FROM Notifications
    WHERE user_id = @userId
      AND (@type = '' OR type = @type)
      AND (@isRead IS NULL OR is_read = @isRead);

    SELECT COUNT(*) AS unread_count
    FROM Notifications
    WHERE user_id = @userId AND is_read = 0;

    SELECT id, type, title, message, entity_type, entity_id,
           data_json, is_read, read_at, created_at
    FROM Notifications
    WHERE user_id = @userId
      AND (@type = '' OR type = @type)
      AND (@isRead IS NULL OR is_read = @isRead)
    ORDER BY created_at DESC, id DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);
  const total = Number(result.recordsets[0][0]?.total_count || 0);
  const unread = Number(result.recordsets[1][0]?.unread_count || 0);
  return {
    notifications: result.recordsets[2].map(toNotification),
    unread_count: unread,
    pagination: paginationMeta(page, limit, total)
  };
};

export const markNotificationRead = async (userId, notificationId) => {
  const result = await pool.request()
    .input("userId", sql.VarChar, userId)
    .input("notificationId", sql.VarChar, notificationId)
    .query(`
      UPDATE Notifications
      SET is_read = 1,
          read_at = COALESCE(read_at, GETDATE())
      OUTPUT inserted.*
      WHERE id = @notificationId AND user_id = @userId
    `);
  if (!result.recordset[0]) {
    throw queryError("NOTIFICATION_NOT_FOUND", "Khong tim thay thong bao.", 404);
  }
  return toNotification(result.recordset[0]);
};

export const markAllNotificationsRead = async (userId) => {
  const result = await pool.request()
    .input("userId", sql.VarChar, userId)
    .query(`
      UPDATE Notifications
      SET is_read = 1, read_at = GETDATE()
      WHERE user_id = @userId AND is_read = 0
    `);
  return Number(result.rowsAffected[0] || 0);
};
