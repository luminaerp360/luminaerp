/**
 * Service for managing inventory movements and audit trail
 *
 * This service provides comprehensive functionality for tracking all inventory movements,
 * maintaining audit trails, generating analytics, and monitoring trends. It supports
 * 13 different movement types for complete inventory lifecycle tracking.
 *
 * @remarks
 * - Tracks all inventory movements (purchases, sales, adjustments, transfers, etc.)
 * - Maintains complete audit trail for compliance
 * - Provides analytics and trend analysis
 * - Supports location-based movement tracking
 * - All operations return Observables for asynchronous data handling
 *
 * @example
 * ```typescript
 * constructor(private movementService: InventoryMovementService) {}
 *
 * // Record a sale movement
 * const saleMovement = {
 *   product_id: 123,
 *   batch_id: 456,
 *   movement_type: MovementType.SALE,
 *   quantity: 10,
 *   unit_cost: 25.50,
 *   reference_number: 'INV-2024-001',
 *   notes: 'Customer purchase'
 * };
 * this.movementService.createMovement(saleMovement).subscribe(
 *   movement => console.log('Movement recorded:', movement)
 * );
 *
 * // Get analytics for last 30 days
 * this.movementService.getAnalytics(30).subscribe(
 *   analytics => console.log('Movement analytics:', analytics)
 * );
 * ```
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';
import {
  InventoryMovement,
  CreateMovementDto,
  MovementType,
  MovementAnalytics,
  MovementTrend,
} from '../interfaces/modern-inventory.interface';

@Injectable({
  providedIn: 'root',
})
export class InventoryMovementService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    this.apiUrl = `${environment.apiRootUrl}inventory-management/movements`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // ==================== MOVEMENT OPERATIONS ====================

  /**
   * Create a new inventory movement
   * @param movementData - Movement creation data
   * @returns Observable of created movement
   */
  createMovement(
    movementData: CreateMovementDto,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(this.apiUrl, movementData, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Get all movements with optional filtering
   * @param productId - Filter by product ID (optional)
   * @param movementType - Filter by movement type (optional)
   * @param startDate - Start date for date range filter (optional)
   * @param endDate - End date for date range filter (optional)
   * @returns Observable of movement array
   */
  getAllMovements(
    productId?: number,
    movementType?: MovementType,
    startDate?: string,
    endDate?: string,
  ): Observable<InventoryMovement[]> {
    let params = new HttpParams();

    if (productId) {
      params = params.set('productId', productId.toString());
    }
    if (movementType) {
      params = params.set('movementType', movementType);
    }
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<InventoryMovement[]>(this.apiUrl, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Get movements for a specific product
   * @param productId - Product ID
   * @param limit - Maximum number of movements to return (optional)
   * @returns Observable of movement array
   */
  getMovementsByProduct(
    productId: number,
    limit?: number,
  ): Observable<InventoryMovement[]> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<InventoryMovement[]>(
      `${this.apiUrl}/product/${productId}`,
      { params, headers: this.getHeaders() },
    );
  }

  /**
   * Get movements for a specific batch
   * @param batchId - Batch ID
   * @returns Observable of movement array
   */
  getMovementsByBatch(batchId: number): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(
      `${this.apiUrl}/batch/${batchId}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get movements by type
   * @param movementType - Movement type
   * @param startDate - Start date (optional)
   * @param endDate - End date (optional)
   * @returns Observable of movement array
   */
  getMovementsByType(
    movementType: MovementType,
    startDate?: string,
    endDate?: string,
  ): Observable<InventoryMovement[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<InventoryMovement[]>(
      `${this.apiUrl}/type/${movementType}`,
      { params, headers: this.getHeaders() },
    );
  }

  /**
   * Get movements within a date range
   * @param startDate - Start date (ISO format)
   * @param endDate - End date (ISO format)
   * @returns Observable of movement array
   */
  getMovementsByDateRange(
    startDate: string,
    endDate: string,
  ): Observable<InventoryMovement[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<InventoryMovement[]>(`${this.apiUrl}/date-range`, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Get a single movement by ID
   * @param movementId - Movement ID
   * @returns Observable of movement
   */
  getMovementById(movementId: number): Observable<InventoryMovement> {
    return this.http.get<InventoryMovement>(`${this.apiUrl}/${movementId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Delete a movement (admin only)
   * @param movementId - Movement ID
   * @returns Observable of deletion result
   */
  deleteMovement(movementId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${movementId}`,
      { headers: this.getHeaders() },
    );
  }

  // ==================== LOCATION-BASED MOVEMENTS ====================

  /**
   * Get movements from a specific location
   * @param locationId - Location ID
   * @param startDate - Start date (optional)
   * @param endDate - End date (optional)
   * @returns Observable of movement array
   */
  getMovementsFromLocation(
    locationId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<InventoryMovement[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<InventoryMovement[]>(
      `${this.apiUrl}/from-location/${locationId}`,
      { params, headers: this.getHeaders() },
    );
  }

  /**
   * Get movements to a specific location
   * @param locationId - Location ID
   * @param startDate - Start date (optional)
   * @param endDate - End date (optional)
   * @returns Observable of movement array
   */
  getMovementsToLocation(
    locationId: number,
    startDate?: string,
    endDate?: string,
  ): Observable<InventoryMovement[]> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<InventoryMovement[]>(
      `${this.apiUrl}/to-location/${locationId}`,
      { params, headers: this.getHeaders() },
    );
  }

  // ==================== ANALYTICS & REPORTING ====================

  /**
   * Get movement analytics for a period
   * @param days - Number of days to analyze (default: 30)
   * @returns Observable of movement analytics
   */
  getAnalytics(days: number = 30): Observable<MovementAnalytics> {
    return this.http.get<MovementAnalytics>(
      `${this.apiUrl}/analytics/${days}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get movement trends for a period
   * @param days - Number of days to analyze (default: 30)
   * @returns Observable of movement trends
   */
  getTrends(days: number = 30): Observable<MovementTrend[]> {
    return this.http.get<MovementTrend[]>(`${this.apiUrl}/trends/${days}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Get recent movements
   * @param limit - Maximum number of movements (default: 50)
   * @returns Observable of recent movements
   */
  getRecentMovements(limit: number = 50): Observable<InventoryMovement[]> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<InventoryMovement[]>(`${this.apiUrl}/recent`, {
      params,
      headers: this.getHeaders(),
    });
  }

  // ==================== SPECIFIC MOVEMENT TYPE OPERATIONS ====================

  /**
   * Record a purchase movement
   * @param productId - Product ID
   * @param quantity - Quantity purchased
   * @param unitCost - Unit cost
   * @param batchId - Batch ID (optional)
   * @param referenceNumber - Purchase order number (optional)
   * @param notes - Additional notes (optional)
   * @returns Observable of created movement
   */
  recordPurchase(
    productId: number,
    quantity: number,
    unitCost: number,
    batchId?: number,
    referenceNumber?: string,
    notes?: string,
  ): Observable<InventoryMovement> {
    const movementData: CreateMovementDto = {
      product_id: productId,
      batch_id: batchId,
      movement_type: MovementType.PURCHASE,
      quantity,
      unit_cost: unitCost,
      reference_number: referenceNumber,
      notes,
    };

    return this.createMovement(movementData);
  }

  /**
   * Record a sale movement
   * @param productId - Product ID
   * @param quantity - Quantity sold
   * @param unitCost - Unit cost
   * @param batchId - Batch ID (optional)
   * @param referenceNumber - Invoice number (optional)
   * @param notes - Additional notes (optional)
   * @returns Observable of created movement
   */
  recordSale(
    productId: number,
    quantity: number,
    unitCost: number,
    batchId?: number,
    referenceNumber?: string,
    notes?: string,
  ): Observable<InventoryMovement> {
    const movementData: CreateMovementDto = {
      product_id: productId,
      batch_id: batchId,
      movement_type: MovementType.SALE,
      quantity,
      unit_cost: unitCost,
      reference_number: referenceNumber,
      notes,
    };

    return this.createMovement(movementData);
  }

  /**
   * Record a stock transfer movement
   * @param productId - Product ID
   * @param quantity - Quantity transferred
   * @param fromLocationId - Source location ID
   * @param toLocationId - Destination location ID
   * @param batchId - Batch ID (optional)
   * @param referenceNumber - Transfer order number (optional)
   * @param notes - Additional notes (optional)
   * @returns Observable of created movement
   */
  recordTransfer(
    productId: number,
    quantity: number,
    fromLocationId: number,
    toLocationId: number,
    batchId?: number,
    referenceNumber?: string,
    notes?: string,
  ): Observable<InventoryMovement> {
    const movementData: CreateMovementDto = {
      product_id: productId,
      batch_id: batchId,
      movement_type: MovementType.TRANSFER,
      quantity,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      reference_number: referenceNumber,
      notes,
    };

    return this.createMovement(movementData);
  }

  /**
   * Record a stock adjustment movement
   * @param productId - Product ID
   * @param quantity - Quantity adjusted (positive for increase, negative for decrease)
   * @param unitCost - Unit cost (optional)
   * @param batchId - Batch ID (optional)
   * @param reason - Adjustment reason
   * @returns Observable of created movement
   */
  recordAdjustment(
    productId: number,
    quantity: number,
    reason: string,
    unitCost?: number,
    batchId?: number,
  ): Observable<InventoryMovement> {
    const movementData: CreateMovementDto = {
      product_id: productId,
      batch_id: batchId,
      movement_type: MovementType.ADJUSTMENT,
      quantity,
      unit_cost: unitCost,
      notes: reason,
    };

    return this.createMovement(movementData);
  }

  /**
   * Record a damage movement
   * @param productId - Product ID
   * @param quantity - Quantity damaged
   * @param batchId - Batch ID (optional)
   * @param reason - Damage reason
   * @returns Observable of created movement
   */
  recordDamage(
    productId: number,
    quantity: number,
    reason: string,
    batchId?: number,
  ): Observable<InventoryMovement> {
    const movementData: CreateMovementDto = {
      product_id: productId,
      batch_id: batchId,
      movement_type: MovementType.DAMAGE,
      quantity,
      notes: reason,
    };

    return this.createMovement(movementData);
  }

  /**
   * Record an expiry movement
   * @param productId - Product ID
   * @param quantity - Quantity expired
   * @param batchId - Batch ID
   * @param notes - Additional notes (optional)
   * @returns Observable of created movement
   */
  recordExpiry(
    productId: number,
    quantity: number,
    batchId: number,
    notes?: string,
  ): Observable<InventoryMovement> {
    const movementData: CreateMovementDto = {
      product_id: productId,
      batch_id: batchId,
      movement_type: MovementType.EXPIRY,
      quantity,
      notes: notes || 'Batch expired',
    };

    return this.createMovement(movementData);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get movement type display name
   * @param movementType - Movement type enum
   * @returns Human-readable name
   */
  getMovementTypeName(movementType: MovementType): string {
    const names: Record<MovementType, string> = {
      [MovementType.PURCHASE]: 'Purchase',
      [MovementType.SALE]: 'Sale',
      [MovementType.RETURN]: 'Return',
      [MovementType.ADJUSTMENT]: 'Adjustment',
      [MovementType.TRANSFER]: 'Transfer',
      [MovementType.DAMAGE]: 'Damage',
      [MovementType.EXPIRY]: 'Expiry',
      [MovementType.LOSS]: 'Loss',
      [MovementType.PRODUCTION]: 'Production',
      [MovementType.CONSUMPTION]: 'Consumption',
      [MovementType.STOCK_TAKE]: 'Stock Take',
      [MovementType.REORDER]: 'Reorder',
      [MovementType.CONVERSION]: 'Conversion',
    };

    return names[movementType] || movementType;
  }

  /**
   * Check if movement increases stock
   * @param movementType - Movement type
   * @returns True if movement increases stock
   */
  isStockIncrease(movementType: MovementType): boolean {
    const increaseTypes = [
      MovementType.PURCHASE,
      MovementType.RETURN,
      MovementType.PRODUCTION,
      MovementType.REORDER,
    ];

    return increaseTypes.includes(movementType);
  }

  /**
   * Check if movement decreases stock
   * @param movementType - Movement type
   * @returns True if movement decreases stock
   */
  isStockDecrease(movementType: MovementType): boolean {
    const decreaseTypes = [
      MovementType.SALE,
      MovementType.DAMAGE,
      MovementType.EXPIRY,
      MovementType.LOSS,
      MovementType.CONSUMPTION,
    ];

    return decreaseTypes.includes(movementType);
  }

  /**
   * Get movement icon class for UI
   * @param movementType - Movement type
   * @returns CSS class name for icon
   */
  getMovementIcon(movementType: MovementType): string {
    const icons: Record<MovementType, string> = {
      [MovementType.PURCHASE]: 'shopping-cart',
      [MovementType.SALE]: 'trending-up',
      [MovementType.RETURN]: 'corner-up-left',
      [MovementType.ADJUSTMENT]: 'edit',
      [MovementType.TRANSFER]: 'arrow-right',
      [MovementType.DAMAGE]: 'alert-triangle',
      [MovementType.EXPIRY]: 'clock',
      [MovementType.LOSS]: 'x-circle',
      [MovementType.PRODUCTION]: 'package',
      [MovementType.CONSUMPTION]: 'minus-circle',
      [MovementType.STOCK_TAKE]: 'clipboard',
      [MovementType.REORDER]: 'refresh-cw',
      [MovementType.CONVERSION]: 'repeat',
    };

    return icons[movementType] || 'circle';
  }

  /**
   * Get movement color class for UI
   * @param movementType - Movement type
   * @returns CSS color class
   */
  getMovementColor(movementType: MovementType): string {
    if (this.isStockIncrease(movementType)) {
      return 'text-green-600';
    } else if (this.isStockDecrease(movementType)) {
      return 'text-red-600';
    }
    return 'text-blue-600';
  }

  /**
   * Format movement date for display
   * @param date - Date to format
   * @returns Formatted date string
   */
  formatMovementDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  /**
   * Calculate total value of movement
   * @param movement - Inventory movement
   * @returns Total value
   */
  calculateMovementValue(movement: InventoryMovement): number {
    if (movement.total_value) {
      return movement.total_value;
    }
    if (movement.unit_cost) {
      return movement.quantity * movement.unit_cost;
    }
    return 0;
  }
}
