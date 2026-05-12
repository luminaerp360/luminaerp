/**
 * Service for managing credit sales operations
 *
 * This service provides comprehensive functionality for handling credit sales including
 * creating, retrieving, updating, and deleting credit sale records. It also supports
 * date range-based reporting, authentication state management, and PDF generation.
 */

import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { CreditSale } from '../interfaces/cretitSale.interface';

@Injectable({
  providedIn: 'root',
})
export class CreditSaleService {
  isAuthenticated = new BehaviorSubject<boolean>(false);

  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}credit-sales`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (token) {
      return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    } else {
      // Handle case where token is not available
      return new HttpHeaders();
    }
  }

  getAllCreditSale(): Observable<CreditSale[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<CreditSale[]>(url, { headers: this.getHeaders() });
  }

  getCreditSaleByDateRange(
    startDate: string,
    endDate: string
  ): Observable<any> {
    const url = `${this.apiUrl}/reports/date-range`;
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any>(url, {
      headers: this.getHeaders(),
      params: params,
    });
  }

  addCreditSale(creditSale: CreditSale): Observable<CreditSale> {
    const url = `${this.apiUrl}`;
    return this.http.post<CreditSale>(url, creditSale, {
      headers: this.getHeaders(),
    });
  }

  getCreditSalebyId(id: number): Observable<CreditSale> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<CreditSale>(url, { headers: this.getHeaders() });
  }

  getUnpaidCreditSalesReport(filters: any): Observable<any> {
    let url = `${this.apiUrl}/unpaid-report`;

    // Add query parameters if filters are provided
    const params = new HttpParams()
      .set('customerId', filters.customerId || '')
      .set('startDate', filters.startDate || '')
      .set('endDate', filters.endDate || '');

    return this.http.get<any>(url, {
      headers: this.getHeaders(),
      params: params,
    });
  }

  getCustomerCreditStatement(
    customerId: number,
    startDate: string,
    endDate: string
  ): Observable<any> {
    let url = `${this.apiUrl}/customer-statement/${customerId}`;

    // Add query parameters
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<any>(url, {
      headers: this.getHeaders(),
      params: params,
    });
  }

  updateCreditSale(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteCreditSale(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // ======================
  // PDF DOWNLOAD METHODS
  // ======================

  /**
   * Download single credit sale invoice as PDF
   */
  downloadCreditSaleInvoicePDF(
    creditSaleId: number,
    format: 'invoice' | 'receipt' = 'invoice'
  ): Observable<HttpResponse<Blob>> {
    const url = `${this.apiUrl}/${creditSaleId}/download-pdf`;
    const params = new HttpParams().set('format', format);

    return this.http.get(url, {
      headers: this.getHeaders(),
      params: params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * Preview credit sale invoice PDF (returns base64)
   */
  previewCreditSaleInvoicePDF(
    creditSaleId: number,
    format: 'invoice' | 'receipt' = 'invoice'
  ): Observable<{ filename: string; data: string; mimeType: string }> {
    const url = `${this.apiUrl}/${creditSaleId}/preview-pdf`;
    const params = new HttpParams().set('format', format);

    return this.http.get<{ filename: string; data: string; mimeType: string }>(
      url,
      {
        headers: this.getHeaders(),
        params: params,
      }
    );
  }

  /**
   * Bulk download multiple credit sales as ZIP
   */
  bulkDownloadCreditSalesPDF(
    creditSaleIds: number[],
    format: 'invoice' | 'receipt' = 'invoice'
  ): Observable<HttpResponse<Blob>> {
    const url = `${this.apiUrl}/bulk-download-pdf`;
    const body = { creditSaleIds, format };

    return this.http.post(url, body, {
      headers: this.getHeaders(),
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * Download customer statement as PDF
   */
  downloadCustomerStatementPDF(
    customerId: number,
    startDate: string,
    endDate: string,
    includePaymentHistory: boolean = false
  ): Observable<HttpResponse<Blob>> {
    const url = `${this.apiUrl}/customer-statement/${customerId}/download-pdf`;
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('includePaymentHistory', includePaymentHistory.toString());

    return this.http.get(url, {
      headers: this.getHeaders(),
      params: params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * Download unpaid credit sales report as PDF
   */
  downloadUnpaidReportPDF(
    filters: {
      customerId?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Observable<HttpResponse<Blob>> {
    const url = `${this.apiUrl}/unpaid-report/download-pdf`;
    let params = new HttpParams();

    if (filters.customerId) {
      params = params.set('customerId', filters.customerId.toString());
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get(url, {
      headers: this.getHeaders(),
      params: params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  // ======================
  // HELPER METHODS
  // ======================

  /**
   * Helper method to download blob response as file
   */
  downloadBlob(response: HttpResponse<Blob>, defaultFilename: string): void {
    const blob = response.body;
    if (!blob) return;

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = defaultFilename;

    if (contentDisposition) {
      const matches = /filename="([^"]*)"/.exec(contentDisposition);
      if (matches && matches[1]) {
        filename = matches[1];
      }
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Helper method to convert base64 to blob
   */
  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Helper method to open PDF in new tab
   */
  openPDFInNewTab(response: { data: string; mimeType: string }): void {
    const pdfBlob = this.base64ToBlob(response.data, response.mimeType);
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  }
}
