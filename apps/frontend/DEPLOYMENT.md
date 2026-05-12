# DasaDove Deployment Guide

Complete deployment automation for DasaDove ERP system with SSL support.

## 🚀 Quick Deployment

Once configured, deploy all updates with:

```bash
sudo /var/www/deploy.sh
```

**This will automatically:**
- Pull latest code (frontend + backend)
- Install dependencies
- Build applications
- Restart backend service
- Check & renew SSL certificates (if expiring within 30 days)
- Reload Nginx

---

## 📋 Initial Setup (Run Once)

### Step 1: Upload Scripts

Upload these 3 scripts to your server at `/var/www/`:

1. **deploy.sh** - Main deployment script
2. **pm2-setup.sh** - PM2 initial setup
3. **ssl-setup.sh** - SSL certificate setup

```bash
# On your server, make scripts executable
sudo chmod +x /var/www/deploy.sh
sudo chmod +x /var/www/pm2-setup.sh
sudo chmod +x /var/www/ssl-setup.sh
```

### Step 2: Setup PM2 Process Manager

```bash
sudo /var/www/pm2-setup.sh
```

This will:
- Install PM2 globally
- Build your NestJS backend
- Start backend with PM2 (`dist/src/main.js`)
- Configure PM2 to auto-start on server reboot

### Step 3: Setup SSL Certificates

```bash
sudo /var/www/ssl-setup.sh
```

This will:
- Install Certbot if needed
- Obtain SSL certificates for both domains:
  - `erp.dasadovesystems.co.ke`
  - `api.dasadovesystems.co.ke`
- Configure auto-renewal
- Update Nginx to use HTTPS

**Note:** Ensure your domains are pointing to your server IP before running this script.

### Step 4: Verify Setup

```bash
# Check PM2 status
pm2 list
pm2 logs dasadove-backend

# Check SSL certificates
sudo certbot certificates

# Test your applications
curl https://api.dasadovesystems.co.ke/organization/license/POS-3EE35F9FB4AB2E9D
```

---

## 🔄 Regular Deployment Workflow

### 1. Push Code to GitHub

```bash
# On your local machine
git add .
git commit -m "Your update message"
git push origin main
```

### 2. Deploy to Server

```bash
# SSH into your server
ssh root@srv1176712

# Run deployment script
sudo /var/www/deploy.sh
```

### 3. Verify Deployment

Visit your applications:
- **Frontend:** https://erp.dasadovesystems.co.ke
- **Backend API:** https://api.dasadovesystems.co.ke

---

## 🌐 Your Domains

### Frontend: erp.dasadovesystems.co.ke
- **Type:** Angular SPA
- **Location:** `/var/www/DasaDove/dist/DasaDovePos/browser`
- **Build:** `npm run build`
- **Nginx Config:** `/etc/nginx/sites-available/erp.dasadovesystems.co.ke`

### Backend: api.dasadovesystems.co.ke
- **Type:** NestJS API
- **Location:** `/var/www/DasaDove-backend`
- **Port:** 3000 (proxied by Nginx)
- **Build:** `npm run build` → `dist/src/main.js`
- **Process Manager:** PM2
- **Nginx Config:** `/etc/nginx/sites-available/api.dasadovesystems.co.ke`

---

## 📊 Monitoring & Management

### View Backend Logs
```bash
pm2 logs dasadove-backend
pm2 logs dasadove-backend --lines 100
pm2 logs dasadove-backend --err  # Errors only
```

### Monitor Resources
```bash
pm2 monit
```

### Backend Process Management
```bash
pm2 list                      # List all processes
pm2 restart dasadove-backend  # Restart backend
pm2 stop dasadove-backend     # Stop backend
pm2 start dasadove-backend    # Start backend
pm2 delete dasadove-backend   # Remove from PM2
```

### Nginx Management
```bash
sudo nginx -t                 # Test configuration
sudo systemctl status nginx   # Check status
sudo systemctl reload nginx   # Reload config
sudo systemctl restart nginx  # Full restart
```

### SSL Certificate Management
```bash
sudo certbot certificates              # List certificates
sudo certbot renew                     # Manually renew
sudo certbot renew --dry-run           # Test renewal
sudo systemctl status certbot.timer    # Check auto-renewal timer
```

---

## 🔧 Manual Deployment (If Needed)

