#!/bin/bash

# DigitalOcean Deployment Script for Multimedia API
# Make sure you have doctl installed and configured

set -e

echo "🚀 Starting deployment to DigitalOcean..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="multimedia-api"
REGION="nyc1"
SIZE="basic-xxs"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    print_error "doctl is not installed. Please install it first:"
    echo "curl -sL https://github.com/digitalocean/doctl/releases/download/v1.100.0/doctl-1.100.0-linux-amd64.tar.gz | tar -xzv"
    echo "sudo mv doctl /usr/local/bin"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list &> /dev/null; then
    print_error "Please authenticate with DigitalOcean first:"
    echo "doctl auth init"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production file not found. Creating from template..."
    cp .env.example .env.production
    print_warning "Please edit .env.production with your production values before continuing."
    read -p "Press Enter after updating .env.production..."
fi

print_status "Building Docker image..."
docker build -t $APP_NAME .

print_status "Tagging image for DigitalOcean Container Registry..."
docker tag $APP_NAME registry.digitalocean.com/your-registry/$APP_NAME:latest

print_status "Pushing image to registry..."
docker push registry.digitalocean.com/your-registry/$APP_NAME:latest

print_status "Creating app specification..."
cat > app-spec.yaml << EOF
name: $APP_NAME
services:
- name: web
  source_dir: /
  docker:
    registry_type: DOCR
    repository: $APP_NAME
    tag: latest
  instance_count: 1
  instance_size_slug: $SIZE
  http_port: 3000
  health_check:
    http_path: /
    initial_delay_seconds: 30
    period_seconds: 10
    timeout_seconds: 5
    success_threshold: 1
    failure_threshold: 3
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3000"
  - key: JWT_SECRET
    value: \${JWT_SECRET}
    type: SECRET  
  - key: STRIPE_SECRET_KEY
    value: \${STRIPE_SECRET_KEY}
    type: SECRET
  - key: STRIPE_WEBHOOK_SECRET
    value: \${STRIPE_WEBHOOK_SECRET}
    type: SECRET
  - key: STRIPE_PUBLISHABLE_KEY
    value: \${STRIPE_PUBLISHABLE_KEY}
    type: SECRET
  - key: CORS_ORIGINS
    value: https://\${_self.DOMAIN}
  - key: DATABASE_URL
    value: \${multimedia-db.DATABASE_URL}
  alerts:
  - rule: CPU_UTILIZATION
    value: 80
  - rule: MEM_UTILIZATION  
    value: 80
  - rule: RESTART_COUNT
    value: 5

databases:
- name: multimedia-db
  engine: PG
  version: "14"
  size: db-s-dev-database

static_sites:
- name: dashboard
  source_dir: /dashboard
  build_command: |
    sed -i "s|http://localhost:3000|\${_self.URL}|g" index.html
  output_dir: /
  index_document: index.html
  error_document: index.html

domain_aliases:
- domain: api.your-domain.com
  type: PRIMARY
EOF

# Check if app already exists
if doctl apps list | grep -q "$APP_NAME"; then
    print_status "App exists, updating..."
    APP_ID=$(doctl apps list | grep "$APP_NAME" | awk '{print $1}')
    doctl apps update $APP_ID --spec app-spec.yaml
else
    print_status "Creating new app..."
    doctl apps create --spec app-spec.yaml
fi

print_success "Deployment initiated! 🎉"
print_status "Monitor deployment progress:"
echo "doctl apps list"
echo "doctl apps logs $APP_NAME"

print_status "Next steps:"
echo "1. Update your domain DNS to point to the app URL"
echo "2. Configure Stripe webhooks with the production URL"
echo "3. Set up monitoring and alerts"
echo "4. Test the production deployment"

print_warning "Don't forget to:"
echo "- Update CORS_ORIGINS with your production domain"
echo "- Set up SSL certificates (automatic with App Platform)"
echo "- Configure your Stripe webhook endpoint"
echo "- Test payment flows in production"

print_success "Deployment script completed!"