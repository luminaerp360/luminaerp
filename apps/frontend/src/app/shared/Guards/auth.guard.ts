import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  CanDeactivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { map, Observable, take } from 'rxjs';
import { AuthService } from '../Services/auth.service';
import { HotToastService } from '@ngneat/hot-toast';
import { UserInterface, UserRolesEnum } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: HotToastService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    console.log(
      'this the testing of the login gurd value',
      this.authService.userIsLoggedIn()
    );
    return this.authService.userIsLoggedIn().pipe(
      map((user: UserInterface | null) => {
        if (!user || !user.email) {
          return this.router.parseUrl('/login');
        }

        const userRole = user.role as UserRolesEnum;

        if (userRole === UserRolesEnum.ADMIN) {
          return true; // Admin has access to all routes
        } else if (userRole === UserRolesEnum.SALES) {
          const allowedRoutesForWaiter = [
            'makeSale',
            'credit',
            'dashboard',
            'sales',
          ];
          const requestedRoute = state.url.split('/')[1];

          if (allowedRoutesForWaiter.includes(requestedRoute)) {
            return true;
          } else {
            this.toast.error('You Are not Authorized For This Page');
            return this.router.parseUrl('/sales');
          }
        } else if (userRole === UserRolesEnum.ACCOUNTANT) {
          const allowedRoutesForSales = [
            'makeSale',
            'credit',
            'dashboard',
            'sales',
            'add_petty_cash',
            'sales_reports',
            'inventory',
            'stock',
            'income_reports',
            'credit_sales_report',
            'inventory_reports',
            'advance_report',
          ];
          const requestedRoute = state.url.split('/')[1];

          if (allowedRoutesForSales.includes(requestedRoute)) {
            return true;
          } else {
            this.toast.error('You Are not Authorized For This Page');
            return this.router.parseUrl('/sales');
          }
        }

        // For other roles, handle access as needed

        this.toast.error('You Are not Authorized For This Page');
        return this.router.parseUrl('/sales');
      })
    );
  }

  private isWaiterAuthorizedForRoute(route: string): boolean {
    // Define routes that WAITER is authorized to access within admin module
    const allowedRoutesForWaiter = ['shifts', 'tables'];
    return allowedRoutesForWaiter.includes(route);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    const childRoutePath = childRoute.routeConfig?.path || '';

    if (this.isWaiterAuthorizedForRoute(childRoutePath)) {
      return true; // Waiter can access specific routes in admin module
    } else {
      this.toast.error('You Are not Authorized For This Route');
      return this.router.parseUrl('/sales'); // Redirect to 'menu' for unauthorized access
    }
  }

  userIsLoggedIn(): Observable<boolean> {
    return new Observable((subscriber) => {
      this.authService
        .userIsLoggedIn()
        .pipe(take(1))
        .subscribe({
          next: (data) => {
            if (!data) {
              this.router.navigate(['/login']);
              subscriber.next(false);
              return;
            }
            if (data.email) {
              subscriber.next(true);
            }
          },
          error: (err) => {
            subscriber.next(false);
          },
        });
    });
  }
}
