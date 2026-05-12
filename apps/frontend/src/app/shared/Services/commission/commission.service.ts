import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CommissionRecord,
  CommissionSummary,
  UserProductCommission,
  CreateUserProductCommissionDto,
  MarkCommissionPaidDto,
  CommissionPayment,
  CommissionStats,
  CommissionReportResponse,
} from '../../interfaces/commission.interface';
import { environment } from '../../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class CommissionService {
  private apiUrl = `${environment.apiMainRootUrl}commission`;

  constructor(private http: HttpClient) {}

  /**
   * Get commission summary for a user
   */
  getUserSummary(
    userId: number,
    organizationId: number,
    startDate?: Date,
    endDate?: Date,
  ): Observable<CommissionSummary> {
    let params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<CommissionSummary>(
      `${this.apiUrl}/summary/${userId}`,
      { params },
    );
  }

  /**
   * Get commission records for a user
   */
  getUserRecords(
    userId: number,
    organizationId: number,
    status?: string,
  ): Observable<CommissionRecord[]> {
    let params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<CommissionRecord[]>(
      `${this.apiUrl}/records/${userId}`,
      { params },
    );
  }

  /**
   * Set or update user-specific commission rate
   */
  setUserProductCommission(
    dto: CreateUserProductCommissionDto,
    organizationId: number,
  ): Observable<UserProductCommission> {
    const params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    return this.http.post<UserProductCommission>(
      `${this.apiUrl}/user-rate`,
      dto,
      { params },
    );
  }

  /**
   * Get all user-specific commission rates for a user
   */
  getUserProductCommissions(
    userId: number,
    organizationId: number,
  ): Observable<UserProductCommission[]> {
    const params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    return this.http.get<UserProductCommission[]>(
      `${this.apiUrl}/user-rates/${userId}`,
      { params },
    );
  }

  /**
   * Delete user-specific commission rate
   */
  deleteUserProductCommission(
    userId: number,
    productId: number,
  ): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user-rate/${userId}/${productId}`);
  }

  /**
   * Mark commissions as paid
   */
  markCommissionsAsPaid(
    dto: MarkCommissionPaidDto,
    organizationId: number,
  ): Observable<any> {
    const params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    return this.http.post(`${this.apiUrl}/mark-paid`, dto, { params });
  }

  /**
   * Get all commission payments
   */
  getCommissionPayments(
    organizationId: number,
  ): Observable<CommissionPayment[]> {
    const params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    return this.http.get<CommissionPayment[]>(`${this.apiUrl}/payments`, {
      params,
    });
  }

  /**
   * Get organization commission statistics
   */
  getOrganizationStats(organizationId: number): Observable<CommissionStats> {
    const params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    return this.http.get<CommissionStats>(`${this.apiUrl}/stats`, { params });
  }

  /**
   * Get commission report grouped by user for a date range
   */
  getCommissionReport(
    organizationId: number,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Observable<CommissionReportResponse> {
    let params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<CommissionReportResponse>(
      `${this.apiUrl}/report`,
      { params },
    );
  }

  /**
   * Calculate commission preview for items (before creating order)
   */
  calculatePreview(
    organizationId: number,
    userId: number,
    items: Array<{ productId: number; quantity: number; unitPrice: number }>,
  ): Observable<any> {
    const params = new HttpParams().set(
      'organizationId',
      organizationId.toString(),
    );

    return this.http.post(
      `${this.apiUrl}/calculate-preview`,
      { userId, items },
      { params },
    );
  }
}
