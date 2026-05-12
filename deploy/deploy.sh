#!/bin/bash
set -e

# ============================================================
# Lumina ERP - Blue/Green Zero-Downtime Deploy Script
# Usage:
#   ./deploy.sh              # Deploy all (backend + frontend)
#   ./deploy.sh backend      # Deploy backend only
#   ./deploy.sh frontend     # Deploy frontend only
#   ./deploy.sh rollback     # Rollback to previous stack
#   ./deploy.sh status       # Show current active stack
# Note: Admin is deployed separately from its own repo (/opt/lumina-admin)
# ============================================================

PROJECT_DIR="/opt/lumina-erp"
STATE_FILE="$PROJECT_DIR/deploy/.active-stack"
NGINX_UPSTREAM_DIR="/etc/nginx/conf.d"
REGISTRY="ghcr.io/luminaerp360"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }

# Get current active stack
get_active_stack() {
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo "none"
  fi
}

# Get the inactive stack
get_inactive_stack() {
  local active=$(get_active_stack)
  if [ "$active" = "blue" ]; then
    echo "green"
  else
    echo "blue"
  fi
}

# Get port mappings
get_backend_port() {
  if [ "$1" = "blue" ]; then echo "3001"; else echo "3002"; fi
}

get_frontend_port() {
  if [ "$1" = "blue" ]; then echo "4001"; else echo "4002"; fi
}



# Health check a service
health_check() {
  local service_name=$1
  local port=$2
  local endpoint=$3
  local retries=$HEALTH_CHECK_RETRIES

  log "Health checking $service_name on port $port..."

  for i in $(seq 1 $retries); do
    # Use -s -o /dev/null -w to check HTTP response (any response = healthy, including 404)
    local http_code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port$endpoint" 2>/dev/null)
    if [ "$http_code" != "000" ] && [ -n "$http_code" ]; then
      log "$service_name is healthy! (HTTP $http_code, attempt $i/$retries)"
      return 0
    fi
    info "Waiting for $service_name... ($i/$retries)"
    sleep $HEALTH_CHECK_INTERVAL
  done

  error "$service_name failed health check after $retries attempts"
  return 1
}

# Switch nginx upstream to point to new stack
switch_nginx() {
  local new_stack=$1
  local backend_port=$(get_backend_port "$new_stack")
  local frontend_port=$(get_frontend_port "$new_stack")

  log "Switching Nginx to $new_stack stack (backend:$backend_port, frontend:$frontend_port)..."

  # Update backend upstream
  cat > "$NGINX_UPSTREAM_DIR/lumina-backend-upstream.conf" << EOF
upstream lumina_backend {
    server 127.0.0.1:$backend_port;
}
EOF

  # Update frontend upstream
  cat > "$NGINX_UPSTREAM_DIR/lumina-frontend-upstream.conf" << EOF
upstream lumina_frontend {
    server 127.0.0.1:$frontend_port;
}
EOF

  # Test and reload nginx
  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    log "Nginx switched to $new_stack stack"
  else
    error "Nginx config test failed! Keeping current stack."
    return 1
  fi
}

# Pull latest images (skip if pull fails and local image exists)
pull_images() {
  local target=$1
  log "Pulling latest images..."

  if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
    set +e
    docker pull "$REGISTRY/lumina-backend:latest" 2>&1
    local pull_backend=$?
    set -e
    if [ $pull_backend -ne 0 ]; then
      if docker image inspect "$REGISTRY/lumina-backend:latest" > /dev/null 2>&1; then
        warn "Pull failed, using local backend image"
      else
        error "No backend image available (pull failed and no local image)"
        exit 1
      fi
    fi
  fi
  if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
    set +e
    docker pull "$REGISTRY/lumina-frontend:latest" 2>&1
    local pull_frontend=$?
    set -e
    if [ $pull_frontend -ne 0 ]; then
      if docker image inspect "$REGISTRY/lumina-frontend:latest" > /dev/null 2>&1; then
        warn "Pull failed, using local frontend image"
      else
        error "No frontend image available (pull failed and no local image)"
        exit 1
      fi
    fi
  fi
}

