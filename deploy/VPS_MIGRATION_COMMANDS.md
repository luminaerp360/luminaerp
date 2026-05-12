# VPS Migration — Tear Down Old Repo & Redeploy from luminaerp360/luminaerp

Run these commands **in order** on the VPS web console.
Other projects (`lumifarm`, `lumina-admin`, `lumischool`, `ecommerce-backend`) are **not touched**.

---

## PHASE 1 — Tear Down Old lumina-erp Deployment

```bash
cd /opt/lumina-erp

# 1a. Stop and remove all containers from this project only
docker compose -f deploy/docker-compose.blue.yml down --remove-orphans 2>/dev/null || true
docker compose -f deploy/docker-compose.green.yml down --remove-orphans 2>/dev/null || true

# Confirm no lumina-erp containers remain
docker ps -a --format "{{.Names}}" | grep lumina

# 1b. Remove old GHCR images to free disk space
docker rmi ghcr.io/shaphankirui/lumina-backend:latest 2>/dev/null || true
docker rmi ghcr.io/shaphankirui/lumina-frontend:latest 2>/dev/null || true
docker image prune -f

# 1c. Kill any PM2 processes left from the old PM2-based setup
pm2 delete lumina-backend 2>/dev/null || true
pm2 delete lumina-frontend 2>/dev/null || true
pm2 save --force 2>/dev/null || true

# 1d. Remove old per-project Nginx site files (NOT the lumina-admin ones)
rm -f /etc/nginx/sites-enabled/lumina-erp
rm -f /etc/nginx/sites-enabled/lumina-backend
rm -f /etc/nginx/sites-enabled/lumina-frontend
rm -f /etc/nginx/sites-available/lumina-erp
nginx -t && systemctl reload nginx
```

---

## PHASE 2 — Delete Old Folder & Clone New Repo

```bash
cd /opt

# Delete old folder entirely (the new repo is different — can't just change remote)
rm -rf lumina-erp

# Clone from the new org
git clone git@github.com:luminaerp360/luminaerp.git lumina-erp

cd lumina-erp
ls  # confirm deploy/, apps/, .github/ are present
```

> **If git clone fails with "Permission denied (publickey)":**
> The VPS needs read access to the new repo. Add the VPS public key as a Deploy Key:
>
> ```bash
> cat /root/.ssh/id_rsa.pub   # or id_ed25519.pub
> ```
>
> Then go to: **https://github.com/luminaerp360/luminaerp → Settings → Deploy keys → Add deploy key**
> Paste the public key, tick "Allow write access" is NOT neededd.

---

## PHASE 3 — Write the .env File

```bash
mkdir -p /opt/lumina-erp/apps/backend

cat > /opt/lumina-erp/apps/backend/.env << 'EOF'
NODE_ENV=production
PORT=3000

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

ls -la /opt/lumina-erp/apps/backend/.env
```

---

## PHASE 4 — Install Nginx Configs

```bash
cd /opt/lumina-erp

# Upstream config — rewritten on every blue/green swap
cp deploy/nginx-upstream.conf /etc/nginx/conf.d/lumina-upstream.conf

# Static server blocks for the two domains
cp deploy/nginx-backend.conf  /etc/nginx/sites-available/api.lumina360.tech
cp deploy/nginx-frontend.conf /etc/nginx/sites-available/erp.lumina360.tech

# Enable them
rm -f /etc/nginx/sites-enabled/api.lumina360.tech
rm -f /etc/nginx/sites-enabled/erp.lumina360.tech
ln -sf /etc/nginx/sites-available/api.lumina360.tech  /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/erp.lumina360.tech  /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx
```

> **If nginx -t fails: "cannot load certificate"** — SSL certs are missing. Get them first:
>
> ```bash
> systemctl stop nginx
> certbot certonly --standalone -d api.lumina360.tech --non-interactive --agree-tos -m luminaerp360@gmail.com
> certbot certonly --standalone -d erp.lumina360.tech --non-interactive --agree-tos -m luminaerp360@gmail.com
> systemctl start nginx && nginx -t
> ```

---

## PHASE 5 — Authenticate Docker to GHCR (New Org)

1. Go to **https://github.com/settings/tokens/new**
2. Tick **only** `read:packages`
3. Copy the token, then on the VPS:

```bash
echo "<YOUR_READ_PACKAGES_PAT>" | docker login ghcr.io -u luminaerp360 --password-stdin
# Expected: Login Succeeded
```

---

## PHASE 6 — Generate GitHub Actions Deploy SSH Key

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/gha_deploy -N ""
cat /root/.ssh/gha_deploy.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/gha_deploy

# Print private key — copy this EXACTLY into the VPS_SSH_KEY GitHub secret
cat /root/.ssh/gha_deploy
```

---

## PHASE 7 — Add GitHub Actions Secrets

**https://github.com/luminaerp360/luminaerp → Settings → Secrets and variables → Actions**

| Secret Name       | Value                                                      |
| ----------------- | ---------------------------------------------------------- |
| `VPS_HOST`        | `64.23.162.220`                                            |
| `VPS_SSH_KEY`     | Full contents of `/root/.ssh/gha_deploy` (the private key) |
| `GHCR_READ_TOKEN` | GitHub PAT with `read:packages` scope (from Phase 5)       |

---

## PHASE 8 — Trigger First Build & Deploy

GitHub Actions builds Docker images when you push to `main`. The images must be in GHCR before `deploy.sh` can pull them.

**From your local machine — push to trigger the pipeline:**

```bash
git remote set-url origin git@github.com:luminaerp360/luminaerp.git
git push origin main
```

GitHub Actions will:

1. Build and push `ghcr.io/luminaerp360/lumina-backend:latest`
2. Build and push `ghcr.io/luminaerp360/lumina-frontend:latest`
3. SSH into VPS and run `bash deploy/deploy.sh all` (blue/green swap)

**To manually trigger on VPS after Actions completes:**

```bash
cd /opt/lumina-erp
chmod +x deploy/deploy.sh
bash deploy/deploy.sh
```

---

## Verify Everything is Running

```bash
# Containers running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Active stack
bash /opt/lumina-erp/deploy/deploy.sh status

# Smoke test endpoints
curl -I https://api.lumina360.tech/
curl -I https://erp.lumina360.tech/

# Backend logs
docker logs lumina-backend-blue --tail=50
```

---

## Ongoing Commands

```bash
bash /opt/lumina-erp/deploy/deploy.sh            # deploy latest image
bash /opt/lumina-erp/deploy/deploy.sh rollback   # instant rollback
bash /opt/lumina-erp/deploy/deploy.sh status     # show active stack
bash /opt/lumina-erp/deploy/deploy.sh backend    # backend only
bash /opt/lumina-erp/deploy/deploy.sh frontend   # frontend only
```

```

```
