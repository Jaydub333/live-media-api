# DigitalOcean Deployment Guide

Complete guide to deploy your Multimedia API with Stripe billing to DigitalOcean.

## Prerequisites

1. **DigitalOcean Account** with billing enabled
2. **Domain name** pointing to DigitalOcean nameservers
3. **Stripe account** with live API keys
4. **Git repository** (GitHub/GitLab) with your code
5. **doctl CLI** installed and configured

## Quick Deploy Options

### Option 1: App Platform (Recommended)
Easiest deployment with automatic scaling and SSL.

### Option 2: Docker Droplet
More control, manual SSL setup required.

### Option 3: Kubernetes
For enterprise-scale deployments.

---

## Option 1: App Platform Deployment

### 1. Install doctl CLI

**Windows:**
```powershell
# Download and install from GitHub releases
curl -OL https://github.com/digitalocean/doctl/releases/download/v1.100.0/doctl-1.100.0-windows-amd64.zip
# Extract and add to PATH
```

**Linux/Mac:**
```bash
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.100.0/doctl-1.100.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin
```

### 2. Authenticate with DigitalOcean

```bash
doctl auth init
# Follow prompts to enter your API token
```

### 3. Prepare Your Environment

```bash
# Copy production environment template
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

**Required Production Values:**
```env
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-256-characters-long
STRIPE_SECRET_KEY=sk_live_your_stripe_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. Push to Git Repository

```bash
git add .
git commit -m "Add DigitalOcean deployment configuration"
git push origin main
```

### 5. Deploy to App Platform

**Method A: Using CLI**
```bash
# Run the deployment script
./deploy.sh
```

**Method B: Manual Deployment**
```bash
# Create app from spec
doctl apps create --spec .do/app.yaml

# Or update existing app
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

**Method C: DigitalOcean Control Panel**
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Import `.do/app.yaml` configuration
5. Configure environment variables
6. Deploy

### 6. Configure Environment Variables

In the DigitalOcean App Platform dashboard:

1. Go to your app → Settings → Environment Variables
2. Add these encrypted variables:
   - `JWT_SECRET` (encrypted)
   - `STRIPE_SECRET_KEY` (encrypted) 
   - `STRIPE_WEBHOOK_SECRET` (encrypted)
   - `STRIPE_PUBLISHABLE_KEY` (encrypted)

### 7. Set Up Custom Domain

1. In App Platform → Settings → Domains
2. Add your domain: `api.yourdomain.com`
3. DigitalOcean will provide SSL automatically
4. Update DNS records as instructed

---

## Option 2: Docker Droplet Deployment

### 1. Create Droplet

```bash
# Create Ubuntu droplet with Docker
doctl compute droplet create multimedia-api \
  --image docker-20-04 \
  --size s-2vcpu-2gb \
  --region nyc1 \
  --ssh-keys YOUR_SSH_KEY_ID
```

### 2. SSH to Droplet

```bash
ssh root@your-droplet-ip
```

### 3. Clone and Deploy

```bash
# Clone repository
git clone https://github.com/yourusername/multimedia-api.git
cd multimedia-api

# Set up environment
cp .env.production .env
nano .env  # Edit with your values

# Build and run
docker build -t multimedia-api .
docker run -d --name multimedia-api \
  --env-file .env \
  -p 80:3000 \
  --restart unless-stopped \
  multimedia-api
```

### 4. Set Up SSL with Let's Encrypt

```bash
# Install Nginx and Certbot
apt update
apt install nginx certbot python3-certbot-nginx -y

# Configure Nginx reverse proxy
cat > /etc/nginx/sites-available/multimedia-api << EOF
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/multimedia-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d api.yourdomain.com
```

---

## Post-Deployment Configuration

### 1. Configure Stripe Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://api.yourdomain.com/api/billing/webhooks`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook signing secret to your environment variables

### 2. Update Dashboard Configuration

