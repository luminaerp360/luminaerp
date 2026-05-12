# VPS Migration — Move to luminaerp360/luminaerp

Run these commands on the VPS. Docker and Nginx are already installed.

---

## Step 1 — Stop & Remove Old Lumina ERP Deployment

```bash
cd /opt/lumina-erp

# Stop any running containers for this project
docker compose -f deploy/docker-compose.blue.yml stop 2>/dev/null || true
docker compose -f deploy/docker-compose.green.yml stop 2>/dev/null || true
docker compose -f deploy/docker-compose.blue.yml down 2>/dev/null || true
docker compose -f deploy/docker-compose.green.yml down 2>/dev/null || true

# Remove old images from old org (shaphankirui)
docker rmi ghcr.io/shaphankirui/lumina-backend:latest 2>/dev/null || true
docker rmi ghcr.io/shaphankirui/lumina-frontend:latest 2>/dev/null || true
docker image prune -f

# Stop PM2 processes for this project (if any still running from old setup)
pm2 delete lumina-backend 2>/dev/null || true
pm2 delete lumina-frontend 2>/dev/null || true
pm2 save 2>/dev/null || true
```

---

## Step 2 — Update Git Remote to New Repo

```bash
cd /opt/lumina-erp

# Verify current remote
git remote -v

# Update remote to new org
git remote set-url origin git@github.com:luminaerp360/luminaerp.git

# Pull latest code
git pull origin main
```

> **If git pull fails** (unrelated histories or repo was replaced):
>
> ```bash
> cd /opt
> rm -rf lumina-erp
> git clone git@github.com:luminaerp360/luminaerp.git lumina-erp
> cd lumina-erp
> ```

---

## Step 3 — Update .env on VPS

```bash
cat > /opt/lumina-erp/apps/backend/.env << 'EOF'
NODE_ENV=production
PORT=3000

# PostgreSQL (DigitalOcean Managed — use the cloud URL in production)
DATABASE_URL="postgresql://doadmin:AVNS_aRaQKWah4A2MmUVYmzS@db-postgresql-nyc3-93484-do-user-19339309-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

JWT_SECRET=FvatoypE6BfnRZ1djLjUQMYrlEI27UJg3LbeVXn4NEqttK2eR1lucVNvvSAOCaJkWFWanqb2qm6EleTFJY6VSw==

GOOGLE_CALLBACK_URL=https://api.lumina360.tech/auth/google/callback
GOOGLE_CLIENT_ID=6248676327-itp4mvpcuiqv9nuuf4l6oupgg44bhb5m.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=luminaerp360@gmail.com
SMTP_PASSWORD=uloh bcxz vqgf stgt
SMTP_FROM_EMAIL=luminaerp360@gmail.com
EOF
```

---

## Step 4 — Install Nginx Deploy Configs

```bash
cd /opt/lumina-erp

# Copy upstream config (managed by deploy.sh)
cp deploy/nginx-upstream.conf /etc/nginx/conf.d/lumina-upstream.conf

# Copy static server blocks
cp deploy/nginx-backend.conf /etc/nginx/sites-available/api.lumina360.tech
cp deploy/nginx-frontend.conf /etc/nginx/sites-available/erp.lumina360.tech

# Enable sites (remove old symlinks first if they exist)
rm -f /etc/nginx/sites-enabled/api.lumina360.tech
rm -f /etc/nginx/sites-enabled/erp.lumina360.tech
ln -sf /etc/nginx/sites-available/api.lumina360.tech /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/erp.lumina360.tech /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx
```

---

## Step 5 — Authenticate Docker to GHCR (new org)

Generate a GitHub PAT at https://github.com/settings/tokens with **only** `read:packages` scope.

```bash
# Replace <YOUR_GHCR_READ_PAT> with the token you generated
echo "<YOUR_GHCR_READ_PAT>" | docker login ghcr.io -u luminaerp360 --password-stdin
```

---

## Step 6 — Generate a New SSH Deploy Key for GitHub Actions

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/gha_deploy -N ""
cat /root/.ssh/gha_deploy.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/gha_deploy

# Print the private key — copy this into GitHub secret VPS_SSH_KEY
cat /root/.ssh/gha_deploy
```

---

## Step 7 — Add GitHub Secrets (New Repo)

Go to: **https://github.com/luminaerp360/luminaerp → Settings → Secrets → Actions**

| Secret Name       | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| `VPS_HOST`        | `64.23.162.220`                                        |
| `VPS_SSH_KEY`     | Full contents of `/root/.ssh/gha_deploy` (private key) |
| `GHCR_READ_TOKEN` | GitHub PAT with `read:packages` scope                  |

---

## Step 8 — Bootstrap First Deploy

The GitHub Actions workflow builds the images on push to `main`. For the **very first time**, trigger a build before deploying:

**Option A — Push to main to trigger Actions:**

```bash
# On your local machine
git push origin main
# Wait for Actions to build and push images to ghcr.io/luminaerp360/lumina-backend and lumina-frontend
# Then Actions will auto-deploy
```

**Option B — Manual bootstrap on VPS (if Actions already ran):**

```bash
cd /opt/lumina-erp
chmod +x deploy/deploy.sh
bash deploy/deploy.sh
```

---

## Step 9 — Initialize Active Stack State

If `.active-stack` does not exist yet, deploy.sh will treat active as "none" and deploy to blue:

```bash
# Check current state
cat /opt/lumina-erp/deploy/.active-stack 2>/dev/null || echo "(no state file — first deploy will create it)"
```

---

## Ongoing Commands

```bash
# Manual deploy latest image
bash /opt/lumina-erp/deploy/deploy.sh

# Instant rollback (keeps old container, no rebuild needed)
bash /opt/lumina-erp/deploy/deploy.sh rollback

# Check which slot is live
bash /opt/lumina-erp/deploy/deploy.sh status

# View container logs
docker logs lumina-backend-blue --tail=100 -f
docker logs lumina-backend-green --tail=100 -f
```
