import { Component, OnInit, ViewChild } from '@angular/core';
import {
  ProductService,
  ProductUnit,
} from '../../../../shared/Services/product.service';
import { Product } from '../../../../shared/interfaces/products';
import { SalesService } from '../../../../shared/Services/sales.service';
import { Sales } from '../../../../shared/interfaces/sales.interface';
import { HotToastService } from '@ngneat/hot-toast';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { AuthComponent } from '../../../../shared/Data/components/auth/auth.component';
import { Router } from '@angular/router';
import { PaymentsService } from '../../../../shared/Services/payments.service';
import { forkJoin } from 'rxjs';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { AddCustomerComponent } from '../../../customers/components/add-customer/add-customer.component';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import { SelectedProductsComponent } from '../../../../shared/components/selected-products/selected-products.component';
import { PaymentMethodService } from '../../../../shared/Services/payment-method.service';
import { PaymentMethodConfig } from '../../../../shared/interfaces/payment-method.interface';
import { AuthService } from '../../../../shared/Services/auth.service';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';

interface PaymentMethods {
  cash: number;
  mpesa: number;
  bank: number;
}

interface HeldSale {
  id: string;
  timestamp: Date;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    id: number | null;
  };
  selectedProducts: Product[];
  paymentMethods: PaymentMethods;
  mpesaDetails: {
    paymentNumber: string;
    confirmationCode: string;
    manualAmount: number;
  };
  totals: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
  reason?: string;
  cashierId: string;
}

@Component({
  selector: 'app-cash-sales',
  templateUrl: './cash-sales.component.html',
  styleUrls: ['./cash-sales.component.scss'],
})
export class CashSalesComponent implements OnInit {
  // ViewChild references
  @ViewChild(SelectedProductsComponent)
  selectedProductsComponent?: SelectedProductsComponent;

  // Core properties
  private dialog: DialogRemoteControl = new DialogRemoteControl(AuthComponent);
  private newCustomerDialog: DialogRemoteControl = new DialogRemoteControl(
    AddCustomerComponent,
  );
  products: Product[] = [];
  posting: boolean = false;
  currentUser: any;

  // Loading states
  isLoadingCustomers: boolean = false;

  // Selected products (managed by product-selector component)
  selectedProducts: Product[] = [];

  // VAT settings from product selector
  itemVatSettings: any;

  // Payment related properties
  mpesaPaymentNumber: string = '';
  sendingMpesaRequest: boolean = false;
  selectedPaymentMethod: 'cash' | 'mpesa' | 'bank' | null = null;
  mpesaPaymentMethod: 'stkPush' | 'manual' = 'manual';
  mpesaManualAmount: number = 0;
  mpesaConfirmationCode: string = '';

  // M-Pesa STK Push availability flag
  hasMpesaStkPush: boolean = true;

  // Customer related properties
  customers: Customer[] = [];
  selectedCustomerId: number | null = 0;
  customerName: string = 'Walk-in Customer';
  customerEmail: string = '';
  customerPhone: string = '';

  // Sales person tracking
  organizationUsers: any[] = [];
  selectedSalesPersonId: number | null = null;
  isLoadingUsers: boolean = false;

  // Commission preview
  commissionPreview: any = null;
  showCommissionPreview: boolean = false;
  loadingCommission: boolean = false;
  commissionItems: any[] = [];

  // Tracked product unit selection
  trackedUnitsByProduct: Record<number, ProductUnit[]> = {};
  trackedUnitsLoadingByProduct: Record<number, boolean> = {};

  paymentMethods: PaymentMethods = {
    cash: 0,
    mpesa: 0,
    bank: 0,
  };

  // Update mode properties
  isUpdateMode: boolean = false;
  saleTobeUpdate: Sales | null = null;
  saleIdTobeUpdate: number = 0;

  // Organization details
  orgDetails: any;

  // Payment methods
  availablePaymentMethods: PaymentMethodConfig[] = [];
  selectedPayments: Array<{
    methodId: number;
    methodCode: string;
    methodName: string;
    amount: number;
    transactionCode?: string;
  }> = [];
  loadingPaymentMethods = false;

  // Section navigation
  activeSection: 'products' | 'checkout' | 'held-sales' = 'products';

  // Floating cart (mobile)
  showMobileCart: boolean = false;

  // Hold Sales properties
  heldSales: HeldSale[] = [];
  showHeldSalesPanel: boolean = false;
  showHoldReasonDialog: boolean = false;
  holdReason: string = '';
  private readonly HELD_SALES_KEY = 'dasadove_held_sales';
  private holdCounter: number = 1;
  holdReasonOptions: string[] = [
    'Customer stepped away',
    'Price check needed',
    'Payment issue',
    'Customer getting items',
    'Manager approval needed',
    'Other',
  ];

