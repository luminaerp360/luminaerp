import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceivableDto, UpdateReceivableDto, CreateReceivablePaymentDto } from './dto';
import { ReceivableStatus, ReceivablePaymentStatus } from '@prisma/client';

@Injectable()
export class AccountsReceivableService {
  constructor(private prisma: PrismaService) {}

  async verifyOrganization(organizationId: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    return organization;
  }

  async createReceivable(organizationId: number, dto: CreateReceivableDto) {
    // Verify organization exists
    await this.verifyOrganization(organizationId);

    // Verify customer exists and belongs to organization
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer not found in this organization`);
    }

    // Check for duplicate receivable number
    const existingReceivable = await this.prisma.receivable.findFirst({
      where: {
        organizationId,
        receivableNumber: dto.receivableNumber,
      },
    });

    if (existingReceivable) {
      throw new ConflictException(`Receivable with number ${dto.receivableNumber} already exists`);
    }

    // Calculate net amount
    const taxAmount = dto.taxAmount || 0;
    const discountAmount = dto.discountAmount || 0;
    const netAmount = dto.totalAmount + taxAmount - discountAmount;

    return this.prisma.receivable.create({
      data: {
        organizationId,
        customerId: dto.customerId,
        receivableNumber: dto.receivableNumber,
        receivableDate: new Date(dto.receivableDate),
        dueDate: new Date(dto.dueDate),
        description: dto.description,
        totalAmount: dto.totalAmount,
        taxAmount,
        discountAmount,
        netAmount,
        balanceAmount: netAmount,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
        createdBy: dto.createdBy,
      },
      include: {
        customer: true,
      },
    });
  }

  async getAllReceivables(
    organizationId: number,
    filters?: {
      customerId?: number;
      status?: ReceivableStatus;
      startDate?: string;
      endDate?: string;
      dueStartDate?: string;
      dueEndDate?: string;
    },
  ) {
    const whereClause: any = {
      organizationId,
    };

    // Add filters
    if (filters?.customerId) {
      whereClause.customerId = filters.customerId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    // Date range filters
    if (filters?.startDate && filters?.endDate) {
      whereClause.receivableDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.dueStartDate && filters?.dueEndDate) {
      whereClause.dueDate = {
        gte: new Date(filters.dueStartDate),
        lte: new Date(filters.dueEndDate),
      };
    }

    const receivables = await this.prisma.receivable.findMany({
      where: whereClause,
      include: {
        customer: true,
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary metrics
    const summary = receivables.reduce(
      (acc, receivable) => {
        acc.totalReceivables++;
        acc.totalAmount += receivable.netAmount;
        acc.totalReceived += receivable.receivedAmount;
        acc.totalBalance += receivable.balanceAmount;

        switch (receivable.status) {
          case ReceivableStatus.DRAFT:
            acc.draftCount++;
            break;
          case ReceivableStatus.APPROVED:
            acc.approvedCount++;
            break;
          case ReceivableStatus.PAID:
            acc.paidCount++;
            break;
          case ReceivableStatus.PARTIALLY_PAID:
            acc.partiallyPaidCount++;
            break;
          case ReceivableStatus.OVERDUE:
            acc.overdueCount++;
            break;
        }

        return acc;
      },
      {
        totalReceivables: 0,
        totalAmount: 0,
        totalReceived: 0,
        totalBalance: 0,
        draftCount: 0,
        approvedCount: 0,
        paidCount: 0,
        partiallyPaidCount: 0,
        overdueCount: 0,
      }
    );

    return {
      receivables,
      summary,
    };
  }

  async getReceivableById(organizationId: number, id: number) {
    const receivable = await this.prisma.receivable.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        customer: true,
        payments: {
          include: {
            organization: true,
          },
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    });

    if (!receivable) {
      throw new NotFoundException(`Receivable with ID ${id} not found`);
    }

    return receivable;
  }

  async updateReceivable(organizationId: number, id: number, dto: UpdateReceivableDto) {
    // Verify receivable exists and belongs to organization
    const existingReceivable = await this.prisma.receivable.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingReceivable) {
      throw new NotFoundException(`Receivable with ID ${id} not found`);
    }

    // Check for duplicate receivable number if being updated
    if (dto.receivableNumber && dto.receivableNumber !== existingReceivable.receivableNumber) {
      const duplicateReceivable = await this.prisma.receivable.findFirst({
        where: {
          organizationId,
          receivableNumber: dto.receivableNumber,
        },
      });

      if (duplicateReceivable) {
        throw new ConflictException(`Receivable with number ${dto.receivableNumber} already exists`);
      }
    }

    // Recalculate amounts if any financial fields are being updated
    let updateData: any = { ...dto };

    if (dto.receivableDate) {
      updateData.receivableDate = new Date(dto.receivableDate);
    }

    if (dto.dueDate) {
      updateData.dueDate = new Date(dto.dueDate);
    }

    if (dto.totalAmount !== undefined || dto.taxAmount !== undefined || dto.discountAmount !== undefined) {
      const totalAmount = dto.totalAmount !== undefined ? dto.totalAmount : existingReceivable.totalAmount;
      const taxAmount = dto.taxAmount !== undefined ? dto.taxAmount : existingReceivable.taxAmount;
      const discountAmount = dto.discountAmount !== undefined ? dto.discountAmount : existingReceivable.discountAmount;
      const netAmount = totalAmount + taxAmount - discountAmount;

      updateData.netAmount = netAmount;
      updateData.balanceAmount = netAmount - existingReceivable.receivedAmount;
    }

    return this.prisma.receivable.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    });
  }

  async deleteReceivable(organizationId: number, id: number) {
    // Verify receivable exists and belongs to organization
    const receivable = await this.prisma.receivable.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!receivable) {
      throw new NotFoundException(`Receivable with ID ${id} not found`);
    }

    // Check if receivable has payments
    const paymentCount = await this.prisma.receivablePayment.count({
      where: {
        receivableId: id,
      },
    });

    if (paymentCount > 0) {
      throw new BadRequestException(`Cannot delete receivable with existing payments`);
    }

    await this.prisma.receivable.delete({
      where: { id },
    });

    return { message: 'Receivable deleted successfully' };
  }

  async approveReceivable(organizationId: number, id: number, approvedBy: number) {
    // Verify receivable exists and belongs to organization
    const receivable = await this.prisma.receivable.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!receivable) {
      throw new NotFoundException(`Receivable with ID ${id} not found`);
    }

    if (receivable.status !== 'DRAFT') {
      throw new BadRequestException(`Only draft receivables can be approved`);
    }

    return this.prisma.receivable.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        customer: true,
      },
    });
  }

  async createReceivablePayment(organizationId: number, dto: CreateReceivablePaymentDto) {
    // Verify organization exists
    await this.verifyOrganization(organizationId);

    // Verify receivable exists and belongs to organization
    const receivable = await this.prisma.receivable.findFirst({
      where: {
        id: dto.receivableId,
        organizationId,
      },
    });

    if (!receivable) {
      throw new NotFoundException(`Receivable not found in this organization`);
    }

    if (receivable.status === 'PAID') {
      throw new BadRequestException(`Cannot add payment to a fully paid receivable`);
    }

    // Check if payment amount exceeds balance
    if (dto.amount > receivable.balanceAmount) {
      throw new BadRequestException(`Payment amount cannot exceed outstanding balance of ${receivable.balanceAmount}`);
    }

    const payment = await this.prisma.receivablePayment.create({
      data: {
        organizationId,
        receivableId: dto.receivableId,
        paymentDate: new Date(dto.paymentDate),
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        transactionCode: dto.transactionCode,
        notes: dto.notes,
        createdBy: dto.createdBy,
      },
      include: {
        receivable: true,
      },
    });

    // Update receivable amounts and status
    const newReceivedAmount = receivable.receivedAmount + dto.amount;
    const newBalanceAmount = receivable.netAmount - newReceivedAmount;

    let newStatus: ReceivableStatus = receivable.status;
    if (newBalanceAmount === 0) {
      newStatus = ReceivableStatus.PAID;
    } else if (newReceivedAmount > 0) {
      newStatus = ReceivableStatus.PARTIALLY_PAID;
    }

    await this.prisma.receivable.update({
      where: { id: dto.receivableId },
      data: {
        receivedAmount: newReceivedAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
      },
    });

    return payment;
  }

  async getReceivablePayments(organizationId: number, receivableId?: number) {
    const whereClause: any = {
      organizationId,
    };

    if (receivableId) {
      whereClause.receivableId = receivableId;
    }

    return this.prisma.receivablePayment.findMany({
      where: whereClause,
      include: {
        receivable: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });
  }

  async getAgingReport(organizationId: number) {
    const receivables = await this.prisma.receivable.findMany({
      where: {
        organizationId,
        status: {
          in: ['APPROVED', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      include: {
        customer: true,
      },
    });

    const now = new Date();
    const agingBuckets = {
      current: 0, // 0-30 days
      thirtyDays: 0, // 31-60 days
      sixtyDays: 0, // 61-90 days
      ninetyDays: 0, // 91+ days
    };

    for (const receivable of receivables) {
      const daysPastDue = Math.floor((now.getTime() - receivable.dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysPastDue <= 0) {
        agingBuckets.current += receivable.balanceAmount;
      } else if (daysPastDue <= 30) {
        agingBuckets.thirtyDays += receivable.balanceAmount;
      } else if (daysPastDue <= 60) {
        agingBuckets.sixtyDays += receivable.balanceAmount;
      } else {
        agingBuckets.ninetyDays += receivable.balanceAmount;
      }

      // Update status to OVERDUE if past due date
      if (daysPastDue > 0 && receivable.status !== 'OVERDUE') {
        await (this.prisma as any).receivable.update({
          where: { id: receivable.id },
          data: { status: 'OVERDUE' },
        });
      }
    }

    return {
      totalOutstanding: Object.values(agingBuckets).reduce((sum, amount) => sum + amount, 0),
      agingBuckets,
      receivables: receivables.filter(r => r.balanceAmount > 0),
    };
  }
}