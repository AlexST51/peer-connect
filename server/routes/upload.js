import express from 'express';
import multer from 'multer';
import sql from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

// Upload profile picture
router.post('/profile-picture', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert image to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Update user's profile picture
    await sql`
      UPDATE users
      SET profile_picture = ${base64Image}
      WHERE id = ${req.user.userId}
    `;

    res.json({ 
      message: 'Profile picture uploaded successfully',
      imageUrl: base64Image
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Upload chat image
router.post('/chat-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert image to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    res.json({ 
      message: 'Image uploaded successfully',
      imageUrl: base64Image
    });
  } catch (error) {
    console.error('Upload chat image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
