import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsReceivableService } from '../../../../shared/Services/accounts-receivable.service';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { Receivable, ReceivablePaymentCreate, PaymentMethod } from '../../../../shared/interfaces/receivable.interface';
import { finalize } from 'rxjs/operators';

// Component for recording receivable payments
@Component({
  selector: 'app-receivable-payment-form',
  templateUrl: './receivable-payment-form.component.html',
  styleUrls: ['./receivable-payment-form.component.scss'],
})
export class ReceivablePaymentFormComponent extends ModalComponent {
  paymentForm!: FormGroup;
  receivable: Receivable | null = null;
  submitting = false;

  paymentMethods: string[] = Object.values(PaymentMethod);

  constructor(
    private fb: FormBuilder,
    private accountsReceivableService: AccountsReceivableService,
    private cdr: ChangeDetectorRef
  ) {
    super();

    this.initializeForm();
    this.setupConditionalValidation();
  }

  private initializeForm() {
    this.paymentForm = this.fb.group({
      receivableId: ['', [Validators.required]],
      paymentDate: [this.formatDateForInput(new Date().toISOString()), [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['CASH', [Validators.required]],
      referenceNumber: [''],
      transactionCode: [''],
      notes: ['', [Validators.maxLength(500)]],
      createdBy: [1], // TODO: Get from auth service
    });

    // Get receivable from dialog payload
    const payload = this.dialogRemoteControl.payload;
    if (payload && payload.receivable) {
      this.receivable = payload.receivable;
      this.paymentForm.patchValue({
        receivableId: this.receivable!.id,
        amount: this.receivable!.balanceAmount, // Default to remaining balance
      });
    }
  }

  private setupConditionalValidation() {
    // Add conditional validation for transaction code based on payment method
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      const transactionCodeControl = this.paymentForm.get('transactionCode');
      const referenceNumberControl = this.paymentForm.get('referenceNumber');

      if (method === PaymentMethod.MPESA || method === PaymentMethod.BANK_TRANSFER) {
        transactionCodeControl?.setValidators([Validators.required]);
        referenceNumberControl?.setValidators([Validators.required]);
      } else {
        transactionCodeControl?.clearValidators();
        referenceNumberControl?.clearValidators();
      }

      transactionCodeControl?.updateValueAndValidity();
      referenceNumberControl?.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (this.paymentForm.invalid) {
      this.markFormGroupTouched(this.paymentForm);
      return;
    }

    // Validate payment amount doesn't exceed balance
    const amount = this.paymentForm.get('amount')?.value;
    if (this.receivable && amount > this.receivable.balanceAmount) {
      this.paymentForm.get('amount')?.setErrors({ exceedsBalance: true });
      return;
    }

    this.submitting = true;
    const formData = this.paymentForm.value;

    this.accountsReceivableService.createReceivablePayment(formData).pipe(
      finalize(() => (this.submitting = false))
    ).subscribe({
      next: (payment: any) => {
        // TODO: Show success toast
        this.close(payment);
      },
      error: (error: any) => {
        console.error('Error recording payment:', error);
        // TODO: Show error toast
      },
    });
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
    const control = this.paymentForm.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.paymentForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return this.formatFieldName(controlName) + ' is required';
    }
    if (control.hasError('min')) {
      return this.formatFieldName(controlName) + ' must be greater than 0';
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength']?.requiredLength;
      return this.formatFieldName(controlName) + ` must not exceed ${maxLength} characters`;
    }
    if (control.hasError('exceedsBalance')) {
      return 'Payment amount cannot exceed receivable balance';
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

  get remainingBalance(): number {
    return this.receivable ? this.receivable.balanceAmount : 0;
  }
}