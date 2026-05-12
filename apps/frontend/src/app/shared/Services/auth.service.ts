import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of, take } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Organization } from '../interfaces/orginization.inteface';
import { HotToastService } from '@ngneat/hot-toast';
import { LocalStorageService } from './local-storage.service';
import { Router } from '@angular/router';
import { environment } from '../../../Environments/environments';
import { UserInterface } from '../interfaces/auth.interface';
import { LoginModalComponent } from '../../modules/auth/components/login-modal/login-modal.component';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { OrganizationResponse } from '../../modules/auth/components/organization-selection/organization-selection.component';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  sessionHasExpired = new BehaviorSubject<boolean>(false);
  sessionTimeout$ = new BehaviorSubject<number>(
    Number(this.localStorageService.getItem('ETA')),
  );
  user$ = new BehaviorSubject<UserInterface | null>(this.getStoredUser());
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    LoginModalComponent,
  );

  // Use the new public login endpoint (no organization ID required)
  private apiUrl = `${environment.apiMainRootUrl}auth/login`;
  private apiUrll = `${environment.apiRootUrl}auth`;
  private licenceUrl = `${environment.licenceUrl}`;
  private isLoggedInSource = new BehaviorSubject<boolean>(false);
  authStatusChanged = this.isLoggedInSource.asObservable();

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private localStorageService: LocalStorageService,
    private toast: HotToastService,
  ) {
    this.checkLoginStatus();

    // Make debug method accessible from browser console (only in development)
    if (typeof window !== 'undefined') {
      (window as any).debugToken = () => this.debugTokenInfo();
    }
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  login(token: string, userEmail: string) {
    this.isLoggedInSource.next(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('token', token);
      localStorage.setItem('userEmail', userEmail);
    }
  }
  signIn(data: any): Observable<any> {
    return this.httpClient.post<any>(this.apiUrl, data);
  }
  // signIn(data: any): Observable<any> {
  //   return this.httpClient.post<any>(this.apiUrl, data).pipe(
  //     map((response: { user: UserInterface | null; }) => {
  //       if (response && response.user) {
  //         localStorage.setItem('user', response.user|| "");
  //         this.user$.next(response.user);
  //       }
  //       return response;
  //     })
  //   );
  // }
  private getStoredUser(): UserInterface | null {
    const storedUser = this.localStorageService.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        return null;
      }
    }
    return null;
  }
  private getStoredUserPermissions(): any | null {
    const storedPermissions = this.localStorageService.getItem('userPermision');
    if (storedPermissions) {
      try {
        return JSON.parse(storedPermissions);
      } catch (e) {
        console.error('Error parsing stored user permissions:', e);
        return null;
      }
    }
    return null;
  }

  getUserPermissions() {
    return this.getStoredUserPermissions();
  }

  hasPermission(permission: string): Observable<boolean> {
    const permissions = this.getUserPermissions();
    const hasPermission = permissions ? !!permissions[permission] : false;
    return of(hasPermission);
  }

  userIsLoggedIn(): Observable<UserInterface | null> {
    return new Observable<UserInterface | null>((subscriber) => {
      const user = this.localStorageService.getItem('user', true);
      subscriber.next(user);
    });
  }

  // logout() {
  //   this.isLoggedInSource.next(false);
  //   if (typeof localStorage !== 'undefined') {
  //     localStorage.removeItem('isLoggedIn');
  //     localStorage.removeItem('token');
  //   }
  // }

  // In auth.service.ts

  verifyLicense(licenseKey: string) {
    return this.httpClient.get<OrganizationResponse>(
      `${this.licenceUrl}license/${licenseKey}`,
    );
  }
  getAllUsers(): Observable<UserInterface[]> {
    const url = `${this.apiUrll}/users`;
    return this.httpClient.get<UserInterface[]>(url);
  }
  getUsersByOrganization(organizationId: number): Observable<UserInterface[]> {
    // Backend endpoint is /users/organization/:id (not /auth/users/organization/:id)
    const url = `${environment.apiMainRootUrl}users/organization/${organizationId}`;
    return this.httpClient.get<UserInterface[]>(url);
  }
  createUser(data: any): Observable<any> {
    const url = `${this.apiUrll}/signup`;
    return this.httpClient.post<any>(url, data);
  }
  updateUser(id: number, data: any): Observable<any> {
    const url = `${this.apiUrll}/users/${id}`;
    return this.httpClient.put<any>(url, data);
  }

  // Profile methods
  getProfile(): Observable<any> {
    return this.httpClient.get<any>(`${environment.apiMainRootUrl}users/me`);
  }

  updateProfile(id: number, data: any): Observable<any> {
    return this.httpClient.patch<any>(
      `${environment.apiMainRootUrl}users/${id}`,
      data,
    );
  }

  changeOwnPassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Observable<any> {
    return this.httpClient.patch<any>(
      `${environment.apiMainRootUrl}users/change-own-password`,
      data,
    );
  }

  changeUserPassword(userId: string | number, newPassword: string): Observable<any> {
    return this.httpClient.patch<any>(
      `${environment.apiMainRootUrl}users/change-password/${userId}`,
      { newPassword },
    );
  }

  deleteUser(userId: string | number): Observable<any> {
    return this.httpClient.delete<any>(
      `${environment.apiMainRootUrl}users/${userId}`,
    );
  }

  private checkLoginStatus() {
    if (typeof localStorage !== 'undefined') {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'true') {
        this.isLoggedInSource.next(true);
      }
    }
  }
  logout(all?: boolean) {
    this.user$.pipe(take(1)).subscribe({
      next: (data) => {
        Promise.resolve(() => {
          this.localStorageService.clear();
        }).then((res) => {
          if (data) {
            this.localStorageService.clear();
            window.location.reload();
          }
        });
      },
    });
  }
  setTokenExpiration() {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    if (token) {
      try {
        // Decode JWT to get expiration time
        const tokenPayload = this.decodeJWT(token);

        if (tokenPayload && tokenPayload.exp) {
          // JWT exp is in seconds, convert to milliseconds
          const expiryTime = tokenPayload.exp * 1000;
          this.localStorageService.setLocalItem('ETA', expiryTime);

          console.log(
            `Token expiry set to: ${new Date(expiryTime).toLocaleString()}`,
          );
          return;
        }
      } catch (error) {
        console.error('Error decoding JWT token:', error);
      }
    }

    // Fallback to default 24-hour expiration if token decode fails
    const defaultExpiryTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours
    this.localStorageService.setLocalItem('ETA', defaultExpiryTime);
  }

  // Helper method to decode JWT token
  private decodeJWT(token: string): any {
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
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return true;

    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return true;

    // Check if token has expired (exp is in seconds, Date.now() is in milliseconds)
    const isExpired = payload.exp * 1000 < Date.now();
    return isExpired;
  }

  // Get token expiry time
  getTokenExpiryTime(): Date | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = this.decodeJWT(token);
    if (!payload || !payload.exp) return null;

    return new Date(payload.exp * 1000);
  }

  // Debug method to display token information (call from browser console)
  debugTokenInfo() {
    const token = localStorage.getItem('token');
    const eta = this.localStorageService.getItem('ETA');

    if (!token) {
      console.log('No token found in localStorage');
      return;
    }

    const payload = this.decodeJWT(token);
    const expiryDate = payload?.exp ? new Date(payload.exp * 1000) : null;
    const now = new Date();
    const storedETA = eta ? new Date(Number(eta)) : null;

    console.log('=== Token Debug Information ===');
    console.log('Token Payload:', payload);
    console.log(
      'Token Issued At (iat):',
      payload?.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A',
    );
    console.log('Token Expires (exp):', expiryDate?.toLocaleString() || 'N/A');
    console.log('Stored ETA:', storedETA?.toLocaleString() || 'N/A');
    console.log('Current Time:', now.toLocaleString());
    console.log('Token Expired:', this.isTokenExpired());

    if (expiryDate) {
      const timeLeft = expiryDate.getTime() - now.getTime();
      const hoursLeft = Math.floor(timeLeft / 1000 / 60 / 60);
      const minutesLeft = Math.floor((timeLeft / 1000 / 60) % 60);
      console.log('Time Remaining:', `${hoursLeft}h ${minutesLeft}m`);
    }

    console.log('Organization ID:', payload?.organizationId);
    console.log('User Role:', payload?.role);
    console.log('================================');

    return {
      payload,
      expiryDate,
      storedETA,
      isExpired: this.isTokenExpired(),
      currentTime: now,
    };
  }

  openDialog(optionalPayload?: any) {
    this.dialog.options = {
      width: '448px',
      height: '354px',
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN_ROTATE,
      animationOut: DisappearanceAnimation.ZOOM_OUT_ROTATE,
    };

    this.dialog.openDialog(optionalPayload).subscribe((resp) => {
      console.log('Response from dialog content:', resp);
    });
  }
  checkWhetherSessionHasExpired() {
    const notification = 'Session has expired, Verify your account';
    const expirationTime: any = this.localStorageService.getItem('ETA');

    if (expirationTime) {
      const expirationDate = Number(expirationTime);
      const now = Number(new Date().getTime());
      const delay = expirationDate - now;

      // Log expiry information for debugging
      const expiryDate = new Date(expirationDate);
      const currentDate = new Date(now);
      const delayMinutes = Math.floor(delay / 1000 / 60);
      const delayHours = Math.floor(delayMinutes / 60);

      console.log('=== Session Expiry Information ===');
      console.log('Current Time:', currentDate.toLocaleString());
      console.log('Token Expires:', expiryDate.toLocaleString());
      console.log('Time Until Expiry:', `${delayHours}h ${delayMinutes % 60}m`);
      console.log('Delay (ms):', delay);
      console.log('================================');

      if (delay <= 0) {
        // Token already expired
        console.warn('Token has already expired!');
        this.toast.info(notification);
        this.sessionHasExpired.next(true);
        const currentUrl = this.router.url;
        if (currentUrl !== '/login') {
          localStorage.setItem('redirectUrl', currentUrl);
        }
        this.openDialog();
      } else {
        setTimeout(() => {
          this.toast.info(notification);
          this.sessionHasExpired.next(true);
          // Store current URL before showing modal
          const currentUrl = this.router.url;
          if (currentUrl !== '/login') {
            localStorage.setItem('redirectUrl', currentUrl);
          }
          this.openDialog();
        }, delay);
      }
    } else {
      console.warn('No expiration time found in localStorage');
      this.sessionHasExpired.next(true);
      // Store current URL before showing modal
      const currentUrl = this.router.url;
      if (currentUrl !== '/login') {
        localStorage.setItem('redirectUrl', currentUrl);
      }
      this.openDialog();
    }
  }
}
