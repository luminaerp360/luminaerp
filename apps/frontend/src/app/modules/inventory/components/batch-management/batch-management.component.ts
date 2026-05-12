import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
} from 'rxjs';
import { HotToastService } from '@ngneat/hot-toast';
import { BatchTrackingService } from '../../../../shared/Services/batch-tracking.service';
import { InventoryMovementService } from '../../../../shared/Services/inventory-movement.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import {
  InventoryBatch,
  CreateBatchDto,
  UpdateBatchDto,
  BatchStatus,
  BatchAllocationResult,
  SerialNumber,
  CreateSerialNumberDto,
} from '../../../../shared/interfaces/modern-inventory.interface';

interface Product {
  id: number;
  name: string;
  [key: string]: any;
}

@Component({
  selector: 'app-batch-management',
  templateUrl: './batch-management.component.html',
  styleUrls: ['./batch-management.component.scss'],
})
export class BatchManagementComponent implements OnInit, OnDestroy {
  @Output() batchCreated = new EventEmitter<{
    batchId: number;
    productId: number;
    quantityAdded: number;
  }>();

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // Data
  batches: InventoryBatch[] = [];
  filteredBatches: InventoryBatch[] = [];
  pendingBatches: InventoryBatch[] = [];
  expiringBatches: InventoryBatch[] = [];
  expiredBatches: InventoryBatch[] = [];
  lowStockBatches: InventoryBatch[] = [];
  products: Product[] = [];
  suppliers: any[] = [];
  selectedBatch: InventoryBatch | null = null;
  serialNumbers: SerialNumber[] = [];

  // Allocation
  allocationResult: BatchAllocationResult | null = null;
  allocationProductId: number | null = null;
  allocationQuantity: number = 0;
  allocationMethod: 'FIFO' | 'FEFO' = 'FIFO';

  // UI State
  activeTab: 'all' | 'pending' | 'expiring' | 'expired' | 'low-stock' = 'all';
  showCreateModal = false;
  showDetailsModal = false;
  showAllocationModal = false;
  showSerialNumbersModal = false;
  showApprovalModal = false;
  isLoading = false;
  isCreating = false;
  isAllocating = false;
  isApproving = false;

  // Filters
  searchQuery = '';
  selectedStatus: BatchStatus | 'ALL' = 'ALL';
  selectedProductId: number | null = null;
  expiryWarningDays = 30;

  // Form
  batchForm: CreateBatchDto = {
    product_id: 0,
    batch_number: '',
    quantity_received: 0,
    buying_price: 0,
  };

  // Serial Numbers
  serialNumbersToCreate: string[] = [''];

  // Enums for template
  BatchStatus = BatchStatus;
  statusOptions = Object.values(BatchStatus);

