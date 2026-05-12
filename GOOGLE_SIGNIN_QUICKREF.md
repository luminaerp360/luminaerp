# Google Sign-In Quick Reference

## Files Created/Modified

### ✅ Backend Files
```
apps/backend/src/auth/
├── strategies/
│   └── google.strategy.ts                (NEW)
├── guard/
│   └── google.guard.ts                   (NEW)
├── auth.service.ts                       (MODIFIED - Added Google methods)
├── auth.controller.ts                    (MODIFIED - Added Google endpoints)
└── auth.module.ts                        (MODIFIED - Import GoogleStrategy)

apps/backend/prisma/
├── schema.prisma                         (MODIFIED - User fields)
└── migrations/
    └── [timestamp]_add_google_oauth/     (AUTO - Created by Prisma)
```

### ✅ Frontend Files
```
apps/frontend/src/app/
├── shared/Services/
│   └── google-auth.service.ts            (NEW)
├── modules/auth/components/login/
│   ├── login.component.ts                (MODIFIED)
│   └── login.component.html              (MODIFIED)
└── shared/interfaces/
    └── environments.interface.ts         (MODIFIED)

apps/frontend/src/environments/
└── environments.ts                       (MODIFIED)
```

### ✅ Documentation Created
```
GOOGLE_OAUTH_SETUP_GUIDE.md                (How to get credentials)
BACKEND_GOOGLE_OAUTH_STEPS.md              (Backend setup)
GOOGLE_SIGNIN_IMPLEMENTATION_GUIDE.md      (Complete guide)
GOOGLE_SIGNIN_QUICKREF.md                  (This file)
```

---

## 30-Second Setup

### 1. Get Credentials
Visit: https://console.cloud.google.com/
- Create project "Lumina ERP"
- Get Client ID & Secret

### 2. Add to Backend
Edit `apps/backend/.env`:
```env
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 3. Add to Frontend
Edit `apps/frontend/src/environments/environments.ts`:
```typescript
googleClientId: 'your_id.apps.googleusercontent.com',
```

### 4. Install Packages (from root)
```bash
pnpm install
pnpm add @nestjs/passport passport passport-google-oauth20 google-auth-library
pnpm add -D @types/passport-google-oauth20
```

### 5. Create Database Migration
```bash
cd apps/backend
pnpm prisma migrate dev --name add_google_oauth
```

### 6. Start & Test
```bash
# Terminal 1: Backend
pnpm dev:backend

# Terminal 2: Frontend  
pnpm dev:frontend

# Browser: http://localhost:4200
# Click "Sign in with Google"
```

---

## Google Console Setup (Visual)

```
Google Cloud Console
├── Create Project "Lumina ERP"
├── Enable Google+ API
├── OAuth 2.0 Consent Screen
│   ├── Select "External"
│   ├── Add app name, email, support info
│   ├── Add scopes: openid, email, profile
│   └── Add test user: your@email.com
├── Credentials
│   ├── Create OAuth 2.0 Client ID (Web)
│   ├── Add Authorized redirect URIs:
│   │   ├── http://localhost:3000/auth/google/callback
│   │   ├── http://localhost:4200
│   │   ├── https://yourdomain.com
│   │   └── https://yourdomain.com/auth/google/callback
│   ├── Copy Client ID
│   └── Copy Client Secret
```

---

## Login Flow

```
User                Backend              Google              DB
  |                   |                   |                   |
  |-- Google popup -->|                   |                   |
  |                   |                   |                   |
  |                   |<-- Redirects ----->|                   |
  |<-- Redirects with token ---|           |                   |
  |                   |                    |                   |
  |-- Send token ---->|                    |                   |
  |                   |-- Verify token -->|                   |
  |                   |<-- Payload -------|                   |
  |                   |-- Find user --------------|           |
  |                   |<------- User Data ---------|           |
  |                   |-- Sign JWT ------                      |
  |<-- JWT & User ----|                         |           |
  |                   |                         |           |
  |-- Store JWT in localStorage              |           |
  |-- Redirect to dashboard               |           |
  ✅ Logged in!                           |           |
```

---

## API Endpoints

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/auth/google-signin` | POST | `{token}` | `{access_token, user, organizations}` |
| `/auth/google-login-to-organization` | POST | `{token, organizationId}` | `{access_token, user}` |
| `/auth/google-user-info` | POST | `{token}` | `{user, organizations}` |

---

## Database Schema (New Fields)

