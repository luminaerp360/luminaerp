import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DocumentCounterService } from '../settings/document-counter.service';
import { LpoDto, ConvertToPurchaseDto } from './lpo.dto';
import { AccountsPayableService } from '../accounts-payable/accounts-payable.service';
import { LpoStatus, MovementType } from '@prisma/client';

@Injectable()
export class LpoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsPayableService: AccountsPayableService,
    private readonly counterService: DocumentCounterService,
  ) {}

  async createLpo(organizationId: number, dto: LpoDto) {
    // Generate sequential LPO number using counter service
    const referenceNumber = await this.generateReferenceNumber(organizationId);
    return this.prisma.localPurchaseOrder.create({
      data: {
        referenceNumber,
        supplier: {
          connect: {
            id: dto.supplierId,
          },
        },
        items: dto.items,
        totalAmount: dto.totalAmount,
        subtotal: dto.subtotal || dto.totalAmount,
        taxAmount: dto.taxAmount || 0,
        discountAmount: dto.discountAmount || 0,
        shippingCost: dto.shippingCost || 0,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        paymentTerms: dto.paymentTerms || null,
        shippingAddress: dto.shippingAddress || null,
        notes: dto.notes || null,
        priority: dto.priority || 'MEDIUM',
        status: LpoStatus.PENDING,
        created_by: dto.created_by || '',
        organization: {
          connect: { id: organizationId },
        },
      },
      include: { supplier: true },
    });
  }

  private async generateReferenceNumber(
    organizationId: number,
  ): Promise<string> {
    // Use counter service for sequential numbering per organization
    return this.counterService.generateDocumentNumber(
      organizationId,
      'LPO',
      'LPO',
      {
        includeYear: true,
        includeMonth: false,
        separator: '-',
        sequenceLength: 5,
      },
    );
  }

  async getAllLpos(organizationId: number) {
    return this.prisma.localPurchaseOrder.findMany({
      where: { organizationId },
      include: { supplier: true },
    });
  }

  async getPendingLpos(organizationId: number) {
    return this.prisma.localPurchaseOrder.findMany({
      where: {
        organizationId,
        status: LpoStatus.PENDING,
      },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApprovedLpos(organizationId: number) {
    return this.prisma.localPurchaseOrder.findMany({
      where: {
        organizationId,
        status: LpoStatus.APPROVED,
        isPurchaseConverted: false,
      },
      include: { supplier: true },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async getLpoById(organizationId: number, id: number) {
    const lpo = await this.prisma.localPurchaseOrder.findFirst({
      where: {
        id,
        organizationId,
      },
      include: { supplier: true },
    });

    if (!lpo) {
      throw new NotFoundException(
        `LPO with ID ${id} not found in this organization`,
      );
    }

    return lpo;
  }

  async getLposByDateRange(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.localPurchaseOrder.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: { supplier: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateLpo(organizationId: number, id: number, dto: LpoDto) {
    const existingLpo = await this.getLpoById(organizationId, id);
    return this.prisma.localPurchaseOrder.update({
      where: { id },
      data: {
        supplierId: dto.supplierId || existingLpo.supplierId,
        items: dto.items || existingLpo.items,
        totalAmount: dto.totalAmount || existingLpo.totalAmount,
        subtotal: dto.subtotal ?? existingLpo.subtotal,
        taxAmount: dto.taxAmount ?? existingLpo.taxAmount,
        discountAmount: dto.discountAmount ?? existingLpo.discountAmount,
        shippingCost: dto.shippingCost ?? existingLpo.shippingCost,
        deliveryDate:
          dto.deliveryDate !== undefined
            ? dto.deliveryDate
              ? new Date(dto.deliveryDate)
              : null
            : existingLpo.deliveryDate,
        paymentTerms:
          dto.paymentTerms !== undefined
            ? dto.paymentTerms
            : existingLpo.paymentTerms,
        shippingAddress:
          dto.shippingAddress !== undefined
            ? dto.shippingAddress
            : existingLpo.shippingAddress,
        notes: dto.notes !== undefined ? dto.notes : existingLpo.notes,
        priority: dto.priority || existingLpo.priority,
        status: dto.status ? (dto.status as LpoStatus) : existingLpo.status,
      },
      include: { supplier: true },
    });
  }

  async deleteLpo(organizationId: number, id: number) {
    await this.getLpoById(organizationId, id);
    return this.prisma.localPurchaseOrder.delete({
      where: { id },
    });
  }

  async approveLpo(organizationId: number, id: number, approvedBy: number) {
    const lpo = await this.getLpoById(organizationId, id);

    if (lpo.status !== LpoStatus.PENDING) {
      throw new BadRequestException('Only pending LPOs can be approved');
    }

    if (lpo.isApproved) {
      throw new BadRequestException('LPO is already approved');
    }

    // Update LPO status to approved
    const updatedLpo = await this.prisma.localPurchaseOrder.update({
      where: { id },
      data: {
        status: LpoStatus.APPROVED,
        isApproved: true,
        approvedBy,
        approvedAt: new Date(),
      },
      include: { supplier: true },
    });

    // Automatically create a bill in accounts payable
    try {
      await this.accountsPayableService.createBillFromLPO(
        organizationId,
        id,
        approvedBy,
      );
    } catch (error) {
      // Log error but don't fail LPO approval if bill creation fails
      console.error('Failed to create bill from LPO:', error);
    }

    return updatedLpo;
  }

  async rejectLpo(
    organizationId: number,
    id: number,
    rejectedBy: number,
    rejectionReason?: string,
  ) {
    const lpo = await this.getLpoById(organizationId, id);

    if (lpo.status !== LpoStatus.PENDING) {
      throw new BadRequestException('Only pending LPOs can be rejected');
    }

    return this.prisma.localPurchaseOrder.update({
      where: { id },
      data: {
        status: LpoStatus.REJECTED,
        isRejected: true,
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: { supplier: true },
    });
  }

  async convertToPurchase(
    organizationId: number,
    id: number,
    convertedBy: number,
    dto: ConvertToPurchaseDto,
  ) {
    const lpo = await this.getLpoById(organizationId, id);

    // Validation
    if (!lpo.isApproved) {
      throw new BadRequestException(
        'LPO must be approved before conversion to purchase',
      );
    }

    if (lpo.isPurchaseConverted) {
      throw new BadRequestException(
        'LPO has already been converted to purchase',
      );
    }

    if (lpo.status === LpoStatus.REJECTED) {
      throw new BadRequestException('Cannot convert rejected LPO to purchase');
    }

    // Generate purchase reference
    const purchaseReference = await this.counterService.generateDocumentNumber(
      organizationId,
      'PURCHASE',
      'PUR',
      {
        includeYear: true,
        includeMonth: false,
        separator: '-',
        sequenceLength: 5,
      },
    );

    // Parse items from JSON
    const items = Array.isArray(lpo.items)
      ? lpo.items
      : JSON.parse(lpo.items as any);

    // Create inventory batches for each item with batch tracking
    const batchPromises = items.map(async (item: any) => {
      // Generate batch number
      const batchNumber = await this.counterService.generateDocumentNumber(
        organizationId,
        'BATCH',
        'BATCH',
        {
          includeYear: true,
          includeMonth: true,
          separator: '-',
          sequenceLength: 4,
        },
      );

      // Get current product to update quantity
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }

      // Create batch - auto-approved since LPO is already approved
      const batch = await this.prisma.inventoryBatch.create({
        data: {
          organizationId,
          productId: item.productId,
          supplierId: lpo.supplierId,
          batchNumber,
          quantity: item.quantity,
          initialQuantity: item.quantity,
          availableQuantity: item.quantity,
          unitCost: item.unitPrice || 0,
          expiryDate: dto.items.find((i: any) => i.productId === item.productId)
            ?.expiryDate
            ? new Date(
                dto.items.find((i: any) => i.productId === item.productId)
                  .expiryDate,
              )
            : null,
          receivedDate: new Date(),
          manufacturingDate: dto.items.find(
            (i: any) => i.productId === item.productId,
          )?.manufactureDate
            ? new Date(
                dto.items.find((i: any) => i.productId === item.productId)
                  .manufactureDate,
              )
            : null,
          warehouseLocation:
            dto.items.find((i: any) => i.productId === item.productId)
              ?.warehouseLocation || null,
          status: 'ACTIVE',
          notes: `Created from LPO ${lpo.referenceNumber}`,
        },
      });

      // Update product quantity immediately since LPO is approved
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          quantity: (product.quantity || 0) + item.quantity,
          buyingPrice: item.unitPrice || product.buyingPrice,
        },
      });

      // Create inventory movement record
      await this.prisma.inventoryMovement.create({
        data: {
          organizationId,
          productId: item.productId,
          batchId: batch.id,
          movementType: MovementType.PURCHASE,
          quantityBefore: product.quantity || 0,
          quantityChange: item.quantity,
          quantityAfter: (product.quantity || 0) + item.quantity,
          unitCost: item.unitPrice || 0,
          totalValue: item.quantity * (item.unitPrice || 0),
          performedBy: convertedBy,
          performedByName: 'System',
          referenceType: 'LPO',
          referenceId: lpo.id,
          notes: `Purchase from LPO ${lpo.referenceNumber} - ${lpo.supplier.name}`,
        },
      });

      return batch;
    });

    await Promise.all(batchPromises);

    // Update LPO to mark as converted
    const updatedLpo = await this.prisma.localPurchaseOrder.update({
      where: { id },
      data: {
        status: LpoStatus.CONVERTED_TO_PURCHASE,
        isPurchaseConverted: true,
        purchaseConvertedBy: convertedBy,
        purchaseConvertedAt: new Date(),
        purchaseReference,
      },
      include: { supplier: true },
    });

    return {
      lpo: updatedLpo,
      purchaseReference,
      message:
        'LPO successfully converted to purchase with inventory batches created',
    };
  }
}
