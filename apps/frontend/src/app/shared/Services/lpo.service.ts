/**
 * Service for managing Local Purchase Orders (LPO)
 *
 * This service provides comprehensive functionality for managing LPOs including
 * creation, retrieval, updates, and deletion. It supports organization-specific
 * context and includes specialized queries for pending LPOs and date-range based
 * retrieval.
 *
 * @remarks
 * - Requires organization context from LocalStorageService
 * - Supports filtering LPOs by status (pending)
 * - Provides date range-based querying
 * - All operations return Observables for asynchronous data handling
 *
 * @example
 * ```typescript
 * constructor(private lpoService: LpoService) {}
 *
 * // Create a new LPO
 * const newLpo: LpoInterface = {
 *   supplierName: 'ABC Suppliers',
 *   orderDate: '2024-01-01',
 *   items: [
 *     { itemName: 'Product A', quantity: 100, unitPrice: 50 }
 *   ]
 *   // ... other LPO properties
 * };
 * this.lpoService.addLpo(newLpo).subscribe(
 *   response => console.log('LPO created:', response)
 * );
 *
 * // Get pending LPOs
 * this.lpoService.getAllPendingLpo().subscribe(
 *   pendingLpos => console.log('Pending LPOs:', pendingLpos)
 * );
 *
 * // Get LPOs for a date range
 * this.lpoService.getLposByDateRange(
 *   '2024-01-01',
 *   '2024-01-31'
 * ).subscribe(
 *   lpos => console.log('Monthly LPOs:', lpos)
 * );
 * ```
 */

import { Injectable } from '@angular/core';
import {
  LpoInterface,
  ConvertToPurchaseDto,
  RejectLpoDto,
} from '../interfaces/lpo.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class LpoService {
  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}lpo`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllLpo(): Observable<LpoInterface[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<LpoInterface[]>(url, { headers: this.getHeaders() });
  }

  getAllPendingLpo(): Observable<LpoInterface[]> {
    const url = `${this.apiUrl}/pending`;
    return this.http.get<LpoInterface[]>(url, { headers: this.getHeaders() });
  }

  getAllApprovedLpo(): Observable<LpoInterface[]> {
    const url = `${this.apiUrl}/approved`;
    return this.http.get<LpoInterface[]>(url, { headers: this.getHeaders() });
  }

  addLpo(lpoInterface: Partial<LpoInterface>): Observable<LpoInterface> {
    const url = `${this.apiUrl}`;
    return this.http.post<LpoInterface>(url, lpoInterface, {
      headers: this.getHeaders(),
    });
  }

  getLpoId(id: number): Observable<LpoInterface> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<LpoInterface>(url, { headers: this.getHeaders() });
  }

  getLposByDateRange(
    startDate: string,
    endDate: string,
  ): Observable<LpoInterface[]> {
    return this.http.get<LpoInterface[]>(`${this.apiUrl}/range`, {
      params: { startDate, endDate },
      headers: this.getHeaders(),
    });
  }

  updateLpo(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  approveLpo(id: number): Observable<LpoInterface> {
    const url = `${this.apiUrl}/${id}/approve`;
    return this.http.put<LpoInterface>(url, {}, { headers: this.getHeaders() });
  }

  rejectLpo(id: number, dto: RejectLpoDto): Observable<LpoInterface> {
    const url = `${this.apiUrl}/${id}/reject`;
    return this.http.put<LpoInterface>(url, dto, {
      headers: this.getHeaders(),
    });
  }

  convertToPurchase(id: number, dto: ConvertToPurchaseDto): Observable<any> {
    const url = `${this.apiUrl}/${id}/convert-to-purchase`;
    return this.http.post<any>(url, dto, { headers: this.getHeaders() });
  }

  deleteLpo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
