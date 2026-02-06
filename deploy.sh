#!/bin/bash

# =============================================================================
# Wirelist Monorepo — Docker Deployment Script
#
# This script deploys the full stack (PostgreSQL, NestJS API, Vue.js frontend)
# to the remote server using Docker Compose.
#
# First run:  Clones the repo and starts all services
# Next runs:  Pulls latest changes, rebuilds, and restarts services
#
# Usage:
#   ./deploy.sh              # Deploy to production
#   ./deploy.sh --rebuild    # Force full rebuild (no cache)
# =============================================================================

set -e

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Configuration ────────────────────────────────────────────────────────────
REMOTE_HOST="wirelist@172.18.12.93"
REMOTE_DIR="/home/wirelist/wirelist-monorepo"
GIT_REPO="git@github.com:vpirhach/wirelist.git"
GIT_BRANCH="master"
REBUILD_FLAG=""

# Parse arguments
if [ "$1" = "--rebuild" ]; then
    REBUILD_FLAG="--no-cache"
    echo -e "${YELLOW}Force rebuild mode enabled (--no-cache)${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Wirelist Docker Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}  Host:   ${REMOTE_HOST}${NC}"
echo -e "${BLUE}  Repo:   ${GIT_REPO}${NC}"
echo -e "${BLUE}  Branch: ${GIT_BRANCH}${NC}"
echo -e "${BLUE}  Path:   ${REMOTE_DIR}${NC}"
echo ""

# ── Deploy via SSH ───────────────────────────────────────────────────────────
ssh -t "${REMOTE_HOST}" << ENDSSH
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REMOTE_DIR="${REMOTE_DIR}"
GIT_REPO="${GIT_REPO}"
GIT_BRANCH="${GIT_BRANCH}"
REBUILD_FLAG="${REBUILD_FLAG}"

# ── Step 1: Check / Clone Repo ──────────────────────────────────────────────
echo -e "\${YELLOW}[1/5] Checking repository...\${NC}"

if [ ! -d "\${REMOTE_DIR}/.git" ]; then
    echo -e "\${BLUE}Repository not found. Cloning...\${NC}"

    # Ensure parent directory exists
    mkdir -p "\$(dirname "\${REMOTE_DIR}")"

    git clone --branch "\${GIT_BRANCH}" "\${GIT_REPO}" "\${REMOTE_DIR}"

    echo -e "\${GREEN}✓ Repository cloned successfully\${NC}"
else
    echo -e "\${GREEN}✓ Repository exists\${NC}"
fi

cd "\${REMOTE_DIR}"
echo -e "\${BLUE}  Directory: \$(pwd)\${NC}"
echo ""

# ── Step 2: Pull Latest Changes ─────────────────────────────────────────────
echo -e "\${YELLOW}[2/5] Pulling latest changes...\${NC}"

CURRENT_BRANCH=\$(git rev-parse --abbrev-ref HEAD)
echo -e "\${BLUE}  Current branch: \${CURRENT_BRANCH}\${NC}"

# Stash any local changes (e.g. .env files)
if [ -n "\$(git status --porcelain)" ]; then
    echo -e "\${BLUE}  Stashing local changes...\${NC}"
    git stash --include-untracked
fi

git fetch origin
git pull origin "\${CURRENT_BRANCH}"

LATEST_COMMIT=\$(git log -1 --pretty=format:"%h - %s (%an, %ar)")
echo -e "\${BLUE}  Latest commit: \${LATEST_COMMIT}\${NC}"
echo -e "\${GREEN}✓ Repository up to date\${NC}"
echo ""

# ── Step 3: Docker Build ────────────────────────────────────────────────────
echo -e "\${YELLOW}[3/5] Building Docker images...\${NC}"

# Ensure Docker is running
if ! command -v docker > /dev/null 2>&1; then
    echo -e "\${RED}✗ Docker is not installed\${NC}"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo -e "\${RED}✗ Docker daemon is not running (or user not in docker group)\${NC}"
    echo -e "\${BLUE}Hint: run 'sudo usermod -aG docker wirelist' and re-login\${NC}"
    exit 1
fi

echo -e "\${GREEN}✓ Docker is available\${NC}"

# Build all images
docker compose build \${REBUILD_FLAG}

echo -e "\${GREEN}✓ Docker images built successfully\${NC}"
echo ""

# ── Step 4: Start Services ──────────────────────────────────────────────────
echo -e "\${YELLOW}[4/5] Starting services...\${NC}"

# Stop existing containers (if any)
docker compose down --remove-orphans > /dev/null 2>&1 || true

# Start all services
docker compose up -d

# Wait for health checks
echo -e "\${BLUE}  Waiting for services to become healthy...\${NC}"
sleep 5

# Check if postgres is healthy
RETRIES=12
WAIT=5
for i in \$(seq 1 \$RETRIES); do
    if docker compose exec -T postgres pg_isready -U postgres -d wirelist_db > /dev/null 2>&1; then
        echo -e "\${GREEN}  ✓ PostgreSQL is ready\${NC}"
        break
    fi
    if [ \$i -eq \$RETRIES ]; then
        echo -e "\${RED}  ✗ PostgreSQL failed to start\${NC}"
        docker compose logs postgres
        exit 1
    fi
    echo -e "\${BLUE}  Waiting for PostgreSQL... (\${i}/\${RETRIES})\${NC}"
    sleep \$WAIT
done

# Check API
sleep 3
if docker compose ps api | grep -q "Up"; then
    echo -e "\${GREEN}  ✓ API is running\${NC}"
else
    echo -e "\${RED}  ✗ API failed to start\${NC}"
    docker compose logs api --tail 30
    exit 1
fi

# Check Web
if docker compose ps web | grep -q "Up"; then
    echo -e "\${GREEN}  ✓ Web is running\${NC}"
else
    echo -e "\${RED}  ✗ Web failed to start\${NC}"
    docker compose logs web --tail 30
    exit 1
fi

echo -e "\${GREEN}✓ All services started\${NC}"
echo ""

# ── Step 5: Status Report ───────────────────────────────────────────────────
echo -e "\${YELLOW}[5/5] Deployment Status\${NC}"
echo -e "\${GREEN}========================================\${NC}"
echo ""

docker compose ps

echo ""
echo -e "\${BLUE}Ports:\${NC}"
echo -e "  PostgreSQL:  localhost:5435  (internal 5432)"
echo -e "  API:         localhost:3002"
echo -e "  Web:         localhost:80"
echo ""
echo -e "\${BLUE}Logs:\${NC}"
echo -e "  docker compose logs -f          # all services"
echo -e "  docker compose logs -f api      # API only"
echo -e "  docker compose logs -f web      # Web only"
echo -e "  docker compose logs -f postgres # DB only"
echo ""

# Prune old images
echo -e "\${BLUE}Cleaning up old Docker images...\${NC}"
docker image prune -f > /dev/null 2>&1 || true
echo -e "\${GREEN}✓ Cleanup done\${NC}"

echo ""
echo -e "\${GREEN}========================================\${NC}"
echo -e "\${GREEN}  Deployment Completed Successfully!\${NC}"
echo -e "\${GREEN}========================================\${NC}"

ENDSSH

# ── Local status ─────────────────────────────────────────────────────────────
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment finished successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Deployment failed!${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
