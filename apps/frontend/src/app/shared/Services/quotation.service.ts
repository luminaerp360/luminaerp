import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { environment } from '../../../Environments/environments';
import { Quotation } from '../interfaces/quotation.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class QuotationService {
  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}quotations`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllQuotation(): Observable<any> {
    const url = `${this.apiUrl}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getAllPendingQuotation(): Observable<any> {
    const url = `${this.apiUrl}/pending`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getQuotationsByDateRange(
    startDate: string,
    endDate: string,
    search?: string,
  ): Observable<any> {
    let url = `${this.apiUrl}/by-date-range?startDate=${startDate}&endDate=${endDate}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  addQuotation(quotation: any): Observable<any> {
    const url = `${this.apiUrl}`;
    return this.http.post<any>(url, quotation, { headers: this.getHeaders() });
  }

  getQuotationbyId(id: number): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  updateQuotation(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  approveQuotation(id: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${id}/approve`,
      {},
      { headers: this.getHeaders() },
    );
  }

  deleteQuotation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // New email-related methods
  sendQuotationEmail(id: number, emailTo?: string): Observable<any> {
    const body = emailTo ? { emailTo } : {};
    return this.http.post(`${this.apiUrl}/${id}/send-email`, body, {
      headers: this.getHeaders(),
    });
  }

  resendQuotationEmail(id: number, emailTo?: string): Observable<any> {
    const body = emailTo ? { emailTo } : {};
    return this.http.post(`${this.apiUrl}/${id}/resend-email`, body, {
      headers: this.getHeaders(),
    });
  }

  // PDF-related methods
  downloadQuotationPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download-pdf`, {
      headers: this.getHeaders(),
      responseType: 'blob',
    });
  }

  previewQuotationPDF(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/preview-pdf`, {
      headers: this.getHeaders(),
    });
  }

  getPrintableQuotationData(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/printable-data`, {
      headers: this.getHeaders(),
    });
  }

  // Statistics and analytics
  getQuotationStatistics(
    startDate?: string,
    endDate?: string,
  ): Observable<any> {
    let url = `${this.apiUrl}/stats/overview`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getQuotationsByStatus(status: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/${status}`, {
      headers: this.getHeaders(),
    });
  }

  // Bulk operations
  bulkApproveQuotations(quotationIds: number[]): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/bulk/approve`,
      { quotationIds },
      { headers: this.getHeaders() },
    );
  }

  bulkSendEmails(quotationIds: number[], emailTo?: string): Observable<any> {
    const body = { quotationIds, ...(emailTo && { emailTo }) };
    return this.http.post(`${this.apiUrl}/bulk/send-email`, body, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Convert quotation to credit sale (invoice)
   * @param id Quotation ID
   * @param options Optional parameters (payment_date, payment_terms, order_remarks)
   */
  convertToCreditSale(id: number, options?: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${id}/convert-to-credit-sale`,
      options || {},
      {
        headers: this.getHeaders(),
      },
    );
  }
}
