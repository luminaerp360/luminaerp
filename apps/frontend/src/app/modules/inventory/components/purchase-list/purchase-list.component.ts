import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { InventoryService } from '../../../../shared/Services/inventory.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';

@Component({
  selector: 'app-purchase-list',
  templateUrl: './purchase-list.component.html',
  styleUrls: ['./purchase-list.component.scss'],
})
export class PurchaseListComponent implements OnInit {
  allPurchases: any[] = [];
  filteredPurchases: any[] = [];
  suppliers: any[] = [];
  products: any[] = [];

  searchTerm = '';
  startDate = '';
  endDate = '';
  loading = false;

  activeTab: 'all' | 'pending' | 'approved' | 'received' = 'all';

  stats = {
    total: 0,
    pending: 0,
    approved: 0,
    received: 0,
    totalValue: 0,
  };

  // Detail modal
  showDetailModal = false;
  selectedPurchase: any = null;

  // Receive modal
  showReceiveModal = false;
  selectedPurchaseForReceive: any = null;
  receiveItems: any[] = [];

  // Action dropdown
  openDropdownId: number | null = null;

  constructor(
    private inventoryService: InventoryService,
    private suppliersService: SuppliersService,
    private productService: ProductService,
    private toast: HotToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.initializeData();
  }

