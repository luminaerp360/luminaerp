import { Component, OnInit } from '@angular/core';
import { InventoryService } from '../../../../shared/Services/inventory.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { Product } from '../../../../shared/interfaces/products';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';

export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

@Component({
  selector: 'app-purchase-reports',
  templateUrl: './purchase-reports.component.html',
  styleUrls: ['./purchase-reports.component.scss'],
})
export class PurchaseReportsComponent implements OnInit {
  purchases: any[] = [];
  filteredPurchases: any[] = [];
  reportType: string = 'daily';
  selectedDate: string = '';
  startDate: string = '';
  endDate: string = '';
  suppliers: Supplier[] = [];
  products: Product[] = [];

  // Loading states
  isLoadingReport: boolean = false;
  isLoadingSuppliers: boolean = false;
  isLoadingProducts: boolean = false;
  isGeneratingReport: boolean = false;

  // Expanded items tracking
  expandedItems: Set<number> = new Set();

  // Quick filters
  quickFilters: QuickFilter[] = [
    { id: 'today', label: 'Today', icon: 'calendar-today', active: true },
    {
      id: 'yesterday',
      label: 'Yesterday',
      icon: 'calendar-yesterday',
      active: false,
    },
    {
      id: 'this-month',
      label: 'This Month',
      icon: 'calendar-month',
      active: false,
    },
    {
      id: 'last-month',
      label: 'Last Month',
      icon: 'calendar-prev',
      active: false,
    },
    {
      id: 'custom',
      label: 'Custom Range',
      icon: 'calendar-range',
      active: false,
    },
  ];

  activeQuickFilter: string = 'today';

  constructor(
    private inventoryService: InventoryService,
    private suppliersService: SuppliersService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadSuppliers();
    this.loadProducts();
    // Load today's data by default
    this.applyQuickFilter('today');
  }

  initializeDates(): void {
    const today = new Date();
    this.selectedDate = this.formatDateForInput(today);
    this.endDate = this.formatDateForInput(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    this.startDate = this.formatDateForInput(yesterday);
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  applyQuickFilter(filterId: string): void {
    this.activeQuickFilter = filterId;
    this.quickFilters.forEach(
      (filter) => (filter.active = filter.id === filterId)
    );

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    switch (filterId) {
      case 'today':
        this.reportType = 'daily';
        this.selectedDate = this.formatDateForInput(today);
        this.generateReportForDate(this.selectedDate);
        break;

      case 'yesterday':
        this.reportType = 'daily';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        this.selectedDate = this.formatDateForInput(yesterday);
        this.generateReportForDate(this.selectedDate);
        break;

      case 'this-month':
        this.reportType = 'range';
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        this.startDate = this.formatDateForInput(startOfMonth);
        this.endDate = this.formatDateForInput(today);
        this.generateReportForRange(this.startDate, this.endDate);
        break;

      case 'last-month':
        this.reportType = 'range';
        const startOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const endOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0
        );
        this.startDate = this.formatDateForInput(startOfLastMonth);
        this.endDate = this.formatDateForInput(endOfLastMonth);
        this.generateReportForRange(this.startDate, this.endDate);
        break;

      case 'custom':
        this.reportType = 'range';
        // Don't auto-generate, wait for user to set dates and click generate
        break;
    }
  }

  getAllPurchases() {
    this.isLoadingReport = true;
    this.inventoryService.getAllInventorys().subscribe({
      next: (data) => {
        this.purchases = data;
        console.log(data);
        this.isLoadingReport = false;
      },
      error: (error) => {
        console.log(error);
        this.isLoadingReport = false;
      },
    });
  }

  generateReport() {
    if (this.reportType === 'daily') {
      this.generateReportForDate(this.selectedDate);
    } else if (this.reportType === 'range') {
      this.generateReportForRange(this.startDate, this.endDate);
    }
  }

  generateReportForDate(date: string) {
    this.isGeneratingReport = true;
    const formattedDate = this.formatDate(date);

    this.inventoryService.getInventoryForADay(formattedDate).subscribe({
      next: (data) => {
        this.filteredPurchases = data;
        console.log(data);
        this.isGeneratingReport = false;
      },
      error: (error) => {
        console.log(error);
        this.isGeneratingReport = false;
      },
    });
  }

  generateReportForRange(startDate: string, endDate: string) {
    this.isGeneratingReport = true;
    const formattedStartDate = this.formatDate(startDate);
    const formattedEndDate = this.formatDate(endDate);

    this.inventoryService
      .getInventoryForADateRange(formattedStartDate, formattedEndDate)
      .subscribe({
        next: (data) => {
          this.filteredPurchases = data;
          console.log(data);
          this.isGeneratingReport = false;
        },
        error: (error) => {
          console.log(error);
          this.isGeneratingReport = false;
        },
      });
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns 'YYYY-MM-DD'
  }

  parseItems(itemsString: string): any[] {
    try {
      return JSON.parse(itemsString);
    } catch (error) {
      console.error('Error parsing items:', error);
      return [];
    }
  }

  getTotalAmount(): number {
    return this.filteredPurchases.reduce(
      (total, purchase) => total + purchase.totalAmount,
      0
    );
  }

  getTotalPaidAmount(): number {
    return this.filteredPurchases.reduce(
      (total, purchase) => total + purchase.paidAmount,
      0
    );
  }

  getTotalRemainingAmount(): number {
    return this.filteredPurchases.reduce(
      (total, purchase) => total + purchase.remainingAmount,
      0
    );
  }

  loadSuppliers() {
    this.isLoadingSuppliers = true;
    this.suppliersService.getAllSupplier().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
        this.isLoadingSuppliers = false;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.isLoadingSuppliers = false;
      },
    });
  }

  loadProducts() {
    this.isLoadingProducts = true;
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
      },
    });
  }

  getProductNameById(id: string | number): string {
    const product = this.products.find(
      (p) => p.id === (typeof id === 'string' ? parseInt(id, 10) : id)
    );
    if (product) {
      return product.name;
    } else {
      return this.isLoadingProducts ? 'Loading...' : 'Unknown Product';
    }
  }

  getSupplierNameById(id: number): string {
    const supplier = this.suppliers.find((s) => s.id === id);
    if (supplier) {
      return supplier.name;
    } else {
      return this.isLoadingSuppliers ? 'Loading...' : 'Unknown Supplier';
    }
  }

  toggleItemsExpansion(purchaseIndex: number): void {
    if (this.expandedItems.has(purchaseIndex)) {
      this.expandedItems.delete(purchaseIndex);
    } else {
      this.expandedItems.add(purchaseIndex);
    }
  }

  isItemsExpanded(purchaseIndex: number): boolean {
    return this.expandedItems.has(purchaseIndex);
  }

  getItemsPreview(items: any[], maxItems: number = 2): any[] {
    return items.slice(0, maxItems);
  }

  getPaymentStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'full':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'partial':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'unpaid':
      case 'pending':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  exportReport(): void {
    // Implementation for exporting report
    console.log('Exporting report...');
  }

  trackByPurchaseId(index: number, purchase: any): any {
    return purchase.id || index;
  }

  trackByItemId(index: number, item: any): any {
    return item.product_id || index;
  }

  trackByFilterId(index: number, filter: QuickFilter): any {
    return filter.id;
  }
}
