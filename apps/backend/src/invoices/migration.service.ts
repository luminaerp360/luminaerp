import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoiceMigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}

  /**
   * Migrate all credit sales to new invoice system
   */
  async migrateAllCreditSales(organizationId: number) {
    const startTime = Date.now();
    console.log(`Starting migration for organization ${organizationId}...`);

    try {
      // Get all credit sales for this organization
      const creditSales = await this.prisma.creditSale.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`Found ${creditSales.length} credit sales to migrate`);

      let successCount = 0;
      let errorCount = 0;
      const errors: any[] = [];

      // Migrate in batches
      const batchSize = 50;
      for (let i = 0; i < creditSales.length; i += batchSize) {
        const batch = creditSales.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((creditSale) =>
            this.migrateCreditSale(organizationId, creditSale),
          ),
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            errors.push({
              creditSaleId: batch[index].id,
              error: result.reason,
            });
          }
        });

        console.log(
          `Migrated batch ${Math.floor(i / batchSize) + 1}: ${successCount} successful, ${errorCount} errors`,
        );
      }

      const duration = Date.now() - startTime;
      console.log(`Migration completed in ${duration}ms`);
      console.log(`Results: ${successCount} successful, ${errorCount} failed`);

      return {
        total: creditSales.length,
        successful: successCount,
        failed: errorCount,
        errors,
        duration,
      };
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single credit sale to invoice
   */
  async migrateCreditSale(organizationId: number, creditSale: any) {
    try {
      // Check if already migrated
      const existing = await this.prisma.invoice.findFirst({
        where: { oldCreditSaleId: creditSale.id },
      });

      if (existing) {
        console.log(`Credit sale ${creditSale.id} already migrated`);
        return existing;
      }

      // Generate invoice number
      const invoiceNumber =
        await this.invoiceNumberService.generateInvoiceNumber(
          organizationId,
          'INV',
        );

      // Parse items from JSON
      const items =
        typeof creditSale.items === 'string'
          ? JSON.parse(creditSale.items)
          : creditSale.items;

      // Calculate payment terms days
      const issueDate = creditSale.order_date || creditSale.createdAt;
      const paymentDate = creditSale.payment_date;
      let paymentTermsDays = 30;

      if (paymentDate && issueDate) {
        const daysDiff = Math.ceil(
          (new Date(paymentDate).getTime() - new Date(issueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        paymentTermsDays = daysDiff > 0 ? daysDiff : 30;
      }

      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTermsDays);

      // Determine status
      let status: InvoiceStatus = InvoiceStatus.DRAFT;
      if (creditSale.fully_paid === 1) {
        status = InvoiceStatus.PAID;
      } else if (creditSale.amount_paid > 0) {
        status = InvoiceStatus.PARTIALLY_PAID;
      } else if (new Date() > dueDate) {
        status = InvoiceStatus.OVERDUE;
      } else {
        status = InvoiceStatus.SENT;
      }

      // Calculate totals
      const subtotal =
        creditSale.credit_amount -
        (creditSale.vat_amount || 0) +
        (creditSale.discount_amount || 0);
      const totalAmount = creditSale.credit_amount;
      const amountPaid = creditSale.amount_paid || 0;
      const balanceDue = totalAmount - amountPaid;

      // Generate public token
      const publicToken = this.invoiceNumberService.generatePublicToken();

      return await this.prisma.$transaction(async (tx) => {
        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            organizationId,
            invoiceNumber,
            invoiceType: 'CREDIT_SALE',
            customerId: creditSale.customer_id,
            customerName: creditSale.customer_name,
            customerPhone: creditSale.phone_number,
            issueDate: new Date(issueDate),
            dueDate,
            orderDate: creditSale.order_date
              ? new Date(creditSale.order_date)
              : null,
            subtotal,
            taxAmount: creditSale.vat_amount || 0,
            discountAmount: creditSale.discount_amount || 0,
            totalAmount,
            amountPaid,
            balanceDue,
            paymentTerms: creditSale.payment_terms || 'Net 30',
            paymentTermsDays,
            status,
            fullyPaid: creditSale.fully_paid === 1,
            paidAt:
              creditSale.fully_paid === 1 ? new Date(creditSale.updatedAt) : null,
            notes: creditSale.order_remarks,
            createdBy: creditSale.created_by,
            shiftId: creditSale.shift_id,
            orderId: creditSale.order_id,
            publicToken,
            oldCreditSaleId: creditSale.id,
            createdAt: new Date(creditSale.createdAt),
            updatedAt: new Date(creditSale.updatedAt),
          },
        });

        // Create invoice items
        if (Array.isArray(items) && items.length > 0) {
          const invoiceItems = items.map((item: any, index: number) => {
            const quantity = item.selectedItems || item.quantity || 1;
            const unitPrice = item.price || item.unitPrice || 0;
            const itemSubtotal = quantity * unitPrice;
            const taxRate = item.hasVat ? 16 : 0; // Assuming 16% VAT
            const taxAmount = item.hasVat ? (itemSubtotal * 16) / 100 : 0;
            const discountAmount = item.discountValue || 0;
            const totalAmount = itemSubtotal + taxAmount - discountAmount;

            return {
              invoiceId: invoice.id,
              productId: item.id,
              productName: item.name || item.productName || 'Item',
              description: item.description,
              sku: item.productIdNumber || item.sku,
              quantity,
              unitPrice,
              subtotal: itemSubtotal,
              taxRate,
              taxAmount,
              discountPercentage: 0,
              discountAmount,
              totalAmount,
              sortOrder: index,
            };
          });

          await tx.invoiceItem.createMany({
            data: invoiceItems,
          });
        }

        // Migrate payments from CreditSalePayment
        const creditSalePayments = await tx.creditSalePayment.findMany({
          where: { creditSaleId: creditSale.id },
        });

        if (creditSalePayments.length > 0) {
          const invoicePayments = creditSalePayments.map((payment) => ({
            invoiceId: invoice.id,
            organizationId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            transactionCode: payment.transactionCode,
            paymentDate: new Date(payment.paymentDate || payment.createdAt),
            recordedBy: 'System Migration',
            createdAt: new Date(payment.createdAt),
            updatedAt: new Date(payment.updatedAt),
          }));

          await tx.invoicePayment.createMany({
            data: invoicePayments,
          });
        }

        console.log(
          `Migrated credit sale ${creditSale.id} to invoice ${invoice.invoiceNumber}`,
        );

        return invoice;
      });
    } catch (error) {
      console.error(`Failed to migrate credit sale ${creditSale.id}:`, error);
      throw error;
    }
  }

  /**
   * Rollback migration - delete migrated invoices
   */
  async rollbackMigration(organizationId: number) {
    console.log(`Rolling back migration for organization ${organizationId}...`);

    const result = await this.prisma.invoice.deleteMany({
      where: {
        organizationId,
        oldCreditSaleId: {
          not: null,
        },
      },
    });

    console.log(`Deleted ${result.count} migrated invoices`);

    return result;
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration(organizationId: number) {
    const [creditSalesCount, migratedInvoicesCount] = await Promise.all([
      this.prisma.creditSale.count({ where: { organizationId } }),
      this.prisma.invoice.count({
        where: {
          organizationId,
          oldCreditSaleId: { not: null },
        },
      }),
    ]);

    const totalCreditSales = await this.prisma.creditSale.aggregate({
      where: { organizationId },
      _sum: { credit_amount: true },
    });

    const totalMigratedInvoices = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        oldCreditSaleId: { not: null },
      },
      _sum: { totalAmount: true },
    });

    return {
      creditSalesCount,
      migratedInvoicesCount,
      migrationComplete: creditSalesCount === migratedInvoicesCount,
      totalCreditSalesAmount: totalCreditSales._sum.credit_amount || 0,
      totalMigratedAmount: totalMigratedInvoices._sum.totalAmount || 0,
    };
  }
}