Edit `dashboard/index.html`:
```javascript
// Replace localhost with your production API URL
const API_BASE = 'https://api.yourdomain.com/api';

// Update Stripe publishable key
stripe = Stripe('pk_live_your_stripe_publishable_key_here');
```

### 3. Test Production Deployment

```bash
# Health check
curl https://api.yourdomain.com/

# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Test Stripe webhook
curl -X POST https://api.yourdomain.com/api/billing/webhooks \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{}'
```

---

## Monitoring and Maintenance

### App Platform Monitoring

```bash
# View app status
doctl apps list

# View logs
doctl apps logs YOUR_APP_ID --type=build
doctl apps logs YOUR_APP_ID --type=deploy
doctl apps logs YOUR_APP_ID --type=run

# Monitor metrics
doctl monitoring uptime check list
```

### Docker Droplet Monitoring

```bash
# Container status
docker ps
docker logs multimedia-api

# System monitoring
htop
df -h
free -h

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Backups (App Platform)

DigitalOcean managed databases include automatic backups. Configure additional backup retention in the database settings.

### SSL Certificate Renewal (Droplet)

```bash
# Test renewal
certbot renew --dry-run

# Set up automatic renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Scaling and Performance

### App Platform Scaling

1. Go to your app → Settings → Resources
2. Increase instance count or size
3. Enable autoscaling based on CPU/memory

### Database Scaling

1. DigitalOcean Dashboard → Databases
2. Select your database
3. Resize or add read replicas

### CDN Setup

1. Create DigitalOcean Spaces CDN
2. Configure static assets delivery
3. Update CORS settings

---

## Troubleshooting

### Common Issues

**App won't start:**
```bash
# Check logs
doctl apps logs YOUR_APP_ID

# Common fixes:
# - Verify environment variables
# - Check Node.js version compatibility
# - Ensure all dependencies are in package.json
```

**Stripe webhooks failing:**
```bash
# Verify webhook URL is accessible
curl https://api.yourdomain.com/api/billing/webhooks

# Check webhook secret matches
# Verify HTTPS certificate is valid
```

**Database connection issues:**
```bash
# Check database credentials
# Verify DATABASE_URL format
# Ensure database is running
```

### Performance Optimization

1. **Enable compression:**
   - Add gzip middleware to Express
   - Configure Nginx compression (Droplet)

2. **Database optimization:**
   - Add proper indexes
   - Use connection pooling
   - Monitor query performance

3. **Caching:**
   - Add Redis for session storage
   - Implement API response caching
   - Use CDN for static assets

---

## Security Checklist

- ✅ HTTPS enabled with valid SSL certificate
- ✅ Environment variables encrypted
- ✅ Strong JWT secrets (256+ characters)
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ Security headers enabled (Helmet.js)
- ✅ Database connections encrypted
- ✅ Webhook signatures verified
- ✅ Regular security updates
- ✅ Backup and disaster recovery plan

---

## Cost Optimization

### App Platform Costs
- **Basic XXS**: ~$5/month (512MB RAM, 1 vCPU)
- **Basic XS**: ~$12/month (1GB RAM, 1 vCPU)
- **Professional S**: ~$25/month (2GB RAM, 2 vCPU)

### Additional Costs
- **Managed Database**: ~$15/month (1GB)
- **Domain**: ~$12/year
- **CDN**: ~$1/month (50GB)
- **Backups**: ~$2/month

**Total Monthly Cost: ~$33-55** for a production-ready setup

---

## Support and Updates

### Maintenance Tasks

**Weekly:**
- Monitor application logs
- Check system resources
- Verify SSL certificates
- Review Stripe transactions

**Monthly:**
- Update dependencies
- Review security patches
- Backup database
- Analyze usage metrics

**Quarterly:**
- Security audit
- Performance review
- Cost optimization
- Disaster recovery test

Your multimedia API is now ready for production on DigitalOcean! 🚀