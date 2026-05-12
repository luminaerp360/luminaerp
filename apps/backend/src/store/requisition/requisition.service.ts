import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import {
  UpdateRequisitionDto,
  ApproveRequisitionDto,
  IssueRequisitionDto,
} from './dto/update-requisition.dto';
import { RequisitionStatus } from '@prisma/client';

const requisitionInclude = {
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
  department: true,
  requester: {
    select: { id: true, fullName: true, email: true },
  },
  approver: {
    select: { id: true, fullName: true, email: true },
  },
  rejector: {
    select: { id: true, fullName: true, email: true },
  },
  issuer: {
    select: { id: true, fullName: true, email: true },
  },
};

@Injectable()
export class RequisitionService {
  constructor(private prisma: PrismaService) {}

  private async generateRequisitionNumber(
    organizationId: number,
  ): Promise<string> {
    const count = await this.prisma.requisition.count({
      where: { organizationId },
    });
    return `REQ-${String(count + 1).padStart(5, '0')}`;
  }

  async create(
    dto: CreateRequisitionDto,
    organizationId: number,
    userId: number,
  ) {
    const { items, departmentId, priority, purpose, notes } = dto;

    // Verify all products exist
    const productIds = items.map((i) => i.storeProductId);
    const products = await this.prisma.storeProduct.findMany({
      where: { id: { in: productIds }, organizationId },
    });

    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException('One or more store products not found');
    }

