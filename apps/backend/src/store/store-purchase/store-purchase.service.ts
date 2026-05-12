import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStorePurchaseDto } from './dto/create-store-purchase.dto';
import { UpdateStorePurchaseDto } from './dto/update-store-purchase.dto';
import { ReceiveStorePurchaseDto } from './dto/receive-store-purchase.dto';
import { PurchaseStatus } from '@prisma/client';

const purchaseInclude = {
  items: {
    include: {
      storeProduct: {
        include: {
          storeCategory: true,
          department: true,
        },
      },
    },
  },
  supplier: true,
  creator: {
    select: { id: true, fullName: true, email: true },
  },
  approver: {
    select: { id: true, fullName: true, email: true },
  },
  rejector: {
    select: { id: true, fullName: true, email: true },
  },
};

@Injectable()
export class StorePurchaseService {
  constructor(private prisma: PrismaService) {}

  private async generatePurchaseNumber(
    organizationId: number,
  ): Promise<string> {
    const count = await this.prisma.storePurchase.count({
      where: { organizationId },
    });
    return `PO-${String(count + 1).padStart(5, '0')}`;
  }

  async create(
    dto: CreateStorePurchaseDto,
    organizationId: number,
    userId: number,
  ) {
    const { items, supplierId, notes, receivedBy, deliveryDate } = dto;

    // Verify all products exist
    const productIds = items.map((i) => i.storeProductId);
    const products = await this.prisma.storeProduct.findMany({
      where: { id: { in: productIds }, organizationId },
    });

    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException('One or more store products not found');
    }

    const purchaseNumber = await this.generatePurchaseNumber(organizationId);

    // Calculate totals
    const purchaseItems = items.map((item) => ({
      storeProductId: item.storeProductId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }));
    const totalAmount = purchaseItems.reduce((sum, i) => sum + i.totalPrice, 0);

