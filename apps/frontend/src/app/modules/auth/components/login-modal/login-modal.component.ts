// login-modal.component.ts
import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../shared/Services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { environment } from '../../../../../Environments/environments';
import { LocalStorageService } from '../../../../shared/Services/local-storage.service';
import { DialogRemoteControl } from '@ng-vibe/dialog';

@Component({
  selector: 'app-login-modal',
  template: `
    <div class="fixed inset-0 flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900/95 backdrop-blur-sm">
      <div
        class="w-full max-w-md p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-cyan-800/30 shadow-2xl transform transition-all relative overflow-hidden"
      >
        <!-- Animated Border Effect -->
        <div class="absolute inset-0 border border-cyan-500/20">
          <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 animate-pulse"></div>
        </div>

        <!-- Scanner Line Effect -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="w-full h-[2px] bg-cyan-400/20 animate-scanner"></div>
        </div>

        <div class="relative z-10">
          <!-- Logo -->
          <div class="flex justify-center mb-6">
            <img
              src="assets/images/logo.png"
              alt="Lumina 360"
              class="h-16 w-auto object-contain"
            />
          </div>

          <!-- Header -->
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-cyan-600 dark:text-cyan-400 tracking-wider" style="text-shadow: 0 0 10px rgba(0, 242, 254, 0.3)">
              System Alert
            </h2>
            <p class="text-cyan-700 dark:text-cyan-300/70 text-sm mt-1">Session authentication required</p>
          </div>

          <!-- Form -->
          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-2">
                Email Authentication
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  class="pl-10 w-full rounded-lg py-3 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-cyan-800/50 text-gray-900 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:ring-opacity-50 transition-colors duration-200"
                  placeholder="Enter system credentials"
                />
              </div>
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="block text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-2">
                Security Key
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  class="pl-10 pr-10 w-full rounded-lg py-3 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-cyan-800/50 text-gray-900 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:ring-opacity-50 transition-colors duration-200"
                  placeholder="Enter security key"
                />
                <button
                  type="button"
                  (click)="togglePasswordVisibility()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                >
                  <svg *ngIf="!showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg *ngIf="showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="isLoading"
              class="relative w-full py-3 px-4 text-white font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-all duration-200"
            >
              <span [class.opacity-0]="isLoading">Reestablish Connection</span>
              <!-- Loading Spinner -->
              <div *ngIf="isLoading" class="absolute inset-0 flex items-center justify-center">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </button>
          </form>

          <!-- Status Text -->
          <div class="mt-6 text-center">
            <p class="text-sm text-cyan-600/60 dark:text-cyan-400/60">
              System Status: <span class="text-cyan-600 dark:text-cyan-400">Awaiting Authentication</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes scanner {
      from {
        transform: translateY(-100%);
      }
      to {
        transform: translateY(100%);
      }
    }
    .animate-scanner {
      animation: scanner 2s linear infinite;
    }
    @keyframes spin-slow {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    .animate-spin-slow {
      animation: spin-slow 4s linear infinite;
    }
    :host ::ng-deep input:focus {
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
    }
  `]
})
export class LoginModalComponent {
  dialogRemoteControl: DialogRemoteControl = inject(DialogRemoteControl);
  toast = inject(HotToastService);
  authService = inject(AuthService);
  router = inject(Router);

  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}auth/login`;
  }

  close(payload?: any): void {
    const data = { payload: payload };
    this.dialogRemoteControl.closeDialog(data);
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.toast.error('Please enter all credentials');
      return;
    }

    this.isLoading = true;
    const loginData = {
      email: this.email,
      password: this.password,
    };

    this.http.post(this.apiUrl, loginData).subscribe(
      (response: any) => {
        const token = response.access_token;
        const userEmail = response.userEmail;
        this.authService.login(token, userEmail);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('userEmail', response.email);
        this.authService.setTokenExpiration();
        this.authService.checkWhetherSessionHasExpired();
        localStorage.setItem('user', JSON.stringify(response.user));
        this.authService.user$.next(response.user);
        this.authService.userIsLoggedIn();
        this.toast.success('Connection reestablished');

        // Get the stored redirect URL and navigate to it
        const redirectUrl = localStorage.getItem('redirectUrl');
        if (redirectUrl) {
          localStorage.removeItem('redirectUrl');
          this.router.navigate([redirectUrl]);
        } else if (this.router.url === '/login') {
          // If on login page and no redirect URL, go to default page
          this.router.navigate(['/sales']);
        }

        this.close();
      },
      (error: any) => {
        console.error('Authentication error:', error);
        this.toast.error('Authentication failed');
      }
    ).add(() => {
      this.isLoading = false;
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}