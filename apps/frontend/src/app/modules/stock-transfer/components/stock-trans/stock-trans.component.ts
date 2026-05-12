import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  StockTransfer,
  Organization,
  StockTransferStatus,
  CreateStockTransferDto,
  StockTransferItem,
} from '../../interfaces/stock-tranfer.interface';
import { StockTransferService } from '../../services/stock-transfer.service';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { StockTransferFormComponent } from '../stock-transfer-form/stock-transfer-form.component';
import { ViewTranferDetailsComponent } from '../view-tranfer-details/view-tranfer-details.component';

@Component({
  selector: 'app-stock-trans',
  templateUrl: './stock-trans.component.html',
  styleUrl: './stock-trans.component.scss',
})
export class StockTransferComponent implements OnInit, OnDestroy {
  private transferFormDialog: DialogRemoteControl = new DialogRemoteControl(
    StockTransferFormComponent
  );

  private viewTransferDetailsDialog: DialogRemoteControl =
    new DialogRemoteControl(ViewTranferDetailsComponent);

  stockTransfers: StockTransfer[] = [];
  pendingTransfers: StockTransfer[] = [];
  organizations: Organization[] = [];

  transferForm: FormGroup;
  loading = false;
  showCreateForm = false;

  // Status enum for template
  StockTransferStatus = StockTransferStatus;

  // New pagination/filter state
  page = 1;
  pageSize = 20;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null = null;
  statuses = [
    StockTransferStatus.PENDING,
    StockTransferStatus.APPROVED,
    StockTransferStatus.COMPLETED,
    StockTransferStatus.REJECTED,
    StockTransferStatus.CANCELLED,
  ];
  selectedStatuses: StockTransferStatus[] = [];
  filterForm = this.fb.group({
    search: [''],
    startDate: [''],
    endDate: [''],
    organizationId: [''],
  });
  private destroy$ = new Subject<void>();

  constructor(
    private stockTransferService: StockTransferService,
    private fb: FormBuilder
  ) {
    this.transferForm = this.createTransferForm();
  }

  ngOnInit() {
    this.loadStockTransfers();
    this.loadPendingTransfers();
    // this.loadOrganizations();
  }

  createTransferForm(): FormGroup {
    return this.fb.group({
      fromOrganizationId: ['', Validators.required],
      toOrganizationId: ['', Validators.required],
      fromLocationId: [''],
      toLocationId: [''],
      notes: [''],
      items: this.fb.array([this.createItemForm()], Validators.required),
    });
  }

  createItemForm(): FormGroup {
    return this.fb.group({
      productIdNumber: ['', Validators.required],
      productName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      totalPrice: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
    });
  }

  get itemsFormArray(): FormArray {
    return this.transferForm.get('items') as FormArray;
  }

  addItem() {
    this.itemsFormArray.push(this.createItemForm());
  }

