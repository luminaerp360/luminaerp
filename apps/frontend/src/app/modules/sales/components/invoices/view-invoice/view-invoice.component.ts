import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { InvoiceService } from '../../../../../shared/Services/invoice.service';
import { PaymentMethodService } from '../../../../../shared/Services/payment-method.service';
import { DebtorsService } from '../../../../../shared/Services/debtors.service';
import {
  Invoice,
  InvoiceStatus,
  RecordPaymentDto,
} from '../../../../../shared/interfaces/invoice.interface';
import { PaymentMethodConfig } from '../../../../../shared/interfaces/payment-method.interface';

interface SelectedPayment {
  methodId: number;
  code: string;
  name: string;
  amount: number;
  transactionCode: string;
}

@Component({
  selector: 'app-view-invoice',
  templateUrl: './view-invoice.component.html',
  styleUrl: './view-invoice.component.scss',
})
export class ViewInvoiceComponent implements OnInit {
  invoice: Invoice | null = null;
  isLoading = true;
  InvoiceStatus = InvoiceStatus;
  Math = Math; // Expose Math to template

  // Payment modal
  showPaymentModal = false;
  paymentAmount: number = 0;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT' = 'CASH';
  transactionCode = '';
  paymentNotes = '';
  recordingPayment = false;

  // Multi-payment support
  selectedPayments: SelectedPayment[] = [];

  // Payment methods
  availablePaymentMethods: PaymentMethodConfig[] = [];
  selectedPaymentMethodId: number | null = null;
  selectedPaymentMethodCode = '';
  selectedPaymentMethodName = '';
  loadingPaymentMethods = false;

  // Wallet support
  customerWalletBalance: number = 0;
  loadingWallet = false;
  walletLoaded = false;

  // PDF download
  downloadingPDF = false;
  selectedTheme: 'default' | 'modern' | 'professional' | 'elegant' = 'default';

