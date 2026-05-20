import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Invoice,
  CreateInvoiceDto,
  RecordPaymentDto,
  InvoiceFilters,
  InvoiceStats,
  InvoiceListResponse,
  InvoiceStatus,
} from '../interfaces/invoice.interface';
import { environment } from '../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private baseUrl = environment.apiMainRootUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get organization ID from localStorage
   */
  private getOrganizationId(): number {
    return Number(localStorage.getItem('licencedOrg') || 1);
  }

  /**
   * Get the API URL for invoices
   */
  private get apiUrl(): string {
    return `${this.baseUrl}invoices/${this.getOrganizationId()}`;
  }

  /**
   * Create a new invoice
   */
  createInvoice(data: CreateInvoiceDto): Observable<Invoice> {
    return this.http.post<Invoice>(this.apiUrl, data);
  }

  /**
   * Get all invoices with optional filters
   */
  getAllInvoices(filters?: InvoiceFilters): Observable<InvoiceListResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.customerId)
        params = params.set('customerId', filters.customerId.toString());
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate)
        params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.invoiceNumber)
        params = params.set('invoiceNumber', filters.invoiceNumber);
      if (filters.customerName)
        params = params.set('customerName', filters.customerName);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<InvoiceListResponse>(this.apiUrl, {
      params,
    });
  }

  /**
   * Get invoice by ID
   */
  getInvoiceById(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get invoice by public token (no auth required)
   */
  getPublicInvoice(token: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}invoices/public/${token}`);
  }

  /**
   * Update invoice
   */
  updateInvoice(
    id: number,
    data: Partial<CreateInvoiceDto>,
  ): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete invoice
   */
  deleteInvoice(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Cancel invoice
   */
  cancelInvoice(id: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.apiUrl}/${id}/cancel`, {});
  }

  /**
   * Record a payment for an invoice
   */
  recordPayment(id: number, data: RecordPaymentDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/payments`, data);
  }

  /**
   * Send invoice via email/SMS
   */
  sendInvoice(
    id: number,
    data?: { email?: string; phone?: string },
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/send`, data || {});
  }

  /**
   * Get invoice statistics
   */
  getInvoiceStats(filters?: {
    startDate?: string;
    endDate?: string;
  }): Observable<InvoiceStats> {
    let params = new HttpParams();

    if (filters) {
      if (filters.startDate)
        params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
    }

    return this.http.get<InvoiceStats>(`${this.apiUrl}/stats`, {
      params,
    });
  }

  /**
   * Update overdue invoices
   */
  updateOverdueInvoices(): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-overdue`, {});
  }

  /**
   * Calculate late fees for an invoice
   */
  calculateLateFees(id: number): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${this.apiUrl}/${id}/late-fees`,
      {},
    );
  }

  /**
   * Download invoice PDF (authenticated)
   */
  downloadInvoicePDF(id: number, theme: string = 'default'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf?theme=${theme}`, {
      responseType: 'blob',
    });
  }

  /**
   * Download public invoice PDF (no auth required)
   */
  downloadPublicInvoicePDF(
    token: string,
    theme: string = 'professional',
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}invoices/public/${token}/download?theme=${theme}`,
      {
        responseType: 'blob',
      },
    );
  }

  /**
   * View public invoice PDF (no auth required)
   */
  viewPublicInvoicePDF(
    token: string,
    theme: string = 'professional',
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}invoices/public/${token}/view?theme=${theme}`,
      {
        responseType: 'blob',
      },
    );
  }

  /**
   * Get public invoice PDF URL for direct download
   */
  getPublicInvoicePDFUrl(token: string, theme: string = 'professional'): string {
    return `${this.baseUrl}invoices/public/${token}/download?theme=${theme}`;
  }

  /**
   * Get public invoice PDF URL for viewing/printing
   */
  getPublicInvoiceViewUrl(token: string, theme: string = 'professional'): string {
    return `${this.baseUrl}invoices/public/${token}/view?theme=${theme}`;
  }

  /**
   * Generate public invoice URL
   */
  getPublicInvoiceUrl(token: string): string {
    return `${window.location.origin}/invoices/public/${token}`;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: InvoiceStatus): string {
    const colors: Record<InvoiceStatus, string> = {
      [InvoiceStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [InvoiceStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [InvoiceStatus.SENT]: 'bg-blue-100 text-blue-800',
      [InvoiceStatus.VIEWED]: 'bg-purple-100 text-purple-800',
      [InvoiceStatus.PARTIALLY_PAID]: 'bg-orange-100 text-orange-800',
      [InvoiceStatus.PAID]: 'bg-green-100 text-green-800',
      [InvoiceStatus.OVERDUE]: 'bg-red-100 text-red-800',
      [InvoiceStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [InvoiceStatus.REFUNDED]: 'bg-pink-100 text-pink-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: InvoiceStatus): string {
    const icons: Record<InvoiceStatus, string> = {
      [InvoiceStatus.DRAFT]: 'bi-file-earmark',
      [InvoiceStatus.PENDING]: 'bi-clock',
      [InvoiceStatus.SENT]: 'bi-send',
      [InvoiceStatus.VIEWED]: 'bi-eye',
      [InvoiceStatus.PARTIALLY_PAID]: 'bi-cash-stack',
      [InvoiceStatus.PAID]: 'bi-check-circle-fill',
      [InvoiceStatus.OVERDUE]: 'bi-exclamation-circle-fill',
      [InvoiceStatus.CANCELLED]: 'bi-x-circle',
      [InvoiceStatus.REFUNDED]: 'bi-arrow-counterclockwise',
    };
    return icons[status] || 'bi-file-earmark';
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  /**
   * Calculate days until/since due date
   */
  getDaysUntilDue(dueDate: string | Date): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if invoice is overdue
   */
  isOverdue(invoice: Invoice): boolean {
    if (invoice.fullyPaid) return false;
    return this.getDaysUntilDue(invoice.dueDate) < 0;
  }

  /**
   * Get payment progress percentage
   */
  getPaymentProgress(invoice: Invoice): number {
    if (invoice.totalAmount === 0) return 0;
    return Math.round((invoice.amountPaid / invoice.totalAmount) * 100);
  }

  /**
   * Helper to download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper to open PDF in new tab
   */
  openPDFInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Copy public link to clipboard
   */
  async copyPublicLink(token: string): Promise<boolean> {
    const url = this.getPublicInvoiceUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }

  /**
   * Finalize draft invoice (DRAFT → PENDING)
   */
  finalizeInvoice(organizationId: number, invoiceId: number, notes?: string): Observable<Invoice> {
    return this.http.put<Invoice>(
      `${this.baseUrl}invoices/${organizationId}/${invoiceId}/finalize`,
      {
        notes,
        finalizedBy: 'Current User', // TODO: Get from auth service
      }
    );
  }

  /**
   * Mark invoice as sent (PENDING → SENT)
   */
  markAsSent(organizationId: number, invoiceId: number, notes?: string): Observable<Invoice> {
    return this.http.put<Invoice>(
      `${this.baseUrl}invoices/${organizationId}/${invoiceId}/mark-sent`,
      {
        sentAt: new Date().toISOString(),
        notes,
        sentBy: 'Current User', // TODO: Get from auth service
      }
    );
  }

  /**
   * Duplicate invoice (creates new DRAFT)
   */
  duplicateInvoice(organizationId: number, invoiceId: number): Observable<Invoice> {
    return this.http.post<Invoice>(
      `${this.baseUrl}invoices/${organizationId}/${invoiceId}/duplicate`,
      {}
    );
  }

  /**
   * Send payment reminder
   */
  sendReminder(
    organizationId: number,
    invoiceId: number,
    reminderType: 'FRIENDLY' | 'FIRM' | 'URGENT' = 'FRIENDLY',
    customMessage?: string
  ): Observable<{ success: boolean; message: string; invoice: Invoice }> {
    return this.http.post<{ success: boolean; message: string; invoice: Invoice }>(
      `${this.baseUrl}invoices/${organizationId}/${invoiceId}/send-reminder`,
      {
        reminderType,
        customMessage,
        sentBy: 'Current User', // TODO: Get from auth service
      }
    );
  }

  /**
   * Check if action can be performed on invoice based on status
   */
  canPerformAction(action: string, invoice: Invoice): boolean {
    const status = invoice.status;

    switch (action) {
      case 'finalize':
        return status === InvoiceStatus.DRAFT;

      case 'markSent':
        return status === InvoiceStatus.PENDING || status === InvoiceStatus.DRAFT;

      case 'send':
        // Cannot send draft invoices
        return status !== InvoiceStatus.DRAFT;

      case 'recordPayment':
        // Cannot record payment on draft or fully paid invoices
        return status !== InvoiceStatus.DRAFT && !invoice.fullyPaid;

      case 'edit':
        // Can edit DRAFT, PENDING, SENT. Cannot edit if has payments
        return (
          (status === InvoiceStatus.DRAFT ||
            status === InvoiceStatus.PENDING ||
            status === InvoiceStatus.SENT) &&
          invoice.amountPaid === 0
        );

      case 'cancel':
        // Cannot cancel paid invoices
        return status !== InvoiceStatus.PAID && status !== InvoiceStatus.CANCELLED;

      case 'delete':
        // Can only delete drafts with no payments
        return status === InvoiceStatus.DRAFT && invoice.amountPaid === 0;

      case 'duplicate':
        // Can duplicate any invoice
        return true;

      case 'sendReminder':
        // Can send reminder for unpaid invoices that are sent or overdue
        return (
          !invoice.fullyPaid &&
          (status === InvoiceStatus.SENT ||
            status === InvoiceStatus.VIEWED ||
            status === InvoiceStatus.PARTIALLY_PAID ||
            status === InvoiceStatus.OVERDUE)
        );

      default:
        return false;
    }
  }
}
