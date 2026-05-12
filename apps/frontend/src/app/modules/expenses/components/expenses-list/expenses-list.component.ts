import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExpensesService } from '../../../../shared/Services/expenses.service';
import { ExpensesFormComponent } from '../expenses-form/expenses-form.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { Expense } from '../../../../shared/interfaces/expense.interface';
import { finalize } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';

@Component({
  selector: 'app-expenses-list',
  templateUrl: './expenses-list.component.html',
  styleUrl: './expenses-list.component.scss',
})
export class ExpensesListComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    ExpensesFormComponent,
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    ExpensesFormComponent,
  );

  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  groupedByAccount: Record<string, Expense[]> = {};
  accountTotals: Record<string, number> = {};
  accountKeys: string[] = [];
  loading = false;
  error: string | null = null;
  filterForm: FormGroup | any;
  hasInitialized: boolean = false;
  orgDetails: any;

  // Summary metrics
  totalAmount: number = 0;
  cashExpenses: number = 0;
  mpesaExpenses: number = 0;
  bankExpenses: number = 0;

  // Quick filter properties
  filterType: 'quick' | 'single' | 'range' = 'quick';
  selectedQuickFilter: string = 'today';
  quickFilters = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
  ];

  constructor(
    private expensesService: ExpensesService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private orgDetailsService: OrgDetailsService,
  ) {
    this.initializeFilterForm();
  }

  private initializeFilterForm() {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      category: [''],
      paymentMethod: [''],
      status: [''],
      vendor: [''],
    });

    // Subscribe to form changes to auto-update results
    this.filterForm.valueChanges.subscribe(() => {
      if (this.filterForm.dirty) {
        this.getAllExpenses();
      }
    });
  }

  ngOnInit(): void {
    this.loadOrgDetails();
    // Initialize with today's filter
    this.selectQuickFilter('today');
  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    this.orgDetailsService.getById(+currentOrgId!).subscribe(
      (details: any) => {
        if (details) {
          this.orgDetails = details;
          console.log('org details', details);
        }
      },
      (error) => {
        console.error('Error loading org details:', error);
      }
    );
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
    } else if (type === 'single' && this.filterForm.get('startDate')?.value) {
      // single date filter uses startDate as the selected date
      const selected = this.filterForm.get('startDate')?.value;
      this.filterForm.patchValue({ startDate: selected, endDate: selected });
      this.getAllExpenses();
    } else if (
      type === 'range' &&
      this.filterForm.get('startDate')?.value &&
      this.filterForm.get('endDate')?.value
    ) {
      this.getAllExpenses();
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

    this.filterForm.patchValue({
      startDate: this.formatISO(start),
      endDate: this.formatISO(end),
    });

    this.getAllExpenses();
  }

  private formatISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getAllExpenses() {
    this.loading = true;
    this.error = null;

    const filters = {
      startDate: this.filterForm.get('startDate')?.value,
      endDate: this.filterForm.get('endDate')?.value,
      category: this.filterForm.get('category')?.value,
      paymentMethod: this.filterForm.get('paymentMethod')?.value,
      status: this.filterForm.get('status')?.value,
      vendor: this.filterForm.get('vendor')?.value,
    };

    this.expensesService
      .getAllExpenses(filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.expenses = response.expenses;
          this.filteredExpenses = [...this.expenses];
          this.groupedByAccount = response.groupedByAccount || {};
          this.accountTotals = response.accountTotals || {};
          this.accountKeys = Object.keys(this.groupedByAccount);
          this.calculateSummaryMetrics();
          this.hasInitialized = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = 'Failed to load expenses. Please try again later.';
          console.error('Error loading expenses:', error);
          this.cdr.detectChanges();
        },
      });
  }

  private calculateSummaryMetrics() {
    this.totalAmount = 0;
    this.cashExpenses = 0;
    this.mpesaExpenses = 0;
    this.bankExpenses = 0;

    this.expenses.forEach((expense) => {
      this.totalAmount += expense.amount;

      switch (expense.paymentMethod) {
        case 'CASH':
          this.cashExpenses += expense.amount;
          break;
        case 'MPESA':
          this.mpesaExpenses += expense.amount;
          break;
        case 'BANK_TRANSFER':
          this.bankExpenses += expense.amount;
          break;
      }
    });
  }

  openAddDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.dialog.openDialog().subscribe((resp) => {
      if (resp) {
        this.getAllExpenses();
      }
    });
  }

  openUpdateDialog(expense: Expense) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.updateDialog.openDialog(expense).subscribe((resp) => {
      if (resp) {
        this.getAllExpenses();
      }
    });
  }

  deleteExpense(id: number | undefined) {
    if (!id) return;

    if (confirm('Are you sure you want to delete this expense?')) {
      this.loading = true;
      this.error = null;

      this.expensesService
        .deleteExpense(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: () => {
            this.getAllExpenses();
          },
          error: (error) => {
            this.error = 'Failed to delete expense. Please try again later.';
            console.error('Error deleting expense:', error);
          },
        });
    }
  }

  applyFilters() {
    this.getAllExpenses();
  }

  resetFilters() {
    this.filterForm.reset();
    this.getAllExpenses();
  }

  getStatusClass(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-900 text-green-300';
      case 'pending':
        return 'bg-yellow-900 text-yellow-300';
      case 'rejected':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-gray-900 text-gray-300';
    }
  }

  formatAmount(amount: number): string {
    const currency = this.orgDetails?.currency || 'KES';
    return `${currency} ${amount.toFixed(2)}`;
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  exportToExcel() {
    // Implement Excel export functionality
    const data = this.expenses.map((expense) => ({
      Date: this.formatDate(expense.expenseDate || expense.createdAt!),
      Title: expense.title,
      Vendor: expense.vendor || '-',
      'Invoice Number': expense.invoiceNumber || '-',
      Category: expense.category,
      'Chart of Account': expense.chartOfAccount
        ? `${expense.chartOfAccount.accountCode} - ${expense.chartOfAccount.accountName}`
        : 'Not linked',
      Amount: expense.amount,
      'Tax Amount': expense.taxAmount || 0,
      'Paid Amount': expense.paidAmount || expense.amount,
      'Payment Method': expense.paymentMethod,
      'Paid By': expense.paidBy,
      Status: expense.status,
      Tags: expense.tags?.join(', ') || '-',
      Billable: expense.isBillable ? 'Yes' : 'No',
      Reimbursable: expense.isReimbursable ? 'Yes' : 'No',
      'Due Date': expense.dueDate ? this.formatDate(expense.dueDate) : '-',
      Description: expense.description,
      Notes: expense.notes || '-',
    }));

    // You'll need to implement the actual Excel export logic here
    console.log('Exporting data:', data);
  }

  // Helper method to check if current date is within selected range
  isDateInRange(date: Date): boolean {
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    if (!startDate || !endDate) return true;

    const checkDate = new Date(date);
    return checkDate >= new Date(startDate) && checkDate <= new Date(endDate);
  }

  // Getter for filtered expenses count
  get filteredExpensesCount(): number {
    return this.expenses.length;
  }

  // Getter for total filtered amount
  get filteredTotalAmount(): number {
    return this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  exportToPDF() {
    const doc = new jsPDF('p', 'mm', 'a4'); // portrait orientation
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let currentY = 20;

    // Header - Organization Details
    doc.setFillColor(79, 70, 229); // Indigo color
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
    doc.text('Expense Report', pageWidth - 14, 12, { align: 'right' });

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
        { align: 'right' }
      );
    }
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      pageWidth - 14,
      22,
      { align: 'right' }
    );
    doc.text(
      `Total Records: ${this.expenses.length} expense(s) across ${this.accountKeys.length} account(s)`,
      pageWidth - 14,
      26,
      { align: 'right' }
    );

    currentY = 45;
    doc.setTextColor(0, 0, 0);

    // Account Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Account Summary', 14, currentY);
    currentY += 5;

    const accountSummaryData = this.accountKeys.map((accountId) => [
      this.getAccountName(accountId),
      this.groupedByAccount[accountId].length.toString(),
      this.formatAmount(this.accountTotals[accountId]),
      this.formatAmount(0), // Paid amount - you can calculate this
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['ACCOUNT', 'COUNT', 'TOTAL', 'PAID']],
      body: accountSummaryData,
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
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Financial Summary Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    const totalPaid = this.expenses.reduce(
      (sum, exp) => sum + (exp.paidAmount || 0),
      0
    );
    const totalPending = this.totalAmount - totalPaid;

    const financialData = [
      ['Total Expenses', this.formatAmount(this.totalAmount)],
      ['Amount Paid', this.formatAmount(totalPaid)],
      ['Amount Pending', this.formatAmount(totalPending)],
    ];

    const currencyLabel = this.orgDetails?.currency || 'KES';

    autoTable(doc, {
      startY: currentY,
      head: [['DESCRIPTION', `AMOUNT (${currencyLabel})`]],
      body: financialData,
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
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
    });

    // Add new page for detailed expenses
    doc.addPage();
    currentY = 20;

    // Detailed Expenses Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Expenses', 14, currentY);
    currentY += 8;

    // Group expenses by account and display each group
    this.accountKeys.forEach((accountId) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }

      const expenses = this.groupedByAccount[accountId];
      const accountName = this.getAccountName(accountId);

      const detailedData = expenses.map((expense) => [
        accountName,
        this.formatDate(expense.expenseDate || expense.createdAt || ''),
        expense.invoiceNumber || '-',
        expense.description || expense.title || '-',
        expense.category || '-',
        this.formatAmount(expense.amount),
        (expense.status || 'PENDING').toUpperCase(),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['ACCOUNT', 'DATE', 'REF', 'DETAILS', 'CATEGORY', 'AMOUNT', 'STATUS']],
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
          valign: 'middle',
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: 23, halign: 'left' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 'auto', halign: 'left', overflow: 'linebreak' },
          4: { cellWidth: 23, halign: 'left' },
          5: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 5;
    });

    // Add page numbers to all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Print instead of download
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  // Add this to handle PDF export with loading state
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

  // Helper to get account name from grouped data
  getAccountName(accountId: string): string {
    if (accountId === 'unassigned') {
      return 'Unassigned Account';
    }
    const expenses = this.groupedByAccount[accountId];
    if (expenses && expenses.length > 0 && expenses[0].chartOfAccount) {
      return expenses[0].chartOfAccount.accountName;
    }
    return 'Unknown Account';
  }
}
