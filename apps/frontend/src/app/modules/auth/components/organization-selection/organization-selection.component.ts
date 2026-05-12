import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService } from '../../../../shared/Services/auth.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { refreshEnvironment } from '../../../../../Environments/environments';

export interface OrganizationResponse {
  organizationId: number;
  organizationName: string;
  subscriptionStatus: string;
}

@Component({
  selector: 'app-organization-selection',
  templateUrl: './organization-selection.component.html',
  styleUrls: ['./organization-selection.component.scss'],
})
export class OrganizationSelectionComponent implements OnInit {
  licenseKey: string = '';
  isLoading: boolean = false;
  loadingLogin: boolean = true;
  savedOrg: string | null = null;
  currentYear: number = new Date().getFullYear();

  constructor(
    private router: Router,
    private toast: HotToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if organization is already saved
    this.checkSavedOrganization();
  }

  /**
   * Check if the organization is already saved in localStorage
   */
  private checkSavedOrganization(): void {
    this.savedOrg = localStorage.getItem('licencedOrg');
    
    // Brief delay to show loading state
    setTimeout(() => {
      this.loadingLogin = false;
    }, 1000);
  }

  /**
   * Verify the license key entered by the user
   */
  verifyLicense(): void {
    if (!this.licenseKey.trim()) {
      this.toast.error('Please enter a license key');
      return;
    }

    this.isLoading = true;
    this.authService.verifyLicense(this.licenseKey)
      .pipe(
        catchError(error => {
          const message = error.error?.message || 'Failed to verify license key';
          this.toast.error(message);
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((response: OrganizationResponse | null) => {
        if (response) {
          // First save the organization data
          localStorage.setItem('licencedOrg', response.organizationId.toString());
          localStorage.setItem('orgName', response.organizationName);
          
          // Then refresh the environment to use the new organization ID
          refreshEnvironment();
          
          // Show success message
          this.toast.success(`License verified for ${response.organizationName}`);
          
          // Set the saved org property for the UI
          this.savedOrg = response.organizationId.toString();
          
          // Force a page reload to ensure all services use the updated environment
          // This is important to fix the 'null' organization ID issue
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });
  }
}