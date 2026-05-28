import jwt from "jsonwebtoken";
import { userService } from "../services/userService.js";

// Centralized secret retrieval - fail fast if not set
const ACCESS_TOKEN_SECRET = (() => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    console.error("FATAL: ACCESS_TOKEN_SECRET environment variable is not set");
    process.exit(1);
  }
  return secret;
})();

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

    // Verify token
    const decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Tìm user
    const user = await userService.findById(decodedUser.userID);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
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
