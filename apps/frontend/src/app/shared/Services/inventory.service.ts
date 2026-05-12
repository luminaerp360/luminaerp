/**
 * Service for managing inventory operations
 *
 * This service provides comprehensive functionality for inventory management including
 * CRUD operations, date-based reporting, and stock transfer management. It integrates
 * with local storage for organization context and supports various inventory querying
 * patterns.
 *
 * @remarks
 * - Requires organization context from LocalStorageService
 * - Supports both single-day and date range inventory reporting
 * - Handles stock transfer operations
 * - All operations return Observables for asynchronous data handling
 *
 * @example
 * ```typescript
 * constructor(private inventoryService: InventoryService) {}
 *
 * // Get inventory for a specific date
 * this.inventoryService.getInventoryForADay('2024-01-01').subscribe(
 *   inventory => console.log('Daily inventory:', inventory)
 * );
 *
 * // Get inventory for date range
 * this.inventoryService.getInventoryForADateRange(
 *   '2024-01-01',
 *   '2024-01-31'
 * ).subscribe(
 *   inventory => console.log('Monthly inventory:', inventory)
 * );
 *
 * // Create stock transfer
 * const transfer = {
 *   sourceLocation: 'Warehouse A',
 *   destinationLocation: 'Store B',
 *   items: [{ productId: '123', quantity: 50 }]
 * };
 * this.inventoryService.createStockTransfer(transfer).subscribe(
 *   response => console.log('Transfer created:', response)
 * );
 * ```
 */

import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../Environments/environments';
import { Inventory } from '../interfaces/inventory.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private apiUrl: string;
  savedOrg: string | null;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.savedOrg = this.localStorageService.getSavedOrgId();
    this.apiUrl = `${environment.apiRootUrl}inventory`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllInventorys(): Observable<Inventory[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<Inventory[]>(url, { headers: this.getHeaders() });
  }

  getInventoryForADay(date: string): Observable<Inventory[]> {
    const url = `${this.apiUrl}/report/day`;
    let params = new HttpParams().set('date', date);
    return this.http.get<Inventory[]>(url, {
      params,
      headers: this.getHeaders(),
    });
  }

  getInventoryForADateRange(
    startDate: string,
    endDate: string,
  ): Observable<Inventory[]> {
    const url = `${this.apiUrl}/report/range`;
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<Inventory[]>(url, {
      params,
      headers: this.getHeaders(),
    });
  }

  addInventory(inventory: any): Observable<any> {
    const url = `${this.apiUrl}`;
    return this.http.post<any>(url, inventory, { headers: this.getHeaders() });
  }

  getInventorybyId(id: string): Observable<Inventory> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Inventory>(url, { headers: this.getHeaders() });
  }

  updateInventory(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteInventory(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  approvePurchase(id: number, data: { approvedBy: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/approve`, data, {
      headers: this.getHeaders(),
    });
  }

  receivePurchase(
    id: number,
    data: { receivedBy: string; items?: any[] },
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/receive`, data, {
      headers: this.getHeaders(),
    });
  }

  cancelPurchase(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${id}/cancel`,
      {},
      { headers: this.getHeaders() },
    );
  }

  createStockTransfer(stock: any): Observable<any> {
    const apiUrl: string = `${this.apiUrl}/inventory-movements`;
    return this.http.post<any>(apiUrl, stock, { headers: this.getHeaders() });
  }

  getStockTransfer(): Observable<any> {
    const url = `${this.apiUrl}/inventory-movements`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }
}
