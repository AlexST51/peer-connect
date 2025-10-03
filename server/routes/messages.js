import express from 'express';
import sql from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Detect language and translate text
async function translateMessage(text, targetLanguage) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a translation assistant. Detect the language of the input text and translate it to ${targetLanguage}. Return a JSON object with: {"detectedLanguage": "language_code", "translation": "translated_text"}. Use ISO 639-1 language codes (e.g., en, es, fr, de, zh, ja, ar, hi, pt, ru).`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Translation error:', error);
    return {
      detectedLanguage: 'unknown',
      translation: text // Return original if translation fails
    };
  }
}

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipientId, text, imageUrl, messageType = 'text' } = req.body;

    if (!recipientId || (!text && !imageUrl)) {
      return res.status(400).json({ error: 'Recipient ID and text or image are required' });
    }

    // Get recipient's preferred language
    const recipient = await sql`
      SELECT preferred_language FROM users WHERE id = ${recipientId}
    `;

    if (recipient.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const targetLanguage = recipient[0].preferred_language || 'en';

    let detectedLanguage = null;
    let translation = null;

    // Only translate text messages
    if (messageType === 'text' && text) {
      const translationResult = await translateMessage(text, targetLanguage);
      detectedLanguage = translationResult.detectedLanguage;
      translation = translationResult.translation;
    }

    // Save message to database
    const message = await sql`
      INSERT INTO messages (
        sender_id, 
        recipient_id, 
        original_text, 
        original_language,
        translated_text,
        target_language,
        image_url,
        message_type
      )
      VALUES (
        ${req.user.userId},
        ${recipientId},
        ${text || ''},
        ${detectedLanguage},
        ${translation || text || ''},
        ${targetLanguage},
        ${imageUrl || null},
        ${messageType}
      )
      RETURNING id, sender_id, recipient_id, original_text, original_language, 
                translated_text, target_language, image_url, message_type, created_at
    `;

    res.status(201).json(message[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get conversation with a contact
router.get('/conversation/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await sql`
      SELECT 
        m.id,
        m.sender_id,
        m.recipient_id,
        m.original_text,
        m.original_language,
        m.translated_text,
        m.target_language,
        m.image_url,
        m.message_type,
        m.created_at,
        m.read_at,
        u.username as sender_username,
        u.display_name as sender_display_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ${req.user.userId} AND m.recipient_id = ${contactId})
         OR (m.sender_id = ${contactId} AND m.recipient_id = ${req.user.userId})
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `;

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Mark messages as read
router.post('/mark-read/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;

    await sql`
      UPDATE messages
      SET read_at = CURRENT_TIMESTAMP
      WHERE sender_id = ${contactId}
        AND recipient_id = ${req.user.userId}
        AND read_at IS NULL
    `;

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT sender_id, COUNT(*) as count
      FROM messages
      WHERE recipient_id = ${req.user.userId}
        AND read_at IS NULL
      GROUP BY sender_id
    `;

    const unreadCounts = {};
    result.forEach(row => {
      unreadCounts[row.sender_id] = parseInt(row.count);
    });

    res.json(unreadCounts);
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
