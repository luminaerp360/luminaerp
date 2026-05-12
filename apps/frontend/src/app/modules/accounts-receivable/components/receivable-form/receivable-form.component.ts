import { Component, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsReceivableService } from '../../../../shared/Services/accounts-receivable.service';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { Receivable, ReceivableCreateUpdate, ReceivableStatus } from '../../../../shared/interfaces/receivable.interface';
import { finalize } from 'rxjs/operators';
import { initFlowbite } from 'flowbite';

// Component for creating and editing receivables
@Component({
  selector: 'app-receivable-form',
  templateUrl: './receivable-form.component.html',
  styleUrls: ['./receivable-form.component.scss'],
})
export class ReceivableFormComponent extends ModalComponent implements AfterViewInit {
  receivableForm!: FormGroup;
  receivable: Receivable | null = null;
  isUpdateMode: boolean = false;
  submitting = false;
  customers: { id: number; name: string }[] = [];
  customersLoading = false;

  constructor(
    private fb: FormBuilder,
    private accountsReceivableService: AccountsReceivableService,
    private customerService: CustomerService,
    private cdr: ChangeDetectorRef
  ) {
    super();

    this.initializeForm();
    this.loadCustomers();
    this.setupFormValidation();
  }

  ngAfterViewInit(): void {
    // Initialize Flowbite components
    setTimeout(() => {
      initFlowbite();
    }, 100);
  }

  private initializeForm() {
    this.receivableForm = this.fb.group({
      customerId: ['', [Validators.required]],
      receivableNumber: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      receivableDate: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      description: ['', [Validators.maxLength(1000)]],
      totalAmount: [0, [Validators.required, Validators.min(0.01)]],
      taxAmount: [0, [Validators.min(0)]],
      discountAmount: [0, [Validators.min(0)]],
      referenceNumber: ['', [Validators.maxLength(100)]],
      notes: ['', [Validators.maxLength(500)]],
      createdBy: [1], // TODO: Get from auth service
    });

    this.receivable = this.dialogRemoteControl.payload;
    if (this.receivable) {
      this.populateForm(this.receivable);
      this.isUpdateMode = true;
    }

    // Calculate net amount when amounts change
    this.receivableForm.get('totalAmount')?.valueChanges.subscribe(() => this.calculateNetAmount());
    this.receivableForm.get('taxAmount')?.valueChanges.subscribe(() => this.calculateNetAmount());
    this.receivableForm.get('discountAmount')?.valueChanges.subscribe(() => this.calculateNetAmount());
  }

  private populateForm(receivable: Receivable) {
    this.receivableForm.patchValue({
      customerId: receivable.customerId,
      receivableNumber: receivable.receivableNumber,
      receivableDate: this.formatDateForInput(receivable.receivableDate),
      dueDate: this.formatDateForInput(receivable.dueDate),
      description: receivable.description || '',
      totalAmount: receivable.totalAmount,
      taxAmount: receivable.taxAmount,
      discountAmount: receivable.discountAmount,
      referenceNumber: receivable.referenceNumber || '',
      notes: receivable.notes || '',
    });
  }

