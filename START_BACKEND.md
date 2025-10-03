# How to Start the Backend Server

## The Error You're Seeing

The error "NetworkError when attempting to fetch resource" means the frontend can't connect to the backend API server because it's not running yet.

## Solution: Start the Backend Server

### Open a NEW Terminal Window

**Important:** Keep your current terminal running (the one with `npm run dev` for the client). You need to open a SECOND terminal.

### Run These Commands:

```bash
cd server
npm run dev
```

### What You Should See:

```
Server running on port 3001
WebSocket server ready for connections
Database tables initialized successfully
```

### Then Try Again:

1. Go back to http://localhost:5173
2. Fill in the Sign Up form:
   - Username: AlexRT (or any username)
   - Email: alex@thortz.co.uk (or any email)
   - Display Name: Alex74 (optional)
   - Password: (your password)
3. Click "Sign up"

### It Should Work Now!

Once the backend is running, you'll be able to:
- ✅ Create an account
- ✅ Login
- ✅ Add contacts
- ✅ Make video calls
- ✅ Use real-time translation

## Quick Checklist:

- [ ] Terminal 1: Running `cd client && npm run dev` (Frontend) ✅ Already running
- [ ] Terminal 2: Running `cd server && npm run dev` (Backend) ⏳ Need to start this
- [ ] Database: Neon PostgreSQL configured ✅ Already configured
- [ ] OpenAI API: Key configured ✅ Already configured

## If You Get Database Errors:

Make sure your `server/.env` file has the correct `DATABASE_URL` from Neon.

The backend will automatically create the database tables on first start!
