import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';
import { CreditSaleService } from '../../../../../shared/Services/credit-sale.service';
import {
  format,
  sub,
  endOfDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { finalize } from 'rxjs/operators';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateFilter {
  key: string;
  label: string;
  getRange: () => DateRange;
}

@Component({
  selector: 'app-customer-full-credit-statement',
  templateUrl: './customer-full-credit-statement.component.html',
  styleUrls: ['./customer-full-credit-statement.component.scss'],
})
export class CustomerFullCreditStatementComponent
  extends ModalComponent
  implements OnInit
{
  customerId: number = 0;

  // Statement data
  statement: any = null;

  // Loading states
  isLoading: boolean = true;
  error: string | null = null;

  // UI States
  activeTab: 'unpaid' | 'paid' | 'all' = 'all';
  activeFilter: string = 'thisMonth';
  expandedItems: Set<number> = new Set();
  expandedPayments: Set<number> = new Set();

  // Date filters
  customDateRange: DateRange = {
    startDate: format(sub(new Date(), { months: 1 }), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  };

  // Define date filters
  dateFilters: DateFilter[] = [
    {
      key: 'today',
      label: 'Today',
      getRange: () => {
        const today = new Date();
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'yesterday',
      label: 'Yesterday',
      getRange: () => {
        const yesterday = sub(new Date(), { days: 1 });
        return {
          startDate: format(yesterday, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'thisWeek',
      label: 'This Week',
      getRange: () => {
        const today = new Date();
        const startOfWeek = sub(today, { days: today.getDay() });
        return {
          startDate: format(startOfWeek, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'thisMonth',
      label: 'This Month',
      getRange: () => {
        const today = new Date();
        const start = startOfMonth(today);
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'lastMonth',
      label: 'Last Month',
      getRange: () => {
        const today = new Date();
        const start = startOfMonth(sub(today, { months: 1 }));
        const end = endOfMonth(sub(today, { months: 1 }));
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'last3Months',
      label: 'Last 3 Months',
      getRange: () => {
        const today = new Date();
        const start = sub(today, { months: 3 });
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'year',
      label: 'This Year',
      getRange: () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 1);
        return {
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'custom',
      label: 'Custom',
      getRange: () => this.customDateRange,
    },
  ];

  constructor(private creditSaleService: CreditSaleService) {
    super();
    this.customerId = this.dialogRemoteControl.payload;
    console.log('Customer ID:', this.customerId);
  }

  ngOnInit(): void {
    // Get customerId from modal payload

    // Load statement with default date range (this month)
    this.applyDateFilter('thisMonth');
  }

  // Load statement data from service
  loadStatement(): void {
    this.isLoading = true;
    this.error = null;

    // Get current date filter
    const filter = this.dateFilters.find((f) => f.key === this.activeFilter);
    if (!filter) return;

    // Get date range from filter
    const dateRange = filter.getRange();

    this.creditSaleService
      .getCustomerCreditStatement(
        this.customerId,
        dateRange.startDate,
        dateRange.endDate
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.statement = response;
        },
        error: (err) => {
          console.error('Error loading statement:', err);
          this.error = 'Failed to load statement data. Please try again.';
        },
      });
  }

  // Apply a date filter
  applyDateFilter(filterKey: string): void {
    this.activeFilter = filterKey;
    this.loadStatement();
  }

  // Format date for display
  formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  }

  // Format payment method for display
  formatPaymentMethod(method: string): string {
    switch (method) {
      case 'CASH':
        return 'Cash';
      case 'MPESA':
        return 'M-PESA';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      default:
        return method;
    }
  }

  // Get count of items in a sale
  getItemCount(items: any): number {
    if (!items) return 0;
    try {
      const itemsArray = Array.isArray(items) ? items : JSON.parse(items);
      return itemsArray.length;
    } catch (error) {
      return 0;
    }
  }

  // Convert items string to array
  getItemsArray(items: any): any[] {
    if (!items) return [];
    try {
      return Array.isArray(items) ? items : JSON.parse(items);
    } catch (error) {
      return [];
    }
  }

  // Get the last payment date
  getLastPaymentDate(payments: any[]): string {
    if (!payments || payments.length === 0) return 'N/A';

    // Sort payments by date descending
    const sortedPayments = [...payments].sort((a, b) => {
      return (
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
    });

    // Return the most recent date
    return this.formatDate(sortedPayments[0].paymentDate);
  }

  // Toggle items expanded state
  toggleItemsExpanded(saleId: number): void {
    if (this.expandedItems.has(saleId)) {
      this.expandedItems.delete(saleId);
    } else {
      this.expandedItems.add(saleId);
    }
  }

  // Check if items are expanded
  isItemsExpanded(saleId: number): boolean {
    return this.expandedItems.has(saleId);
  }

  // Toggle payment history expanded state
  togglePaymentHistory(saleId: number): void {
    if (this.expandedPayments.has(saleId)) {
      this.expandedPayments.delete(saleId);
    } else {
      this.expandedPayments.add(saleId);
    }
  }

  // Check if payment history is expanded
  isPaymentHistoryExpanded(saleId: number): boolean {
    return this.expandedPayments.has(saleId);
  }

  // Get all sales sorted by date (newest first)
  getAllSalesSorted(): any[] {
    if (!this.statement) return [];

    const allSales = [
      ...(this.statement.unpaidCreditSales || []),
      ...(this.statement.paidCreditSales || []),
    ];

    // Sort by date descending
    return allSales.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Check if a sale is paid
  isSalePaid(sale: any): boolean {
    // Find in paid sales list by ID
    return this.statement.paidCreditSales.some((s: any) => s.id === sale.id);
  }

  // Print the statement
  printStatement(): void {
    window.print();
  }

  // Export the statement to CSV
  exportStatement(): void {
    if (!this.statement) return;

    // Get all sales
    const allSales = this.getAllSalesSorted();

    // Create CSV content
    let csv = 'Credit Sale ID,Date,Amount,Paid Amount,Balance,Status\n';

    allSales.forEach((sale) => {
      const status = this.isSalePaid(sale) ? 'Paid' : 'Unpaid';
      const row = [
        sale.id,
        format(new Date(sale.createdAt), 'yyyy-MM-dd'),
        sale.creditAmount,
        sale.paidAmount,
        sale.balance || 0,
        status,
      ].join(',');

      csv += row + '\n';
    });

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute(
      'download',
      `credit-statement-${this.statement.customer.fullName}-${format(
        new Date(),
        'yyyy-MM-dd'
      )}.csv`
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
