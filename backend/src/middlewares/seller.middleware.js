import { pool, sql } from "../config/db.js";

export const requireActiveSeller = async (req, res, next) => {
  try {
    const result = await pool.request()
      .input("userId", sql.VarChar, req.user.id)
      .query(`
        SELECT id, status
        FROM Sellers
        WHERE user_id = @userId
      `);
    const seller = result.recordset[0];
    if (!seller || seller.status !== "active") {
      return res.status(403).json({
        status: "fail",
        code: "SELLER_NOT_ACTIVE",
        message: "Cửa hàng hiện không hoạt động."
      });
    }

    req.activeSeller = {
      id: seller.id,
      status: seller.status
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireEditableSellerApplication = async (req, res, next) => {
  try {
    const result = await pool.request()
      .input("userId", sql.VarChar, req.user.id)
      .query("SELECT status FROM Sellers WHERE user_id = @userId");
    const status = result.recordset[0]?.status || null;

    if (!status || status === "rejected") return next();

    const errors = {
      pending: {
        statusCode: 409,
        code: "SELLER_APPLICATION_PENDING",
        message: "Yêu cầu mở cửa hàng đang chờ duyệt."
      },
      active: {
        statusCode: 409,
        code: "SELLER_ALREADY_ACTIVE",
        message: "Cửa hàng đã được kích hoạt."
      },
      suspended: {
        statusCode: 403,
        code: "SELLER_SUSPENDED",
        message: "Cửa hàng đang bị tạm ngừng và không thể sửa hồ sơ đăng ký."
      }
    };
    const error = errors[status] || {
      statusCode: 409,
      code: "INVALID_SELLER_APPLICATION_STATUS",
      message: "Trạng thái yêu cầu mở cửa hàng không hợp lệ."
    };
    return res.status(error.statusCode).json({
      status: "fail",
      code: error.code,
      message: error.message
    });
  } catch (error) {
    return next(error);
  }
};