# Start a stack
start_stack() {
  local stack=$1
  local target=$2

  log "Starting $stack stack ($target)..."

  cd "$PROJECT_DIR"

  if [ "$target" = "all" ]; then
    docker compose -f "deploy/docker-compose.$stack.yml" up -d
  elif [ "$target" = "backend" ]; then
    docker compose -f "deploy/docker-compose.$stack.yml" up -d "lumina-backend-$stack"
  elif [ "$target" = "frontend" ]; then
    docker compose -f "deploy/docker-compose.$stack.yml" up -d "lumina-frontend-$stack"
  fi
}

# Stop a stack
stop_stack() {
  local stack=$1
  local target=$2

  if [ "$stack" = "none" ]; then return; fi

  log "Stopping $stack stack ($target)..."

  cd "$PROJECT_DIR"

  if [ "$target" = "all" ]; then
    docker compose -f "deploy/docker-compose.$stack.yml" stop 2>/dev/null || true
  elif [ "$target" = "backend" ]; then
    docker compose -f "deploy/docker-compose.$stack.yml" stop "lumina-backend-$stack" 2>/dev/null || true
  elif [ "$target" = "frontend" ]; then
    docker compose -f "deploy/docker-compose.$stack.yml" stop "lumina-frontend-$stack" 2>/dev/null || true
  fi
}

# Save active stack
save_state() {
  echo "$1" > "$STATE_FILE"
  log "Active stack saved: $1"
}

# Deploy function  
deploy() {
  local target=${1:-all}  # all, backend, or frontend
  local active=$(get_active_stack)
  local new_stack=$(get_inactive_stack)

  echo ""
  echo "=============================================="
  echo "  Lumina ERP - Blue/Green Deploy"
  echo "=============================================="
  echo "  Target:       $target"
  echo "  Active stack: $active"
  echo "  New stack:    $new_stack"
  echo "=============================================="
  echo ""

  # Pull latest images
  pull_images "$target"

  # Start new stack
  start_stack "$new_stack" "$target"

  # Health check
  local health_ok=true

  if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
    local backend_port=$(get_backend_port "$new_stack")
    if ! health_check "Backend" "$backend_port" "/"; then
      health_ok=false
    fi
  fi

  if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
    local frontend_port=$(get_frontend_port "$new_stack")
    if ! health_check "Frontend" "$frontend_port" "/health"; then
      health_ok=false
    fi
  fi

  if [ "$health_ok" = false ]; then
    error "Health checks failed! Stopping new stack, keeping $active active."
    stop_stack "$new_stack" "$target"
    exit 1
  fi

  # Switch nginx
  switch_nginx "$new_stack"

  # Stop old stack
  stop_stack "$active" "$target"

  # Save state
  save_state "$new_stack"

  echo ""
  log "Deploy complete! Active stack: $new_stack"
  echo ""
}

# Rollback function
rollback() {
  local active=$(get_active_stack)
  local previous=$(get_inactive_stack)

  echo ""
  warn "Rolling back from $active to $previous..."

  # Start previous stack
  start_stack "$previous" "all"

  # Health check
  local backend_port=$(get_backend_port "$previous")
  local frontend_port=$(get_frontend_port "$previous")

  if health_check "Backend" "$backend_port" "/" && health_check "Frontend" "$frontend_port" "/health"; then
    switch_nginx "$previous"
    stop_stack "$active" "all"
    save_state "$previous"
    log "Rollback complete! Active stack: $previous"
  else
    error "Rollback failed! Previous containers are unhealthy."
    stop_stack "$previous" "all"
    exit 1
  fi
}

# Status function
status() {
  local active=$(get_active_stack)
  echo ""
  echo "=============================================="
  echo "  Lumina ERP - Deployment Status"
  echo "=============================================="
  echo "  Active stack: $active"
  echo ""
  echo "  Containers:"
  docker ps --format "  {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep lumina || echo "  No lumina containers running"
  echo ""
  echo "=============================================="
}

# Main
case "${1:-}" in
  backend)
    deploy "backend"
    ;;
  frontend)
    deploy "frontend"
    ;;
  rollback)
    rollback
    ;;
  status)
    status
    ;;
  *)
    deploy "all"
    ;;
esac