  removeItem(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  calculateTotalPrice(index: number) {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const totalPrice = quantity * unitPrice;
    item.get('totalPrice')?.setValue(totalPrice);
  }

  loadStockTransfers() {
    this.loading = true;
    this.stockTransferService.getMyStockTransfers().subscribe({
      next: (response) => {
        console.log('Stock transfers response:', response);
        // Handle different response formats
        if (response && Array.isArray(response)) {
          // If response is directly an array
          this.stockTransfers = response.map((transfer) =>
            this.stockTransferService.parseTransferItems(transfer)
          );
        } else if (
          response &&
          response.transfers &&
          Array.isArray(response.transfers)
        ) {
          // If response has a transfers property
          this.stockTransfers = response.transfers.map((transfer) =>
            this.stockTransferService.parseTransferItems(transfer)
          );
        } else if (
          response &&
          (response as any).data &&
          Array.isArray((response as any).data)
        ) {
          // New paginated shape (data + meta)
          this.stockTransfers = (response as any).data.map((transfer: any) =>
            this.stockTransferService.parseTransferItems(transfer)
          );
          this.meta = (response as any).meta || null;
        } else {
          // Fallback to empty array
          console.warn(
            'Unexpected response format for stock transfers:',
            response
          );
          this.stockTransfers = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stock transfers:', error);
        this.stockTransfers = [];
        this.loading = false;
      },
    });
  }

  loadPendingTransfers() {
    this.stockTransferService.getPendingTransfers().subscribe({
      next: (response) => {
        console.log('Pending transfers response:', response);
        // Handle different response formats
        if (response && Array.isArray(response)) {
          // If response is directly an array
          this.pendingTransfers = response.map((transfer) =>
            this.stockTransferService.parseTransferItems(transfer)
          );
        } else if (
          response &&
          response.transfers &&
          Array.isArray(response.transfers)
        ) {
          // If response has a transfers property
          this.pendingTransfers = response.transfers.map((transfer) =>
            this.stockTransferService.parseTransferItems(transfer)
          );
        } else if (
          response &&
          (response as any).data &&
          Array.isArray((response as any).data)
        ) {
          this.pendingTransfers = (response as any).data.map((transfer: any) =>
            this.stockTransferService.parseTransferItems(transfer)
          );
        } else {
          // Fallback to empty array
          console.warn(
            'Unexpected response format for pending transfers:',
            response
          );
          this.pendingTransfers = [];
        }
      },
      error: (error) => {
        console.error('Error loading pending transfers:', error);
        this.pendingTransfers = [];
      },
    });
  }

  // loadOrganizations() {
  //   this.stockTransferService.getAvailableOrganizations().subscribe({
  //     next: (organizations) => {
  //       this.organizations = organizations;
  //     },
  //     error: (error) => {
  //       console.error('Error loading organizations:', error);
  //     },
  //   });
  // }

  onSubmitTransfer() {
    if (this.transferForm.valid) {
      this.loading = true;
      const transferData: CreateStockTransferDto = this.transferForm.value;

      this.stockTransferService.createStockTransfer(transferData).subscribe({
        next: (response) => {
          console.log('Transfer created successfully:', response);
          this.resetForm();
          this.loadStockTransfers();
          this.showCreateForm = false;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating transfer:', error);
          this.loading = false;
        },
      });
    }
  }

  approveTransfer(transferId: number) {
    const notes = prompt('Add approval notes (optional):');

    this.stockTransferService
      .approveStockTransfer(transferId, notes || undefined)
      .subscribe({
        next: (response) => {
          console.log('Transfer approved:', response);
          this.loadStockTransfers();
          this.loadPendingTransfers();
        },
        error: (error) => {
          console.error('Error approving transfer:', error);
        },
      });
  }

  rejectTransfer(transferId: number) {
    const rejectionReason = prompt('Enter rejection reason:');
    if (!rejectionReason) return;

    const notes = prompt('Add additional notes (optional):');

    this.stockTransferService
      .rejectStockTransfer(transferId, rejectionReason, notes || undefined)
      .subscribe({
        next: (response) => {
          console.log('Transfer rejected:', response);
          this.loadStockTransfers();
          this.loadPendingTransfers();
        },
        error: (error) => {
          console.error('Error rejecting transfer:', error);
        },
      });
  }

  cancelTransfer(transferId: number) {
    if (confirm('Are you sure you want to cancel this transfer?')) {
      this.stockTransferService.cancelStockTransfer(transferId).subscribe({
        next: (response) => {
          console.log('Transfer cancelled:', response);
          this.loadStockTransfers();
          this.loadPendingTransfers();
        },
        error: (error) => {
          console.error('Error cancelling transfer:', error);
        },
      });
    }
  }

  getStatusBadgeClass(status: StockTransferStatus): string {
    return this.stockTransferService.getStatusBadgeClass(status);
  }

  canApproveTransfer(transfer: StockTransfer): boolean {
    return this.stockTransferService.canApproveTransfer(transfer);
  }

  canCancelTransfer(transfer: StockTransfer): boolean {
    return this.stockTransferService.canCancelTransfer(transfer);
  }

  formatCurrency(amount: number): string {
    return this.stockTransferService.formatCurrency(amount);
  }

  resetForm() {
    this.transferForm.reset();
    // Reset items array to have just one item
    while (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(this.itemsFormArray.length - 1);
    }
  }

  // New method to open the transfer form modal
  openTransferFormDialog() {
    console.log('Opening transfer form dialog...');

    this.transferFormDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.transferFormDialog.openDialog().subscribe((result) => {
      console.log('Transfer form dialog result:', result);
      if (result) {
        // Refresh the transfer lists when a new transfer is created
        this.loadStockTransfers();
        this.loadPendingTransfers();
      }
    });
  }

  toggleCreateForm() {
    // Use the new modal instead of inline form
    console.log('toggleCreateForm called - opening dialog...');
    this.openTransferFormDialog();
  }

  // === Pagination & Filtering Methods (correctly placed) ===
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSearchListener() {
    this.filterForm
      .get('search')
      ?.valueChanges.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.page = 1;
        this.refreshPaginated();
      });
  }

