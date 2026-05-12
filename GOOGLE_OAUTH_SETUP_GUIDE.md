# Google OAuth Setup Guide for Lumina ERP

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top
4. Click **"NEW PROJECT"**
5. Enter project name: `Lumina ERP` (or your choice)
6. Click **CREATE**

## Step 2: Enable OAuth 2.0 Consent Screen

1. In Google Cloud Console, go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type (even for internal use)
3. Click **CREATE**
4. Fill in the form:
   - **App name**: `Lumina ERP`
   - **User support email**: your-email@gmail.com (your email)
   - **Developer contact**: your-email@gmail.com
5. Click **SAVE AND CONTINUE**
6. Click **ADD OR REMOVE SCOPES**
   - Add these scopes:
     - `openid`
     - `email`
     - `profile`
   - Search and select them, then click **UPDATE**
7. Click **SAVE AND CONTINUE**
8. On the "Test users" page, click **ADD USERS**
   - Add your email address (the one you'll test with)
9. Click **SAVE AND CONTINUE**
10. Review and click **BACK TO DASHBOARD**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **OAuth client ID**
4. Choose application type: **Web application**
5. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3000/auth/google/callback
   http://localhost:4200
   http://localhost:8080
   https://yourdomain.com
   https://yourdomain.com/auth/google/callback
   ```
   *(Replace `yourdomain.com` with your actual domain for production)*
6. Click **CREATE**
7. A popup will show your credentials:
   - **Client ID**: Copy this
   - **Client Secret**: Copy this
8. Click **DOWNLOAD JSON** to save as backup

## Step 4: Add Credentials to Environment Files

### Backend (.env)
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Frontend (environment.ts)
```typescript
export const environment: EnvironmentInterface = {
  // ... existing config
  googleClientId: 'your_client_id_here.apps.googleusercontent.com',
};
```

## Step 5: Enable Google+ API (Optional but Recommended)

1. Go to **APIs & Services > Library**
2. Search for **"Google+ API"**
3. Click on it and click **ENABLE**

## Important Notes

- **Client ID**: Public, safe to share (used in frontend)
- **Client Secret**: Private, NEVER commit to Git (keep in .env only)
- **Redirect URIs**: Must match exactly (including http/https)
- **Test Users**: In testing phase, only added test users can sign in
- **Production Launch**: Submit for verification to allow all Google accounts

## Troubleshooting

### "Redirect URI mismatch" error
- Check that your redirect URI matches EXACTLY (http vs https, trailing slash, etc.)
- Make sure you added it in Google Console under Credentials

### "Invalid Client" error
- Verify Client ID and Secret are correct
- Check they're from the right Google project
- Restart backend after changing .env

### Testing locally
- Use `localhost` with proper ports
- Your Google account must be added as a test user
- Can take up to 10 minutes for changes to propagate

## Next Steps

Once you have:
- ✅ Client ID
- ✅ Client Secret
- ✅ Added to .env files

You're ready for the integration implementation!
