/**
 * Service for managing inventory batch tracking operations
 *
 * This service provides comprehensive functionality for batch management including
 * FIFO/FEFO allocation, batch lifecycle tracking, expiry monitoring, and serial number
 * management. It integrates with the modern inventory backend API.
 *
 * @remarks
 * - Supports FIFO (First-In-First-Out) and FEFO (First-Expire-First-Out) allocation
 * - Tracks batch status throughout lifecycle
 * - Monitors expiry dates and generates alerts
 * - Manages serial numbers for trackable items
 * - All operations return Observables for asynchronous data handling
 *
 * @example
 * ```typescript
 * constructor(private batchService: BatchTrackingService) {}
 *
 * // Create new batch
 * const batchData = {
 *   product_id: 123,
 *   batch_number: 'BATCH-2024-001',
 *   quantity_received: 100,
 *   buying_price: 25.50,
 *   expiry_date: '2025-12-31',
 *   supplier_id: 45
 * };
 * this.batchService.createBatch(batchData).subscribe(
 *   batch => console.log('Batch created:', batch)
 * );
 *
 * // Allocate stock using FIFO
 * this.batchService.allocateStock(productId, 50, 'FIFO').subscribe(
 *   allocation => console.log('Allocated batches:', allocation)
 * );
 *
 * // Get expiring batches
 * this.batchService.getExpiringBatches(30).subscribe(
 *   batches => console.log('Expiring in 30 days:', batches)
 * );
 * ```
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';
import {
  InventoryBatch,
  CreateBatchDto,
  UpdateBatchDto,
  BatchAllocationResult,
  SerialNumber,
  CreateSerialNumberDto,
  UpdateSerialNumberDto,
  BatchStatus,
} from '../interfaces/modern-inventory.interface';

@Injectable({
  providedIn: 'root',
})
export class BatchTrackingService {
  private apiUrl: string;
  private batchApiUrl: string;
  private serialApiUrl: string;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    const baseUrl = `${environment.apiRootUrl}inventory-management`;
    this.apiUrl = baseUrl;
    this.batchApiUrl = `${baseUrl}/batches`;
    this.serialApiUrl = `${baseUrl}/serial-numbers`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Create a new inventory batch
   * @param batchData - Batch creation data
   * @returns Observable of created batch
   */
  createBatch(batchData: CreateBatchDto): Observable<InventoryBatch> {
    return this.http.post<InventoryBatch>(this.batchApiUrl, batchData, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Get all batches with optional filtering
   * @param productId - Filter by product ID (optional)
   * @param status - Filter by batch status (optional)
   * @returns Observable of batch array
   */
  getAllBatches(
    productId?: number,
    status?: BatchStatus,
  ): Observable<InventoryBatch[]> {
    let params = new HttpParams();
    if (productId) {
      params = params.set('productId', productId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<InventoryBatch[]>(this.batchApiUrl, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Get batches for a specific product
   * @param productId - Product ID
   * @returns Observable of batch array
   */
  getBatchesByProduct(productId: number): Observable<InventoryBatch[]> {
    return this.http.get<InventoryBatch[]>(
      `${this.batchApiUrl}/product/${productId}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get a single batch by ID
   * @param batchId - Batch ID
   * @returns Observable of batch
   */
  getBatchById(batchId: number): Observable<InventoryBatch> {
    return this.http.get<InventoryBatch>(`${this.batchApiUrl}/${batchId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Update batch information
   * @param batchId - Batch ID
   * @param updateData - Batch update data
   * @returns Observable of updated batch
   */
  updateBatch(
    batchId: number,
    updateData: UpdateBatchDto,
  ): Observable<InventoryBatch> {
    return this.http.put<InventoryBatch>(
      `${this.batchApiUrl}/${batchId}`,
      updateData,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Approve a pending batch
   * @param batchId - Batch ID
   * @returns Observable of approved batch with updated product quantity
   */
  approveBatch(batchId: number): Observable<any> {
    return this.http.post<any>(
      `${this.batchApiUrl}/${batchId}/approve`,
      {},
      { headers: this.getHeaders() },
    );
  }

  /**
   * Reject a pending batch
   * @param batchId - Batch ID
   * @param reason - Rejection reason
   * @returns Observable of rejected batch
   */
  rejectBatch(batchId: number, reason: string): Observable<InventoryBatch> {
    return this.http.post<InventoryBatch>(
      `${this.batchApiUrl}/${batchId}/reject`,
      { reason },
      { headers: this.getHeaders() },
    );
  }

  /**
   * Delete a batch (only pending batches can be deleted)
   * @param batchId - Batch ID
   * @returns Observable of deletion result
   */
  deleteBatch(batchId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.batchApiUrl}/${batchId}`,
      { headers: this.getHeaders() },
    );
  }

  // ==================== BATCH ALLOCATION (FIFO/FEFO) ====================

  /**
   * Allocate stock using FIFO (First-In-First-Out) method
   * @param productId - Product ID
   * @param quantity - Quantity to allocate
   * @returns Observable of allocation result
   */
  allocateFIFO(
    productId: number,
    quantity: number,
  ): Observable<BatchAllocationResult> {
    return this.http.post<BatchAllocationResult>(
      `${this.batchApiUrl}/allocate/fifo`,
      { product_id: productId, quantity },
      { headers: this.getHeaders() },
    );
  }

  /**
   * Allocate stock using FEFO (First-Expire-First-Out) method
   * @param productId - Product ID
   * @param quantity - Quantity to allocate
   * @returns Observable of allocation result
   */
  allocateFEFO(
    productId: number,
    quantity: number,
  ): Observable<BatchAllocationResult> {
    return this.http.post<BatchAllocationResult>(
      `${this.batchApiUrl}/allocate/fefo`,
      { product_id: productId, quantity },
      { headers: this.getHeaders() },
    );
  }

  /**
   * Allocate stock using specified method (FIFO or FEFO)
   * @param productId - Product ID
   * @param quantity - Quantity to allocate
   * @param method - Allocation method ('FIFO' or 'FEFO')
   * @returns Observable of allocation result
   */
  allocateStock(
    productId: number,
    quantity: number,
    method: 'FIFO' | 'FEFO' = 'FIFO',
  ): Observable<BatchAllocationResult> {
    if (method === 'FEFO') {
      return this.allocateFEFO(productId, quantity);
    }
    return this.allocateFIFO(productId, quantity);
  }

  // ==================== EXPIRY MANAGEMENT ====================

  /**
   * Get batches expiring within specified days
   * @param days - Number of days ahead to check (default: 30)
   * @returns Observable of expiring batches
   */
  getExpiringBatches(days: number = 30): Observable<InventoryBatch[]> {
    return this.http.get<InventoryBatch[]>(
      `${this.batchApiUrl}/expiring/${days}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get batches that are already expired
   * @returns Observable of expired batches
   */
  getExpiredBatches(): Observable<InventoryBatch[]> {
    return this.http.get<InventoryBatch[]>(`${this.batchApiUrl}/expired`, {
      headers: this.getHeaders(),
    });
  }

  // ==================== BATCH STATUS MANAGEMENT ====================

  /**
   * Get batches by status
   * @param status - Batch status
   * @returns Observable of batches with specified status
   */
  getBatchesByStatus(status: BatchStatus): Observable<InventoryBatch[]> {
    return this.http.get<InventoryBatch[]>(
      `${this.batchApiUrl}/status/${status}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get low stock batches (quantity below threshold)
   * @param threshold - Minimum quantity threshold (optional)
   * @returns Observable of low stock batches
   */
  getLowStockBatches(threshold?: number): Observable<InventoryBatch[]> {
    let params = new HttpParams();
    if (threshold !== undefined) {
      params = params.set('threshold', threshold.toString());
    }

    return this.http.get<InventoryBatch[]>(`${this.batchApiUrl}/low-stock`, {
      params,
      headers: this.getHeaders(),
    });
  }

  // ==================== SERIAL NUMBER OPERATIONS ====================

  /**
   * Create a new serial number
   * @param serialData - Serial number creation data
   * @returns Observable of created serial number
   */
  createSerialNumber(
    serialData: CreateSerialNumberDto,
  ): Observable<SerialNumber> {
    return this.http.post<SerialNumber>(this.serialApiUrl, serialData, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Bulk create serial numbers
   * @param serialNumbers - Array of serial numbers to create
   * @returns Observable of created serial numbers
   */
  bulkCreateSerialNumbers(
    serialNumbers: CreateSerialNumberDto[],
  ): Observable<SerialNumber[]> {
    return this.http.post<SerialNumber[]>(
      `${this.serialApiUrl}/bulk`,
      { serial_numbers: serialNumbers },
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get all serial numbers for a batch
   * @param batchId - Batch ID
   * @returns Observable of serial numbers
   */
  getSerialNumbersByBatch(batchId: number): Observable<SerialNumber[]> {
    return this.http.get<SerialNumber[]>(
      `${this.serialApiUrl}/batch/${batchId}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get a serial number by its number
   * @param serialNumber - Serial number string
   * @returns Observable of serial number
   */
  getSerialNumberByNumber(serialNumber: string): Observable<SerialNumber> {
    return this.http.get<SerialNumber>(
      `${this.serialApiUrl}/number/${serialNumber}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Update serial number information
   * @param serialId - Serial number ID
   * @param updateData - Update data
   * @returns Observable of updated serial number
   */
  updateSerialNumber(
    serialId: number,
    updateData: UpdateSerialNumberDto,
  ): Observable<SerialNumber> {
    return this.http.patch<SerialNumber>(
      `${this.serialApiUrl}/${serialId}`,
      updateData,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Delete a serial number
   * @param serialId - Serial number ID
   * @returns Observable of deletion result
   */
  deleteSerialNumber(serialId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.serialApiUrl}/${serialId}`,
      { headers: this.getHeaders() },
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Calculate days until batch expiry
   * @param expiryDate - Expiry date
   * @returns Number of days until expiry (negative if expired)
   */
  calculateDaysToExpiry(expiryDate: Date | string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if batch is expiring soon
   * @param expiryDate - Expiry date
   * @param warningDays - Days threshold for warning (default: 30)
   * @returns True if expiring within warning period
   */
  isExpiringSoon(expiryDate: Date | string, warningDays: number = 30): boolean {
    const daysToExpiry = this.calculateDaysToExpiry(expiryDate);
    return daysToExpiry >= 0 && daysToExpiry <= warningDays;
  }

  /**
   * Check if batch is expired
   * @param expiryDate - Expiry date
   * @returns True if expired
   */
  isExpired(expiryDate: Date | string): boolean {
    return this.calculateDaysToExpiry(expiryDate) < 0;
  }

  /**
   * Get expiry status with urgency level
   * @param expiryDate - Expiry date
   * @returns Status object with urgency level and message
   */
  getExpiryStatus(expiryDate: Date | string): {
    urgency: 'critical' | 'warning' | 'normal';
    daysRemaining: number;
    message: string;
  } {
    const days = this.calculateDaysToExpiry(expiryDate);

    if (days < 0) {
      return {
        urgency: 'critical',
        daysRemaining: days,
        message: `Expired ${Math.abs(days)} days ago`,
      };
    } else if (days === 0) {
      return {
        urgency: 'critical',
        daysRemaining: 0,
        message: 'Expires today',
      };
    } else if (days <= 7) {
      return {
        urgency: 'critical',
        daysRemaining: days,
        message: `Expires in ${days} day${days > 1 ? 's' : ''}`,
      };
    } else if (days <= 30) {
      return {
        urgency: 'warning',
        daysRemaining: days,
        message: `Expires in ${days} days`,
      };
    } else {
      return {
        urgency: 'normal',
        daysRemaining: days,
        message: `${days} days until expiry`,
      };
    }
  }

  /**
   * Format batch number with prefix
   * @param number - Batch number
   * @returns Formatted batch number
   */
  formatBatchNumber(number: string): string {
    if (!number.startsWith('BATCH-')) {
      return `BATCH-${number}`;
    }
    return number;
  }

  /**
   * Calculate total value of batch
   * @param batch - Inventory batch
   * @returns Total value (quantity * buying_price)
   */
  calculateBatchValue(batch: InventoryBatch): number {
    return batch.quantity_available * batch.buying_price;
  }
}
