# Lumina ERP - Quick Start Guide

## 🚀 First Time Setup

Run the complete clean install:

```cmd
complete-clean-install.bat
```

This will:

- Remove all node_modules
- Clear all caches
- Install dependencies with proper isolation
- Takes 5-10 minutes

## 🎯 Running the Applications

### Option 1: Run Frontend Only (Recommended for daily work)

```cmd
RUN_FRONTEND.bat
```

- Opens on: http://localhost:4200
- Uses: Angular 17

### Option 2: Run Admin Panel Only

```cmd
RUN_ADMIN.bat
```

- Opens on: http://localhost:4201
- Uses: Angular 19

### Option 3: Run Both Apps Simultaneously

```cmd
RUN_BOTH.bat
```

- Frontend: http://localhost:4200
- Admin: http://localhost:4201

## 📦 Project Structure

```
lumina-erp/
├── apps/
│   ├── frontend/         # Main ERP (Angular 17, Port 4200)
│   ├── admin/           # Admin Panel (Angular 19, Port 4201)
│   └── backend/         # NestJS Backend
└── packages/
    └── shared/          # Shared utilities
```

## ⚙️ Available Commands

```bash
# Development
pnpm dev:frontend     # Run frontend only
pnpm dev:admin        # Run admin only
pnpm dev:backend      # Run backend only

# Build
pnpm build:frontend
pnpm build:admin
pnpm build:backend

# Clean specific app
pnpm clean:frontend
pnpm clean:admin
```

## ⚠️ Important Notes

### Angular Version Isolation

- **Frontend:** Angular 17 → Port 4200
- **Admin:** Angular 19 → Port 4201
- Each app has isolated dependencies
- **DO NOT** run `pnpm install` inside individual app folders
- Always install from root: `pnpm install`

### Browser Cache Issues

If you see errors like "Cannot read properties of undefined (reading 'None')":

1. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"

2. **Hard refresh:**
   - Press `Ctrl + Shift + R`

3. **Or use incognito mode:**
   - Press `Ctrl + Shift + N`

### Troubleshooting

#### Problem: Apps won't start

```cmd
# Stop all Node processes
taskkill /F /IM node.exe

# Clean reinstall
complete-clean-install.bat
```

#### Problem: Port already in use

```cmd
# Check what's using the port
netstat -ano | findstr :4200
netstat -ano | findstr :4201

# Kill the process
taskkill /PID <PID> /F
```

#### Problem: Module conflicts

This happens when Angular 17 and 19 modules mix:

1. Stop ALL dev servers
2. Clear browser cache completely
3. Run only ONE app at a time
4. Use separate browser profiles for each app if running both

## 🔧 Development Workflow

### Starting Your Day

1. Pull latest code: `git pull`
2. Install dependencies: `pnpm install`
3. Run your app: `RUN_FRONTEND.bat`

### Before Committing

```bash
pnpm format          # Format code
pnpm lint           # Check linting
pnpm test           # Run tests
```

## 📚 Documentation

- [Frontend README](./apps/frontend/README_FRONTEND.md)
- [Admin README](./apps/admin/README_ADMIN.md)
- [Backend README](./apps/backend/README.md)

## 🆘 Need Help?

1. Check the README for specific app
2. Clear cache and reinstall: `complete-clean-install.bat`
3. Make sure you're running the correct app on the correct port
4. Check browser console for detailed error logs