    return this.prisma.storePurchase.create({
      data: {
        purchaseNumber,
        organizationId,
        supplierId: supplierId || null,
        totalAmount,
        notes: notes || null,
        receivedBy: receivedBy || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        createdBy: userId,
        status: PurchaseStatus.PENDING,
        items: {
          create: purchaseItems,
        },
      },
      include: purchaseInclude,
    });
  }

  async findAll(
    organizationId: number,
    query?: {
      status?: PurchaseStatus;
      supplierId?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: any = { organizationId };

    if (query?.status) where.status = query.status;
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    return this.prisma.storePurchase.findMany({
      where,
      include: purchaseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, organizationId: number) {
    const purchase = await this.prisma.storePurchase.findFirst({
      where: { id, organizationId },
      include: purchaseInclude,
    });

    if (!purchase) {
      throw new NotFoundException('Store purchase not found');
    }

    return purchase;
  }

  async update(
    id: number,
    dto: UpdateStorePurchaseDto,
    organizationId: number,
  ) {
    const purchase = await this.findOne(id, organizationId);

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException('Can only update pending purchases');
    }

    const { items, supplierId, notes, receivedBy, deliveryDate } = dto;

    return this.prisma.$transaction(async (tx) => {
      // If items provided, replace all items
      if (items && items.length > 0) {
        // Verify all products exist
        const productIds = items.map((i) => i.storeProductId);
        const products = await tx.storeProduct.findMany({
          where: { id: { in: productIds }, organizationId },
        });
        if (products.length !== new Set(productIds).size) {
          throw new NotFoundException('One or more store products not found');
        }

        // Delete existing items
        await tx.storePurchaseItem.deleteMany({
          where: { storePurchaseId: id },
        });

        // Create new items
        const purchaseItems = items.map((item) => ({
          storePurchaseId: id,
          storeProductId: item.storeProductId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        }));

        await tx.storePurchaseItem.createMany({ data: purchaseItems });

        const totalAmount = purchaseItems.reduce(
          (sum, i) => sum + i.totalPrice,
          0,
        );

        return tx.storePurchase.update({
          where: { id },
          data: {
            totalAmount,
            ...(supplierId !== undefined && { supplierId }),
            ...(notes !== undefined && { notes }),
            ...(receivedBy !== undefined && { receivedBy }),
            ...(deliveryDate !== undefined && {
              deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            }),
          },
          include: purchaseInclude,
        });
      }

      // Update header only
      return tx.storePurchase.update({
        where: { id },
        data: {
          ...(supplierId !== undefined && { supplierId }),
          ...(notes !== undefined && { notes }),
          ...(receivedBy !== undefined && { receivedBy }),
          ...(deliveryDate !== undefined && {
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          }),
        },
        include: purchaseInclude,
      });
    });
  }

  async approve(id: number, organizationId: number, userId: number) {
    const purchase = await this.findOne(id, organizationId);

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException('Purchase already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      // Approve the purchase
      const updated = await tx.storePurchase.update({
        where: { id },
        data: {
          status: PurchaseStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
        },
        include: purchaseInclude,
      });

      return updated;
    });
  }

  async reject(
    id: number,
    organizationId: number,
    userId: number,
    reason: string,
  ) {
    const purchase = await this.findOne(id, organizationId);

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException('Purchase already processed');
    }

    return this.prisma.storePurchase.update({
      where: { id },
      data: {
        status: PurchaseStatus.REJECTED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: purchaseInclude,
    });
  }

  async receive(
    id: number,
    organizationId: number,
    userId: number,
    dto: ReceiveStorePurchaseDto,
  ) {
    const purchase = await this.findOne(id, organizationId);

    if (
      purchase.status !== PurchaseStatus.APPROVED &&
      purchase.status !== PurchaseStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException(
        'Can only receive approved or partially received purchases',
      );
    }

    // Validate received quantities
    for (const receiveItem of dto.items) {
      const purchaseItem = purchase.items.find(
        (i) => i.id === receiveItem.itemId,
      );
      if (!purchaseItem) {
        throw new NotFoundException(
          `Purchase item with id ${receiveItem.itemId} not found`,
        );
      }
      const remaining = purchaseItem.quantity - purchaseItem.receivedQuantity;
      if (receiveItem.receivedQuantity > remaining) {
        throw new BadRequestException(
          `Cannot receive more than remaining quantity (${remaining}) for item ${purchaseItem.storeProduct?.productName || purchaseItem.storeProductId}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Generate GRN number for this receive event
      const receiveCount = await tx.storePurchaseReceive.count({
        where: { storePurchaseId: id },
      });
      const poNum = purchase.purchaseNumber.replace('PO-', '');
      const grnNumber = `GRN-${poNum}-${String(receiveCount + 1).padStart(2, '0')}`;

      // Create receive record
      const receiveRecord = await tx.storePurchaseReceive.create({
        data: {
          storePurchaseId: id,
          grnNumber,
          receivedById: userId,
          notes: dto.notes || null,
          items: {
            create: dto.items
              .filter((i) => i.receivedQuantity > 0)
              .map((i) => ({
                storePurchaseItemId: i.itemId,
                receivedQuantity: i.receivedQuantity,
              })),
          },
        },
      });

      // Update received quantities and increment stock
      for (const receiveItem of dto.items) {
        if (receiveItem.receivedQuantity <= 0) continue;

        await tx.storePurchaseItem.update({
          where: { id: receiveItem.itemId },
          data: {
            receivedQuantity: {
              increment: receiveItem.receivedQuantity,
            },
          },
        });

        const purchaseItem = purchase.items.find(
          (i) => i.id === receiveItem.itemId,
        );
        await tx.storeProduct.update({
          where: { id: purchaseItem.storeProductId },
          data: {
            quantity: { increment: receiveItem.receivedQuantity },
          },
        });
      }

      // Check if all items are fully received
      const updatedItems = await tx.storePurchaseItem.findMany({
        where: { storePurchaseId: id },
      });
      const allFullyReceived = updatedItems.every(
        (item) => item.receivedQuantity >= item.quantity,
      );

      const newStatus = allFullyReceived
        ? PurchaseStatus.RECEIVED
        : PurchaseStatus.PARTIALLY_RECEIVED;

      const updated = await tx.storePurchase.update({
        where: { id },
        data: {
          status: newStatus,
          receivedAt: allFullyReceived ? new Date() : null,
        },
        include: purchaseInclude,
      });

      return updated;
    });
  }

  async cancel(id: number, organizationId: number) {
    const purchase = await this.findOne(id, organizationId);

    if (
      purchase.status === PurchaseStatus.RECEIVED ||
      purchase.status === PurchaseStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException(
        'Cannot cancel received or partially received purchase',
      );
    }

    return this.prisma.storePurchase.update({
      where: { id },
      data: { status: PurchaseStatus.CANCELLED },
      include: purchaseInclude,
    });
  }

  async remove(id: number, organizationId: number) {
    const purchase = await this.findOne(id, organizationId);

    if (
      purchase.status !== PurchaseStatus.PENDING &&
      purchase.status !== PurchaseStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Can only delete pending or cancelled purchases',
      );
    }

    return this.prisma.storePurchase.delete({
      where: { id },
    });
  }

  async getGrn(id: number, organizationId: number) {
    const purchase = await this.prisma.storePurchase.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            storeProduct: {
              include: {
                storeCategory: true,
                department: true,
              },
            },
          },
        },
        supplier: true,
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        approver: {
          select: { id: true, fullName: true, email: true },
        },
        organization: {
          select: {
            id: true,
            name: true,
            address: true,
            contact: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Store purchase not found');
    }

    if (
      purchase.status !== PurchaseStatus.RECEIVED &&
      purchase.status !== PurchaseStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException(
        'GRN is only available for received or partially received purchases',
      );
    }

    const grnNumber = `GRN-${purchase.purchaseNumber.replace('PO-', '')}`;

    return {
      grnNumber,
      purchaseNumber: purchase.purchaseNumber,
      status: purchase.status,
      organization: purchase.organization,
      supplier: purchase.supplier,
      receivedBy: purchase.receivedBy,
      receivedAt: purchase.receivedAt,
      createdBy: purchase.creator,
      approvedBy: purchase.approver,
      deliveryDate: purchase.deliveryDate,
      notes: purchase.notes,
      items: purchase.items.map((item: any) => ({
        id: item.id,
        productName:
          item.storeProduct?.productName || `Product #${item.storeProductId}`,
        sku: item.storeProduct?.sku || '',
        category: item.storeProduct?.storeCategory?.name || '',
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        pendingQuantity: item.quantity - item.receivedQuantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        receivedTotal: item.receivedQuantity * item.unitPrice,
      })),
      totalAmount: purchase.totalAmount,
      totalReceived: purchase.items.reduce(
        (sum: number, item: any) =>
          sum + item.receivedQuantity * item.unitPrice,
        0,
      ),
      createdAt: purchase.createdAt,
    };
  }

  async getReceiveHistory(id: number, organizationId: number) {
    // Verify the purchase belongs to the organization
    await this.findOne(id, organizationId);

    return this.prisma.storePurchaseReceive.findMany({
      where: { storePurchaseId: id },
      include: {
        receivedBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            storePurchaseItem: {
              include: {
                storeProduct: {
                  include: {
                    storeCategory: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async getReceiveGrn(
    purchaseId: number,
    receiveId: number,
    organizationId: number,
  ) {
    const purchase = await this.prisma.storePurchase.findFirst({
      where: { id: purchaseId, organizationId },
      include: {
        supplier: true,
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        approver: {
          select: { id: true, fullName: true, email: true },
        },
        organization: {
          select: {
            id: true,
            name: true,
            address: true,
            contact: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Store purchase not found');
    }

    const receive = await this.prisma.storePurchaseReceive.findFirst({
      where: { id: receiveId, storePurchaseId: purchaseId },
      include: {
        receivedBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            storePurchaseItem: {
              include: {
                storeProduct: {
                  include: {
                    storeCategory: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!receive) {
      throw new NotFoundException('Receive record not found');
    }

    return {
      grnNumber: receive.grnNumber,
      purchaseNumber: purchase.purchaseNumber,
      status: purchase.status,
      organization: purchase.organization,
      supplier: purchase.supplier,
      receivedBy: receive.receivedBy,
      receivedAt: receive.receivedAt,
      createdBy: purchase.creator,
      approvedBy: purchase.approver,
      deliveryDate: purchase.deliveryDate,
      notes: receive.notes,
      items: receive.items.map((ri: any) => ({
        id: ri.id,
        productName:
          ri.storePurchaseItem?.storeProduct?.productName ||
          `Product #${ri.storePurchaseItem?.storeProductId}`,
        sku: ri.storePurchaseItem?.storeProduct?.sku || '',
        category: ri.storePurchaseItem?.storeProduct?.storeCategory?.name || '',
        orderedQuantity: ri.storePurchaseItem?.quantity || 0,
        receivedQuantity: ri.receivedQuantity,
        unitPrice: ri.storePurchaseItem?.unitPrice || 0,
        receivedTotal:
          ri.receivedQuantity * (ri.storePurchaseItem?.unitPrice || 0),
      })),
      totalReceived: receive.items.reduce(
        (sum: number, ri: any) =>
          sum + ri.receivedQuantity * (ri.storePurchaseItem?.unitPrice || 0),
        0,
      ),
      createdAt: receive.createdAt,
    };
  }
}