  constructor(
    private router: Router,
    private productService: ProductService,
    private salesService: SalesService,
    private toast: HotToastService,
    private paymentsService: PaymentsService,
    private customerService: CustomerService,
    private orgDetailsService: OrgDetailsService,
    private paymentMethodService: PaymentMethodService,
    private authService: AuthService,
    private commissionService: CommissionService,
    private fb: FormBuilder,
  ) {
    this.initializeComponent();
  }

  private initializeComponent() {
    const urlParts = this.router.url.split('/');
    if (urlParts.includes('updateSale')) {
      this.saleIdTobeUpdate = +urlParts[urlParts.indexOf('updateSale') + 1];
      this.isUpdateMode = true;
      this.getSaleById(this.saleIdTobeUpdate);
      this.activeSection = 'checkout'; // Start at checkout for updates
    }

    this.hasMpesaStkPush = true;
    this.mpesaPaymentMethod = 'manual';
  }

  ngOnInit() {
    this.getAllProducts();
    this.getAllCustomers();
    this.loadOrgDetails();
    this.loadPaymentMethods();
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.loadHeldSales();
    this.loadOrganizationUsers();
  }

  loadPaymentMethods() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) return;

    this.loadingPaymentMethods = true;
    this.paymentMethodService
      .getEnabledByOrganization(+currentOrgId)
      .subscribe({
        next: (methods: PaymentMethodConfig[]) => {
          this.availablePaymentMethods = methods;
          this.loadingPaymentMethods = false;
        },
        error: (error: any) => {
          console.error('Error loading payment methods:', error);
          this.loadingPaymentMethods = false;
        },
      });
  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (currentOrgId) {
      this.orgDetailsService.getById(+currentOrgId).subscribe({
        next: (details: any) => {
          if (details) {
            this.orgDetails = details;
            this.hasMpesaStkPush = false;
            console.log('org details', details);
          }
        },
        error: (error) => {
          console.error('Error loading organization details:', error);
        },
      });
    }
  }

  loadOrganizationUsers() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) return;

    this.isLoadingUsers = true;
    this.authService.getUsersByOrganization(+currentOrgId).subscribe({
      next: (users: any[]) => {
        this.organizationUsers = users;
        // Set current user as default sales person
        if (this.currentUser && this.currentUser.id) {
          this.selectedSalesPersonId = this.currentUser.id;
        }
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('Error loading organization users:', error);
        this.toast.error('Failed to load users');
        this.isLoadingUsers = false;
      },
    });
  }

  // Calculate commission preview for current cart
  calculateCommissionPreview() {
    if (!this.selectedSalesPersonId || this.selectedProducts.length === 0) {
      this.commissionPreview = null;
      return;
    }

    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) return;

    this.loadingCommission = true;

    const items = this.selectedProducts.map((p) => ({
      productId: p.id,
      quantity: p.selectedItems || 1,
      unitPrice: p.price || 0,
    }));

    this.commissionService
      .calculatePreview(+currentOrgId, this.selectedSalesPersonId, items)
      .subscribe({
        next: (preview) => {
          this.commissionPreview = preview;
          this.commissionItems = preview.items.map(
            (item: any, index: number) => ({
              ...item,
              productName:
                this.selectedProducts[index]?.name || item.productName,
              originalAmount: item.commissionAmount,
              isEdited: false,
            }),
          );
          this.loadingCommission = false;
        },
        error: (error) => {
          console.error('Error calculating commission:', error);
          this.loadingCommission = false;
        },
      });
  }

  // Update commission for a specific item
  updateItemCommission(
    index: number,
    enabled: boolean,
    rate?: number,
    type?: string,
  ) {
    if (!this.commissionItems[index]) return;

    const item = this.commissionItems[index];

    if (!enabled) {
      // Disable commission for this item
      item.hasCommission = false;
      item.commissionAmount = 0;
      item.isEdited = true;
    } else if (rate !== undefined && type) {
      // Update commission rate/type
      item.commissionRate = rate;
      item.commissionType = type;
      item.isEdited = true;

      // Recalculate amount
      if (type === 'PERCENTAGE') {
        item.commissionAmount = (item.saleAmount * rate) / 100;
      } else if (type === 'FIXED') {
        item.commissionAmount = rate * item.quantity;
      }
      item.hasCommission = true;
    }

    // Recalculate total
    this.commissionPreview.totalCommission = this.commissionItems.reduce(
      (sum, c) => sum + (c.commissionAmount || 0),
      0,
    );
  }

  // Toggle commission preview panel
  toggleCommissionPreview() {
    this.showCommissionPreview = !this.showCommissionPreview;
    if (this.showCommissionPreview && !this.commissionPreview) {
      this.calculateCommissionPreview();
    }
  }

  // Watch for sales person changes
  onSalesPersonChange() {
    if (this.showCommissionPreview) {
      this.calculateCommissionPreview();
    }
  }

  // Event handlers for product selector component
  onProductAdded(product: Product): void {
    console.log('Product added:', product);
    if (this.isTrackedProduct(product)) {
      this.loadTrackedUnitsForProduct(product);
    }
  }

  onProductRemoved(event: { product: Product; index: number }): void {
    // Optional: Add any custom logic when product is removed
    console.log('Product removed:', event.product);
  }

  getSaleById(id: number) {
    this.salesService.getSalesbyId(id).subscribe({
      next: (data: Sales) => {
        // Parse items if they come as a string
        const items =
          typeof data.items === 'string' ? JSON.parse(data.items) : data.items;

        this.selectedProducts = items.map((item: any) => ({
          ...item,
          discountValue: item.discountValue || 0,
        }));

        this.getTrackedProductsInCart().forEach((product) => {
          this.loadTrackedUnitsForProduct(product);
        });

        this.saleTobeUpdate = data;
        this.customerName = data.customer_name || 'Walk-in Customer';
        console.log('Sale to be updated:', data.customer_name);
        this.customerEmail = data.customerEmail || '';
        if (data.customerId) {
          this.selectedCustomerId = data.customerId;
          this.getCustomerById(data.customerId);
        }
        this.paymentMethods = {
          cash: data.cashPaid,
          mpesa: data.mpesaPaid,
          bank: data.bankPaid,
        };

        // Load M-Pesa details if M-Pesa payment was made
        if (data.mpesaPaid > 0) {
          this.mpesaManualAmount = data.mpesaPaid;
          this.mpesaConfirmationCode = data.mpesaTransactionId || '';
        }
      },
      error: (error) => {
        this.toast.error('Error loading sale details');
        console.error('Error:', error);
      },
    });
  }

  getCustomerById(id: number) {
    this.customerService.getCustomerbyId(id).subscribe({
      next: (customer: Customer) => {
        this.customerName = customer.fullName || '';
        this.customerEmail = customer.email || '';
        this.customerPhone = customer.phoneNumber || '';
      },
      error: (error) => {
        this.toast.error('Error loading customer details');
        console.error('Error:', error);
      },
    });
  }

  onCustomerSelected() {
    if (this.selectedCustomerId) {
      this.getCustomerById(this.selectedCustomerId);
    } else {
      this.customerName = 'Walk-in Customer';
      this.customerEmail = '';
      this.customerPhone = '';
    }
  }

  getAllProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        this.toast.error('Error loading products');
        console.error('Error:', error);
      },
    });
  }

  getAllCustomers(): void {
    this.isLoadingCustomers = true;
    this.customerService.getAllCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.isLoadingCustomers = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.isLoadingCustomers = false;
      },
    });
  }

  // Calculation methods (using product selector's cart data)
  calculateItemTotal(product: Product): number {
    // Simple calculation - product selector handles VAT and discounts
    return (
      product.price * (product.selectedItems || 1) -
      (product.discountValue || 0)
    );
  }

  calculateSubtotal(): number {
    return this.selectedProducts.reduce(
      (total, product) => total + product.price * (product.selectedItems || 1),
      0,
    );
  }

  calculateTotalDiscount(): number {
    return this.selectedProducts.reduce((total, product) => {
      return total + (product.discountValue || 0);
    }, 0);
  }

  calculateTotalVat(): number {
    // Get total tax from selected-products component if available
    if (this.selectedProductsComponent) {
      return this.selectedProductsComponent.getTotalTax();
    }

    // Fallback: Calculate tax directly from selectedProducts
    return this.selectedProducts.reduce((total, product) => {
      const taxType = product.taxType || 'inclusive'; // Default to inclusive to match UI

      if (taxType === 'exempt') {
        return total;
      }

      const qty = product.selectedItems || 1;
      const price = product.price;
      const discount = product.discountValue || 0;
      const afterDiscount = qty * price - discount;

      const VAT_RATE = 0.16; // 16%

      if (taxType === 'inclusive') {
        // Tax is already included in price
        // Tax = Price / 1.16 * 0.16
        return total + (afterDiscount - afterDiscount / 1.16);
      } else if (taxType === 'exclusive') {
        // Exclusive - tax is added on top
        return total + afterDiscount * VAT_RATE;
      }

      return total;
    }, 0);
  }

  calculateTotal(): number {
    // Use selected-products component's calculation if available (more accurate)
    if (this.selectedProductsComponent) {
      return Math.ceil(this.selectedProductsComponent.getGrandTotal());
    }

    // Fallback calculation
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateTotalDiscount();

    // For exclusive tax, add tax on top
    // For inclusive tax, tax is already in the price
    const exclusiveTax = this.selectedProducts.reduce((total, product) => {
      if (product.taxType === 'exclusive') {
        const qty = product.selectedItems || 1;
        const price = product.price;
        const productDiscount = product.discountValue || 0;
        const afterDiscount = qty * price - productDiscount;
        return total + afterDiscount * 0.16;
      }
      return total;
    }, 0);

    // Round up to avoid decimals in payment
    return Math.ceil(subtotal - discount + exclusiveTax);
  }

  calculateAmountPaid(): number {
    // If using dynamic payment methods, sum those instead
    if (this.selectedPayments.length > 0) {
      return this.getTotalFromPayments();
    }
    // Otherwise use legacy payment methods
    return (
      this.paymentMethods.bank +
      this.paymentMethods.cash +
      this.paymentMethods.mpesa
    );
  }

  getRemainingAmount(): number {
    return Math.max(0, this.calculateTotal() - this.calculateAmountPaid());
  }

  isPaymentComplete(): boolean {
    return this.calculateAmountPaid() >= this.calculateTotal();
  }

  // Payment methods
  payAll() {
    const remaining = this.calculateTotal() - this.calculateAmountPaid();
    if (remaining <= 0) {
      this.toast.info('Payment is already complete');
      return;
    }

    if (this.selectedPaymentMethod === 'cash') {
      this.paymentMethods.cash += remaining;
    } else if (this.selectedPaymentMethod === 'mpesa') {
      this.mpesaManualAmount = remaining;
      this.paymentMethods.mpesa = remaining;
    } else if (this.selectedPaymentMethod === 'bank') {
      this.paymentMethods.bank += remaining;
    } else {
      this.toast.error('Please select a payment method first');
      return;
    }

    this.toast.success(
      `Full amount (KSh ${remaining.toFixed(0)}) applied to ${
        this.selectedPaymentMethod
      }`,
    );
  }

  submitManualMpesaPayment() {
    if (this.mpesaManualAmount <= 0) {
      this.toast.error('Please enter a valid M-Pesa amount');
      return;
    }

    if (!this.mpesaConfirmationCode.trim()) {
      this.toast.error('Please enter M-Pesa confirmation code');
      return;
    }

    this.paymentMethods.mpesa = this.mpesaManualAmount;
    this.toast.success('M-Pesa payment recorded successfully');
  }

  sendMpesaStkPushRequest() {
    if (!this.hasMpesaStkPush) {
      this.toast.error(
        'M-Pesa STK Push is not configured for this organization',
      );
      return;
    }

    if (!this.mpesaPaymentNumber) {
      this.toast.error('Enter M-Pesa phone number');
      return;
    }

    const remainingAmount = this.calculateTotal() - this.calculateAmountPaid();
    if (remainingAmount <= 0) {
      this.toast.error('Payment is already complete');
      return;
    }

    this.sendingMpesaRequest = true;

    const data = {
      phoneNumber: this.mpesaPaymentNumber,
      amount: remainingAmount,
      accountReference: `Sale-${Date.now()}`,
      transactionDesc: 'Purchase Payment',
    };

    this.salesService.mpesaStkPush(data).subscribe({
      next: () => {
        this.toast.success('M-Pesa request sent successfully');
        this.sendingMpesaRequest = false;
        this.getUnusedTransactions();
      },
      error: () => {
        this.toast.error('Error sending M-Pesa request');
        this.sendingMpesaRequest = false;
      },
    });
  }

  getUnusedTransactions() {
    this.salesService.getUnUsedTransactions().subscribe({
      next: (transactions) => {
        console.log('Unused Transactions:', transactions);
      },
      error: (error) => {
        console.error('Error fetching unused transactions:', error);
      },
    });
  }

  isTrackedProduct(product: Product): boolean {
    return ['SERIAL', 'IMEI', 'REGISTRATION'].includes(
      product.trackingMode || 'NONE',
    );
  }

  getTrackedProductsInCart(): Product[] {
    return this.selectedProducts.filter((product) =>
      this.isTrackedProduct(product),
    );
  }

  getTrackingLabel(product: Product): string {
    if (product.trackingMode === 'IMEI') {
      return 'IMEI';
    }

    if (product.trackingMode === 'REGISTRATION') {
      return 'Reg Number';
    }

    if (product.trackingMode === 'SERIAL') {
      return 'Serial Number';
    }

    return 'Identifier';
  }

  getAvailableUnits(productId: number): ProductUnit[] {
    return this.trackedUnitsByProduct[productId] || [];
  }

  loadTrackedUnitsForProduct(product: Product): void {
    if (!product.id || !this.isTrackedProduct(product)) {
      return;
    }

    this.trackedUnitsLoadingByProduct[product.id] = true;

    this.productService
      .getProductUnits(product.id, { status: 'IN_STOCK', limit: 100 })
      .subscribe({
        next: (response) => {
          this.trackedUnitsByProduct[product.id] = response.data;
          this.syncSelectedUnitsWithQty(product);
          this.trackedUnitsLoadingByProduct[product.id] = false;
        },
        error: () => {
          this.toast.error(`Failed to load units for ${product.name}`);
          this.trackedUnitsLoadingByProduct[product.id] = false;
        },
      });
  }

  getSelectedUnitCount(product: Product): number {
    return product.selectedUnitIds?.length || 0;
  }

  canSelectMoreUnits(product: Product): boolean {
    const required = product.selectedItems || 1;
    return this.getSelectedUnitCount(product) < required;
  }

  isUnitSelected(product: Product, unitId: number): boolean {
    return (product.selectedUnitIds || []).includes(unitId);
  }

  toggleUnitSelection(
    product: Product,
    unitId: number,
    checked: boolean,
  ): void {
    if (!product.selectedUnitIds) {
      product.selectedUnitIds = [];
    }

    if (checked) {
      if (product.selectedUnitIds.includes(unitId)) {
        return;
      }

      if (!this.canSelectMoreUnits(product)) {
        this.toast.warning(
          `Only ${product.selectedItems || 1} ${this.getTrackingLabel(product)} can be selected for ${product.name}`,
        );
        return;
      }

      product.selectedUnitIds = [...product.selectedUnitIds, unitId];
      return;
    }

    product.selectedUnitIds = product.selectedUnitIds.filter(
      (id) => id !== unitId,
    );
  }

  private syncSelectedUnitsWithQty(product: Product): void {
    if (!product.selectedUnitIds?.length) {
      return;
    }

    const required = product.selectedItems || 1;
    if (product.selectedUnitIds.length > required) {
      product.selectedUnitIds = product.selectedUnitIds.slice(0, required);
    }

    const availableUnitIds = new Set(
      (this.trackedUnitsByProduct[product.id] || []).map((unit) => unit.id),
    );

    product.selectedUnitIds = product.selectedUnitIds.filter((id) =>
      availableUnitIds.has(id),
    );
  }

  private validateTrackedSelections(showToast: boolean = true): boolean {
    for (const product of this.getTrackedProductsInCart()) {
      const required = product.selectedItems || 1;
      const selected = product.selectedUnitIds?.length || 0;

      if (selected !== required) {
        if (showToast) {
          this.toast.error(
            `Select ${required} ${this.getTrackingLabel(product)} for ${product.name}. Currently selected: ${selected}`,
          );
        }
        return false;
      }
    }

    return true;
  }

  // Main submission methods
  submitOrder() {
    if (!this.customerName.trim()) {
      this.toast.error('Please enter customer name');
      return;
    }

    if (this.selectedProducts.length === 0) {
      this.toast.error('Please add products to cart');
      return;
    }

    if (!this.validateTrackedSelections()) {
      return;
    }

    const totalPayment = this.calculateAmountPaid();
    const totalAmount = this.calculateTotal();

    if (totalPayment < totalAmount) {
      this.toast.error(
        `Insufficient payment. Due: KSh ${(totalAmount - totalPayment).toFixed(
          0,
        )}`,
      );
      return;
    }

    // Build payments array from selected payments
    const payments =
      this.selectedPayments.length > 0
        ? this.selectedPayments.map((p, index) => ({
            id: index + 1, // Temporary ID for frontend
            paymentMethodId: p.methodId,
            paymentMethodCode: p.methodCode,
            paymentMethodName: p.methodName,
            amount: p.amount,
            transactionCode: p.transactionCode || '',
            paymentDate: new Date().toISOString(),
            recordedBy: this.currentUser.username || 'System',
          }))
        : undefined;

    // Build commission overrides if user has edited them
    const commissionOverrides = this.commissionItems
      .filter((item) => item.isEdited) // Only include edited items
      .map((item) => ({
        productId: item.productId,
        enabled: item.hasCommission,
        commissionType: item.commissionType,
        commissionRate: item.commissionRate,
        commissionAmount: item.commissionAmount,
      }));

    const sales: Sales = {
      items: this.selectedProducts.map((product) => {
        const productCopy = {
          ...product,
          discountValue: product.discountValue || 0,
          oneTimeService: product.oneTimeService || false,
          selectedUnitIds: product.selectedUnitIds || [],
        };
        return productCopy;
      }),
      cashPaid: this.paymentMethods.cash,
      mpesaPaid: this.paymentMethods.mpesa || this.mpesaManualAmount,
      bankPaid: this.paymentMethods.bank,
      taxAmount: this.calculateTotalVat(),
      totalTax: this.calculateTotalVat(),
      discountAmount: this.calculateTotalDiscount(),
      totalDiscount: this.calculateTotalDiscount(),
      total: this.calculateTotal(),
      customer_name: this.customerName,
      customerEmail: this.customerEmail,
      customerId: +this.selectedCustomerId!,
      totalAmountPaid: totalPayment,
      mpesaTransactionId: this.mpesaConfirmationCode || '',
      created_by: this.currentUser.username,
      salesPersonId: this.selectedSalesPersonId || undefined,
      commissionOverrides:
        commissionOverrides.length > 0 ? commissionOverrides : undefined,
      printerIp: '192.168.1.6',
      isVoided: false,
      payments: payments,
    };

    this.posting = true;

    const request = this.isUpdateMode
      ? this.salesService.updateSales(this.saleIdTobeUpdate, sales)
      : this.salesService.addSales(sales);

    request.subscribe({
      next: (res: Sales) => {
        this.handlePaymentRecording(res);
      },
      error: (error) => {
        this.posting = false;
        this.toast.error('Error submitting sale');
        console.error('Sale submission error:', error);
      },
    });
  }

  private handlePaymentRecording(sale: Sales) {
    const paymentPromises = [];

    if (this.paymentMethods.cash > 0) {
      paymentPromises.push(
        this.paymentsService.recordSalePayment(sale.id!, {
          amount: this.paymentMethods.cash,
          method: 'CASH',
          transactionType: 'SALE',
          paymentType: 'INCOME',
          paidBy: this.customerName,
          paidTo: 'Organization',
          description: `Cash payment for sale #${sale.id}`,
          orderId: sale.id,
        }),
      );
    }

    if (this.paymentMethods.mpesa > 0) {
      paymentPromises.push(
        this.paymentsService.recordSalePayment(sale.id!, {
          amount: this.paymentMethods.mpesa,
          method: 'MPESA',
          transactionType: 'SALE',
          paymentType: 'INCOME',
          paidBy: this.mpesaPaymentNumber,
          paidTo: 'Organization',
          description: `M-Pesa payment for sale #${sale.id}`,
          transactionCode: this.mpesaConfirmationCode,
          orderId: sale.id,
        }),
      );
    }

    if (this.paymentMethods.bank > 0) {
      paymentPromises.push(
        this.paymentsService.recordSalePayment(sale.id!, {
          amount: this.paymentMethods.bank,
          method: 'BANK_TRANSFER',
          transactionType: 'SALE',
          paymentType: 'INCOME',
          paidBy: this.customerName,
          paidTo: 'Organization',
          description: `Bank transfer for sale #${sale.id}`,
          orderId: sale.id,
        }),
      );
    }

    if (paymentPromises.length > 0) {
      forkJoin(paymentPromises).subscribe({
        next: () => this.handleSuccessfulPayment(),
        error: (error) => this.handlePaymentError(error),
      });
    } else {
      this.handleSuccessfulPayment();
    }
  }

  private handleSuccessfulPayment() {
    this.resetForm();
    this.posting = false;
    this.toast.success(
      `Sale ${this.isUpdateMode ? 'updated' : 'created'} successfully`,
    );
    this.router.navigate(['/cash-sales']);
  }

  private handlePaymentError(error: any) {
    this.posting = false;
    this.toast.error('Error recording payments');
    console.error('Payment recording error:', error);
  }

  updateSale(id: number) {
    const sales: Sales = {
      items: this.selectedProducts.map((product) => {
        const productCopy = {
          ...product,
          discountValue: product.discountValue || 0,
          oneTimeService: product.oneTimeService || false,
          selectedUnitIds: product.selectedUnitIds || [],
        };
        return productCopy;
      }),
      cashPaid: this.paymentMethods.cash,
      mpesaPaid: this.paymentMethods.mpesa || this.mpesaManualAmount,
      bankPaid: this.paymentMethods.bank,
      taxAmount: this.calculateTotalVat(),
      totalTax: this.calculateTotalVat(),
      discountAmount: this.calculateTotalDiscount(),
      totalDiscount: this.calculateTotalDiscount(),
      total: this.calculateTotal(),
      customer_name: this.customerName,
      customerEmail: this.customerEmail,
      customerId: +this.selectedCustomerId!,
      totalAmountPaid: this.calculateAmountPaid(),
      mpesaTransactionId: this.mpesaConfirmationCode || '',
      created_by: this.currentUser.username,
      printerIp: '192.168.1.6',
      isVoided: false,
    };

    if (this.calculateAmountPaid() < this.calculateTotal()) {
      this.toast.error('Insufficient payment for update');
      return;
    }

    if (!this.validateTrackedSelections()) {
      return;
    }

    this.posting = true;

    this.salesService.updateSales(id, sales).subscribe({
      next: () => {
        this.toast.success('Sale updated successfully');
        this.router.navigate(['/cash-sales']);
        this.posting = false;
      },
      error: (error) => {
        this.toast.error('Error updating sale');
        console.error('Update error:', error);
        this.posting = false;
      },
    });
  }

  submit() {
    if (this.isUpdateMode) {
      this.updateSale(this.saleIdTobeUpdate);
    } else {
      this.submitOrder();
    }
  }

  canSubmit(): boolean {
    return (
      this.selectedProducts.length > 0 &&
      this.customerName.trim() !== '' &&
      this.isPaymentComplete() &&
      this.validateTrackedSelections(false) &&
      !this.posting
    );
  }

  // Hold Sales Management
  loadHeldSales() {
    try {
      const saved = localStorage.getItem(this.HELD_SALES_KEY);
      if (saved) {
        this.heldSales = JSON.parse(saved).map((sale: any) => ({
          ...sale,
          timestamp: new Date(sale.timestamp),
        }));
        console.log('Loaded held sales:', this.heldSales.length);
      }
    } catch (error) {
      console.error('Error loading held sales:', error);
      this.heldSales = [];
    }
  }

  saveHeldSales() {
    try {
      localStorage.setItem(this.HELD_SALES_KEY, JSON.stringify(this.heldSales));
    } catch (error) {
      console.error('Error saving held sales:', error);
      this.toast.error('Error saving held sales');
    }
  }

  showHoldDialog() {
    if (this.selectedProducts.length === 0) {
      this.toast.warning('No items in cart to hold');
      return;
    }
    this.showHoldReasonDialog = true;
    this.holdReason = '';
  }

  holdCurrentSale() {
    const holdId = `HOLD-${String(this.holdCounter).padStart(3, '0')}`;
    this.holdCounter++;

    const heldSale: HeldSale = {
      id: holdId,
      timestamp: new Date(),
      customerInfo: {
        name: this.customerName,
        email: this.customerEmail,
        phone: this.customerPhone,
        id: this.selectedCustomerId,
      },
      selectedProducts: JSON.parse(JSON.stringify(this.selectedProducts)), // Deep copy
      paymentMethods: { ...this.paymentMethods },
      mpesaDetails: {
        paymentNumber: this.mpesaPaymentNumber,
        confirmationCode: this.mpesaConfirmationCode,
        manualAmount: this.mpesaManualAmount,
      },
      totals: {
        subtotal: this.calculateSubtotal(),
        tax: this.calculateTotalVat(),
        discount: this.calculateTotalDiscount(),
        total: this.calculateTotal(),
      },
      reason: this.holdReason,
      cashierId: this.currentUser?.username || 'Unknown',
    };

    this.heldSales.push(heldSale);
    this.saveHeldSales();

    // Clear current sale
    this.resetForm();
    this.holdReason = '';
    this.showHoldReasonDialog = false;

    this.toast.success(`Sale held as ${holdId}`);
  }

  resumeHeldSale(heldSale: HeldSale) {
    // Check if current sale has items - warn user
    if (this.selectedProducts.length > 0) {
      if (
        !confirm(
          'Current cart has items. Resume held sale and lose current items?',
        )
      ) {
        return;
      }
    }

    // Restore the held sale
    this.selectedProducts = heldSale.selectedProducts;
    this.customerName = heldSale.customerInfo.name;
    this.customerEmail = heldSale.customerInfo.email;
    this.customerPhone = heldSale.customerInfo.phone;
    this.selectedCustomerId = heldSale.customerInfo.id;
    this.paymentMethods = { ...heldSale.paymentMethods };
    this.mpesaPaymentNumber = heldSale.mpesaDetails.paymentNumber;
    this.mpesaConfirmationCode = heldSale.mpesaDetails.confirmationCode;
    this.mpesaManualAmount = heldSale.mpesaDetails.manualAmount;

    this.getTrackedProductsInCart().forEach((product) => {
      this.loadTrackedUnitsForProduct(product);
    });

    // Remove from held sales
    this.removeHeldSale(heldSale.id);

    // Navigate to checkout
    this.activeSection = 'checkout';
    this.showHeldSalesPanel = false;

    this.toast.success(`Resumed sale ${heldSale.id}`);
  }

  removeHeldSale(holdId: string) {
    this.heldSales = this.heldSales.filter((sale) => sale.id !== holdId);
    this.saveHeldSales();
  }

  deleteHeldSale(heldSale: HeldSale) {
    if (confirm(`Delete held sale ${heldSale.id}?`)) {
      this.removeHeldSale(heldSale.id);
      this.toast.success(`Deleted held sale ${heldSale.id}`);
    }
  }

  clearAllHeldSales() {
    if (confirm('Clear all held sales? This cannot be undone.')) {
      this.heldSales = [];
      this.saveHeldSales();
      this.toast.success('All held sales cleared');
    }
  }

  getHeldSaleAge(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  toggleHeldSalesPanel() {
    this.showHeldSalesPanel = !this.showHeldSalesPanel;
  }

  trackHeldSale(index: number, sale: HeldSale): string {
    return sale.id;
  }

  selectHoldReason(reason: string) {
    this.holdReason = reason;
  }

  cancelHold() {
    this.showHoldReasonDialog = false;
    this.holdReason = '';
  }

  // Payment method management
  addPaymentMethod(method: PaymentMethodConfig, amount: number = 0) {
    const existing = this.selectedPayments.find(
      (p) => p.methodId === method.id,
    );
    if (existing) {
      existing.amount = amount || this.getRemainingAmount();
    } else {
      this.selectedPayments.push({
        methodId: method.id,
        methodCode: method.code,
        methodName: method.displayName,
        amount: amount || this.getRemainingAmount(),
      });
    }
  }

  selectPaymentMethodForAdd(method: PaymentMethodConfig) {
    this.addPaymentMethod(method, 0);
  }

  removePaymentMethod(methodId: number) {
    this.selectedPayments = this.selectedPayments.filter(
      (p) => p.methodId !== methodId,
    );
  }

  removePaymentMethodByIndex(index: number) {
    this.selectedPayments.splice(index, 1);
  }

  updatePaymentAmount(index: number, amount: string | number) {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (this.selectedPayments[index] && !isNaN(numAmount)) {
      this.selectedPayments[index].amount = numAmount;
    }
  }

  updateTransactionCode(index: number, code: string) {
    if (this.selectedPayments[index]) {
      this.selectedPayments[index].transactionCode = code;
    }
  }

  payFullWithSelectedMethod() {
    if (this.selectedPayments.length === 1) {
      const totalAmount = this.calculateTotal();
      this.selectedPayments[0].amount = totalAmount;
    }
  }

  getTotalFromPayments(): number {
    return this.selectedPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  // Utility methods
  private resetForm() {
    this.selectedProducts = [];
    this.paymentMethods = {
      cash: 0,
      mpesa: 0,
      bank: 0,
    };
    this.trackedUnitsByProduct = {};
    this.trackedUnitsLoadingByProduct = {};
    this.mpesaPaymentNumber = '';
    this.mpesaConfirmationCode = '';
    this.mpesaManualAmount = 0;
    this.customerName = 'Walk-in Customer';
    this.customerEmail = '';
    this.customerPhone = '';
    this.selectedCustomerId = 0;
    this.selectedPaymentMethod = null;
    this.activeSection = 'products';
    this.getAllProducts();
  }

  // Product management methods for SelectedProductsComponent
  removeProduct(productId: number) {
    this.selectedProducts = this.selectedProducts.filter(
      (p) => p.id !== productId,
    );
    delete this.trackedUnitsByProduct[productId];
    delete this.trackedUnitsLoadingByProduct[productId];
  }

  updateProductQty(productId: number, qty: number) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      product.selectedItems = qty;
      this.syncSelectedUnitsWithQty(product);
      if (
        this.isTrackedProduct(product) &&
        !this.trackedUnitsByProduct[product.id]
      ) {
        this.loadTrackedUnitsForProduct(product);
      }
    }
  }

  updateProductPrice(productId: number, price: number) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      product.price = price;
    }
  }

  updateProductPriceType(productId: number, priceType: 'retail' | 'wholesale') {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product && this.selectedProductsComponent) {
      this.selectedProductsComponent.priceTypes[productId] = priceType;
    }
  }

  updateProductTaxType(
    productId: number,
    taxType: 'exempt' | 'inclusive' | 'exclusive',
  ) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      product.taxType = taxType;
    }
  }

  // Navigation methods
  routeToSales() {
    this.router.navigate(['/sales']);
  }

  openDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.submit();
  }

  openAddCustomerDialog() {
    this.newCustomerDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.newCustomerDialog.openDialog().subscribe((resp) => {
      this.getAllCustomers();
    });
  }

  closeDialog() {
    this.dialog.closeDialog();
  }
}
