import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditorsService } from '../../../shared/Services/creditors.service';
import {
  BillSummary,
  PaymentMethod,
  PaymentMethodConfig,
} from '../../../types/creditors.types';
import { HotToastService } from '@ngneat/hot-toast';

interface BillPaymentSelection extends BillSummary {
  selected: boolean;
  paymentAmount: number;
}

@Component({
  selector: 'app-outstanding-bills',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outstanding-bills.component.html',
  styleUrls: ['./outstanding-bills.component.scss'],
})
export class OutstandingBillsComponent implements OnInit {
  supplierId: number | null = null;
  supplierName = '';
  bills: BillPaymentSelection[] = [];
  loading = false;
  processingPayment = false;

  // Payment modal
  showPaymentModal = false;
  paymentDate = new Date().toISOString().split('T')[0];
  selectedPaymentMethod: PaymentMethod = PaymentMethod.CASH;
  referenceNumber = '';
  transactionCode = '';
  notes = '';

  // Payment methods
  paymentMethods: PaymentMethodConfig[] = [];
  PaymentMethodEnum = PaymentMethod;

  // Selection summary
  selectedCount = 0;
  totalSelectedAmount = 0;

  constructor(
    private creditorsService: CreditorsService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: HotToastService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('supplierId');
      if (id) {
        this.supplierId = +id;
        this.loadOutstandingBills();
        this.loadPaymentMethods();
      }
    });
  }

  loadOutstandingBills() {
    if (!this.supplierId) return;

    this.loading = true;
    this.creditorsService.getOutstandingBills(this.supplierId).subscribe({
      next: (bills: any) => {
        // Handle if bills is wrapped in response object
        const billsArray = Array.isArray(bills)
          ? bills
          : bills.bills || bills.data || [];

        this.bills = billsArray.map((bill: BillSummary) => ({
          ...bill,
          selected: false,
          paymentAmount: bill.balanceAmount,
        }));

        if (this.bills.length > 0 && this.bills[0].supplierName) {
          this.supplierName = this.bills[0].supplierName;
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading bills:', error);
        this.toast.error('Failed to load bills');
        this.loading = false;
      },
    });
  }

  loadPaymentMethods() {
    this.creditorsService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods.filter((m) => m.isActive);
        if (this.paymentMethods.length > 0) {
          this.selectedPaymentMethod = this.paymentMethods[0].code;
        }
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
      },
    });
  }

  toggleBillSelection(bill: BillPaymentSelection) {
    bill.selected = !bill.selected;
    this.updateSelectionSummary();
  }

  selectAll() {
    const allSelected = this.bills.every((b) => b.selected);
    this.bills.forEach((b) => (b.selected = !allSelected));
    this.updateSelectionSummary();
  }

  updatePaymentAmount(bill: BillPaymentSelection) {
    // Ensure payment amount doesn't exceed balance
    if (bill.paymentAmount > bill.balanceAmount) {
      bill.paymentAmount = bill.balanceAmount;
    }
    this.updateSelectionSummary();
  }

  updateSelectionSummary() {
    this.selectedCount = this.bills.filter((b) => b.selected).length;
    this.totalSelectedAmount = this.bills
      .filter((b) => b.selected)
      .reduce((sum, b) => sum + b.paymentAmount, 0);
  }

  openPaymentModal() {
    if (this.selectedCount === 0) {
      this.toast.error('Please select at least one bill to pay');
      return;
    }

    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.resetPaymentForm();
  }

  resetPaymentForm() {
    this.paymentDate = new Date().toISOString().split('T')[0];
    this.selectedPaymentMethod =
      this.paymentMethods[0]?.code || PaymentMethod.CASH;
    this.referenceNumber = '';
    this.transactionCode = '';
    this.notes = '';
  }

  submitBulkPayment() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    const billPayments = this.bills
      .filter((b) => b.selected)
      .map((b) => ({
        billId: b.id,
        amount: b.paymentAmount,
      }));

    const paymentDto = {
      billPayments,
      paymentDate: this.paymentDate,
      paymentMethod: this.selectedPaymentMethod,
      referenceNumber: this.referenceNumber || undefined,
      transactionCode: this.transactionCode || undefined,
      notes: this.notes || undefined,
      createdBy: currentUser.id,
    };

    this.processingPayment = true;
    this.creditorsService.recordBulkPayment(paymentDto).subscribe({
      next: (result) => {
        this.processingPayment = false;
        this.closePaymentModal();

        if (result.success > 0) {
          this.toast.success(
            `Successfully processed ${result.success} payment(s)`,
          );

          if (result.failed > 0) {
            this.toast.error(`${result.failed} payment(s) failed`);
            console.error('Failed payments:', result.errors);
          }

          // Reload bills
          this.loadOutstandingBills();
        } else {
          this.toast.error('All payments failed');
          console.error('Payment errors:', result.errors);
        }
      },
      error: (error) => {
        console.error('Error processing payment:', error);
        this.toast.error('Failed to process payments');
        this.processingPayment = false;
      },
    });
  }

  getDaysOverdue(bill: BillSummary): number {
    const today = new Date();
    const dueDate = new Date(bill.dueDate);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  getStatusBadgeClass(bill: BillSummary): string {
    const daysOverdue = this.getDaysOverdue(bill);
    if (bill.status === 'PAID') return 'bg-green-100 text-green-800';
    if (bill.status === 'PARTIALLY_PAID') return 'bg-blue-100 text-blue-800';
    if (daysOverdue > 0) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  }

  goBack() {
    this.router.navigate(['/creditors/suppliers']);
  }

  areAllSelected(): boolean {
    return this.bills.length > 0 && this.bills.every((bill) => bill.selected);
  }
}
