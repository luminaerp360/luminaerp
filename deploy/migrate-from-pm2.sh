#!/bin/bash
set -e

echo "=== Step 1: Stop PM2 ==="
pm2 stop all || true
pm2 delete all || true

echo "=== Step 2: Copy project ==="
cp -r /var/www/Lumina-erp /opt/lumina-erp

echo "=== Step 3: Pull latest code ==="
cd /opt/lumina-erp
git pull origin main

echo "=== Step 4: Setup Nginx upstreams ==="
cat > /etc/nginx/conf.d/lumina-backend-upstream.conf << 'UPEOF'
upstream lumina_backend {
    server 127.0.0.1:3001;
}
UPEOF

cat > /etc/nginx/conf.d/lumina-frontend-upstream.conf << 'UPEOF'
upstream lumina_frontend {
    server 127.0.0.1:4001;
}
UPEOF

echo "=== Step 5: Copy Nginx site configs ==="
cp /opt/lumina-erp/deploy/nginx-backend.conf /etc/nginx/sites-available/lumina-backend
cp /opt/lumina-erp/deploy/nginx-frontend.conf /etc/nginx/sites-available/lumina-frontend
ln -sf /etc/nginx/sites-available/lumina-backend /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/lumina-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo "=== Step 6: Make deploy script executable ==="
chmod +x /opt/lumina-erp/deploy/deploy.sh

echo ""
echo "=== SETUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Run: docker login ghcr.io -u shaphankirui"
echo "   (Use GitHub Personal Access Token as password)"
echo "   Get token at: https://github.com/settings/tokens"
echo "   Select scopes: read:packages + write:packages"
echo ""
echo "2. Run: cd /opt/lumina-erp && bash deploy/deploy.sh"