  private buildQuery() {
    const { search, startDate, endDate, organizationId } =
      this.filterForm.value;
    return {
      page: this.page,
      pageSize: this.pageSize,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: this.selectedStatuses.length ? this.selectedStatuses : undefined,
      organizationId: organizationId ? Number(organizationId) : undefined,
    };
  }

  refreshPaginated() {
    this.loading = true;
    const query = this.buildQuery();
    this.stockTransferService.getStockTransfers(query).subscribe({
      next: (res) => {
        this.stockTransfers = res.data.map((t) =>
          this.stockTransferService.parseTransferItems(t)
        );
        this.meta = res.meta;
        this.loading = false;
      },
      error: (err) => {
        console.error('Paginated load failed', err);
        this.loading = false;
      },
    });
  }

  onStatusToggle(status: StockTransferStatus) {
    if (this.selectedStatuses.includes(status)) {
      this.selectedStatuses = this.selectedStatuses.filter((s) => s !== status);
    } else {
      this.selectedStatuses.push(status);
    }
    this.page = 1;
    this.refreshPaginated();
  }

  onDateChange() {
    this.page = 1;
    this.refreshPaginated();
  }

  // Quick date filters
  applyQuickRange(range: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth') {
    const now = new Date();
    let start: Date;
    let end: Date;
    switch (range) {
      case 'today':
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        break;
      case 'yesterday':
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = new Date(
          y.getFullYear(),
          y.getMonth(),
          y.getDate(),
          0,
          0,
          0,
          0
        );
        end = new Date(
          y.getFullYear(),
          y.getMonth(),
          y.getDate(),
          23,
          59,
          59,
          999
        );
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        break;
      case 'lastMonth':
        const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthEnd = new Date(firstThisMonth.getTime() - 1); // last ms of previous month
        start = new Date(
          lastMonthEnd.getFullYear(),
          lastMonthEnd.getMonth(),
          1,
          0,
          0,
          0,
          0
        );
        end = new Date(
          lastMonthEnd.getFullYear(),
          lastMonthEnd.getMonth(),
          lastMonthEnd.getDate(),
          23,
          59,
          59,
          999
        );
        break;
      default:
        return;
    }
    this.setDateRange(start, end);
  }

  setDateRange(start: Date, end: Date) {
    this.filterForm.patchValue({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    this.page = 1;
    this.refreshPaginated();
  }

  clearDateRange() {
    this.filterForm.patchValue({ startDate: '', endDate: '' });
    this.page = 1;
    this.refreshPaginated();
  }

  changePage(page: number) {
    if (!this.meta) return;
    if (page < 1 || page > this.meta.totalPages) return;
    this.page = page;
    this.refreshPaginated();
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.refreshPaginated();
  }

  resetFilters() {
    this.filterForm.reset({
      search: '',
      startDate: '',
      endDate: '',
      organizationId: '',
    });
    this.selectedStatuses = [];
    this.page = 1;
    this.pageSize = 20;
    this.refreshPaginated();
  }

  // Filter methods for different views
  getIncomingTransfers(): StockTransfer[] {
    const currentOrgId = localStorage.getItem('organizationId');
    return this.stockTransfers.filter(
      (t) => t.toOrganizationId.toString() === currentOrgId
    );
  }

  getOutgoingTransfers(): StockTransfer[] {
    const currentOrgId = localStorage.getItem('organizationId');
    return this.stockTransfers.filter(
      (t) => t.fromOrganizationId.toString() === currentOrgId
    );
  }

  getTransfersByStatus(status: StockTransferStatus): StockTransfer[] {
    return this.stockTransfers.filter((t) => t.status === status);
  }

  // Helper method to ensure items are always an array
  getTransferItems(transfer: StockTransfer): StockTransferItem[] {
    if (!transfer.items) {
      return [];
    }

    if (typeof transfer.items === 'string') {
      try {
        return JSON.parse(transfer.items);
      } catch (error) {
        console.error('Error parsing transfer items:', error);
        return [];
      }
    }

    return transfer.items;
  }

  /**
   * Open view transfer details modal
   */
  viewTransferDetails(transfer: StockTransfer): void {
    console.log('Opening transfer details for:', transfer);

    this.viewTransferDetailsDialog.openDialog({
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
      payload: transfer,
    });
  }

  /**
   * TrackBy function for transfer list performance
   */
  trackByTransfer(index: number, transfer: StockTransfer): number {
    return transfer.id;
  }

  /**
   * Get total value of all transfers
   */
  getTotalTransferValue(): number {
    return this.stockTransfers.reduce((sum, transfer) => {
      return sum + (transfer.totalValue || 0);
    }, 0);
  }
}
