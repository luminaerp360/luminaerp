import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { StockTakeService } from '../../../../shared/Services/stock-take.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { HotToastService } from '@ngneat/hot-toast';
import {
  StockTake,
  StockTakeSummary,
  StockTakeStatus,
} from '../../../../shared/interfaces/stock-take.interface';
import { Product } from '../../../../shared/interfaces/products';

@Component({
  selector: 'app-stock-take',
  templateUrl: './stock-take.component.html',
  styleUrls: ['./stock-take.component.scss'],
})
export class StockTakeComponent implements OnInit {
  // Data
  stockTakes: StockTake[] = [];
  summary: StockTakeSummary | null = null;
  products: Product[] = [];
  filteredProducts: Product[] = [];

  // UI state
  loading = false;
  submitting = false;
  showCreateForm = false;
  showDetailModal = false;
  selectedStockTake: StockTake | null = null;
  activeTab: 'history' | 'create' = 'history';
  searchTerm = '';
  productSearch = '';
  statusFilter = '';

  // Pagination
  page = 1;
  limit = 10;
  totalPages = 1;
  total = 0;

  // Form
  stockTakeForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private stockTakeService: StockTakeService,
    private productService: ProductService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadStockTakes();
    this.loadSummary();
    this.loadProducts();
  }

  initForm(): void {
    this.stockTakeForm = this.fb.group({
      type: ['PHYSICAL_COUNT'],
      notes: [''],
      items: this.fb.array([]),
    });
  }

  get items(): FormArray {
    return this.stockTakeForm.get('items') as FormArray;
  }

  // =========== Data Loading ===========

  loadStockTakes(): void {
    this.loading = true;
    this.stockTakeService
      .getStockTakes({
        page: this.page,
        limit: this.limit,
        status: this.statusFilter || undefined,
        search: this.searchTerm || undefined,
      })
      .subscribe({
        next: (response: any) => {
          this.stockTakes = response.stockTakes || response.data || response;
          if (response.pagination) {
            this.total = response.pagination.total;
            this.totalPages = response.pagination.totalPages;
          }
          this.loading = false;
        },
        error: (err) => {
          this.toast.error('Failed to load stock takes');
          this.loading = false;
        },
      });
  }

  loadSummary(): void {
    this.stockTakeService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: () => {},
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
      },
      error: () => {
        this.toast.error('Failed to load products');
      },
    });
  }

  // =========== Product Search ===========

  filterProducts(): void {
    const term = this.productSearch.toLowerCase();
    const addedIds = this.items.controls.map((c) => c.get('productId')?.value);
    this.filteredProducts = this.products.filter(
      (p) =>
        !addedIds.includes(p.id) &&
        (p.name.toLowerCase().includes(term) ||
          (p.sku && p.sku.toLowerCase().includes(term))),
    );
  }

  addProduct(product: Product): void {
    const alreadyAdded = this.items.controls.some(
      (c) => c.get('productId')?.value === product.id,
    );
    if (alreadyAdded) {
      this.toast.warning('Product already added');
      return;
    }

    const itemGroup = this.fb.group({
      productId: [product.id, Validators.required],
      productName: [product.name],
      systemQuantity: [product.quantity || 0],
      countedQuantity: [null, [Validators.required, Validators.min(0)]],
      unitCost: [product.buyingPrice || 0],
      reason: [''],
      notes: [''],
    });

    this.items.push(itemGroup);
    this.productSearch = '';
    this.filterProducts();
  }

  addAllProducts(): void {
    const addedIds = this.items.controls.map((c) => c.get('productId')?.value);
    const notAdded = this.products.filter((p) => !addedIds.includes(p.id));
    notAdded.forEach((product) => {
      const itemGroup = this.fb.group({
        productId: [product.id, Validators.required],
        productName: [product.name],
        systemQuantity: [product.quantity || 0],
        countedQuantity: [null, [Validators.required, Validators.min(0)]],
        unitCost: [product.buyingPrice || 0],
        reason: [''],
        notes: [''],
      });
      this.items.push(itemGroup);
    });
    this.filterProducts();
    this.toast.success(`Added ${notAdded.length} products`);
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
    this.filterProducts();
  }

  // =========== Calculations ===========

  getVarianceQty(index: number): number {
    const item = this.items.at(index);
    const counted = item.get('countedQuantity')?.value;
    const system = item.get('systemQuantity')?.value;
    if (counted === null || counted === undefined) return 0;
    return counted - system;
  }

  getVarianceValue(index: number): number {
    const unitCost = this.items.at(index).get('unitCost')?.value || 0;
    return this.getVarianceQty(index) * unitCost;
  }

  getTotalVarianceQty(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.getVarianceQty(i);
    }
    return total;
  }

  getTotalVarianceValue(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.getVarianceValue(i);
    }
    return total;
  }

  // =========== CRUD Operations ===========

  switchTab(tab: 'history' | 'create'): void {
    this.activeTab = tab;
    if (tab === 'create') {
      this.initForm();
      this.filterProducts();
    }
  }

  submitStockTake(): void {
    if (this.items.length === 0) {
      this.toast.warning('Please add at least one product');
      return;
    }

    // Check all counted quantities are filled
    const hasInvalid = this.items.controls.some(
      (c) =>
        c.get('countedQuantity')?.value === null ||
        c.get('countedQuantity')?.value === undefined,
    );
    if (hasInvalid) {
      this.toast.warning('Please enter counted quantity for all products');
      return;
    }

    this.submitting = true;
    const formValue = this.stockTakeForm.value;

    const payload = {
      type: formValue.type,
      notes: formValue.notes,
      items: formValue.items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        systemQuantity: item.systemQuantity,
        countedQuantity: Number(item.countedQuantity),
        unitCost: item.unitCost,
        reason: item.reason || undefined,
        notes: item.notes || undefined,
      })),
    };

    this.stockTakeService.createStockTake(payload).subscribe({
      next: (result) => {
        this.toast.success('Stock take created successfully');
        this.submitting = false;
        this.switchTab('history');
        this.loadStockTakes();
        this.loadSummary();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to create stock take');
        this.submitting = false;
      },
    });
  }

  completeStockTake(stockTake: StockTake): void {
    if (
      !confirm(
        `Complete stock take ${stockTake.stockTakeNumber}? This will update product quantities based on the counted values.`,
      )
    ) {
      return;
    }

    this.stockTakeService
      .completeStockTake(stockTake.id, { adjustInventory: true })
      .subscribe({
        next: () => {
          this.toast.success('Stock take completed and inventory updated');
          this.loadStockTakes();
          this.loadSummary();
          this.loadProducts();
          if (this.selectedStockTake?.id === stockTake.id) {
            this.viewStockTake(stockTake.id);
          }
        },
        error: (err) => {
          this.toast.error(
            err.error?.message || 'Failed to complete stock take',
          );
        },
      });
  }

  cancelStockTake(stockTake: StockTake): void {
    if (!confirm(`Cancel stock take ${stockTake.stockTakeNumber}?`)) {
      return;
    }

    this.stockTakeService.cancelStockTake(stockTake.id).subscribe({
      next: () => {
        this.toast.success('Stock take cancelled');
        this.loadStockTakes();
        this.loadSummary();
        if (this.selectedStockTake?.id === stockTake.id) {
          this.showDetailModal = false;
          this.selectedStockTake = null;
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to cancel stock take');
      },
    });
  }

  deleteStockTake(stockTake: StockTake): void {
    if (
      !confirm(
        `Delete stock take ${stockTake.stockTakeNumber}? This cannot be undone.`,
      )
    ) {
      return;
    }

    this.stockTakeService.deleteStockTake(stockTake.id).subscribe({
      next: () => {
        this.toast.success('Stock take deleted');
        this.loadStockTakes();
        this.loadSummary();
        if (this.selectedStockTake?.id === stockTake.id) {
          this.showDetailModal = false;
          this.selectedStockTake = null;
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete stock take');
      },
    });
  }

  viewStockTake(id: number): void {
    this.stockTakeService.getStockTake(id).subscribe({
      next: (stockTake) => {
        this.selectedStockTake = stockTake;
        this.showDetailModal = true;
      },
      error: () => {
        this.toast.error('Failed to load stock take details');
      },
    });
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedStockTake = null;
  }

  // =========== Filters & Pagination ===========

  onSearchChange(): void {
    this.page = 1;
    this.loadStockTakes();
  }

  onStatusFilterChange(): void {
    this.page = 1;
    this.loadStockTakes();
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadStockTakes();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadStockTakes();
    }
  }

  // =========== Helpers ===========

  formatCurrency(value: number): string {
    return this.stockTakeService.formatCurrency(value);
  }

  getStatusClass(status: string): string {
    return this.stockTakeService.getStatusBadgeClass(status);
  }

  getVarianceClass(value: number): string {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  }

  canComplete(stockTake: StockTake): boolean {
    return stockTake.status === 'DRAFT' || stockTake.status === 'IN_PROGRESS';
  }

  canCancel(stockTake: StockTake): boolean {
    return stockTake.status === 'DRAFT' || stockTake.status === 'IN_PROGRESS';
  }

  canDelete(stockTake: StockTake): boolean {
    return stockTake.status === 'DRAFT' || stockTake.status === 'CANCELLED';
  }
}
