# Blue/Green Deployment Fix

## Problem Summary

The original deployment script had a critical flaw that caused downtime during partial deployments (backend-only or frontend-only):

### Original Issues:

1. **Coupled Upstream Switching**: When deploying only backend, the script would switch BOTH backend AND frontend nginx upstreams to the new stack, even though frontend wasn't deployed
2. **No Separate State Tracking**: Used single state file for both services
3. **First-Time Deployment Vulnerability**: No handling for initial deployments where no containers exist
4. **Unexpected Downtime**: Violated blue/green zero-downtime principle

### Example Failure Scenario:

```
Initial State: Backend (blue), Frontend (none)
Action: Deploy backend-only
Old Behavior:
  1. Start backend-green
  2. Health check backend-green ✅
  3. Switch BOTH upstreams to green stack
  4. Frontend upstream now points to green:4002 (doesn't exist!)
  5. Result: 502 Bad Gateway on frontend
```

## Solution

### Key Changes:

1. **✅ Separate State Tracking**
   - `deploy/.active-backend-stack` - Tracks backend stack (blue/green/none)
   - `deploy/.active-frontend-stack` - Tracks frontend stack (blue/green/none)

2. **✅ Independent Nginx Upstreams**
   - `/etc/nginx/conf.d/lumina-backend-upstream.conf` - Backend only
   - `/etc/nginx/conf.d/lumina-frontend-upstream.conf` - Frontend only
   - Old combined file (`lumina-upstream.conf`) is removed automatically

3. **✅ Separate Deployment Functions**
   - `deploy_backend_only()` - Only switches backend upstream
   - `deploy_frontend_only()` - Only switches frontend upstream
   - `deploy_all()` - Switches both upstreams together

4. **✅ First-Time Deployment Protection**
   - `initialize_if_needed()` - Detects running containers on first run
   - Auto-discovers and sets active stack if containers exist
   - Handles fresh deployments gracefully

5. **✅ Smart Nginx Switching**
   - `switch_nginx_backend()` - Updates backend upstream only
   - `switch_nginx_frontend()` - Updates frontend upstream only
   - `switch_nginx_both()` - Updates both for full deployments

## New Deployment Flow

### Backend-Only Deployment:

```bash
./deploy.sh backend

Flow:
1. Check active backend stack (e.g., blue)
2. Pull latest backend image
3. Start backend-green container
4. Health check backend-green
5. Switch ONLY backend upstream: blue:3001 → green:3002
6. Stop backend-blue
7. Save backend state: green
8. Frontend remains unchanged!
```

### Frontend-Only Deployment:

```bash
./deploy.sh frontend

Flow:
1. Check active frontend stack (e.g., blue)
2. Pull latest frontend image
3. Start frontend-green container
4. Health check frontend-green
5. Switch ONLY frontend upstream: blue:4001 → green:4002
6. Stop frontend-blue
7. Save frontend state: green
8. Backend remains unchanged!
```

### Full Deployment:

```bash
./deploy.sh all  # or just ./deploy.sh

Flow:
1. Check active backend & frontend stacks
2. Pull latest images (both)
3. Start new stack containers (both)
4. Health check both services
5. Switch BOTH upstreams together
6. Stop old stack containers (both)
7. Save both states
```

## Usage

### Commands:

```bash
# Deploy everything
./deploy.sh all
./deploy.sh  # same as above

# Deploy backend only (safe - won't affect frontend)
./deploy.sh backend

# Deploy frontend only (safe - won't affect backend)
./deploy.sh frontend

# Check deployment status
./deploy.sh status

# Rollback both services
./deploy.sh rollback
```

### Status Output:

```bash
$ ./deploy.sh status

==============================================
  Lumina ERP - Deployment Status
==============================================
  Active backend stack:  blue
  Active frontend stack: green

  Containers:
  lumina-backend-blue    Up 2 hours
  lumina-frontend-green  Up 30 minutes

  Nginx Upstreams:
  Backend:      server 127.0.0.1:3001;
  Frontend:     server 127.0.0.1:4002;

==============================================
```

## Migration Steps

If you're upgrading from the old script:

### On Your VPS:

```bash
# 1. SSH to server
ssh root@your_vps_ip

# 2. Backup old script
cd /opt/lumina-erp/deploy
cp deploy.sh deploy.sh.old

# 3. Pull latest changes (includes fixed script)
cd /opt/lumina-erp
git pull origin main

# 4. Check current containers
docker ps | grep lumina

# 5. Initialize state files based on running containers
# If backend-blue is running:
echo "blue" > deploy/.active-backend-stack

# If frontend-green is running:
echo "green" > deploy/.active-frontend-stack

# 6. Create separate upstream files from current config
cd /etc/nginx/conf.d

# Extract backend upstream (if using combined file)
if [ -f lumina-upstream.conf ]; then
  # Manually create separate files based on current ports
  # Example:
  cat > lumina-backend-upstream.conf << EOF
upstream lumina_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}
EOF

  cat > lumina-frontend-upstream.conf << EOF
upstream lumina_frontend {
    server 127.0.0.1:4001;
    keepalive 32;
}
EOF

  # Test nginx
  nginx -t
  systemctl reload nginx
fi

# 7. Test new deployment script
cd /opt/lumina-erp
bash deploy/deploy.sh status

# 8. You're ready! Next deployment will use fixed script
```

