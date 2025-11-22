# Coolify Deployment Guide

## ✅ Preparation Completed

Your **Prompt Pilot Chat** application is now ready for deployment on Coolify with Nixpacks!

### Files Created/Updated:
- ✅ `.gitignore` - Updated to exclude data directory and sensitive files
- ✅ `.dockerignore` - Added for optimized build context
- ✅ `nixpacks.toml` - Explicit Node.js configuration for Coolify
- ✅ `package.json` - Updated to v1.0.0 with production settings
- ✅ `.env.example` - Updated with PORT variable
- ✅ `README.md` - Added comprehensive deployment instructions

### Changes Committed:
All deployment files have been committed to your repository. You can now push to your remote Git repository.

---

## 🚀 Next Steps

### 1. Push to Git Repository

```bash
# Push your changes to the remote repository
git push origin main
# Or if you're on a different branch:
# git push origin <your-branch-name>
```

### 2. Configure Coolify Application

#### A. Create New Application
1. Log in to your Coolify dashboard
2. Click **"New Application"**
3. Select **"Git Repository"**

#### B. Repository Settings
- **Repository**: Select your Git repository
- **Branch**: `main` (or your deployment branch)
- **Builder**: Nixpacks (should auto-detect)
- **Root Directory**: `/` (leave empty if app is at root)

#### C. Port Configuration
- **Expose Port**: `4173`
  - This MUST match the port your app listens on internally

#### D. Environment Variables
Add the following environment variables in Coolify:

| Variable | Value | Required |
|----------|-------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ Yes |
| `PORT` | `4173` | ⚠️ Recommended |
| `NODE_ENV` | `production` | Optional (set by nixpacks.toml) |

**Important**: Keep your `OPENAI_API_KEY` secure and never commit it to Git!

#### E. Build & Start Commands
- **Build Command**: Leave empty (Nixpacks handles this)
- **Start Command**: Leave empty (uses `npm start` from package.json)

#### F. Health Check (Optional)
- **Path**: `/` (or any valid endpoint)
- **Port**: `4173`

### 3. Deploy

1. Click **"Deploy"** in Coolify
2. Monitor the deployment logs
3. Wait for the message: `Server listening on http://localhost:4173`

### 4. Verify Deployment

Once deployed, test the following:

- ✅ Visit the Coolify-provided URL
- ✅ Check that static assets load (HTML, CSS, JS from `/public`)
- ✅ Test the `/api/drafts` endpoint
- ✅ Test the `/api/principles` endpoint
- ✅ Try saving a draft and optimizing a prompt

---

## 📋 Quick Reference

### Application Details
- **Name**: Prompt Pilot Chat (codex-prompt-chat)
- **Type**: Node.js HTTP Server (ES Modules)
- **Node Version**: ≥18
- **Port**: 4173
- **Build Tool**: Nixpacks
- **Static Files**: `./public`
- **Data Storage**: `./data` (ephemeral - not persisted)

### Critical Configuration
```toml
# nixpacks.toml
providers = ["node"]

[variables]
NODE_ENV = "production"

[phases.install]
cmds = ["npm ci --omit=dev"]

[start]
cmd = "npm start"
```

### Required Environment Variables
```env
OPENAI_API_KEY=sk-your-actual-key-here
PORT=4173
```

---

## 🔧 Troubleshooting

### Build Fails
- **Issue**: Missing `package-lock.json`
  - **Solution**: Ensure `package-lock.json` is committed to your repository
  
- **Issue**: Node version mismatch
  - **Solution**: Check `package.json` has `"engines": {"node": ">=18"}`

### Runtime Errors
- **Issue**: "OPENAI_API_KEY is not set"
  - **Solution**: Add `OPENAI_API_KEY` to Coolify environment variables

- **Issue**: Port binding errors
  - **Solution**: Ensure Coolify "Expose Port" is set to `4173`

### Static Files Not Loading
- **Issue**: 404 errors for CSS/JS files
  - **Solution**: Verify `public/` directory is committed to Git
  - **Solution**: Check logs for file serving errors

### Data Not Persisting
- **Expected**: Data in `./data` is ephemeral and will reset on each deployment
- **Solution**: If you need persistence, add a Coolify volume:
  - Volume Path: `/app/data`
  - Mount to: `./data`

### Logs
Check Coolify logs for:
```
Server listening on http://localhost:4173
```

---

## 📦 Data Persistence (Optional)

If you need to persist drafts and principles across deployments:

1. In Coolify, go to your application
2. Navigate to **Storage** or **Volumes**
3. Add a new volume:
   - **Source**: Create new volume (e.g., `prompt-pilot-data`)
   - **Destination**: `/app/data`
4. Redeploy the application

**Note**: The current setup is designed for ephemeral data. Persistence requires additional configuration.

---

## 🔐 Security Notes

- ✅ `.env` file is excluded from Git (in `.gitignore`)
- ✅ `data/` directory is excluded from Git
- ✅ Environment variables are set in Coolify (not in code)
- ⚠️ Never commit real API keys or secrets to Git
- ⚠️ Rotate your `OPENAI_API_KEY` if accidentally exposed

---

## 📚 Additional Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

## ✨ Success Checklist

Before marking deployment as complete:

- [ ] All code changes pushed to Git repository
- [ ] Coolify application configured with correct repository and branch
- [ ] Builder set to Nixpacks
- [ ] Port `4173` exposed in Coolify
- [ ] `OPENAI_API_KEY` environment variable set in Coolify
- [ ] `PORT=4173` environment variable set in Coolify
- [ ] Application deployed successfully
- [ ] Deployment logs show "Server listening on..."
- [ ] Application URL is accessible
- [ ] Static assets load correctly
- [ ] API endpoints respond correctly
- [ ] Draft save/load functionality works
- [ ] Prompt optimization with OpenAI works

---

**🎉 Your application is ready for deployment on Coolify!**

For questions or issues, check the Troubleshooting section or review the logs in Coolify.
