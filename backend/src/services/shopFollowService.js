import { pool, sql } from "../config/db.js";
import { queryError } from "../utils/queryUtils.js";
import { createNotification } from "./notificationService.js";

const getShop = async (sellerId) => {
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT id, user_id, shop_name, logo_url, status
      FROM Sellers
      WHERE id = @sellerId
    `);
  const shop = result.recordset[0];
  if (!shop || shop.status !== "active") {
    throw queryError("SHOP_NOT_FOUND", "Khong tim thay shop dang hoat dong.", 404);
  }
  return shop;
};

export const followShop = async (userId, sellerId) => {
  const shop = await getShop(sellerId);
  if (shop.user_id === userId) {
    throw queryError("CANNOT_FOLLOW_OWN_SHOP", "Seller khong the theo doi shop cua minh.", 409);
  }
  const transaction = new sql.Transaction(pool);
  let started = false;
  try {
    await transaction.begin();
    started = true;
    const result = await transaction.request()
      .input("userId", sql.VarChar, userId)
      .input("sellerId", sql.VarChar, sellerId)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM ShopFollowers WITH (UPDLOCK, HOLDLOCK)
          WHERE user_id = @userId AND seller_id = @sellerId
        )
        INSERT INTO ShopFollowers (user_id, seller_id, created_at)
        VALUES (@userId, @sellerId, GETDATE())
      `);
    if (Number(result.rowsAffected.at(-1) || 0) > 0) {
      await createNotification(transaction, {
        userId: shop.user_id,
        type: "new_follower",
        title: "Shop c\u00f3 ng\u01b0\u1eddi theo d\u00f5i m\u1edbi",
        message: "M\u1ed9t kh\u00e1ch h\u00e0ng v\u1eeba theo d\u00f5i shop.",
        entityType: "shop",
        entityId: sellerId,
        data: { sellerId, followerUserId: userId },
        dedupeKey: `new-follower:${sellerId}:${userId}`
      });
    }
    await transaction.commit();
    started = false;
  } catch (error) {
    if (started) {
      try { await transaction.rollback(); } catch (_) { /* preserve original error */ }
    }
    throw error;
  }
  return getFollowStatus(userId, sellerId);
};

export const unfollowShop = async (userId, sellerId) => {
  await pool.request()
    .input("userId", sql.VarChar, userId)
    .input("sellerId", sql.VarChar, sellerId)
    .query("DELETE FROM ShopFollowers WHERE user_id = @userId AND seller_id = @sellerId");
  return getFollowStatus(userId, sellerId);
};

export const getFollowStatus = async (userId, sellerId) => {
  await getShop(sellerId);
  const result = await pool.request()
    .input("userId", sql.VarChar, userId)
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT
        CAST(CASE WHEN EXISTS (
          SELECT 1 FROM ShopFollowers WHERE user_id = @userId AND seller_id = @sellerId
        ) THEN 1 ELSE 0 END AS BIT) AS is_following,
        (SELECT COUNT(*) FROM ShopFollowers WHERE seller_id = @sellerId) AS follower_count
    `);
  return {
    seller_id: sellerId,
    is_following: Boolean(result.recordset[0].is_following),
    follower_count: Number(result.recordset[0].follower_count)
  };
};

export const getSellerFollowerStats = async (sellerId) => {
  const result = await pool.request()
    .input("sellerId", sql.VarChar, sellerId)
    .query(`
      SELECT
        COUNT(*) AS total_followers,
        SUM(CASE WHEN created_at >= DATEADD(DAY, -30, GETDATE()) THEN 1 ELSE 0 END) AS new_followers_30d,
        SUM(CASE WHEN created_at >= DATEADD(DAY, -7, GETDATE()) THEN 1 ELSE 0 END) AS new_followers_7d
      FROM ShopFollowers
      WHERE seller_id = @sellerId
    `);
  return {
    total_followers: Number(result.recordset[0].total_followers || 0),
    new_followers_30d: Number(result.recordset[0].new_followers_30d || 0),
    new_followers_7d: Number(result.recordset[0].new_followers_7d || 0)
  };
};
