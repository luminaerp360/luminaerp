import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Product } from '../../interfaces/products';
import { ProductService } from '../../Services/product.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-product-selector',
  templateUrl: './product-selector.component.html',
  styleUrls: ['./product-selector.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class ProductSelectorComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('barcodeInput') barcodeInputElement!: ElementRef<HTMLInputElement>;

  // Inputs - Configuration
  @Input() themeColor: 'blue' | 'purple' | 'orange' | 'green' = 'blue';
  @Input() cartTitle: string = 'Shopping Cart';
  @Input() checkoutButtonText: string = 'Continue to Checkout';
  @Input() showCheckoutButton: boolean = true;
  @Input() enableBarcodeScanner: boolean = true;
  @Input() enableCustomProducts: boolean = true;
  @Input() enableDiscounts: boolean = true;
  @Input() enableVAT: boolean = true;
  @Input() showFilters: boolean = true;
  @Input() gridColumns: number = 3; // Kept for compatibility with other components
  @Input() autoFocusSearch: boolean = true;

  // Inputs - Data
  @Input() products: Product[] = [];
  @Input() selectedProducts: Product[] = [];

  // Outputs - Events
  @Output() productsChange = new EventEmitter<Product[]>();
  @Output() selectedProductsChange = new EventEmitter<Product[]>();
  @Output() productAdded = new EventEmitter<Product>();
  @Output() productRemoved = new EventEmitter<{
    product: Product;
    index: number;
  }>();
  @Output() checkoutClicked = new EventEmitter<void>();
  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() vatSettingsChange = new EventEmitter<{ [key: number]: boolean }>();

  // Component State
  searchQuery: string = '';
  barcodeValue: string = '';
  filteredProducts: Product[] = [];
  isLoading: boolean = true;
  isSearching: boolean = false;
  isScanning: boolean = false;
  isProductAdding: { [key: number]: boolean } = {};
  activeFilter: 'all' | 'products' | 'services' | 'lowStock' = 'all';
  cartExpanded: boolean = true;
  showCustomProductForm: boolean = false;
  isScanMode: boolean = false;

  // Cart State
  itemVatSettings: { [key: number]: boolean } = {};
  itemPriceTypes: { [key: number]: 'retail' | 'wholesale' } = {};
  originalRetailPrices: { [key: number]: number } = {};
  originalWholesalePrices: { [key: number]: number } = {};
  globalDiscount: number = 0;

  // Forms
  customProductForm: FormGroup;

  // Custom product counter for unique IDs
  private customProductCounter: number = -1;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toast: HotToastService,
  ) {
    this.customProductForm = this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  ngAfterViewInit(): void {
    if (this.autoFocusSearch) {
      this.focusSearch();
    }
  }

  // ==================== Data Loading ====================

  loadProducts(): void {
    // If products are provided as input, use them
    if (this.products && this.products.length > 0) {
      this.filteredProducts = [...this.products];
      this.isLoading = false;
      this.initializeProductPrices();
      return;
    }

    // Otherwise, load from service
    this.isLoading = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.isLoading = false;
        this.initializeProductPrices();
        this.productsChange.emit(this.products);
      },
      error: (error) => {
        this.isLoading = false;
        this.toast.error('Failed to load products');
        console.error('Error loading products:', error);
      },
    });
  }

  private initializeProductPrices(): void {
    this.products.forEach((product) => {
      this.originalRetailPrices[product.id] = product.price;
      this.originalWholesalePrices[product.id] =
        product.wholesalePrice || product.price;
      this.itemPriceTypes[product.id] = 'retail';
    });
  }

  // ==================== Search & Filter ====================

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.isSearching = true;

    // Debounce search
    setTimeout(() => {
      this.applyFilters();
      this.isSearching = false;
    }, 300);
  }

  filterByType(type: 'all' | 'products' | 'services' | 'lowStock'): void {
    this.activeFilter = type;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.products];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.productIdNumber?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query),
      );
    }

    // Apply type filter
    switch (this.activeFilter) {
      case 'products':
        filtered = filtered.filter((p) => !p.isService);
        break;
      case 'services':
        filtered = filtered.filter((p) => p.isService);
        break;
      case 'lowStock':
        filtered = filtered.filter(
          (p) => !p.isService && (p.quantity ?? 0) < 5,
        );
        break;
    }

    this.filteredProducts = filtered;
  }

  // ==================== Barcode Scanner ====================

  onBarcodeScanned(): void {
    if (!this.barcodeValue.trim()) {
      return;
    }

    this.isScanning = true;
    this.barcodeScanned.emit(this.barcodeValue);

    this.productService.searchProductByBarcode(this.barcodeValue).subscribe({
      next: (product: Product) => {
        if (product) {
          this.addProductToCart(product);
          this.toast.success(`${product.name} added to cart`);
          this.clearBarcode();
        } else {
          this.toast.error('Product not found');
        }
        this.isScanning = false;
      },
      error: (error) => {
        this.toast.error('Error scanning barcode');
        console.error('Barcode scan error:', error);
        this.isScanning = false;
      },
    });
  }

  private clearBarcode(): void {
    this.barcodeValue = '';
    if (this.barcodeInputElement?.nativeElement) {
      this.barcodeInputElement.nativeElement.value = '';
      this.barcodeInputElement.nativeElement.focus();
    }
  }

  // ==================== Unified Input ====================

  toggleScanMode(): void {
    this.isScanMode = !this.isScanMode;
    this.barcodeValue = '';
    if (!this.isScanMode) {
      this.searchQuery = '';
      this.onSearchChange('');
    }
  }

  onUnifiedInput(value: string): void {
    if (this.isScanMode) {
      this.barcodeValue = value;
    } else {
      this.onSearchChange(value);
    }
  }

  clearInput(): void {
    if (this.isScanMode) {
      this.barcodeValue = '';
    } else {
      this.searchQuery = '';
      this.onSearchChange('');
    }
  }

  // ==================== Product Selection ====================

  onProductSelect(product: Product): void {
    if (this.isProductAdding[product.id]) {
      return;
    }

    this.isProductAdding[product.id] = true;

    setTimeout(() => {
      this.addProductToCart(product);
      this.isProductAdding[product.id] = false;
    }, 300);
  }

  private addProductToCart(product: Product): void {
    // Check if product already exists in cart
    const existingProduct = this.selectedProducts.find(
      (p) => p.id === product.id,
    );

    if (existingProduct) {
      // Increase quantity
      this.increaseQuantity(existingProduct);
      return;
    }

    // Check stock for non-service products
    if (!product.isService && !product.oneTimeService) {
      if ((product.quantity ?? 0) < 1) {
        this.toast.warning(
          `${product.name} is out of stock. Please add as a custom product.`,
        );
        return;
      }
    }

    // Initialize product settings
    const newProduct: Product = {
      ...product,
      selectedItems: 1,
      discountValue: 0,
    };

    // Store original prices
    this.originalRetailPrices[product.id] = product.price;
    this.originalWholesalePrices[product.id] =
      product.wholesalePrice || product.price;
    this.itemPriceTypes[product.id] = 'retail';
    this.itemVatSettings[product.id] = false;

    this.selectedProducts.push(newProduct);
    this.selectedProductsChange.emit(this.selectedProducts);
    this.productAdded.emit(newProduct);
    this.toast.success(`${product.name} added to cart`);
  }

  removeProduct(index: number): void {
    if (index >= 0 && index < this.selectedProducts.length) {
      const product = this.selectedProducts[index];

      // Clean up settings
      delete this.itemVatSettings[product.id];
      delete this.itemPriceTypes[product.id];
      delete this.originalRetailPrices[product.id];
      delete this.originalWholesalePrices[product.id];

      this.selectedProducts.splice(index, 1);
      this.selectedProductsChange.emit(this.selectedProducts);
      this.productRemoved.emit({ product, index });
      this.toast.success('Product removed from cart');
    }
  }

  // ==================== Custom Product ====================

  toggleCustomProductForm(): void {
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

  addCustomProduct(): void {
    if (this.customProductForm.invalid) {
      this.toast.error('Please fill in all required fields');
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

    // Initialize settings
    this.originalRetailPrices[customProduct.id] = customProduct.price;
    this.originalWholesalePrices[customProduct.id] = customProduct.price;
    this.itemPriceTypes[customProduct.id] = 'retail';
    this.itemVatSettings[customProduct.id] = false;

    this.selectedProducts.push(customProduct);
    this.selectedProductsChange.emit(this.selectedProducts);
    this.productAdded.emit(customProduct);

    this.toast.success('Custom product added to cart');
    this.customProductForm.reset({
      name: '',
      price: 0,
      quantity: 1,
      description: '',
    });
    this.showCustomProductForm = false;
  }

  // ==================== Cart Management ====================

  updatePrice(product: Product, newPrice: number): void {
    if (newPrice < 0) {
      this.toast.error('Price cannot be negative');
      product.price = this.originalRetailPrices[product.id] || 0;
      return;
    }

    product.price = newPrice;

    // Check if discount is still valid
    if (
      product.discountValue &&
      product.discountValue > newPrice * (product.selectedItems || 1)
    ) {
      product.discountValue = 0;
      this.toast.warning('Discount reset due to price change');
    }

    this.selectedProductsChange.emit(this.selectedProducts);
  }

  resetPrice(product: Product): void {
    const priceType = this.itemPriceTypes[product.id] || 'retail';
    const originalPrice =
      priceType === 'retail'
        ? this.originalRetailPrices[product.id]
        : this.originalWholesalePrices[product.id];

    if (originalPrice !== undefined) {
      product.price = originalPrice;
      this.selectedProductsChange.emit(this.selectedProducts);
      this.toast.info(`Price reset to KSh ${originalPrice}`);
    }
  }

  updateQuantity(product: Product, newQuantity: number): void {
    if (newQuantity < 1) {
      this.toast.error('Quantity must be at least 1');
      return;
    }

    // Check stock for non-service products
    if (!product.isService && !product.oneTimeService) {
      if (newQuantity > (product.quantity ?? 0)) {
        this.toast.error(`Insufficient stock. Available: ${product.quantity}`);
        return;
      }
    }

    product.selectedItems = newQuantity;
    this.selectedProductsChange.emit(this.selectedProducts);
  }

  increaseQuantity(product: Product): void {
    this.updateQuantity(product, (product.selectedItems || 1) + 1);
  }

  decreaseQuantity(product: Product): void {
    if ((product.selectedItems || 1) > 1) {
      this.updateQuantity(product, (product.selectedItems || 1) - 1);
    }
  }

  updateDiscount(product: Product, discountValue: number): void {
    if (discountValue < 0) {
      this.toast.error('Discount cannot be negative');
      product.discountValue = 0;
      return;
    }

    const basePrice = product.price * (product.selectedItems || 1);
    if (discountValue > basePrice) {
      this.toast.error('Discount cannot exceed item total');
      product.discountValue = 0;
      return;
    }

    product.discountValue = discountValue;
    this.selectedProductsChange.emit(this.selectedProducts);
  }

  updateGlobalDiscount(discountValue: number): void {
    if (discountValue < 0) {
      this.toast.error('Discount cannot be negative');
      this.globalDiscount = 0;
      return;
    }

    const subtotal = this.calculateSubtotal();
    if (discountValue > subtotal) {
      this.toast.error('Discount cannot exceed subtotal');
      this.globalDiscount = 0;
      return;
    }

    this.globalDiscount = discountValue;
    this.selectedProductsChange.emit(this.selectedProducts);
  }

  toggleVAT(productId: number): void {
    this.itemVatSettings[productId] = !this.itemVatSettings[productId];
    this.selectedProductsChange.emit(this.selectedProducts);
    this.vatSettingsChange.emit(this.itemVatSettings);
  }

  // ==================== Price Type Management ====================

  togglePriceType(product: Product, type: 'retail' | 'wholesale'): void {
    if (type === 'wholesale' && !this.hasWholesalePrice(product)) {
      this.toast.warning('This product does not have a wholesale price');
      return;
    }

    this.itemPriceTypes[product.id] = type;

    // Update product price
    if (type === 'wholesale') {
      product.price = this.originalWholesalePrices[product.id];
      this.toast.success(`Switched to wholesale price`);
    } else {
      product.price = this.originalRetailPrices[product.id];
      this.toast.success(`Switched to retail price`);
    }

    this.selectedProductsChange.emit(this.selectedProducts);
  }

  getPriceType(productId: number): 'retail' | 'wholesale' {
    return this.itemPriceTypes[productId] || 'retail';
  }

  hasWholesalePrice(product: Product): boolean {
    return !!(
      product.wholesalePrice &&
      product.wholesalePrice > 0 &&
      product.wholesalePrice !== product.price
    );
  }

  // ==================== Calculations ====================

  calculateItemTotal(product: Product): number {
    const basePrice = product.price * (product.selectedItems || 1);
    const afterDiscount = basePrice - (product.discountValue || 0);

    // Apply proportional global discount
    const globalDiscountShare =
      this.selectedProducts.length > 0
        ? this.globalDiscount / this.selectedProducts.length
        : 0;

    const afterGlobalDiscount = afterDiscount - globalDiscountShare;

    // Apply VAT if enabled
    if (this.itemVatSettings[product.id]) {
      return Math.max(0, afterGlobalDiscount) * 1.16;
    }

    return Math.max(0, afterGlobalDiscount);
  }

  calculateSubtotal(): number {
    return this.selectedProducts.reduce(
      (total, product) => total + this.calculateItemTotal(product),
      0,
    );
  }

  calculateTotalDiscount(): number {
    const itemDiscounts = this.selectedProducts.reduce(
      (total, product) => total + (product.discountValue || 0),
      0,
    );
    return itemDiscounts + this.globalDiscount;
  }

  calculateTotalVAT(): number {
    return this.selectedProducts.reduce((total, product) => {
      if (this.itemVatSettings[product.id]) {
        const basePrice = this.calculateItemTotal(product) / 1.16;
        return total + basePrice * 0.16;
      }
      return total;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal();
  }

  // ==================== UI Helpers ====================

  toggleCartExpanded(): void {
    this.cartExpanded = !this.cartExpanded;
  }

  focusSearch(): void {
    setTimeout(() => {
      if (this.searchInput?.nativeElement) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  onCheckout(): void {
    if (this.selectedProducts.length === 0) {
      this.toast.error('Please add products to cart');
      return;
    }
    this.checkoutClicked.emit();
  }

  // ==================== Track By Functions ====================

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }

  // ==================== Public API Methods ====================

  /**
   * Get current cart data
   */
  getCartData() {
    return {
      products: this.selectedProducts,
      subtotal: this.calculateSubtotal(),
      totalDiscount: this.calculateTotalDiscount(),
      totalVAT: this.calculateTotalVAT(),
      total: this.calculateTotal(),
      globalDiscount: this.globalDiscount,
      itemVatSettings: this.itemVatSettings,
      itemPriceTypes: this.itemPriceTypes,
    };
  }

  /**
   * Clear the entire cart
   */
  clearCart(): void {
    this.selectedProducts = [];
    this.itemVatSettings = {};
    this.itemPriceTypes = {};
    this.originalRetailPrices = {};
    this.originalWholesalePrices = {};
    this.globalDiscount = 0;
    this.selectedProductsChange.emit(this.selectedProducts);
    this.toast.success('Cart cleared');
  }

  /**
   * Load cart from saved data
   */
  loadCart(cartData: any): void {
    if (cartData.products) {
      this.selectedProducts = cartData.products;
    }
    if (cartData.globalDiscount !== undefined) {
      this.globalDiscount = cartData.globalDiscount;
    }
    if (cartData.itemVatSettings) {
      this.itemVatSettings = cartData.itemVatSettings;
    }
    if (cartData.itemPriceTypes) {
      this.itemPriceTypes = cartData.itemPriceTypes;
    }
    this.selectedProductsChange.emit(this.selectedProducts);
  }
}
