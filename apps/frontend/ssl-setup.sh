#!/bin/bash

# SSL Certificate Setup Script for DasaDove
# This script sets up SSL certificates for both frontend and backend domains

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}DasaDove SSL Certificate Setup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo ./ssl-setup.sh${NC}"
    exit 1
fi

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

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    info "Certbot not found. Installing certbot..."
    apt update || handle_error "Failed to update package list!"
    apt install certbot python3-certbot-nginx -y || handle_error "Failed to install certbot!"
    success "Certbot installed successfully!"
else
    success "Certbot is already installed!"
fi

echo ""
echo -e "${BLUE}[1/3] Setting up SSL for Frontend (erp.dasadovesystems.co.ke)${NC}"
info "Obtaining SSL certificate..."

# Get SSL certificate for frontend
certbot --nginx -d erp.dasadovesystems.co.ke -d www.erp.dasadovesystems.co.ke --non-interactive --agree-tos --email admin@dasadovesystems.co.ke --redirect

if [ $? -eq 0 ]; then
    success "Frontend SSL certificate obtained successfully!"
else
    echo -e "${RED}Failed to obtain frontend SSL certificate. Please check:${NC}"
    echo "  1. Domain DNS is pointing to this server"
    echo "  2. Port 80 and 443 are open"
    echo "  3. Nginx is running"
fi

echo ""
echo -e "${BLUE}[2/3] Setting up SSL for Backend (api.dasadovesystems.co.ke)${NC}"
info "Obtaining SSL certificate..."

# Get SSL certificate for backend
certbot --nginx -d api.dasadovesystems.co.ke -d www.api.dasadovesystems.co.ke --non-interactive --agree-tos --email admin@dasadovesystems.co.ke --redirect

if [ $? -eq 0 ]; then
    success "Backend SSL certificate obtained successfully!"
else
    echo -e "${RED}Failed to obtain backend SSL certificate. Please check:${NC}"
    echo "  1. Domain DNS is pointing to this server"
    echo "  2. Port 80 and 443 are open"
    echo "  3. Nginx is running"
fi

echo ""
echo -e "${BLUE}[3/3] Setting up automatic SSL renewal${NC}"
info "Testing automatic renewal..."

# Test automatic renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    success "Automatic SSL renewal configured successfully!"
    echo ""
    info "Certificates will auto-renew before expiration"
else
    echo -e "${YELLOW}Warning: Automatic renewal test failed. You may need to renew manually.${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✓ SSL Setup Complete!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Your secure URLs:${NC}"
echo "  Frontend: https://erp.dasadovesystems.co.ke"
echo "  Backend:  https://api.dasadovesystems.co.ke"
echo ""
echo -e "${YELLOW}Certificate locations:${NC}"
echo "  /etc/letsencrypt/live/erp.dasadovesystems.co.ke/"
echo "  /etc/letsencrypt/live/api.dasadovesystems.co.ke/"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  sudo certbot certificates       - List all certificates"
echo "  sudo certbot renew             - Manually renew certificates"
echo "  sudo certbot renew --dry-run   - Test renewal process"
echo ""
