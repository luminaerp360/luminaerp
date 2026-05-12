# Lumina ERP - Quick Deployment Steps for lumina360.tech

**Domains:**

- Frontend: https://erp.lumina360.tech
- Backend API: https://api.lumina360.tech

---

## Part 1: Configure DNS in DigitalOcean (Do This First!)

### 1. Add Domain to DigitalOcean

1. Log into DigitalOcean
2. Go to **Networking** → **Domains**
3. Enter `lumina360.tech` → Click **Add Domain**
4. Select your droplet

### 2. Add DNS Records

Add these A records (replace `YOUR_DROPLET_IP` with your actual IP):

| Type | Hostname | Will Direct To     | Value           | TTL  |
| ---- | -------- | ------------------ | --------------- | ---- |
| A    | erp      | erp.lumina360.tech | YOUR_DROPLET_IP | 3600 |
| A    | api      | api.lumina360.tech | YOUR_DROPLET_IP | 3600 |
| A    | @        | lumina360.tech     | YOUR_DROPLET_IP | 3600 |

**Wait 5-10 minutes** for DNS propagation.

### 3. Verify DNS is Working

On your local machine, test:

```bash
ping erp.lumina360.tech
ping api.lumina360.tech
```

Both should resolve to your droplet IP.

---

## Part 2: Deploy on DigitalOcean Droplet

### Step 1: Connect to Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 2: Install Prerequisites (if not done)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm@8.15.0

# Install PM2
npm install -g pm2

# Install PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Install Nginx
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

### Step 3: Setup PostgreSQL Database

```bash
sudo -u postgres psql
```

Inside PostgreSQL, run:

```sql
CREATE DATABASE lumina_erp;
CREATE USER lumina_user WITH ENCRYPTED PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE lumina_erp TO lumina_user;
\c lumina_erp
GRANT ALL ON SCHEMA public TO lumina_user;
\q
```

**Save this connection string:**

```
postgresql://lumina_user:YourSecurePassword123!@localhost:5432/lumina_erp
```

### Step 4: Clone Repository

```bash
cd /var/www
git clone git@github.com:shaphankirui/Lumina-erp.git
cd Lumina-erp
```

### Step 5: Setup Environment Variables

```bash
cd /var/www/Lumina-erp/apps/backend
cp .env.example .env
nano .env
```

Update with your values:

```env
DATABASE_URL="postgresql://lumina_user:YourSecurePassword123!@localhost:5432/lumina_erp"
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
```

**Generate a secure JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save and exit (Ctrl+X, then Y, then Enter).

### Step 6: Run Deployment Script

```bash
cd /var/www/Lumina-erp
git pull origin main
chmod +x deploy.sh
./deploy.sh
```

This will:

- Install all dependencies
- Build backend and frontend
- Run database migrations
- Copy Nginx configs
- Start apps with PM2

**If backend fails to start with "Script not found" error:**

```bash
cd /var/www/Lumina-erp
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Step 7: Enable Nginx Sites

```bash
# Enable backend
ln -s /etc/nginx/sites-available/lumina-backend /etc/nginx/sites-enabled/

# Enable frontend
ln -s /etc/nginx/sites-available/lumina-frontend /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 8: Verify Apps are Running

```bash
# Check PM2
pm2 list

# Check logs
pm2 logs

# Test backend
curl http://localhost:3000/health

# Test frontend
curl http://localhost:8080/health
```

### Step 9: Test in Browser (HTTP - Before SSL)

Visit:

- http://erp.lumina360.tech
- http://api.lumina360.tech

If they work, proceed to add SSL.

### Step 10: Setup SSL (HTTPS)

```bash
# For frontend
certbot --nginx -d erp.lumina360.tech

# For backend API
certbot --nginx -d api.lumina360.tech
```

Follow the prompts:

- Enter your email
- Agree to terms
- Choose: Redirect HTTP to HTTPS (option 2)

### Step 11: Verify HTTPS Works

Visit:

- https://erp.lumina360.tech ✅
- https://api.lumina360.tech ✅

---

## Part 3: Update Angular to Use Production API

### Option 1: Update Environment File (Before Building)

If you have `apps/frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: "https://api.lumina360.tech",
};
```

Then rebuild:

```bash
cd /var/www/Lumina-erp/apps/frontend
pnpm run build
pm2 restart lumina-frontend
```

### Option 2: If Using Configuration Service

Update wherever your API URL is configured to:

```
https://api.lumina360.tech
```

---

## Useful Commands

### PM2

```bash
pm2 list                    # List apps
pm2 logs                    # View all logs
pm2 logs lumina-backend     # Backend logs only
pm2 logs lumina-frontend    # Frontend logs only
pm2 restart all             # Restart all apps
pm2 monit                   # Monitor resources
```

### Nginx

```bash
nginx -t                    # Test config
systemctl reload nginx      # Reload
tail -f /var/log/nginx/error.log
```

### Database

```bash
sudo -u postgres psql
psql -U lumina_user -d lumina_erp
```

### Update App

```bash
cd /var/www/Lumina-erp
git pull
pnpm install
cd apps/backend && pnpm run build
cd ../frontend && pnpm run build
pm2 restart all
```

---

## Troubleshooting

### DNS Not Resolving

- Wait 10-15 minutes for DNS propagation
- Check nameservers at your domain registrar point to DigitalOcean:
  - ns1.digitalocean.com
  - ns2.digitalocean.com
  - ns3.digitalocean.com

### 502 Bad Gateway

```bash
# Check if apps are running
pm2 list

# Check logs
pm2 logs

# Restart apps
pm2 restart all
```

### SSL Certificate Failed

- Ensure DNS is working first (ping erp.lumina360.tech)
- Make sure port 80 and 443 are open: `ufw status`
- Try again: `certbot --nginx -d erp.lumina360.tech`

### Database Connection Failed

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U lumina_user -d lumina_erp

# Check .env file has correct DATABASE_URL
cat /var/www/Lumina-erp/apps/backend/.env
```

---

## Summary

1. ✅ DNS configured in DigitalOcean
2. ✅ Repository cloned
3. ✅ Database created
4. ✅ Environment variables set
5. ✅ Apps built and deployed
6. ✅ Nginx configured
7. ✅ SSL certificates installed
8. ✅ Apps accessible at:
   - https://erp.lumina360.tech
   - https://api.lumina360.tech

**Your Lumina ERP is now live! 🚀**
