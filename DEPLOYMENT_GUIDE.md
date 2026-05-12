# Lumina ERP - DigitalOcean Deployment Guide

Complete guide for deploying the Lumina ERP monorepo (NestJS + Angular + PostgreSQL) to DigitalOcean.

---

## Prerequisites

- DigitalOcean Droplet (Ubuntu 20.04/22.04 LTS recommended, minimum 2GB RAM)
- Domain name (optional but recommended for production)
- SSH access to your droplet
- Git repository access

---

## Step 1: Initial Server Setup

### 1.1 Connect to your droplet

```bash
ssh root@your_droplet_ip
```

### 1.2 Update system

```bash
apt update && apt upgrade -y
```

### 1.3 Install essential tools

```bash
apt install -y curl wget git build-essential ufw
```

### 1.4 Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v20.x.x
npm --version
```

### 1.5 Install pnpm (required for this monorepo)

```bash
npm install -g pnpm@8.15.0
```

### 1.6 Install PM2 (Process Manager)

```bash
npm install -g pm2
```

### 1.7 Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 1.8 Install Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 1.9 Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

### 1.10 Install SSL (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
```

---

## Step 2: Setup PostgreSQL Database

### 2.1 Create database and user

```bash
sudo -u postgres psql
```

Inside PostgreSQL shell:
```sql
-- Create database
CREATE DATABASE lumina_erp;

-- Create user with password
CREATE USER lumina_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE lumina_erp TO lumina_user;

-- Connect to database and grant schema privileges
\c lumina_erp
GRANT ALL ON SCHEMA public TO lumina_user;

-- Exit
\q
```

### 2.2 Note your connection string

```
postgresql://lumina_user:your_secure_password_here@localhost:5432/lumina_erp
```

**Save this! You'll need it for the .env file.**

---

## Step 3: Deploy the Application

### 3.1 Clone repository

```bash
cd /var/www
git clone https://github.com/shaphankirui/Lumina-erp.git
cd Lumina-erp
```

### 3.2 Create backend environment file

```bash
cd /var/www/Lumina-erp/apps/backend
cp .env.example .env
nano .env
```

Update the `.env` file with your values:
```env
DATABASE_URL="postgresql://lumina_user:your_secure_password_here@localhost:5432/lumina_erp"
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random
JWT_EXPIRES_IN=7d
```

**Important:** Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 Run automated deployment

```bash
cd /var/www/Lumina-erp
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Install all dependencies with pnpm
- Build both backend and frontend
- Run Prisma migrations
- Setup PM2 configuration
- Copy Nginx configurations

---

## Step 4: Configure Nginx

### 4.1 Edit backend Nginx config

```bash
nano /etc/nginx/sites-available/lumina-backend
```

Update `server_name` with your API domain:
```nginx
server_name api.yourdomain.com;  # Replace with your actual domain
```

### 4.2 Edit frontend Nginx config

```bash
nano /etc/nginx/sites-available/lumina-frontend
```

Update `server_name` with your domain:
```nginx
server_name yourdomain.com www.yourdomain.com;  # Replace with your actual domain
```

**Note:** If you don't have a domain yet, you can use your droplet's IP address temporarily:
```nginx
server_name your_droplet_ip;
```

### 4.3 Enable sites

```bash
ln -s /etc/nginx/sites-available/lumina-backend /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/lumina-frontend /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## Step 5: Verify Deployment

### 5.1 Check PM2 status

```bash
pm2 list
```

You should see:
- `lumina-backend` - status: online
- `lumina-frontend` - status: online

