import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import {
  PaymentMethodConfig,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '../interfaces/payment-method.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService {
  private apiUrl = `${environment.apiMainRootUrl}payment-methods`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new payment method
   */
  create(dto: CreatePaymentMethodDto): Observable<PaymentMethodConfig> {
    return this.http.post<PaymentMethodConfig>(this.apiUrl, dto);
  }

  /**
   * Get all payment methods for an organization
   */
  getByOrganization(organizationId: number): Observable<PaymentMethodConfig[]> {
    return this.http.get<PaymentMethodConfig[]>(
      `${this.apiUrl}/organization/${organizationId}`,
    );
  }

  /**
   * Get enabled payment methods only
   */
  getEnabledByOrganization(
    organizationId: number,
  ): Observable<PaymentMethodConfig[]> {
    return this.http.get<PaymentMethodConfig[]>(
      `${this.apiUrl}/organization/${organizationId}/enabled`,
    );
  }

  /**
   * Get a single payment method by ID
   */
  getOne(id: number): Observable<PaymentMethodConfig> {
    return this.http.get<PaymentMethodConfig>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update a payment method
   */
  update(
    id: number,
    dto: UpdatePaymentMethodDto,
  ): Observable<PaymentMethodConfig> {
    return this.http.put<PaymentMethodConfig>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Delete a payment method
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Toggle payment method enabled status
   */
  toggleEnabled(id: number): Observable<PaymentMethodConfig> {
    return this.http.patch<PaymentMethodConfig>(
      `${this.apiUrl}/${id}/toggle`,
      {},
    );
  }

  /**
   * Reorder payment methods
   */
  reorder(
    organizationId: number,
    orderedIds: number[],
  ): Observable<PaymentMethodConfig[]> {
    return this.http.post<PaymentMethodConfig[]>(
      `${this.apiUrl}/organization/${organizationId}/reorder`,
      { orderedIds },
    );
  }

  /**
   * Initialize default payment methods for new organizations
   */
  initializeDefaults(
    settingsId: number,
    organizationId: number,
  ): Observable<PaymentMethodConfig[]> {
    return this.http.post<PaymentMethodConfig[]>(
      `${this.apiUrl}/initialize-defaults`,
      { settingsId, organizationId },
    );
  }
}
