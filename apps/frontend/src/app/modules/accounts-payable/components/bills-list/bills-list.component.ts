import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountsPayableService } from '../../../../shared/Services/accounts-payable.service';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import { BillFormComponent } from '../bill-form/bill-form.component';
import { BillPaymentFormComponent } from '../bill-payment-form/bill-payment-form.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import {
  Bill,
  BillsResponse,
  BillStatus,
} from '../../../../shared/interfaces/bill.interface';
import { finalize } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-bills-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './bills-list.component.html',
  styleUrls: ['./bills-list.component.scss'],
})
export class BillsListComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    BillFormComponent,
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    BillFormComponent,
  );
  private paymentDialog: DialogRemoteControl = new DialogRemoteControl(
    BillPaymentFormComponent,
  );

  bills: Bill[] = [];
  filteredBills: Bill[] = [];
  loading = false;
  error: string | null = null;
  filterForm: FormGroup = new FormGroup({});
  hasInitialized: boolean = false;
  orgDetails: any;

  // Summary metrics
  summary = {
    totalBills: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    draftCount: 0,
    approvedCount: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    overdueCount: 0,
  };

  // Filter properties
  selectedStatus: BillStatus | '' = '';
  selectedSupplierId: number | null = null;
  searchQuery: string = '';

  // Quick filter properties
  filterType: 'quick' | 'single' | 'range' = 'quick';
  selectedQuickFilter: string = 'thisMonth';
  quickFilters = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
  ];

  // Grouping
  groupBySupplier: boolean = false;
  groupedBills: Record<string, Bill[]> = {};
  supplierTotals: Record<
    string,
    { total: number; paid: number; balance: number; count: number }
  > = {};

  billStatuses = Object.values(BillStatus);
  suppliers: { id: number; name: string }[] = [];

  // Confirmation dialog properties
  showDeleteConfirm = false;
  billToDelete: Bill | null = null;
  showApproveConfirm = false;
  billToApprove: Bill | null = null;
  isDeleting = false;
  isApproving = false;

  constructor(
    private accountsPayableService: AccountsPayableService,
    private suppliersService: SuppliersService,
    private orgDetailsService: OrgDetailsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.initializeFilterForm();
  }

  private initializeFilterForm() {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      dueStartDate: [''],
      dueEndDate: [''],
      supplierId: [''],
      status: [''],
    });

    this.filterForm.valueChanges.subscribe(() => {
      if (this.filterForm.dirty) {
        this.applyFilters();
      }
    });
  }

  ngOnInit(): void {
    this.loadOrgDetails();
    this.selectQuickFilter('thisMonth');
    this.loadSuppliers();
  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    this.orgDetailsService.getById(+currentOrgId!).subscribe({
      next: (details: any) => {
        if (details) {
          this.orgDetails = details;
        }
      },
      error: (error) => {
        console.error('Error loading org details:', error);
      },
    });
  }

  // Quick filter methods
  selectQuickFilter(filterValue: string) {
    this.selectedQuickFilter = filterValue;
    this.filterType = 'quick';
    this.applyQuickFilter(filterValue);
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

    this.filterForm.patchValue({
      startDate: this.formatISO(start),
      endDate: this.formatISO(end),
    });

    this.loadBills();
  }

  private formatISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  loadBills() {
    this.loading = true;
    this.error = null;

    this.accountsPayableService
      .getAllBills()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: BillsResponse) => {
          this.bills = response.bills;
          this.summary = response.summary;
          this.applyFilters();
          this.hasInitialized = true;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.error = 'Failed to load bills. Please try again later.';
          console.error('Error loading bills:', error);
          this.cdr.detectChanges();
        },
      });
  }

  private loadSuppliers() {
    this.suppliersService.getAllSupplier().subscribe({
      next: (suppliers: any[]) => {
        this.suppliers = suppliers
          .map((supplier) => ({
            id: supplier.id,
            name: supplier.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading suppliers:', error);
        // Fallback: extract from bills if suppliers service fails
        if (this.bills.length > 0) {
          this.suppliers = [...new Set(this.bills.map((bill) => bill.supplier))]
            .map((supplier) => ({ id: supplier.id, name: supplier.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        }
        this.cdr.detectChanges();
      },
    });
  }

  applyFilters() {
    let filtered = [...this.bills];

    // Status filter
    if (this.selectedStatus) {
      filtered = filtered.filter((bill) => bill.status === this.selectedStatus);
    }

    // Supplier filter
    if (this.selectedSupplierId) {
      filtered = filtered.filter(
        (bill) => bill.supplierId === this.selectedSupplierId,
      );
    }

    // Search query filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bill) =>
          bill.billNumber.toLowerCase().includes(query) ||
          bill.supplier.name.toLowerCase().includes(query) ||
          (bill.description && bill.description.toLowerCase().includes(query)),
      );
    }

    // Date filters
    const formValue = this.filterForm.value;
    if (formValue.startDate) {
      const startDate = new Date(formValue.startDate);
      filtered = filtered.filter(
        (bill) => new Date(bill.billDate) >= startDate,
      );
    }
    if (formValue.endDate) {
      const endDate = new Date(formValue.endDate);
      filtered = filtered.filter((bill) => new Date(bill.billDate) <= endDate);
    }
    if (formValue.dueStartDate) {
      const dueStartDate = new Date(formValue.dueStartDate);
      filtered = filtered.filter(
        (bill) => new Date(bill.dueDate) >= dueStartDate,
      );
    }
    if (formValue.dueEndDate) {
      const dueEndDate = new Date(formValue.dueEndDate);
      filtered = filtered.filter(
        (bill) => new Date(bill.dueDate) <= dueEndDate,
      );
    }

    this.filteredBills = filtered;

    // Apply grouping if enabled
    if (this.groupBySupplier) {
      this.groupBillsBySupplier();
    }
  }

  toggleGroupBySupplier() {
    this.groupBySupplier = !this.groupBySupplier;
    if (this.groupBySupplier) {
      this.groupBillsBySupplier();
    }
  }

  private groupBillsBySupplier() {
    this.groupedBills = {};
    this.supplierTotals = {};

    this.filteredBills.forEach((bill) => {
      const supplierId = bill.supplierId.toString();
      if (!this.groupedBills[supplierId]) {
        this.groupedBills[supplierId] = [];
        this.supplierTotals[supplierId] = {
          total: 0,
          paid: 0,
          balance: 0,
          count: 0,
        };
      }
      this.groupedBills[supplierId].push(bill);
      this.supplierTotals[supplierId].total += bill.netAmount;
      this.supplierTotals[supplierId].paid += bill.paidAmount;
      this.supplierTotals[supplierId].balance += bill.balanceAmount;
      this.supplierTotals[supplierId].count++;
    });
  }

  getSupplierName(supplierId: string): string {
    const bills = this.groupedBills[supplierId];
    return bills && bills.length > 0
      ? bills[0].supplier.name
      : 'Unknown Supplier';
  }

  get groupedSupplierIds(): string[] {
    return Object.keys(this.groupedBills);
  }

  openBillForm(bill?: Bill) {
    if (bill) {
      this.updateDialog.openDialog(bill).subscribe((result: any) => {
        if (result) {
          this.loadBills();
        }
      });
    } else {
      this.dialog.openDialog().subscribe((result: any) => {
        if (result) {
          this.loadBills();
        }
      });
    }
  }

  openPaymentForm(bill: Bill) {
    this.paymentDialog.openDialog(bill).subscribe((result: any) => {
      if (result) {
        this.loadBills();
      }
    });
  }

  confirmApproveBill(bill: Bill) {
    this.billToApprove = bill;
    this.showApproveConfirm = true;
  }

  approveBill() {
    if (!this.billToApprove) return;

    this.isApproving = true;
    this.accountsPayableService
      .approveBill(this.billToApprove.id, 1)
      .pipe(
        finalize(() => {
          this.isApproving = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.loadBills();
          this.showApproveConfirm = false;
          this.billToApprove = null;
          // TODO: Show success toast
        },
        error: (error: any) => {
          console.error('Error approving bill:', error);
          // TODO: Show error toast
        },
      });
  }

  cancelApprove() {
    this.showApproveConfirm = false;
    this.billToApprove = null;
  }

  confirmDeleteBill(bill: Bill) {
    this.billToDelete = bill;
    this.showDeleteConfirm = true;
  }

  deleteBill() {
    if (!this.billToDelete) return;

    this.isDeleting = true;
    this.accountsPayableService
      .deleteBill(this.billToDelete.id)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.loadBills();
          this.showDeleteConfirm = false;
          this.billToDelete = null;
          // TODO: Show success toast
        },
        error: (error: any) => {
          console.error('Error deleting bill:', error);
          // TODO: Show error toast
        },
      });
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.billToDelete = null;
  }

  getStatusBadgeClass(status: BillStatus): string {
    switch (status) {
      case BillStatus.DRAFT:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case BillStatus.APPROVED:
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400';
      case BillStatus.PAID:
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400';
      case BillStatus.PARTIALLY_PAID:
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400';
      case BillStatus.OVERDUE:
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400';
      case BillStatus.CANCELLED:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  }

  isOverdue(bill: Bill): boolean {
    return this.accountsPayableService.isOverdue(bill.dueDate);
  }

  getDaysOverdue(bill: Bill): number {
    return this.accountsPayableService.getDaysOverdue(bill.dueDate);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.applyFilters();
  }

  onStatusFilterChange(value: string) {
    this.selectedStatus = value as BillStatus | '';
    this.applyFilters();
  }

  onSupplierFilterChange(value: string) {
    this.selectedSupplierId = value ? parseInt(value, 10) : null;
    this.applyFilters();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-KE');
  }

  getRowClasses(bill: Bill): string {
    let classes =
      'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150';
    if (this.isOverdue(bill)) {
      classes += ' bg-red-50 dark:bg-red-900/20';
    }
    return classes;
  }

  // PDF Export
  exportToPDF() {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation for more columns
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let currentY = 20;

    // Header - Organization Details
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(this.orgDetails?.name || 'Organization', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (this.orgDetails?.email) {
      doc.text(this.orgDetails.email, 14, 18);
    }
    if (this.orgDetails?.phone) {
      doc.text(this.orgDetails.phone, 14, 22);
    }
    if (this.orgDetails?.kra) {
      doc.text(`KRA: ${this.orgDetails.kra}`, 14, 26);
    }

    // Report Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Accounts Payable Report', pageWidth - 14, 12, { align: 'right' });

    // Period and Generated Date
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const startDate = this.filterForm.get('startDate')?.value || '';
    const endDate = this.filterForm.get('endDate')?.value || '';
    if (startDate && endDate) {
      doc.text(
        `Period: ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
        pageWidth - 14,
        18,
        { align: 'right' },
      );
    }
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      pageWidth - 14,
      22,
      { align: 'right' },
    );
    doc.text(
      `Total Records: ${this.filteredBills.length} bill(s)`,
      pageWidth - 14,
      26,
      { align: 'right' },
    );

    currentY = 45;
    doc.setTextColor(0, 0, 0);

    // Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    const currency = this.orgDetails?.currency || 'KES';
    const summaryData = [
      ['Total Bills', this.summary.totalBills.toString()],
      ['Total Amount', `${currency} ${this.summary.totalAmount.toFixed(2)}`],
      ['Total Paid', `${currency} ${this.summary.totalPaid.toFixed(2)}`],
      [
        'Outstanding Balance',
        `${currency} ${this.summary.totalBalance.toFixed(2)}`,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['DESCRIPTION', 'VALUE']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: pageWidth / 2 - 90, right: pageWidth / 2 - 90 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Status Breakdown
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Status Breakdown', 14, currentY);
    currentY += 5;

    const statusData = [
      ['Draft', this.summary.draftCount.toString()],
      ['Approved', this.summary.approvedCount.toString()],
      ['Partially Paid', this.summary.partiallyPaidCount.toString()],
      ['Paid', this.summary.paidCount.toString()],
      ['Overdue', this.summary.overdueCount.toString()],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['STATUS', 'COUNT']],
      body: statusData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // Add new page for detailed bills
    doc.addPage();
    currentY = 20;

    // Detailed Bills Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Bills', 14, currentY);
    currentY += 8;

    const detailedData = this.filteredBills.map((bill) => [
      bill.billNumber,
      bill.supplier.name,
      this.formatDate(bill.billDate),
      this.formatDate(bill.dueDate),
      `${currency} ${bill.netAmount.toFixed(2)}`,
      `${currency} ${bill.paidAmount.toFixed(2)}`,
      `${currency} ${bill.balanceAmount.toFixed(2)}`,
      bill.status.replace('_', ' '),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'BILL #',
          'SUPPLIER',
          'BILL DATE',
          'DUE DATE',
          'AMOUNT',
          'PAID',
          'BALANCE',
          'STATUS',
        ],
      ],
      body: detailedData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'left' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 25, halign: 'left' },
        3: { cellWidth: 25, halign: 'left' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 28, halign: 'right' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // Add page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, {
        align: 'center',
      });
    }

    // Print instead of download
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  async handlePDFExport() {
    try {
      this.loading = true;
      await this.exportToPDF();
    } catch (error) {
      this.error = 'Failed to generate PDF. Please try again.';
      console.error('PDF generation error:', error);
    } finally {
      this.loading = false;
    }
  }
}
