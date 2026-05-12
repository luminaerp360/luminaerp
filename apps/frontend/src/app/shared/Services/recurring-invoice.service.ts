import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RecurringInvoiceTemplate,
  CreateRecurringTemplateDto,
  UpdateRecurringTemplateDto,
  RecurringTemplateFilters,
  RecurringTemplateListResponse,
  RecurringStatus,
  RecurrenceFrequency,
  FrequencyLabels,
  StatusLabels,
} from '../interfaces/recurring-invoice.interface';
import { environment } from '../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class RecurringInvoiceService {
  private baseUrl = environment.apiMainRootUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get organization ID from localStorage
   */
  private getOrganizationId(): number {
    return Number(localStorage.getItem('licencedOrg') || 1);
  }

  /**
   * Get the API URL for recurring invoices
   */
  private get apiUrl(): string {
    return `${this.baseUrl}recurring-invoices/${this.getOrganizationId()}`;
  }

  /**
   * Create a new recurring template
   */
  createTemplate(
    data: CreateRecurringTemplateDto,
  ): Observable<RecurringInvoiceTemplate> {
    return this.http.post<RecurringInvoiceTemplate>(this.apiUrl, data);
  }

  /**
   * Get all recurring templates with filters
   */
  getTemplates(
    filters?: RecurringTemplateFilters,
  ): Observable<RecurringTemplateListResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.customerId)
        params = params.set('customerId', filters.customerId.toString());
      if (filters.frequency)
        params = params.set('frequency', filters.frequency);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<RecurringTemplateListResponse>(this.apiUrl, {
      params,
    });
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: number): Observable<RecurringInvoiceTemplate> {
    return this.http.get<RecurringInvoiceTemplate>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update template
   */
  updateTemplate(
    id: number,
    data: UpdateRecurringTemplateDto,
  ): Observable<RecurringInvoiceTemplate> {
    return this.http.put<RecurringInvoiceTemplate>(
      `${this.apiUrl}/${id}`,
      data,
    );
  }

  /**
   * Pause template
   */
  pauseTemplate(id: number): Observable<RecurringInvoiceTemplate> {
    return this.http.put<RecurringInvoiceTemplate>(
      `${this.apiUrl}/${id}/pause`,
      {},
    );
  }

  /**
   * Resume template
   */
  resumeTemplate(id: number): Observable<RecurringInvoiceTemplate> {
    return this.http.put<RecurringInvoiceTemplate>(
      `${this.apiUrl}/${id}/resume`,
      {},
    );
  }

  /**
   * Cancel template
   */
  cancelTemplate(id: number): Observable<RecurringInvoiceTemplate> {
    return this.http.put<RecurringInvoiceTemplate>(
      `${this.apiUrl}/${id}/cancel`,
      {},
    );
  }

  /**
   * Delete template
   */
  deleteTemplate(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Manually trigger invoice generation (testing)
   */
  generateNow(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}recurring-invoices/generate-now/trigger`,
      {},
    );
  }

  /**
   * Get frequency label
   */
  getFrequencyLabel(frequency: string): string {
    return FrequencyLabels[frequency as RecurrenceFrequency] || frequency;
  }

  /**
   * Get status label
   */
  getStatusLabel(status: RecurringStatus): string {
    return StatusLabels[status] || status;
  }

  /**
   * Get status color classes
   */
  getStatusColor(status: RecurringStatus): string {
    const colors: Record<RecurringStatus, string> = {
      [RecurringStatus.ACTIVE]:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [RecurringStatus.PAUSED]:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      [RecurringStatus.COMPLETED]:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [RecurringStatus.CANCELLED]:
        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };

    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: RecurringStatus): string {
    const icons: Record<RecurringStatus, string> = {
      [RecurringStatus.ACTIVE]: 'bi-play-circle',
      [RecurringStatus.PAUSED]: 'bi-pause-circle',
      [RecurringStatus.COMPLETED]: 'bi-check-circle',
      [RecurringStatus.CANCELLED]: 'bi-x-circle',
    };

    return icons[status] || 'bi-circle';
  }

  /**
   * Format next invoice date display
   */
  formatNextInvoiceDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return d.toLocaleDateString();
    }
  }
}