  private async initializeData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadAllPurchases(),
        this.loadProducts(),
        this.loadSuppliers(),
      ]);
    } finally {
      this.loading = false;
    }
  }

  loadAllPurchases(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.inventoryService.getAllInventorys().subscribe({
        next: (purchases: any[]) => {
          this.allPurchases = purchases;
          this.calculateStats();
          this.applyTabFilter();
          resolve();
        },
        error: (error) => {
          console.error('Error loading purchases:', error);
          this.toast.error('Failed to load purchases');
          reject(error);
        },
      });
    });
  }

  private loadSuppliers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.suppliersService.getAllSupplier().subscribe({
        next: (suppliers) => {
          this.suppliers = suppliers;
          resolve();
        },
        error: (error) => {
          console.error('Error loading suppliers:', error);
          reject(error);
        },
      });
    });
  }

  private loadProducts(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.productService.getAllProducts().subscribe({
        next: (products) => {
          this.products = products;
          resolve();
        },
        error: (error) => {
          console.error('Error loading products:', error);
          reject(error);
        },
      });
    });
  }

  calculateStats() {
    this.stats = {
      total: this.allPurchases.length,
      pending: this.allPurchases.filter((p) => p.status === 'PENDING').length,
      approved: this.allPurchases.filter((p) => p.status === 'APPROVED').length,
      received: this.allPurchases.filter((p) => p.status === 'RECEIVED').length,
      totalValue: this.allPurchases.reduce(
        (sum, p) => sum + (p.totalAmount || 0),
        0,
      ),
    };
  }

  switchTab(tab: 'all' | 'pending' | 'approved' | 'received') {
    this.activeTab = tab;
    this.applyTabFilter();
  }

  applyTabFilter() {
    let filtered = [...this.allPurchases];

    switch (this.activeTab) {
      case 'pending':
        filtered = filtered.filter((p) => p.status === 'PENDING');
        break;
      case 'approved':
        filtered = filtered.filter((p) => p.status === 'APPROVED');
        break;
      case 'received':
        filtered = filtered.filter((p) => p.status === 'RECEIVED');
        break;
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          this.getSupplierName(p).toLowerCase().includes(term) ||
          p.added_by?.toLowerCase().includes(term) ||
          String(p.id).includes(term),
      );
    }

    this.filteredPurchases = filtered;
  }

  loadPurchasesForRange() {
    if (!this.startDate || !this.endDate) {
      this.toast.error('Please select both start and end dates');
      return;
    }

    this.loading = true;
    this.inventoryService
      .getInventoryForADateRange(this.startDate, this.endDate)
      .subscribe({
        next: (purchases: any[]) => {
          this.allPurchases = purchases;
          this.calculateStats();
          this.applyTabFilter();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading purchases for range:', error);
          this.toast.error('Failed to load purchases for selected date range');
          this.loading = false;
        },
      });
  }

  clearDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.loading = true;
    this.loadAllPurchases().finally(() => (this.loading = false));
  }

  onSearch() {
    this.applyTabFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyTabFilter();
  }

  // Detail modal
  viewPurchaseDetail(purchase: any) {
    this.selectedPurchase = purchase;
    this.showDetailModal = true;
    this.closeDropdown();
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedPurchase = null;
  }

  // Edit
  editPurchase(purchase: any) {
    this.closeDropdown();
    this.router.navigate(['/inventory/edit', purchase.id]);
  }

  // Approve
  approvePurchase(purchase: any) {
    if (purchase.status !== 'PENDING') {
      this.toast.error('Only pending purchases can be approved');
      return;
    }

    if (!confirm('Are you sure you want to approve this purchase?')) {
      return;
    }

    const currentUser = localStorage.getItem('userName') || 'Unknown';
    this.loading = true;
    this.inventoryService
      .approvePurchase(purchase.id, { approvedBy: currentUser })
      .subscribe({
        next: () => {
          this.toast.success('Purchase approved successfully');
          this.loadAllPurchases().finally(() => (this.loading = false));
        },
        error: (error) => {
          console.error('Error approving purchase:', error);
          this.toast.error(
            error.error?.message || 'Failed to approve purchase',
          );
          this.loading = false;
        },
      });
    this.closeDropdown();
  }

  // Receive modal
  openReceiveModal(purchase: any) {
    if (purchase.status !== 'APPROVED') {
      this.toast.error('Only approved purchases can be received');
      return;
    }

    this.selectedPurchaseForReceive = purchase;
    const items = this.parseItems(purchase.items);
    this.receiveItems = items.map((item: any) => {
      const product = this.products.find(
        (p) => p.id === Number(item.product_id),
      );
      const trackingMode = (product as any)?.trackingMode || 'NONE';
      const isTracked = ['SERIAL', 'IMEI', 'REGISTRATION'].includes(
        trackingMode,
      );
      return {
        product_id: item.product_id,
        productName: this.getProductNameById(item.product_id),
        quantity: item.quantity,
        buying_price: item.buying_price,
        selling_price: item.selling_price,
        markup_percentage: item.markup_percentage,
        unit: item.unit,
        expiry_date: item.expiry_date,
        manufacture_date: item.manufacture_date,
        warehouse_location: item.warehouse_location,
        notes: item.notes,
        isTracked,
        trackingMode,
        identifiersRaw: '',
      };
    });
    this.showReceiveModal = true;
    this.closeDropdown();
  }

  getTrackingLabelForMode(mode: string): string {
    if (mode === 'IMEI') return 'IMEI';
    if (mode === 'REGISTRATION') return 'Registration Number';
    if (mode === 'SERIAL') return 'Serial Number';
    return 'Identifier';
  }

  parseIdentifiers(raw: string): string[] {
    return raw
      .split(/[\n,]+/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  getIdentifierCount(item: any): number {
    return this.parseIdentifiers(item.identifiersRaw || '').length;
  }

  hasTrackedItems(): boolean {
    return this.receiveItems.some((item: any) => item.isTracked);
  }

  validateReceiveIdentifiers(): boolean {
    for (const item of this.receiveItems) {
      if (!item.isTracked) continue;
      const ids = this.parseIdentifiers(item.identifiersRaw || '');
      if (ids.length !== item.quantity) {
        this.toast.error(
          `${item.productName} requires exactly ${item.quantity} identifier(s), got ${ids.length}`,
        );
        return false;
      }
      const dupes = ids.filter((v: string, i: number) => ids.indexOf(v) !== i);
      if (dupes.length > 0) {
        this.toast.error(
          `Duplicate identifiers for ${item.productName}: ${[...new Set(dupes)].join(', ')}`,
        );
        return false;
      }
    }
    return true;
  }

  confirmReceive() {
    if (!this.selectedPurchaseForReceive) return;

    if (!this.validateReceiveIdentifiers()) return;

    const currentUser = localStorage.getItem('userName') || 'Unknown';

    // Build items payload with identifiers for tracked products
    const itemsPayload = this.receiveItems
      .filter((item: any) => item.isTracked)
      .map((item: any) => ({
        product_id: String(item.product_id),
        unit_identifiers: this.parseIdentifiers(item.identifiersRaw || ''),
      }));

    this.loading = true;
    this.inventoryService
      .receivePurchase(this.selectedPurchaseForReceive.id, {
        receivedBy: currentUser,
        items: itemsPayload.length > 0 ? itemsPayload : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success(
            'Purchase received successfully. Inventory has been updated.',
          );
          this.showReceiveModal = false;
          this.selectedPurchaseForReceive = null;
          this.receiveItems = [];
          this.loadAllPurchases().finally(() => (this.loading = false));
        },
        error: (error) => {
          console.error('Error receiving purchase:', error);
          this.toast.error(
            error.error?.message || 'Failed to receive purchase',
          );
          this.loading = false;
        },
      });
  }

  closeReceiveModal() {
    this.showReceiveModal = false;
    this.selectedPurchaseForReceive = null;
    this.receiveItems = [];
  }

  // Cancel
  cancelPurchase(purchase: any) {
    if (purchase.status !== 'PENDING') {
      this.toast.error('Only pending purchases can be cancelled');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to cancel this purchase? This action cannot be undone.',
      )
    ) {
      return;
    }

    this.loading = true;
    this.inventoryService.cancelPurchase(purchase.id).subscribe({
      next: () => {
        this.toast.success('Purchase cancelled');
        this.loadAllPurchases().finally(() => (this.loading = false));
      },
      error: (error) => {
        console.error('Error cancelling purchase:', error);
        this.toast.error(error.error?.message || 'Failed to cancel purchase');
        this.loading = false;
      },
    });
    this.closeDropdown();
  }

  // Delete
  deletePurchase(purchase: any) {
    if (purchase.status !== 'PENDING' && purchase.status !== 'CANCELLED') {
      this.toast.error('Only pending or cancelled purchases can be deleted');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to delete this purchase? This action cannot be undone.',
      )
    ) {
      return;
    }

    this.loading = true;
    this.inventoryService.deleteInventory(purchase.id).subscribe({
      next: () => {
        this.toast.success('Purchase deleted successfully');
        this.loadAllPurchases().finally(() => (this.loading = false));
      },
      error: (error) => {
        console.error('Error deleting purchase:', error);
        this.toast.error(error.error?.message || 'Failed to delete purchase');
        this.loading = false;
      },
    });
    this.closeDropdown();
  }

  // Navigate to make purchase
  makePurchase() {
    this.router.navigate(['/inventory']);
  }

  // Dropdown
  toggleDropdown(id: number, event: Event) {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  closeDropdown() {
    this.openDropdownId = null;
  }

  // Helpers
  getSupplierName(purchase: any): string {
    if (purchase.supplier?.name) return purchase.supplier.name;
    return this.getSupplierNameById(purchase.supplierId);
  }

  getSupplierNameById(id: number): string {
    return this.suppliers.find((s) => s.id === id)?.name || 'Unknown Supplier';
  }

  getProductNameById(id: number | string): string {
    const numId = Number(id);
    return this.products.find((p) => p.id === numId)?.name || 'Unknown Product';
  }

  parseItems(items: any): any[] {
    if (Array.isArray(items)) return items;
    try {
      return JSON.parse(items);
    } catch {
      return [];
    }
  }

  getItemCount(items: any): number {
    return this.parseItems(items).length;
  }

  getTotalPaid(purchase: any): number {
    if (purchase.paidAmount !== undefined) return purchase.paidAmount;
    if (purchase.payments && Array.isArray(purchase.payments)) {
      return purchase.payments.reduce(
        (sum: number, p: any) => sum + (p.amount || 0),
        0,
      );
    }
    return 0;
  }

  getBalance(purchase: any): number {
    return (purchase.totalAmount || 0) - this.getTotalPaid(purchase);
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50';
      case 'APPROVED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
      case 'RECEIVED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50';
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50';
      default:
        return 'bg-gray-100 dark:bg-slate-900/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800/50';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'RECEIVED':
        return 'Received';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status || 'Unknown';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50';
      case 'PARTIAL':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50';
      case 'UNPAID':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50';
      default:
        return 'bg-gray-100 dark:bg-slate-900/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800/50';
    }
  }

  getPaymentStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'Paid';
      case 'PARTIAL':
        return 'Partial';
      case 'UNPAID':
        return 'Unpaid';
      default:
        return status || 'Unknown';
    }
  }

  hasAnyBatchDetails(): boolean {
    if (!this.selectedPurchase) return false;
    const items = this.parseItems(this.selectedPurchase.items);
    return items.some(
      (item: any) =>
        item.expiry_date ||
        item.manufacture_date ||
        item.warehouse_location ||
        item.markup_percentage ||
        item.notes,
    );
  }

  getPaymentMethodLabel(method: string): string {
    switch (method?.toUpperCase()) {
      case 'CASH':
        return 'Cash';
      case 'MPESA':
        return 'M-Pesa';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CREDIT':
        return 'Credit';
      default:
        return method || 'Unknown';
    }
  }
}
