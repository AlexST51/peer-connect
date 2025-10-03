# 🚀 Free Deployment Guide for Peer-Connect

## Overview

This guide will help you deploy your app completely **FREE** using:
- **Frontend**: Netlify (Free tier)
- **Backend**: Render.com (Free tier)
- **Database**: Neon (Already configured - Free tier)

---

## 📋 Prerequisites

Before starting, make sure you have:
- [ ] GitHub account
- [ ] Netlify account (sign up at netlify.com)
- [ ] Render account (sign up at render.com)
- [ ] Your code pushed to GitHub

---

## Part 1: Push Code to GitHub

### Step 1: Create GitHub Repository

1. Go to github.com and create a new repository
2. Name it: `peer-connect` or any name you prefer
3. Make it **Public** (required for free Render deployment)
4. Don't initialize with README (we already have one)

### Step 2: Push Your Code

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Peer-Connect app"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/AlexST51/peer-connect.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy Backend to Render.com (FREE)

### Step 1: Sign Up for Render

1. Go to https://render.com
2. Sign up with GitHub (easiest option)
3. Authorize Render to access your repositories

### Step 2: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your `peer-connect` repository

### Step 3: Configure Web Service

Fill in these settings:

**Basic Settings:**
- **Name**: `peer-connect-backend` (or any name)
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **"Free"** (0$/month)

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=your_neon_database_url_here
JWT_SECRET=your_super_secret_jwt_key_here_change_this
CLIENT_URL=https://your-app-name.netlify.app
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
```

**Important Notes:**
- `DATABASE_URL`: Copy from your Neon dashboard
- `JWT_SECRET`: Generate a random string (at least 32 characters)
- `CLIENT_URL`: We'll update this after deploying frontend
- `EMAIL_USER` & `EMAIL_PASS`: Your Gmail credentials (optional for password reset)

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Your backend URL will be: `https://peer-connect-backend.onrender.com`
4. **Copy this URL** - you'll need it for frontend!

**⚠️ Important:** Free Render services spin down after 15 minutes of inactivity. First request after inactivity takes ~30 seconds to wake up.

---

## Part 3: Deploy Frontend to Netlify (FREE)

### Step 1: Update Frontend Environment Variables

Before deploying, update `client/.env`:

```env
# Replace with your Render backend URL
VITE_API_URL=https://peer-connect-backend.onrender.com/api
VITE_SOCKET_URL=https://peer-connect-backend.onrender.com

# Your OpenAI API Key
VITE_OPENAI_API_KEY=your_openai_key_here
```

**Commit and push this change:**
```bash
git add client/.env
git commit -m "Update API URLs for production"
git push
```

### Step 2: Sign Up for Netlify

1. Go to https://netlify.com
2. Sign up with GitHub
3. Authorize Netlify

### Step 3: Deploy Site

**Option A: Netlify UI (Recommended)**

1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Select your `peer-connect` repository
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist` (relative to base directory)
5. Click **"Deploy site"**

**IMPORTANT**: If build fails with "cd: client: No such file or directory":
- Go to **Site settings** → **Build & deploy** → **Build settings**
- Make sure settings match above exactly
- The publish directory should be just `dist`, NOT `client/dist`

**Option B: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy from client directory
cd client
netlify deploy --prod
```

### Step 4: Configure Environment Variables on Netlify

1. Go to **Site settings** → **Environment variables**
2. Add these variables:

```
VITE_API_URL=https://peer-connect-backend.onrender.com/api
VITE_SOCKET_URL=https://peer-connect-backend.onrender.com
VITE_OPENAI_API_KEY=your_openai_key_here
```

3. Click **"Save"**
4. Go to **Deploys** → **"Trigger deploy"** → **"Deploy site"**

### Step 5: Get Your Netlify URL

Your app will be live at: `https://your-app-name.netlify.app`

**Optional:** Set up custom domain in Netlify settings (free with Netlify)

---

## Part 4: Update Backend with Frontend URL

### Step 1: Update Render Environment Variables

1. Go back to Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Update `CLIENT_URL` to your Netlify URL:
   ```
   CLIENT_URL=https://your-app-name.netlify.app
   ```
5. Click **"Save Changes"**
6. Service will automatically redeploy

---

## Part 5: Test Your Deployment

### Checklist:

1. **Frontend loads**: Visit your Netlify URL
2. **Can register**: Create a new account
3. **Can login**: Login with your account
4. **Can add contacts**: Search and add contacts
5. **Can chat**: Send text messages
6. **Can share images**: Upload and send images
7. **Translation works**: Messages translate correctly
8. **Video calls work**: Try video call (requires HTTPS ✅)

---

## 💰 Cost Breakdown (All FREE!)

| Service | Free Tier Limits | Cost |
|---------|-----------------|------|
| **Netlify** | 100GB bandwidth/month, 300 build minutes | $0 |
| **Render** | 750 hours/month, sleeps after 15min inactivity | $0 |
| **Neon** | 3GB storage, 1 project | $0 |
| **Total** | | **$0/month** |

---

## 🔧 Troubleshooting

### Backend Issues:

**Problem**: Backend not responding
- **Solution**: First request after inactivity takes ~30 seconds (Render free tier)

**Problem**: Database connection error
- **Solution**: Check `DATABASE_URL` in Render environment variables

**Problem**: CORS errors
- **Solution**: Verify `CLIENT_URL` matches your Netlify URL exactly

### Frontend Issues:

**Problem**: Can't connect to backend
- **Solution**: Check `VITE_API_URL` and `VITE_SOCKET_URL` in Netlify environment variables

**Problem**: Build fails
- **Solution**: Check build logs in Netlify, ensure all dependencies are in `package.json`

**Problem**: Video calls don't work
- **Solution**: They should work now! HTTPS is provided by both Netlify and Render

---

## 📝 Important Notes

### Render Free Tier Limitations:
- Services spin down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month (enough for one service running 24/7)

### Keeping Backend Awake (Optional):
You can use a free service like UptimeRobot to ping your backend every 14 minutes to keep it awake:
1. Sign up at uptimerobot.com (free)
2. Add monitor for: `https://peer-connect-backend.onrender.com/api/health`
3. Set interval to 14 minutes

---

## 🎉 You're Done!

Your app is now deployed and accessible worldwide with HTTPS!

**Share your app:**
- Frontend: `https://your-app-name.netlify.app`
- Users can register, chat, and make video calls!

**Next Steps:**
- Share the link with friends to test
- Consider custom domain (free with Netlify)
- Monitor usage in Netlify and Render dashboards

---

## 🆘 Need Help?

If you encounter issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Netlify logs: Dashboard → Your Site → Deploys → Deploy log
3. Check browser console for frontend errors (F12)

Good luck with your deployment! 🚀
