# Heroku Deployment Script
# Run this after: heroku login

Write-Host "🚀 Starting Heroku Deployment..." -ForegroundColor Green

# Step 1: Check if Heroku remote exists
Write-Host "`n📋 Checking Heroku remote..." -ForegroundColor Yellow
$herokuRemote = git remote | Select-String "heroku"
if (-not $herokuRemote) {
    Write-Host "Creating Heroku app..." -ForegroundColor Yellow
    $appName = "patient-history-api-$(Get-Date -Format 'MMddHHmm')"
    heroku create $appName --region us
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create Heroku app. Please login first: heroku login" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Heroku remote already exists" -ForegroundColor Green
    $appName = (heroku apps:info --json | ConvertFrom-Json).name
    Write-Host "Using existing app: $appName" -ForegroundColor Cyan
}

# Step 2: Check environment variables
Write-Host "`n🔧 Checking environment variables..." -ForegroundColor Yellow
$mongoUri = heroku config:get MONGO_URI
if (-not $mongoUri) {
    Write-Host "⚠️  MONGO_URI not set!" -ForegroundColor Red
    Write-Host "Please set it with:" -ForegroundColor Yellow
    Write-Host "heroku config:set MONGO_URI=`"your-mongodb-connection-string`"" -ForegroundColor Cyan
    Write-Host "`nOr continue if you want to set it manually later." -ForegroundColor Yellow
    $continue = Read-Host "Continue deployment? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✅ MONGO_URI is set" -ForegroundColor Green
}

# Step 3: Set NODE_ENV if not set
Write-Host "`n🔧 Setting NODE_ENV..." -ForegroundColor Yellow
heroku config:set NODE_ENV=production

# Step 4: Deploy
Write-Host "`n📦 Deploying to Heroku..." -ForegroundColor Yellow
git push heroku main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Trying master branch..." -ForegroundColor Yellow
    git push heroku master
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed on both branches!" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Check deployment
Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`n📊 Checking app status..." -ForegroundColor Yellow
heroku ps

Write-Host "`n🌐 Your API URL:" -ForegroundColor Green
$appUrl = "https://$appName.herokuapp.com"
Write-Host $appUrl -ForegroundColor Cyan

Write-Host "`n📝 Test your API:" -ForegroundColor Yellow
Write-Host "curl $appUrl/api/history/summary" -ForegroundColor Cyan

Write-Host "`n📋 View logs:" -ForegroundColor Yellow
Write-Host "heroku logs --tail" -ForegroundColor Cyan

Write-Host "`n✨ Done! Your API is live at: $appUrl" -ForegroundColor Green