  constructor(
    private batchService: BatchTrackingService,
    private movementService: InventoryMovementService,
    private productService: ProductService,
    private supplierService: SuppliersService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSearch(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });
  }

  loadData(): void {
    this.isLoading = true;

    // Load all batches
    this.batchService
      .getAllBatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.batches = batches;
          this.pendingBatches = batches.filter(
            (b) => b.status === BatchStatus.PENDING,
          );
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading batches:', error);
          this.toast.error('Failed to load batches');
          this.isLoading = false;
        },
      });

    // Load expiring batches
    this.batchService
      .getExpiringBatches(this.expiryWarningDays)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.expiringBatches = batches;
        },
        error: (error) => {
          console.error('Error loading expiring batches:', error);
        },
      });

    // Load expired batches
    this.batchService
      .getExpiredBatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.expiredBatches = batches;
        },
        error: (error) => {
          console.error('Error loading expired batches:', error);
        },
      });

    // Load low stock batches
    this.batchService
      .getLowStockBatches(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.lowStockBatches = batches;
        },
        error: (error) => {
          console.error('Error loading low stock batches:', error);
        },
      });

    // Load products (exclude services)
    this.productService
      .getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: any) => {
          // Filter out service products - only show physical products
          this.products = products.filter((product: any) => !product.isService);
        },
        error: (error: any) => {
          console.error('Error loading products:', error);
        },
      });

    // Load suppliers
    this.supplierService
      .getAllSupplier()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suppliers: any) => {
          this.suppliers = suppliers;
        },
        error: (error: any) => {
          console.error('Error loading suppliers:', error);
        },
      });
  }

  applyFilters(): void {
    let filtered = [...this.batches];

    // Tab filter
    if (this.activeTab === 'pending') {
      filtered = this.pendingBatches;
    } else if (this.activeTab === 'expiring') {
      filtered = this.expiringBatches;
    } else if (this.activeTab === 'expired') {
      filtered = this.expiredBatches;
    } else if (this.activeTab === 'low-stock') {
      filtered = this.lowStockBatches;
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (batch) =>
          batch.batch_number.toLowerCase().includes(query) ||
          batch.product?.name?.toLowerCase().includes(query),
      );
    }

    // Status filter
    if (this.selectedStatus !== 'ALL') {
      filtered = filtered.filter(
        (batch) => batch.status === this.selectedStatus,
      );
    }

    // Product filter
    if (this.selectedProductId) {
      filtered = filtered.filter(
        (batch) => batch.product_id === this.selectedProductId,
      );
    }

    this.filteredBatches = filtered;
  }

  onSearchChange(): void {
    this.searchSubject$.next(this.searchQuery);
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  onProductChange(): void {
    this.applyFilters();
  }

  // Create Batch
  openCreateModal(): void {
    this.resetBatchForm();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetBatchForm();
  }

  resetBatchForm(): void {
    this.batchForm = {
      product_id: 0,
      batch_number: this.generateBatchNumber(),
      quantity_received: 0,
      buying_price: 0,
    };
  }

  generateBatchNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `BATCH-${year}${month}${day}-${random}`;
  }

  createBatch(): void {
    if (!this.validateBatchForm()) {
      return;
    }

    this.isCreating = true;
    const quantityAdded = this.batchForm.quantity_received;
    const productId = this.batchForm.product_id;

    this.batchService
      .createBatch(this.batchForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batch: any) => {
          this.toast.success(
            `Batch created successfully and awaiting approval. Product quantity will update after approval.`,
          );

          // Emit event for parent components
          this.batchCreated.emit({
            batchId: batch.id,
            productId: productId,
            quantityAdded: 0, // Not added yet - pending approval
          });

          // Reload all data
          this.loadData();
          this.closeCreateModal();
          this.isCreating = false;
        },
        error: (error) => {
          console.error('Error creating batch:', error);
          this.toast.error('Failed to create batch');
          this.isCreating = false;
        },
      });
  }

  validateBatchForm(): boolean {
    if (!this.batchForm.product_id) {
      this.toast.error('Please select a product');
      return false;
    }
    if (!this.batchForm.batch_number?.trim()) {
      this.toast.error('Please enter a batch number');
      return false;
    }
    if (this.batchForm.quantity_received <= 0) {
      this.toast.error('Quantity must be greater than 0');
      return false;
    }
    if (this.batchForm.buying_price <= 0) {
      this.toast.error('Buying price must be greater than 0');
      return false;
    }
    return true;
  }

  // View Batch Details
  viewBatchDetails(batch: InventoryBatch): void {
    this.selectedBatch = batch;
    this.showDetailsModal = true;

    // Load serial numbers if batch has them
    if (batch.serial_numbers && batch.serial_numbers.length > 0) {
      this.loadSerialNumbers(batch.id);
    }

    // Refresh product data to show current stock
    if (batch.product_id) {
      this.refreshProductStock(batch.product_id);
    }
  }

  // Refresh product stock information
  refreshProductStock(productId: number): void {
    this.productService
      .getProductbyId(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          // Update product in local products array
          const index = this.products.findIndex((p) => p.id === productId);
          if (index !== -1) {
            this.products[index] = product;
          }
        },
        error: (error) => {
          console.error('Error refreshing product stock:', error);
        },
      });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedBatch = null;
  }

  // Update Batch Status
  updateBatchStatus(batchId: number, status: BatchStatus): void {
    const updateData: UpdateBatchDto = { status };

    this.batchService
      .updateBatch(batchId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Batch status updated');
          this.loadData();
        },
        error: (error) => {
          console.error('Error updating batch status:', error);
          this.toast.error('Failed to update batch status');
        },
      });
  }

  // Approve Batch
  approveBatch(batch: InventoryBatch): void {
    if (
      !confirm(
        `Approve batch ${batch.batch_number}? This will add ${batch.quantity_received} units to product stock.`,
      )
    ) {
      return;
    }

    this.isApproving = true;
    this.batchService
      .approveBatch(batch.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          this.toast.success(
            `Batch approved! Product quantity updated to ${result.updated_product_quantity}`,
          );
          this.loadData();
          this.isApproving = false;
        },
        error: (error) => {
          console.error('Error approving batch:', error);
          this.toast.error('Failed to approve batch');
          this.isApproving = false;
        },
      });
  }

  // Reject Batch
  rejectBatch(batch: InventoryBatch): void {
    const reason = prompt(
      `Reject batch ${batch.batch_number}? Please provide a reason:`,
    );

    if (!reason || reason.trim() === '') {
      this.toast.error('Rejection reason is required');
      return;
    }

    this.batchService
      .rejectBatch(batch.id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Batch rejected');
          this.loadData();
        },
        error: (error) => {
          console.error('Error rejecting batch:', error);
          this.toast.error('Failed to reject batch');
        },
      });
  }

  // Delete Pending Batch
  deletePendingBatch(batch: InventoryBatch): void {
    if (
      !confirm(
        `Delete pending batch ${batch.batch_number}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.batchService
      .deleteBatch(batch.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Batch deleted successfully');
          this.loadData();
        },
        error: (error) => {
          console.error('Error deleting batch:', error);
          this.toast.error(error.error?.message || 'Failed to delete batch');
        },
      });
  }

  // Stock Allocation
  openAllocationModal(): void {
    this.allocationResult = null;
    this.allocationProductId = null;
    this.allocationQuantity = 0;
    this.showAllocationModal = true;
  }

  closeAllocationModal(): void {
    this.showAllocationModal = false;
    this.allocationResult = null;
  }

  performAllocation(): void {
    if (!this.allocationProductId || this.allocationQuantity <= 0) {
      this.toast.error('Please select a product and enter quantity');
      return;
    }

    this.isAllocating = true;

    this.batchService
      .allocateStock(
        this.allocationProductId,
        this.allocationQuantity,
        this.allocationMethod,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.allocationResult = result;
          this.isAllocating = false;
        },
        error: (error) => {
          console.error('Error allocating stock:', error);
          this.toast.error('Failed to allocate stock');
          this.isAllocating = false;
        },
      });
  }

  // Serial Numbers
  loadSerialNumbers(batchId: number): void {
    this.batchService
      .getSerialNumbersByBatch(batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (serialNumbers) => {
          this.serialNumbers = serialNumbers;
        },
        error: (error) => {
          console.error('Error loading serial numbers:', error);
        },
      });
  }

  openSerialNumbersModal(batch: InventoryBatch): void {
    this.selectedBatch = batch;
    this.loadSerialNumbers(batch.id);
    this.showSerialNumbersModal = true;
  }

  closeSerialNumbersModal(): void {
    this.showSerialNumbersModal = false;
    this.selectedBatch = null;
    this.serialNumbersToCreate = [''];
  }

  addSerialNumberField(): void {
    this.serialNumbersToCreate.push('');
  }

  removeSerialNumberField(index: number): void {
    this.serialNumbersToCreate.splice(index, 1);
  }

  createSerialNumbers(): void {
    if (!this.selectedBatch) return;

    const validSerialNumbers = this.serialNumbersToCreate
      .map((sn) => sn.trim())
      .filter((sn) => sn.length > 0);

    if (validSerialNumbers.length === 0) {
      this.toast.error('Please enter at least one serial number');
      return;
    }

    const serialNumberDtos: CreateSerialNumberDto[] = validSerialNumbers.map(
      (sn) => ({
        batch_id: this.selectedBatch!.id,
        product_id: this.selectedBatch!.product_id,
        serial_number: sn,
      }),
    );

    this.batchService
      .bulkCreateSerialNumbers(serialNumberDtos)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.toast.success(`${created.length} serial numbers created`);
          this.loadSerialNumbers(this.selectedBatch!.id);
          this.serialNumbersToCreate = [''];
        },
        error: (error) => {
          console.error('Error creating serial numbers:', error);
          this.toast.error('Failed to create serial numbers');
        },
      });
  }

  // Utility Methods
  getExpiryStatus(batch: InventoryBatch): { class: string; text: string } {
    if (!batch.expiry_date) {
      return { class: 'text-gray-500', text: 'No expiry' };
    }

    const status = this.batchService.getExpiryStatus(batch.expiry_date);

    const classMap = {
      critical: 'text-red-600 font-semibold',
      warning: 'text-orange-600 font-medium',
      normal: 'text-green-600',
    };

    return {
      class: classMap[status.urgency],
      text: status.message,
    };
  }

  getBatchValue(batch: InventoryBatch): number {
    return this.batchService.calculateBatchValue(batch);
  }

  getStatusColor(status: BatchStatus): string {
    const colors: Record<BatchStatus, string> = {
      [BatchStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [BatchStatus.AVAILABLE]: 'bg-green-100 text-green-800',
      [BatchStatus.RESERVED]: 'bg-blue-100 text-blue-800',
      [BatchStatus.EXPIRED]: 'bg-red-100 text-red-800',
      [BatchStatus.DAMAGED]: 'bg-orange-100 text-orange-800',
      [BatchStatus.RECALLED]: 'bg-purple-100 text-purple-800',
      [BatchStatus.IN_TRANSIT]: 'bg-yellow-100 text-yellow-800',
      [BatchStatus.QUALITY_HOLD]: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  getProductName(productId: number): string {
    const product = this.products.find((p) => p.id === productId);
    return product?.name || `Product #${productId}`;
  }

  getCurrentProductStock(productId: number): number {
    const product = this.products.find((p) => p.id === productId);
    return product?.['quantity'] || 0;
  }

  getProductDetails(productId: number): Product | undefined {
    return this.products.find((p) => p.id === productId);
  }

  refreshData(): void {
    this.loadData();
  }

  trackByBatchId(index: number, batch: InventoryBatch): number {
    return batch.id;
  }
}
