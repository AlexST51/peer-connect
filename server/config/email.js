import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter
// For development, we'll use a test account from Ethereal
// For production, use a real email service like Gmail, SendGrid, AWS SES, etc.

let transporter;

async function createTransporter() {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    // Gmail configuration (for production)
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });
  } else {
    // For development: Create a test account with Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('📧 Email test account created:');
    console.log('   User:', testAccount.user);
    console.log('   Pass:', testAccount.pass);
    console.log('   Preview emails at: https://ethereal.email');
  }
  
  return transporter;
}

export async function sendPasswordResetEmail(email, resetToken, username) {
  if (!transporter) {
    transporter = await createTransporter();
  }
  
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Peer-Connect" <noreply@peer-connect.com>',
    to: email,
    subject: 'Password Reset Request - Peer-Connect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #0891b2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>We received a request to reset your password for your Peer-Connect account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p>Best regards,<br>The Peer-Connect Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${username},
      
      We received a request to reset your password for your Peer-Connect account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, you can safely ignore this email.
      
      Best regards,
      The Peer-Connect Team
    `,
  };
  
  const info = await transporter.sendMail(mailOptions);
  
  console.log('📧 Password reset email sent:', info.messageId);
  
  // For development with Ethereal, log the preview URL
  if (process.env.EMAIL_SERVICE !== 'gmail') {
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  }
  
  return info;
}

export default { sendPasswordResetEmail };
