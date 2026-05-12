import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';
import {
  StockSheetSummary,
  CurrentStockValue,
} from '../interfaces/stock-sheet.interface';

@Injectable({
  providedIn: 'root',
})
export class StockSheetService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.apiUrl = `${environment.apiRootUrl}inventory-management`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Get stock sheet for a specific date
   */
  getStockSheet(
    date: string,
    productId?: number,
    categoryId?: number,
  ): Observable<StockSheetSummary> {
    let params = new HttpParams().set('date', date);

    if (productId) {
      params = params.set('productId', productId.toString());
    }

    if (categoryId) {
      params = params.set('categoryId', categoryId.toString());
    }

    return this.http.get<StockSheetSummary>(`${this.apiUrl}/stock-sheet`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /**
   * Get stock sheet for a date range
   */
  getStockSheetRange(
    startDate: string,
    endDate: string,
  ): Observable<StockSheetSummary[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<StockSheetSummary[]>(
      `${this.apiUrl}/stock-sheet/range`,
      {
        headers: this.getHeaders(),
        params,
      },
    );
  }

  /**
   * Get current stock value
   */
  getCurrentStockValue(): Observable<CurrentStockValue> {
    return this.http.get<CurrentStockValue>(
      `${this.apiUrl}/stock-sheet/current-value`,
      {
        headers: this.getHeaders(),
      },
    );
  }
}
