import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';
import { DebtorsService } from '../../../../shared/Services/debtors.service';

@Component({
  selector: 'app-commission-payment-modal',
  templateUrl: './commission-payment-modal.component.html',
  styleUrls: ['./commission-payment-modal.component.css']
})
export class CommissionPaymentModalComponent implements OnInit {
  isOpen = false;
  loading = false;
  paymentForm: FormGroup;

  // Payment data
  commissionIds: number[] = [];
  userId: number = 0;
  userName: string = '';
  totalAmount: number = 0;
  commissionRecords: any[] = [];
  paymentType: 'MANUAL' | 'BULK_PERIOD' | 'BULK_ALL_UNPAID' = 'MANUAL';
  dateRange?: { start: string; end: string };

  // Payment methods
  availablePaymentMethods: any[] = [];
  organizationId: number = 1;

  constructor(
    private fb: FormBuilder,
    private commissionService: CommissionService,
    private debtorsService: DebtorsService,
    private toast: HotToastService
  ) {
    this.paymentForm = this.fb.group({
      paymentMethods: this.fb.array([]),
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    this.loadPaymentMethods();
  }

  get paymentMethodsArray(): FormArray {
    return this.paymentForm.get('paymentMethods') as FormArray;
  }

  loadPaymentMethods(): void {
    this.debtorsService.getPaymentMethods().subscribe({
      next: (methods) => {
        // Filter out credit payment method, keep all others
        this.availablePaymentMethods = methods.filter((m: any) => m.code !== 'CREDIT');
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.toast.error('Failed to load payment methods');
      }
    });
  }

  /**
   * Open modal for manual payment (selected commissions)
   */
  openManualPayment(data: {
    userId: number;
    userName: string;
    commissionRecords: any[];
    commissionIds: number[];
  }): void {
    this.userId = data.userId;
    this.userName = data.userName;
    this.commissionRecords = data.commissionRecords;
    this.commissionIds = data.commissionIds;
    this.totalAmount = data.commissionRecords.reduce(
      (sum, r) => sum + (r.commissionAmount || 0),
      0
    );
    this.paymentType = 'MANUAL';
    this.dateRange = undefined;

    this.resetForm();
    this.addPaymentMethod();
    this.isOpen = true;
  }

  /**
   * Open modal for bulk payment (all unpaid)
   */
  openBulkPayment(data: {
    userId: number;
    userName: string;
    totalAmount: number;
    recordCount: number;
  }): void {
    this.userId = data.userId;
    this.userName = data.userName;
    this.totalAmount = data.totalAmount;
    this.paymentType = 'BULK_ALL_UNPAID';
    this.dateRange = undefined;
    this.commissionIds = [];

    this.resetForm();
    this.addPaymentMethod();
    this.isOpen = true;
  }

  /**
   * Open modal for period-based payment
   */
  openPeriodPayment(data: {
    userId: number;
    userName: string;
    totalAmount: number;
    recordCount: number;
    startDate: string;
    endDate: string;
  }): void {
    this.userId = data.userId;
    this.userName = data.userName;
    this.totalAmount = data.totalAmount;
    this.paymentType = 'BULK_PERIOD';
    this.dateRange = { start: data.startDate, end: data.endDate };
    this.commissionIds = [];

    this.resetForm();
    this.addPaymentMethod();
    this.isOpen = true;
  }

  resetForm(): void {
    this.paymentForm.reset();
    this.paymentMethodsArray.clear();
  }

  addPaymentMethod(): void {
    const methodGroup = this.fb.group({
      paymentMethodId: [null],
      paymentMethodCode: ['', Validators.required],
      paymentMethodName: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      transactionCode: [''],
      notes: ['']
    });

    // Set first payment method amount to total if first entry
    if (this.paymentMethodsArray.length === 0) {
      methodGroup.patchValue({ amount: this.totalAmount });
    }

    this.paymentMethodsArray.push(methodGroup);
  }

  removePaymentMethod(index: number): void {
    if (this.paymentMethodsArray.length > 1) {
      this.paymentMethodsArray.removeAt(index);
    }
  }

  onPaymentMethodChange(index: number): void {
    const methodGroup = this.paymentMethodsArray.at(index);
    const code = methodGroup.get('paymentMethodCode')?.value;

    const selected = this.availablePaymentMethods.find(m => m.code === code);
    if (selected) {
      methodGroup.patchValue({
        paymentMethodId: selected.id,
        paymentMethodName: selected.displayName
      });
    }
  }

  getTotalPaid(): number {
    return this.paymentMethodsArray.controls.reduce((sum, control) => {
      const amount = control.get('amount')?.value || 0;
      return sum + Number(amount);
    }, 0);
  }

  getRemainingAmount(): number {
    return this.totalAmount - this.getTotalPaid();
  }

  isPaymentValid(): boolean {
    const remaining = Math.abs(this.getRemainingAmount());
    return remaining < 0.01 && this.paymentForm.valid;
  }

  closeModal(): void {
    this.isOpen = false;
    this.resetForm();
  }

  submitPayment(): void {
    if (!this.isPaymentValid()) {
      this.toast.error('Payment amount must match commission total');
      return;
    }

    this.loading = true;
    const notes = this.paymentForm.get('notes')?.value;
    const paymentMethods = this.paymentMethodsArray.value;

    if (this.paymentType === 'MANUAL') {
      // Manual payment with selected commission IDs
      const payload = {
        commissionIds: this.commissionIds,
        paymentMethods,
        notes
      };

      this.commissionService.payCommissions(this.organizationId, payload).subscribe({
        next: (response) => {
          this.toast.success('Commission payment recorded successfully');
          this.closeModal();
          // Emit event to refresh parent component
          window.dispatchEvent(new CustomEvent('commission-paid'));
        },
        error: (error) => {
          console.error('Payment error:', error);
          this.toast.error(error.error?.message || 'Failed to record payment');
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
    } else {
      // Bulk payment (ALL_UNPAID or PERIOD)
      const payload: any = {
        userId: this.userId,
        paymentType: this.paymentType === 'BULK_PERIOD' ? 'PERIOD' : 'ALL_UNPAID',
        paymentMethods,
        notes
      };

      if (this.paymentType === 'BULK_PERIOD' && this.dateRange) {
        payload.startDate = this.dateRange.start;
        payload.endDate = this.dateRange.end;
      }

      this.commissionService.bulkPayCommissions(this.organizationId, payload).subscribe({
        next: (response) => {
          this.toast.success(`Bulk payment successful: ${response.recordsUpdated} commissions paid`);
          this.closeModal();
          window.dispatchEvent(new CustomEvent('commission-paid'));
        },
        error: (error) => {
          console.error('Bulk payment error:', error);
          this.toast.error(error.error?.message || 'Failed to record bulk payment');
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }
}