  private setupFormValidation() {
    // Ensure due date is after receivable date
    this.receivableForm.get('receivableDate')?.valueChanges.subscribe((receivableDate) => {
      const dueDateControl = this.receivableForm.get('dueDate');
      if (receivableDate && dueDateControl?.value) {
        const receivableDateObj = new Date(receivableDate);
        const dueDateObj = new Date(dueDateControl.value);
        if (dueDateObj <= receivableDateObj) {
          dueDateControl.setErrors({ dueDateBeforeReceivableDate: true });
        } else {
          const errors = dueDateControl.errors;
          if (errors) {
            delete errors['dueDateBeforeReceivableDate'];
            dueDateControl.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }
    });

    this.receivableForm.get('dueDate')?.valueChanges.subscribe((dueDate) => {
      const receivableDateControl = this.receivableForm.get('receivableDate');
      if (dueDate && receivableDateControl?.value) {
        const receivableDateObj = new Date(receivableDateControl.value);
        const dueDateObj = new Date(dueDate);
        if (dueDateObj <= receivableDateObj) {
          this.receivableForm.get('dueDate')?.setErrors({ dueDateBeforeReceivableDate: true });
        } else {
          const errors = this.receivableForm.get('dueDate')?.errors;
          if (errors) {
            delete errors['dueDateBeforeReceivableDate'];
            this.receivableForm.get('dueDate')?.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }
    });
  }

  private loadCustomers() {
    this.customersLoading = true;
    this.customerService.getAllCustomers().subscribe({
      next: (customers: any[]) => {
        this.customers = customers.map(customer => ({
          id: customer.id,
          name: customer.fullName || customer.name || 'Unknown Customer'
        })).filter(customer => customer.name); // Filter out customers without names
        this.customersLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        // Fallback to mock data if service fails
        this.customers = [
          { id: 1, name: 'ABC Customer Ltd' },
          { id: 2, name: 'XYZ Traders' },
          { id: 3, name: 'Global Corp' },
        ];
        this.customersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  calculateNetAmount() {
    const totalAmount = this.receivableForm.get('totalAmount')?.value || 0;
    const taxAmount = this.receivableForm.get('taxAmount')?.value || 0;
    const discountAmount = this.receivableForm.get('discountAmount')?.value || 0;
    const netAmount = totalAmount + taxAmount - discountAmount;
    return netAmount;
  }

  onSubmit() {
    if (this.receivableForm.invalid) {
      this.markFormGroupTouched(this.receivableForm);
      return;
    }

    this.submitting = true;
    const formData = this.prepareFormData();

    const request = this.isUpdateMode
      ? this.accountsReceivableService.updateReceivable(this.receivable!.id, formData)
      : this.accountsReceivableService.createReceivable(formData);

    request.pipe(
      finalize(() => (this.submitting = false))
    ).subscribe({
      next: (receivable: any) => {
        // TODO: Show success toast
        this.close(receivable);
      },
      error: (error: any) => {
        console.error('Error saving receivable:', error);
        // TODO: Show error toast
      },
    });
  }

  private prepareFormData(): ReceivableCreateUpdate {
    const formValue = this.receivableForm.value;
    const netAmount = formValue.totalAmount + (formValue.taxAmount || 0) - (formValue.discountAmount || 0);

    // Ensure dates are in ISO format for backend
    const receivableDate = this.normalizeDate(formValue.receivableDate);
    const dueDate = this.normalizeDate(formValue.dueDate);

    return {
      customerId: formValue.customerId,
      receivableNumber: formValue.receivableNumber,
      receivableDate: receivableDate,
      dueDate: dueDate,
      description: formValue.description || undefined,
      totalAmount: formValue.totalAmount,
      taxAmount: formValue.taxAmount || 0,
      discountAmount: formValue.discountAmount || 0,
      referenceNumber: formValue.referenceNumber || undefined,
      notes: formValue.notes || undefined,
      createdBy: formValue.createdBy,
    };
  }

  private normalizeDate(dateValue: any): string {
    if (!dateValue) return '';

    // If it's already in ISO format (yyyy-mm-dd), return as is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Try to parse various date formats
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().split('T')[0];
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.receivableForm.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.receivableForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return this.formatFieldName(controlName) + ' is required';
    }
    if (control.hasError('min')) {
      return this.formatFieldName(controlName) + ' must be greater than 0';
    }
    if (control.hasError('minlength')) {
      const minLength = control.errors?.['minlength']?.requiredLength;
      return this.formatFieldName(controlName) + ` must be at least ${minLength} characters`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength']?.requiredLength;
      return this.formatFieldName(controlName) + ` must not exceed ${maxLength} characters`;
    }
    if (control.hasError('dueDateBeforeReceivableDate')) {
      return 'Due date must be after receivable date';
    }
    return '';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  }

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }
}