import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { StoreProduct, StockSummary } from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root',
})
export class StoreProductService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}store-products`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllStoreProducts(query?: {
    search?: string;
    categoryId?: number;
    departmentId?: number;
    isActive?: boolean;
    lowStock?: boolean;
  }): Observable<StoreProduct[]> {
    let params = new HttpParams();
    if (query?.search) params = params.set('search', query.search);
    if (query?.categoryId)
      params = params.set('categoryId', query.categoryId.toString());
    if (query?.departmentId)
      params = params.set('departmentId', query.departmentId.toString());
    if (query?.isActive !== undefined)
      params = params.set('isActive', query.isActive.toString());
    if (query?.lowStock) params = params.set('lowStock', 'true');
    return this.http.get<StoreProduct[]>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getStoreProductById(id: number): Observable<StoreProduct> {
    return this.http.get<StoreProduct>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  getLowStock(): Observable<StoreProduct[]> {
    return this.http.get<StoreProduct[]>(`${this.apiUrl}/low-stock`, {
      headers: this.getHeaders(),
    });
  }

  getStockSummary(): Observable<StockSummary> {
    return this.http.get<StockSummary>(`${this.apiUrl}/summary`, {
      headers: this.getHeaders(),
    });
  }

  addStoreProduct(product: Partial<StoreProduct>): Observable<StoreProduct> {
    return this.http.post<StoreProduct>(this.apiUrl, product, {
      headers: this.getHeaders(),
    });
  }

  updateStoreProduct(
    id: number,
    data: Partial<StoreProduct>,
  ): Observable<StoreProduct> {
    return this.http.patch<StoreProduct>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteStoreProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
