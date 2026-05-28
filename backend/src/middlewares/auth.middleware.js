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

    // Verify token
    const decodedUser = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET ||
        "01c62f4196e6488021229bb62f40a56ae126977b956c8274571150ad01eb434a5a28b2deefbdd4f248be407a51089e4813cadd6daa44fd6eb88d4d273dce71d6",
    );

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
