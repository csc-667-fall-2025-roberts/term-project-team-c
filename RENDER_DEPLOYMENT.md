# Deploying to Render

This guide walks through deploying your UNO game to Render.

## Prerequisites

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)

## Step 1: Prepare Your Code

### 1.1 Install Dependencies

Run this command to install the new cross-platform build tool:

```bash
npm install
```

### 1.2 Commit Your Changes

Make sure all your changes are committed and pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Create PostgreSQL Database on Render

1. **Log into Render Dashboard** at [dashboard.render.com](https://dashboard.render.com)

2. **Click "New +"** in the top right → Select **"PostgreSQL"**

3. **Configure Database**:
   - **Name**: `uno-game-db` (or any name you prefer)
   - **Database**: `term_project`
   - **User**: `postgres` (auto-generated)
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 16 (or latest)
   - **Instance Type**: Free tier is fine for class projects

4. **Click "Create Database"**

5. **Save Database Credentials**:
   - After creation, click on your database
   - Scroll to **"Connections"** section
   - Copy the **"Internal Database URL"** (starts with `postgres://`)
   - **IMPORTANT**: Keep this URL safe - you'll need it in Step 3

## Step 3: Create Web Service on Render

1. **Click "New +"** → Select **"Web Service"**

2. **Connect Your Repository**:
   - Click **"Connect a repository"**
   - Authorize Render to access your GitHub
   - Select your project repository

3. **Configure Web Service**:
   - **Name**: `uno-game` (or any name you prefer)
   - **Region**: Same as your database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build && npm run migrate:up`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier

4. **Add Environment Variables**:
   Click **"Advanced"** → **"Add Environment Variable"** and add these:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Paste the Internal Database URL from Step 2 |
   | `SESSION_SECRET` | Generate a random string (e.g., `openssl rand -base64 32`) |
   | `PORT` | `10000` (Render default, will be auto-set) |

   **To generate a secure SESSION_SECRET** (run locally):
   - Windows PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))`
   - Mac/Linux: `openssl rand -base64 32`
   - Or use: `super_secret_session_key_production_123456789`

5. **Click "Create Web Service"**

## Step 4: Wait for Deployment

1. Render will now:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Build your app (`npm run build`)
   - Run database migrations (`npm run migrate:up`)
   - Start your server (`npm start`)

2. **Watch the logs** in the Render dashboard to monitor progress

3. **First deployment takes 5-10 minutes**

4. Once you see **"Server started on port 10000"**, your app is live!

## Step 5: Access Your App

1. Find your app URL in the Render dashboard (e.g., `https://uno-game.onrender.com`)

2. Visit the URL and test your game!

## Common Issues & Solutions

### Issue: Build fails with "Cannot find module"

**Solution**: Make sure all dependencies are in `package.json`, not just `devDependencies`

### Issue: Database connection fails

**Solution**:
- Verify `DATABASE_URL` is the **Internal Database URL** (not External)
- Check that database and web service are in the **same region**

### Issue: Migrations fail

**Solution**:
- Check migration files are committed to git
- Verify `node-pg-migrate` is in dependencies (not devDependencies)

### Issue: WebSockets don't work

**Solution**: Render supports WebSockets by default, but make sure:
- Your Socket.io client connects to the Render URL
- You're not hardcoding `localhost` anywhere

### Issue: App keeps sleeping (Free tier)

**Solution**: Free tier services sleep after 15 minutes of inactivity. Consider:
- Upgrading to paid tier for always-on
- Using a service like UptimeRobot to ping your app

## Updating Your Deployment

Render automatically redeploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Update game features"
git push origin main
```

Render will detect the push and redeploy automatically (takes 2-5 minutes).

## Database Management

### Run Migrations Manually

If you need to run migrations after deployment:

1. Go to your Web Service in Render dashboard
2. Click **"Shell"** tab
3. Run: `npm run migrate:up`

### View Database

1. Go to your PostgreSQL database in Render dashboard
2. Click **"Connect"** → **"External Connection"**
3. Use these credentials in pgAdmin4 or any PostgreSQL client

## Monitoring

- **Logs**: Click on your service → **"Logs"** tab to view real-time logs
- **Metrics**: See CPU, memory, and bandwidth usage in the dashboard
- **Alerts**: Set up email alerts for errors (in Settings)

## Cost Breakdown (as of 2024)

- **PostgreSQL Database (Free Tier)**: $0/month
  - 90 days data retention
  - 1GB storage
  - Shared CPU/RAM

- **Web Service (Free Tier)**: $0/month
  - 750 hours/month free
  - Sleeps after 15 min inactivity
  - Shared resources

**Perfect for class projects and demos!**

## Security Checklist

- ✅ Strong `SESSION_SECRET` set
- ✅ `.env` file in `.gitignore`
- ✅ Database password not hardcoded
- ✅ `NODE_ENV=production` set
- ✅ Error stack traces disabled in production

## Support

- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
