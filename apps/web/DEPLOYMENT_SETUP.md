# Wirelist App Deployment Setup Guide

## Prerequisites

- SSH access to `wirelist@wirelist.local`
- Node.js and npm installed on remote server
- Sudo privileges on remote server

## Option 1: Passwordless Sudo for Deployment (Recommended)

To enable automated deployments without password prompts, configure passwordless sudo for specific deployment commands.

### Setup Steps on Remote Server:

1. **SSH into the remote server:**
   ```bash
   ssh wirelist@wirelist.local
   ```

2. **Create a sudoers configuration file:**
   ```bash
   sudo visudo -f /etc/sudoers.d/wirelist-deploy
   ```

3. **Add the following lines** (replace `wirelist` with your username if different):
   ```
   # Wirelist deployment commands - no password required
   wirelist ALL=(ALL) NOPASSWD: /bin/cp -r * /var/www/wirelist-app
   wirelist ALL=(ALL) NOPASSWD: /bin/cp -r /var/www/wirelist-app *
   wirelist ALL=(ALL) NOPASSWD: /bin/mkdir -p /var/www/wirelist-app
   wirelist ALL=(ALL) NOPASSWD: /bin/chown -R www-data\:www-data /var/www/wirelist-app
   wirelist ALL=(ALL) NOPASSWD: /bin/chmod -R 755 /var/www/wirelist-app
   wirelist ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
   wirelist ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
   wirelist ALL=(ALL) NOPASSWD: /bin/systemctl status nginx
   wirelist ALL=(ALL) NOPASSWD: /bin/rm -rf /var/www/wirelist-app
   wirelist ALL=(ALL) NOPASSWD: /usr/bin/find /var/www -maxdepth 1 -name wirelist-app-backup-* -type d -mtime +7 -exec /bin/rm -rf {} \;
   ```

4. **Verify the syntax:**
   ```bash
   sudo visudo -c -f /etc/sudoers.d/wirelist-deploy
   ```
   
   You should see: `parsed OK`

5. **Set proper permissions:**
   ```bash
   sudo chmod 0440 /etc/sudoers.d/wirelist-deploy
   ```

6. **Test passwordless sudo:**
   ```bash
   sudo nginx -t
   ```
   
   It should run without asking for a password.

### After Setup:

The `deploy.sh` script will now run without password prompts!

---

## Option 2: Run with Password Prompt (Simple)

If you prefer to enter your password each time (more secure but less automated), just run:

```bash
./deploy.sh
```

You'll be prompted for your sudo password during deployment.

---

## Alternative: More Permissive Setup (Less Secure)

If you want to allow all sudo commands without password (not recommended for production):

```bash
sudo visudo -f /etc/sudoers.d/wirelist-deploy
```

Add:
```
wirelist ALL=(ALL) NOPASSWD: ALL
```

**Warning:** This allows the wirelist user to run ANY command as root without password. Only use in development environments!

---

## Deployment Usage

Once setup is complete, deploy with:

```bash
cd ~/dev/wirelist/wirelist-app
./deploy.sh
```

The script will:
1. ✅ Connect to remote server via SSH
2. ✅ Navigate to app directory
3. ✅ Fetch and pull latest git changes
4. ✅ Install dependencies and build
5. ✅ Create backup of current deployment
6. ✅ Deploy new build to `/var/www/wirelist-app`
7. ✅ Reload nginx
8. ✅ Show deployment status

---

## Troubleshooting

### "npm: command not found"

The script tries to load Node.js environment from:
- `~/.nvm/nvm.sh` (NVM)
- `~/.bashrc`
- `~/.bash_profile`
- `~/.profile`

If npm is still not found, manually add to one of these files:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### "sudo: a password is required"

Follow **Option 1** above to set up passwordless sudo.

### "Nginx configuration test failed"

Check nginx config:
```bash
ssh wirelist@wirelist.local
sudo nginx -t
```

Fix any configuration errors before deploying again.

### Restore from Backup

Backups are created automatically. To restore:
```bash
ssh wirelist@wirelist.local
ls -la /var/www/wirelist-app-backup-*
sudo rm -rf /var/www/wirelist-app
sudo cp -r /var/www/wirelist-app-backup-YYYYMMDD-HHMMSS /var/www/wirelist-app
sudo systemctl reload nginx
```

---

## Security Notes

- The passwordless sudo configuration only allows specific commands needed for deployment
- SSH key authentication is recommended over password authentication
- Backups are automatically cleaned up after 7 days
- The deployment script validates nginx configuration before reloading




