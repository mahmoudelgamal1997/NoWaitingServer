# Quick Deploy to Heroku - Run These Commands

## Step 1: Login to Heroku
```bash
heroku login
```
(Press any key to open browser, or use `heroku login -i` for email/password)

## Step 2: Run Deployment Script

**For Windows (PowerShell):**
```powershell
.\deploy-heroku.ps1
```

**For Mac/Linux:**
```bash
chmod +x deploy-heroku.sh
./deploy-heroku.sh
```

## OR Manual Deployment (Step by Step)

### 1. Create Heroku App
```bash
heroku create patient-history-api-2024
```
(Replace with your desired name, or let Heroku generate one)

### 2. Set MongoDB Connection String
```bash
heroku config:set MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/patient-history?retryWrites=true&w=majority"
```
**Get your MongoDB Atlas connection string from:**
- Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create cluster → Connect → Get connection string
- Replace `<password>` with your password

### 3. Set Environment Variables
```bash
heroku config:set NODE_ENV=production
```

### 4. Deploy
```bash
git push heroku main
```
(If your branch is `master`, use `git push heroku master`)

### 5. Check Status
```bash
heroku logs --tail
```

### 6. Test Your API
Your API will be at: `https://your-app-name.herokuapp.com`

Test it:
```bash
curl https://your-app-name.herokuapp.com/api/history/summary
```

## That's It! 🎉

Your API is now live on Heroku!

