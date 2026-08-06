import { v4 as uuidv4 } from "uuid";
import { pool, sql } from "../config/db.js";
import { createNotification } from "./notificationService.js";

const MAX_PAGE_SIZE = 50;

export const reviewError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = "fail";
  return error;
};

const parsePositiveInteger = (value, fallback, fieldName) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw reviewError("INVALID_PAGINATION", `${fieldName} phải là số nguyên dương.`);
  }
  return parsed;
};

const parsePagination = ({ page, limit }) => {
  const parsedPage = parsePositiveInteger(page, 1, "page");
  const parsedLimit = Math.min(parsePositiveInteger(limit, 10, "limit"), MAX_PAGE_SIZE);
  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit
  };
};

const parseRating = (value, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw reviewError("RATING_REQUIRED", "Vui lòng chọn số sao đánh giá.");
    return undefined;
  }

  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw reviewError("INVALID_RATING", "Số sao đánh giá phải là số nguyên từ 1 đến 5.");
  }
  return rating;
};

const parseTitle = (value) => {
  if (value === undefined) return undefined;
  if (value !== null && typeof value !== "string") {
    throw reviewError("INVALID_REVIEW_TITLE", "Tiêu đề đánh giá không hợp lệ.");
  }
  const title = value?.trim() || null;
  if (title && title.length > 255) {
    throw reviewError("INVALID_REVIEW_TITLE", "Tiêu đề đánh giá không được vượt quá 255 ký tự.");
  }
  return title;
};

const parseBody = (value, { required = false } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw reviewError("REVIEW_BODY_REQUIRED", "Vui lòng nhập nội dung đánh giá.");
    return undefined;
  }
  if (typeof value !== "string") {
    throw reviewError("INVALID_REVIEW_BODY", "Nội dung đánh giá không hợp lệ.");
  }
  const body = value.trim();
  if (body.length < 10 || body.length > 2000) {
    throw reviewError(
      "INVALID_REVIEW_BODY",
      "Nội dung đánh giá phải có từ 10 đến 2000 ký tự."
    );
  }
  return body;
};

const getReviewById = async (db, reviewId) => {
  const result = await db.request()
    .input("reviewId", sql.VarChar, reviewId)
    .query(`
      SELECT
        review.id,
        review.product_id,
        review.order_item_id,
        review.rating,
        review.title,
        review.body,
        review.is_verified,
        review.is_approved,
        review.seller_reply,
        review.replied_at,
        review.created_at,
        review.updated_at,
        users.name AS author_name,
        users.avatar_url AS author_avatar_url
      FROM Reviews review
      INNER JOIN Users users ON users.id = review.user_id
      WHERE review.id = @reviewId AND review.deleted_at IS NULL
    `);
  return result.recordset[0] || null;
};

const getSellerByUserId = async (userId) => {
  const result = await pool.request()
    .input("userId", sql.VarChar, userId)
    .query("SELECT id, shop_name FROM Sellers WHERE user_id = @userId AND status = 'active'");
  if (!result.recordset[0]) {
    throw reviewError("SELLER_NOT_FOUND", "Không tìm thấy thông tin cửa hàng.", 404);
  }
  return result.recordset[0];
};

