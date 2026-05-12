import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { CreditSaleService } from '../../../../../shared/Services/credit-sale.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MulticreditSalePaymentsComponent } from '../multicredit-sale-payments/multicredit-sale-payments.component';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { CustomerFullCreditStatementComponent } from '../customer-full-credit-statement/customer-full-credit-statement.component';

@Component({
  selector: 'app-customers-debt',
  templateUrl: './customers-debt.component.html',
  styleUrl: './customers-debt.component.scss',
})
export class CustomersDebtComponent implements OnInit {
  private paymentDialog: DialogRemoteControl = new DialogRemoteControl(
    MulticreditSalePaymentsComponent
  );
  private statmentDialog: DialogRemoteControl = new DialogRemoteControl(
    CustomerFullCreditStatementComponent
  );

  customerGroups: any[] = [];
  grandTotals: any = {};
  isLoading = false;
  filterForm: FormGroup;
  expandedCustomers: Set<number> = new Set();

  constructor(
    private creditSaleService: CreditSaleService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      customerId: [''],
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit() {
    this.loadUnpaidCreditSales();
  }

  loadUnpaidCreditSales() {
    this.isLoading = true;
    const filters = this.filterForm.value;

    this.creditSaleService.getUnpaidCreditSalesReport(filters).subscribe({
      next: (response) => {
        this.customerGroups = response.customerGroups;
        this.grandTotals = response.grandTotals;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading unpaid credit sales:', error);
        this.isLoading = false;
      },
    });
  }

  toggleCustomerExpansion(customerId: number) {
    if (this.expandedCustomers.has(customerId)) {
      this.expandedCustomers.delete(customerId);
    } else {
      this.expandedCustomers.add(customerId);
    }
  }

  isCustomerExpanded(customerId: number): boolean {
    return this.expandedCustomers.has(customerId);
  }

  applyFilters() {
    this.loadUnpaidCreditSales();
  }

  resetFilters() {
    this.filterForm.reset();
    this.loadUnpaidCreditSales();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }
  openViewDialog(payload: any) {
    this.paymentDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.paymentDialog.openDialog(payload).subscribe();
  }
  openViewStatmentDialog(payload: any) {
    this.statmentDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.statmentDialog.openDialog(payload).subscribe();
  }

  exportToPDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Add Report Header
    doc.setFontSize(20);
    doc.text('Unpaid Credit Sales Report', pageWidth / 2, 15, {
      align: 'center',
    });

    // Add Date Range if filters are applied
    if (this.filterForm.value.startDate && this.filterForm.value.endDate) {
      doc.setFontSize(12);
      doc.text(
        `Period: ${this.formatDate(
          this.filterForm.value.startDate
        )} - ${this.formatDate(this.filterForm.value.endDate)}`,
        pageWidth / 2,
        25,
        { align: 'center' }
      );
    }

    // Add Summary Section
    doc.setFontSize(14);
    doc.text('Summary', 14, 35);

    const summaryData = [
      [
        'Total Credit Amount',
        this.formatCurrency(this.grandTotals.totalCreditAmount),
      ],
      [
        'Total Paid Amount',
        this.formatCurrency(this.grandTotals.totalPaidAmount),
      ],
      ['Total Balance', this.formatCurrency(this.grandTotals.totalBalance)],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Description', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [100, 45, 115] },
      margin: { left: 14, right: 14 },
    });

    // Add Customer Details
    let currentY = (doc as any).lastAutoTable.finalY + 15;

