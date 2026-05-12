import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import {
  Supplier,
  AgingAnalysis,
  BillSummary,
  BulkBillPaymentDto,
  BulkPaymentResult,
  PaymentHistoryFilter,
  PaymentHistoryResponse,
  SupplierFilter,
  PaymentMethodConfig,
} from '../../types/creditors.types';

@Injectable({
  providedIn: 'root',
})
export class CreditorsService {
  private apiUrl = `${environment.apiRootUrl}accounts-payable`;

  constructor(private http: HttpClient) {}

  // Aging Analysis
  getAgingAnalysis(): Observable<AgingAnalysis> {
    return this.http.get<AgingAnalysis>(`${this.apiUrl}/aging-analysis`);
  }

  // Get all suppliers
  getAllSuppliers(filter?: SupplierFilter): Observable<Supplier[]> {
    let params = new HttpParams();

    if (filter?.searchQuery) {
      params = params.set('searchQuery', filter.searchQuery);
    }

    if (filter?.showOnlyWithDebt !== undefined) {
      params = params.set(
        'showOnlyWithDebt',
        filter.showOnlyWithDebt.toString(),
      );
    }

    return this.http.get<Supplier[]>(`${this.apiUrl}/suppliers`, { params });
  }

  // Get supplier statement
  getSupplierStatement(
    supplierId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<any> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get(`${this.apiUrl}/suppliers/${supplierId}/statement`, {
      params,
    });
  }

  // Get outstanding bills for a supplier
  getOutstandingBills(supplierId: number): Observable<BillSummary[]> {
    let params = new HttpParams()
      .set('supplierId', supplierId.toString())
      .set('status', 'DRAFT,APPROVED,PARTIALLY_PAID,OVERDUE');

    return this.http
      .get<any>(`${this.apiUrl}/bills`, { params })
      .pipe
      // Map to extract just the bills array if response is wrapped
      ();
  }

  // Record bulk bill payment
  recordBulkPayment(dto: BulkBillPaymentDto): Observable<BulkPaymentResult> {
    return this.http.post<BulkPaymentResult>(
      `${this.apiUrl}/bulk-payment`,
      dto,
    );
  }

  // Get payment history
  getPaymentHistory(
    filter?: PaymentHistoryFilter,
  ): Observable<PaymentHistoryResponse> {
    let params = new HttpParams();

    if (filter?.searchQuery) {
      params = params.set('searchQuery', filter.searchQuery);
    }

    if (filter?.startDate) {
      params = params.set('startDate', filter.startDate);
    }

    if (filter?.endDate) {
      params = params.set('endDate', filter.endDate);
    }

    if (filter?.paymentMethod) {
      params = params.set('paymentMethod', filter.paymentMethod);
    }

    if (filter?.supplierId) {
      params = params.set('supplierId', filter.supplierId.toString());
    }

    if (filter?.page) {
      params = params.set('page', filter.page.toString());
    }

    if (filter?.limit) {
      params = params.set('limit', filter.limit.toString());
    }

    return this.http.get<PaymentHistoryResponse>(
      `${this.apiUrl}/payment-history`,
      { params },
    );
  }

  // Get payment methods
  getPaymentMethods(): Observable<PaymentMethodConfig[]> {
    return this.http.get<PaymentMethodConfig[]>(
      `${environment.apiRootUrl}debtors/payment-methods`,
    );
  }
}
