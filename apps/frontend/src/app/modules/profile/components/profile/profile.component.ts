import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService } from '../../../../shared/Services/auth.service';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Current user
  currentUser: UserInterface | null = null;

  // Active tab
  activeTab: 'profile' | 'security' | 'preferences' | 'activity' = 'profile';

  // Forms
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  preferencesForm!: FormGroup;

  // States
  isLoadingProfile = false;
  isSavingProfile = false;
  isChangingPassword = false;
  isSavingPreferences = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  profileSaved = false;
  passwordChanged = false;

  // Preferences
  currentTheme: 'light' | 'dark' | 'system' = 'light';
  sidebarCompact = false;
  notificationsEnabled = true;
  soundEnabled = true;
  emailNotifications = true;
  dateFormat = 'DD/MM/YYYY';
  currency = 'KES';
  language = 'en';

  // Activity log
  recentActivity: any[] = [];

  // Session info
  sessionInfo = {
    loginTime: '',
    tokenExpiry: '',
    ipAddress: '',
    browser: '',
    lastActive: '',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private toast: HotToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadStoredUser();
    this.initForms();
    this.loadPreferences();
    this.loadSessionInfo();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStoredUser(): void {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch {
        this.currentUser = null;
      }
    }
  }

  private initForms(): void {
    this.profileForm = this.fb.group({
      fullName: [
        this.currentUser?.fullName || '',
        [Validators.required, Validators.minLength(2)],
      ],
      username: [
        this.currentUser?.username || '',
        [Validators.required, Validators.minLength(3)],
      ],
      email: [
        this.currentUser?.email || '',
        [Validators.required, Validators.email],
      ],
      phone: [this.currentUser?.phone || ''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.preferencesForm = this.fb.group({
      theme: [this.currentTheme],
      sidebarCompact: [this.sidebarCompact],
      notificationsEnabled: [this.notificationsEnabled],
      soundEnabled: [this.soundEnabled],
      emailNotifications: [this.emailNotifications],
      dateFormat: [this.dateFormat],
      language: [this.language],
    });
  }

  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    if (
      newPassword &&
      confirmPassword &&
      newPassword.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  loadProfile(): void {
    this.isLoadingProfile = true;
    this.authService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          this.currentUser = user;
          this.profileForm.patchValue({
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            phone: user.phone || '',
          });
          this.isLoadingProfile = false;
        },
        error: (err: any) => {
          // Fallback to stored user data
          this.isLoadingProfile = false;
        },
      });
  }

  private loadPreferences(): void {
    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | 'system';
    this.currentTheme = savedTheme || 'light';

    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        this.sidebarCompact = prefs.sidebarCompact ?? false;
        this.notificationsEnabled = prefs.notificationsEnabled ?? true;
        this.soundEnabled = prefs.soundEnabled ?? true;
        this.emailNotifications = prefs.emailNotifications ?? true;
        this.dateFormat = prefs.dateFormat ?? 'DD/MM/YYYY';
        this.language = prefs.language ?? 'en';
      } catch {}
    }

    this.preferencesForm?.patchValue({
      theme: this.currentTheme,
      sidebarCompact: this.sidebarCompact,
      notificationsEnabled: this.notificationsEnabled,
      soundEnabled: this.soundEnabled,
      emailNotifications: this.emailNotifications,
      dateFormat: this.dateFormat,
      language: this.language,
    });
  }

  private loadSessionInfo(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.sessionInfo.loginTime = payload.iat
          ? new Date(payload.iat * 1000).toLocaleString()
          : 'Unknown';
        this.sessionInfo.tokenExpiry = payload.exp
          ? new Date(payload.exp * 1000).toLocaleString()
          : 'Unknown';
      } catch {}
    }
    this.sessionInfo.browser = this.getBrowserInfo();
    this.sessionInfo.lastActive = new Date().toLocaleString();
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Google Chrome';
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    return 'Unknown Browser';
  }

  // ========== PROFILE TAB ==========

  saveProfile(): void {
    if (this.profileForm.invalid || !this.currentUser) return;

    this.isSavingProfile = true;
    this.profileSaved = false;

    const data = this.profileForm.value;

    this.authService
      .updateProfile(this.currentUser.id, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated: any) => {
          this.isSavingProfile = false;
          this.profileSaved = true;
          this.toast.success('Profile updated successfully');

          // Update local storage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              Object.assign(user, data);
              localStorage.setItem('user', JSON.stringify(user));
              this.currentUser = user;
              this.authService.user$.next(user);
            } catch {}
          }

          setTimeout(() => (this.profileSaved = false), 3000);
        },
        error: (err: any) => {
          this.isSavingProfile = false;
          this.toast.error(err?.error?.message || 'Failed to update profile');
        },
      });
  }

  // ========== SECURITY TAB ==========

  changePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isChangingPassword = true;
    this.passwordChanged = false;

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService
      .changeOwnPassword({ currentPassword, newPassword })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isChangingPassword = false;
          this.passwordChanged = true;
          this.toast.success('Password changed successfully');
          this.passwordForm.reset();
          setTimeout(() => (this.passwordChanged = false), 3000);
        },
        error: (err: any) => {
          this.isChangingPassword = false;
          const message = err?.error?.message || 'Failed to change password';
          this.toast.error(message);
        },
      });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  getPasswordStrength(): {
    level: string;
    color: string;
    width: string;
    label: string;
  } {
    const password = this.passwordForm.get('newPassword')?.value || '';
    if (!password)
      return { level: 'none', color: 'bg-gray-200', width: 'w-0', label: '' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1)
      return {
        level: 'weak',
        color: 'bg-red-500',
        width: 'w-1/4',
        label: 'Weak',
      };
    if (score <= 2)
      return {
        level: 'fair',
        color: 'bg-orange-500',
        width: 'w-2/4',
        label: 'Fair',
      };
    if (score <= 3)
      return {
        level: 'good',
        color: 'bg-yellow-500',
        width: 'w-3/4',
        label: 'Good',
      };
    return {
      level: 'strong',
      color: 'bg-green-500',
      width: 'w-full',
      label: 'Strong',
    };
  }

  // ========== PREFERENCES TAB ==========

  savePreferences(): void {
    this.isSavingPreferences = true;
    const prefs = this.preferencesForm.value;

    // Apply theme
    this.currentTheme = prefs.theme;
    localStorage.setItem('theme', prefs.theme);
    this.applyTheme(prefs.theme);

    // Save other preferences
    const savedPrefs = {
      sidebarCompact: prefs.sidebarCompact,
      notificationsEnabled: prefs.notificationsEnabled,
      soundEnabled: prefs.soundEnabled,
      emailNotifications: prefs.emailNotifications,
      dateFormat: prefs.dateFormat,
      language: prefs.language,
    };
    localStorage.setItem('userPreferences', JSON.stringify(savedPrefs));

    setTimeout(() => {
      this.isSavingPreferences = false;
      this.toast.success('Preferences saved successfully');
    }, 500);
  }

  private applyTheme(theme: string): void {
    const html = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      prefersDark ? html.classList.add('dark') : html.classList.remove('dark');
    } else if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.preferencesForm.patchValue({ theme });
  }

  // ========== HELPERS ==========

  getInitials(): string {
    const name =
      this.currentUser?.fullName || this.currentUser?.username || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getRoleBadgeColor(): string {
    const role = (this.currentUser?.role || '').toLowerCase();
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'sales':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'manager':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getMemberSince(): string {
    if (this.currentUser?.created_at) {
      return new Date(this.currentUser.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
    return 'Unknown';
  }

  getTokenTimeRemaining(): string {
    const token = localStorage.getItem('token');
    if (!token) return 'No session';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return 'Unknown';
      const remaining = payload.exp * 1000 - Date.now();
      if (remaining <= 0) return 'Expired';
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    } catch {
      return 'Unknown';
    }
  }

  getPermissionKeys(): string[] {
    const perms = this.currentUser?.permissions;
    if (!perms || typeof perms !== 'object') return [];
    return Object.keys(perms).filter((key) => (perms as any)[key] === true);
  }
}
