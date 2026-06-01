import { sql, pool } from "../config/db.js";
import { emailService } from "./emailService.js";
import bcrypt from "bcryptjs";

export const otpService = {
  /**
   * Generates a new 6-digit OTP code, clears old ones, saves to DB and sends email.
   * @param {string} email
   */
  createOTP: async (email) => {
    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const id = `otp_${Math.random().toString(36).substr(2, 9)}`;
    
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
        INSERT INTO Otps (id, email, otp, expires_at, is_verified)
        VALUES (@id, @email, @otp, @expires_at, 0)
      `);

    // 4. Send email OTP
    const mailResult = await emailService.sendOTP(emailLower, otp);
    return { success: true, mock: mailResult.mock, expiresAt };
  },

  /**
   * Verifies an OTP code and marks it as is_verified in the database.
   * @param {string} email
   * @param {string} otp
   */
  verifyOTP: async (email, otp) => {
    const emailLower = email.toLowerCase().trim();
    const otpClean = otp.trim();

    // 1. Fetch OTP record
    const result = await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .input("otp", sql.VarChar, otpClean)
      .query("SELECT * FROM Otps WHERE email = @email AND otp = @otp");

    const record = result.recordset[0];
    if (!record) {
      return { success: false, message: "Mã OTP không hợp lệ hoặc không chính xác." };
    }

    // 2. Check expiration
    if (new Date() > new Date(record.expires_at)) {
      return { success: false, message: "Mã OTP đã hết hạn, vui lòng yêu cầu gửi lại mã mới." };
    }

    // 3. Mark OTP as verified
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .input("otp", sql.VarChar, otpClean)
      .query("UPDATE Otps SET is_verified = 1 WHERE email = @email AND otp = @otp");

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

    // 3. Backend password validations
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters long" };
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update user's password in the DB
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .input("password", sql.VarChar, hashedPassword)
      .query("UPDATE Users SET password = @password WHERE email = @email");

    // 6. Delete OTP records for this email
    await pool
      .request()
      .input("email", sql.VarChar, emailLower)
      .query("DELETE FROM Otps WHERE email = @email");

    return { success: true, message: "Đặt lại mật khẩu thành công!" };
  },
};
