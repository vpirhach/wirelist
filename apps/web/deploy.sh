#!/bin/bash

# Deployment script for wirelist-app
# This script connects to the remote server and deploys the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REMOTE_HOST="wirelist@wirelist.local"
REMOTE_APP_DIR="~/wirelist/wirelist-app"
DEPLOY_DIR="/var/www/wirelist-app"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Wirelist App Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Note: This script requires sudo access on the remote server.${NC}"
echo -e "${YELLOW}You may be prompted for your password.${NC}"
echo ""

# Step 1: Connect to SSH and execute deployment commands
echo -e "${YELLOW}[1/7] Connecting to ${REMOTE_HOST}...${NC}"

ssh -t "${REMOTE_HOST}" << 'ENDSSH'
set -e

# Colors for remote output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load Node.js environment
echo -e "${BLUE}Loading Node.js environment...${NC}"

# Try to load nvm if it exists
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
    echo -e "${GREEN}✓ NVM loaded${NC}"
elif [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
    echo -e "${GREEN}✓ Loaded .bashrc${NC}"
elif [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
    echo -e "${GREEN}✓ Loaded .bash_profile${NC}"
elif [ -f "$HOME/.profile" ]; then
    source "$HOME/.profile"
    echo -e "${GREEN}✓ Loaded .profile${NC}"
fi

# Verify Node.js and npm are available
echo -e "${BLUE}Checking Node.js installation...${NC}"
if command -v node > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"
else
    echo -e "${RED}✗ Node.js not found in PATH${NC}"
    exit 1
fi

if command -v npm > /dev/null 2>&1; then
    echo -e "${GREEN}✓ npm version: $(npm --version)${NC}"
else
    echo -e "${RED}✗ npm not found in PATH${NC}"
    exit 1
fi
echo ""

# Step 2: Navigate to app directory
echo -e "${YELLOW}[2/7] Navigating to ~/wirelist/wirelist-app...${NC}"
cd ~/wirelist/wirelist-app
echo -e "${GREEN}✓ Current directory: $(pwd)${NC}"
echo ""

# Step 3: Fetch from git
echo -e "${YELLOW}[3/7] Fetching latest changes from git...${NC}"
git fetch origin
echo -e "${GREEN}✓ Git fetch completed${NC}"

# Show current branch and latest commit
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}Current branch: ${CURRENT_BRANCH}${NC}"

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin "${CURRENT_BRANCH}"
echo -e "${GREEN}✓ Git pull completed${NC}"

# Show latest commit
LATEST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%an, %ar)")
echo -e "${BLUE}Latest commit: ${LATEST_COMMIT}${NC}"
echo ""

# Step 4: Build the application
echo -e "${YELLOW}[4/7] Building the application...${NC}"
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

echo -e "${BLUE}Running production build...${NC}"
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}✗ Build failed: dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

# Step 5: Copy dist files to web root
echo -e "${YELLOW}[5/7] Deploying to /var/www/wirelist-app...${NC}"

# Create backup of current deployment
BACKUP_DIR="/var/www/wirelist-app-backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "/var/www/wirelist-app" ] && [ "$(ls -A /var/www/wirelist-app 2>/dev/null)" ]; then
    echo -e "${BLUE}Creating backup at ${BACKUP_DIR}...${NC}"
    sudo cp -r /var/www/wirelist-app "${BACKUP_DIR}"
    echo -e "${GREEN}✓ Backup created${NC}"
fi

# Ensure target directory exists
sudo mkdir -p /var/www/wirelist-app

# Copy new files
echo -e "${BLUE}Copying files to /var/www/wirelist-app...${NC}"
sudo cp -r dist/* /var/www/wirelist-app/

# Set proper permissions
echo -e "${BLUE}Setting proper permissions...${NC}"
sudo chown -R www-data:www-data /var/www/wirelist-app
sudo chmod -R 755 /var/www/wirelist-app

echo -e "${GREEN}✓ Deployment completed${NC}"
echo ""

# Step 6: Reload nginx
echo -e "${YELLOW}[6/7] Reloading nginx...${NC}"

# Test nginx configuration first
echo -e "${BLUE}Testing nginx configuration...${NC}"
sudo nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    echo -e "${BLUE}Reloading nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}Restoring from backup...${NC}"
    if [ -d "${BACKUP_DIR}" ]; then
        sudo rm -rf /var/www/wirelist-app
        sudo cp -r "${BACKUP_DIR}" /var/www/wirelist-app
        echo -e "${GREEN}✓ Backup restored${NC}"
    fi
    exit 1
fi
echo ""

# Step 7: Show status
echo -e "${YELLOW}[7/7] Deployment Status:${NC}"
echo -e "${GREEN}========================================${NC}"

# Nginx status
echo -e "${BLUE}Nginx Status:${NC}"
sudo systemctl status nginx --no-pager | head -n 10

echo ""
echo -e "${BLUE}Deployed Files:${NC}"
ls -lh /var/www/wirelist-app | head -n 10

echo ""
echo -e "${BLUE}Disk Usage:${NC}"
du -sh /var/www/wirelist-app

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Completed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

# Keep old backups for 7 days, remove older ones
echo -e "${BLUE}Cleaning up old backups (older than 7 days)...${NC}"
# Find and remove backups older than 7 days
for backup_dir in /var/www/wirelist-app-backup-*; do
    if [ -d "$backup_dir" ]; then
        # Check if directory is older than 7 days
        if [ "$(find "$backup_dir" -maxdepth 0 -type d -mtime +7 2>/dev/null)" ]; then
            echo -e "${BLUE}Removing old backup: $backup_dir${NC}"
            sudo rm -rf "$backup_dir"
        fi
    fi
done 2>/dev/null || true
echo -e "${GREEN}✓ Cleanup completed${NC}"

ENDSSH

# Check if SSH command was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Local: Deployment script finished!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Deployment failed!${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

