import { Component, OnInit } from '@angular/core';
import { QuotationService } from '../../../../shared/Services/quotation.service';
import { Quotation } from '../../../../shared/interfaces/quotation.interface';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { Product } from '../../../../shared/interfaces/products';
import { QuotationReceiptService } from '../../services/QuotationReceiptService.service';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import { DocumentPrintService } from '../../../../shared/services/document-print.service';
import { DocumentData } from '../../../../shared/services/document-template.service';

@Component({
  selector: 'app-show-quotations',
  templateUrl: './show-quotations.component.html',
  styleUrls: ['./show-quotations.component.scss'],
})
export class ShowQuotationsComponent implements OnInit {
  quotations: Quotation[] = [];
  filteredQuotations: Quotation[] = [];
  filterForm: FormGroup;
  products: Product[] = [];
  customers: Customer[] = [];
  orgDetails: any;
  activeFilter: string = 'today'; // Track active filter
  isLoading: boolean = false;
  searchQuery: string = ''; // Search query for reference number or customer name
  viewMode: 'table' | 'card' = 'table';

  toggleViewMode(mode: 'table' | 'card') {
    this.viewMode = mode;
  }

  // Document print settings modal
  docPrintModalOpen = false;
  docPrintData: DocumentData | null = null;

  constructor(
    private quotationService: QuotationService,
    private fb: FormBuilder,
    private router: Router,
    private productService: ProductService,
    private customersService: CustomerService,
    private quotationReceiptService: QuotationReceiptService,
    private orgDetailsService: OrgDetailsService,
    private documentPrintService: DocumentPrintService,
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit() {
    this.getQuotationForToday();
    this.loadProducts();
    this.getAllCustomers();
    this.loadOrgDetails();
  }

  // Load organization details
  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    this.orgDetailsService.getById(+currentOrgId!).subscribe(
      (details: any) => {
        if (details) {
          this.orgDetails = details;
        }
      },
      (error) => console.error('Error loading organization details:', error),
    );
  }

  // Quick filter methods
  filterToday() {
    this.activeFilter = 'today';
    this.isLoading = true;
    const today = new Date().toISOString().split('T')[0];
    this.loadQuotationsByDateRange(today, today);
  }

  filterYesterday() {
    this.activeFilter = 'yesterday';
    this.isLoading = true;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    this.loadQuotationsByDateRange(yesterdayStr, yesterdayStr);
  }

