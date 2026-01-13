#!/bin/bash
# Heroku Deployment Script
# Run this after: heroku login

echo "🚀 Starting Heroku Deployment..."

# Step 1: Check if Heroku remote exists
echo ""
echo "📋 Checking Heroku remote..."
if ! git remote | grep -q heroku; then
    echo "Creating Heroku app..."
    APP_NAME="patient-history-api-$(date +%m%d%H%M)"
    heroku create $APP_NAME --region us
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create Heroku app. Please login first: heroku login"
        exit 1
    fi
else
    echo "✅ Heroku remote already exists"
    APP_NAME=$(heroku apps:info --json | jq -r '.app.name')
    echo "Using existing app: $APP_NAME"
fi

# Step 2: Check environment variables
echo ""
echo "🔧 Checking environment variables..."
MONGO_URI=$(heroku config:get MONGO_URI)
if [ -z "$MONGO_URI" ]; then
    echo "⚠️  MONGO_URI not set!"
    echo "Please set it with:"
    echo "heroku config:set MONGO_URI=\"your-mongodb-connection-string\""
    echo ""
    read -p "Continue deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ MONGO_URI is set"
fi

# Step 3: Set NODE_ENV if not set
echo ""
echo "🔧 Setting NODE_ENV..."
heroku config:set NODE_ENV=production

# Step 4: Deploy
echo ""
echo "📦 Deploying to Heroku..."
git push heroku main || git push heroku master

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

# Step 5: Check deployment
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Checking app status..."
heroku ps

echo ""
echo "🌐 Your API URL:"
APP_URL="https://${APP_NAME}.herokuapp.com"
echo "$APP_URL"

echo ""
echo "📝 Test your API:"
echo "curl $APP_URL/api/history/summary"

echo ""
echo "📋 View logs:"
echo "heroku logs --tail"

echo ""
echo "✨ Done! Your API is live at: $APP_URL"

