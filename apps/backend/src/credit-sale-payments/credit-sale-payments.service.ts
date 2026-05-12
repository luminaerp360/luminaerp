import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCreditSalePaymentDto } from './credit-sale-payment.dto';
import { CreateMultipleCreditSalePaymentDto } from './multiple-credit-sale-payment.dto';
import { CreditSalePayment, PaymentMethod, PaymentType, TransactionType } from '@prisma/client';
import { PaymentsService } from 'src/payments-transactions/payments-transactions.service';

@Injectable()
export class CreditSalePaymentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async createPayment(
    organizationId: number,
    dto: CreateCreditSalePaymentDto,
  ): Promise<CreditSalePayment> {
    // First verify the credit sale belongs to the organization
    const creditSale = await this.prisma.creditSale.findFirst({
      where: {
        id: dto.creditSaleId,
        organizationId,
      },
    });

    if (!creditSale) {
      throw new NotFoundException(
        `Credit Sale with ID ${dto.creditSaleId} not found in this organization`,
      );
    }

    // Calculate remaining balance
    const remainingBalance =
      creditSale.credit_amount - (creditSale.amount_paid || 0);

    // Check if payment exceeds remaining balance
    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingBalance.toFixed(2)})`,
      );
    }

    // Check if credit sale is already fully paid
    if (creditSale.fully_paid === 1) {
      throw new BadRequestException(
        `Credit Sale with ID ${dto.creditSaleId} is already fully paid`,
      );
    }

    // Create the payment
    const payment = await this.prisma.creditSalePayment.create({
      data: {
        creditSaleId: dto.creditSaleId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        transactionCode: dto.transactionCode,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update the credit sale's paid amount and fully_paid status
    // Use Math.min to ensure we never exceed the credit_amount
    const totalPaid = Math.min(
      (creditSale.amount_paid || 0) + dto.amount,
      creditSale.credit_amount,
    );

    const fullyPaid = totalPaid >= creditSale.credit_amount ? 1 : 0;

    // Also update the payment method specific fields
    const updateData: any = {
      amount_paid: totalPaid,
      fully_paid: fullyPaid,
      updatedAt: new Date(),
    };

    // Update the payment method specific fields
    if (dto.paymentMethod === 'CASH') {
      updateData.cash_paid = (creditSale.cash_paid || 0) + dto.amount;
    } else if (dto.paymentMethod === 'MPESA') {
      updateData.mpesa_paid = (creditSale.mpesa_paid || 0) + dto.amount;
      updateData.mpesa_confirmation_code = dto.transactionCode;
    } else if (dto.paymentMethod === 'BANK_TRANSFER') {
      updateData.bank_paid = (creditSale.bank_paid || 0) + dto.amount;
      updateData.bank_confirmation_code = dto.transactionCode;
    }

    await this.prisma.creditSale.update({
      where: { id: dto.creditSaleId },
      data: updateData,
    });

    // Update customer's due credit
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: creditSale.customer_id,
        organizationId,
      },
    });

    if (customer) {
      const updatedDueCredit = Math.max(
        (customer.dueCredit || 0) - dto.amount,
        0,
      );
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { dueCredit: updatedDueCredit },
      });
    }

    // Record this payment as a transaction in the payments module
    try {
      await this.paymentsService.createPayment(organizationId, {
        paymentType: PaymentType.INCOME,
        transactionType: TransactionType.CREDIT_SALE,
        amount: dto.amount,
        method: dto.paymentMethod,
        status: 'PAID',
        transactionCode: dto.transactionCode,
        paidBy: creditSale.customer_name || customer?.fullName || 'Customer',
        paidTo: 'Organization',
        description: `Credit sale payment for invoice #${creditSale.id}`,
        remarks: `Payment recorded for credit sale #${creditSale.id}${dto.transactionCode ? ` - Transaction: ${dto.transactionCode}` : ''}`,
        creditSaleId: creditSale.id, // Link the payment to the credit sale
      });
    } catch (error) {
      console.error('Failed to record payment transaction:', error);
      // Don't fail the whole operation if transaction recording fails
    }

    return payment;
  }

  async createMultiplePayments(
    organizationId: number,
    dto: CreateMultipleCreditSalePaymentDto,
  ): Promise<{ payments: CreditSalePayment[]; unpaidAmount: number }> {
    // Verify all credit sales belong to the organization and get their details
    const creditSales = await this.prisma.creditSale.findMany({
      where: {
        id: { in: dto.creditSaleIds },
        organizationId,
      },
    });

    if (creditSales.length !== dto.creditSaleIds.length) {
      const foundIds = creditSales.map((sale) => sale.id);
      const missingIds = dto.creditSaleIds.filter(
        (id) => !foundIds.includes(id),
      );
      throw new NotFoundException(
        `Some Credit Sales not found in this organization: ${missingIds.join(', ')}`,
      );
    }

    // Filter out fully paid credit sales
    const unpaidCreditSales = creditSales.filter(
      (sale) => sale.fully_paid !== 1,
    );

    if (unpaidCreditSales.length === 0) {
      throw new BadRequestException(
        'All selected credit sales are already fully paid',
      );
    }

    // Sort credit sales by date (oldest first) to pay them in order
    unpaidCreditSales.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let remainingPaymentAmount = dto.totalAmount;
    const payments: CreditSalePayment[] = [];

    // Process each credit sale in order
    for (const creditSale of unpaidCreditSales) {
      if (remainingPaymentAmount <= 0) {
        break;
      }

      const remainingCreditSaleBalance =
        creditSale.credit_amount - (creditSale.amount_paid || 0);

      // Skip if this credit sale is fully paid
      if (remainingCreditSaleBalance <= 0) {
        continue;
      }

      // Determine amount to pay for this credit sale
      const amountToPayForThisSale = Math.min(
        remainingPaymentAmount,
        remainingCreditSaleBalance,
      );

      if (amountToPayForThisSale > 0) {
        // Create a payment DTO for this specific credit sale
        const singlePaymentDto: CreateCreditSalePaymentDto = {
          creditSaleId: creditSale.id,
          amount: amountToPayForThisSale,
          paymentMethod: dto.paymentMethod,
          transactionCode: dto.transactionCode,
        };

        // Create the payment for this credit sale
        const payment = await this.createPayment(
          organizationId,
          singlePaymentDto,
        );
        payments.push(payment);

        // Reduce the remaining payment amount
        remainingPaymentAmount -= amountToPayForThisSale;
      }
    }

    return {
      payments,
      unpaidAmount: Math.max(0, remainingPaymentAmount),
    };
  }

  async getPaymentsByCreditSaleId(
    organizationId: number,
    creditSaleId: number,
  ): Promise<CreditSalePayment[]> {
    return this.prisma.creditSalePayment.findMany({
      where: {
        creditSaleId,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentsByMethod(
    organizationId: number,
    method: PaymentMethod,
  ): Promise<CreditSalePayment[]> {
    return this.prisma.creditSalePayment.findMany({
      where: {
        paymentMethod: method,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTotalPaymentsByMethod(
    organizationId: number,
    method: PaymentMethod,
  ): Promise<number> {
    const result = await this.prisma.creditSalePayment.aggregate({
      where: {
        paymentMethod: method,
        organizationId,
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  async getPaymentsByDateRange(
    organizationId: number,
    startDateStr: string,
    endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setHours(0, 0, 0, 0);
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    const payments = await this.prisma.creditSalePayment.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: adjustedStartDate,
          lte: adjustedEndDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPayments = payments.reduce(
      (total, payment) => total + payment.amount,
      0,
    );

    return {
      payments,
      totalPayments,
    };
  }
}
