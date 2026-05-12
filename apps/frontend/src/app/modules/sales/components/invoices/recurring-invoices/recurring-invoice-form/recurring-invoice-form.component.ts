import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { RecurringInvoiceService } from '../../../../../../shared/Services/recurring-invoice.service';
import { CustomerService } from '../../../../../../shared/Services/customer.service';
import { ProductService } from '../../../../../../shared/Services/product.service';
import { AuthService } from '../../../../../../shared/Services/auth.service';
import {
  RecurringInvoiceTemplate,
  RecurringInvoiceItem,
  RecurrenceFrequency,
  RecurringStatus,
  FrequencyLabels,
  DayOfWeekLabels,
} from '../../../../../../shared/interfaces/recurring-invoice.interface';

@Component({
  selector: 'app-recurring-invoice-form',
  templateUrl: './recurring-invoice-form.component.html',
  styleUrls: ['./recurring-invoice-form.component.scss'],
})
export class RecurringInvoiceFormComponent implements OnInit {
  templateId?: number;
  isEditMode = false;
  isLoading = false;
  isSaving = false;

  // Enums for template
  RecurrenceFrequency = RecurrenceFrequency;
  FrequencyLabels = FrequencyLabels;
  DayOfWeekLabels = DayOfWeekLabels;

  // Form data
  template: Partial<RecurringInvoiceTemplate> = {
    templateName: '',
    frequency: RecurrenceFrequency.MONTHLY,
    intervalCount: 1,
    startDate: new Date(),
    items: [],
    status: RecurringStatus.ACTIVE,
  };

  // Customers and products
  customers: any[] = [];
  products: any[] = [];
  filteredProducts: any[] = [];
  productSearchQuery = '';

  // Item management
  selectedProduct: any = null;
  itemQuantity = 1;
  itemPrice = 0;
  itemDiscount = 0;

  // Sales person tracking
  organizationUsers: any[] = [];
  selectedSalesPersonId: number | null = null;
  isLoadingUsers: boolean = false;

  // UI state
  showProductSelector = false;
  currentUser: any;

