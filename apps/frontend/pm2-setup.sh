#!/bin/bash

# PM2 Initial Setup Script for DasaDove Backend
# Run this script once to set up PM2 to manage your backend

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Setting up PM2 for DasaDove Backend...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2 globally...${NC}"
    sudo npm install -g pm2
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install PM2!${NC}"
        exit 1
    fi
fi

# Navigate to backend directory
cd /var/www/DasaDove-backend || {
    echo -e "${RED}Backend directory not found!${NC}"
    exit 1
}

# Stop any existing instance
pm2 delete dasadove-backend 2>/dev/null

# Build the backend
echo -e "${YELLOW}Building backend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Backend build failed!${NC}"
    exit 1
fi

# Start the backend with NestJS production command
echo -e "${YELLOW}Starting backend with PM2...${NC}"
pm2 start dist/src/main.js --name "dasadove-backend"

# Save the PM2 process list
pm2 save

# Setup PM2 to start on system boot
echo -e "${YELLOW}Configuring PM2 to start on boot...${NC}"
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo -e "${GREEN}✓ PM2 setup complete!${NC}"
echo ""
echo -e "${YELLOW}Useful PM2 Commands:${NC}"
echo "  pm2 list              - List all processes"
echo "  pm2 logs              - View all logs"
echo "  pm2 logs dasadove-backend - View backend logs"
echo "  pm2 restart dasadove-backend - Restart backend"
echo "  pm2 stop dasadove-backend - Stop backend"
echo "  pm2 monit             - Monitor processes"
echo ""
