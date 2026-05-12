import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

export interface PDFTheme {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  lightGray: string;
  backgroundColor: string;
}

export const PDF_THEMES = {
  default: {
    primaryColor: '#FF6B35',
    secondaryColor: '#F7931E',
    textColor: '#1a1a1a',
    lightGray: '#6b7280',
    backgroundColor: '#fafafa',
  },
  modern: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    textColor: '#1f2937',
    lightGray: '#6b7280',
    backgroundColor: '#f9fafb',
  },
  professional: {
    primaryColor: '#0f172a',
    secondaryColor: '#1e293b',
    textColor: '#0f172a',
    lightGray: '#64748b',
    backgroundColor: '#f8fafc',
  },
  elegant: {
    primaryColor: '#334155',
    secondaryColor: '#475569',
    textColor: '#0f172a',
    lightGray: '#64748b',
    backgroundColor: '#f8fafc',
  },
};

@Injectable()
export class InvoicePDFService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate modern invoice PDF
   */
  async generateInvoicePDF(
    invoiceId: number,
    options: {
      theme?: keyof typeof PDF_THEMES;
      includeQRCode?: boolean;
      watermark?: string;
    } = {},
  ): Promise<Buffer> {
    const { theme = 'default', includeQRCode = true, watermark } = options;

    // Fetch invoice with all details
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: true,
        customer: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Fetch organization settings for default messages
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: invoice.organizationId },
    });

    return this.createPDFDocument(invoice, PDF_THEMES[theme], {
      includeQRCode,
      watermark,
      settings,
    });
  }

  /**
   * Create PDF document with clean, professional design (matches quotation)
   */
  private async createPDFDocument(
    invoice: any,
    theme: PDFTheme,
    options: { includeQRCode: boolean; watermark?: string; settings?: any },
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `Invoice ${invoice.invoiceNumber}`,
          Author: invoice.organization.name,
          Subject: `Invoice for ${invoice.customerName}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Add watermark if provided
      if (options.watermark) {
        this.addWatermark(doc, options.watermark, theme);
      }

      let yPos = 50;

      // Header Section - Company Name in Orange
      yPos = await this.addModernHeader(doc, invoice, yPos);

      // Invoice Title and Details on Right
      yPos = this.addInvoiceTitleSection(doc, invoice, yPos);

      // Modern separator with dual-tone effect
      doc
        .moveTo(50, yPos)
        .lineTo(550, yPos)
        .strokeColor('#FF6B35')
        .lineWidth(2.5)
        .stroke();

      // Subtle shadow line
      doc
        .moveTo(50, yPos + 1)
        .lineTo(550, yPos + 1)
        .strokeColor('#FFA07A')
        .lineWidth(1)
        .opacity(0.3)
        .stroke()
        .opacity(1);

      yPos += 18;

      // Bill To and Status Section
      yPos = this.addBillToSection(doc, invoice, yPos);

      // Items Table
      yPos = await this.addModernItemsTable(doc, invoice, yPos);

      // Payment Summary
      yPos = this.addModernPaymentSummary(doc, invoice, yPos);

      // Footer
      this.addModernFooter(doc, invoice, yPos, options.settings);

      doc.end();
    });
  }

  /**
   * Add company header with logo
   */
  private async addHeader(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): Promise<number> {
    // Company logo (if available)
    if (invoice.organization.logoUrl) {
      try {
        // TODO: Implement logo loading from URL
        // For now, just add company name
        doc
          .fontSize(20)
          .fillColor(theme.primaryColor)
          .text(invoice.organization.name, 50, yPos, {
            align: 'center',
            width: 500,
          });
        yPos += 30;
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    } else {
      doc
        .fontSize(20)
        .fillColor(theme.primaryColor)
        .text(invoice.organization.name, 50, yPos, {
          align: 'center',
          width: 500,
        });
      yPos += 30;
    }

    // Company details
    doc
      .fontSize(10)
      .fillColor(theme.lightGray)
      .text(invoice.organization.address || '', 50, yPos, {
        align: 'center',
        width: 500,
      });
    yPos += 15;

    doc.text(invoice.organization.contact || '', 50, yPos, {
      align: 'center',
      width: 500,
    });
    yPos += 15;

    if (invoice.organizationTaxId) {
      doc.text(`TIN: ${invoice.organizationTaxId}`, 50, yPos, {
        align: 'center',
        width: 500,
      });
      yPos += 25;
    } else {
      yPos += 10;
    }

    return yPos;
  }

  /**
   * Add status badge
   */
  private addStatusBadge(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): number {
    const statusColors = {
      DRAFT: '#6b7280',
      PENDING: '#f59e0b',
      SENT: '#3b82f6',
      VIEWED: '#8b5cf6',
      PARTIALLY_PAID: '#f59e0b',
      PAID: '#10b981',
      OVERDUE: '#ef4444',
      CANCELLED: '#6b7280',
      REFUNDED: '#ec4899',
    };

    const statusColor = statusColors[invoice.status] || theme.primaryColor;

    doc
      .roundedRect(230, yPos, 140, 25, 5)
      .fillAndStroke(statusColor, statusColor);

    doc
      .fontSize(12)
      .fillColor('white')
      .text(invoice.status.replace('_', ' '), 230, yPos + 6, {
        width: 140,
        align: 'center',
      });

    return yPos + 35;
  }

  /**
   * Add invoice and customer details section
   */
  private addDetailsSection(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): number {
    // Invoice Details Box
    doc
      .roundedRect(50, yPos, 240, 140, 5)
      .fillAndStroke(theme.backgroundColor, theme.lightGray);

    doc
      .fillColor(theme.textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Invoice Details', 60, yPos + 10);

    doc.font('Helvetica').fontSize(10);

    const detailsY = yPos + 30;
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 60, detailsY);
    doc.text(
      `Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`,
      60,
      detailsY + 18,
    );
    doc.text(
      `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
      60,
      detailsY + 36,
    );

    if (invoice.referenceNumber) {
      doc.text(`Reference: ${invoice.referenceNumber}`, 60, detailsY + 54);
    }

    doc.text(`Payment Terms: ${invoice.paymentTerms}`, 60, detailsY + 72);

    // Customer Details Box
    doc
      .roundedRect(310, yPos, 240, 140, 5)
      .fillAndStroke(theme.backgroundColor, theme.lightGray);

    doc
      .fillColor(theme.textColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Bill To', 320, yPos + 10);

    doc.font('Helvetica').fontSize(10);

    const customerY = yPos + 30;
    doc.text(invoice.customerName, 320, customerY);

    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, 320, customerY + 18);
    }

    if (invoice.customerEmail) {
      doc.text(`Email: ${invoice.customerEmail}`, 320, customerY + 36);
    }

    if (invoice.customerAddress) {
      doc.text(invoice.customerAddress, 320, customerY + 54, { width: 220 });
    }

    if (invoice.customerTaxId) {
      doc.text(`TIN: ${invoice.customerTaxId}`, 320, customerY + 90);
    }

    return yPos + 160;
  }

  /**
   * Add items table
   */
  private async addItemsTable(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): Promise<number> {
    const tableTop = yPos;
    const tableLeft = 50;
    const tableWidth = 500;

    // Table Header
    doc
      .roundedRect(tableLeft, tableTop, tableWidth, 30, 3)
      .fillAndStroke(theme.primaryColor, theme.primaryColor);

    doc.fillColor('white').fontSize(10).font('Helvetica-Bold');

    const headerY = tableTop + 10;
    doc.text('Item', tableLeft + 10, headerY, { width: 200 });
    doc.text('Qty', tableLeft + 220, headerY, { width: 50, align: 'right' });
    doc.text('Price', tableLeft + 280, headerY, { width: 70, align: 'right' });
    doc.text('Tax', tableLeft + 360, headerY, { width: 60, align: 'right' });
    doc.text('Total', tableLeft + 430, headerY, { width: 60, align: 'right' });

    let currentY = tableTop + 30;
    doc.fillColor(theme.textColor).font('Helvetica');

    // Table Rows
    invoice.items.forEach((item: any, index: number) => {
      const rowHeight = 35;
      const rowBg = index % 2 === 0 ? '#ffffff' : theme.backgroundColor;

      doc
        .rect(tableLeft, currentY, tableWidth, rowHeight)
        .fillAndStroke(rowBg, '#e9ecef');

      const textY = currentY + 8;

      // Item name and description
      doc.fontSize(10).text(item.productName, tableLeft + 10, textY, {
        width: 200,
      });

      if (item.description) {
        doc
          .fontSize(8)
          .fillColor(theme.lightGray)
          .text(item.description, tableLeft + 10, textY + 12, { width: 200 });
        doc.fillColor(theme.textColor);
      }

      // Quantity
      doc.fontSize(10).text(item.quantity.toString(), tableLeft + 220, textY, {
        width: 50,
        align: 'right',
      });

      // Unit Price
      doc.text(item.unitPrice.toFixed(2), tableLeft + 280, textY, {
        width: 70,
        align: 'right',
      });

      // Tax
      doc.text(item.taxAmount.toFixed(2), tableLeft + 360, textY, {
        width: 60,
        align: 'right',
      });

      // Total
      doc.text(item.totalAmount.toFixed(2), tableLeft + 430, textY, {
        width: 60,
        align: 'right',
      });

      currentY += rowHeight;
    });

    return currentY + 20;
  }

  /**
   * Add payment summary section
   */
  private addPaymentSummary(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): number {
    const summaryX = 350;
    let summaryY = yPos;

    doc.fontSize(10).fillColor(theme.textColor).font('Helvetica');

    // Subtotal
    doc.text('Subtotal:', summaryX, summaryY);
    doc.text(invoice.subtotal.toFixed(2), summaryX + 120, summaryY, {
      width: 80,
      align: 'right',
    });
    summaryY += 18;

    // Discount
    if (invoice.discountAmount > 0) {
      doc.fillColor(theme.primaryColor);
      doc.text('Discount:', summaryX, summaryY);
      doc.text(
        `-${invoice.discountAmount.toFixed(2)}`,
        summaryX + 120,
        summaryY,
        {
          width: 80,
          align: 'right',
        },
      );
      doc.fillColor(theme.textColor);
      summaryY += 18;
    }

    // Tax
    if (invoice.taxAmount > 0) {
      const taxLabel = invoice.taxType
        ? `${invoice.taxType} (${invoice.taxRate}%)`
        : 'Tax';
      doc.text(taxLabel, summaryX, summaryY);
      doc.text(invoice.taxAmount.toFixed(2), summaryX + 120, summaryY, {
        width: 80,
        align: 'right',
      });
      summaryY += 18;
    }

    // Late Fee
    if (invoice.lateFeeAmount > 0) {
      doc.fillColor('#ef4444');
      doc.text('Late Fee:', summaryX, summaryY);
      doc.text(invoice.lateFeeAmount.toFixed(2), summaryX + 120, summaryY, {
        width: 80,
        align: 'right',
      });
      doc.fillColor(theme.textColor);
      summaryY += 18;
    }

    // Total
    doc
      .roundedRect(summaryX - 10, summaryY - 5, 210, 25, 3)
      .fillAndStroke(theme.primaryColor, theme.primaryColor);

    doc
      .fillColor('white')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Total:', summaryX, summaryY);
    doc.text(invoice.totalAmount.toFixed(2), summaryX + 120, summaryY, {
      width: 80,
      align: 'right',
    });
    summaryY += 30;

    // Amount Paid
    doc
      .fillColor(theme.textColor)
      .fontSize(10)
      .font('Helvetica')
      .text('Amount Paid:', summaryX, summaryY);
    doc.text(invoice.amountPaid.toFixed(2), summaryX + 120, summaryY, {
      width: 80,
      align: 'right',
    });
    summaryY += 18;

    // Balance Due
    const balanceColor = invoice.balanceDue > 0 ? '#ef4444' : '#10b981';
    doc
      .roundedRect(summaryX - 10, summaryY - 5, 210, 25, 3)
      .fillAndStroke(balanceColor, balanceColor);

    doc
      .fillColor('white')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Balance Due:', summaryX, summaryY);
    doc.text(invoice.balanceDue.toFixed(2), summaryX + 120, summaryY, {
      width: 80,
      align: 'right',
    });

    return summaryY + 40;
  }

  /**
   * Add QR code (disabled - install qrcode package to enable)
   */
  private async addQRCode(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
  ): Promise<number> {
    // QR code generation disabled - install qrcode package to enable
    // Add placeholder text instead
    doc
      .fontSize(10)
      .fillColor('#6b7280')
      .text('QR Code (install qrcode package)', 50, yPos, {
        width: 120,
        align: 'center',
      });

    return yPos;
  }

  /**
   * Add payment information
   */
  private addPaymentInfo(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): number {
    if (
      !invoice.organization.mpesaDetails &&
      !invoice.organization.bankDetails
    ) {
      return yPos;
    }

    doc
      .fontSize(12)
      .fillColor(theme.primaryColor)
      .font('Helvetica-Bold')
      .text('Payment Information', 50, yPos);
    yPos += 25;

    doc.fontSize(10).fillColor(theme.textColor).font('Helvetica');

    // M-PESA Details
    if (invoice.organization.mpesaDetails) {
      const mpesa =
        typeof invoice.organization.mpesaDetails === 'string'
          ? JSON.parse(invoice.organization.mpesaDetails)
          : invoice.organization.mpesaDetails;

      doc.font('Helvetica-Bold').text('M-PESA:', 50, yPos);
      doc.font('Helvetica');

      if (mpesa.businessNumber) {
        doc.text(`Paybill: ${mpesa.businessNumber}`, 50, yPos + 15);
      }
      if (mpesa.accountNumber) {
        doc.text(`Account: ${mpesa.accountNumber}`, 50, yPos + 30);
      }

      yPos += 50;
    }

    // Bank Details
    if (invoice.organization.bankDetails) {
      const bank =
        typeof invoice.organization.bankDetails === 'string'
          ? JSON.parse(invoice.organization.bankDetails)
          : invoice.organization.bankDetails;

      doc.font('Helvetica-Bold').text('Bank Transfer:', 50, yPos);
      doc.font('Helvetica');

      if (bank.bankName) {
        doc.text(`Bank: ${bank.bankName}`, 50, yPos + 15);
      }
      if (bank.accountNumber) {
        doc.text(`Account: ${bank.accountNumber}`, 50, yPos + 30);
      }
      if (bank.accountName) {
        doc.text(`Name: ${bank.accountName}`, 50, yPos + 45);
      }

      yPos += 65;
    }

    return yPos;
  }

  /**
   * Add terms and conditions
   */
  private addTermsAndConditions(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
    yPos: number,
  ): number {
    doc
      .fontSize(12)
      .fillColor(theme.primaryColor)
      .font('Helvetica-Bold')
      .text('Terms & Conditions', 50, yPos);
    yPos += 20;

    doc
      .fontSize(9)
      .fillColor(theme.textColor)
      .font('Helvetica')
      .text(invoice.termsAndConditions, 50, yPos, { width: 500 });

    return yPos + 60;
  }

  /**
   * Add footer
   */
  private addFooter(
    doc: PDFKit.PDFDocument,
    invoice: any,
    theme: PDFTheme,
  ): void {
    const footerY = doc.page.height - 80;

    doc
      .fontSize(10)
      .fillColor(theme.lightGray)
      .text(invoice.footerText || 'Thank you for your business!', 50, footerY, {
        align: 'center',
        width: 500,
      });

    doc
      .fontSize(8)
      .text(
        'This is a computer-generated invoice. No signature required.',
        50,
        footerY + 20,
        { align: 'center', width: 500 },
      );

    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 35, {
      align: 'center',
      width: 500,
    });
  }

  /**
   * Modern Header - Company name in orange
   */
  private async addModernHeader(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
  ): Promise<number> {
    // Company name with modern gradient effect simulation
    doc
      .fontSize(22)
      .fillColor('#FF6B35')
      .font('Helvetica-Bold')
      .text(invoice.organization.name || 'Techlit solutions.', 50, yPos, {
        characterSpacing: 0.3,
      });
    yPos += 24;

    // Company email with icon-like bullet
    doc
      .fontSize(9)
      .fillColor('#4a5568')
      .font('Helvetica')
      .text(
        '✉  ' +
          (invoice.organization.email || invoice.organization.contact || ''),
        50,
        yPos,
      );
    yPos += 13;

    // Company phone with icon-like bullet
    if (invoice.organization.phone) {
      doc.text('☎  ' + invoice.organization.phone, 50, yPos);
      yPos += 13;
    }

    // Company address with icon-like bullet
    if (invoice.organization.address) {
      const addressLines = invoice.organization.address.split(',');
      addressLines.forEach((line: string, index: number) => {
        const bullet = index === 0 ? '⌂  ' : '   ';
        doc.text(bullet + line.trim(), 50, yPos);
        yPos += 12;
      });
    }

    yPos += 3;
    return yPos;
  }

  /**
   * Invoice Title Section - Right aligned
   */
  private addInvoiceTitleSection(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
  ): number {
    const startY = 50;

    // INVOICE title - right aligned with modern styling
    doc
      .fontSize(24)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text('INVOICE', 400, startY, {
        align: 'right',
        width: 150,
        characterSpacing: 1,
      });

    // Decorative line under INVOICE
    doc
      .moveTo(475, startY + 28)
      .lineTo(550, startY + 28)
      .strokeColor('#FF6B35')
      .lineWidth(2)
      .stroke();

    // Invoice number - right aligned with modern orange
    doc
      .fontSize(10)
      .fillColor('#FF6B35')
      .font('Helvetica-Bold')
      .text(`#${invoice.invoiceNumber}`, 400, startY + 36, {
        align: 'right',
        width: 150,
      });

    // Date - right aligned with subtle styling
    doc
      .fontSize(9)
      .fillColor('#4a5568')
      .font('Helvetica')
      .text(
        new Date(invoice.issueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        400,
        startY + 50,
        { align: 'right', width: 150 },
      );

    return Math.max(yPos, startY + 66);
  }

  /**
   * Bill To Section with Status
   */
  private addBillToSection(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
  ): number {
    // Card-like container for BILL TO
    const cardPadding = 12;
    const cardY = yPos;

    // Subtle background card
    doc
      .roundedRect(45, cardY, 280, 75, 6)
      .fillAndStroke('#fafafa', '#e5e7eb')
      .lineWidth(0.5);

    // BILL TO label with modern styling
    doc
      .fontSize(8.5)
      .fillColor('#FF6B35')
      .font('Helvetica-Bold')
      .text('BILL TO', 50 + cardPadding, cardY + cardPadding, {
        characterSpacing: 0.8,
      });

    // STATUS card - right aligned
    const statusX = 360;
    const statusY = cardY;
    doc
      .roundedRect(statusX, statusY, 190, 75, 6)
      .fillAndStroke('#fafafa', '#e5e7eb')
      .lineWidth(0.5);

    doc
      .fontSize(8.5)
      .fillColor('#FF6B35')
      .font('Helvetica-Bold')
      .text('STATUS', statusX + cardPadding, statusY + cardPadding, {
        characterSpacing: 0.8,
      });

    // Customer name with better spacing
    doc
      .fontSize(11)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text(invoice.customerName, 50 + cardPadding, cardY + cardPadding + 18);

    // Status badge with modern colors
    const statusBadgeX = statusX + cardPadding;
    const statusBadgeY = statusY + cardPadding + 18;
    const statusBadgeWidth = 160;

    const statusColors = {
      PAID: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
      PENDING: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
      OVERDUE: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
      DRAFT: { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' },
    };

    const statusStyle = statusColors[invoice.status] || statusColors.PENDING;

    doc
      .roundedRect(statusBadgeX, statusBadgeY, statusBadgeWidth, 22, 4)
      .fillAndStroke(statusStyle.bg, statusStyle.border)
      .lineWidth(1);

    doc
      .fontSize(9.5)
      .fillColor(statusStyle.text)
      .font('Helvetica-Bold')
      .text(invoice.status.replace('_', ' '), statusBadgeX, statusBadgeY + 5, {
        width: statusBadgeWidth,
        align: 'center',
      });

    // Customer contact details with icons
    let detailY = cardY + cardPadding + 38;

    if (invoice.customerPhone) {
      doc
        .fontSize(9)
        .fillColor('#4a5568')
        .font('Helvetica')
        .text('☎  ' + invoice.customerPhone, 50 + cardPadding, detailY);
      detailY += 12;
    }

    if (invoice.customerEmail) {
      doc.text('✉  ' + invoice.customerEmail, 50 + cardPadding, detailY);
      detailY += 12;
    }

    yPos = cardY + 85;
    return yPos;
  }

  /**
   * Modern Items Table
   */
  private async addModernItemsTable(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
  ): Promise<number> {
    const tableTop = yPos;
    const tableLeft = 50;
    const tableWidth = 500;

    // Table Header with modern gradient-like effect
    doc
      .roundedRect(tableLeft, tableTop, tableWidth, 28, 4)
      .fillAndStroke('#FF6B35', '#FF6B35');

    doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold');

    const headerY = tableTop + 9;
    doc.text('DESCRIPTION', tableLeft + 12, headerY, {
      width: 220,
      characterSpacing: 0.5,
    });
    doc.text('PRICE', tableLeft + 240, headerY, {
      width: 80,
      align: 'right',
      characterSpacing: 0.5,
    });
    doc.text('QTY', tableLeft + 330, headerY, {
      width: 80,
      align: 'center',
      characterSpacing: 0.5,
    });
    doc.text('TOTAL', tableLeft + 420, headerY, {
      width: 70,
      align: 'right',
      characterSpacing: 0.5,
    });

    let currentY = tableTop + 28;
    doc.fillColor('#1a1a1a').font('Helvetica');

    // Table Rows with modern alternating colors
    invoice.items.forEach((item: any, index: number) => {
      const rowHeight = 28;
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';

      doc
        .rect(tableLeft, currentY, tableWidth, rowHeight)
        .fillAndStroke(rowBg, '#f3f4f6')
        .lineWidth(0.5);

      const textY = currentY + 8;

      // Description with better font
      doc
        .fontSize(9)
        .fillColor('#1a1a1a')
        .font('Helvetica')
        .text(item.productName || item.description, tableLeft + 12, textY, {
          width: 220,
        });

      // Price with subtle color
      doc
        .fillColor('#4a5568')
        .text(
          `Ksh ${item.unitPrice.toLocaleString()}`,
          tableLeft + 240,
          textY,
          { width: 80, align: 'right' },
        );

      // Quantity with badge-like styling
      doc.text(item.quantity.toString(), tableLeft + 330, textY, {
        width: 80,
        align: 'center',
      });

      // Total in bold
      doc
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text(
          `Ksh ${item.totalAmount.toLocaleString()}`,
          tableLeft + 420,
          textY,
          { width: 70, align: 'right' },
        );

      currentY += rowHeight;
    });

    return currentY + 15;
  }

  /**
   * Modern Payment Summary
   */
  private addModernPaymentSummary(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
  ): number {
    const summaryX = 360;
    let summaryY = yPos + 5;

    // Modern card with subtle shadow effect
    doc
      .roundedRect(summaryX - 12, summaryY - 12, 195, 90, 8)
      .fillAndStroke('#fafafa', '#e5e7eb')
      .lineWidth(0.5);

    doc.fontSize(9).fillColor('#4a5568').font('Helvetica');

    // Service Subtotal
    doc.text('Subtotal', summaryX, summaryY);
    doc.text(
      `Ksh ${invoice.subtotal.toLocaleString()}`,
      summaryX + 105,
      summaryY,
      { width: 70, align: 'right' },
    );
    summaryY += 16;

    // Tax if applicable
    if (invoice.taxAmount > 0) {
      doc.text('Tax', summaryX, summaryY);
      doc.text(
        `Ksh ${invoice.taxAmount.toLocaleString()}`,
        summaryX + 105,
        summaryY,
        { width: 70, align: 'right' },
      );
      summaryY += 16;
    }

    // Divider line
    doc
      .moveTo(summaryX, summaryY + 3)
      .lineTo(summaryX + 175, summaryY + 3)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();
    summaryY += 12;

    // Total Due - Modern orange and bold
    doc
      .fontSize(11)
      .fillColor('#FF6B35')
      .font('Helvetica-Bold')
      .text('Total Due', summaryX, summaryY);
    doc.text(
      `Ksh ${invoice.totalAmount.toLocaleString()}`,
      summaryX + 105,
      summaryY,
      { width: 70, align: 'right' },
    );

    summaryY += 28;

    // Amount Paid if any
    if (invoice.amountPaid > 0) {
      doc
        .fontSize(9)
        .fillColor('#4a5568')
        .font('Helvetica')
        .text('Amount Paid:', summaryX, summaryY);
      doc.text(
        `Ksh ${invoice.amountPaid.toLocaleString()}`,
        summaryX + 105,
        summaryY,
        { width: 70, align: 'right' },
      );
      summaryY += 16;

      // Balance Due
      doc
        .fillColor('#FF6B35')
        .font('Helvetica-Bold')
        .text('Balance Due:', summaryX, summaryY);
      doc.text(
        `Ksh ${invoice.balanceDue.toLocaleString()}`,
        summaryX + 105,
        summaryY,
        { width: 70, align: 'right' },
      );
      summaryY += 16;
    }

    return summaryY + 10;
  }

  /**
   * Modern Footer
   */
  private addModernFooter(
    doc: PDFKit.PDFDocument,
    invoice: any,
    yPos: number,
    settings?: any,
  ): void {
    const footerY = doc.page.height - 80;

    // Modern gradient-style separator
    doc
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .strokeColor('#FF6B35')
      .lineWidth(2)
      .stroke();

    // Footer message with modern typography
    const footerMessage =
      invoice.footerText ||
      settings?.invoiceFooterText ||
      'Looking forward to doing business with you!';

    doc
      .fontSize(11)
      .fillColor('#FF6B35')
      .font('Helvetica-Bold')
      .text(footerMessage, 50, footerY + 18, {
        align: 'center',
        width: 500,
        characterSpacing: 0.3,
      });
  }

  /**
   * Add watermark
   */
  private addWatermark(
    doc: PDFKit.PDFDocument,
    text: string,
    theme: PDFTheme,
  ): void {
    const centerX = doc.page.width / 2;
    const centerY = doc.page.height / 2;

    doc.save();
    doc
      .translate(centerX, centerY)
      .rotate(-45)
      .fontSize(60)
      .fillColor(theme.lightGray)
      .opacity(0.1)
      .text(text, -200, -30, {
        width: 400,
        align: 'center',
      });
    doc.restore();
  }
}
