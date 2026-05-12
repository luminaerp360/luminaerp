import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryDto } from './inventory.dto';
import {
  Inventory,
  PaymentStatus,
  PurchaseStatus,
  MovementType,
  BatchStatus,
} from '@prisma/client';
import { ProductService } from 'src/products/products.service';
import { InventoryMovementService } from './services/inventory-movement.service';

interface Payment {
  amount: number;
  method: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT';
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
    private movementService: InventoryMovementService,
  ) {}

  private generateBatchNumber(productId: number, inventoryId: number): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `BATCH-${dateStr}-P${productId}-${inventoryId}`;
  }

  async createInventory(
    organizationId: number,
    dto: InventoryDto,
  ): Promise<Inventory> {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.buying_price,
      0,
    );

    const paidAmount = dto.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const paymentStatus =
      paidAmount === 0
        ? PaymentStatus.UNPAID
        : paidAmount < totalAmount
          ? PaymentStatus.PARTIAL
          : PaymentStatus.PAID;

    const inventory = await this.prisma.inventory.create({
      data: {
        items: JSON.stringify(dto.items),
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        paymentStatus,
        status: PurchaseStatus.PENDING,
        supplier: {
          connect: { id: dto.supplierId },
        },
        added_by: dto.added_by,
        deleted: dto.deleted,
        createdAt: new Date(),
        organization: {
          connect: { id: organizationId },
        },
        payments: {
          create: dto.payments,
        },
      },
      include: {
        payments: true,
        supplier: true,
      },
    });

    return inventory;
  }

  async approvePurchase(
    organizationId: number,
    id: number,
    approvedBy: string,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, organizationId },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Purchase with ID ${id} not found in this organization`,
      );
    }

    if (inventory.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(
        `Only pending purchases can be approved. Current status: ${inventory.status}`,
      );
    }

    return this.prisma.inventory.update({
      where: { id },
      data: {
        status: PurchaseStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        supplier: true,
        payments: true,
      },
    });
  }

  async receivePurchase(
    organizationId: number,
    id: number,
    receivedBy: string,
    receiveItems?: { product_id: string; unit_identifiers?: string[] }[],
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, organizationId },
      include: { supplier: true },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Purchase with ID ${id} not found in this organization`,
      );
    }

    if (inventory.status !== PurchaseStatus.APPROVED) {
      throw new BadRequestException(
        `Only approved purchases can be received. Current status: ${inventory.status}`,
      );
    }

    // Parse items from the inventory
    const items = Array.isArray(inventory.items)
      ? inventory.items
      : JSON.parse(inventory.items as string);

    // Merge identifiers from receive request into stored items
    if (receiveItems && Array.isArray(receiveItems)) {
      for (const receiveItem of receiveItems) {
        const storedItem = (items as any[]).find(
          (i: any) => String(i.product_id) === String(receiveItem.product_id),
        );
        if (storedItem && receiveItem.unit_identifiers?.length) {
          storedItem.unit_identifiers = receiveItem.unit_identifiers;
        }
      }
    }

    // Update product quantities, create batches, update prices, and create movement records
    for (const item of items as any[]) {
      const productId = Number(item.product_id);
      const product = await this.prisma.product.findFirst({
        where: { id: productId, organizationId },
      });

      if (product) {
        const trackingMode = (product as any).trackingMode ?? 'NONE';
        const isTrackedProduct = ['SERIAL', 'IMEI', 'REGISTRATION'].includes(
          trackingMode,
        );
        const cleanedIdentifiers = Array.isArray(item.unit_identifiers)
          ? item.unit_identifiers
              .map((value: any) => String(value || '').trim())
              .filter((value: string) => value.length > 0)
          : [];

        if (isTrackedProduct) {
          if (cleanedIdentifiers.length !== Number(item.quantity)) {
            throw new BadRequestException(
              `${product.name} requires ${item.quantity} unique identifiers when receiving stock`,
            );
          }

          const duplicates = cleanedIdentifiers.filter(
            (value: string, index: number) =>
              cleanedIdentifiers.indexOf(value) !== index,
          );
          if (duplicates.length > 0) {
            throw new BadRequestException(
              `Duplicate identifiers found for ${product.name}: ${[...new Set(duplicates)].join(', ')}`,
            );
          }

          const existingIdentifiers = await (
            this.prisma as any
          ).productUnit.findMany({
            where: {
              organizationId,
              identifierValue: {
                in: cleanedIdentifiers,
              },
            },
            select: {
              identifierValue: true,
            },
          });

          if (existingIdentifiers.length > 0) {
            throw new BadRequestException(
              `Identifiers already exist: ${existingIdentifiers.map((entry: any) => entry.identifierValue).join(', ')}`,
            );
          }
        }

        const currentQuantity = product.quantity || 0;
        const newQuantity = currentQuantity + item.quantity;

        // Build product update data
        const productUpdateData: any = {
          quantity: newQuantity,
        };

        // Update buying price if it changed
        if (item.buying_price && item.buying_price !== product.buyingPrice) {
          productUpdateData.buyingPrice = item.buying_price;
        }

        // Calculate and update selling price from markup
        if (
          item.markup_percentage !== undefined &&
          item.markup_percentage > 0
        ) {
          const sellingPrice =
            item.buying_price * (1 + item.markup_percentage / 100);
          productUpdateData.price = Math.round(sellingPrice * 100) / 100;
        } else if (item.selling_price !== undefined && item.selling_price > 0) {
          productUpdateData.price = item.selling_price;
        }

        await this.prisma.product.update({
          where: { id: productId },
          data: productUpdateData,
        });

        // Create inventory batch
        const batchNumber = this.generateBatchNumber(productId, inventory.id);
        await this.prisma.inventoryBatch.create({
          data: {
            organizationId,
            productId,
            inventoryId: inventory.id,
            batchNumber,
            quantity: item.quantity,
            initialQuantity: item.quantity,
            availableQuantity: item.quantity,
            unitCost: item.buying_price,
            supplierId: inventory.supplierId,
            expiryDate: item.expiry_date ? new Date(item.expiry_date) : null,
            manufacturingDate: item.manufacture_date
              ? new Date(item.manufacture_date)
              : null,
            warehouseLocation: item.warehouse_location || null,
            notes: item.notes || null,
            status: BatchStatus.ACTIVE,
            receivedDate: new Date(),
          },
        });

        // Create inventory movement record for the purchase
        await this.prisma.inventoryMovement.create({
          data: {
            organizationId,
            productId,
            movementType: MovementType.PURCHASE,
            quantityBefore: currentQuantity,
            quantityChange: item.quantity,
            quantityAfter: newQuantity,
            referenceType: 'INVENTORY',
            referenceId: inventory.id,
            unitCost: item.buying_price,
            totalValue: item.quantity * item.buying_price,
            performedBy: 0,
            performedByName: receivedBy,
            reason: 'Purchase received from supplier',
            notes: `Purchase #${inventory.id} - Batch ${batchNumber}`,
          },
        });

        if (isTrackedProduct && cleanedIdentifiers.length > 0) {
          for (const identifier of cleanedIdentifiers) {
            await (this.prisma as any).productUnit.create({
              data: {
                organizationId,
                productId,
                identifierType: trackingMode,
                identifierValue: identifier,
                metadata: {
                  source: 'PURCHASE_RECEIPT',
                  inventoryId: inventory.id,
                  supplierId: inventory.supplierId,
                },
              },
            });
          }
        }
      }
    }

    // Invalidate product cache so updated quantities show immediately
    await this.productService.invalidateCache(organizationId);

    // Update inventory status to RECEIVED
    return this.prisma.inventory.update({
      where: { id },
      data: {
        status: PurchaseStatus.RECEIVED,
        receivedBy,
        receivedAt: new Date(),
      },
      include: {
        supplier: true,
        payments: true,
      },
    });
  }

  async cancelPurchase(organizationId: number, id: number): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, organizationId },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Purchase with ID ${id} not found in this organization`,
      );
    }

    if (inventory.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(
        `Only pending purchases can be cancelled. Current status: ${inventory.status}`,
      );
    }

    return this.prisma.inventory.update({
      where: { id },
      data: {
        status: PurchaseStatus.CANCELLED,
      },
      include: {
        supplier: true,
        payments: true,
      },
    });
  }

  async addPayment(
    organizationId: number,
    inventoryId: number,
    payment: Payment,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        organizationId,
      },
      include: { payments: true },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory with ID ${inventoryId} not found in this organization`,
      );
    }

    const newPaidAmount = inventory.paidAmount + payment.amount;
    const newRemainingAmount = inventory.totalAmount - newPaidAmount;
    const newPaymentStatus =
      newPaidAmount === inventory.totalAmount
        ? PaymentStatus.PAID
        : newPaidAmount > 0
          ? PaymentStatus.PARTIAL
          : PaymentStatus.UNPAID;

    return this.prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        payments: {
          create: payment,
        },
      },
      include: {
        payments: true,
      },
    });
  }

  async getAllInventories(organizationId: number): Promise<Inventory[]> {
    return this.prisma.inventory.findMany({
      where: { organizationId },
      include: {
        supplier: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getInventoryById(
    organizationId: number,
    id: number,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        supplier: true,
        payments: true,
      },
    });
    if (!inventory) {
      throw new NotFoundException(
        `Inventory with ID ${id} not found in this organization`,
      );
    }
    return inventory;
  }

  async updateInventory(
    organizationId: number,
    id: number,
    dto: InventoryDto,
  ): Promise<Inventory> {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory with ID ${id} not found in this organization`,
      );
    }

    if (
      inventory.status !== PurchaseStatus.PENDING &&
      inventory.status !== PurchaseStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Only pending or approved purchases can be edited. Current status: ${inventory.status}`,
      );
    }

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.buying_price,
      0,
    );

    return await this.prisma.inventory.update({
      where: { id },
      data: {
        items: JSON.stringify(dto.items),
        totalAmount,
        supplierId: dto.supplierId,
        added_by: dto.added_by,
        deleted: dto.deleted,
      },
      include: {
        supplier: true,
        payments: true,
      },
    });
  }

  async deleteInventory(organizationId: number, id: number): Promise<void> {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory with ID ${id} not found in this organization`,
      );
    }

    await this.prisma.inventory.delete({ where: { id } });
  }

  async getInventoryReportForDay(
    organizationId: number,
    date: Date,
  ): Promise<Inventory[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.inventory.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        supplier: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getInventoryReportForTimeRange(
    organizationId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Inventory[]> {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.inventory.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        supplier: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async calculateTotalInventoryValue(organizationId: number): Promise<number> {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        deleted: false,
      },
    });

    return inventories.reduce((total, inv) => {
      const items = inv.items as any[];
      const inventoryTotal = items.reduce(
        (sum, item) => sum + item.quantity * item.buying_price,
        0,
      );
      return total + inventoryTotal;
    }, 0);
  }

  async getInventoryStatistics(organizationId: number): Promise<{
    totalInventories: number;
    totalValue: number;
    paidAmount: number;
    remainingAmount: number;
    byPaymentStatus: Record<string, number>;
  }> {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        deleted: false,
      },
      include: {
        payments: true,
      },
    });

    const stats = {
      totalInventories: inventories.length,
      totalValue: 0,
      paidAmount: 0,
      remainingAmount: 0,
      byPaymentStatus: {
        PAID: 0,
        PARTIAL: 0,
        UNPAID: 0,
      },
    };

    inventories.forEach((inv) => {
      stats.totalValue += inv.totalAmount;
      stats.paidAmount += inv.paidAmount;
      stats.remainingAmount += inv.remainingAmount;
      stats.byPaymentStatus[inv.paymentStatus] =
        (stats.byPaymentStatus[inv.paymentStatus] || 0) + 1;
    });

    return stats;
  }
}
