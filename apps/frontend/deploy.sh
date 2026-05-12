#!/bin/bash

# DasaDove Deployment Script
# This script automates the deployment of both frontend and backend

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}DasaDove Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to handle errors
handle_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# Function for success messages
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function for info messages
info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if script is run with sudo for nginx reload
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo ./deploy.sh${NC}"
    exit 1
fi

# Frontend deployment
echo -e "${BLUE}[1/4] Deploying Frontend...${NC}"
cd /var/www/DasaDove || handle_error "Frontend directory not found"

info "Pulling latest changes from git..."
git pull origin main || handle_error "Frontend git pull failed! Check your git configuration."

info "Installing frontend dependencies..."
npm install || handle_error "Frontend npm install failed!"

info "Building frontend application..."
npm run build || handle_error "Frontend build failed! Check build errors above."

success "Frontend deployed successfully!"
echo ""

# Backend deployment
echo -e "${BLUE}[2/4] Deploying Backend...${NC}"
cd /var/www/DasaDove-backend || handle_error "Backend directory not found"

info "Pulling latest changes from git..."
git pull origin main || handle_error "Backend git pull failed! Check your git configuration."

info "Installing backend dependencies..."
npm install || handle_error "Backend npm install failed!"

info "Building backend application..."
npm run build || handle_error "Backend build failed! Check build errors above."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    info "PM2 not found. Installing PM2..."
    npm install -g pm2 || handle_error "Failed to install PM2!"
fi

# Check if backend is already running in PM2
if pm2 list | grep -q "dasadove-backend"; then
    info "Restarting backend service..."
    pm2 restart dasadove-backend || handle_error "Failed to restart backend!"
else
    info "Starting backend service for the first time..."
    pm2 start dist/src/main.js --name "dasadove-backend" || handle_error "Failed to start backend!"
    pm2 save || handle_error "Failed to save PM2 configuration!"
fi

success "Backend deployed successfully!"
echo ""

# SSL Certificate Check and Renewal
echo -e "${BLUE}[3/4] Checking SSL Certificates...${NC}"

if command -v certbot &> /dev/null; then
    info "Checking SSL certificate expiration..."

    # Check if certificates are expiring soon (within 30 days)
    CERT_EXPIRE_DAYS=$(certbot certificates 2>/dev/null | grep "VALID" | head -1 | grep -oP '\d+(?= days)')

    if [ ! -z "$CERT_EXPIRE_DAYS" ]; then
        if [ "$CERT_EXPIRE_DAYS" -lt 30 ]; then
            info "SSL certificates expiring in $CERT_EXPIRE_DAYS days. Attempting renewal..."
            certbot renew --quiet
            if [ $? -eq 0 ]; then
                success "SSL certificates renewed successfully!"
            else
                echo -e "${YELLOW}Warning: SSL renewal failed. Check manually with: sudo certbot renew${NC}"
            fi
        else
            success "SSL certificates are valid for $CERT_EXPIRE_DAYS days"
        fi
    else
        echo -e "${YELLOW}Note: No SSL certificates found. Run ssl-setup.sh to install.${NC}"
    fi
else
    echo -e "${YELLOW}Note: Certbot not installed. SSL not configured.${NC}"
fi

echo ""

# Reload Nginx
echo -e "${BLUE}[4/4] Reloading Nginx...${NC}"
nginx -t || handle_error "Nginx configuration test failed!"
systemctl reload nginx || handle_error "Failed to reload Nginx!"
success "Nginx reloaded successfully!"
echo ""

# Display status
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✓ Deployment Completed!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Service Status:${NC}"
pm2 list
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  Frontend build logs: /var/www/DasaDove/dist/"
echo "  Backend logs: pm2 logs dasadove-backend"
echo ""
echo -e "${YELLOW}Your applications are live at:${NC}"
echo "  Frontend: https://erp.dasadovesystems.co.ke"
echo "  Backend:  https://api.dasadovesystems.co.ke"
echo ""
