const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter using Gmail SMTP.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.
 */
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass || pass === 'your_16_character_app_password' || pass.includes('your_') || pass.includes('placeholder')) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, '') // remove spaces from app password if present
    }
  });
}

/**
 * Sends a real-time OTP email to a user's Gmail address.
 * Gracefully falls back to console logging in development mode if credentials are not yet configured.
 *
 * @param {string} toEmail - Recipient email
 * @param {string} otp - 6-digit verification code
 * @param {string} type - 'signup' | 'login' | 'reset'
 * @returns {Promise<{ sent: boolean, simulated: boolean, messageId?: string }>}
 */
async function sendOtpEmail(toEmail, otp, type = 'signup') {
  const transporter = getTransporter();

  const titleMap = {
    signup: 'Verify Your Gmail Address - Rentora',
    login: 'One-Time Login Code - Rentora',
    reset: 'Password Reset Code - Rentora',
    kyc: 'Aadhaar KYC Verification OTP - Rentora'
  };

  const headingMap = {
    signup: 'Welcome to Rentora!',
    login: 'Your Secure Login Code',
    reset: 'Reset Your Rentora Password',
    kyc: 'Your Aadhaar KYC OTP'
  };

  const subject = titleMap[type] || 'Your Verification Code - Rentora';
  const heading = headingMap[type] || 'Verification Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
        .container { max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #e23744 0%, #b91c1c 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .logo span { color: #fecaca; }
        .content { padding: 36px 32px; }
        .otp-badge { background: #fef2f2; border: 2px dashed #f87171; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #dc2626; font-family: 'Courier New', Courier, monospace; }
        .expiry { color: #64748b; font-size: 13px; margin-top: 8px; font-weight: 500; }
        .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">Rent<span>ora</span></h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Next-Gen Appliance & Furniture Leases</p>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">${heading}</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            ${type === 'kyc'
              ? 'Use this 6-digit code to complete your <strong>Aadhaar KYC verification</strong> on Rentora. This confirms your identity as a verified tenant.'
              : 'Use the 6-digit verification code below to complete your real-time Gmail verification for your Rentora account:'
            }
          </p>
          <div class="otp-badge">
            <div class="otp-code">${otp}</div>
            <div class="expiry">⏱ Valid for 10 minutes. Do not share this code with anyone.</div>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not request this verification, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Rentora Inc. Secure Real-Time Verification Gateway.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n============================================================');
    console.log('📧 [RENTORA MAILER - LOCAL / DEV MODE]');
    console.log(`To: ${toEmail}`);
    console.log(`Action: ${type.toUpperCase()}`);
    console.log(`Real-Time OTP: 👉 [ ${otp} ] 👈`);
    console.log('Notice: Set GMAIL_USER & GMAIL_APP_PASSWORD in server/.env to send live emails');
    console.log('============================================================\n');

    return {
      sent: true,
      simulated: true,
      info: 'Credentials not configured; simulated in server console.'
    };
  }

  const textContent = `${heading}\n\nYour 6-digit Rentora verification code is: ${otp}\nThis code is valid for 10 minutes. Do not share it with anyone.\n\nIf you did not request this code, you can ignore this email.`;

  try {
    const info = await transporter.sendMail({
      from: `"Rentora" <${process.env.GMAIL_USER}>`,
      replyTo: process.env.GMAIL_USER,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[Rentora Mailer] Real-time OTP sent successfully to ${toEmail}. MessageId: ${info.messageId}`);
    return {
      sent: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (error) {
    console.error(`[Rentora Mailer Error] Failed sending live email to ${toEmail}:`, error.message);
    // Fallback: log to console so development isn't blocked by network/auth issues
    console.log(`[Rentora Mailer Fallback Code]: 👉 [ ${otp} ] 👈 for ${toEmail}`);
    return {
      sent: false,
      simulated: true,
      error: error.message
    };
  }
}

module.exports = {
  sendOtpEmail,
  getTransporter
};
