// apps/frontend/src/app/shared/Services/google-auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../Environments/environments';
import { of } from 'rxjs';

export interface GoogleSignInResponse {
  access_token: string;
  email: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
    photoURL: string;
    organizationId: number;
    authProvider: string;
  };
  organizations?: Array<{
    id: number;
    name: string;
    isPrimary: boolean;
    logoUrl: string;
  }>;
}

declare global {
  interface Window {
    google: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private apiUrl = `${environment.apiMainRootUrl}auth`;
  private googleClientId = environment.googleClientId;
  private googleScriptLoaded = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadGoogleScript();
  }

  /**
   * Load Google Identity Services script from CDN
   * This must be called before using Google Sign-In
   */
  private loadGoogleScript(): void {
    if (document.getElementById('google-script')) {
      this.googleScriptLoaded.next(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Google Identity Services script loaded');
      this.googleScriptLoaded.next(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Identity Services');
      this.googleScriptLoaded.next(false);
    };

    document.head.appendChild(script);
  }

  /**
   * Initialize Google Sign-In button
   * Call this after your login component is loaded
   * @param containerElementId - ID of HTML element where button should be rendered
   * @param onSuccess - Callback function when user signs in successfully
   * @param onError - Callback function if sign-in fails
   */
  public initializeGoogleButton(
    containerElementId: string,
    onSuccess: (response: any) => void,
    onError: () => void,
  ): void {
    // Wait for Google script to load
    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: onSuccess,
          auto_select: false,
          use_fedcm_for_prompt: true,
        });

        const container = document.getElementById(containerElementId);
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            locale: 'en_US',
          });
        } else {
          console.warn(
            `Container element with ID "${containerElementId}" not found`,
          );
        }
      } else {
        // Retry after 100ms if Google not ready
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    if (this.googleScriptLoaded.value) {
      checkGoogleLoaded();
    } else {
      // Wait for script to load
      this.googleScriptLoaded.subscribe((loaded) => {
        if (loaded) {
          checkGoogleLoaded();
        }
      });
    }
  }

  /**
   * Sign in user with Google token
   * Sends the ID token to backend for verification
   * @param token - Google ID token from Google Sign-In
   */
  public signInWithGoogle(token: string): Observable<GoogleSignInResponse> {
    return this.http
      .post<GoogleSignInResponse>(`${this.apiUrl}/google-signin`, { token })
      .pipe(
        map((response) => {
          // Store token and user info
          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('userEmail', response.email);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('authProvider', 'google');

            // Store organization info if available
            if (response.organizations && response.organizations.length > 0) {
              const primaryOrg =
                response.organizations.find((org) => org.isPrimary) ||
                response.organizations[0];
              localStorage.setItem('licencedOrg', primaryOrg.id.toString());
              localStorage.setItem(
                'organizationName',
                primaryOrg.name.toString(),
              );
            }
          }
          return response;
        }),
        catchError((error) => {
          console.error('Google sign-in error:', error);
          throw error;
        }),
      );
  }

  /**
   * Sign in to a specific organization with Google token
   * @param token - Google ID token from Google Sign-In
   * @param organizationId - Organization ID to sign in to
   */
  public signInToOrganizationWithGoogle(
    token: string,
    organizationId: number,
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/google-login-to-organization`, {
        token,
        organizationId,
      })
      .pipe(
        map((response) => {
          if (response.access_token) {
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('licencedOrg', organizationId.toString());
            localStorage.setItem('authProvider', 'google');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Google organization sign-in error:', error);
          throw error;
        }),
      );
  }

  /**
   * Get user information from Google token
   * Useful for displaying user info after Google Sign-In
   * @param token - Google ID token
   */
  public getUserInfoFromToken(
    token: string,
  ): Observable<{
    success: boolean;
    user: {
      id: number;
      email: string;
      fullName: string;
      photoURL: string;
    };
    organizations: Array<{
      id: number;
      name: string;
      isPrimary: boolean;
      logoUrl: string;
    }>;
  }> {
    return this.http.post<any>(`${this.apiUrl}/google-user-info`, { token });
  }

  /**
   * Check if Google is available and ready
   */
  public isGoogleReady(): Observable<boolean> {
    return this.googleScriptLoaded.asObservable();
  }

  /**
   * Helper to decode JWT token (for frontend display only)
   * Note: Always verify tokens on backend for security
   */
  public decodeGoogleToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Sign out user (clears local storage)
   */
  public signOut(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authProvider');

    // Also sign out from Google
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  /**
   * Check if user is currently authenticated with Google
   */
  public isGoogleAuthenticated(): boolean {
    const authProvider = localStorage.getItem('authProvider');
    const token = localStorage.getItem('access_token');
    return authProvider === 'google' && !!token;
  }
}
