import { Component, ChangeDetectorRef, AfterViewInit, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsPayableService } from '../../../../shared/Services/accounts-payable.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { Bill, BillCreateUpdate, BillStatus } from '../../../../shared/interfaces/bill.interface';
import { finalize } from 'rxjs/operators';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-bill-form',
  templateUrl: './bill-form.component.html',
  styleUrls: ['./bill-form.component.scss'],
})
export class BillFormComponent extends ModalComponent implements AfterViewInit {
  billForm!: FormGroup;
  bill: Bill | null = null;
  isUpdateMode: boolean = false;
  submitting = false;
  suppliers: { id: number; name: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private accountsPayableService: AccountsPayableService,
    private suppliersService: SuppliersService,
    private cdr: ChangeDetectorRef
  ) {
    super();

    this.initializeForm();
    this.loadSuppliers();
    this.setupFormValidation();
  }

  ngAfterViewInit(): void {
    // Initialize Flowbite components
    setTimeout(() => {
      initFlowbite();
    }, 100);
  }

  private initializeForm() {
    this.billForm = this.fb.group({
      supplierId: ['', [Validators.required]],
      billNumber: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      billDate: ['', [Validators.required]],
      dueDate: ['', [Validators.required]],
      description: ['', [Validators.maxLength(1000)]],
      totalAmount: [0, [Validators.required, Validators.min(0.01)]],
      taxAmount: [0, [Validators.min(0)]],
      discountAmount: [0, [Validators.min(0)]],
      referenceNumber: ['', [Validators.maxLength(100)]],
      notes: ['', [Validators.maxLength(500)]],
      createdBy: [1], // TODO: Get from auth service
    });

    this.bill = this.dialogRemoteControl.payload;
    if (this.bill) {
      this.populateForm(this.bill);
      this.isUpdateMode = true;
    }

    // Calculate net amount when amounts change
    this.billForm.get('totalAmount')?.valueChanges.subscribe(() => this.calculateNetAmount());
    this.billForm.get('taxAmount')?.valueChanges.subscribe(() => this.calculateNetAmount());
    this.billForm.get('discountAmount')?.valueChanges.subscribe(() => this.calculateNetAmount());
  }

  private populateForm(bill: Bill) {
    this.billForm.patchValue({
      supplierId: bill.supplierId,
      billNumber: bill.billNumber,
      billDate: this.formatDateForInput(bill.billDate),
      dueDate: this.formatDateForInput(bill.dueDate),
      description: bill.description || '',
      totalAmount: bill.totalAmount,
      taxAmount: bill.taxAmount,
      discountAmount: bill.discountAmount,
      referenceNumber: bill.referenceNumber || '',
      notes: bill.notes || '',
    });
  }

  private setupFormValidation() {
    // Ensure due date is after bill date
    this.billForm.get('billDate')?.valueChanges.subscribe((billDate) => {
      const dueDateControl = this.billForm.get('dueDate');
      if (billDate && dueDateControl?.value) {
        const billDateObj = new Date(billDate);
        const dueDateObj = new Date(dueDateControl.value);
        if (dueDateObj <= billDateObj) {
          dueDateControl.setErrors({ dueDateBeforeBillDate: true });
        } else {
          const errors = dueDateControl.errors;
          if (errors) {
            delete errors['dueDateBeforeBillDate'];
            dueDateControl.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }
    });

    this.billForm.get('dueDate')?.valueChanges.subscribe((dueDate) => {
      const billDateControl = this.billForm.get('billDate');
      if (dueDate && billDateControl?.value) {
        const billDateObj = new Date(billDateControl.value);
        const dueDateObj = new Date(dueDate);
        if (dueDateObj <= billDateObj) {
          this.billForm.get('dueDate')?.setErrors({ dueDateBeforeBillDate: true });
        } else {
          const errors = this.billForm.get('dueDate')?.errors;
          if (errors) {
            delete errors['dueDateBeforeBillDate'];
            this.billForm.get('dueDate')?.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      }
    });
  }

  private loadSuppliers() {
    this.suppliersService.getAllSupplier().subscribe({
      next: (suppliers: any[]) => {
        this.suppliers = suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name
        }));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading suppliers:', error);
        // Fallback to mock data if service fails
        this.suppliers = [
          { id: 1, name: 'ABC Supplies Ltd' },
          { id: 2, name: 'XYZ Traders' },
          { id: 3, name: 'Global Imports' },
        ];
        this.cdr.detectChanges();
      },
    });
  }

  calculateNetAmount() {
    const totalAmount = this.billForm.get('totalAmount')?.value || 0;
    const taxAmount = this.billForm.get('taxAmount')?.value || 0;
    const discountAmount = this.billForm.get('discountAmount')?.value || 0;
    const netAmount = this.accountsPayableService.calculateNetAmount(totalAmount, taxAmount, discountAmount);
    return netAmount;
  }

  onSubmit() {
    if (this.billForm.invalid) {
      this.markFormGroupTouched(this.billForm);
      return;
    }

    this.submitting = true;
    const formData = this.prepareFormData();

    const request = this.isUpdateMode
      ? this.accountsPayableService.updateBill(this.bill!.id, formData)
      : this.accountsPayableService.createBill(formData);

    request.pipe(
      finalize(() => (this.submitting = false))
    ).subscribe({
      next: (bill: any) => {
        // TODO: Show success toast
        this.close(bill);
      },
      error: (error: any) => {
        console.error('Error saving bill:', error);
        // TODO: Show error toast
      },
    });
  }

  private prepareFormData(): BillCreateUpdate {
    const formValue = this.billForm.value;
    const netAmount = formValue.totalAmount + (formValue.taxAmount || 0) - (formValue.discountAmount || 0);

    // Ensure dates are in ISO format for backend
    const billDate = this.normalizeDate(formValue.billDate);
    const dueDate = this.normalizeDate(formValue.dueDate);

    return {
      organizationId: 1, // TODO: Get from auth service
      supplierId: formValue.supplierId,
      billNumber: formValue.billNumber,
      billDate: billDate,
      dueDate: dueDate,
      description: formValue.description || undefined,
      totalAmount: formValue.totalAmount,
      taxAmount: formValue.taxAmount || 0,
      discountAmount: formValue.discountAmount || 0,
      netAmount: netAmount,
      status: BillStatus.DRAFT,
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
    const control = this.billForm.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.billForm.get(controlName);
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
    if (control.hasError('dueDateBeforeBillDate')) {
      return 'Due date must be after bill date';
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