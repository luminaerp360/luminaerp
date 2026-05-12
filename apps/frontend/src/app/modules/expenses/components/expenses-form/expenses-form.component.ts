import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ExpensesService } from '../../../../shared/Services/expenses.service';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import {
  Expense,
  ExpenseType,
  ExpenseStatus,
  RecurrenceFrequency,
} from '../../../../shared/interfaces/expense.interface';
import { PaymentMethod } from '../../../../shared/interfaces/bill.interface';
import { finalize } from 'rxjs/operators';
import { PaymentsService } from '../../../../shared/Services/payments.service';
import { ChartOfAccountsService } from '../../../../shared/Services/chart-of-accounts.service';
import {
  ChartOfAccount,
  AccountType,
} from '../../../../shared/interfaces/chart-of-accounts.interface';

@Component({
  selector: 'app-expenses-form',
  templateUrl: './expenses-form.component.html',
  styleUrls: ['./expenses-form.component.scss'],
})
export class ExpensesFormComponent extends ModalComponent implements OnInit {
  expenseForm: FormGroup;
  expense: Expense | null = null;
  isUpdateMode: boolean = false;
  submitting = false;
  expenseAccounts: ChartOfAccount[] = [];
  paymentMethods = Object.values(PaymentMethod);
  expenseTypes = Object.values(ExpenseType);
  expenseStatuses = Object.values(ExpenseStatus);
  recurrenceFrequencies = Object.values(RecurrenceFrequency);

  // Predefined categories - can be fetched from backend later
  expenseCategories = [
    'Utilities',
    'Rent',
    'Salaries',
    'Supplies',
    'Marketing',
    'Travel',
    'Insurance',
    'Maintenance',
    'Software & Subscriptions',
    'Professional Services',
    'Office Equipment',
    'Training & Development',
    'Miscellaneous',
  ];

  // UI state
  showAdvancedOptions = false;
  showRecurrenceOptions = false;
  uploadingReceipt = false;

