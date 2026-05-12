import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../Services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const requiredPermission = route.data['requiredPermission'] as string;
    console.log('PermissionGuard - Required permission:', requiredPermission);

    // First check if user is logged in
    return this.authService.userIsLoggedIn().pipe(
      take(1),
      switchMap((user) => {
        console.log('PermissionGuard - user:', user);

        // If no user, redirect to login
        if (!user || !user.email) {
          console.log('PermissionGuard - No user, redirecting to login');
          return of(this.router.parseUrl('/login'));
        }

        // If no permission required, allow access
        if (!requiredPermission) {
          return of(true);
        }

        // Check if user has the required permission
        return this.authService.hasPermission(requiredPermission).pipe(
          map((hasPermission) => {
            console.log(
              `PermissionGuard - Has permission '${requiredPermission}':`,
              hasPermission
            );
            if (hasPermission) {
              return true;
            } else {
              // User is logged in but doesn't have permission
              // If already trying to access dashboard, just allow it to avoid infinite loop
              if (requiredPermission === 'dashboard') {
                console.log(
                  'PermissionGuard - No dashboard permission but allowing to avoid loop'
                );
                return true;
              }
              // Redirect to dashboard for other routes
              console.log(
                'PermissionGuard - No permission, redirecting to dashboard'
              );
              return this.router.parseUrl('/dashboard');
            }
          })
        );
      })
    );
  }
}
