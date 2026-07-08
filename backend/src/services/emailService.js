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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f19;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #0b0f19;
            padding: 40px 20px;
            box-sizing: border-box;
          }
          .container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #111827;
            border-radius: 24px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          }
          .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 35px 40px;
            text-align: center;
          }
          .logo {
            font-size: 30px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -1.5px;
            text-decoration: none;
            font-family: 'Outfit', sans-serif;
          }
          .content {
            padding: 40px;
            color: #d1d5db;
          }
          .title {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 20px;
            letter-spacing: -0.5px;
          }
          .text {
            font-size: 15px;
            line-height: 26px;
            color: #9ca3af;
            margin-bottom: 30px;
          }
          .otp-card {
            text-align: center;
            margin: 35px 0;
            padding: 30px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .otp-label {
            font-size: 12px;
            font-weight: 700;
            color: #3b82f6;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .otp-code {
            font-size: 42px;
            font-weight: 900;
            letter-spacing: 8px;
            color: #ffffff;
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
          }
          .expire-text {
            font-size: 13px;
            color: #f87171;
            font-weight: 600;
            margin-top: 15px;
            background: rgba(248, 113, 113, 0.1);
            display: inline-block;
            padding: 6px 14px;
            border-radius: 30px;
          }
          .footer {
            background-color: #0f172a;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 12px;
            color: #6b7280;
            line-height: 20px;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <span class="logo">Volitify</span>
            </div>
            <div class="content">
              <div class="title">Yêu cầu khôi phục mật khẩu</div>
              <div class="text">
                Chào bạn,<br/><br/>
                Chúng tôi nhận được yêu cầu cấp lại mật khẩu cho tài khoản Volitify của bạn. Sử dụng mã OTP dưới đây để hoàn tất việc thiết lập lại. Mã xác thực này có hiệu lực trong vòng <strong>5 phút</strong>.
              </div>
              <div class="otp-card">
                <div class="otp-label">MÃ XÁC THỰC CỦA BẠN</div>
                <div class="otp-code">${otp}</div>
                <div class="expire-text">⚠️ Tuyệt đối không chia sẻ mã này với bất kỳ ai</div>
              </div>
              <div class="text" style="margin-bottom: 0;">
                Nếu bạn không thực hiện yêu cầu này, bạn có thể yên tâm bỏ qua email này. Mật khẩu của bạn vẫn được giữ an toàn.
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Volitify Systems. All rights reserved.</p>
              <p>Hệ thống bán lẻ điện tử & giải pháp nhà thông minh cao cấp.</p>
            </div>
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
