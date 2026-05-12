import { Component, HostListener } from '@angular/core';
import { Sales } from '../../../../shared/interfaces/sales.interface';
import { SalesService } from '../../../../shared/Services/sales.service';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { RefundComponent } from '../refund/refund.component';
import { ViewOrderDetailsComponent } from '../view-order-details/view-order-details.component';
import { BaseComponent } from '../../../../shared/components/base/base.component';
import { ReceiptService } from '../../services/receiprt.service';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import { PermissionService } from '../../../../shared/Services/permission.service';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { DocumentPrintService } from '../../../../shared/services/document-print.service';
import { DocumentData } from '../../../../shared/services/document-template.service';
import { DocumentTypeSettings } from '../../../../shared/interfaces/settings.interface';

@Component({
  selector: 'app-show-sales',
  templateUrl: './show-sales.component.html',
  styleUrls: ['./show-sales.component.scss'],
})
export class ShowSalesComponent extends BaseComponent {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    RefundComponent,
  );
  private viewDialog: DialogRemoteControl = new DialogRemoteControl(
    ViewOrderDetailsComponent,
  );

  sales: Sales[] = [];
  selectedShift: string = '';
  selectedDay: string = '';
  dropdownOpen: boolean = false;
  searchTerm: string = '';
  searchQuery: string = ''; // Search for order number or customer name
  isLoading: boolean = false;
  shifts: string[] = [
    'Morning Shift',
    'Afternoon Shift',
    'Night Shift',
    'Weekend Shift',
    'Holiday Shift',
    'Early Morning Shift',
  ];
  startDate: string = '';
  endDate: string = '';
  totalSales: number = 0;
  currencySymbol: string = 'KSh';
  filteredShifts: string[] = [...this.shifts];
  orgDetails: any;

  // Permission flags
  canUpdateSale: boolean = false;
  canDeleteSale: boolean = false;
  hasModuleAccess: boolean = false;

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

  // Document print settings modal
  docPrintModalOpen = false;
  docPrintData: DocumentData | null = null;

  constructor(
    private salesService: SalesService,
    private receiptService: ReceiptService,
    private orgDetailsService: OrgDetailsService,
    private permissionService: PermissionService,
    private customerService: CustomerService,
    private documentPrintService: DocumentPrintService,
  ) {
    super();
  }

  ngOnInit(): void {
    // Load permissions first
    this.loadPermissions();

    // Check if user has access to sales module
    if (!this.hasModuleAccess) {
      this.toast.error("You don't have access to the sales module");
      return;
    }

    this.loadOrgDetails();
    // Initialize with today's filter
    this.selectQuickFilter('today');
  }

  /**
   * Load permissions for sales module
   */
  private loadPermissions(): void {
    // Check if user has access to sales module
    this.hasModuleAccess = this.permissionService.hasModuleAccess('sales');

    // Only check update and delete - viewing is allowed if they have module access
    this.canUpdateSale = this.permissionService.canPerformAction(
      'sales',
      'update',
    );
    this.canDeleteSale = this.permissionService.canPerformAction(
      'sales',
      'delete',
    );


  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    this.orgDetailsService.getById(+currentOrgId!).subscribe(
      (details: any) => {
        if (details) {
          this.orgDetails = details;
          if (details.currency) {
            this.currencySymbol = details.currency;
          }
        }
      },
      (error) => {},
    );
  }

  getSales(): void {
    this.isLoading = true;
    if (!this.selectedDay) {
      this.selectedDay = this.formatDate(new Date());
    }
    this.salesService
      .getSalesByDateRange(this.selectedDay, this.selectedDay)
      .subscribe({
        next: (sales) => {
          this.sales = sales.orders.sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          this.totalSales = sales.totalEarnings;
        },
        error: (error) => {
          console.error('Error fetching sales:', error);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  getSalesForRange(): void {
    let startDate = this.startDate;
    let endDate = this.endDate;

    // When searching, ignore date filters and search all time (5 years back)
    if (this.searchQuery && this.searchQuery.trim()) {
      const today = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      startDate = this.formatDate(fiveYearsAgo);
      endDate = this.formatDate(today);
    }

    if (!startDate || !endDate) {
      return;
    }

    this.isLoading = true;
    this.salesService
      .getSalesByDateRange(
        startDate,
        endDate,
        this.searchQuery?.trim() || undefined,
      )
      .subscribe({
        next: (sales) => {
          this.sales = sales.orders.sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          this.totalSales = sales.totalEarnings;
        },
        error: (error) => {
          console.error('Error fetching sales range:', error);
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  /**
   * Search sales by order number or customer name
   */
  onSearch(): void {
    this.getSalesForRange();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.getSalesForRange();
  }

  parseItems(items: any): any[] {
    try {
      return JSON.parse(items);
    } catch (error) {
      console.error('Error parsing items:', error);
      return [];
    }
  }

  openDialog(optionalPayload?: any) {
    this.dialog.options = {
      width: '1000px',
      height: '100vh',
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog(optionalPayload).subscribe();
    // this.printReceipt(sales);
  }

  softDelete(id: number) {
    // Check permission first
    if (!this.canDeleteSale) {
      this.toast.error("You don't have permission to void/delete sales");
      return;
    }

    const confirmation = confirm('Are you sure you want to void this sale?');
    if (confirmation) {
      this.salesService.softDeleteSales(id).subscribe(
        (response) => {
          this.toast.success('Sale voided successfully');
          this.getSales();
        },
        (error) => {
          console.error('Error deleting sale', error);
          this.toast.error('Failed to void sale');
        },
      );
    }
  }
  openViewDialog(sale: any) {
    // First fetch the full sale details with items
    this.salesService.getSalesbyId(sale.id).subscribe({
      next: (fullSaleDetails: any) => {
        this.viewDialog.options = {
          showOverlay: true,
          animationIn: AppearanceAnimation.ZOOM_IN,
          animationOut: DisappearanceAnimation.ZOOM_OUT,
        };

        this.viewDialog.openDialog(fullSaleDetails).subscribe((resp) => {});
      },
      error: (error) => {
        console.error('Error fetching sale details:', error);
        this.toast.error('Failed to load sale details');
      },
    });
  }
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async printReceipt(order: any) {
    try {
      const data = this.documentPrintService.normalizeSaleData(
        order,
        this.orgDetails,
      );
      await this.documentPrintService.print('sale', data);
    } catch (error: any) {
      console.error('Print error:', error);
      const errorMessage = error?.message || 'Failed to print receipt';
      this.toast.error(errorMessage);
    }
  }

  openDocPrintModal(order: any): void {
    // If the sale has a real customer (not walk-in), fetch full customer details
    // to get phone, KRA PIN, and customerType (not included in order response)
    const openModal = (enrichedOrder: any) => {
      this.docPrintData = this.documentPrintService.normalizeSaleData(
        enrichedOrder,
        this.orgDetails,
      );
      this.docPrintModalOpen = true;
    };

    if (order.customerId && order.customerId !== 0) {
      this.customerService.getCustomerbyId(order.customerId).subscribe({
        next: (customer: any) => openModal({ ...order, customer }),
        error: () => openModal(order),
      });
    } else {
      openModal(order);
    }
  }

  closeDocPrintModal(): void {
    this.docPrintModalOpen = false;
    this.docPrintData = null;
  }

  async printThermalReceipt(order: any) {
    try {
      await this.receiptService.printThermalReceipt(order, this.orgDetails);
    } catch (error: any) {
      console.error('Thermal print error:', error);
      const errorMessage = error?.message || 'Failed to print thermal receipt';
      this.toast.error(errorMessage);
    }
  }

  async printDeliveryNote(order: any) {
    try {
      if (!this.orgDetails) {
        this.toast.error('Organization details not loaded');
        return;
      }

      await this.receiptService.printDeliveryNote(order, this.orgDetails);
    } catch (error: any) {
      console.error('Print delivery note error:', error);
      const errorMessage = error?.message || 'Failed to print delivery note';
      this.toast.error(errorMessage);
    }
  }
  navigate(sale: Sales) {
    // Check permission first
    if (!this.canUpdateSale) {
      this.toast.error("You don't have permission to update sales");
      return;
    }

    const url = `/updateSale/${sale.id}`;
    this.openLink(url);
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
    } else if (type === 'single' && this.selectedDay) {
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
        (f) => f.value === this.selectedQuickFilter,
      );
      return filter ? filter.label : 'Today';
    } else if (this.filterType === 'single') {
      return this.selectedDay
        ? this.formatDateDisplay(new Date(this.selectedDay))
        : 'Select Date';
    } else {
      if (this.startDate && this.endDate) {
        return `${this.formatDateDisplay(
          new Date(this.startDate),
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
}
