import jwt from "jsonwebtoken";
import { userService } from "../services/userService.js";

// authorization - xác minh user là ai
export const protect = async (req, res, next) => {
  try {
    // lấy token từ header Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token> lấy access token

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in. Please log in to get access.",
      });
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not configured in environment variables.");
    }
    const decodedUser = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
    );

    // Tìm user
    const userId = decodedUser.userID || decodedUser.id;
    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: "fail",
        message: "Tài khoản của bạn đã bị khoá.",
      });
    }

    // Trả user về trong req
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(403).json({
      status: "fail",
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

// Role-based authorization - kiểm tra role của user
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Kiểm tra user có role được phép không
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};
