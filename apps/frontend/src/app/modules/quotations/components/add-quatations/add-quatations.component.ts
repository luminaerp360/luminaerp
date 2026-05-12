import {
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Product } from '../../../../shared/interfaces/products';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { ProductService } from '../../../../shared/Services/product.service';
import { QuotationService } from '../../../../shared/Services/quotation.service';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { HotToastService } from '@ngneat/hot-toast';
import { Quotation } from '../../../../shared/interfaces/quotation.interface';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { AddCustomerComponent } from '../../../customers/components/add-customer/add-customer.component';

@Component({
  selector: 'app-add-quatations',
  templateUrl: './add-quatations.component.html',
  styleUrls: ['./add-quatations.component.scss'],
})
export class AddQuatationsComponent implements OnInit, AfterViewInit {
  @ViewChild('productSearch') productSearch!: ElementRef<HTMLInputElement>;

  // Forms
  quotationForm: FormGroup | any;
  customProductForm: FormGroup | any;

  // Data arrays
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];

  // Search queries
  productSearchQuery: string = '';
  customerSearch: string = '';

  // Selected products and calculations
  selectedProducts: Product[] = [];

  // Store original product prices for reference
  originalProductPrices: { [key: number]: number } = {};

  // Discount and VAT properties
  globalDiscountValue: number = 0;
  itemVatSettings: { [key: number]: boolean } = {};

  // Price type settings (retail vs wholesale)
  itemPriceType: { [key: number]: 'retail' | 'wholesale' } = {};
  originalRetailPrices: { [key: number]: number } = {};
  originalWholesalePrices: { [key: number]: number } = {};

  // Component state
  isUpdateMode: boolean = false;
  quotationId: number | null = null;
  showCustomProductForm: boolean = false;
  isSubmitting: boolean = false;
  emailStatus: { sent: boolean; message: string } | null = null;
  currentUser: any;

  // Loading states
  isLoadingCustomers: boolean = false;
  isLoadingProducts: boolean = false;
  isSearchingProducts: boolean = false;

  // Custom product counter for unique IDs
  customProductCounter: number = -1;

  // Dialog for customer creation
  private newCustomerDialog: DialogRemoteControl = new DialogRemoteControl(
    AddCustomerComponent,
  );

  // Updated UX properties for two-section design
  activeSection: 'products' | 'checkout' = 'products';
  cartExpanded: boolean = true;

  // Legacy property for backward compatibility
  activeStep: 'customer' | 'products' | 'review' = 'customer';

  // Customer related properties (matching other components)
  selectedCustomerId: number | null = null;
  customerName: string = '';
  customerEmail: string = '';
  customerPhone: string = '';

  constructor(
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private productService: ProductService,
    private customerService: CustomerService,
    private toast: HotToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.initializeForms();
  }

  private initializeForms() {
    this.quotationForm = this.fb.group({
      customerId: [null, Validators.required],
      totalAmount: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
      sendEmail: [false],
    });

    this.customProductForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: [''],
    });
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadProducts();
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Initialize filtered arrays
    this.filteredCustomers = this.customers;
    this.filteredProducts = this.products;
    const urlParts = this.router.url.split('/');

    if (urlParts.includes('update-quotation')) {
      this.quotationId = +urlParts[urlParts.indexOf('update-quotation') + 1];
      this.isUpdateMode = true;
      this.loadQuotation(this.quotationId);
      this.activeSection = 'checkout'; // Start at checkout for updates
    }
  }

  ngAfterViewInit() {
    this.focusProductSearch();
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
  setActiveStep(step: 'customer' | 'products' | 'review') {
    this.activeStep = step;

    // Map legacy steps to new sections
    if (step === 'customer' || step === 'review') {
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
    return this.selectedCustomer !== null;
  }

  canSubmit(): boolean {
    return (
      this.quotationForm.valid &&
      this.selectedProducts.length > 0 &&
      !this.isSubmitting &&
      this.selectedCustomer !== null
    );
  }

  // ===================== GETTERS =====================

  get shouldSendEmail() {
    return this.quotationForm.get('sendEmail')?.value;
  }

  get selectedCustomer() {
    const customerId = this.quotationForm.get('customerId')?.value;
    return this.customers.find((c) => c.id === customerId);
  }

  // ===================== DATA LOADING =====================

  loadQuotation(id: number) {
    this.quotationService.getQuotationbyId(id).subscribe({
      next: (res: any) => {
        const quotation = res.data;
        this.quotationForm.patchValue({
          customerId: quotation.customerId || quotation.supplierId,
          totalAmount: quotation.totalAmount,
          notes: quotation.notes || '',
          sendEmail: (quotation as any).sendEmail || false,
        });

        // Set customer info
        this.selectedCustomerId = quotation.customerId || quotation.supplierId;
        this.onCustomerSelected();

        // Parse items - handle both single and double JSON encoding
        console.log('Raw quotation items:', quotation.items);
        let items = quotation.items;

        // First parse if it's a string
        if (typeof items === 'string') {
          items = JSON.parse(items);
        }

        // Check if it's still a string (double-encoded), parse again
        if (typeof items === 'string') {
          items = JSON.parse(items);
        }

        console.log('Parsed items:', items);

        this.selectedProducts = items.map((item: any) => ({
          id: item.productId || item.id,
          name: item.name,
          price: item.price,
          selectedItems: item.selectedItems || 1,
          description: item.description || '',
          categoryId: item.categoryId || item.category_id || 0,
          isCustom: item.isCustom || false,
          isService: item.isService || false,
          oneTimeService: item.oneTimeService || false,
          discountValue: item.discountValue || 0,
          discount: item.discount || 0,
          quantity: item.quantity || 999,
          availability: true,
          buyingPrice: item.buyingPrice || 0,
          productIdNumber: item.productIdNumber || '',
          wholesalePrice: item.wholesalePrice || null,
          taxType: item.taxType || (item.hasVat ? 'inclusive' : 'exempt'), // Load tax type
          category: null,
          pax: null,
        }));

        // Set up VAT settings, original prices, and price type settings
        this.selectedProducts.forEach((product) => {
          this.itemVatSettings[product.id] = (product as any).hasVat || false;
          this.originalProductPrices[product.id] = product.price;
          this.originalRetailPrices[product.id] = product.price;

          // Load wholesale price if available
          if (product.wholesalePrice) {
            this.originalWholesalePrices[product.id] = product.wholesalePrice;
          }
          this.itemPriceType[product.id] = 'retail'; // Default to retail
        });

        // Recalculate and update the total amount
        this.updateTotal();

        // Set to checkout section since customer is already selected
        this.activeSection = 'checkout';
      },
      error: (error) => {
        this.toast.error('Error loading quotation');
        console.error('Error:', error);
      },
    });
  }

  loadCustomers(query?: string) {
    this.isLoadingCustomers = true;
    this.customerService.getAllCustomers().subscribe({
      next: (data: Customer[]) => {
        this.customers = data;
        this.filteredCustomers = data;
        this.filterCustomers(query || '');
        this.isLoadingCustomers = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.isLoadingCustomers = false;
      },
    });
  }

  loadProducts(query?: string) {
    this.isLoadingProducts = true;
    this.productService.getAllProducts().subscribe({
      next: (data: Product[]) => {
        this.products = data;
        this.filteredProducts = data;

        // Store original prices
        data.forEach((product) => {
          this.originalProductPrices[product.id] = product.price;
        });

        this.filterProducts(query || '');
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
      },
    });
  }

  // ===================== SEARCH AND FILTERING =====================

  filterCustomers(query: string) {
    if (query.trim() === '') {
      this.filteredCustomers = this.customers;
    } else {
      this.filteredCustomers = this.customers.filter(
        (customer) =>
          customer.fullName.toLowerCase().includes(query.toLowerCase()) ||
          (customer.phoneNumber && customer.phoneNumber.includes(query)) ||
          (customer.email &&
            customer.email.toLowerCase().includes(query.toLowerCase())),
      );
    }
  }

  filterProducts(query: string): void {
    this.isSearchingProducts = true;

    setTimeout(() => {
      if (query.trim() === '') {
        this.filteredProducts = this.products;
      } else {
        this.filteredProducts = this.products.filter(
          (product) =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.productIdNumber
              ?.toLowerCase()
              .includes(query.toLowerCase()),
        );
      }
      this.isSearchingProducts = false;
    }, 300);
  }

  // ===================== CUSTOMER MANAGEMENT =====================

  onCustomerSelected() {
    if (this.selectedCustomerId) {
      const customer = this.customers.find(
        (c) => c.id === this.selectedCustomerId,
      );
      if (customer) {
        this.customerName = customer.fullName || '';
        this.customerEmail = customer.email || '';
        this.customerPhone = customer.phoneNumber || '';

        // Update form
        this.quotationForm.patchValue({
          customerId: this.selectedCustomerId,
        });
      }
    } else {
      this.customerName = '';
      this.customerEmail = '';
      this.customerPhone = '';
      this.quotationForm.patchValue({
        customerId: null,
      });
    }
  }

  openAddCustomerDialog() {
    this.newCustomerDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.newCustomerDialog.openDialog().subscribe((resp) => {
      this.loadCustomers();
    });
  }

  // ===================== PRODUCT SELECTION AND CART MANAGEMENT =====================

  onProductClick(product: Product): void {
    // Store original prices (both retail and wholesale)
    this.originalProductPrices[product.id] = product.price;
    this.originalRetailPrices[product.id] = product.price;
    this.originalWholesalePrices[product.id] =
      product.wholesalePrice || product.price;

    // Set default price type to retail
    this.itemPriceType[product.id] = 'retail';

    const existingProduct = this.selectedProducts.find(
      (p) => p.id === product.id,
    );

    if (existingProduct) {
      existingProduct.selectedItems = (existingProduct.selectedItems || 1) + 1;
      this.toast.success(
        `${product.name} quantity increased to ${existingProduct.selectedItems}`,
      );
    } else {
      const newProduct = {
        ...product,
        selectedItems: 1,
        discountValue: 0,
        discount: product.discount || 0,
      };
      this.selectedProducts.push(newProduct);
      this.itemVatSettings[product.id] = false;
      this.toast.success(`${product.name} added to cart`);
    }

    // Auto-expand cart when items are added
    this.cartExpanded = true;
    this.updateTotal();
  }

  onProductAdded(product: Product): void {
    // Product is already added via two-way binding in product-selector
    // This method is just for logging or additional side effects
    console.log('Product added:', product);
  }

  addCustomProduct() {
    if (this.customProductForm.invalid) {
      this.toast.error('Please fill in all required fields correctly');
      return;
    }

    const formValue = this.customProductForm.value;

    const customProduct: Product = {
      id: this.customProductCounter--,
      name: formValue.name,
      price: formValue.price,
      description: formValue.description,
      selectedItems: formValue.quantity,
      isService: true,
      isOneTime: true,
      oneTimeService: true,
      quantity: 999,
      discountValue: 0,
      productIdNumber: `CUSTOM-${Date.now()}`,
      availability: true,
      categoryId: 0,
      buyingPrice: 0,
      category: null,
      pax: null,
      discount: 0,
    };

    this.originalProductPrices[customProduct.id] = customProduct.price;
    this.selectedProducts.push(customProduct);
    this.itemVatSettings[customProduct.id] = false;

    this.toast.success('Custom product added successfully');
    this.customProductForm.reset({
      name: '',
      price: 0,
      quantity: 1,
      description: '',
    });
    this.showCustomProductForm = false;
    this.cartExpanded = true;
    this.updateTotal();
  }

  // ===================== QUANTITY AND PRICE MANAGEMENT =====================

  addQuantity(product: Product) {
    product.selectedItems = (product.selectedItems || 1) + 1;
    this.updateTotal();
  }

  reduceQuantity(product: Product) {
    if ((product.selectedItems || 1) > 1) {
      product.selectedItems = (product.selectedItems || 1) - 1;
      this.updateTotal();
    }
  }

  updateQuantity(product: Product, newQuantity: number) {
    if (newQuantity < 1) {
      this.toast.error('Quantity must be at least 1');
      return;
    }
    product.selectedItems = newQuantity;
    this.updateTotal();
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
        'Discount has been reset as it was greater than the new total price',
      );
    }

    this.updateTotal();
  }

  resetProductPrice(product: Product) {
    const originalPrice = this.originalProductPrices[product.id];
    if (originalPrice !== undefined) {
      product.price = originalPrice;
      this.toast.info(`Price reset to original: ${originalPrice}`);
      this.updateTotal();
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
    this.updateTotal();
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
    this.updateTotal();
  }

  toggleVat(productId: number) {
    this.itemVatSettings[productId] = !this.itemVatSettings[productId];
    this.updateTotal();
  }

  // ===================== CALCULATION METHODS =====================

  calculateItemTotal(product: Product): number {
    let basePrice = product.price * (product.selectedItems || 1);

    // Apply percentage discount
    if (product.discount && product.discount > 0) {
      basePrice = basePrice - (basePrice * product.discount) / 100;
    }

    // Apply value discount
    if (product.discountValue) {
      basePrice = basePrice - product.discountValue;
    }

    // Apply global discount proportionally
    const afterDiscount =
      basePrice -
      (this.selectedProducts.length > 0
        ? this.globalDiscountValue / this.selectedProducts.length
        : 0);

    // Get tax type - use taxType from product or fall back to hasVat setting
    const taxType =
      product.taxType ||
      (this.itemVatSettings[product.id] ? 'inclusive' : 'exempt');

    // Apply tax based on type
    if (taxType === 'exclusive') {
      // For exclusive tax, add tax on top
      const taxAmount = Math.max(0, afterDiscount) * 0.16;
      return Math.max(0, afterDiscount) + taxAmount;
    } else if (taxType === 'inclusive') {
      // For inclusive tax, tax is already in the price
      return Math.max(0, afterDiscount);
    }

    // For exempt, no tax
    return Math.max(0, afterDiscount);
  }

  calculateSubtotal(): number {
    return this.selectedProducts.reduce(
      (total, product) => total + this.calculateItemTotal(product),
      0,
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
      0,
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

      // Apply percentage discount
      let basePrice = qty * price;
      if (product.discount && product.discount > 0) {
        basePrice = basePrice - (basePrice * product.discount) / 100;
      }

      // Apply value discount
      const discount = product.discountValue || 0;
      const afterDiscount = basePrice - discount;

      // Apply global discount proportionally
      const globalDiscountShare =
        this.selectedProducts.length > 0
          ? this.globalDiscountValue / this.selectedProducts.length
          : 0;
      const afterAllDiscounts = afterDiscount - globalDiscountShare;

      const VAT_RATE = 0.16; // 16%

      if (taxType === 'inclusive') {
        // Tax is already included in price
        // Tax = Price / 1.16 * 0.16
        return total + (afterAllDiscounts - afterAllDiscounts / 1.16);
      } else if (taxType === 'exclusive') {
        // Exclusive - tax is added on top
        return total + afterAllDiscounts * VAT_RATE;
      }

      return total;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal();
  }

  updateTotal() {
    const total = this.calculateTotal();
    this.quotationForm.patchValue({ totalAmount: total });
  }

  // ===================== EMAIL MANAGEMENT =====================

  canSendEmail(): boolean {
    const customer = this.selectedCustomer;
    return !!(customer && customer.email && customer.email.trim() !== '');
  }

  getEmailWarning(): string {
    if (!this.selectedCustomer) {
      return 'Please select a customer first';
    }
    if (!this.canSendEmail()) {
      return 'Selected customer has no email address';
    }
    return '';
  }

  // ===================== FORM MANAGEMENT =====================

  toggleCustomProductForm() {
    this.showCustomProductForm = !this.showCustomProductForm;
    if (!this.showCustomProductForm) {
      this.customProductForm.reset({
        name: '',
        price: 0,
        quantity: 1,
        description: '',
      });
    }
  }

  removeSelectedProduct(index: number) {
    if (index >= 0 && index < this.selectedProducts.length) {
      const product = this.selectedProducts[index];
      delete this.itemVatSettings[product.id];
      delete this.originalProductPrices[product.id];
      delete this.originalRetailPrices[product.id];
      delete this.originalWholesalePrices[product.id];
      delete this.itemPriceType[product.id];
      this.selectedProducts.splice(index, 1);
      this.toast.success('Product removed from cart');
      this.updateTotal();

      // If cart becomes empty, switch to products section
      if (this.selectedProducts.length === 0) {
        this.activeSection = 'products';
      }
    }
  }

  validateQuotation(): boolean {
    if (!this.selectedCustomer) {
      this.toast.error('Please select a customer');
      this.setActiveSection('checkout');
      return false;
    }

    if (this.selectedProducts.length === 0) {
      this.toast.error('Please add at least one item');
      this.setActiveSection('products');
      return false;
    }

    if (this.quotationForm.invalid) {
      this.toast.error('Please complete all required fields');
      return false;
    }

    if (this.shouldSendEmail && !this.canSendEmail()) {
      this.toast.error('Cannot send email - customer has no email address');
      return false;
    }

    return true;
  }

  onSubmit() {
    if (!this.validateQuotation()) {
      return;
    }

    // Ensure total is up to date before submission
    this.updateTotal();

    this.isSubmitting = true;
    this.emailStatus = null;

    // Convert selectedProducts to the format expected by the backend
    const itemsToSend = this.selectedProducts.map((product) => ({
      productId: product.id,
      selectedItems: product.selectedItems || 1,
      name: product.name,
      categoryId: product.categoryId || 0,
      price: product.price,
      isCustom: product.isOneTime || false,
      description: product.description || '',
      discount: product.discount || 0,
      discountValue: product.discountValue || 0,
      hasVat: this.itemVatSettings[product.id] || false,
      taxType:
        product.taxType ||
        (this.itemVatSettings[product.id] ? 'inclusive' : 'exempt'), // Include tax type
    }));

    const quotationData = {
      ...this.quotationForm.value,
      items: JSON.stringify(itemsToSend),
      globalDiscount: this.globalDiscountValue,
      totalTax: this.calculateTotalVat(),
      totalDiscount: this.calculateTotalDiscount(),
    };

    const action = this.isUpdateMode
      ? this.quotationService.updateQuotation(this.quotationId!, quotationData)
      : this.quotationService.addQuotation(quotationData);

    action.subscribe({
      next: (response: any) => {
        this.isSubmitting = false;

        // Handle email status from response
        if (response.emailSent) {
          this.emailStatus = {
            sent: true,
            message: 'Quotation email sent successfully to customer',
          };
        } else if (quotationData.sendEmail) {
          this.emailStatus = {
            sent: false,
            message: 'Quotation saved but email sending is in progress',
          };
        }

        const message = this.isUpdateMode
          ? 'Quotation updated successfully'
          : 'Quotation created successfully';

        this.toast.success(message);

        // Navigate after a short delay to show email status
        setTimeout(
          () => {
            this.routeToQuotations();
          },
          quotationData.sendEmail ? 2000 : 1000,
        );
      },
      error: (error) => {
        this.isSubmitting = false;
        this.emailStatus = {
          sent: false,
          message: 'Failed to send email, but quotation was saved',
        };
        this.toast.error(
          `Error ${this.isUpdateMode ? 'updating' : 'creating'} quotation`,
        );
        console.error('Quotation error:', error);
      },
    });
  }

  // Product management methods for SelectedProductsComponent
  removeProduct(productId: number) {
    this.selectedProducts = this.selectedProducts.filter(
      (p) => p.id !== productId,
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
    taxType: 'exempt' | 'inclusive' | 'exclusive',
  ) {
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      product.taxType = taxType;
    }
  }

  // ===================== NAVIGATION =====================

  routeToQuotations() {
    this.router.navigate(['/quotations']);
  }

  resetForm() {
    this.quotationForm.reset({
      customerId: null,
      totalAmount: 0,
      notes: '',
      sendEmail: false,
    });

    this.selectedProducts = [];
    this.itemVatSettings = {};
    this.originalProductPrices = {};
    this.originalRetailPrices = {};
    this.originalWholesalePrices = {};
    this.itemPriceType = {};
    this.globalDiscountValue = 0;
    this.selectedCustomerId = null;
    this.customerName = '';
    this.customerEmail = '';
    this.customerPhone = '';

    this.customProductForm.reset({
      name: '',
      price: 0,
      quantity: 1,
      description: '',
    });

    this.showCustomProductForm = false;
    this.activeSection = 'products';
    this.cartExpanded = true;
    this.emailStatus = null;
    this.productSearchQuery = '';
    this.customerSearch = '';
    this.loadProducts();
  }

  // ===================== UTILITY METHODS =====================

  // Track by functions for performance
  trackByCustomerId(index: number, customer: Customer): any {
    return customer.id;
  }

  trackByProductId(index: number, product: Product): any {
    return product.id;
  }

  trackBySelectedProductId(index: number, product: Product): any {
    return product.id;
  }

  // Format currency for display
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Get total items count
  getTotalItemsCount(): number {
    return this.selectedProducts.reduce((total, product) => {
      return total + (product.selectedItems || 0);
    }, 0);
  }

  // Get validation message for customer step
  getCustomerStepValidation(): string {
    if (!this.selectedCustomer) {
      return 'Please select a customer to proceed';
    }
    return '';
  }

  // Get validation message for products step
  getProductsStepValidation(): string {
    if (this.selectedProducts.length === 0) {
      return 'Please add at least one item to proceed';
    }
    return '';
  }

  // Enhanced error handling
  private handleError(error: any, operation: string) {
    console.error(`${operation} error:`, error);

    if (error.status === 400) {
      this.toast.error(`Invalid quotation data. Please check all fields.`);
    } else if (error.status === 403) {
      this.toast.error(`Access denied. Please check your permissions.`);
    } else if (error.status === 404) {
      this.toast.error(`Resource not found. Please refresh and try again.`);
    } else {
      this.toast.error(`Error ${operation}`);
    }
  }

  // Wholesale price methods
  togglePriceType(productId: number): void {
    const currentType = this.itemPriceType[productId];
    const newType = currentType === 'retail' ? 'wholesale' : 'retail';

    this.itemPriceType[productId] = newType;

    // Find the product in selectedProducts and update its price
    const product = this.selectedProducts.find((p) => p.id === productId);
    if (product) {
      if (newType === 'wholesale' && this.originalWholesalePrices[productId]) {
        product.price = this.originalWholesalePrices[productId];
        this.toast.success('Wholesale price applied');
      } else {
        product.price = this.originalRetailPrices[productId];
        this.toast.success('Retail price applied');
      }
      this.updateTotal();
    }
  }

  getPriceType(productId: number): string {
    return this.itemPriceType[productId] || 'retail';
  }

  hasWholesalePrice(productId: number): boolean {
    return !!(
      this.originalWholesalePrices[productId] &&
      this.originalWholesalePrices[productId] !==
        this.originalRetailPrices[productId]
    );
  }
}
