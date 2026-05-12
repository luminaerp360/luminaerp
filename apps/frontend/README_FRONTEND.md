# Lumina ERP - Frontend App

## Technology Stack

- **Angular:** 17.1.0
- **Port:** 4200
- **Purpose:** Main ERP application for business operations

## Running the Frontend

### From Root Directory

```bash
# Development mode
pnpm dev:frontend

# Build for production
pnpm build:frontend

# Start production build
pnpm start:frontend
```

### Or use the batch file

```cmd
RUN_FRONTEND.bat
```

### From Frontend Directory

```bash
cd apps/frontend

# Development
pnpm dev

# Build
pnpm build
```

## Important Notes

⚠️ **ANGULAR VERSION ISOLATION**

- Frontend uses Angular 17
- Admin uses Angular 19 (separate app)
- DO NOT upgrade Angular in frontend without updating admin
- Each app maintains its own dependencies

## Development

### Clear Cache & Restart

```bash
# From frontend directory
cd apps/frontend

# Clear Angular cache
rm -rf .angular dist

# Start fresh
pnpm dev
```

### Browser Cache

If you see module errors:

1. Press `Ctrl + Shift + Delete`
2. Clear "Cached images and files"
3. Hard refresh: `Ctrl + Shift + R`

## Available URLs

- **Dev Server:** http://localhost:4200
- **Login:** http://localhost:4200/login
- **Dashboard:** http://localhost:4200/dashboard

## Troubleshooting

### "Cannot read properties of undefined (reading 'None')"

This happens when Angular 19 modules from admin are cached:

1. Stop all dev servers
2. Clear browser cache completely
3. Run `RUN_FRONTEND.bat`
4. Hard refresh browser

### Port 4200 already in use

```bash
# Windows
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Or just stop the process in task manager
```