  // Send invoice
  sendingInvoice = false;
  sendEmail = '';
  sendPhone = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public invoiceService: InvoiceService,
    private paymentMethodService: PaymentMethodService,
    private debtorsService: DebtorsService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    const invoiceId = this.route.snapshot.paramMap.get('id');
    if (invoiceId) {
      this.loadInvoice(+invoiceId);
      this.loadPaymentMethods();
    } else {
      this.toast.error('Invalid invoice ID');
      this.router.navigate(['/invoices']);
    }
  }

  loadPaymentMethods(): void {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) return;

    this.loadingPaymentMethods = true;
    this.paymentMethodService
      .getEnabledByOrganization(+currentOrgId)
      .subscribe({
        next: (methods: PaymentMethodConfig[]) => {
          this.availablePaymentMethods = methods;
          // Set default to first method
          if (methods.length > 0) {
            this.onPaymentMethodChange(methods[0].id);
          }
          this.loadingPaymentMethods = false;
        },
        error: (error: any) => {
          console.error('Error loading payment methods:', error);
          this.loadingPaymentMethods = false;
        },
      });
  }

  onPaymentMethodChange(methodId: number): void {
    const method = this.availablePaymentMethods.find((m) => m.id === methodId);
    if (method) {
      this.selectedPaymentMethodId = method.id;
      this.selectedPaymentMethodCode = method.code;
      this.selectedPaymentMethodName = method.displayName;
    }
  }

  loadInvoice(id: number): void {
    this.isLoading = true;
    this.invoiceService.getInvoiceById(id).subscribe({
      next: (invoice) => {
        this.invoice = invoice;
        this.paymentAmount = invoice.balanceDue;
        this.sendEmail = invoice.customerEmail || '';
        this.sendPhone = invoice.customerPhone || '';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoice:', error);
        this.toast.error('Failed to load invoice');
        this.isLoading = false;
        this.router.navigate(['/invoices']);
      },
    });
  }

  openPaymentModal(): void {
    if (!this.invoice) return;
    this.paymentAmount = this.invoice.balanceDue;
    this.showPaymentModal = true;
    this.loadCustomerWallet();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.paymentAmount = 0;
    this.transactionCode = '';
    this.paymentNotes = '';
    this.selectedPayments = [];
    this.customerWalletBalance = 0;
    this.walletLoaded = false;
  }

  selectPaymentMethodForAdd(methodId: number): void {
    const method = this.availablePaymentMethods.find((m) => m.id === methodId);
    if (!method) return;

    const remainingBalance = this.getRemainingBalance();
    this.selectedPayments.push({
      methodId: method.id,
      code: method.code,
      name: method.displayName,
      amount: remainingBalance,
      transactionCode: '',
    });
  }

  removePaymentMethodByIndex(index: number): void {
    this.selectedPayments.splice(index, 1);
  }

  updatePaymentAmount(index: number, amount: number): void {
    if (this.selectedPayments[index]) {
      this.selectedPayments[index].amount = amount;
    }
  }

  updateTransactionCode(index: number, code: string): void {
    if (this.selectedPayments[index]) {
      this.selectedPayments[index].transactionCode = code;
    }
  }

  getTotalFromPayments(): number {
    return this.selectedPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );
  }

  getRemainingBalance(): number {
    const total = this.invoice?.balanceDue || 0;
    const paid = this.getTotalFromPayments();
    return total - paid;
  }

  getExcessAmount(): number {
    const remaining = this.getRemainingBalance();
    return remaining < 0 ? Math.abs(remaining) : 0;
  }

  requiresTransactionCode(methodId: number): boolean {
    const method = this.availablePaymentMethods.find((m) => m.id === methodId);
    return method?.requiresReference || false;
  }

  /** Load wallet balance for the invoice's customer */
  loadCustomerWallet(): void {
    if (!this.invoice?.customerId) return;
    this.loadingWallet = true;
    this.debtorsService.getCustomerWallet(this.invoice.customerId).subscribe({
      next: (wallet) => {
        this.customerWalletBalance = wallet.walletBalance || 0;
        this.walletLoaded = true;
        this.loadingWallet = false;
      },
      error: () => {
        this.customerWalletBalance = 0;
        this.walletLoaded = true;
        this.loadingWallet = false;
      },
    });
  }

  /** Add wallet as a payment source */
  addWalletPayment(): void {
    if (this.selectedPayments.some((p) => p.code === 'WALLET')) {
      this.toast.error('Wallet payment already added');
      return;
    }
    if (this.customerWalletBalance <= 0) {
      this.toast.error('No wallet balance available');
      return;
    }
    const balanceDue = this.invoice?.balanceDue || 0;
    const walletAmount = Math.min(
      this.customerWalletBalance,
      balanceDue,
    );
    if (walletAmount <= 0) {
      this.toast.error('No remaining balance to pay from wallet');
      return;
    }

    // Remove other payments if wallet covers the full balance
    if (walletAmount >= balanceDue) {
      this.selectedPayments = [];
    }

    this.selectedPayments.push({
      methodId: -1,
      code: 'WALLET',
      name: 'Customer Wallet',
      amount: walletAmount,
      transactionCode: '',
    });
  }

  isWalletPayment(payment: SelectedPayment): boolean {
    return payment.code === 'WALLET';
  }

  recordPayment(): void {
    if (!this.invoice) {
      this.toast.error('Invoice not found');
      return;
    }

    if (this.selectedPayments.length === 0) {
      this.toast.error('Please select at least one payment method');
      return;
    }

    const totalPayment = this.getTotalFromPayments();
    if (totalPayment <= 0) {
      this.toast.error('Please enter valid payment amounts');
      return;
    }

    // Overpayments are allowed - excess goes to customer wallet

    // Validate required transaction codes
    for (const payment of this.selectedPayments) {
      const method = this.availablePaymentMethods.find(
        (m) => m.id === payment.methodId,
      );
      if (method?.requiresReference && !payment.transactionCode) {
        this.toast.error(`Transaction code required for ${payment.name}`);
        return;
      }
    }

    this.recordingPayment = true;
    const username =
      JSON.parse(localStorage.getItem('user') || '{}').username ||
      'System User';

    // Separate wallet payments from regular payments
    const walletPayments = this.selectedPayments.filter(
      (p) => p.code === 'WALLET',
    );
    const regularPayments = this.selectedPayments.filter(
      (p) => p.code !== 'WALLET',
    );
    const walletTotal = walletPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    const processRegularPayments = () => {
      if (regularPayments.length === 0) {
        this.toast.success('Payment recorded successfully');
        this.closePaymentModal();
        this.loadInvoice(this.invoice!.id!);
        this.recordingPayment = false;
        return;
      }

      const paymentRequests = regularPayments.map((payment) => {
        const paymentDto: RecordPaymentDto = {
          amount: payment.amount,
          paymentMethod: payment.code as any,
          paymentMethodId: payment.methodId,
          paymentMethodCode: payment.code,
          paymentMethodName: payment.name,
          transactionCode: payment.transactionCode || undefined,
          paymentDate: new Date().toISOString(),
          notes: this.paymentNotes,
          recordedBy: username,
        };
        return this.invoiceService.recordPayment(this.invoice!.id!, paymentDto);
      });

      let completedCount = 0;
      const totalPayments = paymentRequests.length;

      paymentRequests.forEach((request, index) => {
        request.subscribe({
          next: (response: any) => {
            completedCount++;
            if (completedCount === totalPayments) {
              const messages: string[] = [];
              if (walletTotal > 0) {
                messages.push(
                  `${this.invoiceService.formatCurrency(walletTotal)} paid from wallet`,
                );
              }
              messages.push(`${totalPayments} payment(s) recorded`);
              if (response?.walletInfo) {
                messages.push(
                  `${this.invoiceService.formatCurrency(response.walletInfo.excessAmount)} excess added to wallet`,
                );
              }
              this.toast.success(messages.join('. '));
              this.closePaymentModal();
              this.loadInvoice(this.invoice!.id!);
              this.recordingPayment = false;
            }
          },
          error: (error) => {
            console.error('Error recording payment:', error);
            this.toast.error(
              `Failed to record payment ${index + 1} of ${totalPayments}`,
            );
            this.recordingPayment = false;
          },
        });
      });
    };

    if (walletTotal > 0 && this.invoice?.customerId) {
      const walletDto = {
        customerId: this.invoice.customerId,
        payments: [{ invoiceId: this.invoice.id!, amount: walletTotal }],
        recordedBy: username,
        notes: this.paymentNotes || 'Wallet payment applied from invoice',
      };

      this.debtorsService.applyWalletToInvoices(walletDto).subscribe({
        next: () => {
          if (regularPayments.length > 0) {
            this.invoiceService.getInvoiceById(this.invoice!.id!).subscribe({
              next: (updatedInvoice) => {
                this.invoice = updatedInvoice;
                processRegularPayments();
              },
              error: () => processRegularPayments(),
            });
          } else {
            this.toast.success(
              `${this.invoiceService.formatCurrency(walletTotal)} paid from customer wallet`,
            );
            this.closePaymentModal();
            this.loadInvoice(this.invoice!.id!);
            this.recordingPayment = false;
          }
        },
        error: (error) => {
          console.error('Error applying wallet payment:', error);
          this.toast.error(
            error?.error?.message || 'Failed to apply wallet payment',
          );
          this.recordingPayment = false;
        },
      });
    } else {
      processRegularPayments();
    }
  }

  downloadPDF(): void {
    if (!this.invoice) return;

    this.downloadingPDF = true;
    this.invoiceService
      .downloadInvoicePDF(this.invoice.id!, this.selectedTheme)
      .subscribe({
        next: (blob) => {
          this.invoiceService.downloadBlob(
            blob,
            `${this.invoice!.invoiceNumber}.pdf`,
          );
          this.toast.success('Invoice downloaded successfully');
          this.downloadingPDF = false;
        },
        error: (error) => {
          console.error('Error downloading PDF:', error);
          this.toast.error('Failed to download invoice');
          this.downloadingPDF = false;
        },
      });
  }

  sendInvoice(): void {
    if (!this.invoice) return;

    if (!this.sendEmail && !this.sendPhone) {
      this.toast.error('Please provide email or phone number');
      return;
    }

    this.sendingInvoice = true;
    this.invoiceService
      .sendInvoice(this.invoice.id!, {
        email: this.sendEmail,
        phone: this.sendPhone,
      })
      .subscribe({
        next: () => {
          this.toast.success('Invoice sent successfully');
          this.sendingInvoice = false;
        },
        error: (error) => {
          console.error('Error sending invoice:', error);
          this.toast.error('Failed to send invoice');
          this.sendingInvoice = false;
        },
      });
  }

  copyPublicLink(): void {
    if (!this.invoice?.publicToken) {
      this.toast.error('Public link not available');
      return;
    }

    this.invoiceService
      .copyPublicLink(this.invoice.publicToken)
      .then((success) => {
        if (success) {
          this.toast.success('Link copied to clipboard');
        } else {
          this.toast.error('Failed to copy link');
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/invoices']);
  }

  editInvoice(): void {
    if (!this.invoice) return;
    this.router.navigate(['/update-credit', this.invoice.id]);
  }

  cancelInvoice(): void {
    if (!this.invoice) return;

    if (confirm('Are you sure you want to cancel this invoice?')) {
      this.invoiceService.cancelInvoice(this.invoice.id!).subscribe({
        next: () => {
          this.toast.success('Invoice cancelled successfully');
          this.loadInvoice(this.invoice!.id!);
        },
        error: (error) => {
          console.error('Error cancelling invoice:', error);
          this.toast.error('Failed to cancel invoice');
        },
      });
    }
  }

  deleteInvoice(): void {
    if (!this.invoice) return;

    if (this.invoice.amountPaid > 0) {
      this.toast.error('Cannot delete an invoice with payments');
      return;
    }

    if (
      confirm(
        'Are you sure you want to delete this invoice? This action cannot be undone.',
      )
    ) {
      this.invoiceService.deleteInvoice(this.invoice.id!).subscribe({
        next: () => {
          this.toast.success('Invoice deleted successfully');
          this.router.navigate(['/invoices']);
        },
        error: (error) => {
          console.error('Error deleting invoice:', error);
          this.toast.error('Failed to delete invoice');
        },
      });
    }
  }
}
