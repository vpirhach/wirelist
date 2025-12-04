#!/bin/bash

# One-time setup script to configure deployment permissions
# Run this once on the remote server: ssh wirelist@wirelist.local < setup-deploy-permissions.sh

set -e

echo "Setting up deployment permissions for wirelist-app..."

# Create deployment directory if it doesn't exist
sudo mkdir -p /var/www/wirelist-app

# Change ownership to wirelist user for deployment
sudo chown -R wirelist:wirelist /var/www/wirelist-app

# Set proper permissions
sudo chmod -R 755 /var/www/wirelist-app

# For nginx to read the files, we need to ensure www-data can read
# Add wirelist user to www-data group
sudo usermod -a -G www-data wirelist

echo "✓ Deployment permissions configured!"
echo ""
echo "Now you need to update nginx configuration to use wirelist user/group:"
echo "  user wirelist www-data;"
echo ""
echo "Or keep www-data and the current script will change ownership after deploy."




