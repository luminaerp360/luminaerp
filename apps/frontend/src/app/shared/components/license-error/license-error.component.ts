import { Component, OnInit } from '@angular/core';
import { LicenseValidationService } from '../../../services/license-validation.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-license-error',
  templateUrl: './license-error.component.html',
  styleUrls: ['./license-error.component.scss']
})
export class LicenseErrorComponent implements OnInit {
  isValidating = false;
  errorMessage = '';
  errorCode = '';

  constructor(
    private licenseService: LicenseValidationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // This component can be used for runtime license errors
  }

  async retryValidation(): Promise<void> {
    this.isValidating = true;
    this.errorMessage = '';
    this.errorCode = '';

    try {
      const result = await this.licenseService.validateLicense();

      if (result.valid) {
        // Redirect to home/dashboard on success
        this.router.navigate(['/']);
      } else {
        this.errorMessage = result.message || 'License validation failed';
        this.errorCode = result.code || '';
      }
    } catch (error: any) {
      this.errorMessage = 'Network error. Please check your connection.';
    } finally {
      this.isValidating = false;
    }
  }
}