```sql
-- Added to users table:
- googleId VARCHAR(255) UNIQUE       -- Google ID
- googleEmail VARCHAR(255)            -- Email from Google
- authProvider VARCHAR(50) DEFAULT 'email'  -- 'email' or 'google'
```

---

## Common Commands

```bash
# Install packages
pnpm add @nestjs/passport passport passport-google-oauth20 google-auth-library

# Run Prisma migration
cd apps/backend && pnpm prisma migrate dev --name add_google_oauth

# Reset database (⚠️ deletes data)
cd apps/backend && pnpm prisma migrate reset

# View database GUI
cd apps/backend && npx prisma studio

# Start backend
pnpm dev:backend

# Start frontend
pnpm dev:frontend

# Clear browser cache
localStorage.clear()
```

---

## Troubleshooting Matrix

| Problem | Solution |
|---------|----------|
| No Google button | Check `googleClientId` in environments.ts |
| "Cannot find module" | `pnpm install` then `pnpm dev:backend` |
| "Redirect URI mismatch" | Add URI to Google Cloud Credentials |
| "User not found" | Admin must add user first, verify email matches |
| "Invalid token" | Check token sent to backend, verify credentials |
| "Port 3000 in use" | `netstat -ano \| findstr :3000` then `taskkill /PID xxx /F` |

---

## Security Checklist

- ✅ Google Secret in .env (never in code)
- ✅ Tokens verified on backend
- ✅ HTTPS in production
- ✅ User must exist before Google login
- ✅ Organization isolation maintained
- ✅ JWT tokens expire
- ✅ Subscription status checked
- ✅ Inactive users blocked

---

## Testing Scenarios

```javascript
// Test 1: Email/Password
email: admin@example.com
password: your-password
→ Should log in

// Test 2: Google Login
Click "Sign in with Google"
→ Google popup appears
→ Sign with same email: admin@example.com
→ Should log in

// Test 3: Check localStorage
localStorage.getItem('authProvider')  // 'google'
localStorage.getItem('access_token')  // JWT token
```

---

## File Locations Quick Reference

| File | Location |
|------|----------|
| Backend env | `apps/backend/.env` |
| Frontend env | `apps/frontend/src/environments/environments.ts` |
| Google strategy | `apps/backend/src/auth/strategies/google.strategy.ts` |
| Google service | `apps/frontend/src/app/shared/Services/google-auth.service.ts` |
| Login page | `apps/frontend/src/app/modules/auth/components/login/` |
| Database schema | `apps/backend/prisma/schema.prisma` |
| Migrations | `apps/backend/prisma/migrations/` |

---

## Environment Variables

### Backend (.env)
```env
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your-existing-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### Frontend (environments.ts)
```typescript
googleClientId: '123456789-abc...apps.googleusercontent.com'
apiMainRootUrl: 'http://localhost:3000/'
```

---

## Performance Tips

- ✅ Google script loads asynchronously (non-blocking)
- ✅ Token verification cached on backend
- ✅ User lookup optimized (by email then googleId)
- ✅ Organizations fetched once per login
- ✅ JWT stored in memory (fast access)

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Works well |
| Safari | ✅ Full | Works well |
| Edge | ✅ Full | Works well |
| IE 11 | ❌ No | Not supported (Google script) |

---

## Next Features (Optional)

```
Phase 2:
- Link Google to existing account  
- Disconnect Google
- Login attempts logging
- Failed login notifications

Phase 3:
- 2FA with Google Authenticator
- Hardware security keys (U2F)
- Other OAuth (GitHub, Microsoft)
- Magic link passwordless login
```

---

## Support Resources

- 📖 [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP_GUIDE.md)
- 📖 [Complete Implementation Guide](GOOGLE_SIGNIN_IMPLEMENTATION_GUIDE.md)
- 📖 [Backend Steps](BACKEND_GOOGLE_OAUTH_STEPS.md)
- 🔗 [Google OAuth Documentation](https://developers.google.com/identity)
- 🔗 [NestJS Auth Docs](https://docs.nestjs.com/techniques/authentication)
- 🔗 [Angular HttpClient](https://angular.io/api/common/http)

---

## Status

✅ **All code implemented and integrated**
✅ **Backend services created**
✅ **Frontend components updated**
✅ **Database schema modified**
✅ **Environment configuration ready**
✅ **Documentation complete**

🔄 **Next**: Get Google credentials and test!

---

**Last Updated**: March 2026
**Version**: 1.0.0
**Status**: Ready for Implementation
