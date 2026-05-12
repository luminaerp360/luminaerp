import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';
import {
  Bill,
  BillCreateUpdate,
  BillPaymentCreate,
  BillsResponse,
  BillPayment,
  AgingReport,
  BillStatus,
} from '../interfaces/bill.interface';
import { CreateBillDto } from '../../types/bill.types';

@Injectable({
  providedIn: 'root',
})
export class AccountsPayableService {
  private apiUrl: string;
  private savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}accounts-payable`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // Bill CRUD operations
  createBill(billData: CreateBillDto | BillCreateUpdate): Observable<Bill> {
    return this.http.post<Bill>(`${this.apiUrl}/bills`, billData, {
      headers: this.getHeaders(),
    });
  }

  getAllBills(filters?: {
    supplierId?: number;
    status?: BillStatus;
    startDate?: string;
    endDate?: string;
    dueStartDate?: string;
    dueEndDate?: string;
  }): Observable<BillsResponse> {
    let params = new HttpParams();

    if (filters?.supplierId)
      params = params.set('supplierId', filters.supplierId.toString());
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.dueStartDate)
      params = params.set('dueStartDate', filters.dueStartDate);
    if (filters?.dueEndDate)
      params = params.set('dueEndDate', filters.dueEndDate);

    return this.http.get<BillsResponse>(`${this.apiUrl}/bills`, {
      params,
      headers: this.getHeaders(),
    });
  }

  getBillById(id: number): Observable<Bill> {
    return this.http.get<Bill>(`${this.apiUrl}/bills/${id}`, {
      headers: this.getHeaders(),
    });
  }

  updateBill(
    id: number,
    billData: Partial<BillCreateUpdate>,
  ): Observable<Bill> {
    return this.http.put<Bill>(`${this.apiUrl}/bills/${id}`, billData, {
      headers: this.getHeaders(),
    });
  }

  deleteBill(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bills/${id}`, {
      headers: this.getHeaders(),
    });
  }

  approveBill(id: number, approvedBy: number): Observable<Bill> {
    return this.http.patch<Bill>(
      `${this.apiUrl}/bills/${id}/approve`,
      { approvedBy },
      { headers: this.getHeaders() },
    );
  }

  // Bill Payment operations
  createBillPayment(paymentData: BillPaymentCreate): Observable<BillPayment> {
    return this.http.post<BillPayment>(`${this.apiUrl}/payments`, paymentData, {
      headers: this.getHeaders(),
    });
  }

  getBillPayments(billId?: number): Observable<BillPayment[]> {
    let params = new HttpParams();
    if (billId) params = params.set('billId', billId.toString());

    return this.http.get<BillPayment[]>(`${this.apiUrl}/payments`, {
      params,
      headers: this.getHeaders(),
    });
  }

  // Reporting
  getAgingReport(): Observable<AgingReport> {
    return this.http.get<AgingReport>(`${this.apiUrl}/aging-report`, {
      headers: this.getHeaders(),
    });
  }

  // Admin operations
  updateOverdueBills(): Observable<{ updatedCount: number; bills: any[] }> {
    return this.http.post<{ updatedCount: number; bills: any[] }>(
      `${this.apiUrl}/update-overdue`,
      {},
      { headers: this.getHeaders() },
    );
  }

  createBillFromLPO(lpoId: number, createdBy: number): Observable<Bill> {
    return this.http.post<Bill>(
      `${this.apiUrl}/bills/from-lpo/${lpoId}`,
      { createdBy },
      { headers: this.getHeaders() },
    );
  }

  // Utility methods
  calculateNetAmount(
    totalAmount: number,
    taxAmount: number = 0,
    discountAmount: number = 0,
  ): number {
    return totalAmount + taxAmount - discountAmount;
  }

  calculateBalance(netAmount: number, paidAmount: number): number {
    return netAmount - paidAmount;
  }

  isOverdue(dueDate: string): boolean {
    const due = new Date(dueDate);
    const now = new Date();
    return now > due;
  }

  getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Bulk payment operations
  createMultipleBillPayments(paymentData: {
    billIds: number[];
    totalAmount: number;
    paymentMethod: string;
    referenceNumber?: string;
    transactionCode?: string;
    notes?: string;
    createdBy: number;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/payments/multiple`,
      paymentData,
      { headers: this.getHeaders() },
    );
  }

  // Supplier statement operations
  getSupplierStatement(
    supplierId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<any>(
      `${this.apiUrl}/suppliers/${supplierId}/statement`,
      { params, headers: this.getHeaders() },
    );
  }

  getSupplierSummaries(
    startDate?: string,
    endDate?: string,
  ): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<any[]>(`${this.apiUrl}/suppliers/summaries`, {
      params,
      headers: this.getHeaders(),
    });
  }
}
