import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { HotToastService } from '@ngneat/hot-toast';
import { CreditAuthComponent } from '../../../../../shared/Data/components/credit-auth/credit-auth.component';
import { Product } from '../../../../../shared/interfaces/products';
import { ProductService } from '../../../../../shared/Services/product.service';
import { Customer } from '../../../../../shared/interfaces/customer.interface';
import { CustomerService } from '../../../../../shared/Services/customer.service';
import { CreditSale } from '../../../../../shared/interfaces/cretitSale.interface';
import { CreditSaleService } from '../../../../../shared/Services/credit-sale.service';
import { InvoiceService } from '../../../../../shared/Services/invoice.service';
import { CreateInvoiceDto, InvoiceType, InvoiceStatus } from '../../../../../shared/interfaces/invoice.interface';
import { Router } from '@angular/router';
import { AddCustomerComponent } from '../../../../customers/components/add-customer/add-customer.component';
import { AuthService } from '../../../../../shared/Services/auth.service';
import { CommissionService } from '../../../../../shared/Services/commission/commission.service';

@Component({
  selector: 'app-make-credit-sales',
  templateUrl: './make-credit-sales.component.html',
  styleUrl: './make-credit-sales.component.scss',
})
export class MakeCreditSalesComponent implements OnInit, AfterViewInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    CreditAuthComponent
  );
  private newCustomerDialog: DialogRemoteControl = new DialogRemoteControl(
    AddCustomerComponent
  );

  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('productSearch') productSearch!: ElementRef<HTMLInputElement>;

  // Core properties
  searchQuery: string = '';
  products: Product[] = [];
  productsCopy: Product[] = [];
  productsLoading: boolean = true;
  posting: boolean = false;
  currentUser: any;

  // Loading states
  isSearchingProducts: boolean = false;
  isLoadingCustomers: boolean = false;
  isBarcodeScanning: boolean = false;
  isAddingProduct: { [key: number]: boolean } = {};

  // Selected products and calculations
  selectedProducts: Product[] = [];
  productTotals: number[] = [];

  // Store original product prices for reference
  originalProductPrices: { [key: number]: number } = {};

  // Customer related properties
  customers: Customer[] = [];
  selectedCustomerId: number | null = null;
  selectedCustomer: Customer | null = null;
  customerName: string = '';
  customerEmail: string = '';
  customerPhone: string = '';

  // Due date and payment terms
  dueDate: string = '';
  paymentTerms: string = '30'; // Default 30 days
  customTerms: number = 30;
  today: string = new Date().toISOString().split('T')[0];

  // Discount and VAT properties
  globalDiscountValue: number = 0;
  itemVatSettings: { [key: number]: boolean } = {};

  // Price type settings (retail vs wholesale)
  itemPriceType: { [key: number]: 'retail' | 'wholesale' } = {};
  originalRetailPrices: { [key: number]: number } = {};
  originalWholesalePrices: { [key: number]: number } = {};

  // Update mode properties
  isUpdateMode: boolean = false;
  saleIdToUpdate: number | null = null;
  saleTobeUpdate: CreditSale | null = null;

  // One-time product properties
  oneTimeProductForm: FormGroup | any;
  showOneTimeProductForm: boolean = false;
  oneTimeProductCounter: number = -1;

  // Credit limit settings (configurable)
  defaultCreditLimit: number = 1000000; // 1M default
  creditLimitWarningThreshold: number = 0.8; // 80% of limit

  // Updated UX properties for two-section design
  activeSection: 'products' | 'checkout' = 'products';
  cartExpanded: boolean = true;
  showMobileCart: boolean = false;

  // Legacy property for backward compatibility (can be removed if not used elsewhere)
  activeStep: 'customer' | 'products' | 'payment' = 'customer';

  // Sales person tracking
  organizationUsers: any[] = [];
  selectedSalesPersonId: number | null = null;
  isLoadingUsers: boolean = false;

  // Commission preview
  commissionPreview: any = null;
  showCommissionPreview: boolean = false;
  loadingCommission: boolean = false;
  commissionItems: any[] = [];

  // Invoice status control
  saveAsDraft: boolean = false;
  InvoiceStatus = InvoiceStatus; // Expose enum to template

  constructor(
    private productService: ProductService,
    private toast: HotToastService,
    private router: Router,
    private creditSalesService: CreditSaleService,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private fb: FormBuilder,
    private authService: AuthService,
    private commissionService: CommissionService
  ) {
    this.initializeComponent();
    this.initializeOneTimeProductForm();
  }

  private initializeComponent() {
    const urlParts = this.router.url.split('/');
    if (urlParts.includes('update-credit')) {
      this.saleIdToUpdate = +urlParts[urlParts.indexOf('update-credit') + 1];
      this.isUpdateMode = true;
      this.getSaleById(this.saleIdToUpdate);
      this.activeSection = 'checkout'; // Start at checkout for updates
    }
  }

  private initializeOneTimeProductForm() {
    this.oneTimeProductForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: ['One-time product/service'],
    });
  }

  ngOnInit() {
    this.getAllProducts();
    this.getAllCustomers();
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.initializeDueDate();
    this.loadOrganizationUsers();
  }

  ngAfterViewInit() {
    this.focusBarcodeInput();
  }

  // ===================== SECTION MANAGEMENT =====================

  // Section navigation methods
  setActiveSection(section: 'products' | 'checkout') {
    this.activeSection = section;

    // Auto-focus appropriate inputs
    setTimeout(() => {
      if (section === 'products') {
        this.focusProductSearch();
      }
    }, 100);
  }

  // Legacy step navigation (for backward compatibility)
  setActiveStep(step: 'customer' | 'products' | 'payment') {
    this.activeStep = step;

    // Map legacy steps to new sections
    if (step === 'customer' || step === 'payment') {
      this.activeSection = 'checkout';
    } else if (step === 'products') {
      this.activeSection = 'products';
    }

    // Auto-focus appropriate inputs
    setTimeout(() => {
      if (step === 'products') {
        this.focusProductSearch();
      }
    }, 100);
  }

  initializeDueDate() {
    // Set default due date to 30 days from today
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    this.dueDate = defaultDate.toISOString().split('T')[0];
  }

  focusBarcodeInput() {
    if (this.barcodeInput?.nativeElement) {
      this.barcodeInput.nativeElement.focus();
    }
  }

  focusProductSearch() {
    if (this.productSearch?.nativeElement) {
      this.productSearch.nativeElement.focus();
    }
  }

  // ===================== VALIDATION METHODS =====================

  canProceedToCheckout(): boolean {
    return this.selectedProducts.length > 0;
  }

  canProceedToProducts(): boolean {
    return this.selectedCustomer !== null && this.dueDate !== '';
  }

  canSubmit(): boolean {
    return (
      this.selectedCustomer !== null &&
      this.selectedProducts.length > 0 &&
      this.dueDate !== '' &&
      !this.posting
    );
  }

  validateCreditSale(): boolean {
    if (!this.selectedCustomer) {
      this.toast.error('Please select a customer for credit sale');
      this.setActiveSection('checkout');
      return false;
    }

    if (!this.dueDate) {
      this.toast.error('Please set a due date for the credit sale');
      this.setActiveSection('checkout');
      return false;
    }

    // Check if due date is in the past
    const today = new Date();
    const due = new Date(this.dueDate);
    if (due < today) {
      this.toast.error('Due date cannot be in the past');
      this.setActiveSection('checkout');
      return false;
    }

    if (this.selectedProducts.length === 0) {
      this.toast.error('Please add at least one product');
      this.setActiveSection('products');
      return false;
    }

    if (this.calculateTotal() <= 0) {
      this.toast.error('Credit sale total must be greater than zero');
      return false;
    }

    // COMMENTED OUT: Credit limit validation - allowing sales over credit limit
    // const creditWarning = this.getCreditLimitWarning();
    // if (creditWarning && creditWarning.includes('exceed')) {
    //   this.toast.error(
    //     creditWarning + '. Please reduce the order or contact manager.'
    //   );
    //   return false;
    // }

    return true;
  }

  // ===================== PAYMENT TERMS MANAGEMENT =====================

  getPaymentTermsDisplay(): string {
    switch (this.paymentTerms) {
      case '7':
        return '7 Days';
      case '14':
        return '14 Days';
      case '30':
        return '30 Days';
      case '60':
        return '60 Days';
      case '90':
        return '90 Days';
      case 'custom':
        return `${this.customTerms} Days`;
      default:
        return '30 Days';
    }
  }

  getPaymentTermsDays(): number {
    if (this.paymentTerms === 'custom') {
      return this.customTerms;
    }
    return parseInt(this.paymentTerms) || 30;
  }

  getDaysUntilDue(): number | null {
    if (!this.dueDate) return null;

    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  onPaymentTermsChange() {
    this.updateDueDateFromTerms();
  }

  onCustomTermsChange() {
    if (this.paymentTerms === 'custom') {
      this.updateDueDateFromTerms();
    }
  }

  private updateDueDateFromTerms() {
    const days =
      this.paymentTerms === 'custom'
        ? this.customTerms
        : parseInt(this.paymentTerms);
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + days);
    this.dueDate = newDueDate.toISOString().split('T')[0];
  }

  // ===================== DATA LOADING METHODS =====================

  getSaleById(id: number) {
    this.creditSalesService.getCreditSalebyId(id).subscribe({
      next: (data: CreditSale) => {
        // Parse items if they come as a string
        const items =
          typeof data.items === 'string' ? JSON.parse(data.items) : data.items;

        this.selectedProducts = items.map((item: any) => ({
          ...item,
          selectedItems: item.selectedItems || 1,
          discountValue: item.discountValue || 0,
        }));

        this.saleTobeUpdate = data;
        this.selectedCustomerId = data.customer_id;
        this.getCustomerById(data.customer_id);

        // Set due date from existing sale
        if (data.payment_date) {
          this.dueDate = new Date(data.payment_date)
            .toISOString()
            .split('T')[0];
        }

        // Set payment terms if available
        if (data.payment_terms) {
          const termMatch = data.payment_terms.match(/(\d+)\s*Days?/i);
          if (termMatch) {
            const days = termMatch[1];
            if (['7', '14', '30', '60', '90'].includes(days)) {
              this.paymentTerms = days;
            } else {
              this.paymentTerms = 'custom';
              this.customTerms = parseInt(days);
            }
          }
        }

        if (items) {
          items.forEach((item: any) => {
            if (item.id) {
              // Load VAT settings if available
              this.itemVatSettings[item.id] = item.hasVat || false;
              this.originalProductPrices[item.id] = item.price;

              // Load price type settings if available
              if (item.wholesalePrice) {
                this.originalWholesalePrices[item.id] = item.wholesalePrice;
              }
              this.originalRetailPrices[item.id] = item.price;
              this.itemPriceType[item.id] = 'retail'; // Default to retail
            }
          });
        }

        // Set to checkout section since customer is already selected
        this.activeSection = 'checkout';
      },
      error: (error) => this.handleError(error, 'loading sale details'),
    });
  }

  getCustomerById(id: number) {
    this.customerService.getCustomerbyId(id).subscribe({
      next: (customer: Customer) => {
        this.selectedCustomer = customer;
        this.customerName = customer.fullName || '';
        this.customerEmail = customer.email || '';
        this.customerPhone = customer.phoneNumber || '';

        // Check credit limit and show warning if needed
        const warning = this.getCreditLimitWarning();
        if (warning) {
          this.toast.warning(warning);
        }
      },
      error: (error) => this.handleError(error, 'loading customer details'),
    });
  }

  getAllProducts(): void {
    this.productsLoading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.productsCopy = products;

        products.forEach((product) => {
          this.originalProductPrices[product.id] = product.price;
        });

        this.productsLoading = false;
        this.filterProducts(this.searchQuery);
      },
      error: (error) => {
        this.productsLoading = false;
        this.handleError(error, 'loading products');
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
        this.isLoadingCustomers = false;
        this.handleError(error, 'loading customers');
      },
    });
  }

  // ===================== SALES PERSON & COMMISSION =====================

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

  onSalesPersonChange() {
    // Recalculate commission when sales person changes
    if (this.showCommissionPreview && this.selectedSalesPersonId) {
      this.calculateCommissionPreview();
    }
  }

  toggleCommissionPreview() {
    this.showCommissionPreview = !this.showCommissionPreview;
    if (this.showCommissionPreview && this.selectedSalesPersonId) {
      this.calculateCommissionPreview();
    }
  }

  calculateCommissionPreview() {
    if (!this.selectedSalesPersonId || this.selectedProducts.length === 0) {
      this.commissionPreview = null;
      return;
    }

    const organizationId = Number(localStorage.getItem('licencedOrg'));
    const items = this.selectedProducts
      .filter(p => p.id && p.id > 0) // Only real products, not one-time products
      .map(product => ({
        productId: product.id!,
        quantity: product.selectedItems || 1,
        unitPrice: product.price,
      }));

    if (items.length === 0) {
      this.commissionPreview = null;
      this.commissionItems = [];
      return;
    }

    this.loadingCommission = true;
    this.commissionService
      .calculatePreview(organizationId, this.selectedSalesPersonId, items)
      .subscribe({
        next: (preview) => {
          this.commissionPreview = preview;
          this.commissionItems = preview.items.map((item: any) => ({
            ...item,
            isEdited: false,
          }));
          this.loadingCommission = false;
        },
        error: (error) => {
          console.error('Error calculating commission preview:', error);
          this.loadingCommission = false;
        },
      });
  }

  updateItemCommission(
    index: number,
    enabled: boolean,
    rate?: number,
    type?: string
  ) {
    const item = this.commissionItems[index];
    item.hasCommission = enabled;
    item.isEdited = true;

    if (enabled && rate !== undefined && type) {
      item.commissionType = type;
      if (type === 'PERCENTAGE') {
        item.commissionRate = rate;
        item.commissionAmount = (item.saleAmount * rate) / 100;
      } else {
        // FIXED
        item.commissionRate = rate;
        item.commissionAmount = rate * item.quantity;
      }
    } else if (!enabled) {
      item.commissionAmount = 0;
    }

    // Recalculate total
    this.commissionPreview.totalCommission = this.commissionItems.reduce(
      (sum: number, i: any) => sum + (i.commissionAmount || 0),
      0
    );
  }

  // ===================== PRODUCT SEARCH AND FILTERING =====================

  filterProducts(query: string): void {
    this.isSearchingProducts = true;

    setTimeout(() => {
      if (query.trim() === '') {
        this.products = this.productsCopy;
      } else {
        this.products = this.productsCopy.filter(
          (product) =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.productIdNumber?.toLowerCase().includes(query.toLowerCase())
        );
      }
      this.isSearchingProducts = false;
    }, 300);
  }

  onBarcodeScanned(barcode: string) {
    if (!barcode.trim()) {
      this.toast.error('Please enter a valid barcode');
      return;
    }

    this.isBarcodeScanning = true;
    this.productService.searchProductByBarcode(barcode).subscribe({
      next: (product: Product) => {
        if (product) {
          this.originalProductPrices[product.id] = product.price;
          this.addToSelectedProducts(product);
          this.clearBarcodeInput();
          this.focusBarcodeInput();
          this.toast.success(`${product.name} added to cart`);
        } else {
          this.toast.error('Product not found');
        }
        this.isBarcodeScanning = false;
      },
      error: (error) => {
        this.isBarcodeScanning = false;
        this.handleError(error, 'searching product');
      },
    });
  }

  // ===================== PRODUCT SELECTION AND CART MANAGEMENT =====================

  onProductClick(product: Product): void {
    if (this.isAddingProduct[product.id]) {
      return;
    }

    this.isAddingProduct[product.id] = true;

    // Store original prices (both retail and wholesale)
    this.originalProductPrices[product.id] = product.price;
    this.originalRetailPrices[product.id] = product.price;
    this.originalWholesalePrices[product.id] =
      product.wholesalePrice || product.price;

    // Set default price type to retail
    this.itemPriceType[product.id] = 'retail';

    setTimeout(() => {
      const existingProduct = this.selectedProducts.find(
        (p) => p.id === product.id
      );

      if (existingProduct) {
        if (product.isService || product.oneTimeService) {
          existingProduct.selectedItems =
            (existingProduct.selectedItems || 1) + 1;
          this.toast.success(
            `${product.name} quantity increased to ${existingProduct.selectedItems}`
          );
        } else {
          const newQuantity = (existingProduct.selectedItems || 1) + 1;
          if ((product.quantity ?? 0) >= newQuantity) {
            existingProduct.selectedItems = newQuantity;
            this.toast.success(
              `${product.name} quantity increased to ${existingProduct.selectedItems}`
            );
          } else {
            this.toast.error(
              `Insufficient stock. Available: ${product.quantity}, Currently in cart: ${existingProduct.selectedItems}`
            );
          }
        }
        this.isAddingProduct[product.id] = false;
        return;
      }

      if (product.isService) {
        product.selectedItems = product.selectedItems ?? 1;
        this.addToSelectedProducts(product);
        this.toast.success(`${product.name} added to cart`);
        this.isAddingProduct[product.id] = false;
        return;
      }

      if ((product.quantity ?? 0) < 1) {
        this.confirmSellOutOfStock(product);
        this.isAddingProduct[product.id] = false;
        return;
      }

      product.selectedItems = product.selectedItems ?? 1;
      this.addToSelectedProducts(product);
      this.toast.success(`${product.name} added to cart`);
      this.isAddingProduct[product.id] = false;
    }, 300);
  }

  onProductAdded(product: Product): void {
    // Product is already added via two-way binding in product-selector
    // This method is just for logging or additional side effects
    console.log('Product added:', product);
  }

  confirmSellOutOfStock(product: Product) {
    this.toast.warning(
      `${product.name} is out of stock. Adding as a one-time product.`
    );

    this.oneTimeProductForm.patchValue({
      name: product.name,
      price: product.price,
      quantity: 1,
      description: product.description || 'One-time product',
    });

    this.showOneTimeProductForm = true;
  }

  addToSelectedProducts(product: Product) {
    const existingProduct = this.selectedProducts.find(
      (p) => p.id === product.id
    );

    if (existingProduct) {
      existingProduct.selectedItems = (existingProduct.selectedItems || 0) + 1;
    } else {
      const newProduct = {
        ...product,
        selectedItems: 1,
        discountValue: 0,
        discount: product.discount || 0,
      };
      this.selectedProducts.push(newProduct);
      this.itemVatSettings[product.id] = false;

      // Initialize price type settings if not already set
      if (!this.itemPriceType[product.id]) {
        this.itemPriceType[product.id] = 'retail';
      }
    }

    // Auto-expand cart when items are added
    this.cartExpanded = true;
  }

  addOneTimeProduct() {
    if (this.oneTimeProductForm.invalid) {
      this.toast.error('Please fill in all required fields correctly');
      return;
    }

    const formValue = this.oneTimeProductForm.value;

    const oneTimeProduct: Product = {
      id: this.oneTimeProductCounter--,
      name: formValue.name,
      price: formValue.price,
      description: formValue.description,
      selectedItems: formValue.quantity,
      isService: true,
      oneTimeService: true,
      quantity: 999,
      discountValue: 0,
      productIdNumber: `ONE-TIME-${Date.now()}`,
      availability: true,
      categoryId: 0,
      buyingPrice: 0,
      category: null,
      pax: null,
      discount: 0,
    };

    this.originalProductPrices[oneTimeProduct.id] = oneTimeProduct.price;
    this.originalRetailPrices[oneTimeProduct.id] = oneTimeProduct.price;
    this.originalWholesalePrices[oneTimeProduct.id] = oneTimeProduct.price; // Same price for one-time products
    this.itemPriceType[oneTimeProduct.id] = 'retail';
    this.selectedProducts.push(oneTimeProduct);
    this.itemVatSettings[oneTimeProduct.id] = false;

    this.toast.success('One-time product added successfully');
    this.oneTimeProductForm.reset({
      name: '',
      price: 0,
      quantity: 1,
      description: 'One-time product/service',
    });
    this.showOneTimeProductForm = false;
    this.cartExpanded = true;
  }

  // ===================== QUANTITY AND PRICE MANAGEMENT =====================

  updateQuantity(product: Product, newQuantity: number) {
    if (newQuantity < 1) {
      this.toast.error('Quantity must be at least 1');
      return;
    }

    if (!product.isService && !product.oneTimeService) {
      if (newQuantity > (product.quantity ?? 0)) {
        this.toast.error(`Insufficient stock. Available: ${product.quantity}`);
        return;
      }
    }

    product.selectedItems = newQuantity;
  }

  addQuantity(product: Product) {
    if (product.isService || product.oneTimeService) {
      product.selectedItems = (product.selectedItems || 1) + 1;
      return;
    }

    const requestedQuantity = (product.selectedItems || 1) + 1;
    if ((product.quantity ?? 0) < requestedQuantity) {
      this.toast.error(
        `Insufficient stock for ${product.name}. Available: ${product.quantity}`
      );

      if ((product.quantity ?? 0) === 0) {
        this.toast.warning(`${product.name} is out of stock`);
      } else if ((product.quantity ?? 0) <= (product.reorderLevel ?? 0)) {
        this.toast.warning(`${product.name} is below reorder level`);
      }
      return;
    }

    product.selectedItems = requestedQuantity;
  }

  reduceQuantity(product: Product) {
    if ((product.selectedItems || 1) > 1) {
      product.selectedItems = (product.selectedItems || 1) - 1;
    }
  }

  updateProductPrice(product: Product, newPrice: number) {
    if (newPrice < 0) {
      this.toast.error('Price cannot be negative');
      product.price = this.originalProductPrices[product.id] || 0;
      return;
    }

    product.price = newPrice;

    if (
      product.discountValue &&
      product.discountValue > newPrice * (product.selectedItems || 1)
    ) {
      product.discountValue = 0;
      this.toast.warning(
        'Discount has been reset as it was greater than the new total price'
      );
    }
  }

  resetProductPrice(product: Product) {
    const originalPrice = this.originalProductPrices[product.id];
    if (originalPrice !== undefined) {
      product.price = originalPrice;
      this.toast.info(`Price reset to original: ${originalPrice}`);
    }
  }

  // ===================== DISCOUNT AND VAT MANAGEMENT =====================

  updateItemDiscount(product: Product, discountValue: number) {
    if (discountValue >= 0) {
      const basePrice = product.price * (product.selectedItems || 1);
      if (discountValue > basePrice) {
        this.toast.error('Discount cannot be greater than the product price');
        product.discountValue = 0;
      } else {
        product.discountValue = discountValue;
      }
    } else {
      this.toast.error('Discount must be a positive number');
      product.discountValue = 0;
    }
  }

  updateGlobalDiscount(discountValue: number) {
    if (discountValue >= 0) {
      if (discountValue > this.calculateSubtotal()) {
        this.toast.error('Global discount cannot be greater than the subtotal');
        this.globalDiscountValue = 0;
      } else {
        this.globalDiscountValue = discountValue;
      }
    } else {
      this.toast.error('Global discount must be a positive number');
      this.globalDiscountValue = 0;
    }
  }

  toggleVat(productId: number) {
    this.itemVatSettings[productId] = !this.itemVatSettings[productId];
  }

  // Price type toggle method
  togglePriceType(product: Product) {
    const currentType = this.itemPriceType[product.id] || 'retail';
    const newType = currentType === 'retail' ? 'wholesale' : 'retail';

    // Check if product has wholesale price
    if (newType === 'wholesale' && !product.wholesalePrice) {
      this.toast.warning('This product does not have a wholesale price set');
      return;
    }

    this.itemPriceType[product.id] = newType;

    // Update the product price based on selected type
    if (newType === 'wholesale') {
      product.price = this.originalWholesalePrices[product.id];
      this.toast.success(`Switched to wholesale price: KSh ${product.price}`);
    } else {
      product.price = this.originalRetailPrices[product.id];
      this.toast.success(`Switched to retail price: KSh ${product.price}`);
    }
  }

  // Get current price type for display
  getPriceType(productId: number): 'retail' | 'wholesale' {
    return this.itemPriceType[productId] || 'retail';
  }

  // Check if product has wholesale price available
  hasWholesalePrice(product: Product): boolean {
    return !!(product.wholesalePrice && product.wholesalePrice > 0);
  }

  // ===================== CALCULATION METHODS =====================

  calculateItemTotal(product: Product): number {
    let basePrice = product.price * (product.selectedItems || 1);

    if (product.discount && product.discount > 0) {
      basePrice = basePrice - (basePrice * product.discount) / 100;
    }

    if (product.discountValue) {
      basePrice = basePrice - product.discountValue;
    }

    const afterGlobalDiscount =
      basePrice -
      (this.selectedProducts.length > 0
        ? this.globalDiscountValue / this.selectedProducts.length
        : 0);

    if (this.itemVatSettings[product.id]) {
      return Math.max(0, afterGlobalDiscount) * 1.16;
    }

    return Math.max(0, afterGlobalDiscount);
  }

  calculateSubtotal(): number {
    return this.selectedProducts.reduce(
      (total, product) => total + this.calculateItemTotal(product),
      0
    );
  }

  calculateTotalDiscount(): number {
    const percentageDiscounts = this.selectedProducts.reduce(
      (total, product) => {
        if (product.discount && product.discount > 0) {
          const discountAmount =
            product.price *
            (product.selectedItems || 1) *
            (product.discount / 100);
          return total + discountAmount;
        }
        return total;
      },
      0
    );

    const valueDiscounts = this.selectedProducts.reduce((total, product) => {
      return total + (product.discountValue || 0);
    }, 0);

    return percentageDiscounts + valueDiscounts + this.globalDiscountValue;
  }

  calculateTotalVat(): number {
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
    return this.calculateSubtotal();
  }

  getTotalQuantity(): number {
    return this.selectedProducts.reduce((total, product) => {
      return total + (product.selectedItems || 1);
    }, 0);
  }

  // ===================== CUSTOMER MANAGEMENT =====================

  onCustomerSelected() {
    if (this.selectedCustomerId) {
      this.getCustomerById(this.selectedCustomerId);
    } else {
      this.selectedCustomer = null;
      this.customerName = '';
      this.customerEmail = '';
      this.customerPhone = '';
    }
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

  // ===================== CREDIT MANAGEMENT =====================

  calculateRemainingCreditLimit(): number {
    return this.defaultCreditLimit;
  }

  checkCreditLimit(): boolean {
    if (!this.selectedCustomer) return false;

    const currentCredit = this.selectedCustomer.dueCredit || 0;
    const newCreditAmount = this.calculateTotal();
    const creditLimit = this.calculateRemainingCreditLimit();

    return currentCredit + newCreditAmount <= creditLimit;
  }

  getCreditLimitWarning(): string | null {
    if (!this.selectedCustomer) return null;

    const currentCredit = this.selectedCustomer.dueCredit || 0;
    const newCreditAmount = this.calculateTotal();
    const creditLimit = this.calculateRemainingCreditLimit();
    const totalCredit = currentCredit + newCreditAmount;

    if (totalCredit > creditLimit) {
      const exceed = totalCredit - creditLimit;
      return `This sale will exceed credit limit by KSh ${exceed.toFixed(0)}`;
    }

    if (totalCredit > creditLimit * this.creditLimitWarningThreshold) {
      const remaining = creditLimit - totalCredit;
      return `Approaching credit limit. Remaining: KSh ${remaining.toFixed(0)}`;
    }

    return null;
  }

  // ===================== FORM SUBMISSION =====================

  submit() {
    if (!this.validateCreditSale()) {
      return;
    }

    // Map products to invoice items
    const invoiceItems = this.selectedProducts.map((product) => ({
      productId: product.id,
      productName: product.name,
      description: product.description || product.name,
      quantity: product.selectedItems || 1,
      unitPrice: product.price,
      discount: product.discountValue || 0,
      taxRate: this.itemVatSettings[product.id] ? 16 : 0, // 16% VAT if enabled
      amount: (product.price * (product.selectedItems || 1)) - (product.discountValue || 0),
    }));

    // Build commission overrides if any items were edited
    const commissionOverrides = this.commissionItems
      .filter(item => item.isEdited)
      .map(item => ({
        productId: item.productId,
        enabled: item.hasCommission,
        commissionType: item.commissionType,
        commissionRate: item.commissionRate,
        commissionAmount: item.commissionAmount,
      }));

    // Create invoice DTO
    const invoiceDto: CreateInvoiceDto = {
      invoiceType: InvoiceType.CREDIT_SALE,
      customerId: +this.selectedCustomerId!,
      customerAddress: '', // Customer interface doesn't have address field

      items: invoiceItems,

      issueDate: new Date().toISOString().split('T')[0],
      orderDate: new Date().toISOString().split('T')[0],
      paymentTerms: this.getPaymentTermsDisplay(),
      paymentTermsDays: this.getPaymentTermsDays(),

      discountAmount: this.calculateTotalDiscount(),
      taxRate: 16, // 16% VAT

      notes: `Payment Terms: ${this.getPaymentTermsDisplay()}\nDue Date: ${this.dueDate}`,

      createdBy: this.currentUser.username || 'System User',
      shiftId: 1,

      // Commission fields
      salesPersonId: this.selectedSalesPersonId || undefined,
      commissionOverrides: commissionOverrides.length > 0 ? commissionOverrides : undefined,

      // Invoice status - save as draft or finalize
      status: this.saveAsDraft ? InvoiceStatus.DRAFT : InvoiceStatus.PENDING,
    };

    this.posting = true;

    const request =
      this.isUpdateMode && this.saleIdToUpdate
        ? this.invoiceService.updateInvoice(this.saleIdToUpdate, invoiceDto)
        : this.invoiceService.createInvoice(invoiceDto);

    request.subscribe({
      next: (invoice) => {
        this.toast.success(
          `Invoice ${invoice.invoiceNumber} ${
            this.isUpdateMode ? 'updated' : 'created'
          } successfully`
        );
        this.posting = false;
        this.routeToCreditSales();
      },
      error: (error) => {
        this.posting = false;
        this.handleCreditSaleError(
          error,
          `${this.isUpdateMode ? 'updating' : 'creating'}`
        );
      },
    });
  }

  openDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.submit();
  }

  closeDialog() {
    this.dialog.closeDialog();
  }

  // ===================== UTILITY METHODS =====================

  clearBarcodeInput() {
    if (this.barcodeInput?.nativeElement) {
      this.barcodeInput.nativeElement.value = '';
      this.barcodeInput.nativeElement.focus();
    }
  }

  removeSelectedProduct(index: number) {
    if (index >= 0 && index < this.selectedProducts.length) {
      const product = this.selectedProducts[index];
      delete this.itemVatSettings[product.id];
      delete this.originalProductPrices[product.id];
      delete this.itemPriceType[product.id];
      delete this.originalRetailPrices[product.id];
      delete this.originalWholesalePrices[product.id];
      this.selectedProducts.splice(index, 1);
      this.toast.success('Product removed from cart');

      // If cart becomes empty, switch to products section
      if (this.selectedProducts.length === 0) {
        this.activeSection = 'products';
      }
    }
  }

  toggleOneTimeProductForm() {
    this.showOneTimeProductForm = !this.showOneTimeProductForm;
    if (!this.showOneTimeProductForm) {
      this.oneTimeProductForm.reset({
        name: '',
        price: 0,
        quantity: 1,
        description: 'One-time product/service',
      });
    }
  }

  resetForm() {
    this.selectedProducts = [];
    this.selectedCustomer = null;
    this.selectedCustomerId = null;
    this.customerName = '';
    this.customerEmail = '';
    this.customerPhone = '';
    this.globalDiscountValue = 0;
    this.itemVatSettings = {};
    this.originalProductPrices = {};
    this.itemPriceType = {};
    this.originalRetailPrices = {};
    this.originalWholesalePrices = {};
    this.activeSection = 'products';
    this.cartExpanded = true;
    this.initializeDueDate();
    this.paymentTerms = '30';
    this.customTerms = 30;
    this.oneTimeProductForm.reset({
      name: '',
      price: 0,
      quantity: 1,
      description: 'One-time product/service',
    });
    this.showOneTimeProductForm = false;
    this.getAllProducts();
  }

  // Product management methods for SelectedProductsComponent
  removeProduct(productId: number) {
    this.selectedProducts = this.selectedProducts.filter(
      (p) => p.id !== productId
    );
  }

  updateProductQty(productId: number, qty: number) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      product.selectedItems = qty;
    }
  }

  onProductPriceChange(productId: number, price: number) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      this.updateProductPrice(product, price);
    }
  }

  updateProductPriceType(productId: number, priceType: 'retail' | 'wholesale') {
    // Price type is handled by the selected-products component
  }

  updateProductTaxType(
    productId: number,
    taxType: 'exempt' | 'inclusive' | 'exclusive'
  ) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      product.taxType = taxType;
    }
  }

  routeToCreditSales() {
    // Navigate to the new invoices page
    this.router.navigate(['/invoices']);
  }

  // Format currency for display
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Track by functions for performance
  trackByProductId(index: number, product: Product): any {
    return product.id;
  }

  trackBySelectedProductId(index: number, product: Product): any {
    return product.id;
  }

  trackByCustomerId(index: number, customer: Customer): any {
    return customer.id;
  }

  // ===================== ERROR HANDLING =====================

  private handleError(error: any, operation: string) {
    console.error(`${operation} error:`, error);
    this.toast.error(`Error ${operation}`);
  }

  private handleCreditSaleError(error: any, operation: string) {
    console.error(`Credit sale ${operation} error:`, error);

    if (error.status === 400) {
      this.toast.error(`Invalid credit sale data. Please check all fields.`);
    } else if (error.status === 403) {
      this.toast.error(`Credit limit exceeded. Contact manager for approval.`);
    } else if (error.status === 404) {
      this.toast.error(`Customer not found. Please refresh and try again.`);
    } else {
      this.toast.error(`Error ${operation} credit sale`);
    }
  }
}