### Frontend Only
```bash
cd /var/www/DasaDove
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

### Backend Only
```bash
cd /var/www/DasaDove-backend
git pull origin main
npm install
npm run build
pm2 restart dasadove-backend
```

---

## 🛠️ Troubleshooting

### Backend Not Starting

**Check logs:**
```bash
pm2 logs dasadove-backend --err
```

**Common issues:**
- Port 3000 already in use: `sudo lsof -i :3000`
- Build failed: Check `dist/src/main.js` exists
- Environment variables: Check `.env` file

**Restart from scratch:**
```bash
pm2 delete dasadove-backend
cd /var/www/DasaDove-backend
npm run build
pm2 start dist/src/main.js --name "dasadove-backend"
pm2 save
```

### Frontend Not Loading

**Check build output:**
```bash
ls -la /var/www/DasaDove/dist/DasaDovePos/browser/
```

**Check Nginx errors:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Common fix:**
```bash
cd /var/www/DasaDove
npm run build
sudo systemctl reload nginx
```

### SSL Certificate Issues

**Check certificate status:**
```bash
sudo certbot certificates
```

**Renew manually:**
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

**Re-run SSL setup:**
```bash
sudo /var/www/ssl-setup.sh
```

### Deployment Script Fails

**Check git status:**
```bash
cd /var/www/DasaDove
git status
git pull origin main
```

**Check permissions:**
```bash
ls -la /var/www/
sudo chown -R $USER:$USER /var/www/DasaDove*
```

---

## 📁 Server Structure

```
/var/www/
├── deploy.sh                  # Main deployment script
├── pm2-setup.sh              # PM2 setup script
├── ssl-setup.sh              # SSL setup script
├── DasaDove/                 # Frontend (Angular)
│   ├── src/
│   ├── dist/
│   │   └── DasaDovePos/
│   │       └── browser/      # Built files served by Nginx
│   └── package.json
└── DasaDove-backend/         # Backend (NestJS)
    ├── src/
    ├── dist/
    │   └── src/
    │       └── main.js       # PM2 entry point
    └── package.json

/etc/nginx/sites-available/
├── erp.dasadovesystems.co.ke  # Frontend Nginx config
└── api.dasadovesystems.co.ke  # Backend Nginx config

/etc/letsencrypt/live/
├── erp.dasadovesystems.co.ke/ # Frontend SSL certs
└── api.dasadovesystems.co.ke/ # Backend SSL certs
```

---

## 🔐 Security Notes

- Deployment scripts require `sudo` for Nginx reload
- PM2 runs backend as root user
- SSL certificates auto-renew via certbot timer
- Keep GitHub credentials secure (use SSH keys)
- Regularly update system packages: `sudo apt update && sudo apt upgrade`

---

## 📝 Additional Commands

### Update PM2
```bash
sudo npm install -g pm2@latest
pm2 update
```

### View PM2 Startup Script
```bash
pm2 startup
```

### Save Current PM2 Processes
```bash
pm2 save
```

### Clear PM2 Logs
```bash
pm2 flush
```

### Check Disk Space
```bash
df -h
du -sh /var/www/*
```

### Check Memory Usage
```bash
free -h
pm2 monit
```

---

## 🆘 Support Checklist

If something goes wrong:

1. ✅ Check PM2 logs: `pm2 logs dasadove-backend`
2. ✅ Check Nginx config: `sudo nginx -t`
3. ✅ Check process status: `pm2 list`
4. ✅ Check SSL certificates: `sudo certbot certificates`
5. ✅ Check Nginx error logs: `sudo tail -50 /var/log/nginx/error.log`
6. ✅ Verify builds exist:
   - Frontend: `/var/www/DasaDove/dist/DasaDovePos/browser/`
   - Backend: `/var/www/DasaDove-backend/dist/src/main.js`

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Deploy everything | `sudo /var/www/deploy.sh` |
| Setup PM2 (once) | `sudo /var/www/pm2-setup.sh` |
| Setup SSL (once) | `sudo /var/www/ssl-setup.sh` |
| View backend logs | `pm2 logs dasadove-backend` |
| Restart backend | `pm2 restart dasadove-backend` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Check SSL certs | `sudo certbot certificates` |
| Renew SSL | `sudo certbot renew` |

---

**Server:** srv1176712 (Hostinger)
**Frontend:** https://erp.dasadovesystems.co.ke
**Backend:** https://api.dasadovesystems.co.ke
