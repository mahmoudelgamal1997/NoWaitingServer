# Deployment Guide - Patient History API

This guide covers multiple deployment options for the Patient History API.

## Prerequisites

- Node.js 18+ installed locally
- MongoDB database (local or cloud)
- Git installed
- Account on your chosen deployment platform

## Environment Variables

Before deploying, ensure you have the following environment variables configured:

- `PORT` - Server port (default: 6000)
- `MONGO_URI` - MongoDB connection string
- `NODE_ENV` - Environment (production/development)

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

---

## Deployment Options

### 1. Railway (Recommended - Easy & Free Tier Available)

Railway is a modern platform that makes deployment simple.

#### Steps:

1. **Install Railway CLI** (optional but recommended):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Railway in your project**:
   ```bash
   railway init
   ```

4. **Set Environment Variables**:
   ```bash
   railway variables set MONGO_URI=your_mongodb_connection_string
   railway variables set NODE_ENV=production
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

   Or connect your GitHub repository:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Add environment variables in the dashboard
   - Railway will auto-deploy on every push

#### Railway Dashboard:
- Go to your project settings
- Add environment variables:
  - `MONGO_URI`: Your MongoDB connection string
  - `NODE_ENV`: production
  - `PORT`: Will be auto-set by Railway

---

### 2. Render

Render offers free tier hosting with automatic deployments.

#### Steps:

1. **Sign up** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

3. **Configure Build Settings**:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node

4. **Add Environment Variables**:
   - `MONGO_URI`: Your MongoDB connection string
   - `NODE_ENV`: production
   - `PORT`: 6000 (or leave empty, Render sets it automatically)

5. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy automatically

#### Using render.yaml:
The `render.yaml` file is already configured. Just connect your repo and Render will use it automatically.

---

### 3. Heroku

Heroku is a popular platform with a free tier (with limitations).

#### Steps:

1. **Install Heroku CLI**:
   ```bash
   # Windows (using installer)
   # Download from: https://devcenter.heroku.com/articles/heroku-cli
   
   # Or using npm
   npm install -g heroku
   ```

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

3. **Create a Heroku App**:
   ```bash
   heroku create your-app-name
   ```

4. **Add MongoDB Add-on** (MongoDB Atlas recommended):
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string
   - Or use Heroku add-on: `heroku addons:create mongolab:sandbox`

5. **Set Environment Variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGO_URI=your_mongodb_connection_string
   ```

6. **Deploy**:
   ```bash
   git push heroku main
   ```

   Or connect GitHub:
   - Go to Heroku Dashboard → Your App → Deploy
   - Connect GitHub repository
   - Enable automatic deploys

---

### 4. Docker Deployment

Deploy using Docker on any platform that supports containers (AWS, Google Cloud, Azure, DigitalOcean, etc.).

#### Build Docker Image:

```bash
# Build the image
docker build -t patient-history-api .

# Run locally to test
docker run -p 6000:6000 \
  -e MONGO_URI=your_mongodb_connection_string \
  -e NODE_ENV=production \
  patient-history-api
```

#### Deploy to Docker Hub:

```bash
# Login to Docker Hub
docker login

# Tag your image
docker tag patient-history-api yourusername/patient-history-api:latest

# Push to Docker Hub
docker push yourusername/patient-history-api:latest
```

#### Deploy to Cloud Platforms:

**AWS ECS/Fargate:**
- Create ECS cluster
- Create task definition using your Docker image
- Set environment variables
- Create service

**Google Cloud Run:**
```bash
# Install gcloud CLI
gcloud run deploy patient-history-api \
  --image yourusername/patient-history-api:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars MONGO_URI=your_mongodb_connection_string
```

**Azure Container Instances:**
- Use Azure Portal or CLI to deploy container
- Set environment variables in configuration

---

### 5. DigitalOcean App Platform

#### Steps:

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)

2. **Create App**:
   - Go to App Platform
   - Click "Create App"
   - Connect GitHub repository

3. **Configure**:
   - **Build Command**: `npm install`
   - **Run Command**: `node server.js`
   - **Environment**: Node.js

4. **Add Environment Variables**:
   - `MONGO_URI`
   - `NODE_ENV=production`

