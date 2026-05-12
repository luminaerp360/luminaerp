import { Component, Input, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-add-customer',
  templateUrl: './add-customer.component.html',
  styleUrls: ['./add-customer.component.scss'],
})
export class AddCustomerComponent extends ModalComponent implements OnInit {
  mode: 'add' | 'edit' = 'add';
  existingCustomer: Customer | null = null;

  customerDetails: Customer = {
    fullName: '',
    phoneNumber: '',
    email: '',
    isActive: true,
  };

  isLoading = false;

  constructor(private customerService: CustomerService) {
    super();
    this.existingCustomer = this.dialogRemoteControl.payload;
    this.mode = this.existingCustomer ? 'edit' : 'add';
  }

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    if (this.mode === 'edit' && this.existingCustomer) {
      // Deep copy to avoid mutating the original object
      this.customerDetails = { ...this.existingCustomer };
    } else {
      // Reset form for add mode
      this.customerDetails = {
        fullName: '',
        phoneNumber: '',
        email: '',
        isActive: true,
        customerType: 'INDIVIDUAL',
        kraPin: '',
      };
    }
  }

  submitForm() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.customerDetails.isActive = this.convertToBoolean(
      this.customerDetails.isActive,
    );

    const operation$ =
      this.mode === 'add'
        ? this.customerService.addCustomer(this.customerDetails)
        : this.customerService.updateCustomer(
            this.customerDetails.id!,
            this.customerDetails,
          );

    operation$.pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: () => {
        const successMessage =
          this.mode === 'add'
            ? 'Customer added successfully!'
            : 'Customer updated successfully!';
        this.toast.success(successMessage);
        this.close();
      },
      error: (error) => {
        const errorMessage =
          this.mode === 'add'
            ? 'Failed to add customer. Please try again.'
            : 'Failed to update customer. Please try again.';
        this.toast.error(errorMessage);
        console.error(
          `Error ${this.mode === 'add' ? 'adding' : 'updating'} customer:`,
          error,
        );
      },
    });
  }

  onCloseClick() {
    if (!this.isLoading) {
      this.close();
    }
  }

  convertIsActive(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.customerDetails.isActive = target?.value === 'true';
  }

  formatKraPin(event: Event) {
    const input = event.target as HTMLInputElement;
    // Strip all non-alphanumeric, uppercase, max 11 chars
    let value = input.value
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 11);
    this.customerDetails.kraPin = value;
    input.value = value;
  }

  get kraPinPattern(): string {
    // A123456789B pattern
    return '^[A-Z]\\d{9}[A-Z]$';
  }

  get kraPinPlaceholder(): string {
    return this.customerDetails.customerType === 'BUSINESS'
      ? 'P123456789X'
      : 'A123456789B';
  }

  get kraPinHint(): string {
    return this.customerDetails.customerType === 'BUSINESS'
      ? 'Business PIN: 1 letter + 9 digits + 1 letter (e.g. P051234567A)'
      : 'Individual PIN: 1 letter + 9 digits + 1 letter (e.g. A012345678Z)';
  }

  convertToBoolean(value: any): boolean {
    return value === true || value === 'true';
  }

  get modalTitle(): string {
    return this.mode === 'add' ? 'Create New Customer' : 'Edit Customer';
  }

  get submitButtonText(): string {
    if (this.isLoading) {
      return this.mode === 'add'
        ? 'Creating Customer...'
        : 'Updating Customer...';
    }
    return this.mode === 'add' ? 'Add New Customer' : 'Update Customer';
  }
}
