/**
 * Service for managing credit sale payments
 *
 * This service provides methods to create and retrieve credit sale payments
 * through HTTP requests to the backend API. It handles different payment methods
 * including cash, M-PESA, and bank transfers.
 *
 * @remarks
 * All methods require authentication and will automatically attach the Bearer token
 * from localStorage.
 *
 * @example
 * ```typescript
 * constructor(private creditPaymentsService: CreditPaymentsService) {}
 *
 * // Create a new payment
 * const payment: CreditSalePayment = {
 *   creditSaleId: 123,
 *   amount: 1000,
 *   paymentMethod: 'MPESA',
 *   transactionCode: 'ABC123'
 * };
 * this.creditPaymentsService.createPayment(payment).subscribe(
 *   response => console.log('Payment created', response)
 * );
 * ```
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';

export interface CreditSalePayment {
  creditSaleId: number;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER';
  transactionCode?: string;
}

export interface MultipleCreditSalePayment {
  creditSaleIds: number[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER';
  transactionCode?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreditPaymentsService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}credit-sale-payments`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  createPayment(payment: CreditSalePayment): Observable<any> {
    return this.http.post(`${this.apiUrl}`, payment, {
      headers: this.getHeaders(),
    });
  }

  createMultiplePayments(payment: MultipleCreditSalePayment): Observable<any> {
    return this.http.post(`${this.apiUrl}/multiple`, payment, {
      headers: this.getHeaders(),
    });
  }

  getPaymentsByCreditSaleId(creditSaleId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/credit-sale/${creditSaleId}`, {
      headers: this.getHeaders(),
    });
  }

  getPaymentsByMethod(method: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/method/${method}`, {
      headers: this.getHeaders(),
    });
  }

  getTotalPaymentsByMethod(method: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/total/method/${method}`, {
      headers: this.getHeaders(),
    });
  }

  getCustomerCreditStatement(
    customerId: number,
    startDate: string,
    endDate: string
  ): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/customer-statement/${customerId}?startDate=${startDate}&endDate=${endDate}`,
      { headers: this.getHeaders() }
    );
  }
}
