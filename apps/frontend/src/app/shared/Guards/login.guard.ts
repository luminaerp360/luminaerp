import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { Injectable } from '@angular/core';
import { AuthService } from '../Services/auth.service';
import { Observable, map, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    // For login/auth pages: allow access if NOT logged in
    // If already logged in, redirect to dashboard
    return this.authService.userIsLoggedIn().pipe(
      take(1),
      map((user) => {
        console.log('LoginGuard - user:', user);

        if (user && user.email) {
          // User is already logged in, redirect to dashboard
          console.log('LoginGuard - user logged in, redirecting to dashboard');
          return this.router.parseUrl('/dashboard');
        } else {
          // User is not logged in, allow access to login page
          console.log('LoginGuard - no user, allowing access to login');
          return true;
        }
      })
    );
  }
}