### 5.2 Check logs

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs lumina-backend
pm2 logs lumina-frontend
```

### 5.3 Test the applications

**Backend API:**
```bash
curl http://localhost:3000/health
```

**Frontend:**
```bash
curl http://localhost:8080/health
```

**From browser:**
- Frontend: `http://your_droplet_ip`
- Backend API: `http://your_droplet_ip:3000` (if you haven't configured Nginx with domain yet)

---

## Step 6: Setup SSL (HTTPS) - For Production

**Prerequisites:** Your domain DNS must be pointing to your droplet's IP address.

### 6.1 Wait for DNS propagation

Check if your domain resolves:
```bash
ping yourdomain.com
ping api.yourdomain.com
```

### 6.2 Obtain SSL certificates

```bash
# For frontend
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# For backend API
certbot --nginx -d api.yourdomain.com
```

Follow the prompts. Certbot will automatically:
- Obtain certificates
- Update Nginx configurations
- Setup auto-renewal

### 6.3 Verify auto-renewal

```bash
certbot renew --dry-run
```

---

## Step 7: Update Your Angular App API URL

After deployment, update your Angular app to point to the production API:

```bash
nano /var/www/Lumina-erp/apps/frontend/src/environments/environment.prod.ts
```

Or if using a configuration file, update the API URL to:
```typescript
apiUrl: 'https://api.yourdomain.com'  // or http://your_droplet_ip:3000
```

Then rebuild and restart:
```bash
cd /var/www/Lumina-erp/apps/frontend
pnpm run build
pm2 restart lumina-frontend
```

---

## Useful Commands

### PM2 (Process Management)

```bash
pm2 list                    # List all running apps
pm2 logs                    # View all logs
pm2 logs lumina-backend     # View backend logs
pm2 logs lumina-frontend    # View frontend logs
pm2 restart all             # Restart all apps
pm2 restart lumina-backend  # Restart specific app
pm2 stop all                # Stop all apps
pm2 monit                   # Monitor CPU/Memory usage
pm2 save                    # Save current process list
```

### PostgreSQL

```bash
sudo -u postgres psql                        # Access PostgreSQL CLI
psql -U lumina_user -d lumina_erp            # Connect to your database
sudo systemctl status postgresql             # Check PostgreSQL status
sudo systemctl restart postgresql            # Restart PostgreSQL
```

### Nginx

```bash
nginx -t                            # Test configuration
systemctl status nginx              # Check status
systemctl reload nginx              # Reload configuration
systemctl restart nginx             # Restart Nginx
tail -f /var/log/nginx/error.log    # View error logs
tail -f /var/log/nginx/access.log   # View access logs
```

### Firewall

```bash
ufw status                  # Check firewall status
ufw allow 3000              # Allow port if needed
ufw delete allow 3000       # Remove port rule
```

### System Monitoring

```bash
htop                        # Interactive process viewer
df -h                       # Disk usage
free -h                     # Memory usage
```

---

## Updating Your Application

### Quick Update (Pull latest changes)

```bash
cd /var/www/Lumina-erp
git pull origin main  # or your branch name
pnpm install
```

### Update Backend

```bash
cd /var/www/Lumina-erp/apps/backend
pnpm run build
pnpm exec prisma migrate deploy  # If there are new migrations
pm2 restart lumina-backend
```

### Update Frontend

```bash
cd /var/www/Lumina-erp/apps/frontend
pnpm run build
pm2 restart lumina-frontend
```

### Full Redeployment

```bash
cd /var/www/Lumina-erp
./deploy.sh
```

---

## Troubleshooting

### Backend not starting

1. Check logs:
```bash
pm2 logs lumina-backend --lines 50
```

2. Common issues:
   - Database connection failed → Check DATABASE_URL in .env
   - Port already in use → Check if another process is using port 3000
   - Missing dependencies → Run `pnpm install`

3. Restart:
```bash
pm2 restart lumina-backend
```

### Frontend not loading

1. Check if files are built:
```bash
ls -la /var/www/Lumina-erp/apps/frontend/dist/DasaDovePos/browser
```

2. Check logs:
```bash
pm2 logs lumina-frontend
```

3. Rebuild:
```bash
cd /var/www/Lumina-erp/apps/frontend
pnpm run build
pm2 restart lumina-frontend
```

### Database connection issues

1. Check PostgreSQL status:
```bash
systemctl status postgresql
```

2. Test connection:
```bash
psql -U lumina_user -d lumina_erp
```

3. Check pg_hba.conf if connection refused:
```bash
nano /etc/postgresql/*/main/pg_hba.conf
```

### Nginx 502 Bad Gateway

1. Check if apps are running:
```bash
pm2 list
```

2. Check Nginx error logs:
```bash
tail -f /var/log/nginx/error.log
```

3. Verify ports in Nginx config match PM2 ports (3000 for backend, 8080 for frontend)

### SSL Certificate Issues

1. Renew certificates manually:
```bash
certbot renew
```

2. Check certificate status:
```bash
certbot certificates
```

---

## Security Best Practices

1. **Change default passwords**
   - PostgreSQL password
   - Create non-root user for SSH

2. **Use environment variables for all secrets**
   - Never commit .env files
   - Use strong JWT_SECRET

3. **Enable SSL/HTTPS**
   - Use Let's Encrypt certificates
   - Redirect HTTP to HTTPS

4. **Keep system updated**
```bash
apt update && apt upgrade -y
```

5. **Setup fail2ban** (optional but recommended)
```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

6. **Regular backups**

Database backup:
```bash
pg_dump -U lumina_user lumina_erp > backup_$(date +%Y%m%d).sql
```

Restore:
```bash
psql -U lumina_user lumina_erp < backup_20240101.sql
```

7. **Monitor logs regularly**
```bash
pm2 logs
tail -f /var/log/nginx/error.log
```

---

## Performance Optimization

### Enable PM2 Cluster Mode (for better performance)

Edit [ecosystem.config.js](ecosystem.config.js):
```javascript
instances: 'max',  // or specific number like 2, 4
exec_mode: 'cluster'
```

Then:
```bash
pm2 reload all
```

### Enable Nginx Caching

Already configured in [nginx-frontend.conf](nginx-frontend.conf) for static assets.

### Monitor Application

```bash
pm2 monit
```

---

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 and Nginx logs
3. Ensure all environment variables are set correctly
4. Verify database connection

---

**Deployment completed! Your Lumina ERP is now live! 🎉**
