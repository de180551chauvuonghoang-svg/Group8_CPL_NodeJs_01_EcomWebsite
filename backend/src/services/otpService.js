import { sql, pool } from "../config/db.js";
import { emailService } from "./emailService.js";
import { sessionService } from "./sessionService.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const otpService = {
  /**
   * Generates a new 6-digit OTP code, clears old ones, saves to DB and sends email.
   * @param {string} email
   */
  createOTP: async (email) => {
    // 1. Generate 6-digit OTP using CSPRNG
    const otp = crypto.randomInt(100000, 1000000).toString();
    const id = `otp_${crypto.randomBytes(8).toString("hex")}`;
    
    // OTP active for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

    const emailLower = email.toLowerCase().trim();

    // 2. Delete any old OTP entries for this email
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .query("DELETE FROM Otps WHERE email = @email");

    // 3. Insert new OTP
    await pool
      .request()
      .input("id", sql.VarChar, id)
      .input("email", sql.VarChar, emailLower)
      .input("otp", sql.VarChar, otp)
      .input("expires_at", sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO Otps (id, email, otp, expires_at, is_verified, attempts, locked_until)
        VALUES (@id, @email, @otp, @expires_at, 0, 0, NULL)
      `);

    // 4. Send email OTP
    const mailResult = await emailService.sendOTP(emailLower, otp);
    return { success: true, mock: mailResult.mock, expiresAt };
  },

  /**
   * Verifies an OTP code and marks it as is_verified in the database with attempt limit & lockout.
   * @param {string} email
   * @param {string} otp
   */
  verifyOTP: async (email, otp) => {
    const emailLower = email.toLowerCase().trim();
    const otpClean = otp.trim();
    const now = new Date();

    // 1. Fetch OTP record by email
    const result = await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .query("SELECT * FROM Otps WHERE email = @email");

    const record = result.recordset[0];
    if (!record) {
      return { success: false, message: "Mã OTP không hợp lệ hoặc không tồn tại." };
    }

    // 2. Check lockout
    if (record.locked_until && new Date(record.locked_until) > now) {
      const minutesLeft = Math.ceil((new Date(record.locked_until).getTime() - now.getTime()) / 60000);
      return { success: false, message: `Tài khoản đã bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút.` };
    }

    // 3. Check expiration
    if (now > new Date(record.expires_at)) {
      return { success: false, message: "Mã OTP đã hết hạn, vui lòng yêu cầu gửi lại mã mới." };
    }

    // 4. Check OTP code match
    if (record.otp !== otpClean) {
      const newAttempts = (record.attempts || 0) + 1;
      const maxAttempts = 5;
      let lockedUntil = null;
      let message = `Mã OTP không chính xác. Bạn còn ${maxAttempts - newAttempts} lần thử.`;

      if (newAttempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        message = "Bạn đã nhập sai quá 5 lần. Thiết bị tạm khóa trong 15 phút.";
      }

      await pool
        .request()
        .input("email", sql.VarChar, emailLower)
        .input("attempts", sql.Int, newAttempts)
        .input("locked_until", sql.DateTime2, lockedUntil)
        .query("UPDATE Otps SET attempts = @attempts, locked_until = @locked_until WHERE email = @email");

      return { success: false, message };
    }

    // 5. Mark OTP as verified & reset limits
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .query("UPDATE Otps SET is_verified = 1, attempts = 0, locked_until = NULL WHERE email = @email");

    return { success: true, message: "Xác thực OTP thành công." };
  },

  /**
   * Resets the user's password using the verified OTP token.
   * @param {string} email
   * @param {string} otp
   * @param {string} newPassword
   */
  resetPassword: async (email, otp, newPassword) => {
    const emailLower = email.toLowerCase().trim();
    const otpClean = otp.trim();

    // 1. Fetch verified OTP record
    const result = await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .input("otp", sql.VarChar, otpClean)
      .query("SELECT * FROM Otps WHERE email = @email AND otp = @otp AND is_verified = 1");

    const record = result.recordset[0];
    if (!record) {
      return { success: false, message: "Yêu cầu đặt lại mật khẩu không hợp lệ hoặc mã OTP chưa được xác nhận." };
    }

    // 2. Check OTP expiration
    if (new Date() > new Date(record.expires_at)) {
      return { success: false, message: "Phiên xác thực OTP đã hết hạn, vui lòng thực hiện lại từ đầu." };
    }

    // 3. Backend password validations (Vietnamese message)
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" };
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update user's password in the DB
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .input("password", sql.VarChar, hashedPassword)
      .query("UPDATE Users SET password = @password WHERE email = @email");

    // 6. Revoke all user refresh sessions atomically
    const userResult = await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .query("SELECT id FROM Users WHERE email = @email");
    const user = userResult.recordset[0];
    if (user) {
      await sessionService.deleteAllUserSessions(user.id);
    }

    // 7. Delete OTP records for this email
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .query("DELETE FROM Otps WHERE email = @email");

    return { success: true, message: "Đặt lại mật khẩu thành công!" };
  },

  /**
   * Periodic cleanup strategy for expired OTPs
   */
  cleanupExpiredOTPs: async () => {
    try {
      await pool.request().query("DELETE FROM Otps WHERE expires_at < GETDATE()");
    } catch (err) {
      console.error("Failed to clean up expired OTPs:", err);
    }
  }
};

// Run periodic cleanup every 1 hour
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 60 * 60 * 1000);
