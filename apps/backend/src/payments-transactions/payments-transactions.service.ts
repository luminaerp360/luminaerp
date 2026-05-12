import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ClientPayment,
  TransactionType,
  PaymentMethod,
  PaymentType,
  Prisma,
} from '@prisma/client';
import {
  CreatePaymentDto,
  PaymentReportQueryDto,
} from './dto/create-payments-transaction.dto';
export interface PaymentFilters {
  startDate?: string;
  endDate?: string;
  paymentType?: PaymentType;
  method?: PaymentMethod;
  transactionType?: TransactionType;
  search?: string;
}

export interface PaymentReport {
  summary: {
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
  };
  payments: any[];
  appliedFilters: PaymentFilters;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(PaymentsService.name);

  async createPayment(
    organizationId: number,
    dto: CreatePaymentDto,
  ): Promise<ClientPayment> {
    return this.prisma.clientPayment.create({
      data: {
        paymentType: dto.paymentType,
        transactionType: dto.transactionType,
        organizationId,
        amount: dto.amount,
        method: dto.method,
        status: dto.status || 'PAID',
        transactionCode: dto.transactionCode,
        remarks: dto.remarks,
        paidBy: dto.paidBy,
        paidTo: dto.paidTo,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
      },
    });
  }

  async getPaymentById(
    organizationId: number,
    id: number,
  ): Promise<ClientPayment> {
    const payment = await this.prisma.clientPayment.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async recordSalePayment(
    organizationId: number,
    orderId: number,
    amount: number,
    method: PaymentMethod,
    paidBy: string,
  ): Promise<ClientPayment> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.createPayment(organizationId, {
      paymentType: PaymentType.INCOME,
      transactionType: TransactionType.SALE,
      amount,
      method,
      paidBy,
      paidTo: order.customer_name || 'Customer',
      description: `Payment for order #${orderId}`,
      orderId,
    });
  }

  async recordCreditSalePayment(
    organizationId: number,
    creditSaleId: number,
    amount: number,
    method: PaymentMethod,
    transactionCode?: string,
  ): Promise<ClientPayment> {
    const creditSale = await this.prisma.creditSale.findFirst({
      where: { id: creditSaleId, organizationId },
    });

    if (!creditSale) {
      throw new NotFoundException(
        `Credit sale with ID ${creditSaleId} not found`,
      );
    }

    // Create the payment record
    const payment = await this.createPayment(organizationId, {
      paymentType: PaymentType.INCOME,
      transactionType: TransactionType.CREDIT_SALE,
      amount,
      method,
      status: 'PAID',
      transactionCode,
      paidBy: creditSale.customer_name,
      paidTo: 'Organization',
      description: `Credit sale payment for #${creditSaleId}`,
      creditSaleId,
    });

    // Update credit sale payment details
    await this.prisma.creditSale.update({
      where: { id: creditSaleId },
      data: {
        amount_paid: {
          increment: amount,
        },
        balance: {
          decrement: amount,
        },
        ...(method === 'MPESA' && {
          mpesa_paid: {
            increment: amount,
          },
          mpesa_confirmation_code: transactionCode,
        }),
        ...(method === 'CASH' && {
          cash_paid: {
            increment: amount,
          },
        }),
        ...(method === 'BANK_TRANSFER' && {
          bank_paid: {
            increment: amount,
          },
          bank_confirmation_code: transactionCode,
        }),
      },
    });

    return payment;
  }

  async generatePaymentReport(organizationId: number, filters: PaymentFilters) {
    this.logger.debug('Generating payment report with filters:', {
      organizationId,
      filters,
    });

    // Define the where clause with proper typing
    const where: Prisma.ClientPaymentWhereInput = {
      organizationId,
    };

    // Add date filters only if NOT searching
    if (!filters.search && (filters.startDate || filters.endDate)) {
      where.createdAt = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Add search if provided
    if (filters.search) {
      const cleanSearch = filters.search.trim().replace(/^#/, '');
      const searchConditions: Prisma.ClientPaymentWhereInput[] = [];

      // Search by ID if numeric
      const searchNumber = parseInt(cleanSearch, 10);
      if (!isNaN(searchNumber)) {
        searchConditions.push({ id: searchNumber });
      }

      // Search by description
      searchConditions.push({
        description: {
          contains: cleanSearch,
          mode: 'insensitive',
        },
      });

      // Search by paidBy
      searchConditions.push({
        paidBy: {
          contains: cleanSearch,
          mode: 'insensitive',
        },
      });

      // Search by paidTo
      searchConditions.push({
        paidTo: {
          contains: cleanSearch,
          mode: 'insensitive',
        },
      });

      // Search by transaction code
      searchConditions.push({
        transactionCode: {
          contains: cleanSearch,
          mode: 'insensitive',
        },
      });

      where.OR = searchConditions;
    }

    // Add enum filters if they are valid
    if (
      filters.paymentType &&
      Object.values(PaymentType).includes(filters.paymentType)
    ) {
      where.paymentType = filters.paymentType;
    }

    if (
      filters.method &&
      Object.values(PaymentMethod).includes(filters.method)
    ) {
      where.method = filters.method;
    }

    if (
      filters.transactionType &&
      Object.values(TransactionType).includes(filters.transactionType)
    ) {
      where.transactionType = filters.transactionType;
    }

    this.logger.debug('Final where clause:', where);

    try {
      // Define select type for consistent field selection
      const select: Prisma.ClientPaymentSelect = {
        id: true,
        amount: true,
        method: true,
        transactionType: true,
        paymentType: true,
        status: true,
        paidBy: true,
        paidTo: true,
        description: true,
        transactionCode: true,
        createdAt: true,
      };

      const [payments, totals] = await Promise.all([
        this.prisma.clientPayment.findMany({
          where,
          select,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.clientPayment.groupBy({
          by: ['paymentType'],
          where,
          _sum: {
            amount: true,
          },
        }),
      ]);

      // Calculate totals with type safety
      const income =
        totals.find((t) => t.paymentType === PaymentType.INCOME)?._sum.amount ??
        0;
      const expense =
        totals.find((t) => t.paymentType === PaymentType.EXPENSE)?._sum
          .amount ?? 0;

      // Define response interface for better type safety

      const response: PaymentReport = {
        summary: {
          totalIncome: income,
          totalExpense: expense,
          netAmount: income - expense,
        },
        payments,
        appliedFilters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          paymentType: filters.paymentType,
          method: filters.method,
          transactionType: filters.transactionType,
        },
      };

      this.logger.debug('Successfully generated report', {
        paymentsCount: payments.length,
        totalIncome: income,
        totalExpense: expense,
      });

      return response;
    } catch (error) {
      this.logger.error('Error generating payment report:', {
        error: error.message,
        where,
      });
      throw error;
    }
  }

  private validateEnum(value: any, enumType: any): any | undefined {
    this.logger.debug('Validating enum value:', {
      value,
      enumType: Object.values(enumType),
      valueType: typeof value,
    });

    if (!value) return undefined;

    // Check if value exists in enum
    if (Object.values(enumType).includes(value)) {
      return value;
    }

    this.logger.warn('Invalid enum value detected:', {
      value,
      validValues: Object.values(enumType),
    });
    return undefined;
  }
}
