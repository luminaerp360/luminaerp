#!/bin/bash
set -e

# ============================================================
# Lumina ERP - Server Initial Setup Script
# Run this ONCE on a fresh DigitalOcean droplet
# Usage: bash setup-server.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[SETUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

PROJECT_DIR="/opt/lumina-erp"

echo ""
echo "=============================================="
echo "  Lumina ERP - Server Setup"
echo "=============================================="
echo ""

# 1. System updates
log "Updating system..."
apt update && apt upgrade -y

# 2. Install Docker
if ! command -v docker &> /dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  log "Docker already installed"
fi

# 3. Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
  log "Installing Docker Compose plugin..."
  apt install -y docker-compose-plugin
else
  log "Docker Compose already installed"
fi

# 4. Install Nginx
if ! command -v nginx &> /dev/null; then
  log "Installing Nginx..."
  apt install -y nginx
  systemctl enable nginx
  systemctl start nginx
else
  log "Nginx already installed"
fi

# 5. Install Certbot
if ! command -v certbot &> /dev/null; then
  log "Installing Certbot..."
  apt install -y certbot python3-certbot-nginx
else
  log "Certbot already installed"
fi

# 6. Configure firewall
log "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 7. Install PostgreSQL (if not already installed)
if ! command -v psql &> /dev/null; then
  log "Installing PostgreSQL..."
  apt install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
  warn "PostgreSQL installed. Create your database:"
  echo "  sudo -u postgres psql"
  echo "  CREATE DATABASE lumina_pos_db;"
  echo "  CREATE USER lumina_pos_user WITH ENCRYPTED PASSWORD 'YourPassword';"
  echo "  GRANT ALL PRIVILEGES ON DATABASE lumina_pos_db TO lumina_pos_user;"
  echo "  \\c lumina_pos_db"
  echo "  GRANT ALL ON SCHEMA public TO lumina_pos_user;"
  echo "  ALTER USER lumina_pos_user CREATEDB;"
  echo "  \\q"
else
  log "PostgreSQL already installed"
fi

# 8. Generate SSH deploy key for GitHub
if [ ! -f /root/.ssh/github_deploy_key ]; then
  log "Generating GitHub deploy key..."
  ssh-keygen -t ed25519 -f /root/.ssh/github_deploy_key -N "" -C "lumina-erp-deploy"
  
  # Configure SSH to use this key for GitHub
  cat >> /root/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/github_deploy_key
  IdentitiesOnly yes
EOF
  chmod 600 /root/.ssh/config

  echo ""
  warn "Add this deploy key to your GitHub repo:"
  warn "Go to: GitHub Repo → Settings → Deploy keys → Add deploy key"
  echo ""
  cat /root/.ssh/github_deploy_key.pub
  echo ""
  read -p "Press Enter after adding the deploy key to GitHub..."
else
  log "GitHub deploy key already exists"
fi

# 9. Clone repository
if [ ! -d "$PROJECT_DIR" ]; then
  log "Cloning repository..."
  git clone git@github.com:shaphankirui/Lumina-erp.git "$PROJECT_DIR"
else
  log "Repository already cloned at $PROJECT_DIR"
  cd "$PROJECT_DIR"
  git pull origin main
fi

cd "$PROJECT_DIR"

# 10. Create backend .env if not exists
if [ ! -f "$PROJECT_DIR/apps/backend/.env" ]; then
  warn "Creating backend .env file..."
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  cat > "$PROJECT_DIR/apps/backend/.env" << EOF
# Database
DATABASE_URL="postgresql://lumina_pos_user:YOUR_PASSWORD@localhost:5432/lumina_pos_db"

# JWT
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=production

# SMTP (optional)
SMTP_HOST=mail.dasadovesystems.co.ke
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@dasadovesystems.co.ke
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
SMTP_FROM_EMAIL=no-reply@dasadovesystems.co.ke
EOF
  warn "Edit the .env file with your actual credentials:"
  warn "  nano $PROJECT_DIR/apps/backend/.env"
  read -p "Press Enter after editing .env..."
else
  log "Backend .env already exists"
fi

# 11. Setup Nginx configs
log "Setting up Nginx configs..."

# Copy nginx configs
cp "$PROJECT_DIR/deploy/nginx-backend.conf" /etc/nginx/sites-available/lumina-backend
cp "$PROJECT_DIR/deploy/nginx-frontend.conf" /etc/nginx/sites-available/lumina-frontend

# Create initial upstream configs (default to blue)
cat > /etc/nginx/conf.d/lumina-backend-upstream.conf << 'EOF'
upstream lumina_backend {
    server 127.0.0.1:3001;
}
EOF

cat > /etc/nginx/conf.d/lumina-frontend-upstream.conf << 'EOF'
upstream lumina_frontend {
    server 127.0.0.1:4001;
}
EOF

# Enable sites
ln -sf /etc/nginx/sites-available/lumina-backend /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/lumina-frontend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx
if nginx -t 2>/dev/null; then
  systemctl reload nginx
  log "Nginx configured successfully"
else
  error "Nginx config test failed. Check your SSL certificates."
  warn "If SSL not yet set up, run certbot first:"
  echo "  certbot --nginx -d erp.lumina360.tech"
  echo "  certbot --nginx -d api.lumina360.tech"
fi

# 12. Create deploy state directory
mkdir -p "$PROJECT_DIR/deploy"
chmod +x "$PROJECT_DIR/deploy/deploy.sh"

# 13. Login to GitHub Container Registry
log "You need to login to GitHub Container Registry."
warn "Create a Personal Access Token at: https://github.com/settings/tokens"
warn "Select scopes: read:packages, write:packages"
echo ""
read -p "Enter your GitHub username: " GH_USER
read -sp "Enter your GitHub Personal Access Token: " GH_TOKEN
echo ""
echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin

# 14. Initial deploy
log "Running initial deployment..."
cd "$PROJECT_DIR"
bash deploy/deploy.sh

echo ""
echo "=============================================="
log "Server setup complete!"
echo "=============================================="
echo ""
echo "Your Lumina ERP is now deployed with blue/green zero-downtime!"
echo ""
echo "Commands:"
echo "  cd /opt/lumina-erp"
echo "  bash deploy/deploy.sh              # Deploy all"
echo "  bash deploy/deploy.sh backend      # Deploy backend only"
echo "  bash deploy/deploy.sh frontend     # Deploy frontend only"
echo "  bash deploy/deploy.sh rollback     # Rollback"
echo "  bash deploy/deploy.sh status       # Check status"
echo ""
echo "Domains:"
echo "  Frontend: https://erp.lumina360.tech"
echo "  Backend:  https://api.lumina360.tech"
echo ""