### Quick Recovery (If Frontend is Currently Down):

```bash
# SSH to server
ssh root@your_vps_ip
cd /opt/lumina-erp

# Pull latest script fix
git pull origin main

# Deploy frontend immediately
bash deploy/deploy.sh frontend

# Frontend should now be live!
```

## Benefits

### Before (Broken):
- ❌ Partial deployments broke unrelated services
- ❌ Unexpected downtime during backend-only deployments
- ❌ No first-time deployment protection
- ❌ Coupled state tracking

### After (Fixed):
- ✅ True zero-downtime deployments
- ✅ Independent service deployments
- ✅ First-time deployment detection
- ✅ Separate state tracking per service
- ✅ Better visibility in status command
- ✅ Proper blue/green isolation

## Technical Details

### State Files:

```bash
# Backend state
cat /opt/lumina-erp/deploy/.active-backend-stack
# Output: blue, green, or none

# Frontend state
cat /opt/lumina-erp/deploy/.active-frontend-stack
# Output: blue, green, or none
```

### Nginx Upstream Files:

```bash
# Backend upstream
cat /etc/nginx/conf.d/lumina-backend-upstream.conf

# Frontend upstream
cat /etc/nginx/conf.d/lumina-frontend-upstream.conf
```

### Container Naming:

```
Blue Stack:
- lumina-backend-blue (port 3001)
- lumina-frontend-blue (port 4001)

Green Stack:
- lumina-backend-green (port 3002)
- lumina-frontend-green (port 4002)
```

### Health Check Endpoints:

```bash
# Backend: Any HTTP response = healthy (including 404)
curl http://localhost:3001/

# Frontend: Must respond on /health
curl http://localhost:4001/health
```

## Troubleshooting

### Issue: Frontend showing 502 after backend deployment

**Cause**: Using old deployment script that switches both upstreams

**Fix**:
```bash
# Deploy frontend separately
./deploy.sh frontend
```

### Issue: Status shows "none" for both stacks

**Cause**: First-time deployment, no state files exist

**Fix**: Deploy normally, script will auto-initialize
```bash
./deploy.sh all
```

### Issue: Script says container running but status shows "none"

**Cause**: State files missing but containers exist

**Fix**: Run status or any deployment once - script will auto-detect and fix
```bash
./deploy.sh status  # Will auto-initialize state
```

### Issue: Nginx upstream not updating

**Check**:
```bash
# Verify upstream files exist
ls -la /etc/nginx/conf.d/lumina-*-upstream.conf

# Check nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

## CI/CD Integration

The GitHub Actions workflow already supports this - no changes needed!

The workflow intelligently detects which parts changed:
- Backend changes → deploys backend only
- Frontend changes → deploys frontend only
- Both changed → deploys all

The fixed script now properly handles all three scenarios without breaking anything.

## Testing

### Test Partial Backend Deployment:

```bash
# 1. Check current state
./deploy.sh status

# 2. Deploy backend only
./deploy.sh backend

# 3. Verify frontend still works
curl https://erp.lumina360.tech

# 4. Check status shows different stacks
./deploy.sh status
# Should show: backend=green, frontend=blue (or vice versa)
```

### Test Partial Frontend Deployment:

```bash
# 1. Deploy frontend only
./deploy.sh frontend

# 2. Verify backend still works
curl https://api.lumina360.tech

# 3. Check independent stacks
./deploy.sh status
```

## Rollback

Current rollback behavior:
- Rolls back BOTH services to previous stacks
- Future enhancement: Add `rollback backend` and `rollback frontend` options

```bash
# Rollback everything
./deploy.sh rollback
```

## Backup

Your original script is backed up:
- `deploy/deploy.sh.backup` - Original script
- `deploy/deploy.sh` - Fixed script

## Summary

This fix ensures your blue/green deployment strategy truly provides **zero-downtime deployments** by:

1. **Isolating service deployments** - Backend and frontend can be deployed independently
2. **Protecting running services** - Deploying one service never affects the other
3. **Proper state tracking** - Each service has its own blue/green state
4. **First-time deployment safety** - Handles initial deployments gracefully
5. **Better observability** - Status command shows clear per-service information

**Result**: You can now safely deploy backend or frontend individually without causing downtime on the other service!
