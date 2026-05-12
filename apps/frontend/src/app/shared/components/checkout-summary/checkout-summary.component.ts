import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../interfaces/products';
import { Customer } from '../../interfaces/customer.interface';
import { PaymentMethodConfig } from '../../interfaces/payment-method.interface';

export type CheckoutMode = 'cash' | 'credit' | 'quotation';

export interface PaymentMethods {
  cash: number;
  mpesa: number;
  bank: number;
}

export interface SelectedPayment {
  methodId: number;
  methodCode: string;
  methodName: string;
  amount: number;
  transactionCode?: string;
}

export interface CreditTerms {
  dueDate: string;
  paymentTerms: string;
  customTerms?: number;
}

@Component({
  selector: 'app-checkout-summary',
  templateUrl: './checkout-summary.component.html',
  styleUrls: ['./checkout-summary.component.scss'],
})
export class CheckoutSummaryComponent {
  // Configuration
  @Input() mode: CheckoutMode = 'cash';
  @Input() themeColor: 'blue' | 'orange' | 'purple' = 'blue';
  @Input() currencySymbol: string = 'KSh';

  // Data
  @Input() selectedProducts: Product[] = [];
  @Input() customers: Customer[] = [];

  // Customer
  @Input() selectedCustomerId: number | null = null;
  @Input() customerName: string = '';
  @Input() customerEmail: string = '';
  @Input() customerPhone: string = '';

  // Calculations (optional - computed if not provided)
  @Input() totalVat: number | null = null;
  @Input() totalDiscount: number | null = null;

  // Payment (for cash sales)
  @Input() paymentMethods: PaymentMethods = { cash: 0, mpesa: 0, bank: 0 };
  @Input() selectedPaymentMethod: 'cash' | 'mpesa' | 'bank' | null = null;
  @Input() mpesaPaymentMethod: 'manual' | 'stkPush' = 'manual';
  @Input() mpesaPaymentNumber: string = '';
  @Input() mpesaConfirmationCode: string = '';
  @Input() mpesaManualAmount: number = 0;
  @Input() hasMpesaStkPush: boolean = false;
  @Input() sendingMpesaRequest: boolean = false;

  @Output() mpesaPaymentNumberChange = new EventEmitter<string>();
  @Output() mpesaConfirmationCodeChange = new EventEmitter<string>();
  @Output() mpesaManualAmountChange = new EventEmitter<number>();

  // Dynamic payment methods
  @Input() availablePaymentMethods: PaymentMethodConfig[] = [];
  @Input() selectedPayments: SelectedPayment[] = [];
  @Input() loadingPaymentMethods: boolean = false;

  @Output() addPaymentMethod = new EventEmitter<{
    method: PaymentMethodConfig;
    amount: number;
  }>();
  @Output() removePaymentMethod = new EventEmitter<number>();
  @Output() updatePaymentAmount = new EventEmitter<{
    index: number;
    amount: number;
  }>();
  @Output() updateTransactionCode = new EventEmitter<{
    index: number;
    code: string;
  }>();

  // Credit terms (for credit sales)
  @Input() creditTerms: CreditTerms | null = null;
  @Input() today: string = new Date().toISOString().split('T')[0];

  // State
  @Input() posting: boolean = false;
  @Input() isUpdateMode: boolean = false;

  // Outputs
  @Output() customerSelected = new EventEmitter<number | null>();
  @Output() customerNameChange = new EventEmitter<string>();
  @Output() customerEmailChange = new EventEmitter<string>();
  @Output() customerPhoneChange = new EventEmitter<string>();
  @Output() addCustomer = new EventEmitter<void>();

  @Output() paymentMethodSelected = new EventEmitter<
    'cash' | 'mpesa' | 'bank'
  >();
  @Output() payAllClicked = new EventEmitter<void>();
  @Output() mpesaStkPushClicked = new EventEmitter<void>();
  @Output() manualMpesaSubmit = new EventEmitter<void>();

  @Output() creditTermsChange = new EventEmitter<CreditTerms>();

