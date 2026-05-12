# Backend Google OAuth - Installation Steps

## Step 1: Install Required Packages

Run these commands from the root of your project:

```bash
# Install passport and Google OAuth strategy
pnpm add @nestjs/passport passport passport-google-oauth20 google-auth-library
pnpm add -D @types/passport-google-oauth20

# Verify installation
pnpm list @nestjs/passport passport passport-google-oauth20 google-auth-library
```

## Step 2: Update your .env file

Add these variables to `apps/backend/.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Get these values from: https://console.cloud.google.com/

## Step 3: Generate Prisma Migration

```bash
cd apps/backend

# Create migration for new User fields (googleId, googleEmail, authProvider)
pnpm prisma migrate dev --name add_google_oauth_fields

# Generate Prisma client
pnpm prisma:generate
```

When prompted, name the migration: `add_google_oauth`

## Step 4: Verify Installation

Check that these files exist:
- ✅ `apps/backend/src/auth/strategies/google.strategy.ts`
- ✅ `apps/backend/src/auth/guard/google.guard.ts`
- ✅ Updated `apps/backend/src/auth/auth.module.ts`
- ✅ Updated `apps/backend/src/auth/auth.service.ts` (with Google methods)
- ✅ Updated `apps/backend/src/auth/auth.controller.ts` (with Google endpoints)

## Step 5: Update Auth Module

The auth module should be updated to export GoogleStrategy. See the provided `auth.module.ts` update.

## Available Endpoints

After startup, these endpoints will be available:

```bash
# Endpoint to verify Google token and login
POST /auth/google-signin
Body: { "token": "google_id_token_here" }

# Login to specific organization with Google
POST /auth/google-login-to-organization
Body: { "token": "google_id_token_here", "organizationId": 1 }

# Get user info from Google token
POST /auth/google-user-info
Body: { "token": "google_id_token_here" }
```

## Troubleshooting

### "Module not found" errors
```bash
pnpm install
pnpm prisma:generate
```

### "Invalid Client" for Google
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
- Make sure redirect URIs match in Google Cloud Console
- Restart backend after changing .env

### Migration failed
```bash
cd apps/backend
pnpm prisma migrate resolve --rolled-back add_google_oauth
pnpm prisma migrate dev --name add_google_oauth
```

## Next Steps

1. ✅ Install packages
2. ✅ Add environment variables
3. ✅ Run Prisma migration
4. 🔄 Update Auth Module (import GoogleStrategy)
5. ⏳ Update Frontend
