import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CommissionCalculationResult,
  CommissionType,
  UserProductCommissionDto,
  MarkCommissionPaidDto,
  PayCommissionsDto,
  BulkPayCommissionsDto,
} from './commission.dto';

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate commission for a single product sale
   */
  async calculateCommission(
    organizationId: number,
    userId: number,
    productId: number,
    quantity: number,
    unitPrice: number,
  ): Promise<CommissionCalculationResult | null> {
    console.log(`💰 [COMMISSION CALC] Starting for:`, {
      organizationId,
      userId,
      productId,
      quantity,
      unitPrice,
    });

    // 1. Check for user-specific commission rate
    const userCommission = await this.prisma.userProductCommission.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (userCommission) {
      console.log(
        `✅ [COMMISSION CALC] User-specific rate found:`,
        {
          userId,
          productId,
          type: userCommission.commissionType,
          value: userCommission.commissionValue,
        },
      );

      const result = this.computeCommission(
        productId,
        '',
        quantity,
        unitPrice,
        userCommission.commissionType,
        userCommission.commissionValue,
      );

      console.log(`💵 [COMMISSION CALC] Calculated:`, result);
      return result;
    }

    // 2. Fall back to product default commission
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        defaultCommissionType: true,
        defaultCommissionValue: true,
        isCommissionable: true,
      },
    });

    if (!product) {
      console.log(`❌ [COMMISSION CALC] Product ${productId} not found`);
      return null;
    }

    if (!product.isCommissionable) {
      console.log(
        `⚠️ [COMMISSION CALC] Product ${productId} (${product.name}) is not commissionable`,
      );
      return null;
    }

    console.log(
      `✅ [COMMISSION CALC] Using product default:`,
      {
        productId,
        name: product.name,
        type: product.defaultCommissionType,
        value: product.defaultCommissionValue,
      },
    );

    const result = this.computeCommission(
      productId,
      product.name,
      quantity,
      unitPrice,
      product.defaultCommissionType || CommissionType.PERCENTAGE,
      product.defaultCommissionValue || 0,
    );

    console.log(`💵 [COMMISSION CALC] Calculated:`, result);
    return result;
  }

  /**
   * Compute commission amount
   */
  private computeCommission(
    productId: number,
    productName: string,
    quantity: number,
    unitPrice: number,
    commissionType: string,
    commissionValue: number,
  ): CommissionCalculationResult {
    const saleAmount = quantity * unitPrice;
    let commissionAmount = 0;

    if (commissionType === CommissionType.PERCENTAGE) {
      commissionAmount = (saleAmount * commissionValue) / 100;
    } else if (commissionType === CommissionType.FIXED) {
      commissionAmount = commissionValue * quantity;
    }

    return {
      productId,
      productName,
      quantity,
      saleAmount,
      commissionType,
      commissionRate: commissionValue,
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    };
  }

  /**
   * Create commission records for an order (cash sale)
   */
  async createOrderCommissions(
    organizationId: number,
    orderId: number,
    userId: number,
    items: any[], // Order items from JSON
    commissionOverrides?: Array<{
      productId: number;
      enabled: boolean;
      commissionType?: string;
      commissionRate?: number;
      commissionAmount?: number;
    }>,
  ) {
    console.log(`🎯 [CREATE ORDER COMMISSIONS] Starting:`, {
      organizationId,
      orderId,
      userId,
      itemsCount: items?.length,
      hasOverrides: !!commissionOverrides,
      overridesCount: commissionOverrides?.length || 0,
    });

    if (commissionOverrides && commissionOverrides.length > 0) {
      console.log(`🎨 [CREATE ORDER COMMISSIONS] Commission overrides:`, {
        overrides: commissionOverrides.map((o) => ({
          productId: o.productId,
          enabled: o.enabled,
          type: o.commissionType,
          rate: o.commissionRate,
        })),
      });
    }

    const commissions = [];

    for (const item of items) {
      const productId = item.id || item.productId;
      const quantity = item.selectedItems || item.quantity || 0;
      const unitPrice = item.price || item.unitPrice || 0;

      console.log(`🔍 [CREATE ORDER COMMISSIONS] Processing item:`, {
        productId,
        quantity,
        unitPrice,
        itemData: item,
      });

      if (!productId || quantity <= 0) {
        console.log(
          `⚠️ [CREATE ORDER COMMISSIONS] Skipping item - invalid productId or quantity`,
        );
        continue;
      }

      // Check if there's an override for this product
      const override = commissionOverrides?.find(
        (o) => o.productId === productId,
      );

      let commission: CommissionCalculationResult | null = null;

      if (override) {
        console.log(`🎨 [CREATE ORDER COMMISSIONS] Override found:`, {
          productId,
          enabled: override.enabled,
          type: override.commissionType,
          rate: override.commissionRate,
          amount: override.commissionAmount,
        });

        if (override.enabled && override.commissionType && override.commissionRate !== undefined) {
          // Use override values to compute commission
          const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { name: true },
          });

          commission = this.computeCommission(
            productId,
            item.name || item.productName || product?.name || '',
            quantity,
            unitPrice,
            override.commissionType,
            override.commissionRate,
          );

          console.log(
            `✅ [CREATE ORDER COMMISSIONS] Using override commission:`,
            {
              productId,
              type: override.commissionType,
              rate: override.commissionRate,
              calculatedAmount: commission.commissionAmount,
            },
          );
        } else if (!override.enabled) {
          console.log(
            `⚠️ [CREATE ORDER COMMISSIONS] Commission disabled by override for product ${productId}`,
          );
          continue; // Skip this item - commission explicitly disabled
        }
      } else {
        // No override - use standard calculation
        console.log(
          `📊 [CREATE ORDER COMMISSIONS] No override, using standard calculation`,
        );
        commission = await this.calculateCommission(
          organizationId,
          userId,
          productId,
          quantity,
          unitPrice,
        );
      }

      if (commission && commission.commissionAmount > 0) {
        console.log(
          `✅ [CREATE ORDER COMMISSIONS] Creating commission record:`,
          {
            productId: commission.productId,
            productName: commission.productName,
            amount: commission.commissionAmount,
            source: override ? 'OVERRIDE' : 'CALCULATED',
          },
        );

        const record = await this.prisma.commissionRecord.create({
          data: {
            organizationId,
            userId,
            sourceType: 'ORDER',
            sourceId: orderId,
            orderId,
            productId,
            productName:
              item.name || item.productName || commission.productName || '',
            quantitySold: quantity,
            unitPrice,
            totalSaleAmount: commission.saleAmount,
            commissionType: commission.commissionType,
            commissionRate: commission.commissionRate,
            commissionAmount: commission.commissionAmount,
            status: 'PENDING',
          },
        });

        console.log(`💾 [CREATE ORDER COMMISSIONS] Record saved:`, {
          id: record.id,
          commissionAmount: record.commissionAmount,
        });

        commissions.push(record);
      } else {
        console.log(
          `⚠️ [CREATE ORDER COMMISSIONS] No commission for product ${productId}`,
        );
      }
    }

    console.log(`🎉 [CREATE ORDER COMMISSIONS] Summary:`, {
      orderId,
      userId,
      totalItems: items.length,
      commissionsCreated: commissions.length,
      totalCommissionAmount: commissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0,
      ),
      records: commissions.map((c) => ({
        id: c.id,
        product: c.productName,
        amount: c.commissionAmount,
      })),
    });

    return commissions;
  }

  /**
   * Create commission records for an invoice (credit sale)
   */
  async createInvoiceCommissions(
    organizationId: number,
    invoiceId: number,
    userId: number,
    items: any[], // InvoiceItem[]
    commissionOverrides?: Array<{
      productId: number;
      enabled: boolean;
      commissionType?: string;
      commissionRate?: number;
      commissionAmount?: number;
    }>,
  ) {
    console.log(`🧾 [CREATE INVOICE COMMISSIONS] Starting for invoice ${invoiceId}:`, {
      organizationId,
      userId,
      itemsCount: items.length,
      hasOverrides: !!commissionOverrides,
      overrides: commissionOverrides,
    });

    const commissions = [];

    for (const item of items) {
      const productId = item.productId;

      if (!productId || item.quantity <= 0) {
        console.log(
          `⚠️ [CREATE INVOICE COMMISSIONS] Skipping item - no productId or invalid quantity`,
        );
        continue;
      }

      // Check for override for this product
      const override = commissionOverrides?.find(
        (o) => o.productId === productId,
      );

      console.log(`🔍 [CREATE INVOICE COMMISSIONS] Processing product ${productId}:`, {
        hasOverride: !!override,
        override: override || null,
      });

      // If override exists and commission is disabled, skip
      if (override && !override.enabled) {
        console.log(
          `🚫 [CREATE INVOICE COMMISSIONS] Commission disabled by override for product ${productId}`,
        );
        continue;
      }

      let commission: CommissionCalculationResult | null = null;

      // If override exists with custom values, use them
      if (
        override &&
        override.enabled &&
        override.commissionType &&
        (override.commissionRate !== undefined || override.commissionAmount !== undefined)
      ) {
        console.log(
          `✏️ [CREATE INVOICE COMMISSIONS] Using override values for product ${productId}:`,
          override,
        );

        commission = this.computeCommission(
          productId,
          item.productName || '',
          item.quantity,
          item.unitPrice,
          override.commissionType as CommissionType,
          override.commissionRate || override.commissionAmount || 0,
        );
      } else {
        // Otherwise, calculate normally
        console.log(
          `🔢 [CREATE INVOICE COMMISSIONS] Calculating normal commission for product ${productId}`,
        );

        commission = await this.calculateCommission(
          organizationId,
          userId,
          productId,
          item.quantity,
          item.unitPrice,
        );
      }

      if (commission && commission.commissionAmount > 0) {
        console.log(
          `💰 [CREATE INVOICE COMMISSIONS] Creating commission record for product ${productId}:`,
          {
            amount: commission.commissionAmount,
            type: commission.commissionType,
            rate: commission.commissionRate,
          },
        );

        const record = await this.prisma.commissionRecord.create({
          data: {
            organizationId,
            userId,
            sourceType: 'INVOICE',
            sourceId: invoiceId,
            invoiceId,
            productId: item.productId,
            productName: item.productName || commission.productName || '',
            quantitySold: item.quantity,
            unitPrice: item.unitPrice,
            totalSaleAmount: commission.saleAmount,
            commissionType: commission.commissionType,
            commissionRate: commission.commissionRate,
            commissionAmount: commission.commissionAmount,
            status: 'PENDING',
          },
        });

        commissions.push(record);
      } else {
        console.log(
          `⚠️ [CREATE INVOICE COMMISSIONS] No commission for product ${productId}`,
        );
      }
    }

    console.log(`🎉 [CREATE INVOICE COMMISSIONS] Summary:`, {
      invoiceId,
      userId,
      totalItems: items.length,
      commissionsCreated: commissions.length,
      totalCommissionAmount: commissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0,
      ),
      records: commissions.map((c) => ({
        id: c.id,
        product: c.productName,
        amount: c.commissionAmount,
      })),
    });

    return commissions;
  }

  /**
   * Get user commission summary
   */
  async getUserCommissionSummary(
    organizationId: number,
    userId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {
      organizationId,
      userId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [pending, paid, total] = await Promise.all([
      this.prisma.commissionRecord.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where,
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      totalCommissions: total._sum.commissionAmount || 0,
      pendingCommissions: pending._sum.commissionAmount || 0,
      paidCommissions: paid._sum.commissionAmount || 0,
    };
  }

  /**
   * Get commission records for a user
   */
  async getUserCommissionRecords(
    organizationId: number,
    userId: number,
    status?: string,
  ) {
    const where: any = {
      organizationId,
      userId,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.commissionRecord.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            receiptNumber: true,
            createdAt: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Set user-specific commission rate
   */
  async setUserProductCommission(
    organizationId: number,
    dto: UserProductCommissionDto,
    createdBy: string,
  ) {
    return this.prisma.userProductCommission.upsert({
      where: {
        userId_productId: {
          userId: dto.userId,
          productId: dto.productId,
        },
      },
      create: {
        organizationId,
        userId: dto.userId,
        productId: dto.productId,
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
        createdBy,
      },
      update: {
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
      },
    });
  }

  /**
   * Get all user-specific commission rates
   */
  async getUserProductCommissions(organizationId: number, userId: number) {
    return this.prisma.userProductCommission.findMany({
      where: { organizationId, userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            defaultCommissionType: true,
            defaultCommissionValue: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Delete user-specific commission rate
   */
  async deleteUserProductCommission(userId: number, productId: number) {
    return this.prisma.userProductCommission.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  }

  /**
   * Mark commissions as paid
   */
  async markCommissionsAsPaid(
    organizationId: number,
    dto: MarkCommissionPaidDto,
    paidBy: string,
  ) {
    // Update commission records
    const updateResult = await this.prisma.commissionRecord.updateMany({
      where: {
        id: { in: dto.commissionIds },
        organizationId,
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidBy,
        paymentReference: dto.paymentReference,
        notes: dto.notes,
      },
    });

    // Get updated records for payment batch
    const records = await this.prisma.commissionRecord.findMany({
      where: {
        id: { in: dto.commissionIds },
        organizationId,
      },
    });

    if (records.length === 0) {
      return { success: false, message: 'No valid commission records found' };
    }

    const userId = records[0].userId;
    const totalAmount = records.reduce((sum, r) => sum + r.commissionAmount, 0);

    // Generate batch number
    const year = new Date().getFullYear();
    const count = await this.prisma.commissionPayment.count({
      where: { organizationId },
    });
    const batchNumber = `COMM-${year}-${String(count + 1).padStart(5, '0')}`;

    // Create payment batch record
    const payment = await this.prisma.commissionPayment.create({
      data: {
        organizationId,
        batchNumber,
        userId,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        paymentDate: new Date(),
        commissionIds: dto.commissionIds,
        paidBy,
        notes: dto.notes,
      },
    });

    return {
      success: true,
      payment,
      recordsUpdated: updateResult.count,
    };
  }

  /**
   * Get all commission payments for an organization
   */
  async getCommissionPayments(organizationId: number) {
    return this.prisma.commissionPayment.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get commission statistics for organization
   */
  async getOrganizationCommissionStats(organizationId: number) {
    const [totalEarned, totalPending, totalPaid, recordCount] =
      await Promise.all([
        this.prisma.commissionRecord.aggregate({
          where: { organizationId },
          _sum: { commissionAmount: true },
        }),
        this.prisma.commissionRecord.aggregate({
          where: { organizationId, status: 'PENDING' },
          _sum: { commissionAmount: true },
        }),
        this.prisma.commissionRecord.aggregate({
          where: { organizationId, status: 'PAID' },
          _sum: { commissionAmount: true },
        }),
        this.prisma.commissionRecord.count({
          where: { organizationId },
        }),
      ]);

    return {
      totalCommissionsEarned: totalEarned._sum.commissionAmount || 0,
      pendingCommissions: totalPending._sum.commissionAmount || 0,
      paidCommissions: totalPaid._sum.commissionAmount || 0,
      totalRecords: recordCount,
    };
  }

  /**
   * Get commission report grouped by user for a date range
   * Returns summary per user with totals, and optionally detailed records
   */
  async getCommissionReport(
    organizationId: number,
    startDate?: Date,
    endDate?: Date,
    status?: string,
  ) {
    const where: any = { organizationId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (status) {
      where.status = status;
    }

    // Get all records in the date range with user info
    const records = await this.prisma.commissionRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            receiptNumber: true,
            createdAt: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by user
    const userMap = new Map<
      number,
      {
        userId: number;
        fullName: string;
        email: string;
        totalCommission: number;
        pendingCommission: number;
        paidCommission: number;
        cancelledCommission: number;
        totalSaleAmount: number;
        recordCount: number;
        records: typeof records;
      }
    >();

    for (const record of records) {
      const userId = record.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          fullName: (record as any).user?.fullName || 'Unknown',
          email: (record as any).user?.email || '',
          totalCommission: 0,
          pendingCommission: 0,
          paidCommission: 0,
          cancelledCommission: 0,
          totalSaleAmount: 0,
          recordCount: 0,
          records: [],
        });
      }

      const userEntry = userMap.get(userId)!;
      userEntry.totalCommission += record.commissionAmount;
      userEntry.totalSaleAmount += record.totalSaleAmount;
      userEntry.recordCount += 1;
      userEntry.records.push(record);

      if (record.status === 'PENDING') {
        userEntry.pendingCommission += record.commissionAmount;
      } else if (record.status === 'PAID') {
        userEntry.paidCommission += record.commissionAmount;
      } else if (record.status === 'CANCELLED') {
        userEntry.cancelledCommission += record.commissionAmount;
      }
    }

    const userSummaries = Array.from(userMap.values())
      .map((u) => ({
        ...u,
        totalCommission: parseFloat(u.totalCommission.toFixed(2)),
        pendingCommission: parseFloat(u.pendingCommission.toFixed(2)),
        paidCommission: parseFloat(u.paidCommission.toFixed(2)),
        cancelledCommission: parseFloat(u.cancelledCommission.toFixed(2)),
        totalSaleAmount: parseFloat(u.totalSaleAmount.toFixed(2)),
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission);

    // Overall totals
    const grandTotal = userSummaries.reduce(
      (sum, u) => sum + u.totalCommission,
      0,
    );
    const grandPending = userSummaries.reduce(
      (sum, u) => sum + u.pendingCommission,
      0,
    );
    const grandPaid = userSummaries.reduce(
      (sum, u) => sum + u.paidCommission,
      0,
    );
    const grandSaleAmount = userSummaries.reduce(
      (sum, u) => sum + u.totalSaleAmount,
      0,
    );

    return {
      userSummaries,
      totals: {
        grandTotalCommission: parseFloat(grandTotal.toFixed(2)),
        grandPendingCommission: parseFloat(grandPending.toFixed(2)),
        grandPaidCommission: parseFloat(grandPaid.toFixed(2)),
        grandTotalSaleAmount: parseFloat(grandSaleAmount.toFixed(2)),
        totalRecords: records.length,
        totalUsers: userSummaries.length,
      },
    };
  }

  /**
   * Calculate commission preview for multiple items (before creating order)
   * Returns commission details for each item to show in POS
   */
  async calculateCommissionPreview(
    organizationId: number,
    userId: number,
    items: Array<{ productId: number; quantity: number; unitPrice: number }>,
  ) {
    const commissions = await Promise.all(
      items.map(async (item) => {
        const commission = await this.calculateCommission(
          organizationId,
          userId,
          item.productId,
          item.quantity,
          item.unitPrice,
        );

        return commission
          ? {
              ...commission,
              hasCommission: true,
              canEdit: true, // Allow editing at POS
            }
          : {
              productId: item.productId,
              productName: '',
              quantity: item.quantity,
              saleAmount: item.quantity * item.unitPrice,
              commissionType: 'NONE',
              commissionRate: 0,
              commissionAmount: 0,
              hasCommission: false,
              canEdit: true,
            };
      }),
    );

    const totalCommission = commissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0,
    );

    return {
      items: commissions,
      totalCommission: parseFloat(totalCommission.toFixed(2)),
    };
  }

  /**
   * Pay commissions with multiple payment methods
   */
  async payCommissions(
    organizationId: number,
    dto: PayCommissionsDto,
    paidBy: string,
  ) {
    // Validate payment methods total matches commission total
    const records = await this.prisma.commissionRecord.findMany({
      where: {
        id: { in: dto.commissionIds },
        organizationId,
        status: 'PENDING',
      },
    });

    if (records.length === 0) {
      throw new BadRequestException('No valid pending commission records found');
    }

    const totalCommissionAmount = records.reduce(
      (sum, r) => sum + r.commissionAmount,
      0,
    );
    const totalPaymentAmount = dto.paymentMethods.reduce(
      (sum, pm) => sum + pm.amount,
      0,
    );

    if (Math.abs(totalCommissionAmount - totalPaymentAmount) > 0.01) {
      throw new BadRequestException(
        `Payment amount (${totalPaymentAmount}) does not match commission total (${totalCommissionAmount})`,
      );
    }

    const userId = records[0].userId;

    // Generate batch number
    const year = new Date().getFullYear();
    const count = await this.prisma.commissionPayment.count({
      where: { organizationId },
    });
    const batchNumber = `COMM-${year}-${String(count + 1).padStart(5, '0')}`;

    // Create payment in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Update commission records
      await tx.commissionRecord.updateMany({
        where: {
          id: { in: dto.commissionIds },
          organizationId,
          status: 'PENDING',
        },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidBy,
          paymentReference: batchNumber,
          notes: dto.notes,
        },
      });

      // Determine payment method summary
      const paymentMethod =
        dto.paymentMethods.length === 1
          ? dto.paymentMethods[0].paymentMethodCode
          : 'MULTIPLE';

      // Create payment batch record
      const payment = await tx.commissionPayment.create({
        data: {
          organizationId,
          batchNumber,
          userId,
          totalAmount: totalCommissionAmount,
          paymentMethod,
          paymentDate: new Date(),
          commissionIds: dto.commissionIds,
          paidBy,
          notes: dto.notes,
          paymentType: 'MANUAL',
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Create payment breakdown records
      const breakdownRecords = await Promise.all(
        dto.paymentMethods.map((pm) =>
          tx.commissionPaymentBreakdown.create({
            data: {
              commissionPaymentId: payment.id,
              paymentMethodId: pm.paymentMethodId,
              paymentMethodCode: pm.paymentMethodCode,
              paymentMethodName: pm.paymentMethodName,
              amount: pm.amount,
              transactionCode: pm.transactionCode,
              notes: pm.notes,
            },
          }),
        ),
      );

      return {
        success: true,
        payment: {
          ...payment,
          paymentBreakdown: breakdownRecords,
        },
        recordsUpdated: records.length,
        totalAmount: totalCommissionAmount,
      };
    });
  }

  /**
   * Bulk pay commissions for a user (all unpaid or by period)
   */
  async bulkPayCommissions(
    organizationId: number,
    dto: BulkPayCommissionsDto,
    paidBy: string,
  ) {
    // Build where clause based on payment type
    const where: any = {
      organizationId,
      userId: dto.userId,
      status: 'PENDING',
    };

    if (dto.paymentType === 'PERIOD') {
      if (!dto.startDate || !dto.endDate) {
        throw new BadRequestException(
          'Start date and end date required for period-based payments',
        );
      }
      where.createdAt = {
        gte: new Date(dto.startDate),
        lte: new Date(dto.endDate),
      };
    }
    // For 'ALL_UNPAID', no additional filters needed

    // Get commission records
    const records = await this.prisma.commissionRecord.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    if (records.length === 0) {
      throw new BadRequestException('No pending commission records found');
    }

    const commissionIds = records.map((r) => r.id);
    const totalCommissionAmount = records.reduce(
      (sum, r) => sum + r.commissionAmount,
      0,
    );
    const totalPaymentAmount = dto.paymentMethods.reduce(
      (sum, pm) => sum + pm.amount,
      0,
    );

    if (Math.abs(totalCommissionAmount - totalPaymentAmount) > 0.01) {
      throw new BadRequestException(
        `Payment amount (${totalPaymentAmount}) does not match commission total (${totalCommissionAmount})`,
      );
    }

    // Generate batch number
    const year = new Date().getFullYear();
    const count = await this.prisma.commissionPayment.count({
      where: { organizationId },
    });
    const batchNumber = `COMM-${year}-${String(count + 1).padStart(5, '0')}`;

    // Create payment in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Update commission records
      await tx.commissionRecord.updateMany({
        where: {
          id: { in: commissionIds },
          organizationId,
          status: 'PENDING',
        },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidBy,
          paymentReference: batchNumber,
          notes: dto.notes,
        },
      });

      // Determine payment method summary
      const paymentMethod =
        dto.paymentMethods.length === 1
          ? dto.paymentMethods[0].paymentMethodCode
          : 'MULTIPLE';

      // Create payment batch record
      const payment = await tx.commissionPayment.create({
        data: {
          organizationId,
          batchNumber,
          userId: dto.userId,
          totalAmount: totalCommissionAmount,
          paymentMethod,
          paymentDate: new Date(),
          commissionIds,
          paidBy,
          notes: dto.notes,
          paymentType:
            dto.paymentType === 'PERIOD' ? 'BULK_PERIOD' : 'BULK_ALL_UNPAID',
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Create payment breakdown records
      const breakdownRecords = await Promise.all(
        dto.paymentMethods.map((pm) =>
          tx.commissionPaymentBreakdown.create({
            data: {
              commissionPaymentId: payment.id,
              paymentMethodId: pm.paymentMethodId,
              paymentMethodCode: pm.paymentMethodCode,
              paymentMethodName: pm.paymentMethodName,
              amount: pm.amount,
              transactionCode: pm.transactionCode,
              notes: pm.notes,
            },
          }),
        ),
      );

      return {
        success: true,
        payment: {
          ...payment,
          paymentBreakdown: breakdownRecords,
        },
        recordsUpdated: records.length,
        totalAmount: totalCommissionAmount,
        commissionIds,
      };
    });
  }

  /**
   * Get unpaid commission summary for a user
   */
  async getUnpaidCommissionSummary(organizationId: number, userId: number) {
    const records = await this.prisma.commissionRecord.findMany({
      where: {
        organizationId,
        userId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalAmount = records.reduce((sum, r) => sum + r.commissionAmount, 0);
    const oldestDate = records.length > 0 ? records[0].createdAt : null;
    const newestDate =
      records.length > 0 ? records[records.length - 1].createdAt : null;

    return {
      userId,
      recordCount: records.length,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      oldestCommissionDate: oldestDate,
      newestCommissionDate: newestDate,
      records,
    };
  }

  /**
   * Get commission payment history with breakdown
   */
  async getCommissionPaymentHistory(
    organizationId: number,
    userId?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { organizationId };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    return this.prisma.commissionPayment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        paymentBreakdown: true,
      },
      orderBy: { paymentDate: 'desc' },
    });
  }
}
