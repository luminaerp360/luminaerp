import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DebtorFilters,
  DebtorsResponse,
  AgingAnalysisResponse,
  CustomerStatementFilters,
  CustomerStatementResponse,
  RecordBulkPaymentDto,
  BulkPaymentResponse,
  CustomerOutstandingResponse,
  PaymentHistoryResponse,
  PaymentHistoryFilters,
  AllPaymentHistoryResponse,
  AllCustomersResponse,
  CustomerWalletResponse,
  WalletTransactionsResponse,
  WalletTransactionFilters,
  RecordCustomerDepositDto,
  DepositResponse,
  ApplyWalletToInvoicesDto,
  ApplyWalletResponse,
  RecordBulkPaymentWithWalletDto,
  BulkPaymentWithWalletResponse,
} from '../../types/debtors.types';
import { environment } from '../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class DebtorsService {
  private apiUrl = `${environment.apiMainRootUrl}debtors`;

  constructor(private http: HttpClient) {}

  /**
   * Get all debtors with outstanding invoices
   */
  getAllDebtors(filters: DebtorFilters): Observable<DebtorsResponse> {
    let params = new HttpParams();

    if (filters.customerId) {
      params = params.set('customerId', filters.customerId.toString());
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.agingPeriod) {
      params = params.set('agingPeriod', filters.agingPeriod);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<DebtorsResponse>(this.apiUrl, { params });
  }

  /**
   * Get aging analysis report
   */
  getAgingAnalysis(): Observable<AgingAnalysisResponse> {
    return this.http.get<AgingAnalysisResponse>(
      `${this.apiUrl}/aging-analysis`,
    );
  }

  /**
   * Get customer statement
   */
  getCustomerStatement(
    filters: CustomerStatementFilters,
  ): Observable<CustomerStatementResponse> {
    let params = new HttpParams();

    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.format) {
      params = params.set('format', filters.format);
    }

    return this.http.get<CustomerStatementResponse>(
      `${this.apiUrl}/customer/${filters.customerId}/statement`,
      { params },
    );
  }

  /**
   * Get payment history for a customer
   */
  getCustomerPaymentHistory(
    customerId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<PaymentHistoryResponse> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<PaymentHistoryResponse>(
      `${this.apiUrl}/customer/${customerId}/payments`,
      { params },
    );
  }

  /**
   * Get outstanding invoices for a customer
   */
  getCustomerOutstandingInvoices(
    customerId: number,
  ): Observable<CustomerOutstandingResponse> {
    return this.http.get<CustomerOutstandingResponse>(
      `${this.apiUrl}/customer/${customerId}/outstanding`,
    );
  }

  /**
   * Record bulk payment for multiple invoices
   */
  recordBulkPayment(
    dto: RecordBulkPaymentDto,
  ): Observable<BulkPaymentResponse> {
    return this.http.post<BulkPaymentResponse>(
      `${this.apiUrl}/bulk-payment`,
      dto,
    );
  }

  /**
   * Get enabled payment methods for the organization
   */
  getPaymentMethods(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/payment-methods`);
  }

  /**
   * Get all payment history with filters
   */
  getAllPaymentHistory(
    filters: PaymentHistoryFilters,
  ): Observable<AllPaymentHistoryResponse> {
    let params = new HttpParams();

    if (filters.customerId) {
      params = params.set('customerId', filters.customerId.toString());
    }
    if (filters.invoiceId) {
      params = params.set('invoiceId', filters.invoiceId.toString());
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.paymentMethodCode) {
      params = params.set('paymentMethodCode', filters.paymentMethodCode);
    }
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<AllPaymentHistoryResponse>(
      `${this.apiUrl}/payment-history`,
      { params },
    );
  }

  /**
   * Get all customers (with or without debt)
   */
  getAllCustomers(
    search?: string,
    page?: number,
    limit?: number,
  ): Observable<AllCustomersResponse> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }
    if (page) {
      params = params.set('page', page.toString());
    }
    if (limit) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<AllCustomersResponse>(`${this.apiUrl}/customers`, {
      params,
    });
  }

  // ============================
  // CUSTOMER WALLET METHODS
  // ============================

  /**
   * Get customer wallet balance and summary
   */
  getCustomerWallet(customerId: number): Observable<CustomerWalletResponse> {
    return this.http.get<CustomerWalletResponse>(
      `${this.apiUrl}/customer/${customerId}/wallet`,
    );
  }

  /**
   * Get customer wallet transactions
   */
  getCustomerWalletTransactions(
    customerId: number,
    filters?: WalletTransactionFilters,
  ): Observable<WalletTransactionsResponse> {
    let params = new HttpParams();

    if (filters?.type) {
      params = params.set('type', filters.type);
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<WalletTransactionsResponse>(
      `${this.apiUrl}/customer/${customerId}/wallet-transactions`,
      { params },
    );
  }

  /**
   * Record a customer deposit (advance payment)
   */
  recordCustomerDeposit(
    dto: RecordCustomerDepositDto,
  ): Observable<DepositResponse> {
    return this.http.post<DepositResponse>(
      `${this.apiUrl}/customer-deposit`,
      dto,
    );
  }

  /**
   * Apply wallet balance to invoices
   */
  applyWalletToInvoices(
    dto: ApplyWalletToInvoicesDto,
  ): Observable<ApplyWalletResponse> {
    return this.http.post<ApplyWalletResponse>(
      `${this.apiUrl}/apply-wallet`,
      dto,
    );
  }

  /**
   * Record bulk payment with overpayment/wallet support
   */
  recordBulkPaymentWithWallet(
    dto: RecordBulkPaymentWithWalletDto,
  ): Observable<BulkPaymentWithWalletResponse> {
    return this.http.post<BulkPaymentWithWalletResponse>(
      `${this.apiUrl}/bulk-payment-wallet`,
      dto,
    );
  }
}
