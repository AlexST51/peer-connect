import express from 'express';
import bcrypt from 'bcryptjs';
import sql from '../config/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username} OR email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await sql`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES (${username}, ${email}, ${passwordHash}, ${displayName || username})
      RETURNING id, username, email, display_name
    `;

    const user = result[0];
    const token = generateToken(user.id, user.username);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const users = await sql`
      SELECT id, username, email, password_hash, display_name
      FROM users
      WHERE username = ${username} OR email = ${username}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen and online status
    await sql`
      UPDATE users
      SET last_seen = CURRENT_TIMESTAMP, is_online = true
      WHERE id = ${user.id}
    `;

    const token = generateToken(user.id, user.username);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await sql`
      SELECT id, username, email, display_name, is_online, preferred_language
      FROM users
      WHERE id = ${req.user.userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      isOnline: user.is_online,
      preferredLanguage: user.preferred_language || 'en'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update language preference
router.patch('/language', authenticateToken, async (req, res) => {
  try {
    const { language } = req.body;

    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    await sql`
      UPDATE users
      SET preferred_language = ${language}
      WHERE id = ${req.user.userId}
    `;

    res.json({ message: 'Language preference updated', language });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await sql`
      UPDATE users
      SET is_online = false, last_seen = CURRENT_TIMESTAMP
      WHERE id = ${req.user.userId}
    `;

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
