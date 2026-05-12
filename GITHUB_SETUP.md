# GitHub Authentication Setup for DigitalOcean

Guide to set up authentication between your DigitalOcean droplet and GitHub for repository access.

---

## Option 1: SSH Key Authentication (Recommended for Private Repos)

### Step 1: Generate SSH Key on Droplet

```bash
# Connect to your droplet
ssh root@your_droplet_ip

# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Press Enter to accept default location (~/.ssh/id_ed25519)
# Press Enter twice for no passphrase (or set one for extra security)
```

### Step 2: Copy the Public Key

```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub
```

Copy the entire output (starts with `ssh-ed25519`).

### Step 3: Add SSH Key to GitHub

1. Go to GitHub.com and log in
2. Click your profile picture → **Settings**
3. Click **SSH and GPG keys** (in left sidebar)
4. Click **New SSH key**
5. Give it a title (e.g., "DigitalOcean Droplet")
6. Paste the public key you copied
7. Click **Add SSH key**

### Step 4: Test the Connection

```bash
# Test SSH connection to GitHub
ssh -T git@github.com

# You should see:
# "Hi username! You've successfully authenticated, but GitHub does not provide shell access."
```

### Step 5: Clone Using SSH URL

```bash
cd /var/www
git clone git@github.com:shaphankirui/Lumina-erp.git
```

---

## Option 2: Personal Access Token (PAT) - For HTTPS

### Step 1: Create Personal Access Token

1. Go to GitHub.com → **Settings**
2. Scroll down to **Developer settings** (bottom left)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**
5. Give it a name (e.g., "DigitalOcean Deployment")
6. Set expiration (recommended: 90 days or custom)
7. Select scopes:
   - ✅ `repo` (Full control of private repositories)
8. Click **Generate token**
9. **COPY THE TOKEN NOW** (you won't see it again!)

### Step 2: Clone Using Token

```bash
cd /var/www

# Clone using HTTPS with token
git clone https://YOUR_TOKEN@github.com/shaphankirui/Lumina-erp.git

# Or set up credential helper to cache token
git config --global credential.helper store
git clone https://github.com/shaphankirui/Lumina-erp.git
# When prompted:
# Username: your_github_username
# Password: YOUR_TOKEN (paste the token, not your GitHub password)
```

### Step 3: Update Existing Remote (if already cloned)

```bash
cd /var/www/Lumina-erp

# Update remote URL to use token
git remote set-url origin https://YOUR_TOKEN@github.com/shaphankirui/Lumina-erp.git
```

---

## Option 3: Public Repository (Simplest)

If your repository is **public**, you don't need authentication:

```bash
cd /var/www
git clone https://github.com/shaphankirui/Lumina-erp.git
```

**Note:** Anyone can clone public repos, but you still need authentication to push changes.

---

## Recommended Setup: SSH Key (Best Practice)

**Why SSH is better:**
- ✅ More secure
- ✅ No token expiration issues
- ✅ No need to store passwords
- ✅ Easy to revoke access
- ✅ Works for all Git operations (clone, pull, push)

---

## After Setup: Verify Access

```bash
# Test cloning
cd /tmp
git clone git@github.com:shaphankirui/Lumina-erp.git test-clone

# If successful, clean up
rm -rf test-clone

# Now proceed with actual deployment
cd /var/www
git clone git@github.com:shaphankirui/Lumina-erp.git
```

---

## For Private Repositories: Additional Security

### Use Deploy Keys (Read-Only Access)

If you want the droplet to only **pull** (not push), use deploy keys:

1. Generate a separate key on droplet:
```bash
ssh-keygen -t ed25519 -C "deploy-key" -f ~/.ssh/github_deploy_key
cat ~/.ssh/github_deploy_key.pub
```

2. Add to GitHub Repository:
   - Go to your repository → **Settings**
   - Click **Deploy keys**
   - Click **Add deploy key**
   - Paste the public key
   - ✅ Check "Allow write access" only if needed
   - Click **Add key**

3. Configure SSH to use this key:
```bash
nano ~/.ssh/config
```

Add:
```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy_key
```

4. Test and clone:
```bash
ssh -T git@github.com
cd /var/www
git clone git@github.com:shaphankirui/Lumina-erp.git
```

---

## Troubleshooting

### "Permission denied (publickey)"

1. Check SSH key is added to GitHub:
```bash
cat ~/.ssh/id_ed25519.pub
```
Verify this matches what's in GitHub settings.

2. Test SSH connection:
```bash
ssh -vT git@github.com
```

3. Ensure SSH agent is running:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### "Repository not found"

1. Check if repo is private - you need proper authentication
2. Verify the repository URL is correct
3. Ensure your GitHub account has access to the repository

### Token Authentication Failed

1. Verify token hasn't expired
2. Check token has correct permissions (`repo` scope)
3. Make sure you're using the token as password, not your GitHub password

---

## Security Best Practices

1. **Use SSH keys over tokens** when possible
2. **Don't commit tokens** to your repository
3. **Set token expiration** - rotate regularly
4. **Use deploy keys** for production servers (read-only)
5. **Revoke access** when no longer needed
6. **Use different keys** for different servers

---

## Quick Reference

### Clone Commands

```bash
# SSH (after setting up SSH key)
git clone git@github.com:shaphankirui/Lumina-erp.git

# HTTPS with token
git clone https://YOUR_TOKEN@github.com/shaphankirui/Lumina-erp.git

# Public repo (no auth needed for read)
git clone https://github.com/shaphankirui/Lumina-erp.git
```

### Pull Updates

```bash
cd /var/www/Lumina-erp
git pull origin main  # or your branch name
```

---

## Updating deploy.sh with Correct Clone Method

After setting up authentication, you may want to update the `deploy.sh` script:

```bash
nano deploy.sh
```

Change the `REPO_URL` line to match your authentication method:

```bash
# For SSH (recommended)
REPO_URL="git@github.com:shaphankirui/Lumina-erp.git"

# For HTTPS with token
REPO_URL="https://YOUR_TOKEN@github.com/shaphankirui/Lumina-erp.git"

# For public repo
REPO_URL="https://github.com/shaphankirui/Lumina-erp.git"
```

---

**Choose SSH key authentication for the best security and convenience!**
