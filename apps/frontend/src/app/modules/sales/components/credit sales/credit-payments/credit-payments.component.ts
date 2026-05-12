import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CreditPaymentsService,
  CreditSalePayment,
} from '../../../../../shared/Services/credit-payments.service';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';
import { forkJoin } from 'rxjs';
import { PaymentsService } from '../../../../../shared/Services/payments.service';

@Component({
  selector: 'app-credit-payments',
  templateUrl: './credit-payments.component.html',
  styleUrls: ['./credit-payments.component.scss'],
})
export class CreditPaymentsComponent extends ModalComponent {
  paymentForm: FormGroup | any;
  paymentMethods = ['CASH', 'MPESA', 'BANK_TRANSFER'];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  remainingAmount = 0;

  constructor(
    private fb: FormBuilder,
    private creditPaymentsService: CreditPaymentsService,
    private paymentsService: PaymentsService
  ) {
    super();
    // Initialize the form after dialogRemoteControl is available
    setTimeout(() => {
      this.initializeForm();
    });
  }

  initializeForm() {
    // Load remaining balance first
    this.loadRemainingBalance();

    this.paymentForm = this.fb.group({
      creditSaleId: [this.dialogRemoteControl.payload.id, Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      paymentMethod: ['', Validators.required],
      transactionCode: [''],
    });

    // Add conditional validation for transaction code
    this.paymentForm
      .get('paymentMethod')
      ?.valueChanges.subscribe((method: string) => {
        const transactionCodeControl = this.paymentForm.get('transactionCode');
        if (method === 'MPESA' || method === 'BANK_TRANSFER') {
          transactionCodeControl?.setValidators(['']);
        } else {
          transactionCodeControl?.clearValidators();
        }
        transactionCodeControl?.updateValueAndValidity();

        // Auto-fill corresponding transaction code if it exists
        if (
          method === 'MPESA' &&
          this.dialogRemoteControl.payload.mpesa_confirmation_code
        ) {
          transactionCodeControl?.setValue(
            this.dialogRemoteControl.payload.mpesa_confirmation_code
          );
        } else if (
          method === 'BANK_TRANSFER' &&
          this.dialogRemoteControl.payload.bank_confirmation_code
        ) {
          transactionCodeControl?.setValue(
            this.dialogRemoteControl.payload.bank_confirmation_code
          );
        } else {
          transactionCodeControl?.setValue('');
        }

        // Preload amount based on selected payment method
        this.preloadAmount(method);
      });
  }

  // Get the remaining balance from the credit sale data
  loadRemainingBalance() {
    if (this.dialogRemoteControl.payload) {
      // Use the balance property from the credit sale
      this.remainingAmount =
        this.dialogRemoteControl.payload.balance ||
        this.dialogRemoteControl.payload.credit_amount -
          (this.dialogRemoteControl.payload.amount_paid || 0);
    }
  }

  // Preload the amount based on payment method
  preloadAmount(method: string) {
    if (!this.remainingAmount) return;

    // Set the full remaining amount as default
    let amountToSet = this.remainingAmount;

    // Check if there's already a specific payment amount for this method
    if (
      method === 'CASH' &&
      this.dialogRemoteControl.payload.cash_paid !== undefined
    ) {
      // If there's a remaining cash balance, use it
      const cashPaid = this.dialogRemoteControl.payload.cash_paid || 0;
      const remainingCash = Math.max(
        0,
        this.dialogRemoteControl.payload.credit_amount - cashPaid
      );
      if (remainingCash > 0 && remainingCash < amountToSet) {
        amountToSet = remainingCash;
      }
    } else if (
      method === 'MPESA' &&
      this.dialogRemoteControl.payload.mpesa_paid !== undefined
    ) {
      // If there's a remaining mpesa balance, use it
      const mpesaPaid = this.dialogRemoteControl.payload.mpesa_paid || 0;
      const remainingMpesa = Math.max(
        0,
        this.dialogRemoteControl.payload.credit_amount - mpesaPaid
      );
      if (remainingMpesa > 0 && remainingMpesa < amountToSet) {
        amountToSet = remainingMpesa;
      }
    } else if (
      method === 'BANK_TRANSFER' &&
      this.dialogRemoteControl.payload.bank_paid !== undefined
    ) {
      // If there's a remaining bank balance, use it
      const bankPaid = this.dialogRemoteControl.payload.bank_paid || 0;
      const remainingBank = Math.max(
        0,
        this.dialogRemoteControl.payload.credit_amount - bankPaid
      );
      if (remainingBank > 0 && remainingBank < amountToSet) {
        amountToSet = remainingBank;
      }
    }

    // Set the calculated amount in the form
    this.paymentForm.get('amount')?.setValue(amountToSet.toFixed(2));
  }

  onSubmit() {
    if (this.paymentForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      // Get form values
      const formValues = this.paymentForm.value;

      // Validate the payment amount doesn't exceed remaining balance
      const paymentAmount = parseFloat(formValues.amount);

      if (paymentAmount > this.remainingAmount) {
        this.errorMessage = `Payment amount exceeds remaining balance of ${this.remainingAmount.toFixed(
          2
        )}`;
        this.isLoading = false;
        return;
      }

      // Create payment object with amount as a number
      const payment: CreditSalePayment = {
        ...formValues,
        amount: paymentAmount, // Convert string to float
      };

      // Only record in credit_sale_payments - backend handles all updates
      this.creditPaymentsService.createPayment(payment).subscribe(
        (response) => {
          this.isLoading = false;
          this.successMessage = 'Payment processed successfully!';
          this.toast.success('Payment recorded successfully');
          setTimeout(() => this.close(), 1500); // Close after 1.5 seconds
        },
        (error) => {
          this.isLoading = false;

          // Improved error handling
          if (error?.message?.includes('Expected Float, provided String')) {
            this.errorMessage =
              'Invalid amount format. Please enter a valid number.';
            this.toast.error('Invalid amount format');
          } else {
            this.errorMessage = 'Error processing payment. Please try again.';
            this.toast.error('Error processing payment');
          }

          console.error('Payment error:', error);
        }
      );
    } else {
      this.markFormGroupTouched(this.paymentForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
