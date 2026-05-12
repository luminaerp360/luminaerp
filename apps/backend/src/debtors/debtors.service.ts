import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, InvoiceStatus, Prisma } from '@prisma/client';
import {
  DebtorFilterDto,
  RecordBulkPaymentDto,
  CustomerStatementFilterDto,
  AgingPeriod,
  PaymentHistoryFilterDto,
  RecordCustomerDepositDto,
  ApplyWalletToInvoicesDto,
  WalletTransactionFilterDto,
  RecordBulkPaymentWithWalletDto,
} from './debtors.dto';

@Injectable()
export class DebtorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all debtors with outstanding invoices
   */
  async getAllDebtors(organizationId: number, filters: DebtorFilterDto) {
    const {
      customerId,
      startDate,
      endDate,
      search,
      agingPeriod,
      page = 1,
      limit = 50,
    } = filters;

    const skip = (page - 1) * limit;

    // Build base where clause
    const whereClause: any = {
      organizationId,
      balanceDue: { gt: 0 },
      status: { not: InvoiceStatus.CANCELLED },
    };

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (startDate && endDate) {
      whereClause.issueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (search) {
      const cleanSearch = search.trim().replace(/^#/, '');
      whereClause.OR = [
        {
          invoiceNumber: {
            contains: cleanSearch,
            mode: 'insensitive',
          },
        },
        {
          customerName: {
            contains: cleanSearch,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Filter by aging period
    if (agingPeriod) {
      const today = new Date();
      const agingFilter = this.getAgingFilter(agingPeriod, today);
      whereClause.dueDate = agingFilter;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
              paymentMethod: true,
              paymentMethodName: true,
              transactionCode: true,
            },
            orderBy: {
              paymentDate: 'desc',
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({
        where: whereClause,
      }),
    ]);

    // Calculate aging for each invoice
    const today = new Date();
    const invoicesWithAging = invoices.map((invoice) => ({
      ...invoice,
      daysOverdue: this.calculateDaysOverdue(invoice.dueDate, today),
      agingCategory: this.calculateAgingCategory(invoice.dueDate, today),
    }));

    return {
      invoices: invoicesWithAging,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get aging analysis report
   */
  async getAgingAnalysis(organizationId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        balanceDue: { gt: 0 },
        status: { not: InvoiceStatus.CANCELLED },
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    const today = new Date();

    // Group by customer
    const customerGroups = new Map<number, any>();

    invoices.forEach((invoice) => {
      const customerId = invoice.customerId;
      const daysOverdue = this.calculateDaysOverdue(invoice.dueDate, today);
      const agingCategory = this.calculateAgingCategory(invoice.dueDate, today);

      if (!customerGroups.has(customerId)) {
        customerGroups.set(customerId, {
          customerId,
          customerName: invoice.customerName,
          customerPhone:
            invoice.customer?.phoneNumber || invoice.customerPhone || '',
          customerEmail: invoice.customer?.email || invoice.customerEmail || '',
          invoices: [],
          current: 0,
          days31_60: 0,
          days61_90: 0,
          days91_120: 0,
          over120: 0,
          totalOutstanding: 0,
        });
      }

      const group = customerGroups.get(customerId)!;
      group.invoices.push({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        balanceDue: invoice.balanceDue,
        daysOverdue,
        agingCategory,
      });

      // Add to aging buckets
      switch (agingCategory) {
        case 'CURRENT':
          group.current += invoice.balanceDue;
          break;
        case 'DAYS_31_60':
          group.days31_60 += invoice.balanceDue;
          break;
        case 'DAYS_61_90':
          group.days61_90 += invoice.balanceDue;
          break;
        case 'DAYS_91_120':
          group.days91_120 += invoice.balanceDue;
          break;
        case 'OVER_120':
          group.over120 += invoice.balanceDue;
          break;
      }

      group.totalOutstanding += invoice.balanceDue;
    });

    const customers = Array.from(customerGroups.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding,
    );

    // Calculate totals
    const totals = {
      current: customers.reduce((sum, c) => sum + c.current, 0),
      days31_60: customers.reduce((sum, c) => sum + c.days31_60, 0),
      days61_90: customers.reduce((sum, c) => sum + c.days61_90, 0),
      days91_120: customers.reduce((sum, c) => sum + c.days91_120, 0),
      over120: customers.reduce((sum, c) => sum + c.over120, 0),
      totalOutstanding: customers.reduce(
        (sum, c) => sum + c.totalOutstanding,
        0,
      ),
    };

    return {
      customers,
      totals,
      summary: {
        totalCustomers: customers.length,
        totalInvoices: invoices.length,
        ...totals,
      },
    };
  }

  /**
   * Get customer statement
   */
  async getCustomerStatement(
    organizationId: number,
    customerId: number,
    filters: CustomerStatementFilterDto,
  ) {
    const { startDate, endDate, format = 'detailed' } = filters;

    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.issueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get all invoices for customer
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        customerId,
        ...dateFilter,
      },
      include: {
        items: format === 'detailed',
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
      orderBy: {
        issueDate: 'asc',
      },
    });

    // Calculate totals
    const totals = {
      totalInvoiced: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + inv.balanceDue, 0),
      invoiceCount: invoices.length,
    };

    // Group by status
    const statusBreakdown = {
      paid: invoices.filter((inv) => inv.fullyPaid).length,
      partiallyPaid: invoices.filter(
        (inv) => inv.amountPaid > 0 && !inv.fullyPaid,
      ).length,
      unpaid: invoices.filter((inv) => inv.amountPaid === 0).length,
      overdue: invoices.filter(
        (inv) => new Date(inv.dueDate) < new Date() && !inv.fullyPaid,
      ).length,
    };

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
      },
      period: {
        startDate: startDate || invoices[0]?.issueDate,
        endDate: endDate || new Date(),
      },
      invoices,
      totals,
      statusBreakdown,
    };
  }

  /**
   * Get payment history for a customer
   */
  async getCustomerPaymentHistory(
    organizationId: number,
    customerId: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get all payments for customer's invoices
    const payments = await this.prisma.invoicePayment.findMany({
      where: {
        organizationId,
        invoice: {
          customerId,
        },
        ...dateFilter,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            balanceDue: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
      },
      payments,
      summary: {
        totalPayments: payments.length,
        totalPaid,
      },
    };
  }

  /**
   * Get all customers (with or without debt)
   */
  async getAllCustomers(
    organizationId: number,
    search?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: any = {
      organizationId,
    };

    // Search filter
    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phoneNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count
    const total = await this.prisma.customer.count({ where });

    // Get customers with invoice summary
    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        dueCredit: true,
        walletBalance: true,
        _count: {
          select: {
            invoices: true,
          },
        },
        invoices: {
          select: {
            id: true,
            totalAmount: true,
            amountPaid: true,
            balanceDue: true,
            fullyPaid: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate summary for each customer
    const customersWithSummary = customers.map((customer) => {
      const totalInvoices = customer.invoices.length;
      const totalInvoiced = customer.invoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );
      const totalPaid = customer.invoices.reduce(
        (sum, inv) => sum + inv.amountPaid,
        0,
      );
      const outstandingInvoices = customer.invoices.filter(
        (inv) => !inv.fullyPaid,
      ).length;

      return {
        id: customer.id,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
        dueCredit: customer.dueCredit,
        walletBalance: customer.walletBalance || 0,
        totalInvoices,
        totalInvoiced,
        totalPaid,
        outstandingBalance: customer.dueCredit,
        outstandingInvoices,
        hasOutstandingDebt: customer.dueCredit > 0,
      };
    });

    return {
      customers: customersWithSummary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get all payment history with filters
   */
  async getAllPaymentHistory(
    organizationId: number,
    filters: PaymentHistoryFilterDto,
  ) {
    const {
      customerId,
      invoiceId,
      startDate,
      endDate,
      paymentMethodCode,
      search,
      page = 1,
      limit = 50,
    } = filters;

    // Build where clause
    const where: any = {
      organizationId,
    };

    // Customer filter
    if (customerId) {
      where.invoice = {
        customerId,
      };
    }

    // Invoice filter
    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    // Date range filter
    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.paymentDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.paymentDate = {
        lte: new Date(endDate),
      };
    }

    // Payment method filter
    if (paymentMethodCode) {
      where.paymentMethodCode = paymentMethodCode;
    }

    // Search filter (customer name, invoice number, transaction code)
    if (search) {
      where.OR = [
        {
          invoice: {
            invoiceNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          invoice: {
            customer: {
              fullName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          transactionCode: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.invoicePayment.count({ where });

    // Get payments with pagination
    const payments = await this.prisma.invoicePayment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            balanceDue: true,
            amountPaid: true,
            customer: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        paymentMethodConfig: {
          select: {
            id: true,
            name: true,
            code: true,
            displayName: true,
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
    const allPayments = await this.prisma.invoicePayment.findMany({
      where,
      select: {
        amount: true,
      },
    });

    const totalPaid = allPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );

    // Get unique payment methods used
    const paymentMethods = await this.prisma.invoicePayment.findMany({
      where,
      select: {
        paymentMethodCode: true,
        paymentMethodName: true,
      },
      distinct: ['paymentMethodCode'],
    });

    return {
      payments,
      summary: {
        totalPayments: total,
        totalPaid,
        averagePayment: total > 0 ? totalPaid / total : 0,
        paymentMethods: paymentMethods.map((pm) => ({
          code: pm.paymentMethodCode,
          name: pm.paymentMethodName,
        })),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Record bulk payment for multiple invoices
   */
  async recordBulkPayment(organizationId: number, dto: RecordBulkPaymentDto) {
    const {
      customerId,
      payments,
      paymentMethodId,
      paymentMethodCode,
      paymentMethodName,
      transactionCode,
      paymentDate,
      notes,
      recordedBy,
    } = dto;

    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify all invoices belong to customer
    const invoiceIds = payments.map((p) => p.invoiceId);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        customerId,
        organizationId,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException(
        'Some invoices not found or do not belong to customer',
      );
    }

    // Validate payment amounts
    for (const payment of payments) {
      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
      if (!invoice) {
        throw new BadRequestException(`Invoice ${payment.invoiceId} not found`);
      }

      if (payment.amount > invoice.balanceDue) {
        throw new BadRequestException(
          `Payment amount ${payment.amount} exceeds balance due ${invoice.balanceDue} for invoice ${invoice.invoiceNumber}`,
        );
      }

      if (payment.amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }
    }

    // Process payments in transaction
    return await this.prisma.$transaction(async (tx) => {
      const createdPayments = [];

      for (const payment of payments) {
        const invoice = invoices.find((inv) => inv.id === payment.invoiceId)!;

        // Create payment record
        const invoicePayment = await tx.invoicePayment.create({
          data: {
            invoiceId: payment.invoiceId,
            organizationId,
            paymentMethodId,
            paymentMethod: paymentMethodCode as PaymentMethod,
            paymentMethodCode,
            paymentMethodName,
            amount: payment.amount,
            transactionCode,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            notes: payment.notes || notes,
            recordedBy,
          },
        });

        // Update invoice
        const newAmountPaid = invoice.amountPaid + payment.amount;
        const newBalanceDue = invoice.totalAmount - newAmountPaid;
        const fullyPaid = newBalanceDue <= 0.01; // Account for floating point

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            fullyPaid,
            status: fullyPaid
              ? InvoiceStatus.PAID
              : InvoiceStatus.PARTIALLY_PAID,
            paidAt: fullyPaid ? new Date() : undefined,
          },
        });

        // Update customer due credit
        await tx.customer.update({
          where: { id: customerId },
          data: {
            dueCredit: {
              decrement: payment.amount,
            },
          },
        });

        createdPayments.push({
          ...invoicePayment,
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            newBalanceDue,
            fullyPaid,
          },
        });
      }

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        success: true,
        payments: createdPayments,
        summary: {
          totalAmount,
          invoiceCount: payments.length,
          customer: {
            id: customer.id,
            fullName: customer.fullName,
          },
        },
      };
    });
  }

  /**
   * Get outstanding invoices for a customer
   */
  async getCustomerOutstandingInvoices(
    organizationId: number,
    customerId: number,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        customerId,
        balanceDue: { gt: 0 },
        status: { not: InvoiceStatus.CANCELLED },
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethodName: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const today = new Date();
    const invoicesWithAging = invoices.map((invoice) => ({
      ...invoice,
      daysOverdue: this.calculateDaysOverdue(invoice.dueDate, today),
      agingCategory: this.calculateAgingCategory(invoice.dueDate, today),
    }));

    const totalOutstanding = invoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0,
    );

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
      },
      invoices: invoicesWithAging,
      summary: {
        totalInvoices: invoices.length,
        totalOutstanding,
      },
    };
  }

  /**
   * Helper: Calculate days overdue
   */
  private calculateDaysOverdue(dueDate: Date, today: Date): number {
    const diffTime = today.getTime() - new Date(dueDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Helper: Calculate aging category
   */
  private calculateAgingCategory(dueDate: Date, today: Date): AgingPeriod {
    const daysOverdue = this.calculateDaysOverdue(dueDate, today);

    if (daysOverdue <= 30) return AgingPeriod.CURRENT;
    if (daysOverdue <= 60) return AgingPeriod.DAYS_31_60;
    if (daysOverdue <= 90) return AgingPeriod.DAYS_61_90;
    if (daysOverdue <= 120) return AgingPeriod.DAYS_91_120;
    return AgingPeriod.OVER_120;
  }

  /**
   * Helper: Get aging filter
   */
  private getAgingFilter(agingPeriod: AgingPeriod, today: Date): any {
    const daysAgo = (days: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - days);
      return date;
    };

    switch (agingPeriod) {
      case AgingPeriod.CURRENT:
        return { gte: daysAgo(30) };
      case AgingPeriod.DAYS_31_60:
        return { gte: daysAgo(60), lt: daysAgo(30) };
      case AgingPeriod.DAYS_61_90:
        return { gte: daysAgo(90), lt: daysAgo(60) };
      case AgingPeriod.DAYS_91_120:
        return { gte: daysAgo(120), lt: daysAgo(90) };
      case AgingPeriod.OVER_120:
        return { lt: daysAgo(120) };
      default:
        return {};
    }
  }

  // ============================
  // CUSTOMER WALLET METHODS
  // ============================

  /**
   * Get customer wallet balance and summary
   */
  async getCustomerWallet(organizationId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        walletBalance: true,
        dueCredit: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Get recent wallet transactions
    const recentTransactions =
      await this.prisma.customerWalletTransaction.findMany({
        where: { customerId, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

    // Get wallet summary stats
    const [totalDeposits, totalOverpayments, totalApplied, totalRefunds] =
      await Promise.all([
        this.prisma.customerWalletTransaction.aggregate({
          where: { customerId, organizationId, type: 'DEPOSIT' },
          _sum: { amount: true },
        }),
        this.prisma.customerWalletTransaction.aggregate({
          where: { customerId, organizationId, type: 'OVERPAYMENT' },
          _sum: { amount: true },
        }),
        this.prisma.customerWalletTransaction.aggregate({
          where: { customerId, organizationId, type: 'PAYMENT_APPLIED' },
          _sum: { amount: true },
        }),
        this.prisma.customerWalletTransaction.aggregate({
          where: { customerId, organizationId, type: 'REFUND' },
          _sum: { amount: true },
        }),
      ]);

    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email,
      },
      walletBalance: customer.walletBalance,
      outstandingDebt: customer.dueCredit || 0,
      summary: {
        totalDeposits: totalDeposits._sum.amount || 0,
        totalOverpayments: totalOverpayments._sum.amount || 0,
        totalApplied: totalApplied._sum.amount || 0,
        totalRefunds: totalRefunds._sum.amount || 0,
      },
      recentTransactions,
    };
  }

  /**
   * Get customer wallet transactions with pagination and filters
   */
  async getCustomerWalletTransactions(
    organizationId: number,
    customerId: number,
    filters: WalletTransactionFilterDto,
  ) {
    const { type, startDate, endDate, page = 1, limit = 50 } = filters;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const where: any = { customerId, organizationId };

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.customerWalletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerWalletTransaction.count({ where }),
    ]);

    return {
      transactions,
      walletBalance: customer.walletBalance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Record a customer deposit (money paid in advance, no specific invoice)
   */
  async recordCustomerDeposit(
    organizationId: number,
    dto: RecordCustomerDepositDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      const newBalance = (customer.walletBalance || 0) + dto.amount;

      // Update customer wallet balance
      await tx.customer.update({
        where: { id: dto.customerId },
        data: { walletBalance: newBalance },
      });

      // Record wallet transaction
      const walletTransaction = await tx.customerWalletTransaction.create({
        data: {
          organizationId,
          customerId: dto.customerId,
          type: 'DEPOSIT',
          amount: dto.amount,
          balanceAfter: newBalance,
          referenceType: 'MANUAL_DEPOSIT',
          description: dto.notes
            ? `Customer deposit: ${dto.notes}`
            : `Customer deposit via ${dto.paymentMethodName}`,
          recordedBy: dto.recordedBy,
        },
      });

      return {
        success: true,
        walletTransaction,
        newBalance,
        customer: {
          id: customer.id,
          fullName: customer.fullName,
        },
      };
    });
  }

  /**
   * Apply wallet balance to outstanding invoices
   */
  async applyWalletToInvoices(
    organizationId: number,
    dto: ApplyWalletToInvoicesDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const totalToApply = dto.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalToApply > (customer.walletBalance || 0)) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${customer.walletBalance}, Requested: ${totalToApply}`,
      );
    }

    // Verify all invoices belong to customer and have sufficient balance due
    const invoiceIds = dto.payments.map((p) => p.invoiceId);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        customerId: dto.customerId,
        organizationId,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException(
        'Some invoices not found or do not belong to customer',
      );
    }

    for (const payment of dto.payments) {
      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
      if (payment.amount > invoice.balanceDue) {
        throw new BadRequestException(
          `Payment amount ${payment.amount} exceeds balance due ${invoice.balanceDue} for invoice ${invoice.invoiceNumber}`,
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      let remainingBalance = customer.walletBalance || 0;
      const createdPayments = [];

      for (const payment of dto.payments) {
        const invoice = invoices.find((inv) => inv.id === payment.invoiceId)!;

        // Create invoice payment record (from wallet)
        const invoicePayment = await tx.invoicePayment.create({
          data: {
            invoiceId: payment.invoiceId,
            organizationId,
            amount: payment.amount,
            paymentMethod: 'CASH' as PaymentMethod,
            paymentMethodCode: 'WALLET',
            paymentMethodName: 'Customer Wallet',
            transactionCode: `WALLET-${dto.customerId}-${Date.now()}`,
            paymentDate: new Date(),
            notes: dto.notes || 'Payment from customer wallet balance',
            recordedBy: dto.recordedBy,
          },
        });

        // Update invoice
        const newAmountPaid = invoice.amountPaid + payment.amount;
        const newBalanceDue = invoice.totalAmount - newAmountPaid;
        const fullyPaid = newBalanceDue <= 0.01;

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            fullyPaid,
            status: fullyPaid
              ? InvoiceStatus.PAID
              : InvoiceStatus.PARTIALLY_PAID,
            paidAt: fullyPaid ? new Date() : undefined,
          },
        });

        // Update customer due credit
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            dueCredit: { decrement: payment.amount },
          },
        });

        remainingBalance -= payment.amount;

        // Record wallet transaction for each invoice
        await tx.customerWalletTransaction.create({
          data: {
            organizationId,
            customerId: dto.customerId,
            type: 'PAYMENT_APPLIED',
            amount: payment.amount,
            balanceAfter: remainingBalance,
            referenceType: 'INVOICE',
            referenceId: payment.invoiceId,
            description: `Wallet payment applied to invoice ${invoice.invoiceNumber}`,
            recordedBy: dto.recordedBy,
          },
        });

        createdPayments.push({
          invoicePayment,
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            newBalanceDue,
            fullyPaid,
          },
        });
      }

      // Update customer wallet balance
      await tx.customer.update({
        where: { id: dto.customerId },
        data: { walletBalance: remainingBalance },
      });

      return {
        success: true,
        payments: createdPayments,
        walletBalance: remainingBalance,
        totalApplied: totalToApply,
        summary: {
          invoiceCount: dto.payments.length,
          totalApplied: totalToApply,
          remainingWalletBalance: remainingBalance,
          customer: {
            id: customer.id,
            fullName: customer.fullName,
          },
        },
      };
    });
  }

  /**
   * Record bulk payment with overpayment support
   * If totalAmount > sum of invoice amounts, excess goes to wallet
   */
  async recordBulkPaymentWithWallet(
    organizationId: number,
    dto: RecordBulkPaymentWithWalletDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Calculate total invoice payments
    const totalInvoicePayments = dto.payments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    // Verify invoices
    const invoiceIds = dto.payments.map((p) => p.invoiceId);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        customerId: dto.customerId,
        organizationId,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException(
        'Some invoices not found or do not belong to customer',
      );
    }

    // Validate individual payment amounts don't exceed invoice balance
    for (const payment of dto.payments) {
      const invoice = invoices.find((inv) => inv.id === payment.invoiceId);
      if (!invoice) {
        throw new BadRequestException(`Invoice ${payment.invoiceId} not found`);
      }
      if (payment.amount > invoice.balanceDue) {
        throw new BadRequestException(
          `Payment amount ${payment.amount} exceeds balance due ${invoice.balanceDue} for invoice ${invoice.invoiceNumber}`,
        );
      }
    }

    // Calculate excess (overpayment)
    const excessAmount = dto.totalAmount - totalInvoicePayments;

    // Also calculate wallet contribution if enabled
    let walletContribution = 0;
    if (dto.useWalletBalance && (customer.walletBalance || 0) > 0) {
      walletContribution = Math.min(
        customer.walletBalance || 0,
        totalInvoicePayments,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const createdPayments = [];
      let currentWalletBalance = customer.walletBalance || 0;

      // Process invoice payments
      for (const payment of dto.payments) {
        const invoice = invoices.find((inv) => inv.id === payment.invoiceId)!;

        const invoicePayment = await tx.invoicePayment.create({
          data: {
            invoiceId: payment.invoiceId,
            organizationId,
            paymentMethodId: dto.paymentMethodId,
            paymentMethod: dto.paymentMethodCode as PaymentMethod,
            paymentMethodCode: dto.paymentMethodCode,
            paymentMethodName: dto.paymentMethodName,
            amount: payment.amount,
            transactionCode: dto.transactionCode,
            paymentDate: dto.paymentDate
              ? new Date(dto.paymentDate)
              : new Date(),
            notes: payment.notes || dto.notes,
            recordedBy: dto.recordedBy,
          },
        });

        const newAmountPaid = invoice.amountPaid + payment.amount;
        const newBalanceDue = invoice.totalAmount - newAmountPaid;
        const fullyPaid = newBalanceDue <= 0.01;

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            fullyPaid,
            status: fullyPaid
              ? InvoiceStatus.PAID
              : InvoiceStatus.PARTIALLY_PAID,
            paidAt: fullyPaid ? new Date() : undefined,
          },
        });

        // Update customer due credit
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            dueCredit: { decrement: payment.amount },
          },
        });

        createdPayments.push({
          ...invoicePayment,
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            newBalanceDue,
            fullyPaid,
          },
        });
      }

      // Handle excess/overpayment → add to wallet
      if (excessAmount > 0) {
        currentWalletBalance += excessAmount;

        await tx.customer.update({
          where: { id: dto.customerId },
          data: { walletBalance: currentWalletBalance },
        });

        await tx.customerWalletTransaction.create({
          data: {
            organizationId,
            customerId: dto.customerId,
            type: 'OVERPAYMENT',
            amount: excessAmount,
            balanceAfter: currentWalletBalance,
            referenceType: 'BULK_PAYMENT',
            description: `Overpayment of ${excessAmount} from bulk payment - added to wallet`,
            recordedBy: dto.recordedBy,
          },
        });
      }

      return {
        success: true,
        payments: createdPayments,
        excessAmount,
        walletBalance: currentWalletBalance,
        summary: {
          totalAmount: dto.totalAmount,
          totalAppliedToInvoices: totalInvoicePayments,
          excessToWallet: excessAmount,
          walletBalance: currentWalletBalance,
          invoiceCount: dto.payments.length,
          customer: {
            id: customer.id,
            fullName: customer.fullName,
          },
        },
      };
    });
  }
}
