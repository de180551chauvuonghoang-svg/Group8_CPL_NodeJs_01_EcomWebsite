import { OAuth2Client } from "google-auth-library";
import { userService } from "../services/userService.js";
import { sessionService } from "../services/sessionService.js";
import { sql, pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "734823516510-615m6j17mtnd74cfai29j8ug97hrn8r1.apps.googleusercontent.com");

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        status: "fail",
        message: "Google ID Token is required",
      });
    }

    // 1. Xác thực ID Token từ Google
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID || "734823516510-615m6j17mtnd74cfai29j8ug97hrn8r1.apps.googleusercontent.com",
      });
    } catch (verifyErr) {
      console.error("[🚨 Google Verification Failed]", verifyErr.message);
      return res.status(401).json({
        status: "fail",
        message: "Invalid Google ID Token",
      });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid token payload",
      });
    }

    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        status: "fail",
        message: "Google account does not provide an email address",
      });
    }

    // 2. Tìm hoặc Tạo tài khoản User
    let user = await userService.findByEmail(email);

    if (!user) {
      // Đảm bảo tên duy nhất
      let uniqueName = name || email.split("@")[0];
      const nameExists = await userService.findByName(uniqueName);
      if (nameExists) {
        uniqueName = `${uniqueName}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Tạo mật khẩu ngẫu nhiên độ bảo mật cao (cho an toàn DB)
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Tạo user mới
      const newUser = await userService.create({
        name: uniqueName,
        email: email,
        password: hashedPassword,
        phonenumber: null,
      });

      // Lấy lại đầy đủ thông tin user vừa tạo
      user = await userService.findById(newUser.id);

      // Cập nhật ảnh đại diện từ Google (nếu có)
      if (picture && user) {
        await pool.request()
          .input("id", sql.VarChar, user.id)
          .input("avatar_url", sql.VarChar, picture)
          .query("UPDATE Users SET avatar_url = @avatar_url WHERE id = @id");
        user.avatar_url = picture;
      }
    } else {
      // Nếu user đã tồn tại nhưng chưa có avatar, ta cập nhật từ Google
      if (picture && !user.avatar_url) {
        await pool.request()
          .input("id", sql.VarChar, user.id)
          .input("avatar_url", sql.VarChar, picture)
          .query("UPDATE Users SET avatar_url = @avatar_url WHERE id = @id");
        user.avatar_url = picture;
      }
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: "fail",
        message: "Tài khoản của bạn đã bị khoá.",
      });
    }

    // 3. Tạo JWT Access Token & Refresh Token
    const accessToken = jwt.sign(
      { userID: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET ||
        "01c62f4196e6488021229bb62f40a56ae126977b956c8274571150ad01eb434a5a28b2deefbdd4f248be407a51089e4813cadd6daa44fd6eb88d4d273dce71d6",
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Tạo phiên hoạt động Session
    await sessionService.create(user.id, refreshToken, REFRESH_TOKEN_TTL);

    // 4. Thiết lập HttpOnly Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_TTL,
    });

    res.status(200).json({
      status: "success",
      message: "Đăng nhập Google thành công!",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
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
