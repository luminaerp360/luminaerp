import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  CreateBatchDto,
  UpdateBatchDto,
  BatchAdjustmentDto,
  BatchTransferDto,
  BatchQueryDto,
} from '../dto/batch.dto';
import { BatchStatus, MovementType } from '@prisma/client';

@Injectable()
export class BatchTrackingService {
  private readonly CACHE_PREFIX = 'product:';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Create a new inventory batch
   */
  async createBatch(
    organizationId: number,
    dto: CreateBatchDto,
    createdBy: number,
    createdByName: string,
  ) {
    // Check if batch number already exists
    const existingBatch = await this.prisma.inventoryBatch.findFirst({
      where: {
        organizationId,
        batchNumber: dto.batch_number,
      },
    });

    if (existingBatch) {
      throw new ConflictException(
        `Batch number ${dto.batch_number} already exists`,
      );
    }

    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.product_id,
        organizationId,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${dto.product_id} not found`,
      );
    }

    // Verify supplier exists if provided
    let supplierId = dto.supplier_id;

    // If no supplier provided, try to get a default or first supplier
    if (!supplierId) {
      const defaultSupplier = await this.prisma.supplier.findFirst({
        where: { organizationId },
        orderBy: { id: 'asc' },
      });

      if (!defaultSupplier) {
        throw new BadRequestException(
          'No supplier found. Please create a supplier first or provide supplier_id.',
        );
      }

      supplierId = defaultSupplier.id;
    } else {
      const supplier = await this.prisma.supplier.findFirst({
        where: {
          id: supplierId,
          organizationId,
        },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
      }
    }

    // Create batch
    const batch = await this.prisma.inventoryBatch.create({
      data: {
        organizationId,
        productId: dto.product_id,
        batchNumber: dto.batch_number,
        lotNumber: dto.lot_number,
        receivedDate: dto.received_date
          ? new Date(dto.received_date)
          : new Date(),
        expiryDate: dto.expiry_date ? new Date(dto.expiry_date) : null,
        manufacturingDate: dto.manufacturing_date
          ? new Date(dto.manufacturing_date)
          : null,
        quantity: dto.quantity_received,
        initialQuantity: dto.quantity_received,
        availableQuantity: dto.quantity_received,
        unitCost: dto.buying_price,
        supplierId: supplierId,
        warehouseLocation: dto.warehouse_location_id?.toString(),
        notes: dto.notes,
        status: BatchStatus.ACTIVE,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create inventory movement record (marked as pending)
    await this.prisma.inventoryMovement.create({
      data: {
        organizationId,
        productId: dto.product_id,
        batchId: batch.id,
        movementType: MovementType.PURCHASE,
        quantityBefore: 0,
        quantityChange: dto.quantity_received,
        quantityAfter: 0, // Will be updated when approved
        toLocation: dto.warehouse_location_id?.toString(),
        referenceType: 'InventoryBatch',
        referenceId: batch.id,
        unitCost: dto.buying_price,
        totalValue: dto.buying_price * dto.quantity_received,
        performedBy: createdBy,
        performedByName: createdByName,
        reason: 'New batch created (pending approval)',
        notes: dto.notes,
      },
    });

    // DO NOT update product quantity yet - wait for approval

    // Transform batch to snake_case
    const result: any = this.transformBatchToSnakeCase(batch);
    result.requires_approval = true;
    result.is_approved = false;

    return result;
  }

  /**
   * Transform Prisma batch object to snake_case for frontend
   */
  private transformBatchToSnakeCase(batch: any) {
    return {
      id: batch.id,
      organization_id: batch.organizationId,
      product_id: batch.productId,
      inventory_id: batch.inventoryId,
      batch_number: batch.batchNumber,
      lot_number: batch.lotNumber,
      received_date: batch.receivedDate,
      expiry_date: batch.expiryDate,
      manufacturing_date: batch.manufacturingDate,
      quantity_received: batch.initialQuantity,
      quantity_available: batch.availableQuantity,
      buying_price: batch.unitCost,
      supplier_id: batch.supplierId,
      warehouse_location_id: batch.warehouseLocation,
      status: batch.status,
      notes: batch.notes,
      created_at: batch.createdAt,
      updated_at: batch.updatedAt,
      // Approval fields
      is_approved: batch.isApproved,
      approved_by: batch.approvedBy,
      approved_by_name: batch.approvedByName,
      approved_at: batch.approvedAt,
      rejected_by: batch.rejectedBy,
      rejected_by_name: batch.rejectedByName,
      rejected_at: batch.rejectedAt,
      rejection_reason: batch.rejectionReason,
      // Relations
      product: batch.product,
      supplier: batch.supplier,
    };
  }

  /**
   * Get all batches for an organization with filtering
   */
  async getAllBatches(organizationId: number, query?: BatchQueryDto) {
    const where: any = { organizationId };

    if (query?.productId) {
      where.productId = query.productId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.location) {
      where.warehouseLocation = {
        contains: query.location,
        mode: 'insensitive',
      };
    }

    if (query?.expiringBefore) {
      where.expiryDate = {
        lte: new Date(query.expiringBefore),
      };
      where.status = BatchStatus.ACTIVE;
    }

    if (query?.supplierId) {
      where.supplierId = query.supplierId;
    }

    const batches = await this.prisma.inventoryBatch.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });

    return batches.map((batch) => this.transformBatchToSnakeCase(batch));
  }

  /**
   * Get batch by ID
   */
  async getBatchById(organizationId: number, batchId: number) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: batchId,
        organizationId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        movements: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 20,
        },
        serialNumbers: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    return batch;
  }

  /**
   * Update batch information
   */
  async updateBatch(
    organizationId: number,
    batchId: number,
    dto: UpdateBatchDto,
    updatedBy: number,
    updatedByName: string,
  ) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: batchId,
        organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // If quantity is being updated, create movement record
    if (dto.quantity !== undefined && dto.quantity !== batch.quantity) {
      const quantityChange = dto.quantity - batch.quantity;
      const movementType =
        quantityChange > 0
          ? MovementType.ADJUSTMENT_INCREASE
          : MovementType.ADJUSTMENT_DECREASE;

      await this.prisma.inventoryMovement.create({
        data: {
          organizationId,
          productId: batch.productId,
          batchId: batch.id,
          movementType,
          quantityBefore: batch.quantity,
          quantityChange,
          quantityAfter: dto.quantity,
          performedBy: updatedBy,
          performedByName: updatedByName,
          reason: 'Manual batch adjustment',
          notes: dto.notes,
        },
      });

      // Update product quantity
      await this.prisma.product.update({
        where: { id: batch.productId },
        data: {
          quantity: {
            increment: quantityChange,
          },
        },
      });

      // Invalidate cache after quantity change
      await this.invalidateProductCache(organizationId, batch.productId);
    }

    // Update batch
    const updatedBatch = await this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        quantity: dto.quantity,
        availableQuantity:
          dto.quantity !== undefined
            ? dto.quantity - batch.reservedQuantity
            : undefined,
        status: dto.status,
        warehouseLocation: dto.warehouseLocation,
        notes: dto.notes,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedBatch;
  }

  /**
   * Approve a pending batch and update product quantities
   */
  async approveBatch(
    organizationId: number,
    batchId: number,
    approvedBy: number,
    approvedByName: string,
  ) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: batchId,
        organizationId,
      },
      include: {
        product: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    if (batch.status === BatchStatus.ACTIVE) {
      throw new BadRequestException('Batch is already active');
    }

    // Update batch to active
    const approvedBatch = await this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.ACTIVE,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update product quantity and buying price
    const updateData: any = {
      quantity: {
        increment: batch.quantity,
      },
    };

    if (batch.unitCost && batch.unitCost !== batch.product.buyingPrice) {
      updateData.buyingPrice = batch.unitCost;
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: batch.productId },
      data: updateData,
    });

    // Update the movement record
    await this.prisma.inventoryMovement.updateMany({
      where: {
        batchId: batch.id,
        referenceType: 'InventoryBatch',
        referenceId: batch.id,
      },
      data: {
        quantityAfter: batch.quantity,
        reason: 'Batch approved and stock updated',
      },
    });

    // Invalidate product cache so frontend gets updated quantity immediately
    await this.invalidateProductCache(organizationId, batch.productId);

    const result: any = this.transformBatchToSnakeCase(approvedBatch);
    result.updated_product_quantity = updatedProduct.quantity;
    result.is_approved = true;

    return result;
  }

  /**
   * Reject a pending batch
   */
  async rejectBatch(
    organizationId: number,
    batchId: number,
    rejectedBy: number,
    rejectedByName: string,
    rejectionReason: string,
  ) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: batchId,
        organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Update batch to quarantine status
    const rejectedBatch = await this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.QUARANTINE,
        notes: rejectionReason || 'Rejected',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.transformBatchToSnakeCase(rejectedBatch);
  }

  /**
   * Delete a pending batch (only if not approved)
   */
  async deleteBatch(organizationId: number, batchId: number) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: batchId,
        organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Delete related records first
    await this.prisma.inventoryMovement.deleteMany({
      where: { batchId },
    });

    await this.prisma.serialNumber.deleteMany({
      where: { batchId },
    });

    // Delete the batch
    await this.prisma.inventoryBatch.delete({
      where: { id: batchId },
    });

    return { message: 'Batch deleted successfully' };
  }

  /**
   * Adjust batch quantity (increment or decrement)
   */
  async adjustBatchQuantity(
    organizationId: number,
    dto: BatchAdjustmentDto,
    adjustedBy: number,
    adjustedByName: string,
  ) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: dto.batchId,
        organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    const newQuantity = batch.quantity + dto.quantityChange;

    if (newQuantity < 0) {
      throw new BadRequestException(
        'Adjustment would result in negative quantity',
      );
    }

    // Create movement record
    const movementType =
      dto.quantityChange > 0
        ? MovementType.ADJUSTMENT_INCREASE
        : MovementType.ADJUSTMENT_DECREASE;

    await this.prisma.inventoryMovement.create({
      data: {
        organizationId,
        productId: batch.productId,
        batchId: batch.id,
        movementType,
        quantityBefore: batch.quantity,
        quantityChange: dto.quantityChange,
        quantityAfter: newQuantity,
        performedBy: adjustedBy,
        performedByName: adjustedByName,
        reason: dto.reason,
        notes: dto.notes,
      },
    });

    // Update batch
    const updatedBatch = await this.prisma.inventoryBatch.update({
      where: { id: dto.batchId },
      data: {
        quantity: newQuantity,
        availableQuantity: newQuantity - batch.reservedQuantity,
        status: newQuantity === 0 ? BatchStatus.DEPLETED : batch.status,
      },
      include: {
        product: true,
        supplier: true,
      },
    });

    // Update product quantity
    await this.prisma.product.update({
      where: { id: batch.productId },
      data: {
        quantity: {
          increment: dto.quantityChange,
        },
      },
    });

    // Invalidate cache after quantity change
    await this.invalidateProductCache(organizationId, batch.productId);

    return updatedBatch;
  }

  /**
   * Transfer batch to different location
   */
  async transferBatch(
    organizationId: number,
    dto: BatchTransferDto,
    transferredBy: number,
    transferredByName: string,
  ) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: dto.batchId,
        organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${dto.batchId} not found`);
    }

    // Create movement record
    await this.prisma.inventoryMovement.create({
      data: {
        organizationId,
        productId: batch.productId,
        batchId: batch.id,
        movementType: MovementType.TRANSFER_OUT,
        quantityBefore: batch.quantity,
        quantityChange: 0,
        quantityAfter: batch.quantity,
        fromLocation: dto.fromLocation,
        toLocation: dto.toLocation,
        performedBy: transferredBy,
        performedByName: transferredByName,
        reason: 'Batch location transfer',
        notes: dto.notes,
      },
    });

    // Update batch location
    const updatedBatch = await this.prisma.inventoryBatch.update({
      where: { id: dto.batchId },
      data: {
        warehouseLocation: dto.toLocation,
      },
      include: {
        product: true,
        supplier: true,
      },
    });

    return updatedBatch;
  }

  /**
   * Get batches expiring soon
   */
  async getExpiringBatches(organizationId: number, days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        status: BatchStatus.ACTIVE,
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
        quantity: {
          gt: 0,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });
  }

  /**
   * Get expired batches
   */
  async getExpiredBatches(organizationId: number) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        expiryDate: {
          lt: new Date(),
        },
        status: {
          not: BatchStatus.EXPIRED,
        },
        quantity: {
          gt: 0,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });
  }

  /**
   * Mark batch as expired
   */
  async markBatchAsExpired(
    organizationId: number,
    batchId: number,
    performedBy: number,
    performedByName: string,
  ) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: {
        id: batchId,
        organizationId,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    // Create movement record
    if (batch.quantity > 0) {
      await this.prisma.inventoryMovement.create({
        data: {
          organizationId,
          productId: batch.productId,
          batchId: batch.id,
          movementType: MovementType.EXPIRED,
          quantityBefore: batch.quantity,
          quantityChange: -batch.quantity,
          quantityAfter: 0,
          performedBy,
          performedByName,
          reason: 'Batch expired',
        },
      });

      // Update product quantity
      await this.prisma.product.update({
        where: { id: batch.productId },
        data: {
          quantity: {
            decrement: batch.quantity,
          },
        },
      });
    }

    // Update batch
    return this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.EXPIRED,
        quantity: 0,
        availableQuantity: 0,
      },
    });
  }

  /**
   * Get batches by product using FIFO (First In, First Out)
   */
  async getBatchesByProductFIFO(
    organizationId: number,
    productId: number,
    requiredQuantity: number,
  ) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        productId,
        status: BatchStatus.ACTIVE,
        availableQuantity: {
          gt: 0,
        },
      },
      orderBy: [
        { receivedDate: 'asc' }, // FIFO - oldest first
        { expiryDate: 'asc' },
      ],
    });

    const selectedBatches: Array<{
      batch: any;
      quantityToUse: number;
    }> = [];
    let remainingQuantity = requiredQuantity;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(
        batch.availableQuantity,
        remainingQuantity,
      );
      selectedBatches.push({
        batch,
        quantityToUse,
      });
      remainingQuantity -= quantityToUse;
    }

    return {
      selectedBatches,
      totalAvailable: batches.reduce((sum, b) => sum + b.availableQuantity, 0),
      canFulfill: remainingQuantity <= 0,
      shortfall: Math.max(0, remainingQuantity),
    };
  }

  /**
   * Get batches by product using FEFO (First Expired, First Out)
   */
  async getBatchesByProductFEFO(
    organizationId: number,
    productId: number,
    requiredQuantity: number,
  ) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        productId,
        status: BatchStatus.ACTIVE,
        availableQuantity: {
          gt: 0,
        },
      },
      orderBy: [
        { expiryDate: 'asc' }, // FEFO - earliest expiry first
        { receivedDate: 'asc' },
      ],
    });

    const selectedBatches: Array<{
      batch: any;
      quantityToUse: number;
    }> = [];
    let remainingQuantity = requiredQuantity;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantityToUse = Math.min(
        batch.availableQuantity,
        remainingQuantity,
      );
      selectedBatches.push({
        batch,
        quantityToUse,
      });
      remainingQuantity -= quantityToUse;
    }

    return {
      selectedBatches,
      totalAvailable: batches.reduce((sum, b) => sum + b.availableQuantity, 0),
      canFulfill: remainingQuantity <= 0,
      shortfall: Math.max(0, remainingQuantity),
    };
  }

  /**
   * Deduct inventory using FIFO method
   */
  async deductInventoryFIFO(
    organizationId: number,
    productId: number,
    quantity: number,
    performedBy: number,
    performedByName: string,
    referenceType?: string,
    referenceId?: number,
  ) {
    const result = await this.getBatchesByProductFIFO(
      organizationId,
      productId,
      quantity,
    );

    if (!result.canFulfill) {
      throw new BadRequestException(
        `Insufficient inventory. Available: ${result.totalAvailable}, Required: ${quantity}`,
      );
    }

    const deductions = [];

    for (const { batch, quantityToUse } of result.selectedBatches) {
      // Create movement record
      await this.prisma.inventoryMovement.create({
        data: {
          organizationId,
          productId,
          batchId: batch.id,
          movementType: MovementType.SALE,
          quantityBefore: batch.quantity,
          quantityChange: -quantityToUse,
          quantityAfter: batch.quantity - quantityToUse,
          referenceType,
          referenceId,
          unitCost: batch.unitCost,
          totalValue: batch.unitCost * quantityToUse,
          performedBy,
          performedByName,
          reason: 'Inventory deduction (FIFO)',
        },
      });

      // Update batch
      await this.prisma.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          quantity: batch.quantity - quantityToUse,
          availableQuantity: batch.availableQuantity - quantityToUse,
          status:
            batch.quantity - quantityToUse === 0
              ? BatchStatus.DEPLETED
              : batch.status,
        },
      });

      deductions.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantityDeducted: quantityToUse,
        unitCost: batch.unitCost,
        totalCost: batch.unitCost * quantityToUse,
      });
    }

    // Update product quantity
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    return {
      deductions,
      totalQuantityDeducted: quantity,
      totalCost: deductions.reduce((sum, d) => sum + d.totalCost, 0),
    };
  }

  /**
   * Get batch analytics
   */
  async getBatchAnalytics(organizationId: number) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: { organizationId },
      include: {
        product: true,
      },
    });

    const now = new Date();
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const analytics = {
      totalBatches: batches.length,
      activeBatches: batches.filter((b) => b.status === BatchStatus.ACTIVE)
        .length,
      expiredBatches: batches.filter((b) => b.status === BatchStatus.EXPIRED)
        .length,
      depletedBatches: batches.filter((b) => b.status === BatchStatus.DEPLETED)
        .length,
      quarantinedBatches: batches.filter(
        (b) => b.status === BatchStatus.QUARANTINE,
      ).length,
      expiringIn30Days: batches.filter(
        (b) =>
          b.expiryDate &&
          b.expiryDate >= now &&
          b.expiryDate <= next30Days &&
          b.status === BatchStatus.ACTIVE,
      ).length,
      totalInventoryValue: batches.reduce(
        (sum, b) => sum + b.quantity * b.unitCost,
        0,
      ),
      totalQuantity: batches.reduce((sum, b) => sum + b.quantity, 0),
    };

    return analytics;
  }

  /**
   * Get batches with low stock (below threshold)
   */
  async getLowStockBatches(organizationId: number, threshold?: number) {
    const quantityThreshold = threshold || 10;

    return this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        quantity: {
          lte: quantityThreshold,
        },
        status: BatchStatus.ACTIVE,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
      },
      orderBy: {
        quantity: 'asc',
      },
    });
  }

  /**
   * Get batches by status
   */
  async getBatchesByStatus(organizationId: number, status: string) {
    // Validate status
    const validStatuses = Object.values(BatchStatus);
    if (!validStatuses.includes(status as BatchStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        status: status as BatchStatus,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Sync product quantities from batches
   * Recalculates product.quantity based on sum of all batch quantities
   */
  async syncProductQuantitiesFromBatches(organizationId: number) {
    // Get all products with their batches
    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        OR: [{ isService: false }, { isService: null }],
      },
      include: {
        batches: {
          select: {
            availableQuantity: true,
          },
        },
      },
    });

    const updates = [];

    for (const product of products) {
      // Calculate total quantity from all batches
      const totalBatchQuantity = product.batches.reduce(
        (sum, batch) => sum + (batch.availableQuantity || 0),
        0,
      );

      // Update product quantity if it doesn't match
      if (product.quantity !== totalBatchQuantity) {
        updates.push(
          this.prisma.product.update({
            where: { id: product.id },
            data: { quantity: totalBatchQuantity },
          }),
        );
      }
    }

    await Promise.all(updates);

    return {
      productsChecked: products.length,
      productsUpdated: updates.length,
    };
  }

  /**
   * Sync a single product quantity from its batches
   */
  async syncSingleProductQuantity(organizationId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        batches: {
          select: {
            availableQuantity: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const totalBatchQuantity = product.batches.reduce(
      (sum, batch) => sum + (batch.availableQuantity || 0),
      0,
    );

    await this.prisma.product.update({
      where: { id: productId },
      data: { quantity: totalBatchQuantity },
    });

    return {
      productId,
      oldQuantity: product.quantity,
      newQuantity: totalBatchQuantity,
      difference: totalBatchQuantity - product.quantity,
    };
  }

  /**
   * Invalidate product cache after batch operations
   * This ensures the frontend gets fresh product data with updated quantities
   */
  private async invalidateProductCache(
    organizationId: number,
    productId: number,
  ): Promise<void> {
    try {
      // Invalidate the all products cache for the organization
      await this.redis.del(`${this.CACHE_PREFIX}all:${organizationId}`);

      // Invalidate specific product cache
      await this.redis.del(
        `${this.CACHE_PREFIX}${organizationId}:${productId}`,
      );

      // Invalidate all barcode caches for the organization
      await this.redis.delPattern(
        `${this.CACHE_PREFIX}barcode:${organizationId}:*`,
      );
    } catch (error) {
      // Log error but don't fail the operation if cache invalidation fails
      console.error('Error invalidating product cache:', error);
    }
  }
}
