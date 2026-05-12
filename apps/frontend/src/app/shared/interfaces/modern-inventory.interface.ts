// =====================================================
// MODERN INVENTORY TRACKING INTERFACES
// Matches backend Prisma schema and DTOs
// =====================================================

// ============ ENUMS ============

export enum BatchStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
  RECALLED = 'RECALLED',
  IN_TRANSIT = 'IN_TRANSIT',
  QUALITY_HOLD = 'QUALITY_HOLD',
}

export enum SerialNumberStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  RESERVED = 'RESERVED',
  DAMAGED = 'DAMAGED',
  RETURNED = 'RETURNED',
  WARRANTY = 'WARRANTY',
}

export enum MovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  DAMAGE = 'DAMAGE',
  EXPIRY = 'EXPIRY',
  LOSS = 'LOSS',
  PRODUCTION = 'PRODUCTION',
  CONSUMPTION = 'CONSUMPTION',
  STOCK_TAKE = 'STOCK_TAKE',
  REORDER = 'REORDER',
  CONVERSION = 'CONVERSION',
}

export enum AdjustmentType {
  STOCK_COUNT = 'STOCK_COUNT',
  DAMAGE = 'DAMAGE',
  EXPIRY = 'EXPIRY',
  LOSS = 'LOSS',
  FOUND = 'FOUND',
  CORRECTION = 'CORRECTION',
  WRITE_OFF = 'WRITE_OFF',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
}

export enum AdjustmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum InspectionType {
  INCOMING = 'INCOMING',
  IN_PROCESS = 'IN_PROCESS',
  FINAL = 'FINAL',
  RANDOM = 'RANDOM',
  COMPLAINT = 'COMPLAINT',
}

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONAL = 'CONDITIONAL',
}

export enum InspectionAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  REWORK = 'REWORK',
  QUARANTINE = 'QUARANTINE',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
}

export enum ReservationType {
  SALES_ORDER = 'SALES_ORDER',
  PRODUCTION_ORDER = 'PRODUCTION_ORDER',
  TRANSFER_ORDER = 'TRANSFER_ORDER',
  CUSTOMER_ORDER = 'CUSTOMER_ORDER',
  MANUAL = 'MANUAL',
}

export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PARTIAL = 'PARTIAL',
}

export enum ValuationMethod {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  WAC = 'WAC',
  SPECIFIC = 'SPECIFIC',
}

// ============ INVENTORY BATCH TRACKING ============

export interface InventoryBatch {
  id: number;
  product_id: number;
  batch_number: string;
  quantity_received: number;
  quantity_available: number;
  buying_price: number;
  manufacturing_date?: Date;
  expiry_date?: Date;
  supplier_id?: number;
  warehouse_location_id?: number;
  status: BatchStatus;
  received_date: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  organization_id: number;

  // Approval fields
  is_approved?: boolean;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: Date;
  rejected_by?: number;
  rejected_by_name?: string;
  rejected_at?: Date;
  rejection_reason?: string;

  // Relations
  product?: any;
  supplier?: any;
  warehouse_location?: any;
  serial_numbers?: SerialNumber[];
  movements?: InventoryMovement[];
  reservations?: StockReservation[];
}

export interface CreateBatchDto {
  product_id: number;
  batch_number: string;
  quantity_received: number;
  buying_price: number;
  manufacturing_date?: string;
  expiry_date?: string;
  supplier_id?: number;
  warehouse_location_id?: number;
  notes?: string;
}

export interface UpdateBatchDto {
  quantity_available?: number;
  status?: BatchStatus;
  warehouse_location_id?: number;
  notes?: string;
}

export interface BatchAllocationResult {
  allocated: Array<{
    batch_id: number;
    batch_number: string;
    quantity: number;
    buying_price: number;
    total_cost: number;
  }>;
  total_allocated: number;
  total_cost: number;
}

// ============ SERIAL NUMBER TRACKING ============

export interface SerialNumber {
  id: number;
  batch_id: number;
  product_id: number;
  serial_number: string;
  status: SerialNumberStatus;
  sold_date?: Date;
  warranty_expiry?: Date;
  customer_id?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  organization_id: number;

