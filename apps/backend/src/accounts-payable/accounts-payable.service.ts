import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBillDto,
  UpdateBillDto,
  CreateBillPaymentDto,
  CreateMultipleBillPaymentsDto,
} from './dto';
import { BillStatus, BillPaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class AccountsPayableService {
  constructor(private prisma: PrismaService) {}

  async verifyOrganization(organizationId: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    return organization;
  }

  async createBill(organizationId: number, dto: CreateBillDto) {
    // Verify organization exists
    await this.verifyOrganization(organizationId);

    // Verify supplier exists and belongs to organization
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: dto.supplierId,
        organizationId,
        deleted: false,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier not found in this organization`);
    }

    // Check for duplicate bill number
    const existingBill = await this.prisma.bill.findFirst({
      where: {
        organizationId,
        billNumber: dto.billNumber,
      },
    });

    if (existingBill) {
      throw new ConflictException(
        `Bill with number ${dto.billNumber} already exists`,
      );
    }

    // Verify expense accounts if provided
    if (dto.items && dto.items.length > 0) {
      const expenseAccountIds = dto.items
        .filter((item) => item.expenseAccountId)
        .map((item) => item.expenseAccountId);

      if (expenseAccountIds.length > 0) {
        const accounts = await this.prisma.chartOfAccount.findMany({
          where: {
            id: { in: expenseAccountIds },
            organizationId,
            isActive: true,
          },
        });

        if (accounts.length !== expenseAccountIds.length) {
          throw new NotFoundException('One or more expense accounts not found');
        }
      }
    }

    // Calculate totals from items
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const itemsData = dto.items.map((item, index) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTaxAmount = (itemSubtotal * (item.taxRate || 0)) / 100;
      const itemDiscountAmount = item.discountAmount || 0;
      const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;

      subtotal += itemSubtotal;
      totalTax += itemTaxAmount;
      totalDiscount += itemDiscountAmount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
        taxRate: item.taxRate || 0,
        taxAmount: itemTaxAmount,
        discountAmount: itemDiscountAmount,
        totalAmount: itemTotal,
        expenseAccountId: item.expenseAccountId,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
        notes: item.notes,
      };
    });

    // Add bill-level tax and discount if provided
    const billTaxAmount = dto.taxAmount || 0;
    const billDiscountAmount = dto.discountAmount || 0;
    const netAmount =
      subtotal + totalTax + billTaxAmount - totalDiscount - billDiscountAmount;

    return this.prisma.bill.create({
      data: {
        organizationId,
        supplierId: dto.supplierId,
        billNumber: dto.billNumber,
        billDate: new Date(dto.billDate),
        dueDate: new Date(dto.dueDate),
        description: dto.description,
        subtotal,
        totalAmount: subtotal, // Keep for backward compatibility
        taxAmount: totalTax + billTaxAmount,
        discountAmount: totalDiscount + billDiscountAmount,
        netAmount,
        balanceAmount: netAmount,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        createdBy: dto.createdBy,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            expenseAccount: {
              select: {
                id: true,
                accountCode: true,
                accountName: true,
                accountType: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });
  }

  async getAllBills(
    organizationId: number,
    filters?: {
      supplierId?: number;
      status?: BillStatus | BillStatus[];
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
    if (filters?.supplierId) {
      whereClause.supplierId = filters.supplierId;
    }

    if (filters?.status) {
      // Handle both single status and array of statuses
      if (Array.isArray(filters.status)) {
        whereClause.status = { in: filters.status };
      } else {
        whereClause.status = filters.status;
      }
    }

    // Date range filters
    if (filters?.startDate && filters?.endDate) {
      whereClause.billDate = {
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

    const bills = await this.prisma.bill.findMany({
      where: whereClause,
      include: {
        supplier: true,
        items: {
          include: {
            expenseAccount: {
              select: {
                id: true,
                accountCode: true,
                accountName: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
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
    const summary = bills.reduce(
      (acc, bill) => {
        acc.totalBills++;
        acc.totalAmount += bill.netAmount;
        acc.totalPaid += bill.paidAmount;
        acc.totalBalance += bill.balanceAmount;

        switch (bill.status) {
          case BillStatus.DRAFT:
            acc.draftCount++;
            break;
          case BillStatus.APPROVED:
            acc.approvedCount++;
            break;
          case BillStatus.PAID:
            acc.paidCount++;
            break;
          case BillStatus.PARTIALLY_PAID:
            acc.partiallyPaidCount++;
            break;
          case BillStatus.OVERDUE:
            acc.overdueCount++;
            break;
        }

        return acc;
      },
      {
        totalBills: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalBalance: 0,
        draftCount: 0,
        approvedCount: 0,
        paidCount: 0,
        partiallyPaidCount: 0,
        overdueCount: 0,
      },
    );

    return {
      bills,
      summary,
    };
  }

  async getBillById(organizationId: number, id: number) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        supplier: true,
        items: {
          include: {
            expenseAccount: {
              select: {
                id: true,
                accountCode: true,
                accountName: true,
                accountType: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
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

    if (!bill) {
      throw new NotFoundException(
        `Bill with ID ${id} not found in this organization`,
      );
    }

    return bill;
  }

  async updateBill(organizationId: number, id: number, dto: UpdateBillDto) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!bill) {
      throw new NotFoundException(
        `Bill with ID ${id} not found in this organization`,
      );
    }

    // Check for duplicate bill number if updating
    if (dto.billNumber && dto.billNumber !== bill.billNumber) {
      const existingBill = await this.prisma.bill.findFirst({
        where: {
          organizationId,
          billNumber: dto.billNumber,
          id: { not: id },
        },
      });

      if (existingBill) {
        throw new ConflictException(
          `Bill with number ${dto.billNumber} already exists`,
        );
      }
    }

    // Recalculate amounts if any financial fields are updated
    let updateData: any = {};
    if (
      dto.totalAmount !== undefined ||
      dto.taxAmount !== undefined ||
      dto.discountAmount !== undefined
    ) {
      const totalAmount =
        dto.totalAmount !== undefined ? dto.totalAmount : bill.totalAmount;
      const taxAmount =
        dto.taxAmount !== undefined ? dto.taxAmount : bill.taxAmount;
      const discountAmount =
        dto.discountAmount !== undefined
          ? dto.discountAmount
          : bill.discountAmount;
      const netAmount = totalAmount + taxAmount - discountAmount;
      const balanceAmount = netAmount - bill.paidAmount;

      updateData = {
        ...updateData,
        totalAmount,
        taxAmount,
        discountAmount,
        netAmount,
        balanceAmount,
      };
    }

    return this.prisma.bill.update({
      where: { id },
      data: {
        ...(dto.billNumber && { billNumber: dto.billNumber }),
        ...(dto.billDate && { billDate: new Date(dto.billDate) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status }),
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        supplier: true,
      },
    });
  }

  async deleteBill(organizationId: number, id: number) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!bill) {
      throw new NotFoundException(
        `Bill with ID ${id} not found in this organization`,
      );
    }

    // Check if bill has payments
    const paymentCount = await this.prisma.billPayment.count({
      where: { billId: id },
    });

    if (paymentCount > 0) {
      throw new BadRequestException(
        'Cannot delete bill with existing payments',
      );
    }

    return this.prisma.bill.delete({
      where: { id },
    });
  }

  async approveBill(organizationId: number, id: number, approvedBy: number) {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!bill) {
      throw new NotFoundException(
        `Bill with ID ${id} not found in this organization`,
      );
    }

    if (bill.status !== BillStatus.DRAFT) {
      throw new BadRequestException('Only draft bills can be approved');
    }

    return this.prisma.bill.update({
      where: { id },
      data: {
        status: BillStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  async createBillPayment(organizationId: number, dto: CreateBillPaymentDto) {
    // Verify organization exists
    await this.verifyOrganization(organizationId);

    // Verify bill exists and belongs to organization
    const bill = await this.prisma.bill.findFirst({
      where: {
        id: dto.billId,
        organizationId,
      },
    });

    if (!bill) {
      throw new NotFoundException(`Bill not found in this organization`);
    }

    // Check if payment amount exceeds balance
    if (dto.amount > bill.balanceAmount) {
      throw new BadRequestException(
        'Payment amount cannot exceed bill balance',
      );
    }

    // Create payment in transaction
    return this.prisma.$transaction(async (prisma) => {
      // Create payment
      const payment = await prisma.billPayment.create({
        data: {
          organizationId,
          billId: dto.billId,
          paymentDate: new Date(dto.paymentDate),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
          transactionCode: dto.transactionCode,
          notes: dto.notes,
          status: BillPaymentStatus.COMPLETED,
          createdBy: dto.createdBy,
          processedBy: dto.createdBy,
          processedAt: new Date(),
        },
      });

      // Update bill amounts and status
      const newPaidAmount = bill.paidAmount + dto.amount;
      const newBalanceAmount = bill.netAmount - newPaidAmount;

      let newStatus = bill.status;
      if (newBalanceAmount === 0) {
        newStatus = BillStatus.PAID;
      } else if (newPaidAmount > 0 && newBalanceAmount > 0) {
        newStatus = BillStatus.PARTIALLY_PAID;
      }

      await prisma.bill.update({
        where: { id: dto.billId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      });

      return payment;
    });
  }

  async getBillPayments(organizationId: number, billId?: number) {
    const whereClause: any = {
      organizationId,
    };

    if (billId) {
      whereClause.billId = billId;
    }

    const payments = await this.prisma.billPayment.findMany({
      where: whereClause,
      include: {
        bill: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    return payments;
  }

  async getAgingReport(organizationId: number) {
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        status: {
          in: [
            BillStatus.APPROVED,
            BillStatus.PARTIALLY_PAID,
            BillStatus.OVERDUE,
          ],
        },
      },
      include: {
        supplier: true,
      },
    });

    const now = new Date();
    const aging = {
      current: [], // 0-30 days
      thirtyDays: [], // 31-60 days
      sixtyDays: [], // 61-90 days
      ninetyDays: [], // 91+ days
    };

    bills.forEach((bill) => {
      const daysPastDue = Math.floor(
        (now.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysPastDue <= 0) {
        aging.current.push(bill);
      } else if (daysPastDue <= 30) {
        aging.thirtyDays.push(bill);
      } else if (daysPastDue <= 60) {
        aging.sixtyDays.push(bill);
      } else {
        aging.ninetyDays.push(bill);
      }
    });

    return aging;
  }

  async updateOverdueBills(organizationId?: number) {
    const now = new Date();

    const whereClause: any = {
      dueDate: {
        lt: now,
      },
      status: {
        in: [BillStatus.APPROVED, BillStatus.PARTIALLY_PAID],
      },
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const overdueBills = await this.prisma.bill.findMany({
      where: whereClause,
    });

    if (overdueBills.length > 0) {
      await this.prisma.bill.updateMany({
        where: {
          id: {
            in: overdueBills.map((bill) => bill.id),
          },
        },
        data: {
          status: BillStatus.OVERDUE,
          updatedAt: now,
        },
      });
    }

    return {
      updatedCount: overdueBills.length,
      bills: overdueBills,
    };
  }

  async createBillFromLPO(
    organizationId: number,
    lpoId: number,
    createdBy: number,
  ) {
    // Verify LPO exists and is approved
    const lpo = await this.prisma.localPurchaseOrder.findFirst({
      where: {
        id: lpoId,
        organizationId,
        status: 'APPROVED',
      },
      include: {
        supplier: true,
      },
    });

    if (!lpo) {
      throw new NotFoundException(
        `Approved LPO with ID ${lpoId} not found in this organization`,
      );
    }

    // Check if bill already exists for this LPO
    const existingBill = await this.prisma.bill.findFirst({
      where: {
        organizationId,
        referenceNumber: lpo.referenceNumber,
      },
    });

    if (existingBill) {
      throw new ConflictException(
        `Bill already exists for LPO ${lpo.referenceNumber}`,
      );
    }

    // Generate bill number
    const billNumber = `BILL-${lpo.referenceNumber}`;

    // Calculate due date (30 days from now by default)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create a single line item from LPO total
    // In a real implementation, you'd map LPO items to bill items
    return this.createBill(organizationId, {
      supplierId: lpo.supplierId,
      billNumber,
      billDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Bill for LPO ${lpo.referenceNumber}`,
      items: [
        {
          description: `Items from LPO ${lpo.referenceNumber}`,
          quantity: 1,
          unitPrice: lpo.totalAmount,
          taxRate: 0,
          notes: 'Converted from Local Purchase Order',
        },
      ],
      referenceNumber: lpo.referenceNumber,
      notes: `Automatically created from approved LPO`,
      createdBy,
    });
  }

  async createMultipleBillPayments(
    organizationId: number,
    dto: CreateMultipleBillPaymentsDto,
  ) {
    // Verify all bills belong to the organization and get their details
    const bills = await this.prisma.bill.findMany({
      where: {
        id: { in: dto.billIds },
        organizationId,
      },
    });

    if (bills.length !== dto.billIds.length) {
      const foundIds = bills.map((bill) => bill.id);
      const missingIds = dto.billIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Some bills not found in this organization: ${missingIds.join(', ')}`,
      );
    }

    // Filter out paid bills
    const unpaidBills = bills.filter(
      (bill) => bill.status !== BillStatus.PAID && bill.balanceAmount > 0,
    );

    if (unpaidBills.length === 0) {
      throw new BadRequestException(
        'All selected bills are already fully paid',
      );
    }

    // Sort bills by due date (oldest first) to pay them in order
    unpaidBills.sort((a, b) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    let remainingPaymentAmount = dto.totalAmount;
    const payments = [];

    // Process each bill in order
    for (const bill of unpaidBills) {
      if (remainingPaymentAmount <= 0) {
        break;
      }

      const billBalance = bill.balanceAmount;

      // Skip if this bill is fully paid
      if (billBalance <= 0) {
        continue;
      }

      // Determine amount to pay for this bill
      const amountToPayForThisBill = Math.min(
        remainingPaymentAmount,
        billBalance,
      );

      if (amountToPayForThisBill > 0) {
        // Create a payment DTO for this specific bill
        const singlePaymentDto: CreateBillPaymentDto = {
          billId: bill.id,
          amount: amountToPayForThisBill,
          paymentMethod: dto.paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
          referenceNumber: dto.referenceNumber,
          transactionCode: dto.transactionCode,
          notes: dto.notes || `Bulk payment - ${unpaidBills.length} bills`,
          createdBy: dto.createdBy,
        };

        // Create the payment for this bill
        const payment = await this.createBillPayment(
          organizationId,
          singlePaymentDto,
        );
        payments.push(payment);

        // Reduce the remaining payment amount
        remainingPaymentAmount -= amountToPayForThisBill;
      }
    }

    return {
      payments,
      unpaidAmount: Math.max(0, remainingPaymentAmount),
      message: `Successfully processed ${payments.length} payment(s)${
        remainingPaymentAmount > 0
          ? `. Remaining amount: ${remainingPaymentAmount.toFixed(2)}`
          : ''
      }`,
    };
  }

  async getSupplierStatement(
    organizationId: number,
    supplierId: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Verify supplier exists
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        organizationId,
        deleted: false,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found in this organization');
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.billDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get all bills for this supplier
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        supplierId,
        ...dateFilter,
      },
      include: {
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Separate paid and unpaid bills
    const unpaidBills = bills.filter(
      (bill) =>
        bill.status !== BillStatus.PAID &&
        bill.status !== BillStatus.CANCELLED &&
        bill.balanceAmount > 0,
    );
    const paidBills = bills.filter((bill) => bill.status === BillStatus.PAID);

    // Calculate totals
    const totals = bills.reduce(
      (acc, bill) => {
        acc.totalAmount += bill.netAmount;
        acc.totalPaid += bill.paidAmount;
        acc.outstandingBalance += bill.balanceAmount;
        return acc;
      },
      {
        totalAmount: 0,
        totalPaid: 0,
        outstandingBalance: 0,
      },
    );

    // Calculate aging buckets for unpaid bills
    const now = new Date();
    const aging = {
      current: 0, // Not yet due
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90Days: 0,
    };

    unpaidBills.forEach((bill) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(bill.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysOverdue < 0) {
        aging.current += bill.balanceAmount;
      } else if (daysOverdue <= 30) {
        aging.days1to30 += bill.balanceAmount;
      } else if (daysOverdue <= 60) {
        aging.days31to60 += bill.balanceAmount;
      } else if (daysOverdue <= 90) {
        aging.days61to90 += bill.balanceAmount;
      } else {
        aging.over90Days += bill.balanceAmount;
      }
    });

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: (supplier as any).email || null,
        phone: supplier.phone,
        address: (supplier as any).address || null,
      },
      unpaidBills,
      paidBills,
      totals,
      aging,
      summary: {
        totalBills: bills.length,
        unpaidBillsCount: unpaidBills.length,
        paidBillsCount: paidBills.length,
      },
    };
  }

  async getSupplierSummaries(
    organizationId: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.billDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get all bills grouped by supplier
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        ...dateFilter,
      },
      include: {
        supplier: true,
      },
    });

    // Group by supplier
    const supplierMap = new Map();

    bills.forEach((bill) => {
      const supplierId = bill.supplierId;

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplier: {
            id: bill.supplier.id,
            name: bill.supplier.name,
            email: (bill.supplier as any).email || null,
            phone: bill.supplier.phone,
          },
          totalBills: 0,
          totalAmount: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          unpaidBillsCount: 0,
          overdueCount: 0,
        });
      }

      const summary = supplierMap.get(supplierId);
      summary.totalBills++;
      summary.totalAmount += bill.netAmount;
      summary.totalPaid += bill.paidAmount;
      summary.outstandingBalance += bill.balanceAmount;

      if (bill.status !== BillStatus.PAID && bill.balanceAmount > 0) {
        summary.unpaidBillsCount++;
      }

      if (bill.status === BillStatus.OVERDUE) {
        summary.overdueCount++;
      }
    });

    // Convert map to array and sort by outstanding balance (descending)
    const summaries = Array.from(supplierMap.values()).sort(
      (a, b) => b.outstandingBalance - a.outstandingBalance,
    );

    return summaries;
  }

  async recordBulkBillPayment(
    organizationId: number,
    billPayments: Array<{ billId: number; amount: number }>,
    paymentDate: string,
    paymentMethod: PaymentMethod,
    createdBy: number,
    referenceNumber?: string,
    transactionCode?: string,
    notes?: string,
  ) {
    await this.verifyOrganization(organizationId);

    const results = [];
    const errors = [];

    for (const payment of billPayments) {
      try {
        // Verify bill exists and belongs to organization
        const bill = await this.prisma.bill.findFirst({
          where: {
            id: payment.billId,
            organizationId,
          },
        });

        if (!bill) {
          errors.push({
            billId: payment.billId,
            error: 'Bill not found',
          });
          continue;
        }

        // Verify payment amount doesn't exceed balance
        if (payment.amount > bill.balanceAmount) {
          errors.push({
            billId: payment.billId,
            error: `Payment amount (${payment.amount}) exceeds balance (${bill.balanceAmount})`,
          });
          continue;
        }

        // Create payment record
        const billPayment = await this.prisma.billPayment.create({
          data: {
            billId: payment.billId,
            paymentDate: new Date(paymentDate),
            amount: payment.amount,
            paymentMethod,
            referenceNumber,
            transactionCode,
            notes,
            createdBy,
            organizationId,
          },
          include: {
            bill: {
              include: {
                supplier: true,
              },
            },
          },
        });

        // Update bill amounts
        const newPaidAmount = bill.paidAmount + payment.amount;
        const newBalanceAmount = bill.netAmount - newPaidAmount;

        // Determine new status
        let newStatus: BillStatus;
        if (newBalanceAmount === 0) {
          newStatus = BillStatus.PAID;
        } else if (newBalanceAmount < bill.netAmount) {
          newStatus = BillStatus.PARTIALLY_PAID;
        } else {
          newStatus = bill.status; // Keep current status
        }

        // Update bill
        const updatedBill = await this.prisma.bill.update({
          where: { id: payment.billId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus,
          },
        });

        results.push({
          billId: payment.billId,
          paymentId: billPayment.id,
          amount: payment.amount,
          newBalance: newBalanceAmount,
          status: newStatus,
          supplier: billPayment.bill.supplier.name,
        });
      } catch (error) {
        errors.push({
          billId: payment.billId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async getAllSuppliers(
    organizationId: number,
    searchQuery?: string,
    showOnlyWithDebt: boolean = false,
  ) {
    await this.verifyOrganization(organizationId);

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Get all suppliers
    const suppliers = await this.prisma.supplier.findMany({
      where,
      include: {
        bills: {
          where: { organizationId },
          select: {
            id: true,
            netAmount: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate totals for each supplier
    const suppliersWithTotals = suppliers.map((supplier) => {
      const totalBills = supplier.bills.length;
      const totalAmount = supplier.bills.reduce(
        (sum, bill) => sum + bill.netAmount,
        0,
      );
      const totalPaid = supplier.bills.reduce(
        (sum, bill) => sum + bill.paidAmount,
        0,
      );
      const outstandingBalance = supplier.bills.reduce(
        (sum, bill) => sum + bill.balanceAmount,
        0,
      );
      const unpaidBillsCount = supplier.bills.filter(
        (bill) => bill.status !== BillStatus.PAID && bill.balanceAmount > 0,
      ).length;

      return {
        id: supplier.id,
        name: supplier.name,
        email: (supplier as any).email || null,
        phone: supplier.phone,
        address: (supplier as any).address || null,
        totalBills,
        totalAmount,
        totalPaid,
        outstandingBalance,
        unpaidBillsCount,
        hasDebt: outstandingBalance > 0,
      };
    });

    // Filter by debt if requested
    if (showOnlyWithDebt) {
      return suppliersWithTotals.filter(
        (supplier) => supplier.outstandingBalance > 0,
      );
    }

    return suppliersWithTotals;
  }

  async getAllBillPaymentHistory(
    organizationId: number,
    searchQuery?: string,
    startDate?: string,
    endDate?: string,
    paymentMethod?: PaymentMethod,
    supplierId?: number,
    page: number = 1,
    limit: number = 50,
  ) {
    await this.verifyOrganization(organizationId);

    // Build where clause
    const where: any = {
      organizationId,
    };

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (supplierId) {
      where.bill = {
        supplierId,
      };
    }

    if (searchQuery) {
      where.OR = [
        {
          bill: {
            supplier: {
              name: { contains: searchQuery, mode: 'insensitive' },
            },
          },
        },
        { referenceNumber: { contains: searchQuery, mode: 'insensitive' } },
        { transactionCode: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.billPayment.count({ where });

    // Get payments with pagination
    const payments = await this.prisma.billPayment.findMany({
      where,
      include: {
        bill: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate summary
    const allPayments = await this.prisma.billPayment.findMany({
      where,
      select: {
        amount: true,
      },
    });

    const summary = {
      totalPayments: total,
      totalAmount: allPayments.reduce((sum, p) => sum + p.amount, 0),
    };

    // Get unique user IDs and fetch user data
    const userIds = [
      ...new Set(payments.map((p) => p.createdBy).filter((id) => id)),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      payments: payments.map((payment) => {
        const creator = userMap.get(payment.createdBy);
        return {
          id: payment.id,
          billId: payment.billId,
          billNumber: payment.bill.billNumber,
          supplier: {
            id: payment.bill.supplier.id,
            name: payment.bill.supplier.name,
          },
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          transactionCode: payment.transactionCode,
          notes: payment.notes,
          createdBy: creator?.fullName || null,
          createdAt: payment.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async getAgingAnalysis(organizationId: number) {
    await this.verifyOrganization(organizationId);

    const now = new Date();

    // Get all unpaid bills
    const bills = await this.prisma.bill.findMany({
      where: {
        organizationId,
        status: {
          not: BillStatus.PAID,
        },
        balanceAmount: {
          gt: 0,
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Initialize aging buckets
    const aging = {
      CURRENT: { amount: 0, bills: [] as any[] },
      DAYS_1_30: { amount: 0, bills: [] as any[] },
      DAYS_31_60: { amount: 0, bills: [] as any[] },
      DAYS_61_90: { amount: 0, bills: [] as any[] },
      OVER_90: { amount: 0, bills: [] as any[] },
    };

    // Categorize bills
    bills.forEach((bill) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(bill.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const billData = {
        id: bill.id,
        billNumber: bill.billNumber,
        supplierId: bill.supplierId,
        supplierName: bill.supplier.name,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        netAmount: bill.netAmount,
        paidAmount: bill.paidAmount,
        balanceAmount: bill.balanceAmount,
        daysOverdue,
        status: bill.status,
      };

      if (daysOverdue < 0) {
        aging.CURRENT.amount += bill.balanceAmount;
        aging.CURRENT.bills.push(billData);
      } else if (daysOverdue <= 30) {
        aging.DAYS_1_30.amount += bill.balanceAmount;
        aging.DAYS_1_30.bills.push(billData);
      } else if (daysOverdue <= 60) {
        aging.DAYS_31_60.amount += bill.balanceAmount;
        aging.DAYS_31_60.bills.push(billData);
      } else if (daysOverdue <= 90) {
        aging.DAYS_61_90.amount += bill.balanceAmount;
        aging.DAYS_61_90.bills.push(billData);
      } else {
        aging.OVER_90.amount += bill.balanceAmount;
        aging.OVER_90.bills.push(billData);
      }
    });

    // Calculate totals
    const totalOutstanding =
      aging.CURRENT.amount +
      aging.DAYS_1_30.amount +
      aging.DAYS_31_60.amount +
      aging.DAYS_61_90.amount +
      aging.OVER_90.amount;

    return {
      aging,
      summary: {
        totalOutstanding,
        totalBills: bills.length,
        totalSuppliers: new Set(bills.map((b) => b.supplierId)).size,
      },
    };
  }
}
