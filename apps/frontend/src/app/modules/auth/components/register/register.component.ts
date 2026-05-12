import { Component, OnInit, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { GoogleAuthService } from '../../../../shared/Services/google-auth.service';
import {
  environment,
  refreshEnvironment,
} from '../../../../../Environments/environments';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  // Form fields
  organizationName = '';
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';

  // UI state
  isLoading = false;
  isGoogleLoading = false;
  isGoogleReady = false;
  showPassword = false;
  showConfirmPassword = false;

  // Post-submit state
  registrationSuccess = false;
  registeredEmail = '';
  isResendingVerification = false;
  resendCooldown = 0;
  private resendInterval: any;

  private apiUrl = `${environment.apiMainRootUrl}auth`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: HotToastService,
    private googleAuthService: GoogleAuthService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.googleAuthService.isGoogleReady().subscribe((ready) => {
      this.isGoogleReady = ready;
      if (ready) {
        this.initGoogleButton();
      }
    });
  }

  private initGoogleButton(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.googleAuthService.initializeGoogleButton(
          'google-register-button',
          (response: any) => {
            this.ngZone.run(() => this.handleGoogleRegister(response));
          },
          () => {
            this.ngZone.run(() =>
              this.toast.error('Google Sign-In failed. Please try again.'),
            );
          },
        );
      }, 300);
    });
  }

  get passwordStrength(): { level: number; label: string; color: string } {
    const p = this.password;
    if (!p) return { level: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Fair', color: 'bg-yellow-500' };
    return { level: 3, label: 'Strong', color: 'bg-green-500' };
  }

  get passwordsMatch(): boolean {
    return !this.confirmPassword || this.password === this.confirmPassword;
  }

  onSubmit(): void {
    if (
      !this.organizationName ||
      !this.fullName ||
      !this.email ||
      !this.password
    ) {
      this.toast.error('Please fill in all required fields.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.toast.error('Passwords do not match.');
      return;
    }
    if (this.password.length < 8) {
      this.toast.error('Password must be at least 8 characters.');
      return;
    }

    this.isLoading = true;
    const payload = {
      organizationName: this.organizationName.trim(),
      fullName: this.fullName.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      phone: this.phone.trim(),
    };

    this.http.post<any>(`${this.apiUrl}/register`, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.requiresEmailVerification) {
          this.registeredEmail = payload.email;
          this.registrationSuccess = true;
        } else {
          this.toast.success('Registration successful!');
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg =
          err.error?.message ||
          err.message ||
          'Registration failed. Please try again.';
        this.toast.error(msg);
      },
    });
  }

  private handleGoogleRegister(response: any): void {
    if (!this.organizationName) {
      this.toast.error(
        'Please enter your business name before signing up with Google.',
      );
      return;
    }
    this.isGoogleLoading = true;

    const payload = {
      token: response.credential,
      organizationName: this.organizationName.trim(),
      phone: this.phone.trim(),
    };

    this.http.post<any>(`${this.apiUrl}/google-register`, payload).subscribe({
      next: (res) => {
        this.isGoogleLoading = false;
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
          localStorage.setItem('userEmail', res.user?.email || '');
          if (res.user?.organizationId) {
            localStorage.setItem(
              'licencedOrg',
              String(res.user.organizationId),
            );
            refreshEnvironment();
          }
          this.toast.success(
            `Welcome, ${res.user?.fullName}! Your 3-month free trial has started.`,
          );
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isGoogleLoading = false;
        const msg =
          err.error?.message || err.message || 'Google registration failed.';
        this.toast.error(msg);
      },
    });
  }

  resendVerification(): void {
    if (this.resendCooldown > 0) return;
    this.isResendingVerification = true;

    this.http
      .post<any>(`${this.apiUrl}/resend-verification`, {
        email: this.registeredEmail,
      })
      .subscribe({
        next: () => {
          this.isResendingVerification = false;
          this.toast.success('Verification email sent! Check your inbox.');
          this.startResendCooldown();
        },
        error: () => {
          this.isResendingVerification = false;
          this.toast.error('Failed to resend email. Please try again.');
        },
      });
  }

  private startResendCooldown(): void {
    this.resendCooldown = 60;
    this.resendInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendInterval);
        this.resendCooldown = 0;
      }
    }, 1000);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