  // Relations
  batch?: InventoryBatch;
  product?: any;
}

export interface CreateSerialNumberDto {
  batch_id: number;
  product_id: number;
  serial_number: string;
  warranty_expiry?: string;
  notes?: string;
}

export interface UpdateSerialNumberDto {
  status?: SerialNumberStatus;
  sold_date?: string;
  customer_id?: number;
  notes?: string;
}

// ============ INVENTORY MOVEMENTS (AUDIT TRAIL) ============

export interface InventoryMovement {
  id: number;
  product_id: number;
  batch_id?: number;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number;
  total_value?: number;
  from_location_id?: number;
  to_location_id?: number;
  reference_number?: string;
  reference_type?: string;
  reference_id?: number;
  performed_by: string;
  notes?: string;
  movement_date: Date;
  created_at: Date;
  organization_id: number;

  // Relations
  product?: any;
  batch?: InventoryBatch;
  from_location?: WarehouseLocation;
  to_location?: WarehouseLocation;
}

export interface CreateMovementDto {
  product_id: number;
  batch_id?: number;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number;
  from_location_id?: number;
  to_location_id?: number;
  reference_number?: string;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  movement_date?: string;
}

export interface MovementAnalytics {
  total_movements: number;
  movements_by_type: Record<MovementType, number>;
  total_value_in: number;
  total_value_out: number;
  net_value_change: number;
  top_products: Array<{
    product_id: number;
    product_name: string;
    movement_count: number;
    total_quantity: number;
  }>;
}

export interface MovementTrend {
  date: string;
  movements_in: number;
  movements_out: number;
  net_change: number;
  value_in: number;
  value_out: number;
}

// ============ WAREHOUSE LOCATIONS ============

export interface WarehouseLocation {
  id: number;
  warehouse_name: string;
  location_code: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  current_utilization?: number;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  organization_id: number;

  // Relations
  batches?: InventoryBatch[];
  movements_from?: InventoryMovement[];
  movements_to?: InventoryMovement[];
}

export interface CreateWarehouseLocationDto {
  warehouse_name: string;
  location_code: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateWarehouseLocationDto {
  warehouse_name?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity?: number;
  current_utilization?: number;
  is_active?: boolean;
  notes?: string;
}

export interface LocationUtilization {
  location_id: number;
  location_code: string;
  warehouse_name: string;
  capacity: number;
  current_utilization: number;
  utilization_percentage: number;
  available_capacity: number;
}

// ============ REORDER RULES & AUTOMATION ============

export interface ReorderRule {
  id: number;
  organizationId: number;
  productId: number;
  minStock: number;
  maxStock: number;
  reorderQuantity: number;
  leadTimeDays?: number;
  safetyStock?: number;
  enabled: boolean;
  supplierId?: number;
  lastTriggered?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;

  // Relations
  product?: {
    id: number;
    name: string;
    productIdNumber: string;
    quantity: number;
  };
  supplier?: any;
}

export interface CreateReorderRuleDto {
  productId: number;
  minStock: number;
  maxStock: number;
  reorderQuantity: number;
  leadTimeDays?: number;
  safetyStock?: number;
  supplierId?: number;
  enabled?: boolean;
}

export interface UpdateReorderRuleDto {
  minStock?: number;
  maxStock?: number;
  reorderQuantity?: number;
  leadTimeDays?: number;
  safetyStock?: number;
  supplierId?: number;
  enabled?: boolean;
}

export interface ReorderAlert {
  id: number;
  product_id: number;
  product_name: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  reorder_quantity: number;
  supplier_id?: number;
  urgency: 'critical' | 'warning' | 'info';
  estimated_cost: number;
  last_triggered?: Date | string;
}

// ============ STOCK ADJUSTMENTS ============

export interface StockAdjustment {
  id: number;
  product_id: number;
  batch_id?: number;
  adjustment_type: AdjustmentType;
  quantity_before: number;
  quantity_adjusted: number;
  quantity_after: number;
  unit_cost?: number;
  total_value?: number;
  reason: string;
  status: AdjustmentStatus;
  adjusted_by: string;
  approved_by?: string;
  adjustment_date: Date;
  approval_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  organization_id: number;

