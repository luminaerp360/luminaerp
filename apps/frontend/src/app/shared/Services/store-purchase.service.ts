import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { StorePurchase, PurchaseStatus } from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root',
})
export class StorePurchaseService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}store-purchases`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllStorePurchases(query?: {
    status?: PurchaseStatus;
    supplierId?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<StorePurchase[]> {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.supplierId)
      params = params.set('supplierId', query.supplierId.toString());
    if (query?.startDate) params = params.set('startDate', query.startDate);
    if (query?.endDate) params = params.set('endDate', query.endDate);
    return this.http.get<StorePurchase[]>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getStorePurchaseById(id: number): Observable<StorePurchase> {
    return this.http.get<StorePurchase>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  addStorePurchase(data: any): Observable<StorePurchase> {
    return this.http.post<StorePurchase>(this.apiUrl, data, {
      headers: this.getHeaders(),
    });
  }

  updateStorePurchase(id: number, data: any): Observable<StorePurchase> {
    return this.http.patch<StorePurchase>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  approveStorePurchase(id: number): Observable<StorePurchase> {
    return this.http.patch<StorePurchase>(
      `${this.apiUrl}/${id}/approve`,
      {},
      {
        headers: this.getHeaders(),
      },
    );
  }

  rejectStorePurchase(id: number, reason: string): Observable<StorePurchase> {
    return this.http.patch<StorePurchase>(
      `${this.apiUrl}/${id}/reject`,
      { reason },
      {
        headers: this.getHeaders(),
      },
    );
  }

  receiveStorePurchase(
    id: number,
    items: { itemId: number; receivedQuantity: number }[],
    notes?: string,
  ): Observable<StorePurchase> {
    return this.http.patch<StorePurchase>(
      `${this.apiUrl}/${id}/receive`,
      { items, notes },
      {
        headers: this.getHeaders(),
      },
    );
  }

  getGrn(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/grn`, {
      headers: this.getHeaders(),
    });
  }

  getReceiveHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/receives`, {
      headers: this.getHeaders(),
    });
  }

  getReceiveGrn(purchaseId: number, receiveId: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${purchaseId}/receives/${receiveId}/grn`,
      {
        headers: this.getHeaders(),
      },
    );
  }

  cancelStorePurchase(id: number): Observable<StorePurchase> {
    return this.http.patch<StorePurchase>(
      `${this.apiUrl}/${id}/cancel`,
      {},
      {
        headers: this.getHeaders(),
      },
    );
  }

  deleteStorePurchase(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