  filterThisMonth() {
    this.activeFilter = 'thisMonth';
    this.isLoading = true;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];
    this.loadQuotationsByDateRange(startStr, endStr);
  }

  filterLastMonth() {
    this.activeFilter = 'lastMonth';
    this.isLoading = true;
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startStr = startOfLastMonth.toISOString().split('T')[0];
    const endStr = endOfLastMonth.toISOString().split('T')[0];
    this.loadQuotationsByDateRange(startStr, endStr);
  }

  filterAll() {
    this.activeFilter = 'all';
    this.isLoading = true;
    this.loadAllQuotations();
  }

  // Helper method to load quotations by date range
  private loadQuotationsByDateRange(
    startDate: string,
    endDate: string,
    search?: string,
  ) {
    // When searching, ignore date filters and search all time (5 years back)
    if (search && search.trim()) {
      const today = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      startDate = fiveYearsAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }

    this.quotationService
      .getQuotationsByDateRange(startDate, endDate, search)
      .subscribe(
        (response: any) => {
          this.isLoading = false;
          // Fix: Handle the API response structure
          const data = response.data || response;
          this.quotations = Array.isArray(data)
            ? data.map((quotation: Quotation) => ({
                ...quotation,
                items:
                  typeof quotation.items === 'string'
                    ? JSON.parse(quotation.items)
                    : quotation.items,
              }))
            : [];
          this.filteredQuotations = this.quotations;
        },
        (error) => {
          this.isLoading = false;
          console.error('Error loading quotations:', error);
          this.quotations = [];
          this.filteredQuotations = [];
        },
      );
  }

  loadPendingQuotations() {
    this.activeFilter = 'pending';
    this.isLoading = true;
    this.quotationService.getAllPendingQuotation().subscribe(
      (response: any) => {
        this.isLoading = false;
        // Fix: Handle the API response structure
        const data = response.data || response;
        this.quotations = Array.isArray(data)
          ? data.map((quotation: Quotation) => ({
              ...quotation,
              items:
                typeof quotation.items === 'string'
                  ? JSON.parse(quotation.items)
                  : quotation.items,
            }))
          : [];
        this.filteredQuotations = this.quotations;
      },
      (error) => {
        this.isLoading = false;
        console.error('Error loading quotations:', error);
        this.quotations = [];
        this.filteredQuotations = [];
      },
    );
  }

  loadAllQuotations() {
    this.isLoading = true;
    this.quotationService.getAllQuotation().subscribe(
      (response: any) => {
        this.isLoading = false;
        // Fix: Handle the API response structure
        const data = response.data || response;
        this.quotations = Array.isArray(data)
          ? data.map((quotation: Quotation) => ({
              ...quotation,
              items:
                typeof quotation.items === 'string'
                  ? JSON.parse(quotation.items)
                  : quotation.items,
            }))
          : [];
        this.filteredQuotations = this.quotations;
      },
      (error) => {
        this.isLoading = false;
        console.error('Error loading quotations:', error);
        this.quotations = [];
        this.filteredQuotations = [];
      },
    );
  }

  filterQuotations() {
    const startDate = new Date(this.filterForm.get('startDate')?.value);
    const endDate = new Date(this.filterForm.get('endDate')?.value);

    if (!startDate || !endDate) {
      return;
    }

    this.activeFilter = 'custom';
    this.isLoading = true;
    this.loadQuotationsByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    );
  }

  getQuotationForToday() {
    this.filterToday(); // Use the new method
  }

  resetFilter() {
    this.filterForm.reset();
    this.activeFilter = 'today';
    this.filterToday(); // Reset to today's quotations
  }

  approveQuotation(id: number) {
    this.router.navigate(['/approve-quotation', id]);
  }

  /**
   * Approve quotation status only (without converting to cash sale)
   */
  approveQuotationStatus(quotation: any) {
    if (!quotation) return;

    const confirmation = confirm(
      `Approve Quotation ${quotation.referenceNumber}?\n\n` +
        `This will change the status to "Approved" without converting it to a sale.\n` +
        `After approval, you can convert it to either a Cash Sale or Credit Sale (Invoice).`,
    );

    if (!confirmation) return;

    quotation.approvingStatus = true;

    this.quotationService.approveQuotation(quotation.id).subscribe({
      next: (response: any) => {
        quotation.approvingStatus = false;
        quotation.status = 'approved';
        alert(
          `Quotation ${quotation.referenceNumber} has been approved successfully!`,
        );
      },
      error: (error) => {
        console.error('Error approving quotation:', error);
        quotation.approvingStatus = false;
        const errorMessage =
          error.error?.message ||
          'Failed to approve quotation. Please try again.';
        alert(`Error: ${errorMessage}`);
      },
    });
  }

  updateQuotation(id: number) {
    this.router.navigate(['/update-quotation', id]);
  }

  loadProducts() {
    this.productService.getAllProducts().subscribe(
      (products) => (this.products = products),
      (error) => console.error('Error loading products:', error),
    );
  }

  getProductNameById(id: number): string {
    const product = this.products.find((p) => p.id === id);
    if (product) {
      return product.name;
    } else {
      return 'Loading...';
    }
  }

  getAllCustomers(): void {
    this.customersService.getAllCustomers().subscribe((customers) => {
      this.customers = customers;
    });
  }

  getCustomerNameById(id: number): string {
    const customer = this.customers.find((p) => p.id === id);
    if (customer) {
      return customer.fullName;
    } else {
      return 'Loading...';
    }
  }

  getCustomerById(id: number) {
    return this.customers.find((c) => c.id === id) || null;
  }

  printQuotation(quotation: any) {
    if (!quotation) return;

    // Show loading state for this specific quotation
    quotation.printing = true;

    this.quotationReceiptService.printQuotation(quotation.id);

    // Reset loading state after a delay (since print is async)
    setTimeout(() => {
      quotation.printing = false;
    }, 2000);
  }

  /** Open the document print settings modal for a quotation */
  openDocPrintModal(quotation: any): void {
    this.docPrintData = this.documentPrintService.normalizeQuotationData(
      quotation,
      this.orgDetails,
    );
    this.docPrintModalOpen = true;
  }

  closeDocPrintModal(): void {
    this.docPrintModalOpen = false;
    this.docPrintData = null;
  }

  // Download PDF from server
  downloadQuotationPDF(quotation: any) {
    if (!quotation) return;

    // Show loading state for this specific quotation
    quotation.downloadingPDF = true;

    this.quotationService.downloadQuotationPDF(quotation.id).subscribe(
      (response: Blob) => {
        // Create blob URL
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotation-${quotation.referenceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        quotation.downloadingPDF = false;
      },
      (error) => {
        console.error('Error downloading PDF:', error);
        quotation.downloadingPDF = false;
        // You can add a toast notification here if you have one
        alert('Failed to download PDF. Please try again.');
      },
    );
  }

  // Email quotation (if you want to add this functionality)
  emailQuotation(quotation: any) {
    if (!quotation) return;

    quotation.sendingEmail = true;

    this.quotationService.sendQuotationEmail(quotation.id).subscribe(
      (response: any) => {
        quotation.sendingEmail = false;
        // You can add a toast notification here
        alert('Quotation email sent successfully!');
      },
      (error) => {
        console.error('Error sending email:', error);
        quotation.sendingEmail = false;
        alert('Failed to send email. Please try again.');
      },
    );
  }

  // Get active filter display name
  getActiveFilterDisplayName(): string {
    const filterNames: { [key: string]: string } = {
      today: 'Today',
      yesterday: 'Yesterday',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      pending: 'Pending',
      all: 'All Quotations',
      custom: 'Custom Range',
    };
    return filterNames[this.activeFilter] || 'Today';
  }

  // Get quotations count summary
  getQuotationsSummary() {
    const total = this.filteredQuotations.length;
    const pending = this.filteredQuotations.filter(
      (q) => q.status === 'pending',
    ).length;
    const approved = this.filteredQuotations.filter(
      (q) => q.status === 'approved',
    ).length;
    const totalAmount = this.filteredQuotations.reduce(
      (sum, q) => sum + (q.totalAmount || 0),
      0,
    );

    return {
      total,
      pending,
      approved,
      totalAmount,
    };
  }

  /**
   * Search quotations by reference number, customer name, or ID
   */
  onSearch() {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      // If search is empty, reload current filter
      this.getQuotationForToday();
      return;
    }

    this.activeFilter = 'search';
    this.isLoading = true;
    const today = new Date().toISOString().split('T')[0];
    this.loadQuotationsByDateRange(today, today, this.searchQuery.trim());
  }

  /**
   * Clear search and reload today's quotations
   */
  clearSearch() {
    this.searchQuery = '';
    this.getQuotationForToday();
  }

  /**
   * Convert quotation to credit sale (invoice)
   */
  convertToInvoice(quotation: any) {
    if (!quotation) return;

    // Check if already converted
    if (quotation.status === 'converted') {
      alert('This quotation has already been converted to an invoice.');
      return;
    }

    // Check if approved
    if (quotation.status !== 'approved') {
      alert(
        'Only approved quotations can be converted to invoices. Please approve the quotation first.',
      );
      return;
    }

    const confirmation = confirm(
      `Convert Quotation ${quotation.referenceNumber} to Invoice?\n\n` +
        `Customer: ${this.getCustomerNameById(quotation.customerId)}\n` +
        `Amount: KSH ${quotation.totalAmount.toFixed(2)}\n\n` +
        `This will create a credit sale (invoice) and mark the quotation as converted.`,
    );

    if (!confirmation) return;

    // Show loading state
    quotation.converting = true;

    // Optional: Ask for payment terms
    const paymentTerms = prompt(
      'Enter payment terms (optional, e.g., "30 Days"):',
      '30 Days',
    );

    const options: any = {};
    if (paymentTerms) {
      options.payment_terms = paymentTerms;
      // Calculate payment date (30 days from now by default)
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() + 30);
      options.payment_date = paymentDate.toISOString().split('T')[0];
    }

    this.quotationService.convertToCreditSale(quotation.id, options).subscribe({
      next: (response: any) => {
        quotation.converting = false;
        alert(
          `Quotation successfully converted to Invoice!\n\n` +
            `Credit Sale ID: ${response.creditSale?.id || 'N/A'}\n` +
            `You can view the invoice in the Credit Sales section.`,
        );

        // Update the quotation status locally
        quotation.status = 'converted';

        // Optionally reload quotations to reflect the change
        this.getQuotationForToday();
      },
      error: (error) => {
        console.error('Error converting quotation:', error);
        quotation.converting = false;

        const errorMessage =
          error.error?.message ||
          'Failed to convert quotation to invoice. Please try again.';
        alert(`Error: ${errorMessage}`);
      },
    });
  }
}