export const reviewService = {
  getPublicReviews: async (productId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const rating = parseRating(query.rating);
    const sortOptions = {
      newest: "review.created_at DESC",
      oldest: "review.created_at ASC",
      highest: "review.rating DESC, review.created_at DESC",
      lowest: "review.rating ASC, review.created_at DESC"
    };
    const sort = sortOptions[query.sort || "newest"];
    if (!sort) {
      throw reviewError("INVALID_REVIEW_SORT", "Kiểu sắp xếp đánh giá không hợp lệ.");
    }

    const productResult = await pool.request()
      .input("productId", sql.VarChar, productId)
      .query(`
        SELECT product.id
        FROM Products product
        INNER JOIN Sellers seller
          ON seller.id = product.seller_id AND seller.status = 'active'
        WHERE product.id = @productId AND ISNULL(product.is_active, 1) = 1
      `);
    if (!productResult.recordset[0]) {
      throw reviewError("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.", 404);
    }

    const filter = rating ? "AND review.rating = @rating" : "";
    const listRequest = pool.request()
      .input("productId", sql.VarChar, productId)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit);
    if (rating) listRequest.input("rating", sql.Int, rating);

    const listResult = await listRequest.query(`
      SELECT
        review.id,
        review.rating,
        review.title,
        review.body,
        review.is_verified,
        review.seller_reply,
        review.replied_at,
        review.created_at,
        review.updated_at,
        users.name AS author_name,
        users.avatar_url AS author_avatar_url
      FROM Reviews review
      INNER JOIN Users users ON users.id = review.user_id
      WHERE review.product_id = @productId
        AND review.is_approved = 1
        AND review.deleted_at IS NULL
        ${filter}
      ORDER BY ${sort}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const summaryResult = await pool.request()
      .input("productId", sql.VarChar, productId)
      .input("rating", sql.Int, rating || null)
      .query(`
        SELECT
          COUNT(*) AS review_count,
          CAST(COALESCE(AVG(CAST(rating AS DECIMAL(10, 2))), 0) AS DECIMAL(10, 2)) AS average_rating,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS rating_5,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS rating_4,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS rating_3,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS rating_2,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS rating_1,
          SUM(CASE WHEN @rating IS NULL OR rating = @rating THEN 1 ELSE 0 END) AS filtered_count
        FROM Reviews
        WHERE product_id = @productId
          AND is_approved = 1
          AND deleted_at IS NULL
      `);
    const summary = summaryResult.recordset[0];
    const total = Number(summary.filtered_count || 0);

    return {
      reviews: listResult.recordset.map((review) => ({
        ...review,
        is_verified: Boolean(review.is_verified)
      })),
      summary: {
        average_rating: Number(summary.average_rating || 0),
        review_count: Number(summary.review_count || 0),
        rating_breakdown: {
          5: Number(summary.rating_5 || 0),
          4: Number(summary.rating_4 || 0),
          3: Number(summary.rating_3 || 0),
          2: Number(summary.rating_2 || 0),
          1: Number(summary.rating_1 || 0)
        }
      },
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  },

  getReviewableItems: async (userId) => {
    const result = await pool.request()
      .input("userId", sql.VarChar, userId)
      .query(`
        SELECT TOP 200
          item.id AS order_item_id,
          item.order_id,
          product.id AS product_id,
          CAST(COALESCE(NULLIF(item.product_name, ''), product.name, N'Sản phẩm') AS NVARCHAR(255)) AS product_name,
          item.variant_info,
          item.quantity,
          seller.id AS seller_id,
          seller.shop_name,
          image.image_url,
          COALESCE(delivered.created_at, item.updated_at, item.created_at) AS delivered_at,
          CAST(1 AS BIT) AS can_review
        FROM OrderItems item
        INNER JOIN Orders orders ON orders.id = item.order_id
        INNER JOIN ProductVariants variant ON variant.id = item.variant_id
        INNER JOIN Products product ON product.id = variant.product_id
        INNER JOIN Sellers seller ON seller.id = product.seller_id
        LEFT JOIN Reviews review
          ON review.order_item_id = item.id AND review.deleted_at IS NULL
        OUTER APPLY (
          SELECT TOP 1 product_image.image_url
          FROM ProductImages product_image
          WHERE product_image.product_id = product.id
          ORDER BY product_image.is_primary DESC, product_image.sort_order ASC
        ) image
        OUTER APPLY (
          SELECT TOP 1 history.created_at
          FROM OrderItemStatusHistory history
          WHERE history.order_item_id = item.id AND history.new_status = 'delivered'
          ORDER BY history.created_at DESC
        ) delivered
        WHERE orders.user_id = @userId
          AND item.fulfillment_status = 'delivered'
          AND seller.user_id <> @userId
          AND review.id IS NULL
        ORDER BY delivered_at DESC
      `);

    return result.recordset.map((item) => ({
      ...item,
      can_review: Boolean(item.can_review)
    }));
  },

  getMyReviews: async (userId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const result = await pool.request()
      .input("userId", sql.VarChar, userId)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT COUNT(*) AS total_count
        FROM Reviews
        WHERE user_id = @userId AND deleted_at IS NULL;

        SELECT
          review.id,
          review.order_item_id,
          item.order_id,
          review.product_id,
          CAST(COALESCE(NULLIF(item.product_name, ''), product.name, N'Sản phẩm') AS NVARCHAR(255)) AS product_name,
          image.image_url AS product_image_url,
          seller.id AS seller_id,
          seller.shop_name,
          review.rating,
          review.title,
          review.body,
          review.is_verified,
          review.seller_reply,
          review.replied_at,
          review.created_at,
          review.updated_at
        FROM Reviews review
        INNER JOIN Products product ON product.id = review.product_id
        LEFT JOIN Sellers seller ON seller.id = product.seller_id
        LEFT JOIN OrderItems item ON item.id = review.order_item_id
        OUTER APPLY (
          SELECT TOP 1 product_image.image_url
          FROM ProductImages product_image
          WHERE product_image.product_id = product.id
          ORDER BY product_image.is_primary DESC, product_image.sort_order ASC
        ) image
        WHERE review.user_id = @userId
          AND review.deleted_at IS NULL
        ORDER BY review.created_at DESC, review.id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `);

    const total = Number(result.recordsets[0][0]?.total_count || 0);
    return {
      reviews: result.recordsets[1].map((review) => ({
        ...review,
        is_verified: Boolean(review.is_verified)
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  },

  createReview: async (userId, productId, payload) => {
    if (typeof payload?.orderItemId !== "string" || !payload.orderItemId.trim()) {
      throw reviewError("ORDER_ITEM_REQUIRED", "Thiếu dòng đơn hàng cần đánh giá.");
    }
    const rating = parseRating(payload.rating, { required: true });
    const title = parseTitle(payload.title);
    const body = parseBody(payload.body, { required: true });
    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    try {
      await transaction.begin();
      transactionStarted = true;

      const purchaseResult = await transaction.request()
        .input("userId", sql.VarChar, userId)
        .input("productId", sql.VarChar, productId)
        .input("orderItemId", sql.VarChar, payload.orderItemId.trim())
        .query(`
          SELECT item.id, item.fulfillment_status,
                 seller.id AS seller_id, seller.user_id AS seller_user_id,
                 product.name AS product_name
          FROM OrderItems item WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN Orders orders ON orders.id = item.order_id
          INNER JOIN ProductVariants variant ON variant.id = item.variant_id
          INNER JOIN Products product ON product.id = variant.product_id
          INNER JOIN Sellers seller ON seller.id = product.seller_id
          WHERE item.id = @orderItemId
            AND orders.user_id = @userId
            AND product.id = @productId
        `);
      const purchase = purchaseResult.recordset[0];
      if (!purchase) {
        throw reviewError(
          "REVIEW_PURCHASE_NOT_FOUND",
          "Không tìm thấy sản phẩm đã mua trong đơn hàng của bạn.",
          403
        );
      }
      if (purchase.seller_user_id === userId) {
        throw reviewError(
          "OWN_SHOP_REVIEW_NOT_ALLOWED",
          "Bạn không thể đánh giá sản phẩm của cửa hàng mình.",
          403
        );
      }
      if (purchase.fulfillment_status !== "delivered") {
        throw reviewError(
          "ORDER_ITEM_NOT_DELIVERED",
          "Bạn chỉ có thể đánh giá sau khi sản phẩm đã được giao thành công.",
          409
        );
      }

      const duplicateResult = await transaction.request()
        .input("orderItemId", sql.VarChar, payload.orderItemId.trim())
        .query(`
          SELECT TOP 1 id
          FROM Reviews WITH (UPDLOCK, HOLDLOCK)
          WHERE order_item_id = @orderItemId AND deleted_at IS NULL
        `);
      if (duplicateResult.recordset[0]) {
        throw reviewError(
          "REVIEW_ALREADY_EXISTS",
          "Sản phẩm trong đơn hàng này đã được đánh giá.",
          409
        );
      }

      const reviewId = `rev_${uuidv4().replaceAll("-", "")}`;
      await transaction.request()
        .input("id", sql.VarChar, reviewId)
        .input("productId", sql.VarChar, productId)
        .input("userId", sql.VarChar, userId)
        .input("orderItemId", sql.VarChar, payload.orderItemId.trim())
        .input("rating", sql.TinyInt, rating)
        .input("title", sql.NVarChar, title || null)
        .input("body", sql.NVarChar, body)
        .query(`
          INSERT INTO Reviews (
            id, product_id, user_id, order_item_id, rating, title, body,
            is_verified, is_approved, created_at, updated_at
          ) VALUES (
            @id, @productId, @userId, @orderItemId, @rating, @title, @body,
            1, 1, GETDATE(), GETDATE()
          )
        `);

      await createNotification(transaction, {
        userId: purchase.seller_user_id,
        type: "new_review",
        title: "\u0110\u00e1nh gi\u00e1 s\u1ea3n ph\u1ea9m m\u1edbi",
        message: `${purchase.product_name} v\u1eeba nh\u1eadn \u0111\u00e1nh gi\u00e1 ${rating} sao.`,
        entityType: "review",
        entityId: reviewId,
        data: { reviewId, productId, rating, sellerId: purchase.seller_id },
        dedupeKey: `new-review:${reviewId}`
      });

      const review = await getReviewById(transaction, reviewId);
      await transaction.commit();
      transactionStarted = false;
      return { ...review, is_verified: Boolean(review.is_verified) };
    } catch (error) {
      if (transactionStarted) {
        try {
          await transaction.rollback();
        } catch (_) {
          // Preserve the original review error.
        }
      }
      if ([2601, 2627].includes(error.number)) {
        throw reviewError(
          "REVIEW_ALREADY_EXISTS",
          "Sản phẩm trong đơn hàng này đã được đánh giá.",
          409
        );
      }
      throw error;
    }
  },

  updateReview: async (userId, reviewId, payload) => {
    const hasRating = payload.rating !== undefined;
    const hasTitle = payload.title !== undefined;
    const hasBody = payload.body !== undefined;
    if (!hasRating && !hasTitle && !hasBody) {
      throw reviewError("EMPTY_REVIEW_UPDATE", "Không có nội dung đánh giá cần cập nhật.");
    }

    const rating = parseRating(payload.rating);
    const title = parseTitle(payload.title);
    const body = parseBody(payload.body);
    const updateResult = await pool.request()
      .input("reviewId", sql.VarChar, reviewId)
      .input("userId", sql.VarChar, userId)
      .input("hasRating", sql.Bit, hasRating)
      .input("hasTitle", sql.Bit, hasTitle)
      .input("hasBody", sql.Bit, hasBody)
      .input("rating", sql.TinyInt, rating || null)
      .input("title", sql.NVarChar, title || null)
      .input("body", sql.NVarChar, body || null)
      .query(`
        UPDATE Reviews
        SET rating = CASE WHEN @hasRating = 1 THEN @rating ELSE rating END,
            title = CASE WHEN @hasTitle = 1 THEN @title ELSE title END,
            body = CASE WHEN @hasBody = 1 THEN @body ELSE body END,
            updated_at = GETDATE()
        WHERE id = @reviewId AND user_id = @userId AND deleted_at IS NULL
      `);
    if (updateResult.rowsAffected[0] !== 1) {
      throw reviewError("REVIEW_NOT_FOUND", "Không tìm thấy đánh giá của bạn.", 404);
    }

    const review = await getReviewById(pool, reviewId);
    return { ...review, is_verified: Boolean(review.is_verified) };
  },

  deleteReview: async (userId, reviewId) => {
    const result = await pool.request()
      .input("reviewId", sql.VarChar, reviewId)
      .input("userId", sql.VarChar, userId)
      .query(`
        UPDATE Reviews
        SET deleted_at = GETDATE(), is_approved = 0, updated_at = GETDATE()
        WHERE id = @reviewId AND user_id = @userId AND deleted_at IS NULL
      `);
    if (result.rowsAffected[0] !== 1) {
      throw reviewError("REVIEW_NOT_FOUND", "Không tìm thấy đánh giá của bạn.", 404);
    }
    return true;
  },

  getSellerReviews: async (sellerUserId, query = {}) => {
    const seller = await getSellerByUserId(sellerUserId);
    const { page, limit, offset } = parsePagination(query);
    const rating = parseRating(query.rating);
    const search = String(query.search || "").trim();
    if (search.length > 100) {
      throw reviewError("INVALID_REVIEW_SEARCH", "search khong duoc vuot qua 100 ky tu.");
    }
    const status = String(query.status || "all").toLowerCase();
    if (!["all", "replied", "unreplied"].includes(status)) {
      throw reviewError("INVALID_REVIEW_STATUS", "status chi nhan all, replied hoac unreplied.");
    }
    const sortBy = String(query.sortBy || "created_at");
    const sortColumns = {
      created_at: "review.created_at",
      rating: "review.rating",
      product_name: "product.name"
    };
    const sortOrder = String(query.sortOrder || "desc").toLowerCase();
    if (!sortColumns[sortBy] || !["asc", "desc"].includes(sortOrder)) {
      throw reviewError("INVALID_REVIEW_SORT", "sortBy hoac sortOrder khong hop le.");
    }
    let replied;
    if (query.replied !== undefined) {
      if (!['true', 'false', true, false].includes(query.replied)) {
        throw reviewError("INVALID_REPLIED_FILTER", "Bộ lọc phản hồi không hợp lệ.");
      }
      replied = query.replied === true || query.replied === 'true';
    }

    const filters = [];
    if (rating) filters.push("review.rating = @rating");
    if (status === "replied" || (status === "all" && replied === true)) {
      filters.push("review.seller_reply IS NOT NULL");
    }
    if (status === "unreplied" || (status === "all" && replied === false)) {
      filters.push("review.seller_reply IS NULL");
    }
    if (search) {
      filters.push(`(
        product.name LIKE '%' + @search + '%'
        OR customer.name LIKE '%' + @search + '%'
        OR review.title LIKE '%' + @search + '%'
        OR review.body LIKE '%' + @search + '%'
      )`);
    }
    const filterSql = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const request = pool.request()
      .input("sellerId", sql.VarChar, seller.id)
      .input("search", sql.NVarChar, search || null)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit);
    if (rating) request.input("rating", sql.TinyInt, rating);

    const result = await request.query(`
      SELECT
        review.id,
        review.product_id,
        product.name AS product_name,
        image.image_url AS product_image_url,
        review.order_item_id,
        item.order_id,
        review.rating,
        review.title,
        review.body,
        review.is_verified,
        review.is_approved,
        review.seller_reply,
        review.replied_at,
        review.created_at,
        review.updated_at,
        customer.name AS customer_name,
        customer.avatar_url AS customer_avatar_url,
        COUNT(*) OVER() AS total_count
      FROM Reviews review
      INNER JOIN Products product ON product.id = review.product_id
      INNER JOIN Users customer ON customer.id = review.user_id
      LEFT JOIN OrderItems item ON item.id = review.order_item_id
      OUTER APPLY (
        SELECT TOP 1 product_image.image_url
        FROM ProductImages product_image
        WHERE product_image.product_id = product.id
        ORDER BY product_image.is_primary DESC, product_image.sort_order ASC
      ) image
      WHERE product.seller_id = @sellerId
        AND review.deleted_at IS NULL
        ${filterSql}
      ORDER BY ${sortColumns[sortBy]} ${sortOrder.toUpperCase()}, review.id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    const total = Number(result.recordset[0]?.total_count || 0);

    return {
      reviews: result.recordset.map(({ total_count, ...review }) => ({
        ...review,
        is_verified: Boolean(review.is_verified),
        is_approved: Boolean(review.is_approved)
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  },

  replyToReview: async (sellerUserId, reviewId, replyValue) => {
    if (typeof replyValue !== "string") {
      throw reviewError("SELLER_REPLY_REQUIRED", "Vui lòng nhập nội dung phản hồi.");
    }
    const reply = replyValue.trim();
    if (reply.length < 2 || reply.length > 2000) {
      throw reviewError(
        "INVALID_SELLER_REPLY",
        "Phản hồi phải có từ 2 đến 2000 ký tự."
      );
    }

    const seller = await getSellerByUserId(sellerUserId);
    const result = await pool.request()
      .input("sellerId", sql.VarChar, seller.id)
      .input("reviewId", sql.VarChar, reviewId)
      .input("reply", sql.NVarChar, reply)
      .query(`
        UPDATE review
        SET seller_reply = @reply,
            replied_at = GETDATE(),
            replied_by_seller_id = @sellerId,
            updated_at = GETDATE()
        OUTPUT
          INSERTED.id,
          INSERTED.seller_reply,
          INSERTED.replied_at,
          INSERTED.updated_at
        FROM Reviews review
        INNER JOIN Products product ON product.id = review.product_id
        WHERE review.id = @reviewId
          AND product.seller_id = @sellerId
          AND review.is_approved = 1
          AND review.deleted_at IS NULL
      `);
    if (!result.recordset[0]) {
      throw reviewError(
        "REVIEW_NOT_FOUND",
        "Không tìm thấy đánh giá thuộc cửa hàng.",
        404
      );
    }
    const reviewOwner = await pool.request()
      .input("reviewId", sql.VarChar, reviewId)
      .query(`
        SELECT review.user_id, review.product_id, product.name AS product_name
        FROM Reviews review
        INNER JOIN Products product ON product.id = review.product_id
        WHERE review.id = @reviewId
      `);
    if (reviewOwner.recordset[0]) {
      await createNotification(pool, {
        userId: reviewOwner.recordset[0].user_id,
        type: "review_reply",
        title: "Shop \u0111\u00e3 ph\u1ea3n h\u1ed3i \u0111\u00e1nh gi\u00e1",
        message: `${reviewOwner.recordset[0].product_name}: ${reply.slice(0, 250)}`,
        entityType: "review",
        entityId: reviewId,
        data: {
          reviewId,
          productId: reviewOwner.recordset[0].product_id
        }
      });
    }
    return result.recordset[0];
  }
};
