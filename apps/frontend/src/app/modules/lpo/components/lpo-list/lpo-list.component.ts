import { Component, OnInit } from '@angular/core';
import {
  LpoInterface,
  LpoStatus,
  ConvertToPurchaseDto,
} from '../../../../shared/interfaces/lpo.interface';
import { LpoService } from '../../../../shared/Services/lpo.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import { LpoReceiptService } from '../services/LpoReceiptService.service';

@Component({
  selector: 'app-lpo-list',
  templateUrl: './lpo-list.component.html',
  styleUrl: './lpo-list.component.scss',
})
export class LpoListComponent implements OnInit {
  allLpos: LpoInterface[] = [];
  filteredLpos: LpoInterface[] = [];
  suppliers: any[] = [];
  products: any[] = [];
  startDate: string = '';
  endDate: string = '';
  searchTerm: string = '';
  loading: boolean = false;
  orgDetails: any;
  activeTab: 'all' | 'pending' | 'approved' | 'rejected' | 'converted' = 'all';
  LpoStatus = LpoStatus;

  // Stats
  stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
    totalValue: 0,
  };

  // Conversion modal
  showConversionModal: boolean = false;
  selectedLpoForConversion: LpoInterface | null = null;
  conversionItems: any[] = [];

  // Rejection modal
  showRejectionModal: boolean = false;
  selectedLpoForRejection: LpoInterface | null = null;
  rejectionReason: string = '';

  // Detail view
  showDetailModal: boolean = false;
  selectedLpo: LpoInterface | null = null;

  // Action dropdown
  openDropdownId: number | null = null;

  constructor(
    private lpoService: LpoService,
    private suppliersService: SuppliersService,
    private productService: ProductService,
    private toast: HotToastService,
    private router: Router,
    private lpoReceiptService: LpoReceiptService,
    private orgDetailsService: OrgDetailsService,
  ) {}

  ngOnInit(): void {
    this.initializeData();
  }

  private async initializeData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadAllLpos(),
        this.loadProducts(),
        this.loadSuppliers(),
        this.loadOrgDetails(),
      ]);
    } finally {
      this.loading = false;
    }
  }

  private loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    return new Promise((resolve, reject) => {
      this.orgDetailsService.getById(+currentOrgId!).subscribe({
        next: (details: any) => {
          if (details) {
            this.orgDetails = details;
            resolve(details);
          }
        },
        error: (error) => {
          this.toast.error('Failed to load organization details');
          reject(error);
        },
      });
    });
  }

  loadAllLpos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.lpoService.getAllLpo().subscribe({
        next: (lpos) => {
          this.allLpos = lpos;
          this.calculateStats();
          this.applyTabFilter();
          resolve();
        },
        error: (error) => {
          console.error('Error loading LPOs:', error);
          this.toast.error('Failed to load purchase orders');
          reject(error);
        },
      });
    });
  }

  calculateStats() {
    this.stats = {
      total: this.allLpos.length,
      pending: this.allLpos.filter((l) => l.status === LpoStatus.PENDING)
        .length,
      approved: this.allLpos.filter((l) => l.status === LpoStatus.APPROVED)
        .length,
      rejected: this.allLpos.filter((l) => l.status === LpoStatus.REJECTED)
        .length,
      converted: this.allLpos.filter(
        (l) => l.status === LpoStatus.CONVERTED_TO_PURCHASE,
      ).length,
      totalValue: this.allLpos.reduce(
        (sum, l) => sum + (l.totalAmount || 0),
        0,
      ),
    };
  }

  switchTab(tab: 'all' | 'pending' | 'approved' | 'rejected' | 'converted') {
    this.activeTab = tab;
    this.applyTabFilter();
  }

  applyTabFilter() {
    let filtered = [...this.allLpos];
    switch (this.activeTab) {
      case 'pending':
        filtered = filtered.filter((l) => l.status === LpoStatus.PENDING);
        break;
      case 'approved':
        filtered = filtered.filter((l) => l.status === LpoStatus.APPROVED);
        break;
      case 'rejected':
        filtered = filtered.filter((l) => l.status === LpoStatus.REJECTED);
        break;
      case 'converted':
        filtered = filtered.filter(
          (l) => l.status === LpoStatus.CONVERTED_TO_PURCHASE,
        );
        break;
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.referenceNumber?.toLowerCase().includes(term) ||
          this.getSupplierNameById(l.supplierId).toLowerCase().includes(term) ||
          l.created_by?.toLowerCase().includes(term),
      );
    }

    this.filteredLpos = filtered;
  }

  loadLpoForARange() {
    if (!this.startDate || !this.endDate) {
      this.toast.error('Please select both start and end dates');
      return;
    }

    this.loading = true;
    this.lpoService.getLposByDateRange(this.startDate, this.endDate).subscribe({
      next: (lpos) => {
        this.allLpos = lpos;
        this.calculateStats();
        this.applyTabFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading LPO range:', error);
        this.toast.error('Failed to load LPOs for selected date range');
        this.loading = false;
      },
    });
  }

  clearDateFilter() {
    this.startDate = '';
    this.endDate = '';
    this.loading = true;
    this.loadAllLpos().finally(() => (this.loading = false));
  }

  onSearch() {
    this.applyTabFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyTabFilter();
  }

  // Actions
  approveLpo(lpo: LpoInterface) {
    if (lpo.status !== LpoStatus.PENDING) {
      this.toast.error('Only pending purchase orders can be approved');
      return;
    }

    if (!confirm('Are you sure you want to approve this purchase order?')) {
      return;
    }

    this.loading = true;
    this.lpoService.approveLpo(lpo.id).subscribe({
      next: () => {
        this.toast.success('Purchase order approved successfully');
        this.loadAllLpos().finally(() => (this.loading = false));
      },
      error: (error) => {
        console.error('Error approving LPO:', error);
        this.toast.error(
          error.error?.message || 'Failed to approve purchase order',
        );
        this.loading = false;
      },
    });
  }

  openRejectionModal(lpo: LpoInterface) {
    if (lpo.status !== LpoStatus.PENDING) {
      this.toast.error('Only pending purchase orders can be rejected');
      return;
    }
    this.selectedLpoForRejection = lpo;
    this.rejectionReason = '';
    this.showRejectionModal = true;
    this.closeDropdown();
  }

  confirmReject() {
    if (!this.selectedLpoForRejection || !this.rejectionReason.trim()) {
      this.toast.error('Please provide a rejection reason');
      return;
    }

    this.loading = true;
    this.lpoService
      .rejectLpo(this.selectedLpoForRejection.id, {
        rejectionReason: this.rejectionReason,
      })
      .subscribe({
        next: () => {
          this.toast.success('Purchase order rejected');
          this.showRejectionModal = false;
          this.selectedLpoForRejection = null;
          this.rejectionReason = '';
          this.loadAllLpos().finally(() => (this.loading = false));
        },
        error: (error) => {
          console.error('Error rejecting LPO:', error);
          this.toast.error(
            error.error?.message || 'Failed to reject purchase order',
          );
          this.loading = false;
        },
      });
  }

  cancelReject() {
    this.showRejectionModal = false;
    this.selectedLpoForRejection = null;
    this.rejectionReason = '';
  }

  openConversionModal(lpo: LpoInterface) {
    if (!lpo.isApproved) {
      this.toast.error('Purchase order must be approved before conversion');
      return;
    }
    if (lpo.isPurchaseConverted) {
      this.toast.error('Purchase order has already been converted');
      return;
    }

    this.selectedLpoForConversion = lpo;
    const items = Array.isArray(lpo.items)
      ? lpo.items
      : JSON.parse(lpo.items as any);
    this.conversionItems = items.map((item: any) => ({
      productId: item.productId,
      productName: this.getProductNameById(item.productId),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      expiryDate: null,
      manufactureDate: null,
      warehouseLocation: '',
      notes: '',
    }));
    this.showConversionModal = true;
    this.closeDropdown();
  }

  convertToPurchase() {
    if (!this.selectedLpoForConversion) return;

    const dto: ConvertToPurchaseDto = {
      items: this.conversionItems.map((item) => ({
        productId: item.productId,
        expiryDate: item.expiryDate || undefined,
        manufactureDate: item.manufactureDate || undefined,
        warehouseLocation: item.warehouseLocation || undefined,
        notes: item.notes || undefined,
      })),
    };

    this.loading = true;
    this.lpoService
      .convertToPurchase(this.selectedLpoForConversion.id, dto)
      .subscribe({
        next: (response) => {
          this.toast.success(
            `Successfully converted to purchase: ${response.purchaseReference}`,
          );
          this.showConversionModal = false;
          this.selectedLpoForConversion = null;
          this.loadAllLpos().finally(() => (this.loading = false));
        },
        error: (error) => {
          console.error('Error converting to purchase:', error);
          this.toast.error(
            error.error?.message || 'Failed to convert to purchase',
          );
          this.loading = false;
        },
      });
  }

  closeConversionModal() {
    this.showConversionModal = false;
    this.selectedLpoForConversion = null;
    this.conversionItems = [];
  }

  viewLpoDetail(lpo: LpoInterface) {
    this.selectedLpo = lpo;
    this.showDetailModal = true;
    this.closeDropdown();
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedLpo = null;
  }

  deleteLpo(lpo: LpoInterface) {
    if (lpo.status !== LpoStatus.PENDING) {
      this.toast.error('Only pending purchase orders can be deleted');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to delete this purchase order? This action cannot be undone.',
      )
    ) {
      return;
    }

    this.loading = true;
    this.lpoService.deleteLpo(lpo.id).subscribe({
      next: () => {
        this.toast.success('Purchase order deleted');
        this.loadAllLpos().finally(() => (this.loading = false));
      },
      error: (error) => {
        console.error('Error deleting LPO:', error);
        this.toast.error(
          error.error?.message || 'Failed to delete purchase order',
        );
        this.loading = false;
      },
    });
    this.closeDropdown();
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
  private loadSuppliers() {
    return new Promise<void>((resolve, reject) => {
      this.suppliersService.getAllSupplier().subscribe({
        next: (suppliers) => {
          this.suppliers = suppliers;
          resolve();
        },
        error: (error) => {
          console.error('Error loading suppliers:', error);
          this.toast.error('Failed to load suppliers');
          reject(error);
        },
      });
    });
  }

  private loadProducts() {
    return new Promise<void>((resolve, reject) => {
      this.productService.getAllProducts().subscribe({
        next: (products) => {
          this.products = products;
          resolve();
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.toast.error('Failed to load products');
          reject(error);
        },
      });
    });
  }

  getProductNameById(id: number): string {
    return this.products.find((p) => p.id === id)?.name || 'Unknown Product';
  }

  getSupplierNameById(id: number): string {
    return this.suppliers.find((s) => s.id === id)?.name || 'Unknown Supplier';
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50';
      case 'CONVERTED_TO_PURCHASE':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800/50';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800/50';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'CONVERTED_TO_PURCHASE':
        return 'Converted';
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return 'text-red-600 dark:text-red-400';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400';
      case 'MEDIUM':
        return 'text-blue-600 dark:text-blue-400';
      case 'LOW':
        return 'text-gray-500 dark:text-gray-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }

  getItemCount(items: any): number {
    if (Array.isArray(items)) return items.length;
    try {
      return JSON.parse(items).length;
    } catch {
      return 0;
    }
  }

  printLpo(lpo: LpoInterface) {
    if (!lpo || !this.orgDetails) {
      this.toast.error('Missing required information for printing');
      return;
    }

    const supplier = this.suppliers.find((s) => s.id === lpo.supplierId);
    try {
      this.lpoReceiptService.printLpo(
        lpo,
        this.orgDetails,
        supplier,
        this.products,
      );
    } catch (error) {
      console.error('Print error:', error);
      this.toast.error('Failed to print LPO');
    }
    this.closeDropdown();
  }
}
