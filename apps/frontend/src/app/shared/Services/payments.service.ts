import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';

export interface Payment {
  createdAt?: string | number | Date;
  amount: number;
  method: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT';
  transactionType: 'SALE' | 'CREDIT_SALE' | 'EXPENSE';
  paymentType: 'INCOME' | 'EXPENSE';
  paidBy: string;
  paidTo: string;
  description: string;
  transactionCode?: string;
  paymentReference?: string;
  orderId?: number;
  creditSaleId?: number;
}

export interface PaymentReport {
  summary: {
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
  };
  breakdowns: {
    byPaymentMethod: any[];
    byTransactionType: any[];
  };
  payments: Payment[];
  filters: {
    startDate?: string;
    endDate?: string;
    paymentType?: string;
    transactionType?: string;
    method?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  constructor(private http: HttpClient) {}

  recordAnyPayment(payment: Payment) {
    return this.http.post(`${environment.apiRootUrl}payments`, payment);
  }

  // Record payment for a sale
  recordSalePayment(orderId: number, payment: Payment): Observable<any> {
    return this.http.post(
      `${environment.apiRootUrl}payments/sales/${orderId}`,
      payment,
    );
  }

  // Record payment for a credit sale
  recordCreditSalePayment(
    creditSaleId: number,
    payment: Payment,
  ): Observable<any> {
    return this.http.post(
      `${environment.apiRootUrl}payments/credit-sales/${creditSaleId}`,
      payment,
    );
  }

  getPaymentReports(filters: {
    startDate?: string;
    endDate?: string;
    paymentType?: string;
    transactionType?: string;
    method?: string;
    search?: string;
  }): Observable<PaymentReport> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return this.http.get<PaymentReport>(
      `${environment.apiRootUrl}payments/reports?${params.toString()}`,
    );
  }
}
