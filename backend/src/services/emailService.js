import nodemailer from "nodemailer";

/**
 * Service to handle email sending using Nodemailer.
 * Automatically falls back to console logging in development if email credentials are not set up.
 */
export const emailService = {
  /**
   * Send a beautiful HTML email containing the 6-digit verification code.
   * @param {string} email - Destination email
   * @param {string} otp - 6-digit OTP code
   */
  sendOTP: async (email, otp) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    // Check if email credentials are configured in .env
    if (!user || !pass) {
      console.log("\n========================================================");
      console.log("       📧 [MOCK EMAIL SERVICE] - EMAIL NOT CONFIGURATION 📧");
      console.log(`To send actual emails, add EMAIL_USER & EMAIL_PASS to backend/.env`);
      console.log(`👉 EMAIL: ${email}`);
      console.log(`👉 MÃ OTP (6 CHỮ SỐ): ${otp}`);
      console.log("========================================================\n");
      return { success: true, mock: true };
    }

    // Configure the SMTP transporter (defaults to Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã Xác Thực Volitify</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #004ac6 0%, #002e82 100%);
            padding: 30px 40px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -1px;
            text-decoration: none;
          }
          .content {
            padding: 40px;
            color: #1e293b;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
          }
          .text {
            font-size: 16px;
            line-height: 26px;
            color: #475569;
            margin-bottom: 30px;
          }
          .otp-container {
            text-align: center;
            margin: 35px 0;
            padding: 20px;
            background-color: #f1f5f9;
            border-radius: 12px;
            border: 1px dashed #cbd5e1;
          }
          .otp-code {
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 6px;
            color: #004ac6;
            font-family: 'Courier New', Courier, monospace;
          }
          .expire-text {
            font-size: 14px;
            color: #ef4444;
            font-weight: 600;
            margin-top: 10px;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px 40px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            font-size: 12px;
            color: #94a3b8;
          }
          .footer a {
            color: #004ac6;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">Volitify</span>
          </div>
          <div class="content">
            <div class="title">Yêu cầu khôi phục mật khẩu</div>
            <div class="text">
              Chào bạn,<br/><br/>
              Chúng tôi nhận được yêu cầu lấy lại mật khẩu cho tài khoản Volitify của bạn. Dưới đây là mã xác thực OTP của bạn. Mã này có thời hạn sử dụng trong <strong>5 phút</strong>.
            </div>
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
              <div class="expire-text">⚠️ Không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản của bạn.</div>
            </div>
            <div class="text" style="margin-bottom: 0;">
              Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ khách hàng để được trợ giúp bảo mật tài khoản.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Volitify Systems. All rights reserved.</p>
            <p>Hệ thống bán lẻ điện tử tiêu dùng thông minh hàng đầu.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"Volitify Security" <${user}>`,
        to: email,
        subject: "[Volitify] Yêu cầu khôi phục mật khẩu",
        html: htmlContent,
      });
      console.log(`[📧 EMAIL] Actual OTP email sent successfully to ${email}`);
      return { success: true, mock: false };
    } catch (error) {
      console.error(`[🚨 Nodemailer Error] Failed to send email via SMTP to ${email}:`, error);
      return { success: false, mock: false, error: error.message };
    }
  },
};
