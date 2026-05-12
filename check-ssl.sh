#!/bin/bash

# SSL Diagnostic Script for Lumina ERP
# Run this on your server to check SSL configuration

echo "======================================"
echo "SSL Configuration Check"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Checking Nginx Configuration Files:${NC}"
echo "--------------------------------------"
ls -la /etc/nginx/sites-available/ | grep lumina
echo ""

echo -e "${YELLOW}2. Checking Enabled Nginx Sites:${NC}"
echo "--------------------------------------"
ls -la /etc/nginx/sites-enabled/ | grep lumina
echo ""

echo -e "${YELLOW}3. Checking Nginx Backend Configuration:${NC}"
echo "--------------------------------------"
if [ -f /etc/nginx/sites-available/lumina-backend ]; then
    cat /etc/nginx/sites-available/lumina-backend
else
    echo -e "${RED}lumina-backend config not found${NC}"
fi
echo ""

echo -e "${YELLOW}4. Checking Nginx Frontend Configuration:${NC}"
echo "--------------------------------------"
if [ -f /etc/nginx/sites-available/lumina-frontend ]; then
    cat /etc/nginx/sites-available/lumina-frontend
else
    echo -e "${RED}lumina-frontend config not found${NC}"
fi
echo ""

echo -e "${YELLOW}5. Checking SSL Certificates:${NC}"
echo "--------------------------------------"
ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "No Let's Encrypt certificates found"
echo ""

echo -e "${YELLOW}6. Testing Nginx Configuration:${NC}"
echo "--------------------------------------"
nginx -t
echo ""

echo -e "${YELLOW}7. Checking Nginx Status:${NC}"
echo "--------------------------------------"
systemctl status nginx --no-pager -l
echo ""

echo -e "${YELLOW}8. Checking Certbot:${NC}"
echo "--------------------------------------"
certbot certificates 2>/dev/null || echo "Certbot not installed or no certificates"
echo ""

echo -e "${YELLOW}9. Checking Port 443 (HTTPS):${NC}"
echo "--------------------------------------"
netstat -tulpn | grep :443 || ss -tulpn | grep :443
echo ""

echo -e "${YELLOW}10. Checking Port 80 (HTTP):${NC}"
echo "--------------------------------------"
netstat -tulpn | grep :80 || ss -tulpn | grep :80
echo ""

echo "======================================"
echo "Quick Fixes:"
echo "======================================"
echo ""
echo "If SSL is not working:"
echo ""
echo "1. Install Certbot (if not installed):"
echo "   sudo apt update"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo ""
echo "2. Obtain SSL certificate:"
echo "   sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com"
echo ""
echo "3. Test auto-renewal:"
echo "   sudo certbot renew --dry-run"
echo ""
echo "4. Force HTTPS redirect in Nginx config"
echo ""