  @Output() removeProduct = new EventEmitter<number>();
  @Output() updateProductQty = new EventEmitter<{ id: number; qty: number }>();
  @Output() priceChange = new EventEmitter<{ id: number; price: number }>();
  @Output() priceTypeChange = new EventEmitter<{
    id: number;
    priceType: 'retail' | 'wholesale';
  }>();
  @Output() taxTypeChange = new EventEmitter<{
    id: number;
    taxType: 'exempt' | 'inclusive' | 'exclusive';
  }>();

  @Output() submit = new EventEmitter<void>();
  @Output() backToProducts = new EventEmitter<void>();

  // Calculation methods
  calculateSubtotal(): number {
    return this.selectedProducts.reduce(
      (total, product) => total + product.price * (product.selectedItems || 1),
      0,
    );
  }

  calculateTotalDiscount(): number {
    // Use provided value if available, otherwise calculate
    if (this.totalDiscount !== null) {
      return this.totalDiscount;
    }
    return this.selectedProducts.reduce((total, product) => {
      return total + ((product as any).discountValue || 0);
    }, 0);
  }

  calculateTotalVat(): number {
    // Use provided value if available, otherwise calculate from products
    if (this.totalVat !== null && this.totalVat > 0) {
      return this.totalVat;
    }

    // Calculate tax from products directly
    return this.selectedProducts.reduce((total, product) => {
      return total + this.calculateProductTax(product);
    }, 0);
  }

  private calculateProductTax(product: Product): number {
    const taxType = product.taxType || 'inclusive'; // Default to inclusive to match UI
    if (taxType === 'exempt') {
      return 0;
    }

    const qty = (product.selectedItems as number) || 0;
    const price = product.price;
    const subtotal = qty * price;
    const discount = (product.discountValue as number) || 0;
    const afterDiscount = subtotal - discount;

    const VAT_RATE = 0.16; // 16%

    if (taxType === 'inclusive') {
      // Tax is already included in price
      // Tax = Price / 1.16 * 0.16
      return afterDiscount - afterDiscount / 1.16;
    } else {
      // Exclusive - tax is added on top
      return afterDiscount * VAT_RATE;
    }
  }

  calculateTotal(): number {
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateTotalDiscount();

    // Only add exclusive tax (inclusive tax is already in the price)
    const exclusiveTax = this.selectedProducts.reduce((total, product) => {
      const taxType = product.taxType || 'inclusive';
      if (taxType === 'exclusive') {
        const qty = (product.selectedItems as number) || 0;
        const price = product.price;
        const productDiscount = (product.discountValue as number) || 0;
        const afterDiscount = qty * price - productDiscount;
        return total + afterDiscount * 0.16;
      }
      return total;
    }, 0);

    return subtotal - discount + exclusiveTax;
  }

  calculateAmountPaid(): number {
    // If using dynamic payment methods, sum those instead
    if (this.selectedPayments.length > 0) {
      return this.selectedPayments.reduce(
        (total, payment) => total + payment.amount,
        0,
      );
    }
    // Otherwise use legacy payment methods
    return (
      this.paymentMethods.bank +
      this.paymentMethods.cash +
      this.paymentMethods.mpesa
    );
  }

  getRemainingAmount(): number {
    const remaining = this.calculateTotal() - this.calculateAmountPaid();
    return remaining > 0 ? remaining : -remaining; // Return absolute value for change
  }

  isPaymentComplete(): boolean {
    return this.calculateAmountPaid() >= this.calculateTotal();
  }

  canSubmit(): boolean {
    const hasProducts = this.selectedProducts.length > 0;
    const hasCustomer = this.customerName.trim() !== '';

    if (this.mode === 'cash') {
      return (
        hasProducts && hasCustomer && this.isPaymentComplete() && !this.posting
      );
    } else if (this.mode === 'credit') {
      return (
        hasProducts &&
        hasCustomer &&
        !!this.creditTerms?.dueDate &&
        !this.posting
      );
    } else {
      return hasProducts && hasCustomer && !this.posting;
    }
  }

  onCustomerSelect(customerId: number | null) {
    this.customerSelected.emit(customerId);
  }

  getSelectedCustomer(): Customer | undefined {
    if (!this.selectedCustomerId) return undefined;
    return this.customers.find((c) => c.id === this.selectedCustomerId);
  }

  onPaymentMethodSelect(method: 'cash' | 'mpesa' | 'bank') {
    this.paymentMethodSelected.emit(method);
  }
}
