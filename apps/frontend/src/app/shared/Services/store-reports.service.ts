import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class StoreReportsService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}store-reports`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`, {
      headers: this.getHeaders(),
    });
  }

  getStockValuation(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stock-valuation`, {
      headers: this.getHeaders(),
    });
  }

  getLowStock(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/low-stock`, {
      headers: this.getHeaders(),
    });
  }

  getPurchaseReport(
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.apiUrl}/purchases`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getRequisitionReport(
    startDate?: string,
    endDate?: string,
    status?: string,
    departmentId?: number,
  ): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);
    if (departmentId)
      params = params.set('departmentId', departmentId.toString());
    return this.http.get<any>(`${this.apiUrl}/requisitions`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getDepartmentUsage(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any>(`${this.apiUrl}/department-usage`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getCategorySummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/category-summary`, {
      headers: this.getHeaders(),
    });
  }

  getProductMovement(
    productId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any>(`${this.apiUrl}/product-movement/${productId}`, {
      headers: this.getHeaders(),
      params,
    });
  }
}
