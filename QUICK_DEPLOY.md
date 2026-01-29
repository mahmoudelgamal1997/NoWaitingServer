# Quick Deployment Guide

## Fastest Way to Deploy (Railway - Recommended)

### Step 1: Prepare Your Code
```bash
# Make sure you're in the project directory
cd patient-history-api

# Ensure all files are committed to Git
git add .
git commit -m "Ready for deployment"
```

### Step 2: Deploy to Railway

1. **Go to [railway.app](https://railway.app)** and sign up/login

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect Node.js

3. **Add Environment Variables**:
   - Go to your project → Variables
   - Add:
     - `MONGO_URI`: Your MongoDB connection string
     - `NODE_ENV`: `production`
   - PORT is automatically set by Railway

4. **Deploy**:
   - Railway will automatically deploy
   - Get your API URL from the dashboard

### Step 3: Get MongoDB Connection String

**Option A: MongoDB Atlas (Free Cloud Database)**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free
3. Create a cluster (free tier)
4. Create database user
5. Whitelist IP: `0.0.0.0/0` (allow all)
6. Click "Connect" → "Connect your application"
7. Copy connection string
8. Replace `<password>` with your password

**Option B: Use Existing MongoDB**
- Use your existing MongoDB connection string

### Step 4: Test Your API

Your API will be available at: `https://your-app-name.up.railway.app`

Test it:
```bash
curl https://your-app-name.up.railway.app/api/history/summary
```

---

## Alternative: Render (Also Free)

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New +" → "Web Service"
4. Connect GitHub repository
5. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `NODE_ENV`: `production`
7. Click "Create Web Service"

---

## Alternative: Heroku

```bash
# Install Heroku CLI first
heroku login
heroku create your-app-name
heroku config:set MONGO_URI=your_mongodb_connection_string
heroku config:set NODE_ENV=production
git push heroku main
```

---

## Update CORS for Your Domain

After deployment, update `server.js` to include your production domain:

```javascript
app.use(cors({
  origin: [
    'https://your-production-domain.com',
    'https://your-app-name.up.railway.app', // Your Railway URL
    // Add your mobile app domains here
  ],
  // ... rest
}));
```

Then redeploy.

---

## That's It! 🎉

Your API is now live. Use the deployment URL in your mobile app.

For detailed instructions, see `DEPLOYMENT.md`


