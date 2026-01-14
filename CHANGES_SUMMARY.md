# Changes Summary - Deployment Fixes

## Backend API Changes (patient-history-api)

### Commit: `9a6fdb6` - "Fix Cloud Run deployment: Update port to 8080, bind to 0.0.0.0, fix DB connection to not block startup"

**Files Changed:**

1. **Dockerfile**
   - Changed `EXPOSE 6000` → `EXPOSE 8080` (Cloud Run uses PORT=8080)
   - Updated health check to use `PORT` environment variable instead of hardcoded 6000
   - Increased health check timeouts (start-period: 5s → 40s, timeout: 3s → 10s)

2. **server.js**
   - Changed `app.listen(PORT, ...)` → `app.listen(PORT, '0.0.0.0', ...)`
   - Now explicitly binds to `0.0.0.0` instead of default (required for containers)

3. **config/db.js**
   - Removed `process.exit(1)` on database connection failure
   - Added check for missing `MONGO_URI` environment variable
   - Server now starts even if DB connection fails initially (won't crash container)

**Status:** ✅ Committed and pushed to GitHub

---

## Frontend Changes (my-login-app)

### Commits:
- `dcbbae7` - Switch to Node.js buildpack for Heroku deployment
- `ce1a972` - Add firebase dependency
- `0240a80` - Add React TypeScript types
- `23d848a` - Trigger rebuild with environment variables

**Files Created/Changed:**

1. **server.js** (NEW)
   - Express server to serve React build files
   - Handles client-side routing (React Router)

2. **Procfile** (NEW)
   - Tells Heroku to run `node server.js`

3. **package.json**
   - Added `express` dependency
   - Added `firebase` dependency
   - Added `@types/react` and `@types/react-dom` devDependencies

4. **Environment Variable Set:**
   - `REACT_APP_API_BASE_URL=https://nowaiting-076a4d0af321.herokuapp.com`

**Status:** ✅ Deployed to Heroku and pushed to GitHub

---

## What Was NOT Changed

- ✅ Waiting List still uses Firebase Firestore (real-time)
- ✅ Patients List still uses API endpoint
- ✅ No functional code changes - only deployment configuration

---

## Deployment URLs

- **Frontend:** https://dashboard-web-app-c25d1324e042.herokuapp.com/
- **Backend API:** https://nowaiting-076a4d0af321.herokuapp.com

