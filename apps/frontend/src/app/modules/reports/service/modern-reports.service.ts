import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class ModernReportsService {
  private apiBaseUrl = `${environment.apiRootUrl}reports/v2/`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  private buildDateParams(startDate: string, endDate: string): HttpParams {
    return new HttpParams().set('startDate', startDate).set('endDate', endDate);
  }

  /** 1. Dashboard Overview — High-level KPIs */
  getDashboardOverview(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}dashboard`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 2. Unified Payments Report */
  getPaymentsReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}payments`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 3. Sales Report — Orders + Credit Sales */
  getSalesReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}sales`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 4. Invoice Report */
  getInvoiceReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}invoices`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 5. Expense Report */
  getExpenseReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}expenses`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 6. Inventory Report (no date range) */
  getInventoryReport(): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}inventory`, {
      headers: this.getHeaders(),
    });
  }

  /** 7. Customer Report */
  getCustomerReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}customers`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 8. Profit & Loss Report */
  getProfitLossReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}profit-loss`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 9. User Performance Report */
  getUserPerformanceReport(
    startDate: string,
    endDate: string,
  ): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}user-performance`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }

  /** 10. Daily Trends Report */
  getDailyTrendsReport(startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}daily-trends`, {
      params: this.buildDateParams(startDate, endDate),
      headers: this.getHeaders(),
    });
  }
}
