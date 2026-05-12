// src/shared/services/multi-organization.service.ts - FIXED VERSION
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  environment,
  environmentService,
} from '../../../Environments/environments';
import { UserOrganization } from '../interfaces/user-organization.interface';
import { LocalStorageService } from './local-storage.service';
import { HotToastService } from '@ngneat/hot-toast';

@Injectable({
  providedIn: 'root',
})
export class MultiOrganizationService {
  private currentOrganizationSubject =
    new BehaviorSubject<UserOrganization | null>(null);
  public currentOrganization$ = this.currentOrganizationSubject.asObservable();

  private userOrganizationsSubject = new BehaviorSubject<UserOrganization[]>(
    []
  );
  public userOrganizations$ = this.userOrganizationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
    private toast: HotToastService
  ) {
    this.loadCurrentOrganization();
  }

  private loadCurrentOrganization() {
    const stored = this.localStorageService.getItem(
      'currentOrganization',
      true
    );
    if (stored) {
      this.currentOrganizationSubject.next(stored);
    }
  }

  // FIXED: Properly parse and clean organization ID
  getCurrentOrgId(): number {
    try {
      const currentOrg = this.currentOrganizationSubject.value;
      if (currentOrg?.id) {
        return parseInt(currentOrg.id.toString(), 10);
      }

      // Try from localStorage
      let orgIdStr = this.localStorageService.getItem('licencedOrg');

      if (!orgIdStr || orgIdStr === 'null' || orgIdStr === 'undefined') {
        const currentOrgStr = this.localStorageService.getItem(
          'currentOrganization'
        );
        if (currentOrgStr) {
          try {
            const parsedOrg =
              typeof currentOrgStr === 'string'
                ? JSON.parse(currentOrgStr)
                : currentOrgStr;
            orgIdStr = parsedOrg?.id?.toString();
          } catch (e) {
            console.error('Error parsing currentOrganization:', e);
          }
        }
      }

      if (orgIdStr) {
        // Remove any quotes or extra characters
        const cleanedId = orgIdStr.toString().replace(/['"]/g, '');
        const numericId = parseInt(cleanedId, 10);

        if (!isNaN(numericId) && numericId > 0) {
          return numericId;
        }
      }
    } catch (error) {
      console.error('Error getting current org ID:', error);
    }

    return 1; // Default fallback
  }

  getCurrentOrganization(): UserOrganization | null {
    return this.currentOrganizationSubject.value;
  }

  // FIXED: Use clean organization ID in URL
  getUserOrganizations(userId: number): Observable<UserOrganization[]> {
    const currentOrgId = this.getCurrentOrgId();
    // Use the environmentService to get clean URL
    const baseUrl = environmentService.getApiRootUrl();
    const url = `${baseUrl}auth/${userId}/organizations`;

    console.log('Fetching user organizations from URL:', url); // Debug log

    return this.http.get<UserOrganization[]>(url).pipe(
      map((organizations: UserOrganization[]) => {
        console.log('Received organizations:', organizations); // Debug log
        this.userOrganizationsSubject.next(organizations);

        // Set current org if not already set
        if (
          !this.currentOrganizationSubject.value &&
          organizations.length > 0
        ) {
          const primaryOrg =
            organizations.find((org) => org.isPrimary) || organizations[0];
          this.setCurrentOrganization(primaryOrg);
        }

        return organizations;
      }),
      catchError((error) => {
        console.error('Error fetching user organizations:', error);
        console.error('Failed URL:', url); // Debug log
        this.toast.error('Failed to load organizations');
        return of([]);
      })
    );
  }

  // FIXED: Properly store organization ID without quotes
  setCurrentOrganization(organization: UserOrganization) {
    console.log('Setting current organization:', organization); // Debug log

    // Store the full organization object
    this.localStorageService.setLocalItem('currentOrganization', organization);

    // Store clean numeric ID
    const cleanId = parseInt(organization.id.toString(), 10);
    this.localStorageService.setLocalItem('licencedOrg', cleanId.toString());

    // Update environment service
    environmentService.updateOrgId(cleanId);

    this.currentOrganizationSubject.next(organization);

    console.log('Updated licencedOrg to:', cleanId); // Debug log
  }

  switchOrganization(organizationId: number): Observable<boolean> {
    const organizations = this.userOrganizationsSubject.value;
    const targetOrg = organizations.find((org) => org.id === organizationId);

    if (targetOrg) {
      this.setCurrentOrganization(targetOrg);
      this.toast.success(`Switching to ${targetOrg.name}...`);

      // Reload the page to refresh all API calls with new org context
      setTimeout(() => {
        window.location.reload();
      }, 800);

      return of(true);
    }

    this.toast.error('Organization not found');
    return of(false);
  }

  // FIXED: Use clean organization ID in URL
  hasOrganizationAccess(
    userId: number,
    organizationId: number
  ): Observable<boolean> {
    const currentOrgId = this.getCurrentOrgId();
    const url = `${environment.apiMainRootUrl}organizations/${currentOrgId}/auth/${userId}/access/${organizationId}`;

    console.log('Checking access at URL:', url); // Debug log

    return this.http.get<{ hasAccess: boolean; role?: string }>(url).pipe(
      map((response) => response.hasAccess),
      catchError((error) => {
        console.error('Error checking access:', error);
        return of(false);
      })
    );
  }

  // FIXED: Use clean organization ID in URL
  grantUserAccess(
    userId: number,
    targetOrganizationId: number,
    role: string = 'User'
  ): Observable<any> {
    const currentOrgId = this.getCurrentOrgId();
    const url = `${environment.apiMainRootUrl}organizations/${currentOrgId}/auth/grant-access`;

    const payload = {
      userId,
      targetOrganizationId,
      role,
    };

    console.log('Granting access at URL:', url, 'with payload:', payload); // Debug log

    return this.http.post(url, payload).pipe(
      map((response) => {
        this.toast.success('Access granted successfully');
        return response;
      }),
      catchError((error) => {
        console.error('Error granting access:', error);
        this.toast.error('Failed to grant access');
        throw error;
      })
    );
  }

  // FIXED: Use clean organization ID in URL
  revokeUserAccess(userId: number, targetOrgId: number): Observable<any> {
    const currentOrgId = this.getCurrentOrgId();
    const url = `${environment.apiMainRootUrl}organizations/${currentOrgId}/auth/${userId}/access/${targetOrgId}`;

    console.log('Revoking access at URL:', url); // Debug log

    return this.http.delete(url).pipe(
      map((response) => {
        this.toast.success('Access revoked successfully');
        return response;
      }),
      catchError((error) => {
        console.error('Error revoking access:', error);
        this.toast.error('Failed to revoke access');
        throw error;
      })
    );
  }
}
