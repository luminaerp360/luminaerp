# Deployment Instructions - Updated Configuration

## Changes Made

1. **Updated `ecosystem.config.js`** - Removed admin app (now in separate repo)
2. **Frontend `server.js`** - Already correct and serving on port 8080
3. **Admin app** - Runs independently from `/var/www/lumina-admin` on port 8081

## Deployment Steps on VPS

### Step 1: Push Changes to GitHub

```bash
# On your local machine (Windows)
cd C:\Users\Hp\Desktop\stockify\Lumina-erp

git add ecosystem.config.js
git commit -m "Update ecosystem config - remove admin app reference"
git push origin main
```

### Step 2: Deploy Main ERP Project

```bash
# SSH into your VPS
ssh root@your_vps_ip

# Navigate to main project
cd /var/www/Lumina-erp

# Pull latest changes
git pull origin main

# Run deployment script
./deploy.sh

# Or manually:
# pnpm install
# pnpm build
# pm2 reload ecosystem.config.js --update-env
```

### Step 3: Verify Services

```bash
# Check PM2 status
pm2 list

# You should see:
# - lumina-backend (port 3000)
# - lumina-frontend (port 8080)
# - lumina-admin (port 8081) - managed separately

# Check logs
pm2 logs --lines 20

# Test each service
curl -I http://localhost:3000/health  # Backend
curl -I http://localhost:8080  # Main ERP Frontend
curl -I http://localhost:8081  # Admin Portal
```

### Step 4: Test Domains

```bash
# Test all domains
curl -I https://api.lumina360.tech/health
curl -I https://erp.lumina360.tech
curl -I https://admin.lumina360.tech
```

### Step 5: Setup SSL for ERP Frontend (if not done)

```bash
# Run Certbot for main ERP domain
sudo certbot --nginx -d erp.lumina360.tech

# Follow prompts, choose to redirect HTTP to HTTPS
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DigitalOcean VPS                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │              Nginx (Ports 80/443)              │     │
│  │  - api.lumina360.tech    → Port 3000          │     │
│  │  - erp.lumina360.tech    → Port 8080          │     │
│  │  - admin.lumina360.tech  → Port 8081          │     │
│  └────────────────────────────────────────────────┘     │
│                          ↓                                │
│  ┌────────────────────────────────────────────────┐     │
│  │               PM2 Process Manager              │     │
│  ├────────────────────────────────────────────────┤     │
│  │  lumina-backend    (Port 3000) - NestJS API   │     │
│  │  lumina-frontend   (Port 8080) - Angular ERP  │     │
│  │  lumina-admin      (Port 8081) - Angular Admin│     │
│  └────────────────────────────────────────────────┘     │
│                          ↓                                │
│  ┌────────────────────────────────────────────────┐     │
│  │             PostgreSQL Database                │     │
│  │             Redis Cache (optional)             │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Project Locations on VPS

```
/var/www/
├── Lumina-erp/              # Main monorepo
│   ├── apps/
│   │   ├── backend/         # NestJS API (Port 3000)
│   │   └── frontend/        # Angular ERP (Port 8080)
│   ├── ecosystem.config.js  # PM2 config for backend + frontend
│   └── deploy.sh
│
└── lumina-admin/            # Separate admin repo
    ├── ecosystem.config.js  # PM2 config for admin
    ├── server.js            # Express server (Port 8081)
    └── deploy.sh
```

## Troubleshooting

### If Backend API Not Responding

```bash
# Check backend logs
pm2 logs lumina-backend --lines 50

# Check if running
curl http://localhost:3000/health

# Restart backend
pm2 restart lumina-backend

# Check environment variables
cat /var/www/Lumina-erp/apps/backend/.env
```

### If Frontend Not Loading

```bash
# Check if files are built
ls -la /var/www/Lumina-erp/apps/frontend/dist/DasaDovePos/browser

# Check frontend logs
pm2 logs lumina-frontend --lines 30

# Rebuild if needed
cd /var/www/Lumina-erp/apps/frontend
pnpm run build
pm2 restart lumina-frontend
```

### If Admin Not Loading

```bash
# Navigate to admin project
cd /var/www/lumina-admin

# Pull latest changes
git pull origin main

# Rebuild and restart
pnpm install
pnpm run build
pm2 restart lumina-admin
```

### Check Nginx Configuration

```bash
# Test nginx config
sudo nginx -t

# View configs
cat /etc/nginx/sites-available/lumina-backend
cat /etc/nginx/sites-available/lumina-frontend
cat /etc/nginx/sites-available/lumina-admin

# Reload nginx
sudo systemctl reload nginx
```

## Quick Commands Reference

```bash
# PM2 Management
pm2 list                    # List all apps
pm2 logs                    # View all logs
pm2 logs [app-name]         # View specific app logs
pm2 restart [app-name]      # Restart specific app
pm2 restart all             # Restart all apps
pm2 reload ecosystem.config.js --update-env  # Reload with new config
pm2 save                    # Save current process list
pm2 monit                   # Monitor resources

# Nginx
sudo nginx -t               # Test configuration
sudo systemctl reload nginx # Reload nginx
sudo systemctl status nginx # Check status

# SSL Certificates
sudo certbot --nginx -d domain.com
sudo certbot certificates   # List certificates
sudo certbot renew         # Renew certificates

# Git Operations
git pull origin main       # Pull latest changes
git status                 # Check status
git log --oneline -5       # View recent commits
```

## Expected Result After Deployment

✅ **Backend API**: `https://api.lumina360.tech` - Serving API requests
✅ **Main ERP**: `https://erp.lumina360.tech` - Main application
✅ **Admin Portal**: `https://admin.lumina360.tech` - Admin dashboard

All three should be running independently with proper SSL certificates.

## Notes

- Admin app is now in a separate repository (`lumina-admin`)
- Main project (`Lumina-erp`) only manages backend + frontend
- Both projects use separate PM2 ecosystem configs
- Both projects can be deployed independently using their own `deploy.sh` scripts

---

**Last Updated**: January 28, 2026