  constructor(
    private recurringService: RecurringInvoiceService,
    private customerService: CustomerService,
    private productService: ProductService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.loadCustomers();
    this.loadProducts();
    this.loadOrganizationUsers();

    // Check if editing
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.templateId = parseInt(id, 10);
      this.isEditMode = true;
      this.loadTemplate();
    } else {
      // Set default next invoice date to today
      this.template.nextInvoiceDate = new Date();
    }
  }

  /**
   * Load customers
   */
  loadCustomers(): void {
    this.customerService.getAllCustomers().subscribe({
      next: (customers: any) => {
        this.customers = customers || [];
      },
      error: (error: any) => {
        console.error('Failed to load customers:', error);
        this.toast.error('Failed to load customers');
      },
    });
  }

  /**
   * Load products
   */
  loadProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (products: any) => {
        this.products = products || [];
        this.filteredProducts = [...this.products];
      },
      error: (error: any) => {
        console.error('Failed to load products:', error);
        this.toast.error('Failed to load products');
      },
    });
  }

  /**
   * Load organization users for sales person selection
   */
  loadOrganizationUsers(): void {
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

  /**
   * Load template for editing
   */
  loadTemplate(): void {
    if (!this.templateId) return;

    this.isLoading = true;
    this.recurringService.getTemplateById(this.templateId).subscribe({
      next: (template: any) => {
        this.template = {
          ...template,
          startDate: new Date(template.startDate),
          endDate: template.endDate ? new Date(template.endDate) : undefined,
          nextInvoiceDate: new Date(template.nextInvoiceDate),
        };
        // Set sales person if exists
        if (template.salesPersonId) {
          this.selectedSalesPersonId = template.salesPersonId;
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load template:', error);
        this.toast.error('Failed to load template');
        this.isLoading = false;
        this.router.navigate(['/recurring-invoices']);
      },
    });
  }

  /**
   * Search products
   */
  searchProducts(): void {
    const query = this.productSearchQuery.toLowerCase();
    if (!query) {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(
        (product) =>
          product.name?.toLowerCase().includes(query) ||
          product.productIdNumber?.toLowerCase().includes(query),
      );
    }
  }

  /**
   * Select product
   */
  selectProduct(product: any): void {
    this.selectedProduct = product;
    this.itemPrice = product.price || 0;
    this.itemQuantity = 1;
    this.itemDiscount = 0;
  }

  /**
   * Add item to template
   */
  addItem(): void {
    if (!this.selectedProduct) {
      this.toast.error('Please select a product');
      return;
    }

    if (this.itemQuantity <= 0) {
      this.toast.error('Quantity must be greater than 0');
      return;
    }

    console.log('Selected Product:', this.selectedProduct);

    const item: RecurringInvoiceItem = {
      productId: this.selectedProduct.id,
      productName:
        this.selectedProduct.productName || this.selectedProduct.name || '',
      quantity: this.itemQuantity,
      unitPrice: this.itemPrice,
      discountAmount: this.itemDiscount,
      taxRate: this.selectedProduct.tax || 0,
    };

    console.log('Created Item:', item);

    if (!this.template.items) {
      this.template.items = [];
    }

    this.template.items.push(item);
    this.calculateTotals();

    // Reset selection
    this.selectedProduct = null;
    this.itemQuantity = 1;
    this.itemPrice = 0;
    this.itemDiscount = 0;
    this.productSearchQuery = '';
    this.filteredProducts = [...this.products];
    this.showProductSelector = false;
  }

  /**
   * Remove item from template
   */
  removeItem(index: number): void {
    if (this.template.items) {
      this.template.items.splice(index, 1);
      this.calculateTotals();
    }
  }

  /**
   * Calculate line total for an item
   */
  calculateLineTotal(item: RecurringInvoiceItem): number {
    const subtotal = item.quantity * item.unitPrice;
    const afterDiscount = subtotal - (item.discountAmount || 0);
    const taxAmount = afterDiscount * ((item.taxRate || 0) / 100);
    return afterDiscount + taxAmount;
  }

  /**
   * Calculate template totals
   */
  calculateTotals(): void {
    if (!this.template.items || this.template.items.length === 0) {
      (this.template as any).subtotal = 0;
      (this.template as any).totalDiscount = 0;
      (this.template as any).totalTax = 0;
      (this.template as any).totalAmount = 0;
      return;
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    this.template.items.forEach((item: any) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      totalDiscount += item.discountAmount || 0;

      const afterDiscount = itemSubtotal - (item.discountAmount || 0);
      totalTax += afterDiscount * ((item.taxRate || 0) / 100);
    });

    (this.template as any).subtotal = subtotal;
    (this.template as any).totalDiscount = totalDiscount;
    (this.template as any).totalTax = totalTax;
    (this.template as any).totalAmount = subtotal - totalDiscount + totalTax;
  }

  /**
   * Get days in month based on frequency
   */
  getDaysInMonth(): number[] {
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }

  /**
   * Get week numbers
   */
  getWeekNumbers(): number[] {
    return [1, 2, 3, 4];
  }

  /**
   * Validate form
   */
  validateForm(): boolean {
    if (!this.template.templateName?.trim()) {
      this.toast.error('Template name is required');
      return false;
    }

    if (!this.template.customerId) {
      this.toast.error('Please select a customer');
      return false;
    }

    if (!this.template.frequency) {
      this.toast.error('Please select frequency');
      return false;
    }

    if (!this.template.items || this.template.items.length === 0) {
      this.toast.error('Please add at least one item');
      return false;
    }

    if (!this.template.startDate) {
      this.toast.error('Start date is required');
      return false;
    }

    if (!this.template.nextInvoiceDate) {
      this.toast.error('Next invoice date is required');
      return false;
    }

    // Validate frequency-specific fields
    if (
      this.template.frequency === RecurrenceFrequency.WEEKLY &&
      !this.template.dayOfWeek
    ) {
      this.toast.error('Please select a day of week for weekly recurrence');
      return false;
    }

    if (
      this.template.frequency === RecurrenceFrequency.MONTHLY &&
      !this.template.dayOfMonth
    ) {
      this.toast.error('Please select a day of month for monthly recurrence');
      return false;
    }

    return true;
  }

  /**
   * Save template
   */
  saveTemplate(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSaving = true;

    const templateData: any = {
      ...this.template,
      intervalCount: this.template.intervalCount || 1,
      createdBy: this.currentUser?.username || 'System User',
      salesPersonId: this.selectedSalesPersonId || undefined,
      startDate:
        this.template.startDate instanceof Date
          ? this.template.startDate.toISOString()
          : this.template.startDate,
      endDate: this.template.endDate
        ? this.template.endDate instanceof Date
          ? this.template.endDate.toISOString()
          : this.template.endDate
        : undefined,
      nextInvoiceDate:
        this.template.nextInvoiceDate instanceof Date
          ? this.template.nextInvoiceDate.toISOString()
          : this.template.nextInvoiceDate,
    };

    console.log('Template Data Before Send:', templateData);
    console.log('Template Items:', templateData.items);

    const saveOperation = this.isEditMode
      ? this.recurringService.updateTemplate(this.templateId!, templateData)
      : this.recurringService.createTemplate(templateData);

    saveOperation.subscribe({
      next: (result: any) => {
        this.toast.success(
          this.isEditMode
            ? 'Template updated successfully'
            : 'Template created successfully',
        );
        this.isSaving = false;
        this.router.navigate(['/recurring-invoices']);
      },
      error: (error: any) => {
        console.error('Failed to save template:', error);
        this.toast.error(error.error?.message || 'Failed to save template');
        this.isSaving = false;
      },
    });
  }

  /**
   * Cancel and go back
   */
  cancel(): void {
    this.router.navigate(['/recurring-invoices']);
  }

  /**
   * Toggle product selector
   */
  toggleProductSelector(): void {
    this.showProductSelector = !this.showProductSelector;
    if (this.showProductSelector) {
      this.filteredProducts = [...this.products];
    }
  }

  /**
   * Get frequency description
   */
  getFrequencyDescription(): string {
    const interval = this.template.intervalCount || 1;
    const freq = this.template.frequency;

    if (!freq) return '';

    const freqText = FrequencyLabels[freq].toLowerCase();
    const intervalText = interval > 1 ? `every ${interval}` : '';

    let description = `${intervalText} ${freqText}`.trim();

    if (
      freq === RecurrenceFrequency.WEEKLY &&
      this.template.dayOfWeek !== undefined
    ) {
      const day = DayOfWeekLabels[this.template.dayOfWeek];
      description += ` on ${day}`;
    }

    if (freq === RecurrenceFrequency.MONTHLY && this.template.dayOfMonth) {
      description += ` on day ${this.template.dayOfMonth}`;
    }

    return description.charAt(0).toUpperCase() + description.slice(1);
  }
}
