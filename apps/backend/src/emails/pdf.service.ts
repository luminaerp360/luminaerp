// pdf.service.ts - Separate PDF service to avoid circular dependencies
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate PDF for a credit sale invoice
   */
  async generateCreditSaleInvoicePDF(
    organizationId: number,
    creditSaleId: number,
    format: 'invoice' | 'receipt' = 'invoice',
  ): Promise<Buffer> {
    // Get credit sale data
    const creditSale = await this.prisma.creditSale.findFirst({
      where: {
        id: creditSaleId,
        organizationId,
      },
      include: {
        CreditSalePayment: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!creditSale) {
      throw new NotFoundException(
        `Credit Sale with ID ${creditSaleId} not found in this organization`,
      );
    }

    // Get customer and organization details
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: creditSale.customer_id,
        organizationId,
      },
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // Calculate totals
    const totalPaidAmount = creditSale.CreditSalePayment.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const balance = creditSale.credit_amount - totalPaidAmount;

    // Format items
    const items = (creditSale.items as any[]).map((item) => ({
      description: item.name || item.description || 'Item',
      quantity: item.selectedItems || 1,
      unitPrice: item.price || 0,
      total: (item.selectedItems || 1) * (item.price || 0),
      hasVat: item.hasVat || false,
      discountValue: item.discountValue || 0,
    }));

    // Prepare data for PDF
    const pdfData = {
      invoiceNumber: `CR-${creditSale.id}`,
      date: creditSale.createdAt,
      organizationName: organization?.name || 'DASA DOVE ENTERPRISES',
      organizationAddress:
        organization?.address || 'P.O BOX 3818-30200, KITALE',
      organizationContact: organization?.contact || '0726738023',
      customer: {
        name: creditSale.customer_name,
        phone: creditSale.phone_number || customer?.phoneNumber,
        email: customer?.email || '',
      },
      items,
      subtotal: creditSale.credit_amount,
      vatAmount: creditSale.vat_amount || 0,
      discountAmount: creditSale.discount_amount || 0,
      total: creditSale.credit_amount,
      totalPaid: totalPaidAmount,
      balance: balance,
      notes: creditSale.order_remarks,
      orderDate: creditSale.order_date,
      paymentDate: creditSale.payment_date,
    };

    // Generate PDF based on format
    if (format === 'receipt') {
      return this.generateReceiptPDF(pdfData);
    } else {
      return this.generateInvoicePDF(pdfData);
    }
  }

  /**
   * Generate Invoice PDF using PDFKit
   */
  private async generateInvoicePDF(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Colors and styling
      const primaryColor = '#007bff';
      const darkGray = '#333333';
      const lightGray = '#666666';
      const bgGray = '#f8f9fa';

      // Header Section
      doc
        .fontSize(20)
        .fillColor(primaryColor)
        .text(data.organizationName, 50, 50, { align: 'center', width: 500 });

      doc
        .fontSize(10)
        .fillColor(lightGray)
        .text(data.organizationAddress, 50, 75, { align: 'center', width: 500 })
        .text(data.organizationContact, 50, 90, {
          align: 'center',
          width: 500,
        });

      // Invoice Title
      doc
        .fontSize(24)
        .fillColor(primaryColor)
        .text('INVOICE', 50, 115, { align: 'center', width: 500 });

      // Horizontal line separator
      doc.moveTo(50, 145).lineTo(550, 145).strokeColor('#e2e8f0').stroke();

      // Invoice Details Box
      const invoiceDetailsY = 160;
      doc.rect(50, invoiceDetailsY, 250, 100).fillAndStroke(bgGray, darkGray);

      doc
        .fillColor(darkGray)
        .fontSize(12)
        .text('Invoice Details', 60, invoiceDetailsY + 10);

      doc
        .fontSize(10)
        .text(`Invoice Number: ${data.invoiceNumber}`, 60, invoiceDetailsY + 30)
        .text(
          `Date: ${new Date(data.date).toLocaleDateString()}`,
          60,
          invoiceDetailsY + 45,
        )
        .text(
          `Order Date: ${data.orderDate ? new Date(data.orderDate).toLocaleDateString() : 'N/A'}`,
          60,
          invoiceDetailsY + 60,
        );

      // Customer Details Box
      doc.rect(320, invoiceDetailsY, 250, 100).fillAndStroke(bgGray, darkGray);

      doc
        .fillColor(darkGray)
        .fontSize(12)
        .text('Customer Information', 330, invoiceDetailsY + 10);

      doc
        .fontSize(10)
        .text(`Name: ${data.customer.name}`, 330, invoiceDetailsY + 30)
        .text(
          `Phone: ${data.customer.phone || 'N/A'}`,
          330,
          invoiceDetailsY + 45,
        )
        .text(
          `Email: ${data.customer.email || 'N/A'}`,
          330,
          invoiceDetailsY + 60,
        );

      // Items Table
      const tableTop = 280;
      const tableLeft = 50;
      const tableWidth = 520;

      // Table Header
      doc
        .rect(tableLeft, tableTop, tableWidth, 25)
        .fillAndStroke(primaryColor, primaryColor);

      doc
        .fillColor('white')
        .fontSize(10)
        .text('Description', tableLeft + 10, tableTop + 8)
        .text('Qty', tableLeft + 250, tableTop + 8)
        .text('Unit Price', tableLeft + 320, tableTop + 8)
        .text('Total', tableLeft + 430, tableTop + 8);

      // Table Rows
      let currentY = tableTop + 25;
      doc.fillColor(darkGray);

      data.items.forEach((item: any, index: number) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : bgGray;
        doc
          .rect(tableLeft, currentY, tableWidth, 20)
          .fillAndStroke(rowBg, '#e9ecef');

        doc
          .fillColor(darkGray)
          .text(item.description, tableLeft + 10, currentY + 5)
          .text(item.quantity.toString(), tableLeft + 250, currentY + 5)
          .text(item.unitPrice.toFixed(2), tableLeft + 320, currentY + 5)
          .text(item.total.toFixed(2), tableLeft + 430, currentY + 5);

        currentY += 20;
      });

      // Totals Section
      const totalsX = 350;
      let totalsY = currentY + 30;

      doc
        .fontSize(10)
        .fillColor(darkGray)
        .text('Subtotal:', totalsX, totalsY)
        .text(data.subtotal.toFixed(2), totalsX + 100, totalsY);
      totalsY += 15;

      if (data.discountAmount > 0) {
        doc
          .text('Discount:', totalsX, totalsY)
          .text(`-${data.discountAmount.toFixed(2)}`, totalsX + 100, totalsY);
        totalsY += 15;
      }

      if (data.vatAmount > 0) {
        doc
          .text('VAT:', totalsX, totalsY)
          .text(data.vatAmount.toFixed(2), totalsX + 100, totalsY);
        totalsY += 15;
      }

      // Total line
      doc
        .rect(totalsX - 10, totalsY - 5, 180, 20)
        .fillAndStroke(primaryColor, primaryColor);

      doc
        .fillColor('white')
        .fontSize(12)
        .text('Total:', totalsX, totalsY)
        .text(data.total.toFixed(2), totalsX + 100, totalsY);
      totalsY += 25;

      doc
        .fillColor(darkGray)
        .fontSize(10)
        .text('Amount Paid:', totalsX, totalsY)
        .text(data.totalPaid.toFixed(2), totalsX + 100, totalsY);
      totalsY += 15;

      // Balance Due
      if (data.balance > 0) {
        doc
          .rect(totalsX - 10, totalsY - 5, 180, 20)
          .fillAndStroke('#dc3545', '#dc3545');

        doc
          .fillColor('white')
          .fontSize(12)
          .text('Balance Due:', totalsX, totalsY)
          .text(data.balance.toFixed(2), totalsX + 100, totalsY);
      } else {
        doc
          .fillColor('#28a745')
          .text('Balance Due:', totalsX, totalsY)
          .text(data.balance.toFixed(2), totalsX + 100, totalsY);
      }

      // Notes Section
      if (data.notes) {
        totalsY += 50;
        doc.rect(50, totalsY, 520, 60).fillAndStroke('#fff3cd', '#ffc107');

        doc
          .fillColor(darkGray)
          .fontSize(10)
          .text('Notes:', 60, totalsY + 10)
          .text(data.notes, 60, totalsY + 25, { width: 500, height: 40 });
      }

      // Footer
      const footerY = doc.page.height - 100;
      doc
        .fillColor(lightGray)
        .fontSize(10)
        .text('Thank you for your business!', 50, footerY, {
          align: 'center',
          width: 520,
        })
        .text(
          `Generated on: ${new Date().toLocaleString()}`,
          50,
          footerY + 15,
          { align: 'center', width: 520 },
        );

      doc.end();
    });
  }

  /**
   * Generate Receipt PDF using PDFKit (compact format)
   */
  private async generateReceiptPDF(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 20,
        size: [226.77, 841.89], // 80mm width, A4 height
      });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 226.77;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Header
      doc.fontSize(14).text(data.organizationName, margin, 30, {
        align: 'center',
        width: contentWidth,
      });

      doc
        .fontSize(8)
        .text(data.organizationAddress, margin, 50, {
          align: 'center',
          width: contentWidth,
        })
        .text(data.organizationContact, margin, 65, {
          align: 'center',
          width: contentWidth,
        });

      // Receipt info
      let currentY = 90;
      doc
        .fontSize(10)
        .text(`Invoice: ${data.invoiceNumber}`, margin, currentY)
        .text(
          `Date: ${new Date(data.date).toLocaleDateString()}`,
          margin,
          currentY + 12,
        )
        .text(`Customer: ${data.customer.name}`, margin, currentY + 24);

      currentY += 50;

      // Items
      data.items.forEach((item: any) => {
        doc
          .fontSize(9)
          .text(item.description, margin, currentY, { width: contentWidth });
        currentY += 15;

        const detailsText = `${item.quantity} x ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}`;
        doc.fontSize(8).text(detailsText, margin, currentY, {
          align: 'right',
          width: contentWidth,
        });
        currentY += 20;
      });

      // Totals
      currentY += 10;
      doc
        .fontSize(11)
        .text(`Total: ${data.total.toFixed(2)}`, margin, currentY, {
          align: 'right',
          width: contentWidth,
        });

      // Footer
      currentY += 30;
      doc.fontSize(8).text('Thank you for your business!', margin, currentY, {
        align: 'center',
        width: contentWidth,
      });

      doc.end();
    });
  }
}
