# Peer-Connect: Multilingual Video Chat Application

A full-stack, real-time video chat application with AI-powered multilingual translation and closed captions.

## Features

- 🎥 **WebRTC Video Chat**: High-quality peer-to-peer video calls
- 🌍 **Real-time Translation**: AI-powered speech-to-text translation with OpenAI Realtime API
- 📝 **Live Subtitles**: Synchronized closed captions displayed over video feed
- 👥 **Contact Management**: Add contacts via username search or QR code
- 🔐 **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- 🟢 **Online Status**: Real-time online/offline indicators
- 📱 **Responsive Design**: Modern UI built with React and Tailwind CSS

## Technology Stack

### Frontend
- **React** with Vite for fast development
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time communication
- **WebRTC** for peer-to-peer video/audio
- **OpenAI Realtime API** for translation

### Backend
- **Node.js** with Express
- **Socket.IO** for WebRTC signaling
- **PostgreSQL** (Neon) for database
- **JWT** for authentication
- **Bcrypt** for password hashing

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- OpenAI API key

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd peer-connect
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 3. Configure Environment Variables

#### Server Configuration

Create `server/.env` file:

```env
# Database (Get from Neon: https://neon.tech)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3001
NODE_ENV=development

# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

# CORS
CLIENT_URL=http://localhost:5173
```

#### Client Configuration

Create `client/.env` file:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001

# OpenAI Configuration
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

### 4. Set up Database

The database tables will be automatically created when you start the server for the first time. The schema includes:

- **users**: User accounts with authentication
- **contacts**: Contact relationships and requests

## Running the Application

### Development Mode

Run both client and server concurrently:

```bash
# From root directory
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Deployment

### Netlify (Frontend)

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure build settings:
   - Build command: `cd client && npm run build`
   - Publish directory: `client/dist`
4. Add environment variables in Netlify dashboard:
   - `VITE_API_URL`: Your backend API URL
   - `VITE_SOCKET_URL`: Your backend WebSocket URL
   - `VITE_OPENAI_API_KEY`: Your OpenAI API key

### Backend Deployment

Deploy the server to any Node.js hosting platform:

**Options:**
- **Railway**: Easy deployment with PostgreSQL
- **Render**: Free tier available
- **Heroku**: Classic PaaS option
- **DigitalOcean App Platform**: Scalable option

**Steps:**
1. Set up your hosting platform
2. Configure environment variables
3. Deploy the `server` directory
4. Update `CLIENT_URL` to your Netlify domain

### Database (Neon)

1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to your server environment variables

## Usage

### Creating an Account

1. Open the application
2. Click "Sign Up"
3. Enter username, email, and password
4. Click "Sign Up" to create your account

### Adding Contacts

**Method 1: Search by Username**
1. Go to "Add Contact" tab
2. Search for a user by username
3. Click "Add Contact"
4. Wait for them to accept your request

**Method 2: QR Code**
1. Click "My QR Code" button
2. Share your QR code with others
3. They can scan it to add you

### Making a Video Call

1. Go to "Contacts" tab
2. Find an online contact (green indicator)
3. Click "Call" button
4. Wait for them to accept

### During a Call

- **Toggle Video**: Turn camera on/off
- **Toggle Audio**: Mute/unmute microphone
- **Select Language**: Choose translation target language
- **View Subtitles**: Real-time translations appear at bottom of screen
- **End Call**: Click red phone button

## Translation Features

The application uses OpenAI's Realtime API for:
- **Speech-to-Text**: Transcribes your speech in real-time
- **Language Detection**: Automatically detects spoken language
- **Translation**: Translates to selected target language
- **Low Latency**: < 3 seconds end-to-end delay

### Supported Languages

- English, Spanish, French, German, Italian
- Portuguese, Russian, Japanese, Korean
- Chinese, Arabic, Hindi, and more

## Architecture

### WebRTC Flow

1. User A initiates call to User B
2. Socket.IO server exchanges SDP offers/answers
3. ICE candidates are exchanged for NAT traversal
4. Peer-to-peer connection established
5. Audio/video streams transmitted directly

### Translation Flow

1. Local audio stream captured from microphone
2. Audio processed and sent to OpenAI Realtime API
3. API returns transcription and translation
4. Subtitles rendered over video feed
5. Process repeats in real-time

## Security Considerations

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for stateless authentication
- HTTPS required for WebRTC in production
- Environment variables for sensitive data
- CORS configured for specific origins
- SQL injection prevention with parameterized queries

## Troubleshooting

### Video/Audio Not Working

- Check browser permissions for camera/microphone
- Ensure HTTPS in production (required for WebRTC)
- Verify STUN/TURN server configuration

### Translation Not Working

- Verify OpenAI API key is valid
- Check API key has Realtime API access
- Ensure sufficient API credits
- Check browser console for errors

### Connection Issues

- Verify backend server is running
- Check CORS configuration
- Ensure Socket.IO connection established
- Verify database connection

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Contacts
- `GET /api/contacts/search?query=` - Search users
- `POST /api/contacts/request` - Send contact request
- `GET /api/contacts/requests/pending` - Get pending requests
- `POST /api/contacts/request/:id/accept` - Accept request
- `POST /api/contacts/request/:id/reject` - Reject request
- `GET /api/contacts/list` - Get all contacts
- `DELETE /api/contacts/:id` - Remove contact

### WebSocket Events

**Client → Server:**
- `register-user` - Register socket with user ID
- `call-user` - Initiate call
- `call-accepted` - Accept incoming call
- `ice-candidate` - Send ICE candidate
- `end-call` - End active call
- `call-rejected` - Reject incoming call

**Server → Client:**
- `incoming-call` - Receive call notification
- `call-accepted` - Call was accepted
- `ice-candidate` - Receive ICE candidate
- `call-ended` - Call ended by peer
- `call-rejected` - Call was rejected
- `user-online` - Contact came online
- `user-offline` - Contact went offline

## Performance Optimization

- Minimal token usage with OpenAI (max 150 tokens)
- Streaming responses for low latency
- Temperature 0.1 for consistent translations
- Audio processing at 24kHz sample rate
- Efficient subtitle rendering (last 3 only)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

## Acknowledgments

- OpenAI for Realtime API
- Neon for serverless PostgreSQL
- WebRTC community for excellent documentation
- React and Vite teams for amazing tools

---

Built with ❤️ for seamless multilingual communication
