import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { CommissionService } from '../commission/commission.service';
import { PaymentsService } from '../payments-transactions/payments-transactions.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  InvoiceFilterDto,
  FinalizeInvoiceDto,
  MarkAsSentDto,
  SendReminderDto,
} from './invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly commissionService: CommissionService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Create a modern invoice
   */
  async createInvoice(organizationId: number, dto: CreateInvoiceDto) {
    const startTime = Date.now();

    try {
      // Generate invoice number
      const invoiceNumber =
        await this.invoiceNumberService.generateInvoiceNumber(organizationId);

      // Get customer details
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          organizationId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Calculate due date based on payment terms
      const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
      const paymentTermsDays = dto.paymentTermsDays || 30;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTermsDays);

      // Calculate financial totals
      let subtotal = 0;
      let totalTaxAmount = 0;
      let totalDiscountAmount = dto.discountAmount || 0;

      const itemsWithCalculations = dto.items.map((item, index) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTaxRate = item.taxRate || dto.taxRate || 0;
        const itemTaxAmount = (itemSubtotal * itemTaxRate) / 100;
        const itemDiscountAmount = item.discountAmount || 0;
        const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;

        subtotal += itemSubtotal;
        totalTaxAmount += itemTaxAmount;

        return {
          productId: item.productId,
          productName: item.productName,
          description: item.description,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
          taxRate: itemTaxRate,
          taxAmount: itemTaxAmount,
          discountPercentage: item.discountPercentage || 0,
          discountAmount: itemDiscountAmount,
          totalAmount: itemTotal,
          sortOrder: item.sortOrder || index,
        };
      });

      const totalAmount = subtotal + totalTaxAmount - totalDiscountAmount;

      // Generate public token for sharing
      const publicToken = this.invoiceNumberService.generatePublicToken();

      // QR code data will be generated later when QR package is installed
      const qrCodeData = null;

      // Create invoice in transaction
      const invoice = await this.prisma.$transaction(async (tx) => {
        // Create invoice
        const createdInvoice = await tx.invoice.create({
          data: {
            organizationId,
            invoiceNumber,
            invoiceType: dto.invoiceType || 'CREDIT_SALE',
            referenceNumber: dto.referenceNumber,
            customerId: dto.customerId,
            customerName: customer.fullName,
            customerPhone: customer.phoneNumber,
            customerEmail: customer.email || dto.customerAddress,
            customerAddress: dto.customerAddress,
            customerTaxId: dto.customerTaxId,
            issueDate,
            dueDate,
            orderDate: dto.orderDate ? new Date(dto.orderDate) : null,
            subtotal,
            taxAmount: totalTaxAmount,
            discountAmount: totalDiscountAmount,
            totalAmount,
            amountPaid: 0,
            balanceDue: totalAmount,
            paymentTerms: dto.paymentTerms || 'Net 30',
            paymentTermsDays,
            lateFeePercentage: dto.lateFeePercentage || 0,
            lateFeeAmount: 0,
            status: dto.status || 'DRAFT',
            fullyPaid: false,
            taxRate: dto.taxRate || 0,
            taxType: dto.taxType,
            organizationTaxId: dto.organizationTaxId,
            notes: dto.notes,
            termsAndConditions: dto.termsAndConditions,
            footerText: dto.footerText,
            createdBy: dto.createdBy,
            shiftId: dto.shiftId,
            orderId: dto.orderId,
            salesPersonId: dto.salesPersonId || parseInt(dto.createdBy),
            publicToken,
            qrCodeData,
          },
          include: {
            customer: true,
          },
        });

        // Create invoice items
        await tx.invoiceItem.createMany({
          data: itemsWithCalculations.map((item) => ({
            invoiceId: createdInvoice.id,
            ...item,
          })),
        });

        // If this is a credit sale, update customer due credit
        if (dto.invoiceType === 'CREDIT_SALE') {
          await tx.customer.update({
            where: { id: dto.customerId },
            data: {
              dueCredit: (customer.dueCredit || 0) + totalAmount,
            },
          });
        }

        return createdInvoice;
      });

      // Get invoice items for commission calculation
      const invoiceItems = await this.prisma.invoiceItem.findMany({
        where: { invoiceId: invoice.id },
      });

      // Create commission records (fire and forget)
      const commissionUserId = dto.salesPersonId || parseInt(dto.createdBy);
      if (commissionUserId) {
        this.createCommissionRecords(
          organizationId,
          invoice.id,
          commissionUserId,
          invoiceItems,
          dto.commissionOverrides,
        );
      }

      console.log(
        `Invoice ${invoice.invoiceNumber} created in ${Date.now() - startTime}ms`,
      );

      // Send email if requested (fire and forget)
      if (dto.sendEmail) {
        this.sendInvoiceEmail(organizationId, invoice.id).catch((error) => {
          console.error('Failed to send invoice email:', error);
        });
      }

      return invoice;
    } catch (error) {
      console.error(
        `Invoice creation failed in ${Date.now() - startTime}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create commission records for an invoice (fire and forget)
   */
  private async createCommissionRecords(
    organizationId: number,
    invoiceId: number,
    userId: number,
    items: any[],
    commissionOverrides?: Array<{
      productId: number;
      enabled: boolean;
      commissionType?: string;
      commissionRate?: number;
      commissionAmount?: number;
    }>,
  ) {
    try {
      console.log('🧾 [INVOICE COMMISSION] Creating commission records:', {
        organizationId,
        invoiceId,
        userId,
        itemsCount: items.length,
        hasOverrides: !!commissionOverrides,
        overridesCount: commissionOverrides?.length || 0,
      });

      await this.commissionService.createInvoiceCommissions(
        organizationId,
        invoiceId,
        userId,
        items,
        commissionOverrides,
      );
      console.log(`✅ Commission records created for invoice ${invoiceId}`);
    } catch (error) {
      console.error('❌ Failed to create commission records:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get invoice by ID with full details
   */
  async getInvoiceById(organizationId: number, invoiceId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        customer: true,
        items: {
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
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Get invoice by public token (for public sharing)
   */
  async getInvoiceByPublicToken(publicToken: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        publicToken,
      },
      include: {
        organization: {
          select: {
            name: true,
            address: true,
            contact: true,
            logoUrl: true,
            mpesaDetails: true,
            bankDetails: true,
          },
        },
        customer: true,
        items: {
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
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Track view
    if (!invoice.viewedAt) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          viewedAt: new Date(),
          status:
            invoice.status === 'SENT' || invoice.status === 'DRAFT'
              ? 'VIEWED'
              : invoice.status,
        },
      });
    }

    return invoice;
  }

  /**
   * Get all invoices with filters and pagination
   */
  async getAllInvoices(organizationId: number, filters: InvoiceFilterDto) {
    const {
      customerId,
      status,
      startDate,
      endDate,
      search,
      invoiceNumber,
      customerName,
      page = 1,
      limit = 50,
    } = filters;

    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId,
    };

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.issueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // General search - searches both invoice number and customer name
    if (search) {
      whereClause.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          customerName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Specific invoice number filter
    if (invoiceNumber) {
      whereClause.invoiceNumber = {
        contains: invoiceNumber,
        mode: 'insensitive',
      };
    }

    // Specific customer name filter
    if (customerName) {
      whereClause.customerName = {
        contains: customerName,
        mode: 'insensitive',
      };
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
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({
        where: whereClause,
      }),
    ]);

    return {
      invoices,
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
   * Update invoice
   */
  async updateInvoice(
    organizationId: number,
    invoiceId: number,
    dto: UpdateInvoiceDto,
  ) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    // Don't allow updates if fully paid
    if (invoice.fullyPaid && dto.items) {
      throw new BadRequestException('Cannot update a fully paid invoice');
    }

    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;

      // Update tracking timestamps
      if (dto.status === 'SENT' && !invoice.sentAt) {
        updateData.sentAt = new Date();
      }
      if (dto.status === 'PAID' && !invoice.paidAt) {
        updateData.paidAt = new Date();
        updateData.fullyPaid = true;
      }
    }

    if (dto.dueDate) {
      updateData.dueDate = new Date(dto.dueDate);
    }

    if (dto.paymentTerms) {
      updateData.paymentTerms = dto.paymentTerms;
    }

    if (dto.paymentTermsDays) {
      updateData.paymentTermsDays = dto.paymentTermsDays;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    if (dto.termsAndConditions !== undefined) {
      updateData.termsAndConditions = dto.termsAndConditions;
    }

    if (dto.footerText !== undefined) {
      updateData.footerText = dto.footerText;
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update items if provided
      if (dto.items) {
        // Delete existing items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId },
        });

        // Recalculate totals
        let subtotal = 0;
        let totalTaxAmount = 0;

        const newItems = dto.items.map((item, index) => {
          const itemSubtotal = item.quantity * item.unitPrice;
          const itemTaxRate = item.taxRate || invoice.taxRate;
          const itemTaxAmount = (itemSubtotal * itemTaxRate) / 100;
          const itemDiscountAmount = item.discountAmount || 0;
          const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;

          subtotal += itemSubtotal;
          totalTaxAmount += itemTaxAmount;

          return {
            invoiceId,
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: itemSubtotal,
            taxRate: itemTaxRate,
            taxAmount: itemTaxAmount,
            discountPercentage: item.discountPercentage || 0,
            discountAmount: itemDiscountAmount,
            totalAmount: itemTotal,
            sortOrder: item.sortOrder || index,
          };
        });

        // Create new items
        await tx.invoiceItem.createMany({
          data: newItems,
        });

        const totalAmount =
          subtotal + totalTaxAmount - (invoice.discountAmount || 0);
        const balanceDue = totalAmount - invoice.amountPaid;

        updateData.subtotal = subtotal;
        updateData.taxAmount = totalTaxAmount;
        updateData.totalAmount = totalAmount;
        updateData.balanceDue = balanceDue;
      }

      // Update invoice
      return await tx.invoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          customer: true,
          items: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          payments: true,
        },
      });
    });
  }

  /**
   * Record a payment for an invoice
   */
  async recordPayment(
    organizationId: number,
    invoiceId: number,
    dto: RecordPaymentDto,
  ) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    if (invoice.fullyPaid) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Calculate excess amount (overpayment)
    const excessAmount =
      dto.amount > invoice.balanceDue ? dto.amount - invoice.balanceDue : 0;
    const effectivePayment = dto.amount - excessAmount; // Amount applied to invoice

    return await this.prisma.$transaction(async (tx) => {
      // Determine payment method fields (support both legacy and new format)
      const validPaymentMethods: PaymentMethod[] = [
        'CASH',
        'MPESA',
        'BANK_TRANSFER',
        'CREDIT',
      ];
      const rawMethod = (
        dto.paymentMethod || 'CASH'
      ).toUpperCase() as PaymentMethod;
      const paymentMethod: PaymentMethod = validPaymentMethods.includes(
        rawMethod,
      )
        ? rawMethod
        : 'CASH';
      const paymentMethodCode =
        dto.paymentMethodCode || dto.paymentMethod || 'CASH';
      const paymentMethodName =
        dto.paymentMethodName || dto.paymentMethod || 'Cash';

      // Create payment record (full amount received)
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          organizationId,
          amount: dto.amount,
          paymentMethod,
          paymentMethodId: dto.paymentMethodId,
          paymentMethodCode,
          paymentMethodName,
          transactionCode: dto.transactionCode,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          notes:
            excessAmount > 0
              ? `${dto.notes || ''} (Excess of ${excessAmount} added to customer wallet)`.trim()
              : dto.notes,
          recordedBy: dto.recordedBy,
        },
      });

      // Update invoice (only apply effective amount, not excess)
      const newAmountPaid = invoice.amountPaid + effectivePayment;
      const newBalanceDue = invoice.totalAmount - newAmountPaid;
      const isFullyPaid = newBalanceDue <= 0.01; // Allow for rounding errors

      let newStatus: InvoiceStatus = invoice.status;
      if (isFullyPaid) {
        newStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: Math.max(newBalanceDue, 0),
          fullyPaid: isFullyPaid,
          status: newStatus,
          paidAt: isFullyPaid ? new Date() : invoice.paidAt,
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });

      // Update customer due credit if credit sale
      if (invoice.invoiceType === 'CREDIT_SALE') {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            dueCredit: {
              decrement: effectivePayment,
            },
          },
        });
      }

      // Handle overpayment → store excess in customer wallet
      let walletInfo = null;
      if (excessAmount > 0 && invoice.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: invoice.customerId },
        });
        const newWalletBalance = (customer?.walletBalance || 0) + excessAmount;

        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { walletBalance: newWalletBalance },
        });

        await tx.customerWalletTransaction.create({
          data: {
            organizationId,
            customerId: invoice.customerId,
            type: 'OVERPAYMENT',
            amount: excessAmount,
            balanceAfter: newWalletBalance,
            referenceType: 'INVOICE',
            referenceId: invoiceId,
            description: `Overpayment of ${excessAmount} on invoice ${invoice.invoiceNumber} - added to wallet`,
            recordedBy: dto.recordedBy || 'System',
          },
        });

        walletInfo = {
          excessAmount,
          newWalletBalance,
          message: `Excess payment of ${excessAmount} has been added to customer wallet`,
        };

        console.log(
          `💰 [OVERPAYMENT] ${excessAmount} added to wallet for customer ${invoice.customerId}`,
        );
      }

      // Record in payment transactions
      try {
        const methodMap: Record<
          string,
          'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT'
        > = {
          CASH: 'CASH',
          MPESA: 'MPESA',
          BANK_TRANSFER: 'BANK_TRANSFER',
          CREDIT: 'CREDIT',
        };
        const mappedMethod = methodMap[paymentMethod] || 'CASH';
        const transactionType =
          invoice.invoiceType === 'CREDIT_SALE' ? 'CREDIT_SALE' : 'SALE';

        console.log(`💰 [INVOICE PAYMENT] Recording payment transaction:`, {
          organizationId,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: dto.amount,
          effectivePayment,
          excessAmount,
          method: mappedMethod,
          transactionType,
          paidBy: invoice.customerName || 'Customer',
        });

        const paymentTransaction = await this.paymentsService.createPayment(
          organizationId,
          {
            paymentType: 'INCOME' as any,
            transactionType: transactionType as any,
            amount: dto.amount,
            method: mappedMethod as any,
            status: 'PAID',
            transactionCode: dto.transactionCode,
            paidBy: invoice.customerName || 'Customer',
            paidTo: 'Organization',
            description: `Invoice payment for ${invoice.invoiceNumber}${excessAmount > 0 ? ` (includes ${excessAmount} overpayment to wallet)` : ''}`,
          },
        );

        console.log(
          `✅ [INVOICE PAYMENT] Payment transaction recorded successfully:`,
          {
            paymentTransactionId: paymentTransaction.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: dto.amount,
          },
        );
      } catch (error) {
        console.error(
          '❌ [INVOICE PAYMENT] Failed to record payment transaction:',
          error,
        );
        // Don't throw - invoice payment is already recorded
      }

      return { payment, invoice: updatedInvoice, walletInfo };
    });
  }

  /**
   * Delete/cancel invoice
   */
  async deleteInvoice(organizationId: number, invoiceId: number) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    if (invoice.amountPaid > 0) {
      throw new BadRequestException(
        'Cannot delete an invoice with payments. Cancel it instead.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // If credit sale, reverse customer due credit
      if (invoice.invoiceType === 'CREDIT_SALE' && invoice.amountPaid === 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            dueCredit: {
              decrement: invoice.totalAmount,
            },
          },
        });
      }

      // Delete invoice (items will cascade)
      return await tx.invoice.delete({
        where: { id: invoiceId },
      });
    });
  }

  /**
   * Cancel invoice (soft delete for invoices with payments)
   */
  async cancelInvoice(organizationId: number, invoiceId: number) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    return await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Check and update overdue invoices
   */
  async updateOverdueInvoices(organizationId: number) {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoice.updateMany({
      where: {
        organizationId,
        status: {
          in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'],
        },
        dueDate: {
          lt: now,
        },
        fullyPaid: false,
      },
      data: {
        status: 'OVERDUE',
      },
    });

    return overdueInvoices;
  }

  /**
   * Calculate and apply late fees
   */
  async calculateLateFees(organizationId: number, invoiceId: number) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    if (invoice.fullyPaid || invoice.lateFeePercentage === 0) {
      return invoice;
    }

    const now = new Date();
    if (now <= invoice.dueDate) {
      return invoice; // Not overdue yet
    }

    const daysOverdue = Math.floor(
      (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const lateFeeAmount =
      (invoice.balanceDue * invoice.lateFeePercentage) / 100;

    return await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        lateFeeAmount,
        totalAmount: invoice.subtotal + invoice.taxAmount + lateFeeAmount,
        balanceDue: invoice.balanceDue + lateFeeAmount,
      },
    });
  }

  /**
   * Send invoice via email (placeholder - implement with your email service)
   */
  private async sendInvoiceEmail(organizationId: number, invoiceId: number) {
    const invoice = await this.getInvoiceById(organizationId, invoiceId);

    // TODO: Implement email sending
    console.log(
      `Sending invoice ${invoice.invoiceNumber} to ${invoice.customerEmail}`,
    );

    // Update sent status
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
        sentAt: new Date(),
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
      },
    });
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(organizationId: number, filters?: InvoiceFilterDto) {
    const whereClause: any = { organizationId };

    if (filters?.startDate && filters?.endDate) {
      whereClause.issueDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    const [
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalAmount,
      totalPaid,
      totalOverdue,
    ] = await Promise.all([
      this.prisma.invoice.count({ where: whereClause }),
      this.prisma.invoice.count({
        where: { ...whereClause, status: 'PAID' },
      }),
      this.prisma.invoice.count({
        where: { ...whereClause, status: 'OVERDUE' },
      }),
      this.prisma.invoice.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: whereClause,
        _sum: { amountPaid: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...whereClause, status: 'OVERDUE' },
        _sum: { balanceDue: true },
      }),
    ]);

    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      pendingInvoices: totalInvoices - paidInvoices - overdueInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      totalPaid: totalPaid._sum.amountPaid || 0,
      totalOverdue: totalOverdue._sum.balanceDue || 0,
      totalOutstanding:
        (totalAmount._sum.totalAmount || 0) - (totalPaid._sum.amountPaid || 0),
    };
  }

  /**
   * Finalize draft invoice (DRAFT → PENDING)
   */
  async finalizeInvoice(
    organizationId: number,
    invoiceId: number,
    dto: FinalizeInvoiceDto,
  ) {
    // Get invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check status
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot finalize invoice with status ${invoice.status}. Only DRAFT invoices can be finalized.`,
      );
    }

    // Update status to PENDING
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PENDING,
        notes: dto.notes
          ? `${invoice.notes || ''}\n\nFinalized by ${dto.finalizedBy}: ${dto.notes}`.trim()
          : invoice.notes,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    console.log(
      `✅ Invoice ${invoice.invoiceNumber} finalized (DRAFT → PENDING) by ${dto.finalizedBy}`,
    );

    return updatedInvoice;
  }

  /**
   * Mark invoice as sent (PENDING → SENT)
   */
  async markAsSent(
    organizationId: number,
    invoiceId: number,
    dto: MarkAsSentDto,
  ) {
    // Get invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check status
    if (invoice.status !== InvoiceStatus.PENDING && invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot mark invoice as sent with status ${invoice.status}`,
      );
    }

    // Update status to SENT
    const sentAt = dto.sentAt ? new Date(dto.sentAt) : new Date();
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.SENT,
        sentAt,
        notes: dto.notes
          ? `${invoice.notes || ''}\n\nMarked as sent by ${dto.sentBy}: ${dto.notes}`.trim()
          : invoice.notes,
      },
      include: {
        customer: true,
        items: true,
      },
    });

    console.log(
      `✅ Invoice ${invoice.invoiceNumber} marked as sent by ${dto.sentBy}`,
    );

    return updatedInvoice;
  }

  /**
   * Duplicate invoice (creates new DRAFT)
   */
  async duplicateInvoice(organizationId: number, invoiceId: number) {
    // Get original invoice with items
    const originalInvoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!originalInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Generate new invoice number
    const invoiceNumber =
      await this.invoiceNumberService.generateInvoiceNumber(organizationId);

    // Create new invoice as DRAFT
    const newInvoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        invoiceType: originalInvoice.invoiceType,
        customerId: originalInvoice.customerId,
        customerName: originalInvoice.customerName,
        customerPhone: originalInvoice.customerPhone,
        customerEmail: originalInvoice.customerEmail,
        customerAddress: originalInvoice.customerAddress,
        customerTaxId: originalInvoice.customerTaxId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + originalInvoice.paymentTermsDays * 24 * 60 * 60 * 1000),
        subtotal: originalInvoice.subtotal,
        taxAmount: originalInvoice.taxAmount,
        discountAmount: originalInvoice.discountAmount,
        totalAmount: originalInvoice.totalAmount,
        amountPaid: 0,
        balanceDue: originalInvoice.totalAmount,
        paymentTerms: originalInvoice.paymentTerms,
        paymentTermsDays: originalInvoice.paymentTermsDays,
        lateFeePercentage: originalInvoice.lateFeePercentage,
        lateFeeAmount: 0,
        status: InvoiceStatus.DRAFT,
        fullyPaid: false,
        taxRate: originalInvoice.taxRate,
        taxType: originalInvoice.taxType,
        organizationTaxId: originalInvoice.organizationTaxId,
        notes: `Duplicated from invoice ${originalInvoice.invoiceNumber}`,
        termsAndConditions: originalInvoice.termsAndConditions,
        footerText: originalInvoice.footerText,
        createdBy: `System (Duplicate)`,
        salesPersonId: originalInvoice.salesPersonId,
        publicToken: this.invoiceNumberService.generatePublicToken(),
        qrCodeData: null,
      },
      include: {
        customer: true,
      },
    });

    // Create invoice items
    await this.prisma.invoiceItem.createMany({
      data: originalInvoice.items.map((item, index) => ({
        invoiceId: newInvoice.id,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        totalAmount: item.totalAmount,
        sortOrder: item.sortOrder || index,
      })),
    });

    console.log(
      `✅ Invoice ${originalInvoice.invoiceNumber} duplicated as ${newInvoice.invoiceNumber}`,
    );

    return await this.prisma.invoice.findUnique({
      where: { id: newInvoice.id },
      include: {
        customer: true,
        items: true,
      },
    });
  }

  /**
   * Send payment reminder
   */
  async sendReminder(
    organizationId: number,
    invoiceId: number,
    dto: SendReminderDto,
  ) {
    // Get invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if invoice is paid
    if (invoice.fullyPaid) {
      throw new BadRequestException('Cannot send reminder for paid invoice');
    }

    // TODO: Implement email sending logic here
    // This would typically use an email service to send the reminder
    // For now, just log and update reminder count

    // Update reminder count
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        notes: `${invoice.notes || ''}\n\nReminder sent by ${dto.sentBy} (${dto.reminderType || 'FRIENDLY'}): ${dto.customMessage || 'Payment reminder sent'}`.trim(),
      },
      include: {
        customer: true,
        items: true,
      },
    });

    console.log(
      `✅ Payment reminder sent for invoice ${invoice.invoiceNumber} (${dto.reminderType || 'FRIENDLY'})`,
    );

    return {
      success: true,
      message: 'Payment reminder sent successfully',
      invoice: updatedInvoice,
    };
  }
}
