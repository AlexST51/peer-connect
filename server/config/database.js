import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_online BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        preferred_language VARCHAR(10) DEFAULT 'en'
      )
    `;

    // Contacts table (for contact requests and accepted contacts)
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        contact_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        UNIQUE(user_id, contact_id),
        CHECK (user_id != contact_id)
      )
    `;

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status)
    `;

    // Messages table for text chat
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        original_text TEXT NOT NULL,
        original_language VARCHAR(10),
        translated_text TEXT,
        target_language VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)
    `;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export default sql;
