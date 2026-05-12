import { Component, OnInit, NgZone } from '@angular/core';
import {
  environment,
  refreshEnvironment,
} from '../../../../../Environments/environments';
import { HttpClient } from '@angular/common/http';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService } from '../../../../shared/Services/auth.service';
import { LocalStorageService } from '../../../../shared/Services/local-storage.service';
import { GoogleAuthService } from '../../../../shared/Services/google-auth.service';
import { Router } from '@angular/router';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';

interface SubscriptionStatus {
  isActive: boolean;
  daysRemaining: number;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'TRIAL';
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  isGoogleLoading: boolean = false;
  subscriptionStatus: SubscriptionStatus | null = null;
  showSubscriptionWarning: boolean = false;
  subscriptionMessage: string = '';
  showPassword: boolean = false;
  isGoogleReady: boolean = false;

  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: HotToastService,
    private authService: AuthService,
    private localStorageService: LocalStorageService,
    private googleAuthService: GoogleAuthService,
    private orgDetailsService: OrgDetailsService,
    private ngZone: NgZone,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    // Use the new public login endpoint (no organization ID required)
    this.apiUrl = `${environment.apiMainRootUrl}auth/login`;
  }

  ngOnInit(): void {
    // Check if Google is ready
    this.googleAuthService.isGoogleReady().subscribe((ready) => {
      this.isGoogleReady = ready;
      if (ready) {
        this.initializeGoogleSignIn();
      }
    });
  }

  /**
   * Initialize Google Sign-In button
   */
  private initializeGoogleSignIn(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.googleAuthService.initializeGoogleButton(
          'google-signin-button',
          (response: any) => {
            this.ngZone.run(() => {
              this.handleGoogleSignIn(response);
            });
          },
          () => {
            this.ngZone.run(() => {
              this.toast.error('Google Sign-In failed');
            });
          },
        );
      }, 100);
    });
  }

  /**
   * Handle Google Sign-In response
   */
  private handleGoogleSignIn(response: any): void {
    if (!response.credential) {
      this.toast.error('Invalid Google token');
      return;
    }

    this.isGoogleLoading = true;

    // Send token to backend for verification
    this.googleAuthService.signInWithGoogle(response.credential).subscribe(
      (result) => {
        // Get organization ID from the response
        const userOrganizationId =
          result.user.organizationId || result.organizations?.[0]?.id || 1;

        // Store the organization ID for future API calls
        localStorage.setItem('licencedOrg', userOrganizationId.toString());
        localStorage.setItem('authProvider', 'google');

        // Check subscription status before proceeding
        this.checkSubscriptionStatus(+userOrganizationId!, {
          token: result.access_token,
          userEmail: result.email,
          user: result.user,
          response: result,
        });
      },
      (error) => {
        this.isGoogleLoading = false;
        console.error('Google sign-in error:', error);
        this.toast.error(
          error.error?.message || 'Google Sign-In failed. Please try again.',
        );
      },
    );
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.toast.error('Please fill in all fields');
      return;
    }

    this.isLoading = true;
    this.showSubscriptionWarning = false;

    const loginData = {
      email: this.email,
      password: this.password,
    };

    this.http.post(this.apiUrl, loginData).subscribe(
      (response: any) => {
        // Store user data temporarily
        const token = response.access_token;
        const userEmail = response.email;
        const user = response.user;

        // Get organization ID from the response (returned by backend)
        const userOrganizationId =
          user.currentOrganizationId || user.organizationId;

        // Store the organization ID for future API calls
        localStorage.setItem(
          'licencedOrg',
          userOrganizationId?.toString() || '1',
        );

        // Check subscription status before proceeding
        this.checkSubscriptionStatus(+userOrganizationId!, {
          token,
          userEmail,
          user,
          response,
        });
      },
      (error: any) => {
        console.error('Login error:', error);
        this.toast.error(error.error.message || 'Login failed');
        this.isLoading = false;
      },
    );
  }

  private checkSubscriptionStatus(organizationId: number, loginData: any) {
    this.orgDetailsService.checkSubscriptionStatus(organizationId).subscribe(
      (subscriptionStatus: SubscriptionStatus) => {
        this.subscriptionStatus = subscriptionStatus;
        this.handleSubscriptionStatus(subscriptionStatus, loginData);
      },
      (error: any) => {
        console.error('Subscription check error:', error);
        // If subscription check fails, allow login but show warning
        this.toast.warning('Could not verify subscription status');
        this.proceedWithLogin(loginData);
      },
    );
  }

  private handleSubscriptionStatus(status: SubscriptionStatus, loginData: any) {
    switch (status.status) {
      case 'EXPIRED':
        this.showSubscriptionWarning = true;
        this.subscriptionMessage = `Your subscription has expired. Please contact support to renew your subscription.`;
        this.toast.error('Subscription Expired');
        this.isLoading = false;
        break;

      case 'SUSPENDED':
        this.showSubscriptionWarning = true;
        this.subscriptionMessage = `Your account has been suspended. Please contact support for assistance.`;
        this.toast.error('Account Suspended');
        this.isLoading = false;
        break;

      case 'TRIAL':
        if (status.daysRemaining <= 0) {
          this.showSubscriptionWarning = true;
          this.subscriptionMessage = `Your trial period has ended. Please upgrade to continue using the system.`;
          this.toast.warning('Trial Expired');
          this.isLoading = false;
        } else if (status.daysRemaining <= 3) {
          this.subscriptionMessage = `Trial expires in ${status.daysRemaining} day(s). Please upgrade soon.`;
          this.toast.warning(this.subscriptionMessage);
          this.proceedWithLogin(loginData);
        } else {
          this.proceedWithLogin(loginData);
        }
        break;

      case 'ACTIVE':
        if (status.daysRemaining <= 7 && status.daysRemaining > 0) {
          this.toast.warning(
            `Subscription expires in ${status.daysRemaining} day(s)`,
          );
        }
        this.proceedWithLogin(loginData);
        break;

      default:
        // Allow login for unknown status but show warning
        this.toast.warning('Unknown subscription status');
        this.proceedWithLogin(loginData);
    }
  }

  private proceedWithLogin(loginData: any) {
    // Store user data
    this.authService.login(loginData.token, loginData.userEmail);
    localStorage.setItem('token', loginData.response.access_token);
    localStorage.setItem('userEmail', loginData.response.email);
    localStorage.setItem('user', JSON.stringify(loginData.user));

    // Re-evaluate environment URLs now that licencedOrg is set in localStorage
    refreshEnvironment();
    localStorage.setItem(
      'userPermision',
      JSON.stringify(loginData.user.permissions) || '{}',
    );

    // Store subscription status
    if (this.subscriptionStatus) {
      localStorage.setItem(
        'subscriptionStatus',
        JSON.stringify(this.subscriptionStatus),
      );
    }

    // Update auth state
    this.authService.setTokenExpiration();
    this.authService.checkWhetherSessionHasExpired();
    this.authService.user$.next(loginData.user);
    this.authService.userIsLoggedIn();

    // Get organization details
    this.getOrgDetail();

    // Navigate to stored redirect URL or default to sales
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
      localStorage.removeItem('redirectUrl');
      this.router.navigate([redirectUrl]);
    } else {
      this.router.navigate(['/sales']);
    }

    this.toast.success('Login successful');
    this.isLoading = false;
  }

  getOrgDetail() {
    this.orgDetailsService.getAll().subscribe(
      (response: any[]) => {
        localStorage.setItem('orgDetails', JSON.stringify(response[0]));
      },
      (error: any) => {
        console.error('Organization details error:', error);
        this.toast.error('Failed to fetch organization details');
      },
    );
  }

  // Method to retry login after subscription warning
  dismissWarning() {
    this.showSubscriptionWarning = false;
  }

  // Method to contact support
  contactSupport() {
    // Implement your support contact logic here
    this.toast.info('Please contact support at support@dasadove.com');
  }

  // Get subscription status styling
  getSubscriptionStatusClass(): string {
    if (!this.subscriptionStatus) return '';

    switch (this.subscriptionStatus.status) {
      case 'EXPIRED':
      case 'SUSPENDED':
        return 'text-red-400';
      case 'TRIAL':
        return this.subscriptionStatus.daysRemaining <= 3
          ? 'text-yellow-400'
          : 'text-cyan-400';
      case 'ACTIVE':
        return this.subscriptionStatus.daysRemaining <= 7
          ? 'text-yellow-400'
          : 'text-green-400';
      default:
        return 'text-gray-400';
    }
  }

  // Get status icon
  getStatusIcon(): string {
    if (!this.subscriptionStatus) return '⚠️';

    switch (this.subscriptionStatus.status) {
      case 'EXPIRED':
      case 'SUSPENDED':
        return '❌';
      case 'TRIAL':
        return '⏳';
      case 'ACTIVE':
        return '✅';
      default:
        return '⚠️';
    }
  }

  // Toggle password visibility
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
