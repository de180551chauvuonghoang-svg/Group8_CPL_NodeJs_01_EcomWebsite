import { userService } from "../services/userService.js";
import { sessionService } from "../services/sessionService.js";
import { otpService } from "../services/otpService.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = "30m"; // thông thường là dưới 15m để tăng bảo mật, nhưng ở đây để tiện test thì để 30m
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // refresh token thường có thời gian sống dài hơn access token, ở đây là 14 ngày theo mls

export const signUp = async (req, res, next) => {
  try {
    const { name, email, password, phonenumber } = req.body;
    if (!name || !email || !password || !phonenumber) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide name, email, password and phone number",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        status: "fail",
        message: "Password must be at least 6 characters long",
      });
    }
    //kiểm tra name đã tồn tại chưa
    const duplicateName = await userService.findByName(name);
    if (duplicateName) {
      return res.status(400).json({
        status: "fail",
        message: "Name already exists",
      });
    }
    //kiểm tra email đã tồn tại chưa
    const duplicateEmail = await userService.findByEmail(email);
    if (duplicateEmail) {
      return res.status(400).json({
        status: "fail",
        message: "Email already exists",
      });
    }
    //mã hoá password
    const hashedPassword = await bcrypt.hash(password, 10); // saltRounds = 10 thực hiện 2 mũ 10 lần tốn 200mls để mã hoá password

    //tạo user mới
    await userService.create({
      name,
      email,
      password: hashedPassword,
      phonenumber,
    });
    res.status(201).json({
      status: "success",
      message: "User created successfully",
    });

    return;
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

export const login = async (req, res, next) => {
  try {
    //lấy inputs
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide name and password",
      });
    }

    //lấy hashed password từ database so sánh với password đã nhập
    const user = await userService.findByName(name);
    if (!user) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid name or password",
      });
    }

    //kiểm tra password dùng thư viện bcrypt để so sánh password đã nhập với hashed password trong database
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid name or password",
      });
    }

    //nếu khớp, tạo accessToken với Jwt
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not configured in environment variables.");
    }
    const accessToken = jwt.sign(
      { userID: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    //tạo refreshToken
    const refreshToken = crypto.randomBytes(64).toString("hex"); // tạo chuỗi ngẫu nhiên dài 128 ký tự làm refresh token

    //tạo session lưu refresh token vào database để quản lý
    const session = await sessionService.create(
      user.id,
      refreshToken,
      REFRESH_TOKEN_TTL,
    );

    // Set refresh token trong HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // chỉ gửi qua HTTPS trong production
      sameSite: "strict", //deploy front và backend chung còn nếu riêng thì để sameSite: "none" và secure: true
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.status(200).json({
      status: "success",
      message: "User logged in successfully",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || "customer",
        },
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh Access Token
 * Dùng refresh token để lấy access token mới
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: "fail",
        message: "Refresh token is required",
      });
    }

    // Xác thực refresh token từ database
    const session = await sessionService.validateSession(refreshToken);
    if (!session) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid or expired refresh token",
      });
    }

    // Lấy thông tin user
    const user = await userService.findById(session.user_id);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Tạo access token mới
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET is not configured in environment variables.");
    }
    const newAccessToken = jwt.sign(
      { userID: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    res.status(200).json({
      status: "success",
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout - Xoá session
 */
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: "fail",
        message: "Refresh token is required",
      });
    }

    // Tìm session và xoá nó
    const session = await sessionService.findByRefreshToken(refreshToken);
    if (session) {
      await sessionService.deleteSession(session.id);
    }

    // Clear cookie
    res.clearCookie("refreshToken");

    res.status(200).json({
      status: "success",
      message: "User logged out successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout everywhere - Xoá tất cả session của user
 */
export const logoutEverywhere = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "User not authenticated",
      });
    }

    // Xoá tất cả session của user
    await sessionService.deleteAllUserSessions(userId);

    // Clear cookie
    res.clearCookie("refreshToken");

    res.status(200).json({
      status: "success",
      message: "Logged out from all devices successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const logOut = async (req, res, next) => {
  try {
    //lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;

    if (!token) {
      //xoá refresh token khỏi trong session
      await Session.deleteOne({ refreshToken: token });
      //xoá cookie
      res.clearCookie("refreshToken");
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during logout",
    });
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "User not authenticated",
      });
    }

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          avatar_url: user.avatar_url,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Request password reset OTP
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp địa chỉ email.",
      });
    }

    // Check if user exists
    const user = await userService.findByEmail(email);
    let mock = false;
    
    if (user) {
      // Generate and send OTP
      const result = await otpService.createOTP(email);
      mock = result.mock;
    }

    res.status(200).json({
      status: "success",
      message: "Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn nếu tài khoản tồn tại.",
      data: {
        mock: mock,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp email và mã OTP.",
      });
    }

    const result = await otpService.verifyOTP(email, otp);
    if (!result.success) {
      return res.status(400).json({
        status: "fail",
        message: result.message,
      });
    }

    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset password using OTP
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Vui lòng cung cấp đầy đủ thông tin: email, mã OTP và mật khẩu mới.",
      });
    }

    const result = await otpService.resetPassword(email, otp, newPassword);
    if (!result.success) {
      return res.status(400).json({
        status: "fail",
        message: result.message,
      });
    }

    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};