    this.customerGroups.forEach((group, index) => {
      // Add page if needed
      if (currentY > 250) {
        doc.addPage();
        currentY = 15;
      }

      // Customer Header
      doc.setFontSize(14);
      doc.text(`Customer: ${group.customerName}`, 14, currentY);
      doc.setFontSize(12);
      doc.text(`Phone: ${group.phoneNumber}`, 14, currentY + 7);

      // Customer Sales Table
      const salesData = group.sales.map(
        (sale: {
          createdAt: string;
          creditAmount: number;
          paidAmount: number;
          balance: number;
          orderRemarks: any;
        }) => [
          this.formatDate(sale.createdAt),
          this.formatCurrency(sale.creditAmount),
          this.formatCurrency(sale.paidAmount),
          this.formatCurrency(sale.balance),
          sale.orderRemarks || '-',
        ]
      );

      autoTable(doc, {
        startY: currentY + 12,
        head: [['Date', 'Credit Amount', 'Paid Amount', 'Balance', 'Remarks']],
        body: salesData,
        theme: 'striped',
        headStyles: { fillColor: [100, 45, 115] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
      });

      // Customer Summary
      const customerSummary = [
        [
          'Total',
          this.formatCurrency(group.totalCreditAmount),
          this.formatCurrency(group.totalPaidAmount),
          this.formatCurrency(group.totalBalance),
          '',
        ],
      ];

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY,
        body: customerSummary,
        theme: 'plain',
        styles: {
          fontSize: 8,
          fontStyle: 'bold',
          textColor: [100, 45, 115],
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Add Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 20,
        doc.internal.pageSize.height - 10,
        { align: 'right' }
      );

      // Add export date
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    // Save the PDF
    doc.save(
      `unpaid-credit-sales-report-${new Date().toISOString().split('T')[0]}.pdf`
    );
  }
  exportCustomerStatement(customer: any) {
    // Prevent event bubbling
    event?.stopPropagation();

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add company logo/header
    doc.setFontSize(20);
    doc.text('Customer Statement', pageWidth / 2, 20, { align: 'center' });

    // Add customer details section
    doc.setFontSize(12);
    doc.text('Statement Date:', 14, 40);
    doc.text(new Date().toLocaleDateString(), 50, 40);

    // Customer information box
    doc.setDrawColor(200);
    doc.rect(14, 50, pageWidth - 28, 30);

    doc.setFontSize(11);
    doc.text('Customer Details:', 20, 58);
    doc.text(`Name: ${customer.customerName}`, 20, 65);
    doc.text(`Phone: ${customer.phoneNumber}`, 20, 72);

    // Add summary section
    const summaryData = [
      ['Total Credit Amount', this.formatCurrency(customer.totalCreditAmount)],
      ['Total Paid Amount', this.formatCurrency(customer.totalPaidAmount)],
      ['Outstanding Balance', this.formatCurrency(customer.totalBalance)],
    ];

    autoTable(doc, {
      startY: 90,
      head: [['Summary', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 45, 115],
        textColor: [255, 255, 255],
      },
      styles: {
        halign: 'left',
        fontSize: 10,
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    // Add transactions table
    const transactionsData = customer.sales.map((sale: any) => [
      this.formatDate(sale.createdAt),
      this.formatCurrency(sale.creditAmount),
      this.formatCurrency(sale.paidAmount),
      this.formatCurrency(sale.balance),
      sale.orderRemarks || '-',
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Date', 'Credit Amount', 'Paid Amount', 'Balance', 'Remarks']],
      body: transactionsData,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 45, 115],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
    });

    // Add terms and conditions
    doc.setFontSize(10);
    doc.text(
      'Terms and Conditions:',
      14,
      (doc as any).lastAutoTable.finalY + 20
    );
    doc.setFontSize(8);
    const terms = [
      '1. This statement reflects all transactions up to the current date.',
      '2. Please review all entries and report any discrepancies within 7 days.',
      '3. All payments should be made to authorized personnel only.',
      '4. Please keep this statement for your records.',
    ];

    let termY = (doc as any).lastAutoTable.finalY + 25;
    terms.forEach((term) => {
      doc.text(term, 14, termY);
      termY += 5;
    });

    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      // Add page numbers
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, {
        align: 'right',
      });
      // Add generation date
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        14,
        pageHeight - 10
      );
    }

    // Save the PDF
    const fileName = `statement-${customer.customerName
      .replace(/\s+/g, '-')
      .toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}
