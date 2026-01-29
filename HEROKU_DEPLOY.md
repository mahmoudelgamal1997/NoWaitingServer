# Heroku Deployment Guide - Step by Step

## Prerequisites Checklist

- ✅ Heroku CLI installed
- ✅ Git repository initialized
- ✅ Code committed

## Step-by-Step Deployment

### Step 1: Login to Heroku

Run this command and follow the prompts (will open browser):
```bash
heroku login
```

Or login via browser:
```bash
heroku login -i
```

### Step 2: Create Heroku App

```bash
cd d:\backendNoWaiting\patient-history-api
heroku create your-app-name
```

**Note:** Replace `your-app-name` with your desired app name (must be unique). If you don't specify, Heroku will generate one.

Example:
```bash
heroku create patient-history-api-2024
```

### Step 3: Set Up MongoDB

**Option A: MongoDB Atlas (Recommended - Free)**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up/login
3. Create a new cluster (Free tier M0)
4. Wait for cluster to be created (2-3 minutes)
5. Click "Connect" → "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your database password
8. Replace `<dbname>` with `patient-history` or your preferred database name

Example connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/patient-history?retryWrites=true&w=majority
```

**Option B: Heroku MongoDB Add-on (Paid)**

```bash
heroku addons:create mongolab:sandbox
```

This will automatically set `MONGODB_URI` environment variable.

### Step 4: Set Environment Variables

If using MongoDB Atlas, set the connection string:

```bash
heroku config:set MONGO_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/patient-history?retryWrites=true&w=majority"
heroku config:set NODE_ENV=production
```

**Important:** 
- Use quotes around the connection string
- Replace the connection string with your actual MongoDB Atlas connection string

### Step 5: Verify Environment Variables

```bash
heroku config
```

You should see:
- `MONGO_URI`: Your MongoDB connection string
- `NODE_ENV`: production
- `PORT`: Automatically set by Heroku

### Step 6: Deploy to Heroku

**Option A: Deploy from Git (Recommended)**

```bash
git push heroku main
```

If your default branch is `master`:
```bash
git push heroku master
```

**Option B: Connect GitHub Repository**

1. Go to [dashboard.heroku.com](https://dashboard.heroku.com)
2. Select your app
3. Go to "Deploy" tab
4. Connect GitHub repository
5. Enable automatic deploys
6. Click "Deploy Branch"

### Step 7: Check Deployment Status

```bash
heroku logs --tail
```

This will show real-time logs. Look for:
- ✅ MongoDB connected successfully
- 🚀 Server running on port...

### Step 8: Test Your API

Your API will be available at: `https://your-app-name.herokuapp.com`

Test the health endpoint:
```bash
curl https://your-app-name.herokuapp.com/api/history/summary
```

Or open in browser:
```
https://your-app-name.herokuapp.com/api/history/summary
```

### Step 9: Update CORS (Important!)

After deployment, update `server.js` to include your Heroku URL:

```javascript
app.use(cors({
  origin: [
    'https://your-app-name.herokuapp.com',
    'https://drwaiting-30f56.web.app',
    'https://drwaiting-30f56.firebaseapp.com',
    // Add your mobile app domains
  ],
  // ... rest
}));
```

Then commit and redeploy:
```bash
git add server.js
git commit -m "Update CORS for production"
git push heroku main
```

## Common Commands

### View Logs
```bash
heroku logs --tail
```

### Restart App
```bash
heroku restart
```

### Open App in Browser
```bash
heroku open
```

### View Config Variables
```bash
heroku config
```

### Set Config Variable
```bash
heroku config:set KEY=value
```

### Remove Config Variable
```bash
heroku config:unset KEY
```

### Scale Dynos (if needed)
```bash
heroku ps:scale web=1
```

## Troubleshooting

### Issue: "MongoDB connection failed"
- Check your `MONGO_URI` is correct
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check database username and password

### Issue: "App crashed"
```bash
heroku logs --tail
```
Check the logs for error messages.

### Issue: "Build failed"
- Ensure `package.json` has correct `start` script
- Check Node.js version compatibility
- Verify all dependencies are listed in `package.json`

### Issue: "Port already in use"
- Heroku sets PORT automatically, don't hardcode it
- Your code should use `process.env.PORT || 6000`

## Post-Deployment Checklist

- [ ] API is accessible at Heroku URL
- [ ] MongoDB connection is working
- [ ] Health check endpoint works
- [ ] CORS is updated with production domains
- [ ] Environment variables are set correctly
- [ ] Logs show no errors

## Next Steps

1. Update your mobile app to use the Heroku URL
2. Test all API endpoints
3. Set up monitoring (optional)
4. Configure custom domain (optional)

## Need Help?

- Heroku Docs: https://devcenter.heroku.com/articles/getting-started-with-nodejs
- Heroku Support: https://help.heroku.com


