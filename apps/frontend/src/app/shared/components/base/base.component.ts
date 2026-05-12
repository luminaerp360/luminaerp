import { Component, inject } from '@angular/core';
import { HotToastService } from '@ngneat/hot-toast';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../../Services/auth.service';
import { NetworkService } from '../../Services/network.service';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
  standalone: true,
})
export class BaseComponent {
  __PARAMS = new BehaviorSubject<any>(null);
  __QUERYPARAMS = new BehaviorSubject<any>(null);
  private networkSubscription: Subscription|null = null;
  isOnline = true;

  protected __ACTIVATED_ROUTE = inject(ActivatedRoute);
  authService = inject(AuthService);
  toast = inject(HotToastService);
  USER: Object | null = JSON.parse(localStorage.getItem('user')!);
  router = inject(Router);
  networkService = inject(NetworkService);

  // Destroy subject for RxJS unsubscription
  destroy$ = new Subject<void>();

  constructor() {
    this.getRouteParamsAndQueries();
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    // Flag to track initial load
    let isFirstLoad = true;
  
    this.networkSubscription = this.networkService.networkStatus$
      .subscribe(status => {
        // Skip first load
        if (isFirstLoad) {
          isFirstLoad = false;
          this.isOnline = status;
          return;
        }
  
        this.isOnline = status;
        
        if (!status) {
          this.toast.error('Network connection lost. Please check your internet', {
            position: 'top-right',
            duration: 5000,
            style: {
              border: '1px solid #FF0000',
              padding: '16px',
              color: '#FF0000',
            }
          });
        } else {
          this.toast.success('Network connection restored', {
            position: 'top-right',
            duration: 3000,
          });
        }
      });
  }

  private getRouteParamsAndQueries() {
    this.__ACTIVATED_ROUTE.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.__QUERYPARAMS.next(data);
        }
      });

    this.__ACTIVATED_ROUTE.params
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.__PARAMS.next(data);
        }
      });
  }

  openLink(link?: string, sameTab?: 'sameTab') {
    if (!link) return;

    if (link.startsWith('https') || link.startsWith('http') || link.startsWith('www.')) {
      if (sameTab === 'sameTab') {
        window.location.href = link;
      } else {
        const newWindow = window.open(link, '_blank');
        newWindow?.focus();
      }
    } else {
      this.router.navigate([link]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.networkSubscription?.unsubscribe();
  }
}