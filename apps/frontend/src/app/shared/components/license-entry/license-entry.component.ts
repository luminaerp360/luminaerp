import { Component } from '@angular/core';
import { LicenseValidationService } from '../../../services/license-validation.service';

@Component({
  selector: 'app-license-entry',
  templateUrl: './license-entry.component.html',
  styleUrls: ['./license-entry.component.scss']
})
export class LicenseEntryComponent {
  licenseKey = '';
  isValidating = false;
  errorMessage = '';
  errorCode = '';

  constructor(private licenseService: LicenseValidationService) {}

  async validateLicense(): Promise<boolean> {
    if (!this.licenseKey.trim()) {
      this.errorMessage = 'Please enter a license key';
      return false;
    }

    this.isValidating = true;
    this.errorMessage = '';
    this.errorCode = '';

    try {
      const result = await this.licenseService.validateLicense(this.licenseKey.trim());

      if (result.valid) {
        console.log('[License Entry] Validation successful');
        return true;
      } else {
        this.errorMessage = result.message || 'Invalid license key';
        this.errorCode = result.code || '';
        return false;
      }
    } catch (error: any) {
      this.errorMessage = 'Network error. Please check your connection.';
      return false;
    } finally {
      this.isValidating = false;
    }
  }

  formatLicenseKey(): void {
    // Auto-format license key with dashes (e.g., OFFLINE-XXXX-XXXX)
    let value = this.licenseKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    this.licenseKey = value;
  }
}
