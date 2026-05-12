import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../Environments/environments';
import { RefundDto, Sales } from '../interfaces/sales.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  isAuthenticated = new BehaviorSubject<boolean>(false);

  private apiUrl: string;
  private mpesaapiUrl: string;
  private mpesaTransUrl: string;
  private reportsUrl: string;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    this.apiUrl = `${environment.apiRootUrl}orders`;
    this.reportsUrl = `${environment.apiRootUrl}reports`;
    this.mpesaapiUrl = `${environment.apiRootUrl}mpesa/stk-push`;
    this.mpesaTransUrl = `${environment.mpesaApiUrl}/transactions/unused`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllSales(): Observable<Sales[]> {
    return this.http.get<Sales[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getVoidedSalesByDateRange(startDate: string, endDate: string): Observable<Sales[]> {
    const url = `${this.apiUrl}/voided?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<Sales[]>(url, { headers: this.getHeaders() });
  }

  getUnUsedTransactions(): Observable<any[]> {
    return this.http.get<any[]>(this.mpesaTransUrl, { headers: this.getHeaders() });
  }

  getComprehensiveByDateRange(startDate: string, endDate: string): Observable<any> {
    const url = `${this.reportsUrl}/comprehensive?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  getSalesByDateRange(startDate: string, endDate: string, search?: string): Observable<any> {
    let url = `${this.apiUrl}/report/range?startDate=${startDate}&endDate=${endDate}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  addSales(sales: Sales): Observable<Sales> {
    return this.http.post<Sales>(this.apiUrl, sales, { headers: this.getHeaders() });
  }

  mpesaStkPush(data: any): Observable<Sales> {
    return this.http.post<Sales>(this.mpesaapiUrl, data, { headers: this.getHeaders() });
  }

  getSalesbyId(id: number): Observable<Sales> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Sales>(url, { headers: this.getHeaders() });
  }

  updateSales(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  softDeleteSales(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${id}/void`,
      {},
      { headers: this.getHeaders() }
    );
  }

  refundSale(refundDto: RefundDto): Observable<any> {
    const url = `${this.apiUrl}/refund`;
    return this.http.post(url, refundDto, { headers: this.getHeaders() });
  }

  deleteSales(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}