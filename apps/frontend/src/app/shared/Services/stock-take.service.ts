import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import {
  StockTake,
  StockTakeListResponse,
  StockTakeSummary,
} from '../interfaces/stock-take.interface';

@Injectable({
  providedIn: 'root',
})
export class StockTakeService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiMainRootUrl}stock-takes`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  getStockTakes(
    query: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Observable<StockTakeListResponse> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<StockTakeListResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getStockTake(id: number): Observable<StockTake> {
    return this.http.get<StockTake>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  getSummary(): Observable<StockTakeSummary> {
    return this.http.get<StockTakeSummary>(`${this.apiUrl}/summary`, {
      headers: this.getHeaders(),
    });
  }

  createStockTake(data: {
    type?: string;
    notes?: string;
    items: {
      productId: number;
      productName: string;
      systemQuantity: number;
      countedQuantity: number;
      unitCost: number;
      reason?: string;
      notes?: string;
    }[];
  }): Observable<StockTake> {
    return this.http.post<StockTake>(this.apiUrl, data, {
      headers: this.getHeaders(),
    });
  }

  completeStockTake(
    id: number,
    data: {
      adjustInventory: boolean;
      notes?: string;
    },
  ): Observable<StockTake> {
    return this.http.patch<StockTake>(`${this.apiUrl}/${id}/complete`, data, {
      headers: this.getHeaders(),
    });
  }

  cancelStockTake(id: number): Observable<StockTake> {
    return this.http.patch<StockTake>(
      `${this.apiUrl}/${id}/cancel`,
      {},
      {
        headers: this.getHeaders(),
      },
    );
  }

  deleteStockTake(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(value || 0);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