    // Verify department exists if provided
    if (departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: departmentId, organizationId },
      });
      if (!dept) throw new NotFoundException('Department not found');
    }

    const requisitionNumber =
      await this.generateRequisitionNumber(organizationId);

    return this.prisma.requisition.create({
      data: {
        requisitionNumber,
        organizationId,
        departmentId: departmentId || null,
        priority: priority || 'MEDIUM',
        purpose: purpose || null,
        notes: notes || null,
        requestedBy: userId,
        status: RequisitionStatus.PENDING,
        items: {
          create: items.map((item) => ({
            storeProductId: item.storeProductId,
            quantityRequested: item.quantityRequested,
            notes: item.notes || null,
          })),
        },
      },
      include: requisitionInclude,
    });
  }

  async findAll(
    organizationId: number,
    query?: {
      status?: RequisitionStatus;
      departmentId?: number;
      priority?: string;
      requestedBy?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: any = { organizationId };

    if (query?.status) where.status = query.status;
    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.priority) where.priority = query.priority;
    if (query?.requestedBy) where.requestedBy = query.requestedBy;
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    return this.prisma.requisition.findMany({
      where,
      include: requisitionInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, organizationId: number) {
    const requisition = await this.prisma.requisition.findFirst({
      where: { id, organizationId },
      include: requisitionInclude,
    });

    if (!requisition) {
      throw new NotFoundException('Requisition not found');
    }

    return requisition;
  }

  async update(id: number, dto: UpdateRequisitionDto, organizationId: number) {
    const requisition = await this.findOne(id, organizationId);

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new BadRequestException('Can only update pending requisitions');
    }

    const { items, departmentId, priority, purpose, notes } = dto;

    return this.prisma.$transaction(async (tx) => {
      // If items provided, replace all items
      if (items && items.length > 0) {
        const productIds = items.map((i) => i.storeProductId);
        const products = await tx.storeProduct.findMany({
          where: { id: { in: productIds }, organizationId },
        });
        if (products.length !== new Set(productIds).size) {
          throw new NotFoundException('One or more store products not found');
        }

        await tx.requisitionItem.deleteMany({
          where: { requisitionId: id },
        });

        await tx.requisitionItem.createMany({
          data: items.map((item) => ({
            requisitionId: id,
            storeProductId: item.storeProductId,
            quantityRequested: item.quantityRequested,
            notes: item.notes || null,
          })),
        });
      }

      return tx.requisition.update({
        where: { id },
        data: {
          ...(departmentId !== undefined && { departmentId }),
          ...(priority !== undefined && { priority }),
          ...(purpose !== undefined && { purpose }),
          ...(notes !== undefined && { notes }),
        },
        include: requisitionInclude,
      });
    });
  }

  async approve(
    id: number,
    organizationId: number,
    userId: number,
    dto?: ApproveRequisitionDto,
  ) {
    const requisition = await this.findOne(id, organizationId);

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new BadRequestException('Requisition already processed');
    }

    return this.prisma.$transaction(async (tx) => {
      // If individual item approvals provided, update each
      if (dto?.items && dto.items.length > 0) {
        for (const itemApproval of dto.items) {
          const reqItem = requisition.items.find(
            (i) => i.id === itemApproval.id,
          );
          if (!reqItem) {
            throw new NotFoundException(
              `Requisition item ${itemApproval.id} not found`,
            );
          }
          if (itemApproval.quantityApproved > reqItem.quantityRequested) {
            throw new BadRequestException(
              `Approved quantity cannot exceed requested quantity for item ${itemApproval.id}`,
            );
          }
          await tx.requisitionItem.update({
            where: { id: itemApproval.id },
            data: { quantityApproved: itemApproval.quantityApproved },
          });
        }
      } else {
        // Approve all items with full requested quantities
        await tx.requisitionItem.updateMany({
          where: { requisitionId: id },
          data: { quantityApproved: undefined },
        });
        // Set quantityApproved = quantityRequested for each item
        for (const item of requisition.items) {
          await tx.requisitionItem.update({
            where: { id: item.id },
            data: { quantityApproved: item.quantityRequested },
          });
        }
      }

      return tx.requisition.update({
        where: { id },
        data: {
          status: RequisitionStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
        },
        include: requisitionInclude,
      });
    });
  }

  async reject(
    id: number,
    organizationId: number,
    userId: number,
    reason: string,
  ) {
    const requisition = await this.findOne(id, organizationId);

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new BadRequestException('Requisition already processed');
    }

    return this.prisma.requisition.update({
      where: { id },
      data: {
        status: RequisitionStatus.REJECTED,
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: requisitionInclude,
    });
  }

  async issue(
    id: number,
    organizationId: number,
    userId: number,
    dto?: IssueRequisitionDto,
  ) {
    const requisition = await this.findOne(id, organizationId);

    if (
      requisition.status !== RequisitionStatus.APPROVED &&
      requisition.status !== RequisitionStatus.PARTIALLY_ISSUED
    ) {
      throw new BadRequestException(
        'Can only issue approved or partially issued requisitions',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let allFullyIssued = true;
      const itemsToIssue =
        dto?.items ||
        requisition.items.map((i) => ({
          id: i.id,
          quantityIssued: i.quantityApproved || i.quantityRequested,
        }));

      for (const issueItem of itemsToIssue) {
        const reqItem = requisition.items.find((i) => i.id === issueItem.id);
        if (!reqItem) {
          throw new NotFoundException(
            `Requisition item ${issueItem.id} not found`,
          );
        }

        const approvedQty =
          reqItem.quantityApproved || reqItem.quantityRequested;
        const alreadyIssued = reqItem.quantityIssued || 0;
        const remainingToIssue = approvedQty - alreadyIssued;

        if (issueItem.quantityIssued > remainingToIssue) {
          throw new BadRequestException(
            `Cannot issue more than remaining approved quantity for item ${issueItem.id}. Remaining: ${remainingToIssue}`,
          );
        }

        // Check product stock
        const product = await tx.storeProduct.findUnique({
          where: { id: reqItem.storeProductId },
        });
        if (!product || product.quantity < issueItem.quantityIssued) {
          throw new BadRequestException(
            `Insufficient stock for product "${product?.productName}". Available: ${product?.quantity || 0}, Requested: ${issueItem.quantityIssued}`,
          );
        }

        // Deduct from stock
        await tx.storeProduct.update({
          where: { id: reqItem.storeProductId },
          data: { quantity: { decrement: issueItem.quantityIssued } },
        });

        // Update item issued quantity
        const newIssuedQty = alreadyIssued + issueItem.quantityIssued;
        await tx.requisitionItem.update({
          where: { id: issueItem.id },
          data: { quantityIssued: newIssuedQty },
        });

        if (newIssuedQty < approvedQty) {
          allFullyIssued = false;
        }
      }

      // Check if any other items not in this batch are still not fully issued
      const otherItems = requisition.items.filter(
        (i) => !itemsToIssue.some((ii) => ii.id === i.id),
      );
      for (const otherItem of otherItems) {
        const approvedQty =
          otherItem.quantityApproved || otherItem.quantityRequested;
        const issuedQty = otherItem.quantityIssued || 0;
        if (issuedQty < approvedQty) {
          allFullyIssued = false;
        }
      }

      const newStatus = allFullyIssued
        ? RequisitionStatus.ISSUED
        : RequisitionStatus.PARTIALLY_ISSUED;

      return tx.requisition.update({
        where: { id },
        data: {
          status: newStatus,
          issuedBy: userId,
          issuedAt: new Date(),
        },
        include: requisitionInclude,
      });
    });
  }

  async cancel(id: number, organizationId: number) {
    const requisition = await this.findOne(id, organizationId);

    if (requisition.status === RequisitionStatus.ISSUED) {
      throw new BadRequestException('Cannot cancel fully issued requisition');
    }

    // If partially issued, return issued quantities to stock
    if (
      requisition.status === RequisitionStatus.PARTIALLY_ISSUED ||
      requisition.status === RequisitionStatus.APPROVED
    ) {
      return this.prisma.$transaction(async (tx) => {
        // Return any issued quantities to stock
        for (const item of requisition.items) {
          if (item.quantityIssued && item.quantityIssued > 0) {
            await tx.storeProduct.update({
              where: { id: item.storeProductId },
              data: { quantity: { increment: item.quantityIssued } },
            });
          }
        }

        return tx.requisition.update({
          where: { id },
          data: { status: RequisitionStatus.CANCELLED },
          include: requisitionInclude,
        });
      });
    }

    return this.prisma.requisition.update({
      where: { id },
      data: { status: RequisitionStatus.CANCELLED },
      include: requisitionInclude,
    });
  }

  async remove(id: number, organizationId: number) {
    const requisition = await this.findOne(id, organizationId);

    if (
      requisition.status !== RequisitionStatus.PENDING &&
      requisition.status !== RequisitionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Can only delete pending or cancelled requisitions',
      );
    }

    return this.prisma.requisition.delete({
      where: { id },
    });
  }
}
