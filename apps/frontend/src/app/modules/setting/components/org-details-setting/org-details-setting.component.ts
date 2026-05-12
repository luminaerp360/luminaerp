import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import { HotToastService } from '@ngneat/hot-toast';
import { UploadService } from '../../../../shared/Services/upload.service';

@Component({
  selector: 'app-org-details-setting',
  templateUrl: './org-details-setting.component.html',
  styleUrls: ['./org-details-setting.component.scss'],
})
export class OrgDetailsSettingComponent implements OnInit {
  @ViewChild('logoFileInput') logoFileInput!: ElementRef;

  orgForm: FormGroup | any;
  orgDetails: any;
  isLoading = false;
  isEditMode = false;
  isUploadingLogo = false;
  errorMessage = '';
  successMessage = '';

  // Logo related properties
  selectedLogoFile: File | null = null;
  logoPreviewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private orgDetailsService: OrgDetailsService,
    private uploadService: UploadService,
    private toast: HotToastService,
  ) {
    this.initializeForm();
  }

  private initializeForm() {
    this.orgForm = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      contact: ['', Validators.required],
      complementaryMessage: [''],
      stations: [''],
      bankDetails: [''],
      mpesaDetails: [''],
      logoUrl: [''], // Add logoUrl to the form
    });
  }

  ngOnInit() {
    this.loadOrgDetails();
  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) {
      this.showError('No organization ID found');
      return;
    }

    this.isLoading = true;
    this.orgDetailsService.getById(+currentOrgId).subscribe(
      (details: any) => {
        this.orgDetails = details;
        this.patchFormValues(details);
        this.isLoading = false;
      },
      (error) => {
        this.showError('Failed to load organization details');
        console.error('Error loading organization details:', error);
        this.isLoading = false;
      },
    );
  }

  private patchFormValues(details: any) {
    this.orgForm.patchValue({
      name: details.name || '',
      address: details.address || '',
      contact: details.contact || '',
      complementaryMessage: details.complementaryMessage || '',
      stations: details.stations || '',
      bankDetails: details.bankDetails || '',
      mpesaDetails: details.mpesaDetails || '',
      logoUrl: details.logoUrl || '',
    });

    // Set logo preview if exists
    if (details.logoUrl) {
      this.logoPreviewUrl = details.logoUrl;
    }
  }

  // Logo upload methods
  onLogoSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
      ];
      if (!allowedTypes.includes(file.type)) {
        this.showError('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.showError('File size must be less than 5MB');
        return;
      }

      this.selectedLogoFile = file;

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadLogo() {
    if (!this.selectedLogoFile) {
      this.showError('Please select a logo file first');
      return;
    }

    this.isUploadingLogo = true;
    this.uploadService.uploadSingle(this.selectedLogoFile, 'logos').subscribe(
      (res: { url: string }) => {
        const logoUrl = res.url;
        this.orgForm.patchValue({ logoUrl });
        this.logoPreviewUrl = logoUrl;
        this.selectedLogoFile = null;
        this.isUploadingLogo = false;

        // Reset file input
        if (this.logoFileInput) {
          this.logoFileInput.nativeElement.value = '';
        }

        // Persist the new logo URL to the backend immediately
        this.orgDetailsService
          .update(this.orgDetails.id, { logoUrl })
          .subscribe(
            () => {
              this.orgDetails = { ...this.orgDetails, logoUrl };
              localStorage.setItem(
                'orgDetails',
                JSON.stringify(this.orgDetails),
              );
              this.showSuccess('Logo uploaded and saved successfully');
            },
            (error) => {
              console.error('Logo save error:', error);
              this.showError(
                'Logo uploaded but failed to save. Please submit the form to apply.',
              );
            },
          );
      },
      (error) => {
        console.error('Logo upload error:', error);
        this.showError('Failed to upload logo');
        this.isUploadingLogo = false;
      },
    );
  }

  removeLogo() {
    this.logoPreviewUrl = null;
    this.selectedLogoFile = null;
    this.orgForm.patchValue({ logoUrl: '' });

    // Reset file input
    if (this.logoFileInput) {
      this.logoFileInput.nativeElement.value = '';
    }
  }

  triggerFileInput() {
    this.logoFileInput.nativeElement.click();
  }

  toggleEditMode() {
    if (this.isEditMode) {
      // If canceling edit, reset form to original values
      this.patchFormValues(this.orgDetails);
      this.selectedLogoFile = null;
    }
    this.isEditMode = !this.isEditMode;
  }

  onSubmit() {
    if (this.orgForm.valid) {
      this.isLoading = true;
      const formData = this.orgForm.value;

      this.orgDetailsService.update(this.orgDetails.id, formData).subscribe(
        (response) => {
          this.orgDetails = { ...this.orgDetails, ...formData };
          this.showSuccess('Organization details updated successfully');
          this.isEditMode = false;
          this.isLoading = false;

          // Update local storage
          localStorage.setItem('orgDetails', JSON.stringify(this.orgDetails));
        },
        (error) => {
          this.showError('Failed to update organization details');
          console.error('Error updating organization details:', error);
          this.isLoading = false;
        },
      );
    } else {
      this.showError('Please fill in all required fields');
    }
  }

  private showSuccess(message: string) {
    this.successMessage = message;
    this.toast.success(message);
    setTimeout(() => (this.successMessage = ''), 3000);
  }

  private showError(message: string) {
    this.errorMessage = message;
    this.toast.error(message);
    setTimeout(() => (this.errorMessage = ''), 3000);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.orgForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.orgForm.get(fieldName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return `${
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        } is required`;
      }
    }
    return '';
  }

  getRemainingDays(): number {
    if (!this.orgDetails?.subscription?.endDate) return 0;
    const endDate = new Date(this.orgDetails.subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusBadgeClass(): string {
    if (!this.orgDetails?.subscription?.status) return 'bg-gray-500';

    switch (this.orgDetails.subscription.status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-red-500';
      case 'suspended':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  getPlanBadgeClass(): string {
    if (!this.orgDetails?.subscription?.plan) return 'bg-blue-500';

    switch (this.orgDetails.subscription.plan.toLowerCase()) {
      case 'basic':
        return 'bg-blue-500';
      case 'premium':
        return 'bg-purple-500';
      case 'enterprise':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  }
}
