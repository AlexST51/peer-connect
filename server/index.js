import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import passwordResetRoutes from './routes/password-reset.js';
import messagesRoutes from './routes/messages.js';
import uploadRoutes from './routes/upload.js';
import sql from './config/database.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for local network testing
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for local network testing
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store active socket connections
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

// Socket.IO for WebRTC signaling and real-time features
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User authentication and registration
  socket.on('register-user', async (userId) => {
    try {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
      
      // Update user online status
      await sql`
        UPDATE users
        SET is_online = true, last_seen = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `;

      // Notify contacts that user is online
      const contacts = await sql`
        SELECT 
          CASE 
            WHEN user_id = ${userId} THEN contact_id
            ELSE user_id
          END as contact_id
        FROM contacts
        WHERE (user_id = ${userId} OR contact_id = ${userId})
          AND status = 'accepted'
      `;

      contacts.forEach(contact => {
        const contactSocketId = userSockets.get(contact.contact_id);
        if (contactSocketId) {
          io.to(contactSocketId).emit('user-online', { userId });
        }
      });

      console.log(`User ${userId} registered with socket ${socket.id}`);
    } catch (error) {
      console.error('Error registering user:', error);
    }
  });

  // WebRTC Signaling
  socket.on('call-user', ({ to, offer, from }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        from,
        offer
      });
    }
  });

  socket.on('call-accepted', ({ to, answer }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-accepted', { answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
    }
  });

  socket.on('call-rejected', ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected');
    }
  });

  // Text messaging
  socket.on('send-message', ({ to, message }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('new-message', message);
    }
  });

  socket.on('typing', ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      const userId = socketUsers.get(socket.id);
      io.to(targetSocketId).emit('user-typing', { userId });
    }
  });

  socket.on('stop-typing', ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      const userId = socketUsers.get(socket.id);
      io.to(targetSocketId).emit('user-stop-typing', { userId });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    const userId = socketUsers.get(socket.id);
    
    if (userId) {
      try {
        // Update user offline status
        await sql`
          UPDATE users
          SET is_online = false, last_seen = CURRENT_TIMESTAMP
          WHERE id = ${userId}
        `;

        // Notify contacts that user is offline
        const contacts = await sql`
          SELECT 
            CASE 
              WHEN user_id = ${userId} THEN contact_id
              ELSE user_id
            END as contact_id
          FROM contacts
          WHERE (user_id = ${userId} OR contact_id = ${userId})
            AND status = 'accepted'
        `;

        contacts.forEach(contact => {
          const contactSocketId = userSockets.get(contact.contact_id);
          if (contactSocketId) {
            io.to(contactSocketId).emit('user-offline', { userId });
          }
        });

        userSockets.delete(userId);
        socketUsers.delete(socket.id);
        console.log(`User ${userId} disconnected`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initializeDatabase();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
