import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';
import {
  Receivable,
  ReceivableCreateUpdate,
  ReceivablePaymentCreate,
  ReceivablesResponse,
  ReceivablePayment,
  AgingReport,
  ReceivableStatus,
} from '../interfaces/receivable.interface';

@Injectable({
  providedIn: 'root',
})
export class AccountsReceivableService {
  private apiUrl: string;
  private savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}accounts-receivable`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Receivable CRUD operations
  createReceivable(receivableData: ReceivableCreateUpdate): Observable<Receivable> {
    return this.http.post<Receivable>(
      `${this.apiUrl}/receivables`,
      receivableData,
      { headers: this.getHeaders() }
    );
  }

  getAllReceivables(filters?: {
    customerId?: number;
    status?: ReceivableStatus;
    startDate?: string;
    endDate?: string;
    dueStartDate?: string;
    dueEndDate?: string;
  }): Observable<ReceivablesResponse> {
    let params = new HttpParams();

    if (filters?.customerId) {
      params = params.set('customerId', filters.customerId.toString());
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters?.dueStartDate) {
      params = params.set('dueStartDate', filters.dueStartDate);
    }
    if (filters?.dueEndDate) {
      params = params.set('dueEndDate', filters.dueEndDate);
    }

    return this.http.get<ReceivablesResponse>(
      `${this.apiUrl}/receivables`,
      { headers: this.getHeaders(), params }
    );
  }

  getReceivableById(id: number): Observable<Receivable> {
    return this.http.get<Receivable>(
      `${this.apiUrl}/receivables/${id}`,
      { headers: this.getHeaders() }
    );
  }

  updateReceivable(id: number, receivableData: Partial<ReceivableCreateUpdate>): Observable<Receivable> {
    return this.http.put<Receivable>(
      `${this.apiUrl}/receivables/${id}`,
      receivableData,
      { headers: this.getHeaders() }
    );
  }

  deleteReceivable(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/receivables/${id}`,
      { headers: this.getHeaders() }
    );
  }

  approveReceivable(id: number, approvedBy: number): Observable<Receivable> {
    return this.http.patch<Receivable>(
      `${this.apiUrl}/receivables/${id}/approve`,
      { approvedBy },
      { headers: this.getHeaders() }
    );
  }

  // Receivable Payment operations
  createReceivablePayment(paymentData: ReceivablePaymentCreate): Observable<ReceivablePayment> {
    return this.http.post<ReceivablePayment>(
      `${this.apiUrl}/payments`,
      paymentData,
      { headers: this.getHeaders() }
    );
  }

  getReceivablePayments(receivableId?: number): Observable<{ payments: ReceivablePayment[] }> {
    let params = new HttpParams();
    if (receivableId) {
      params = params.set('receivableId', receivableId.toString());
    }

    return this.http.get<{ payments: ReceivablePayment[] }>(
      `${this.apiUrl}/payments`,
      { headers: this.getHeaders(), params }
    );
  }

  // Aging report
  getAgingReport(): Observable<AgingReport> {
    return this.http.get<AgingReport>(
      `${this.apiUrl}/aging-report`,
      { headers: this.getHeaders() }
    );
  }
}