/**
 * Service for managing warehouse locations and automated reorder rules
 *
 * This service provides comprehensive functionality for warehouse location management,
 * capacity tracking, automated reorder rule configuration, and low stock alerting.
 *
 * @remarks
 * - Manages warehouse locations with hierarchical structure (aisle/rack/shelf/bin)
 * - Tracks capacity and utilization
 * - Configures automated reorder rules with thresholds
 * - Generates reorder alerts and recommendations
 * - All operations return Observables for asynchronous data handling
 *
 * @example
 * ```typescript
 * constructor(private warehouseService: WarehouseReorderService) {}
 *
 * // Create warehouse location
 * const locationData = {
 *   warehouse_name: 'Main Warehouse',
 *   location_code: 'WH01-A1-R2-S3',
 *   aisle: 'A1',
 *   rack: 'R2',
 *   shelf: 'S3',
 *   capacity: 1000
 * };
 * this.warehouseService.createLocation(locationData).subscribe(
 *   location => console.log('Location created:', location)
 * );
 *
 * // Create reorder rule
 * const reorderRule = {
 *   product_id: 123,
 *   reorder_point: 50,
 *   reorder_quantity: 200,
 *   min_stock_level: 25,
 *   max_stock_level: 500,
 *   lead_time_days: 7,
 *   preferred_supplier_id: 45
 * };
 * this.warehouseService.createReorderRule(reorderRule).subscribe(
 *   rule => console.log('Reorder rule created:', rule)
 * );
 *
 * // Check for reorder alerts
 * this.warehouseService.getReorderAlerts().subscribe(
 *   alerts => console.log('Products needing reorder:', alerts)
 * );
 * ```
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { LocalStorageService } from './local-storage.service';
import {
  WarehouseLocation,
  CreateWarehouseLocationDto,
  UpdateWarehouseLocationDto,
  LocationUtilization,
  ReorderRule,
  CreateReorderRuleDto,
  UpdateReorderRuleDto,
  ReorderAlert,
} from '../interfaces/modern-inventory.interface';

@Injectable({
  providedIn: 'root',
})
export class WarehouseReorderService {
  private apiUrl: string;
  private warehouseApiUrl: string;
  private reorderApiUrl: string;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
  ) {
    const baseUrl = `${environment.apiRootUrl}inventory-management`;
    this.apiUrl = baseUrl;
    this.warehouseApiUrl = `${baseUrl}/warehouse-locations`;
    this.reorderApiUrl = `${baseUrl}/reorder-rules`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // ==================== WAREHOUSE LOCATION OPERATIONS ====================

  /**
   * Create a new warehouse location
   * @param locationData - Location creation data
   * @returns Observable of created location
   */
  createLocation(
    locationData: CreateWarehouseLocationDto,
  ): Observable<WarehouseLocation> {
    return this.http.post<WarehouseLocation>(
      this.warehouseApiUrl,
      locationData,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get all warehouse locations
   * @param isActive - Filter by active status (optional)
   * @returns Observable of location array
   */
  getAllLocations(isActive?: boolean): Observable<WarehouseLocation[]> {
    let params = new HttpParams();
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<WarehouseLocation[]>(this.warehouseApiUrl, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Get locations by warehouse name
   * @param warehouseName - Warehouse name
   * @returns Observable of location array
   */
  getLocationsByWarehouse(
    warehouseName: string,
  ): Observable<WarehouseLocation[]> {
    return this.http.get<WarehouseLocation[]>(
      `${this.warehouseApiUrl}/warehouse/${warehouseName}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get a single location by ID
   * @param locationId - Location ID
   * @returns Observable of location
   */
  getLocationById(locationId: number): Observable<WarehouseLocation> {
    return this.http.get<WarehouseLocation>(
      `${this.warehouseApiUrl}/${locationId}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get location by location code
   * @param locationCode - Location code
   * @returns Observable of location
   */
  getLocationByCode(locationCode: string): Observable<WarehouseLocation> {
    return this.http.get<WarehouseLocation>(
      `${this.warehouseApiUrl}/code/${locationCode}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Update warehouse location
   * @param locationId - Location ID
   * @param updateData - Location update data
   * @returns Observable of updated location
   */
  updateLocation(
    locationId: number,
    updateData: UpdateWarehouseLocationDto,
  ): Observable<WarehouseLocation> {
    return this.http.patch<WarehouseLocation>(
      `${this.warehouseApiUrl}/${locationId}`,
      updateData,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Delete a warehouse location
   * @param locationId - Location ID
   * @returns Observable of deletion result
   */
  deleteLocation(locationId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.warehouseApiUrl}/${locationId}`,
      { headers: this.getHeaders() },
    );
  }

  // ==================== LOCATION CAPACITY & UTILIZATION ====================

  /**
   * Get location utilization statistics
   * @returns Observable of utilization data array
   */
  getLocationUtilization(): Observable<LocationUtilization[]> {
    return this.http.get<LocationUtilization[]>(
      `${this.warehouseApiUrl}/utilization`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get high utilization locations
   * @param threshold - Utilization threshold percentage (default: 80)
   * @returns Observable of location array
   */
  getHighUtilizationLocations(
    threshold: number = 80,
  ): Observable<WarehouseLocation[]> {
    const params = new HttpParams().set('threshold', threshold.toString());

    return this.http.get<WarehouseLocation[]>(
      `${this.warehouseApiUrl}/high-utilization`,
      { params, headers: this.getHeaders() },
    );
  }

  /**
   * Get available capacity across all locations
   * @returns Observable of total available capacity
   */
  getTotalAvailableCapacity(): Observable<{
    total_capacity: number;
    total_utilized: number;
    available: number;
  }> {
    return this.http.get<{
      total_capacity: number;
      total_utilized: number;
      available: number;
    }>(`${this.warehouseApiUrl}/total-capacity`, {
      headers: this.getHeaders(),
    });
  }

  // ==================== REORDER RULE OPERATIONS ====================

  /**
   * Create a new reorder rule
   * @param ruleData - Reorder rule creation data
   * @returns Observable of created rule
   */
  createReorderRule(ruleData: CreateReorderRuleDto): Observable<ReorderRule> {
    return this.http.post<ReorderRule>(this.reorderApiUrl, ruleData, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Get all reorder rules
   * @param isActive - Filter by active status (optional)
   * @returns Observable of reorder rule array
   */
  getAllReorderRules(isActive?: boolean): Observable<ReorderRule[]> {
    let params = new HttpParams();
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<ReorderRule[]>(this.reorderApiUrl, {
      params,
      headers: this.getHeaders(),
    });
  }

  /**
   * Get reorder rule for a product
   * @param productId - Product ID
   * @returns Observable of reorder rule
   */
  getReorderRuleByProduct(productId: number): Observable<ReorderRule> {
    return this.http.get<ReorderRule>(
      `${this.reorderApiUrl}/product/${productId}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Get a single reorder rule by ID
   * @param ruleId - Rule ID
   * @returns Observable of reorder rule
   */
  getReorderRuleById(ruleId: number): Observable<ReorderRule> {
    return this.http.get<ReorderRule>(`${this.reorderApiUrl}/${ruleId}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Update reorder rule
   * @param ruleId - Rule ID
   * @param updateData - Rule update data
   * @returns Observable of updated rule
   */
  updateReorderRule(
    ruleId: number,
    updateData: UpdateReorderRuleDto,
  ): Observable<ReorderRule> {
    return this.http.patch<ReorderRule>(
      `${this.reorderApiUrl}/${ruleId}`,
      updateData,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Delete a reorder rule
   * @param ruleId - Rule ID
   * @returns Observable of deletion result
   */
  deleteReorderRule(ruleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.reorderApiUrl}/${ruleId}`,
      { headers: this.getHeaders() },
    );
  }

  // ==================== REORDER ALERTS & AUTOMATION ====================

  /**
   * Get all products that need reordering
   * @returns Observable of reorder alert array
   */
  getReorderAlerts(): Observable<ReorderAlert[]> {
    return this.http.get<ReorderAlert[]>(`${this.reorderApiUrl}/alerts`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Check if a specific product needs reordering
   * @param productId - Product ID
   * @returns Observable of reorder alert (null if no reorder needed)
   */
  checkProductReorder(productId: number): Observable<ReorderAlert | null> {
    return this.http.get<ReorderAlert | null>(
      `${this.reorderApiUrl}/check/${productId}`,
      { headers: this.getHeaders() },
    );
  }

  /**
   * Trigger reorder check for all products
   * @returns Observable of triggered rules count
   */
  triggerReorderCheck(): Observable<{
    triggered_rules: number;
    alerts: ReorderAlert[];
  }> {
    return this.http.post<{ triggered_rules: number; alerts: ReorderAlert[] }>(
      `${this.reorderApiUrl}/trigger-check`,
      {},
      { headers: this.getHeaders() },
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate location code from components
   * @param warehouse - Warehouse name
   * @param aisle - Aisle identifier (optional)
   * @param rack - Rack identifier (optional)
   * @param shelf - Shelf identifier (optional)
   * @param bin - Bin identifier (optional)
   * @returns Formatted location code
   */
  generateLocationCode(
    warehouse: string,
    aisle?: string,
    rack?: string,
    shelf?: string,
    bin?: string,
  ): string {
    const parts = [warehouse];
    if (aisle) parts.push(aisle);
    if (rack) parts.push(rack);
    if (shelf) parts.push(shelf);
    if (bin) parts.push(bin);

    return parts.join('-');
  }

  /**
   * Parse location code into components
   * @param locationCode - Location code
   * @returns Object with location components
   */
  parseLocationCode(locationCode: string): {
    warehouse?: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
  } {
    const parts = locationCode.split('-');

    return {
      warehouse: parts[0],
      aisle: parts[1],
      rack: parts[2],
      shelf: parts[3],
      bin: parts[4],
    };
  }

  /**
   * Calculate utilization percentage
   * @param currentUtilization - Current utilization
   * @param capacity - Total capacity
   * @returns Utilization percentage
   */
  calculateUtilizationPercentage(
    currentUtilization: number,
    capacity: number,
  ): number {
    if (capacity === 0) return 0;
    return Math.round((currentUtilization / capacity) * 100);
  }

  /**
   * Calculate available capacity
   * @param capacity - Total capacity
   * @param currentUtilization - Current utilization
   * @returns Available capacity
   */
  calculateAvailableCapacity(
    capacity: number,
    currentUtilization: number,
  ): number {
    return Math.max(0, capacity - currentUtilization);
  }

  /**
   * Get utilization status
   * @param utilizationPercentage - Utilization percentage
   * @returns Status object with level and color
   */
  getUtilizationStatus(utilizationPercentage: number): {
    level: 'low' | 'medium' | 'high' | 'critical';
    color: string;
    message: string;
  } {
    if (utilizationPercentage >= 95) {
      return {
        level: 'critical',
        color: 'text-red-600',
        message: 'Critical - Nearly full',
      };
    } else if (utilizationPercentage >= 80) {
      return {
        level: 'high',
        color: 'text-orange-600',
        message: 'High utilization',
      };
    } else if (utilizationPercentage >= 50) {
      return {
        level: 'medium',
        color: 'text-yellow-600',
        message: 'Moderate utilization',
      };
    } else {
      return {
        level: 'low',
        color: 'text-green-600',
        message: 'Low utilization',
      };
    }
  }

  /**
   * Calculate reorder quantity based on lead time and consumption
   * @param dailyConsumption - Average daily consumption
   * @param leadTimeDays - Lead time in days
   * @param safetyStock - Safety stock multiplier (default: 1.5)
   * @returns Recommended reorder quantity
   */
  calculateReorderQuantity(
    dailyConsumption: number,
    leadTimeDays: number,
    safetyStock: number = 1.5,
  ): number {
    return Math.ceil(dailyConsumption * leadTimeDays * safetyStock);
  }

  /**
   * Calculate reorder point
   * @param dailyConsumption - Average daily consumption
   * @param leadTimeDays - Lead time in days
   * @param safetyStock - Safety stock days (default: 7)
   * @returns Recommended reorder point
   */
  calculateReorderPoint(
    dailyConsumption: number,
    leadTimeDays: number,
    safetyStock: number = 7,
  ): number {
    return Math.ceil(dailyConsumption * (leadTimeDays + safetyStock));
  }

  /**
   * Get reorder urgency level
   * @param currentStock - Current stock level
   * @param reorderPoint - Reorder point
   * @param minStockLevel - Minimum stock level
   * @returns Urgency object
   */
  getReorderUrgency(
    currentStock: number,
    reorderPoint: number,
    minStockLevel: number,
  ): {
    urgency: 'critical' | 'warning' | 'info';
    color: string;
    message: string;
  } {
    if (currentStock <= minStockLevel) {
      return {
        urgency: 'critical',
        color: 'text-red-600',
        message: 'URGENT - Below minimum stock level',
      };
    } else if (currentStock <= reorderPoint) {
      const percentBelow = ((reorderPoint - currentStock) / reorderPoint) * 100;
      if (percentBelow > 50) {
        return {
          urgency: 'critical',
          color: 'text-red-600',
          message: 'Critical - Reorder immediately',
        };
      } else {
        return {
          urgency: 'warning',
          color: 'text-orange-600',
          message: 'Warning - Reorder soon',
        };
      }
    } else {
      return {
        urgency: 'info',
        color: 'text-blue-600',
        message: 'Stock level adequate',
      };
    }
  }

  /**
   * Format location for display
   * @param location - Warehouse location
   * @returns Formatted location string
   */
  formatLocationDisplay(location: WarehouseLocation): string {
    const parts = [location.warehouse_name];
    if (location.aisle) parts.push(`Aisle ${location.aisle}`);
    if (location.rack) parts.push(`Rack ${location.rack}`);
    if (location.shelf) parts.push(`Shelf ${location.shelf}`);
    if (location.bin) parts.push(`Bin ${location.bin}`);

    return parts.join(' / ');
  }

  /**
   * Estimate reorder cost
   * @param reorderQuantity - Quantity to reorder
   * @param unitCost - Unit cost
   * @returns Estimated total cost
   */
  estimateReorderCost(reorderQuantity: number, unitCost: number): number {
    return reorderQuantity * unitCost;
  }

  /**
   * Calculate days of stock remaining
   * @param currentStock - Current stock level
   * @param dailyConsumption - Average daily consumption
   * @returns Days of stock remaining
   */
  calculateDaysOfStockRemaining(
    currentStock: number,
    dailyConsumption: number,
  ): number {
    if (dailyConsumption === 0) return Infinity;
    return Math.floor(currentStock / dailyConsumption);
  }
}
