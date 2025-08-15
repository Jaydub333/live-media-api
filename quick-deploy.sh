#!/bin/bash

# Quick Docker deployment to DigitalOcean Droplet
# Run this on a DigitalOcean droplet

echo "🚀 Deploying Multimedia API to DigitalOcean Droplet..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/Jaydub333/live-media-api.git
cd live-media-api

# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret-change-this-immediately
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
CORS_ORIGINS=https://your-domain.com
EOF

echo "⚠️  IMPORTANT: Edit the .env file with your actual values:"
echo "nano .env"
echo ""
echo "After editing .env, continue deployment:"
echo "docker build -t multimedia-api ."
echo "docker run -d --name multimedia-api --env-file .env -p 80:3000 --restart unless-stopped multimedia-api"
echo ""
echo "Your API will be available at: http://your-droplet-ip"