# Google Sign-In Implementation Guide for Lumina ERP

**Complete Guide**: Admin adds users → Users sign in with Google OR email/password

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)
6. [User Flow](#user-flow)

---

## Overview

This implementation adds **Google Sign-In** to Lumina ERP with the following flow:

1. **Admin adds user** to system (via user management) with email
2. **User receives** their account is active
3. **User logs in** by clicking "Sign in with Google" button
4. **System verifies** Google token and matches with existing user
5. **User accesses** the system with both email/password and Google options available

### Key Features
- ✅ Google Sign-In using Google Identity Services (official, modern)
- ✅ Email/password login still works (dual authentication)
- ✅ User must be added by admin first (enterprise secure)
- ✅ Automatic Google ID linking when user signs in
- ✅ Support for multiple organizations per user
- ✅ Subscription status checking before login

---

## Prerequisites

### Google Cloud Setup
1. Active Google Cloud account
2. Created Google Cloud project
3. OAuth 2.0 credentials (Client ID & Secret)
4. OAuth consent screen configured

**See**: [GOOGLE_OAUTH_SETUP_GUIDE.md](GOOGLE_OAUTH_SETUP_GUIDE.md)

### Project Requirements
- Backend: Node.js 18+, NestJS running
- Frontend: Angular 17+, running on localhost:4200
- Database: PostgreSQL with Prisma migrations applied
- Packages: Must install required npm packages

---

## Step-by-Step Implementation

### Phase 1: Backend Setup (5-10 minutes)

#### 1.1 Install Required Packages
```bash
cd /c/Users/Lastborn/Desktop/Lumina/Lumina-erp

# Install all packages
pnpm install

# Install specific Google OAuth packages
pnpm add @nestjs/passport passport passport-google-oauth20 google-auth-library
pnpm add -D @types/passport-google-oauth20

# Verify
pnpm list @nestjs/passport passport
```

**Expected Output**:
```
passport@0.x.x
@nestjs/passport@x.x.x
passport-google-oauth20@x.x.x
google-auth-library@x.x.x
```

#### 1.2 Configure Environment Variables
Add to `apps/backend/.env`:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdef1234567890abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-1234567890-abcdef
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Existing variables...
JWT_SECRET=existing_secret_key
DATABASE_URL=existing_database_url
```

**Get these from**: https://console.cloud.google.com/

#### 1.3 Create Prisma Migration
```bash
cd apps/backend

# Create migration for Google OAuth fields
pnpm prisma migrate dev --name add_google_oauth

# When prompted: 
# - Describe changes: "Add Google OAuth fields to User model"
# - Migration name: add_google_oauth
```

**What it does**:
- Adds `googleId` field to User model
- Adds `googleEmail` field to User model  
- Adds `authProvider` field to User model (tracks 'email' or 'google')

**Expected**: Migration completes successfully

#### 1.4 Verify Backend Files
Check these files exist and are updated:
- ✅ `apps/backend/src/auth/strategies/google.strategy.ts`
- ✅ `apps/backend/src/auth/guard/google.guard.ts`
- ✅ `apps/backend/src/auth/auth.service.ts` (has Google methods)
- ✅ `apps/backend/src/auth/auth.controller.ts` (has Google endpoints)
- ✅ `apps/backend/src/auth/auth.module.ts` (imports GoogleStrategy)
- ✅ `apps/backend/prisma/schema.prisma` (User model updated)

#### 1.5 Test Backend Endpoints
```bash
# Start backend
pnpm dev:backend

# Should see: "Listening on port 3000"
# Google auth endpoints available at:
# POST /auth/google-signin
# POST /auth/google-login-to-organization
# POST /auth/google-user-info
```

---

### Phase 2: Frontend Setup (5-10 minutes)

#### 2.1 Verify Frontend Files
Check these files exist and are updated:
- ✅ `apps/frontend/src/app/shared/Services/google-auth.service.ts`
- ✅ `apps/frontend/src/app/modules/auth/components/login/login.component.ts`
- ✅ `apps/frontend/src/app/modules/auth/components/login/login.component.html`
- ✅ `apps/frontend/src/environments/environments.ts` (has googleClientId)
- ✅ `apps/frontend/src/app/shared/interfaces/environments.interface.ts`

#### 2.2 Update Google Client ID in Frontend

Edit `apps/frontend/src/environments/environments.ts`:
```typescript
export const environment: EnvironmentInterface = {
  apiRootUrl: '...',
  apiMainRootUrl: '...',
  mpesaApiUrl: '...',
  licenceUrl: '...',
  csrfURL: '...',
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',  // ← UPDATE THIS
  production: true,
};
```

**Get your Client ID from**: https://console.cloud.google.com/credentials

#### 2.3 Test Frontend
```bash
# In new terminal
cd /c/Users/Lastborn/Desktop/Lumina/Lumina-erp

# Start frontend
pnpm dev:frontend

# Expected:
# - Frontend loads on http://localhost:4200
# - Login page shows "Sign in with Google" button
# - No console errors
```

---

### Phase 3: Database Setup (2-5 minutes)

#### 3.1 Add Test User (with email)
Using Prisma Studio or your admin panel:

```bash
# Open Prisma Studio
cd apps/backend
npx prisma studio

# Navigate to Users table
# Create a test user:
# - email: test@example.com
# - password: (hashed) your-password-123
# - fullName: Test User
# - organizationId: 1
# - role: ADMIN
# - status: Active
# - googleId: NULL (will be filled on first Google login)
```

Or use your existing admin panel to add a user.

---

## Testing

### Test 1: Email/Password Login (Baseline)
1. Go to http://localhost:4200
2. Enter email: `test@example.com`
3. Enter password: `your-password`
4. Click "Sign In"
5. ✅ Should log in successfully

### Test 2: Google Sign-In (New!)
1. Go to http://localhost:4200
2. Scroll down and find "Sign in with Google" button
3. Click button
4. Google popup appears - select your testing account
5. Allow permissions
6. ✅ Should log in successfully
7. ✅ `localStorage` should show `authProvider: 'google'`

### Test 3: Verify Google ID Linking
```javascript
// In browser console:
localStorage.getItem('authProvider')  // Should show "google"
localStorage.getItem('googleId')      // Should show Google ID

// In Prisma Studio, check User record:
// - googleId should be populated with Google ID
// - googleEmail should be populated
```

### Test 4: Multiple Organizations (if applicable)
1. Sign-in with Google for user with multiple orgs
2. Should show organization selector
3. Select organization
4. ✅ Should log in to selected org

### Test 5: Error Cases
| Test Case | Action | Expected |
|-----------|--------|----------|
| Non-existent user | Try Google with email not added to system | Error: "User not found" |
| Invalid token | Send empty token | Error: "Invalid Google token" |
| Inactive user | Set user status to 'Inactive', try Google login | Error: "User account is not active" |
| Expired subscription | Login with expired subscription | Show subscription warning |

---

## Troubleshooting

### ❌ "Cannot find module 'google-auth-library'"
```bash
pnpm install @nestjs/passport passport passport-google-oauth20 google-auth-library
pnpm dev:backend
```

### ❌ "GOOGLE_CLIENT_ID is not set"
Check `apps/backend/.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_secret_here
```

### ❌ "Google button doesn't appear"
1. Check console for errors: Open DevTools (F12)
2. Check `googleClientId` is set in `environments.ts`
3. Check Google script loads: Look for `google-script` in DOM
4. Verify internet connection (script loads from CDN)

### ❌ "Redirect URI mismatch" error from Google
1. Go to Google Cloud Console
2. Click credentials
3. Click your OAuth client
4. Check that `http://localhost:3000/auth/google/callback` is in the list

### ❌ "User not found" when signing in with Google
1. Ensure user is added to system by admin first
2. Verify user email matches Google email
3. Check user status is "Active"
4. Check user organizationId is set correctly

### ❌ "Token expired" error
```bash
# In backend console, check logs
# May need to restart backend:
pnpm dev:backend
```

### 🔧 Clear Cache & Reset
```bash
# Clear browser
- Open DevTools (F12)
- In Console: localStorage.clear()
- Or: Ctrl+Shift+Delete → Clear browsing data

# Clear backend cache
# Restart backend: Ctrl+C, then pnpm dev:backend

# Reset Discord DB (dangerous - dev only):
cd apps/backend
pnpm prisma migrate reset
```

---

## User Flow

### For Admin
```
1. Go to User Management
2. Click "Add User"
3. Enter email: user@company.com
4. Set role, organization, permissions
5. Click "Create User"
6. System generates temp password OR sends invite link

7. User receives email with credentials
8. User goes to login page
9. User clicks "Sign in with Google"
10. Google popup - user signs in
11. System recognizes user by email
12. User is logged in ✅
```

### For User (First Time)
```
1. Admin adds me with email user@company.com
2. I receive email notification
3. I go to login page
4. I click "Sign in with Google"
5. I authenticate with my Google account
6. I'm logged in!
7. Next time: can use either Google OR email/password
```

### For User (Return Visits)
```
Option A: Email/Password
1. Enter email
2. Enter password
3. Click "Sign In" ✅

Option B: Google Sign-In
1. Click "Sign in with Google"
2. Google authenticates me
3. System knows my Google ID
4. I'm logged in ✅
```

---

## API Endpoints

### Google Sign-In Endpoint
```
POST /auth/google-signin
Content-Type: application/json

Body:
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "user@company.com",
  "user": {
    "id": 1,
    "fullName": "User Name",
    "email": "user@company.com",
    "role": "ADMIN",
    "photoURL": "https://...",
    "organizationId": 1,
    "authProvider": "google"
  },
  "organizations": [
    {
      "id": 1,
      "name": "Company A",
      "isPrimary": true,
      "logoUrl": "https://..."
    }
  ]
}

Error (401):
{
  "error": "User not found. Please ask your admin to add you to the system.",
  "status": 401
}
```

### Get User Info from Token
```
POST /auth/google-user-info
Content-Type: application/json

Body:
{
  "token": "eyJhbGciOiJSUzI1NiIs..."
}

Response (200):
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@company.com",
    "fullName": "User Name",
    "photoURL": "https://..."
  },
  "organizations": [...]
}
```

---

## Database Schema Changes

### User Model (Added Fields)
```prisma
model User {
  // ... existing fields ...
  googleId      String?      @unique      // Google ID (sub claim)
  googleEmail   String?                   // Email from Google
  authProvider  String       @default("email")  // 'email' or 'google'
  
  // ... existing relationships ...
}
```

---

## Security Considerations

✅ **What's Protected**:
- Google secret stored in .env (never exposed)
- tokens validated on backend
- User must exist in system before Google login
- Organization isolation maintained
- JWT tokens expire (24h default)

❌ **Important**:
- Never commit .env files to Git
- Keep GOOGLE_CLIENT_SECRET private
- Verify tokens on every request (done by middleware)
- Monitor login attempts
- Use HTTPS in production

---

## Next Steps

### Immediate (Required)
- [ ] Get Google OAuth credentials
- [ ] Add to backend .env
- [ ] Update frontend googleClientId
- [ ] Run Prisma migration
- [ ] Test with real Google account
- [ ] Add test users

### Soon (Recommended)
- [ ] Add "Link Google Account" in user settings
- [ ] Add "Disconnect Google Account" option
- [ ] Setup login attempt logging
- [ ] Configure email notifications for new logins
- [ ] Setup 2FA integration

### Later (Optional)
- [ ] Add other OAuth providers (GitHub, Microsoft)
- [ ] Add passwordless magic links
- [ ] Add biometric login (fingerprint, face)
- [ ] Advanced security rules (IP whitelist, etc.)

---

## Files Changed

### Backend
- ✅ `apps/backend/src/auth/strategies/google.strategy.ts` (NEW)
- ✅ `apps/backend/src/auth/guard/google.guard.ts` (NEW)
- ✅ `apps/backend/src/auth/auth.service.ts` (MODIFIED - added Google methods)
- ✅ `apps/backend/src/auth/auth.controller.ts` (MODIFIED - added Google endpoints)
- ✅ `apps/backend/src/auth/auth.module.ts` (MODIFIED - import GoogleStrategy)
- ✅ `apps/backend/prisma/schema.prisma` (MODIFIED - User model fields)

### Frontend
- ✅ `apps/frontend/src/app/shared/Services/google-auth.service.ts` (NEW)
- ✅ `apps/frontend/src/app/modules/auth/components/login/login.component.ts` (MODIFIED)
- ✅ `apps/frontend/src/app/modules/auth/components/login/login.component.html` (MODIFIED)
- ✅ `apps/frontend/src/environments/environments.ts` (MODIFIED)
- ✅ `apps/frontend/src/app/shared/interfaces/environments.interface.ts` (MODIFIED)

### Migrations
- ✅ `apps/backend/prisma/migrations/[timestamp]_add_google_oauth/migration.sql` (AUTO-GENERATED)

---

## Support & Documentation

- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2
- **Google Identity Services**: https://developers.google.com/identity/gsi/web
- **NestJS Passport**: https://docs.nestjs.com/techniques/authentication
- **Angular HttpClient**: https://angular.io/api/common/http/HttpClient

---

## Checklist Before Going Live

- [ ] Google OAuth credentials obtained and verified
- [ ] All packages installed
- [ ] Prisma migration run successfully
- [ ] Backend endpoints tested with Postman/curl
- [ ] Frontend Google button renders properly
- [ ] Test user can login with Google
- [ ] Test user can login with email/password
- [ ] Test user can switch organizations (if applicable)
- [ ] Subscription status checks on login
- [ ] Error handling tested (invalid token, user not found, etc.)
- [ ] Console clean of errors/warnings
- [ ] Logout functionality works
- [ ] localStorage properly cleared on logout
- [ ] HTTPS configured (production)
- [ ] Google OAuth URLs updated for production domain

---

**Implementation Completed**: ✅ All code files created and integrated
**Status**: Ready for testing phase

For questions or issues, refer to the troubleshooting section above.
