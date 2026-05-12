#!/bin/bash

# Lumina ERP Deployment Script for DigitalOcean
# Run this on your DigitalOcean droplet after initial server setup

set -e

echo "======================================"
echo "Lumina ERP Deployment Script"
echo "======================================"

# Configuration
PROJECT_DIR="/var/www/Lumina-erp"
REPO_URL="git@github.com:shaphankirui/Lumina-erp.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Install pnpm if not already installed
if ! command -v pnpm &> /dev/null; then
    print_message "Installing pnpm..."
    npm install -g pnpm@8.15.0
fi

# Create project directory
if [ ! -d "$PROJECT_DIR" ]; then
    print_message "Creating project directory..."
    mkdir -p "$PROJECT_DIR"
fi

# Clone or update repository
if [ -d "$PROJECT_DIR/.git" ]; then
    print_message "Updating existing repository..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/main  # Change 'main' to your branch if different
else
    print_message "Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Install dependencies
print_message "Installing dependencies..."
pnpm install

# Build backend
print_message "Building backend..."
cd "$PROJECT_DIR/apps/backend"
pnpm run build

# Build frontend
print_message "Building frontend..."
cd "$PROJECT_DIR/apps/frontend"
pnpm run build

# Setup environment file
cd "$PROJECT_DIR/apps/backend"
if [ ! -f ".env" ]; then
    print_warning ".env file not found in apps/backend/"
    print_message "Please create .env file with your configuration"
    echo "Example: cp .env.example .env"
    echo "Then edit .env with your database credentials and secrets"
    exit 1
fi

# Run Prisma migrations
print_message "Running Prisma migrations..."
cd "$PROJECT_DIR/apps/backend"
pnpm exec prisma generate
pnpm exec prisma migrate deploy

# Create PM2 log directory
print_message "Creating PM2 log directory..."
mkdir -p /var/log/pm2

# Setup Nginx configurations
print_message "Setting up Nginx configurations..."
if [ -f "$PROJECT_DIR/nginx-backend.conf" ]; then
    cp "$PROJECT_DIR/nginx-backend.conf" /etc/nginx/sites-available/lumina-backend
    print_warning "Edit /etc/nginx/sites-available/lumina-backend and update server_name with your domain"
fi

if [ -f "$PROJECT_DIR/nginx-frontend.conf" ]; then
    cp "$PROJECT_DIR/nginx-frontend.conf" /etc/nginx/sites-available/lumina-frontend
    print_warning "Edit /etc/nginx/sites-available/lumina-frontend and update server_name with your domain"
fi

# Enable Nginx sites (user needs to do this manually after editing)
print_message "To enable Nginx sites, run:"
echo "  ln -s /etc/nginx/sites-available/lumina-backend /etc/nginx/sites-enabled/"
echo "  ln -s /etc/nginx/sites-available/lumina-frontend /etc/nginx/sites-enabled/"
echo "  nginx -t"
echo "  systemctl reload nginx"

# Start applications with PM2
print_message "Starting applications with PM2..."
cd "$PROJECT_DIR"
pm2 delete all || true  # Delete existing processes
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit /etc/nginx/sites-available/lumina-backend with your domain"
echo "2. Edit /etc/nginx/sites-available/lumina-frontend with your domain"
echo "3. Enable Nginx sites (commands shown above)"
echo "4. Setup SSL with: certbot --nginx -d yourdomain.com -d api.yourdomain.com"
echo ""
echo "Useful commands:"
echo "  pm2 list              - List all running apps"
echo "  pm2 logs              - View logs"
echo "  pm2 restart all       - Restart all apps"
echo "  pm2 monit             - Monitor resources"