  // Relations
  product?: any;
  batch?: InventoryBatch;
}

export interface CreateAdjustmentDto {
  product_id: number;
  batch_id?: number;
  adjustment_type: AdjustmentType;
  quantity_adjusted: number;
  unit_cost?: number;
  reason: string;
  notes?: string;
}

export interface ApproveAdjustmentDto {
  approved_by: string;
  notes?: string;
}

// ============ QUALITY INSPECTIONS ============

export interface QualityInspection {
  id: number;
  batch_id: number;
  inspection_type: InspectionType;
  inspection_status: InspectionStatus;
  inspector_name: string;
  inspection_date: Date;
  quantity_inspected: number;
  quantity_passed?: number;
  quantity_failed?: number;
  defect_notes?: string;
  action_taken: InspectionAction;
  follow_up_required: boolean;
  follow_up_notes?: string;
  created_at: Date;
  updated_at: Date;
  organization_id: number;

  // Relations
  batch?: InventoryBatch;
}

export interface CreateInspectionDto {
  batch_id: number;
  inspection_type: InspectionType;
  inspector_name: string;
  quantity_inspected: number;
  quantity_passed?: number;
  quantity_failed?: number;
  defect_notes?: string;
  action_taken: InspectionAction;
  follow_up_required: boolean;
  follow_up_notes?: string;
}

export interface UpdateInspectionDto {
  inspection_status?: InspectionStatus;
  quantity_passed?: number;
  quantity_failed?: number;
  defect_notes?: string;
  action_taken?: InspectionAction;
  follow_up_required?: boolean;
  follow_up_notes?: string;
}

// ============ STOCK RESERVATIONS ============

export interface StockReservation {
  id: number;
  product_id: number;
  batch_id?: number;
  reservation_type: ReservationType;
  quantity_reserved: number;
  reservation_status: ReservationStatus;
  reserved_for?: string;
  reference_number?: string;
  reservation_date: Date;
  expiry_date?: Date;
  fulfilled_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  organization_id: number;

  // Relations
  product?: any;
  batch?: InventoryBatch;
}

export interface CreateReservationDto {
  product_id: number;
  batch_id?: number;
  reservation_type: ReservationType;
  quantity_reserved: number;
  reserved_for?: string;
  reference_number?: string;
  expiry_date?: string;
  notes?: string;
}

export interface UpdateReservationDto {
  reservation_status?: ReservationStatus;
  quantity_reserved?: number;
  expiry_date?: string;
  notes?: string;
}

// ============ INVENTORY VALUATIONS ============

export interface InventoryValuation {
  id: number;
  product_id: number;
  valuation_method: ValuationMethod;
  valuation_date: Date;
  quantity_on_hand: number;
  unit_cost: number;
  total_value: number;
  notes?: string;
  created_at: Date;
  organization_id: number;

  // Relations
  product?: any;
}

export interface ValuationSummary {
  total_products: number;
  total_quantity: number;
  total_value: number;
  by_category: Array<{
    category: string;
    quantity: number;
    value: number;
  }>;
  by_location: Array<{
    location: string;
    quantity: number;
    value: number;
  }>;
}

// ============ DASHBOARD & ANALYTICS ============

export interface InventoryDashboard {
  total_products: number;
  total_batches: number;
  total_value: number;
  low_stock_alerts: number;
  expiring_soon: number;
  out_of_stock: number;
  reserved_stock: number;
  available_stock: number;

  recent_movements: InventoryMovement[];
  reorder_alerts: ReorderAlert[];
  expiring_batches: InventoryBatch[];
  top_moving_products: Array<{
    product_id: number;
    product_name: string;
    quantity_moved: number;
    movement_count: number;
  }>;
}

export interface StockStatusSummary {
  product_id: number;
  product_name: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  in_transit_quantity: number;
  damaged_quantity: number;
  expired_quantity: number;
  total_value: number;
  oldest_batch_date?: Date;
  newest_batch_date?: Date;
}