  constructor(
    private fb: FormBuilder,
    private expensesService: ExpensesService,
    private paymentsService: PaymentsService,
    private chartOfAccountsService: ChartOfAccountsService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
    this.expenseForm = this.fb.group({
      // Basic Information
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(255),
        ],
      ],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      category: ['', [Validators.required]],
      expenseDate: [
        new Date().toISOString().substring(0, 10),
        [Validators.required],
      ],

      // Payment Information
      paidBy: ['', [Validators.required, Validators.maxLength(255)]],
      paymentMethod: [PaymentMethod.CASH, [Validators.required]],
      paidAmount: [0, [Validators.min(0)]],
      transactionCode: [''],
      paymentReference: [''],

      // Advanced Options
      expenseType: [ExpenseType.ONE_TIME, [Validators.required]],
      status: [ExpenseStatus.APPROVED],
      chartOfAccountId: [null],
      vendor: [''],
      invoiceNumber: [''],
      dueDate: [''],

      // Tags and Classification
      tags: [[]],
      notes: [''],
      isBillable: [false],
      isReimbursable: [false],

      // Tax
      taxRate: [0, [Validators.min(0), Validators.max(100)]],
      taxAmount: [0, [Validators.min(0)]],

      // Receipt
      receiptUrl: [''],

      // System fields
      createdBy: [1],

      // Recurrence
      isRecurring: [false],
      recurrenceFrequency: [RecurrenceFrequency.MONTHLY],
      recurrenceInterval: [1, [Validators.min(1)]],
      recurrenceStartDate: [new Date().toISOString().substring(0, 10)],
      recurrenceEndDate: [''],
      recurrenceOccurrences: [null],
    });

    this.expense = this.dialogRemoteControl.payload;
    if (this.expense) {
      this.isUpdateMode = true;
      this.patchExpenseData();
    }

    this.setupFormListeners();
  }

  ngOnInit(): void {
    this.loadExpenseAccounts();
  }

  private setupFormListeners() {
    // Auto-calculate paid amount if not set
    this.expenseForm.get('amount')?.valueChanges.subscribe((amount) => {
      const paidAmount = this.expenseForm.get('paidAmount')?.value;
      if (!paidAmount || paidAmount === 0) {
        this.expenseForm.patchValue(
          { paidAmount: amount },
          { emitEvent: false },
        );
      }
    });

    // Auto-calculate tax amount
    this.expenseForm.get('taxRate')?.valueChanges.subscribe((rate) => {
      const amount = this.expenseForm.get('amount')?.value || 0;
      const taxAmount = (amount * rate) / 100;
      this.expenseForm.patchValue({ taxAmount }, { emitEvent: false });
    });

    // Conditional validation for transaction code
    this.expenseForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      const transactionCodeControl = this.expenseForm.get('transactionCode');
      const paymentReferenceControl = this.expenseForm.get('paymentReference');

      if (
        method === PaymentMethod.MPESA ||
        method === PaymentMethod.BANK_TRANSFER
      ) {
        transactionCodeControl?.setValidators([Validators.required]);
        paymentReferenceControl?.setValidators([Validators.required]);
      } else {
        transactionCodeControl?.clearValidators();
        paymentReferenceControl?.clearValidators();
      }

      transactionCodeControl?.updateValueAndValidity();
      paymentReferenceControl?.updateValueAndValidity();
    });

    // Toggle recurrence options
    this.expenseForm
      .get('isRecurring')
      ?.valueChanges.subscribe((isRecurring) => {
        this.showRecurrenceOptions = isRecurring;
        const recurrenceControls = [
          'recurrenceFrequency',
          'recurrenceInterval',
          'recurrenceStartDate',
        ];

        recurrenceControls.forEach((control) => {
          const formControl = this.expenseForm.get(control);
          if (isRecurring) {
            formControl?.setValidators([Validators.required]);
          } else {
            formControl?.clearValidators();
          }
          formControl?.updateValueAndValidity();
        });
      });
  }

  private loadExpenseAccounts() {
    this.chartOfAccountsService
      .getAccountsByType(AccountType.EXPENSE)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.expenseAccounts = response.accounts;
          }
        },
        error: (error) => {
          console.error('Error loading expense accounts:', error);
        },
      });
  }

  private patchExpenseData() {
    if (!this.expense) return;

    const patchData: any = { ...this.expense };
    if (this.expense.expenseDate) {
      patchData.expenseDate = new Date(this.expense.expenseDate)
        .toISOString()
        .substring(0, 10);
    }
    if (this.expense.dueDate) {
      patchData.dueDate = new Date(this.expense.dueDate)
        .toISOString()
        .substring(0, 10);
    }

    this.expenseForm.patchValue(patchData);

    // Show advanced options if any advanced field has a value
    if (
      this.expense.vendor ||
      this.expense.invoiceNumber ||
      this.expense.tags?.length
    ) {
      this.showAdvancedOptions = true;
    }
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  onSubmit() {
    if (this.expenseForm.invalid) {
      this.markFormGroupTouched(this.expenseForm);
      this.toast.error('Please fill all required fields');
      return;
    }

    this.submitting = true;
    const formData = this.prepareFormData();

    const expenseRequest = this.isUpdateMode
      ? this.expensesService.updateExpense(this.expense!.id!, formData)
      : this.expensesService.createExpense(formData);

    expenseRequest.subscribe({
      next: (expense) => {
        this.recordPayment(expense);
      },
      error: (error) => {
        this.submitting = false;
        this.toast.error('Error saving expense');
        console.error('Error saving expense:', error);
      },
    });
  }

  private prepareFormData() {
    const formValue = this.expenseForm.value;
    const data: any = {
      ...formValue,
      paidAmount: formValue.paidAmount || formValue.amount,
    };

    // Convert chartOfAccountId from string to number
    if (data.chartOfAccountId) {
      data.chartOfAccountId = parseInt(data.chartOfAccountId, 10);
    }

    // Clean up empty strings for optional fields
    if (data.receiptUrl === '') {
      delete data.receiptUrl;
    }
    if (data.dueDate === '') {
      delete data.dueDate;
    }
    if (data.vendor === '') {
      delete data.vendor;
    }
    if (data.invoiceNumber === '') {
      delete data.invoiceNumber;
    }
    if (data.notes === '') {
      delete data.notes;
    }
    if (data.paymentReference === '') {
      delete data.paymentReference;
    }
    if (data.transactionCode === '') {
      delete data.transactionCode;
    }

    // Build recurrence rule if recurring
    if (formValue.isRecurring) {
      data.recurrenceRule = {
        frequency: formValue.recurrenceFrequency,
        interval: formValue.recurrenceInterval,
        startDate: formValue.recurrenceStartDate,
        endDate: formValue.recurrenceEndDate,
        occurrences: formValue.recurrenceOccurrences,
      };
    }

    // Clean up form-specific fields
    delete data.recurrenceFrequency;
    delete data.recurrenceInterval;
    delete data.recurrenceStartDate;
    delete data.recurrenceEndDate;
    delete data.recurrenceOccurrences;

    return data;
  }

  private recordPayment(expense: Expense) {
    const formValue = this.expenseForm.value;
    const paidAmount = formValue.paidAmount || expense.amount;

    this.paymentsService
      .recordAnyPayment({
        amount: paidAmount,
        method: expense.paymentMethod,
        transactionType: 'EXPENSE',
        paymentType: 'EXPENSE',
        paidBy: expense.paidBy,
        paidTo: expense.title,
        description: expense.description,
        transactionCode: formValue.transactionCode || '',
        paymentReference: formValue.paymentReference || '',
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success(
            this.isUpdateMode
              ? 'Expense updated successfully'
              : 'Expense created successfully',
          );
          this.close(true);
        },
        error: (error) => {
          this.submitting = false;
          this.toast.error('Error recording payment');
          console.error('Payment recording error:', error);
        },
      });
  }

  onReceiptUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // TODO: Implement actual file upload to cloud storage
    this.uploadingReceipt = true;

    // Simulate upload (replace with actual implementation)
    setTimeout(() => {
      const fakeUrl = `https://example.com/receipts/${file.name}`;
      this.expenseForm.patchValue({ receiptUrl: fakeUrl });
      this.uploadingReceipt = false;
      this.toast.success('Receipt uploaded successfully');
    }, 1500);
  }

  removeTag(index: number) {
    const tags = this.expenseForm.get('tags')?.value || [];
    tags.splice(index, 1);
    this.expenseForm.patchValue({ tags });
  }

  addTag(tagInput: HTMLInputElement) {
    const tag = tagInput.value.trim();
    if (!tag) return;

    const tags = this.expenseForm.get('tags')?.value || [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.expenseForm.patchValue({ tags });
    }
    tagInput.value = '';
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
    const control = this.expenseForm.get(controlName);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.expenseForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return `${this.formatFieldName(controlName)} is required`;
    }
    if (control.hasError('min')) {
      const min = control.errors?.['min']?.min;
      return `${this.formatFieldName(controlName)} must be at least ${min}`;
    }
    if (control.hasError('max')) {
      const max = control.errors?.['max']?.max;
      return `${this.formatFieldName(controlName)} must not exceed ${max}`;
    }
    if (control.hasError('minlength')) {
      const minLength = control.errors?.['minlength']?.requiredLength;
      return `${this.formatFieldName(controlName)} must be at least ${minLength} characters`;
    }
    if (control.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength']?.requiredLength;
      return `${this.formatFieldName(controlName)} must not exceed ${maxLength} characters`;
    }
    return '';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
