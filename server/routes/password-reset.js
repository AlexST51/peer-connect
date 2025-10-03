import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sql from '../config/database.js';
import { sendPasswordResetEmail } from '../config/email.js';

const router = express.Router();

// Request password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const users = await sql`
      SELECT id, username, email FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to database
    await sql`
      UPDATE users 
      SET reset_token = ${resetToken}, 
          reset_token_expires = ${resetTokenExpires}
      WHERE id = ${user.id}
    `;

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.username);
      console.log(`📧 Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify reset token
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const users = await sql`
      SELECT id, username, email 
      FROM users 
      WHERE reset_token = ${token} 
      AND reset_token_expires > NOW()
    `;

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ 
      valid: true, 
      username: users[0].username 
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user with valid token
    const users = await sql`
      SELECT id, username, email 
      FROM users 
      WHERE reset_token = ${token} 
      AND reset_token_expires > NOW()
    `;

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = users[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash},
          reset_token = NULL,
          reset_token_expires = NULL
      WHERE id = ${user.id}
    `;

    console.log(`✅ Password reset successful for user: ${user.username}`);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
