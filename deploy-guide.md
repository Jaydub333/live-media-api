# Deploy to DigitalOcean - Step by Step

## 🚀 Quick Deployment Guide

### Step 1: Go to DigitalOcean Apps
1. Visit: https://cloud.digitalocean.com/apps
2. Click **"Create App"**

### Step 2: Connect GitHub Repository
1. Choose **"GitHub"** as source
2. Sign in to GitHub if prompted
3. Select repository: **"Jaydub333/live-media-api"**
4. Select branch: **"main"**
5. Click **"Next"**

### Step 3: Configure App
The app will auto-detect the `.do/app.yaml` configuration file.

**Review these settings:**
- **App Name**: `live-media-api` (or change if desired)
- **Region**: Choose closest to your users (e.g., `nyc1`, `sfo3`)
- **Plan**: Basic ($5/month) is fine for testing

### Step 4: Add Environment Variables
Click **"Edit"** next to Environment Variables and add:

```
NODE_ENV = production
JWT_SECRET = [Generate a 64-character random string]
STRIPE_SECRET_KEY = sk_test_... (your Stripe test key)
STRIPE_PUBLISHABLE_KEY = pk_test_... (your Stripe test key)
CORS_ORIGINS = ${_self.URL}
```

**To generate JWT_SECRET:**
```javascript
// Run this in browser console or Node.js
require('crypto').randomBytes(64).toString('hex')
```

### Step 5: Review and Deploy
1. Review all settings
2. Click **"Create Resources"**
3. Wait 5-10 minutes for deployment

### Step 6: Get Your App URL
After deployment, you'll get a URL like:
`https://live-media-api-xxxxx.ondigitalocean.app`

### Step 7: Test Your Deployment
1. Visit your app URL
2. Add `/dashboard/` to test the subscription interface
3. Try creating an account

### Step 8: Configure Stripe Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app-url.ondigitalocean.app/api/billing/webhooks`
3. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy webhook signing secret
5. Add to DigitalOcean environment variables as `STRIPE_WEBHOOK_SECRET`

## 🎯 You're Live!

Your multimedia API with Stripe billing is now running on DigitalOcean!