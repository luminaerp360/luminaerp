// show-credit-sales.component.ts
import { Component, HostListener } from '@angular/core';
import { CreditSale } from '../../../../../shared/interfaces/cretitSale.interface';
import { CreditSaleService } from '../../../../../shared/Services/credit-sale.service';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { CreditPaymentsComponent } from '../credit-payments/credit-payments.component';
import { ViewCreditSaleDetailsComponent } from '../../view-credit-sale-details/view-credit-sale-details.component';
import { MakeCreditSalesComponent } from '../make-credit-sales/make-credit-sales.component';
import { BaseComponent } from '../../../../../shared/components/base/base.component';
import { OrgDetailsService } from '../../../../../shared/Services/org-details.service';
import { CreditReceiptService } from '../../../services/creditReceipt.service';
import { PermissionService } from '../../../../../shared/Services/permission.service';

@Component({
  selector: 'app-show-credit-sales',
  templateUrl: './show-credit-sales.component.html',
  styleUrls: ['./show-credit-sales.component.scss'],
})
export class ShowCreditSalesComponent extends BaseComponent {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    CreditPaymentsComponent
  );
  private viewDialog: DialogRemoteControl = new DialogRemoteControl(
    ViewCreditSaleDetailsComponent
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    MakeCreditSalesComponent
  );

  sales: CreditSale[] = [];
  paidSales: CreditSale[] = [];
  endDate: string = '';
  startDate: string = '';
  selectedDate: string = '';
  totalCreditSales: number = 0;
  totalPaidCreditSales: number = 0;
  isLoading: boolean = false;
  currencySymbol: string = 'KSh';
  orgDetails: any;

  // PDF-related properties
  selectedSales: Set<number> = new Set();
  isDownloadingPDF: boolean = false;
  downloadProgress: string = '';
  openDropdowns: Set<number> = new Set();

  // Quick filter properties
  filterType: 'quick' | 'single' | 'range' = 'quick';
  selectedQuickFilter: string = 'today';
  quickFilters = [
    { value: 'today', label: 'Today', icon: 'bi-calendar-day' },
    { value: 'yesterday', label: 'Yesterday', icon: 'bi-calendar-minus' },
    { value: 'thisWeek', label: 'This Week', icon: 'bi-calendar-week' },
    { value: 'lastWeek', label: 'Last Week', icon: 'bi-calendar2-week' },
    { value: 'thisMonth', label: 'This Month', icon: 'bi-calendar-month' },
    { value: 'lastMonth', label: 'Last Month', icon: 'bi-calendar2-month' },
    { value: 'thisYear', label: 'This Year', icon: 'bi-calendar-range' },
  ];

  constructor(
    private salesService: CreditSaleService,
    private orgDetailsService: OrgDetailsService,
    private creditReceiptService: CreditReceiptService,
    private permissionService: PermissionService
  ) {
    super();
  }

  // Permission flags
  canUpdateSale: boolean = false;
  canDeleteSale: boolean = false;
  hasModuleAccess: boolean = false;

  ngOnInit(): void {
    // Load permissions first
    this.loadPermissions();

    // Check module access
    if (!this.hasModuleAccess) {
      this.toast.error("You don't have access to the credit sales module");
      return;
    }
    this.loadOrgDetails();
    // Initialize with today's filter
    this.selectQuickFilter('today');
  }

  /**
   * Load permissions for credit sales module
   */
  private loadPermissions(): void {
    this.hasModuleAccess = this.permissionService.hasModuleAccess('sales');
    this.canUpdateSale = this.permissionService.canPerformAction(
      'sales',
      'update'
    );
    this.canDeleteSale = this.permissionService.canPerformAction(
      'sales',
      'delete'
    );

    console.log('=== Credit Sales Permissions Debug ===');
    console.log('Has Module Access (sales):', this.hasModuleAccess);
    console.log('Can Update Sale:', this.canUpdateSale);
    console.log('Can Delete Sale:', this.canDeleteSale);
    console.log('All Permissions:', this.permissionService.getPermissions());
  }

  // Add these methods
  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) return;

    this.orgDetailsService.getById(+currentOrgId).subscribe({
      next: (details: any) => {
        if (details) {
          this.orgDetails = details;
          if (details.currency) {
            this.currencySymbol = details.currency;
          }
        }
      },
      error: (error) => {
        this.toast.error('Failed to load organization details');
      },
    });
  }

  getSales(): void {
    this.isLoading = true;
    if (!this.selectedDate) {
      this.selectedDate = this.formatDate(new Date());
    }

    this.salesService
      .getAllCreditSale()
      .subscribe({
        next: (sales: CreditSale[]) => {
          // Add isPaid flag to all sales
          const allSales = sales.map((sale: CreditSale) => ({
            ...sale,
            isPaid: sale.fully_paid === 1,
          }));

          // Filter by selected date if specified
          if (this.selectedDate) {
            const selectedDay = new Date(this.selectedDate);
            selectedDay.setHours(0, 0, 0, 0);
            const nextDay = new Date(selectedDay);
            nextDay.setDate(selectedDay.getDate() + 1);

            this.sales = allSales.filter((sale: CreditSale) => {
              const saleDate = new Date(sale.createdAt || sale.order_date);
              return saleDate >= selectedDay && saleDate < nextDay;
            }).sort((a: any, b: any) => 
              new Date(b.createdAt || b.order_date).getTime() - new Date(a.createdAt || a.order_date).getTime()
            );
          } else {
            this.sales = allSales.sort((a: any, b: any) => 
              new Date(b.createdAt || b.order_date).getTime() - new Date(a.createdAt || a.order_date).getTime()
            );
          }

          // Calculate totals
          this.totalCreditSales = this.sales
            .filter(s => !s.isPaid)
            .reduce((sum, sale) => sum + (sale.credit_amount || 0), 0);
          this.totalPaidCreditSales = this.sales
            .filter(s => s.isPaid)
            .reduce((sum, sale) => sum + (sale.credit_amount || 0), 0);
        },
        error: (error) => {
          console.error('Error fetching sales:', error);
          this.toast.error('Failed to load credit sales');
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  getSalesForRange(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    this.isLoading = true;

    this.salesService
      .getAllCreditSale()
      .subscribe({
        next: (sales: CreditSale[]) => {
          // Add isPaid flag to all sales
          const allSales = sales.map((sale: CreditSale) => ({
            ...sale,
            isPaid: sale.fully_paid === 1,
          }));

          // Filter by date range
          const start = new Date(this.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(this.endDate);
          end.setHours(23, 59, 59, 999);

          this.sales = allSales.filter((sale: CreditSale) => {
            const saleDate = new Date(sale.createdAt || sale.order_date);
            return saleDate >= start && saleDate <= end;
          }).sort((a: any, b: any) => 
            new Date(b.createdAt || b.order_date).getTime() - new Date(a.createdAt || a.order_date).getTime()
          );

          // Calculate totals
          this.totalCreditSales = this.sales
            .filter(s => !s.isPaid)
            .reduce((sum, sale) => sum + (sale.credit_amount || 0), 0);
          this.totalPaidCreditSales = this.sales
            .filter(s => s.isPaid)
            .reduce((sum, sale) => sum + (sale.credit_amount || 0), 0);
        },
        error: (error) => {
          console.error('Error fetching sales range:', error);
          this.toast.error('Failed to load credit sales');
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  openDialog(creditSale: CreditSale) {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog(creditSale).subscribe((resp) => {
      this.getSales();
    });
  }

  navigate(sale: CreditSale) {
    // Check permission first
    if (!this.canUpdateSale) {
      this.toast.error("You don't have permission to update credit sales");
      return;
    }

    const url = `/update-credit/${sale.id}`;
    this.openLink(url);
  }

  softDelete(id: number) {
    // Check permission first
    if (!this.canDeleteSale) {
      this.toast.error("You don't have permission to void/delete credit sales");
      return;
    }

    const confirmation = confirm(
      'Are you sure you want to void this credit sale?'
    );
    if (confirmation) {
      this.salesService.deleteCreditSale(id).subscribe(
        (response: any) => {
          this.toast.success('Credit sale voided successfully');
          this.getSales();
        },
        (error: any) => {
          console.error('Error deleting credit sale', error);
          this.toast.error('Failed to void credit sale');
        }
      );
    }
  }

  /**
   * Delete credit sale with confirmation dialog
   */
  deleteCreditSale(sale: CreditSale) {
    // Check permission first
    if (!this.canDeleteSale) {
      this.toast.error("You don't have permission to delete credit sales");
      return;
    }

    const confirmation = confirm(
      `Are you sure you want to delete Credit Sale #${sale.id}?\n\n` +
      `Customer: ${sale.customer_name || 'N/A'}\n` +
      `Amount: Ksh. ${sale.credit_amount}\n\n` +
      `This action cannot be undone.`
    );

    if (confirmation) {
      this.salesService.deleteCreditSale(sale.id!).subscribe({
        next: (response: any) => {
          this.toast.success('Credit sale deleted successfully');
          // Refresh the list
          if (this.filterType === 'quick') {
            this.selectQuickFilter(this.selectedQuickFilter);
          } else if (this.filterType === 'single') {
            this.getSales();
          } else {
            this.getSalesForRange();
          }
        },
        error: (error: any) => {
          console.error('Error deleting credit sale', error);
          this.toast.error('Failed to delete credit sale');
        }
      });
    }
  }

  openViewDialog(sale: CreditSale) {
    // First fetch the full credit sale details with items
    this.salesService.getCreditSalebyId(sale.id!).subscribe({
      next: (fullSaleDetails: CreditSale) => {
        this.viewDialog.options = {
          showOverlay: true,
          animationIn: AppearanceAnimation.ZOOM_IN,
          animationOut: DisappearanceAnimation.ZOOM_OUT,
        };

        this.viewDialog.openDialog(fullSaleDetails).subscribe();
      },
      error: (error) => {
        console.error('Error fetching credit sale details:', error);
        this.toast.error('Failed to load credit sale details');
      },
    });
  }

  printCreditInvoice(creditSale: CreditSale) {
    try {
      if (!this.orgDetails) {
        this.toast.error('Organization details not loaded');
        return;
      }

      // First fetch the full credit sale details with items (similar to openViewDialog)
      this.salesService.getCreditSalebyId(creditSale.id!).subscribe({
        next: (fullSaleDetails: CreditSale) => {
          console.log(
            'Full credit sale details for printing:',
            fullSaleDetails
          );
          this.creditReceiptService.printCreditInvoice(
            fullSaleDetails,
            this.orgDetails
          );
        },
        error: (error) => {
          console.error(
            'Error fetching credit sale details for printing:',
            error
          );
          this.toast.error('Failed to load credit sale details for printing');
        },
      });
    } catch (error) {
      console.error('Print error:', error);
      this.toast.error('Failed to print invoice');
    }
  }

  printDeliveryNote(creditSale: CreditSale) {
    try {
      if (!this.orgDetails) {
        this.toast.error('Organization details not loaded');
        return;
      }

      // Fetch the full credit sale details with items for delivery note
      this.salesService.getCreditSalebyId(creditSale.id!).subscribe({
        next: (fullSaleDetails: CreditSale) => {
          console.log(
            'Full credit sale details for delivery note:',
            fullSaleDetails
          );
          this.creditReceiptService.printDeliveryNote(
            fullSaleDetails,
            this.orgDetails
          );
        },
        error: (error) => {
          console.error(
            'Error fetching credit sale details for delivery note:',
            error
          );
          this.toast.error(
            'Failed to load credit sale details for delivery note'
          );
        },
      });
    } catch (error) {
      console.error('Print delivery note error:', error);
      this.toast.error('Failed to print delivery note');
    }
  }

  // ======================
  // PDF DOWNLOAD METHODS
  // ======================

  /**
   * Download PDF invoice for a single credit sale
   */
  downloadPDFInvoice(
    creditSale: CreditSale,
    format: 'invoice' | 'receipt' = 'invoice'
  ) {
    this.isDownloadingPDF = true;
    this.downloadProgress = `Generating ${format}...`;

    this.salesService
      .downloadCreditSaleInvoicePDF(creditSale.id!, format)
      .subscribe({
        next: (response) => {
          this.salesService.downloadBlob(
            response,
            `credit-sale-${format}-${creditSale.id!}.pdf`
          );
          this.toast.success(
            `${
              format.charAt(0).toUpperCase() + format.slice(1)
            } downloaded successfully`
          );
        },
        error: (error) => {
          console.error('PDF download error:', error);
          this.toast.error(`Failed to download ${format}`);
        },
        complete: () => {
          this.isDownloadingPDF = false;
          this.downloadProgress = '';
        },
      });
  }

  /**
   * Preview PDF invoice in new tab
   */
  previewPDFInvoice(
    creditSale: CreditSale,
    format: 'invoice' | 'receipt' = 'invoice'
  ) {
    this.isDownloadingPDF = true;
    this.downloadProgress = `Generating ${format} preview...`;

    this.salesService
      .previewCreditSaleInvoicePDF(creditSale.id!, format)
      .subscribe({
        next: (response) => {
          this.salesService.openPDFInNewTab(response);
          this.toast.success(
            `${format.charAt(0).toUpperCase() + format.slice(1)} preview opened`
          );
        },
        error: (error) => {
          console.error('PDF preview error:', error);
          this.toast.error(`Failed to preview ${format}`);
        },
        complete: () => {
          this.isDownloadingPDF = false;
          this.downloadProgress = '';
        },
      });
  }

  /**
   * Bulk download selected credit sales as ZIP
   */
  bulkDownloadSelected(format: 'invoice' | 'receipt' = 'invoice') {
    const selectedIds = Array.from(this.selectedSales);

    if (selectedIds.length === 0) {
      this.toast.warning('Please select credit sales to download');
      return;
    }

    this.isDownloadingPDF = true;
    this.downloadProgress = `Generating ${selectedIds.length} ${format}s...`;

    this.salesService
      .bulkDownloadCreditSalesPDF(selectedIds, format)
      .subscribe({
        next: (response) => {
          this.salesService.downloadBlob(
            response,
            `credit-sales-bulk-${format}.zip`
          );
          this.toast.success(
            `${selectedIds.length} ${format}s downloaded as ZIP`
          );
          this.clearSelection();
        },
        error: (error) => {
          console.error('Bulk PDF download error:', error);
          this.toast.error('Failed to download bulk PDFs');
        },
        complete: () => {
          this.isDownloadingPDF = false;
          this.downloadProgress = '';
        },
      });
  }

  /**
   * Download unpaid credit sales report as PDF
   */
  downloadUnpaidReport() {
    this.isDownloadingPDF = true;
    this.downloadProgress = 'Generating unpaid sales report...';

    const filters = {
      startDate: this.startDate,
      endDate: this.endDate,
    };

    this.salesService.downloadUnpaidReportPDF(filters).subscribe({
      next: (response) => {
        this.salesService.downloadBlob(
          response,
          'unpaid-credit-sales-report.pdf'
        );
        this.toast.success('Unpaid sales report downloaded');
      },
      error: (error) => {
        console.error('Report download error:', error);
        this.toast.error('Failed to download report');
      },
      complete: () => {
        this.isDownloadingPDF = false;
        this.downloadProgress = '';
      },
    });
  }

  /**
   * Download current sales summary report
   */
  downloadSalesSummaryReport() {
    this.isDownloadingPDF = true;
    this.downloadProgress = 'Generating sales summary report...';

    // Use the same date range as currently displayed
    const filters = {
      startDate: this.startDate || this.selectedDate,
      endDate: this.endDate || this.selectedDate,
    };

    this.salesService.downloadUnpaidReportPDF(filters).subscribe({
      next: (response) => {
        this.salesService.downloadBlob(response, 'credit-sales-summary.pdf');
        this.toast.success('Sales summary report downloaded');
      },
      error: (error) => {
        console.error('Summary report download error:', error);
        this.toast.error('Failed to download summary report');
      },
      complete: () => {
        this.isDownloadingPDF = false;
        this.downloadProgress = '';
      },
    });
  }

  // ======================
  // SELECTION METHODS
  // ======================

  /**
   * Toggle selection of a credit sale
   */
  toggleSelection(creditSale: CreditSale) {
    if (this.selectedSales.has(creditSale.id!)) {
      this.selectedSales.delete(creditSale.id!);
    } else {
      this.selectedSales.add(creditSale.id!);
    }
  }

  /**
   * Check if a credit sale is selected
   */
  isSelected(creditSale: CreditSale): boolean {
    return this.selectedSales.has(creditSale.id!);
  }

  /**
   * Toggle select all/none
   */
  toggleSelectAll() {
    if (this.selectedSales.size === this.sales.length) {
      this.selectedSales.clear();
    } else {
      this.sales.forEach((sale) => this.selectedSales.add(sale.id!));
    }
  }

  /**
   * Check if all sales are selected
   */
  isAllSelected(): boolean {
    return (
      this.sales.length > 0 && this.selectedSales.size === this.sales.length
    );
  }

  /**
   * Get count of selected sales
   */
  getSelectedCount(): number {
    return this.selectedSales.size;
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedSales.clear();
  }

  /**
   * Check if some (but not all) sales are selected
   */
  isIndeterminate(): boolean {
    return (
      this.selectedSales.size > 0 && this.selectedSales.size < this.sales.length
    );
  }

  // ======================
  // DROPDOWN METHODS
  // ======================

  /**
   * Toggle dropdown for PDF options
   */
  toggleDropdown(saleId: number) {
    if (this.openDropdowns.has(saleId)) {
      this.openDropdowns.delete(saleId);
    } else {
      // Close all other dropdowns first
      this.openDropdowns.clear();
      this.openDropdowns.add(saleId);
    }
  }

  /**
   * Check if dropdown is open for a specific sale
   */
  isDropdownOpen(saleId: number): boolean {
    return this.openDropdowns.has(saleId);
  }

  /**
   * Close specific dropdown
   */
  closeDropdown() {
    this.openDropdowns.clear();
  }

  // Quick filter methods
  selectQuickFilter(filterValue: string) {
    this.selectedQuickFilter = filterValue;
    this.filterType = 'quick';
    this.applyQuickFilter(filterValue);
  }

  selectFilterType(type: 'quick' | 'single' | 'range') {
    this.filterType = type;
    if (type === 'quick') {
      this.applyQuickFilter(this.selectedQuickFilter);
    } else if (type === 'single' && this.selectedDate) {
      this.getSales();
    } else if (type === 'range' && this.startDate && this.endDate) {
      this.getSalesForRange();
    }
  }

  private applyQuickFilter(filterValue: string) {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (filterValue) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = new Date(start);
        break;
      case 'thisWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(today);
        break;
      case 'lastWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today);
        break;
      default:
        start = new Date(today);
        end = new Date(today);
    }

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.getSalesForRange();
  }

  getFilterLabel(): string {
    if (this.filterType === 'quick') {
      const filter = this.quickFilters.find(
        (f) => f.value === this.selectedQuickFilter
      );
      return filter ? filter.label : 'Today';
    } else if (this.filterType === 'single') {
      return this.selectedDate
        ? this.formatDateDisplay(new Date(this.selectedDate))
        : 'Select Date';
    } else {
      if (this.startDate && this.endDate) {
        return `${this.formatDateDisplay(
          new Date(this.startDate)
        )} - ${this.formatDateDisplay(new Date(this.endDate))}`;
      }
      return 'Select Range';
    }
  }

  private formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Host listener to close dropdowns when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('[id^="pdf-menu-"]') && !target.closest('.relative')) {
      this.openDropdowns.clear();
    }
  }
}
