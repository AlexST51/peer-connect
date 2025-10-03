import express from 'express';
import sql from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Search users by username
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await sql`
      SELECT id, username, display_name, is_online
      FROM users
      WHERE username ILIKE ${'%' + query + '%'}
        AND id != ${req.user.userId}
      LIMIT 20
    `;

    res.json(users.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      isOnline: user.is_online
    })));
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Send contact request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    if (contactId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a contact' });
    }

    // Check if contact exists
    const contactUser = await sql`
      SELECT id FROM users WHERE id = ${contactId}
    `;

    if (contactUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if request already exists
    const existing = await sql`
      SELECT id, status FROM contacts
      WHERE (user_id = ${req.user.userId} AND contact_id = ${contactId})
         OR (user_id = ${contactId} AND contact_id = ${req.user.userId})
    `;

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Contact request already exists',
        status: existing[0].status
      });
    }

    // Create contact request
    const result = await sql`
      INSERT INTO contacts (user_id, contact_id, status)
      VALUES (${req.user.userId}, ${contactId}, 'pending')
      RETURNING id, status, requested_at
    `;

    res.status(201).json({
      id: result[0].id,
      contactId,
      status: result[0].status,
      requestedAt: result[0].requested_at
    });
  } catch (error) {
    console.error('Send contact request error:', error);
    res.status(500).json({ error: 'Failed to send contact request' });
  }
});

// Get pending contact requests (received)
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const requests = await sql`
      SELECT c.id, c.user_id, c.requested_at, u.username, u.display_name, u.is_online
      FROM contacts c
      JOIN users u ON c.user_id = u.id
      WHERE c.contact_id = ${req.user.userId} AND c.status = 'pending'
      ORDER BY c.requested_at DESC
    `;

    res.json(requests.map(req => ({
      id: req.id,
      userId: req.user_id,
      username: req.username,
      displayName: req.display_name,
      isOnline: req.is_online,
      requestedAt: req.requested_at
    })));
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

// Get outgoing contact requests (sent by you)
router.get('/requests/sent', authenticateToken, async (req, res) => {
  try {
    const requests = await sql`
      SELECT c.id, c.contact_id, c.requested_at, u.username, u.display_name, u.is_online
      FROM contacts c
      JOIN users u ON c.contact_id = u.id
      WHERE c.user_id = ${req.user.userId} AND c.status = 'pending'
      ORDER BY c.requested_at DESC
    `;

    res.json(requests.map(req => ({
      id: req.id,
      userId: req.contact_id,
      username: req.username,
      displayName: req.display_name,
      isOnline: req.is_online,
      requestedAt: req.requested_at,
      type: 'sent'
    })));
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
});

// Cancel outgoing contact request
router.delete('/request/:requestId/cancel', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify the request was sent by the current user
    const request = await sql`
      SELECT id FROM contacts
      WHERE id = ${requestId} AND user_id = ${req.user.userId} AND status = 'pending'
    `;

    if (request.length === 0) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    // Delete the request
    await sql`
      DELETE FROM contacts WHERE id = ${requestId}
    `;

    res.json({ message: 'Contact request cancelled' });
  } catch (error) {
    console.error('Cancel contact request error:', error);
    res.status(500).json({ error: 'Failed to cancel contact request' });
  }
});

// Accept contact request
router.post('/request/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify the request is for the current user
    const request = await sql`
      SELECT id, user_id, contact_id, status
      FROM contacts
      WHERE id = ${requestId} AND contact_id = ${req.user.userId}
    `;

    if (request.length === 0) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    if (request[0].status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Accept the request
    await sql`
      UPDATE contacts
      SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `;

    res.json({ message: 'Contact request accepted' });
  } catch (error) {
    console.error('Accept contact request error:', error);
    res.status(500).json({ error: 'Failed to accept contact request' });
  }
});

// Reject contact request
router.post('/request/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Verify the request is for the current user
    const request = await sql`
      SELECT id FROM contacts
      WHERE id = ${requestId} AND contact_id = ${req.user.userId}
    `;

    if (request.length === 0) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    // Delete the request
    await sql`
      DELETE FROM contacts WHERE id = ${requestId}
    `;

    res.json({ message: 'Contact request rejected' });
  } catch (error) {
    console.error('Reject contact request error:', error);
    res.status(500).json({ error: 'Failed to reject contact request' });
  }
});

// Get all accepted contacts
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const contacts = await sql`
      SELECT 
        c.id,
        CASE 
          WHEN c.user_id = ${req.user.userId} THEN c.contact_id
          ELSE c.user_id
        END as contact_user_id,
        u.username,
        u.display_name,
        u.is_online,
        u.last_seen,
        c.accepted_at
      FROM contacts c
      JOIN users u ON (
        CASE 
          WHEN c.user_id = ${req.user.userId} THEN c.contact_id
          ELSE c.user_id
        END = u.id
      )
      WHERE (c.user_id = ${req.user.userId} OR c.contact_id = ${req.user.userId})
        AND c.status = 'accepted'
      ORDER BY u.is_online DESC, u.last_seen DESC
    `;

    res.json(contacts.map(contact => ({
      id: contact.id,
      userId: contact.contact_user_id,
      username: contact.username,
      displayName: contact.display_name,
      isOnline: contact.is_online,
      lastSeen: contact.last_seen,
      acceptedAt: contact.accepted_at
    })));
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// Remove contact
router.delete('/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;

    await sql`
      DELETE FROM contacts
      WHERE (user_id = ${req.user.userId} AND contact_id = ${contactId})
         OR (user_id = ${contactId} AND contact_id = ${req.user.userId})
    `;

    res.json({ message: 'Contact removed successfully' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ error: 'Failed to remove contact' });
  }
});

export default router;