5. **Deploy**: Click "Create Resources"

---

### 6. VPS Deployment (Ubuntu/Debian)

Deploy to your own VPS server (DigitalOcean, Linode, AWS EC2, etc.).

#### Steps:

1. **SSH into your server**:
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install MongoDB** (or use MongoDB Atlas):
   ```bash
   # For local MongoDB
   sudo apt-get install -y mongodb
   ```

4. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/patient-history-api.git
   cd patient-history-api
   ```

5. **Install dependencies**:
   ```bash
   npm install --production
   ```

6. **Create .env file**:
   ```bash
   nano .env
   # Add your environment variables
   ```

7. **Install PM2** (Process Manager):
   ```bash
   sudo npm install -g pm2
   ```

8. **Start the application**:
   ```bash
   pm2 start server.js --name patient-history-api
   pm2 save
   pm2 startup
   ```

9. **Setup Nginx** (Reverse Proxy):
   ```bash
   sudo apt-get install nginx
   ```

   Create Nginx config (`/etc/nginx/sites-available/patient-history-api`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:6000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/patient-history-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

10. **Setup SSL with Let's Encrypt**:
    ```bash
    sudo apt-get install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

---

## MongoDB Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Create a database user
5. Whitelist IP addresses (0.0.0.0/0 for all, or your server IP)
6. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/patient-history?retryWrites=true&w=majority
   ```

### Option 2: Local MongoDB

If deploying to VPS, install MongoDB locally:
```bash
sudo apt-get install mongodb
```

Connection string:
```
mongodb://localhost:27017/patient-history
```

---

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] MongoDB connection is working
- [ ] API endpoints are accessible
- [ ] CORS is configured for your frontend domains
- [ ] Health check endpoint works: `/api/history/summary`
- [ ] SSL/HTTPS is enabled (for production)
- [ ] Monitoring/logging is set up
- [ ] Backup strategy is in place

---

## Testing Your Deployment

### 1. Health Check:
```bash
curl https://your-api-domain.com/api/history/summary
```

### 2. Test History Endpoint:
```bash
curl https://your-api-domain.com/api/history?page=1&limit=10
```

### 3. Check Logs:

**Railway:**
```bash
railway logs
```

**Render:**
- Go to dashboard → Logs

**Heroku:**
```bash
heroku logs --tail
```

**PM2 (VPS):**
```bash
pm2 logs patient-history-api
```

---

## Updating CORS for Production

Update `server.js` to include your production frontend URLs:

```javascript
app.use(cors({
  origin: [
    'https://your-production-domain.com',
    'https://your-mobile-app-domain.com',
    // Add your domains here
  ],
  // ... rest of config
}));
```

---

## Troubleshooting

### Connection Issues:
- Check MongoDB connection string
- Verify IP whitelist (for Atlas)
- Check firewall settings

### Port Issues:
- Ensure PORT environment variable is set
- Check platform-specific port requirements

### Build Failures:
- Verify Node.js version (18+)
- Check package.json dependencies
- Review build logs

### Runtime Errors:
- Check application logs
- Verify environment variables
- Test MongoDB connection

---

## Support

For deployment issues:
1. Check platform-specific documentation
2. Review application logs
3. Verify environment variables
4. Test MongoDB connection separately

---

## Quick Deploy Commands Reference

### Railway:
```bash
railway login
railway init
railway variables set MONGO_URI=your_uri
railway up
```

### Heroku:
```bash
heroku login
heroku create app-name
heroku config:set MONGO_URI=your_uri
git push heroku main
```

### Render:
- Use dashboard or connect GitHub repo

### Docker:
```bash
docker build -t patient-history-api .
docker run -p 6000:6000 -e MONGO_URI=your_uri patient-history-api
```

---

## Security Best Practices

1. **Never commit `.env` files** - Use environment variables in platform settings
2. **Use HTTPS** - Enable SSL/TLS certificates
3. **Secure MongoDB** - Use strong passwords, whitelist IPs
4. **Implement Authentication** - Add JWT or API key authentication
5. **Rate Limiting** - Consider adding rate limiting middleware
6. **Input Validation** - Validate all user inputs
7. **Regular Updates** - Keep dependencies updated

---

Good luck with your deployment! 🚀

