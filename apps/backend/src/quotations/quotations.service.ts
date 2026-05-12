import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DocumentCounterService } from '../settings/document-counter.service';
import { QuotationDto } from './quotation.dto';
import { updateQuotationDto } from './updateQuote.dto';
import * as PDFDocument from 'pdfkit';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counterService: DocumentCounterService,
    @Inject(forwardRef(() => 'EmailsService'))
    private emailsService: any, // Inject EmailsService to avoid circular dependency
  ) {}

  async createQuotation(organizationId: number, dto: QuotationDto) {
    // Generate sequential quotation number using counter service
    const referenceNumber = await this.generateReferenceNumber(organizationId);

    // Verify customer belongs to organization
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer not found in this organization`);
    }

    // Create the quotation with sendEmail flag
    const quotation = await this.prisma.quotation.create({
      data: {
        organizationId,
        referenceNumber,
        customerId: dto.customerId,
        items: dto.items,
        totalAmount: dto.totalAmount,
        totalTax: dto.totalTax,
        status: 'pending',
        sendEmail: dto.sendEmail,
      },
    });

    // If sendEmail is true, send the quotation via email asynchronously
    if (dto.sendEmail === true) {
      console.log(`Auto-sending quotation ${quotation.id} via email...`);

      // Send email in the background without waiting for it
      Promise.resolve().then(async () => {
        try {
          await this.emailsService.sendQuotation(
            organizationId,
            quotation.id,
            undefined, // Let the email service resolve the recipient
          );
          console.log(`Quotation ${quotation.id} sent via email successfully`);
        } catch (error) {
          console.error(
            `Failed to send quotation ${quotation.id} via email:`,
            error,
          );
        }
      });
    }

    return quotation;
  }

  private async generateReferenceNumber(
    organizationId: number,
  ): Promise<string> {
    // Use counter service for sequential numbering per organization
    return this.counterService.generateDocumentNumber(
      organizationId,
      'QUOTATION',
      'QUO',
      {
        includeYear: true,
        includeMonth: false,
        separator: '-',
        sequenceLength: 5,
      },
    );
  }

  async getAllQuotations(organizationId: number) {
    return this.prisma.quotation.findMany({
      where: { organizationId },
    });
  }

  async getPendingQuotations(organizationId: number) {
    return this.prisma.quotation.findMany({
      where: {
        organizationId,
        status: 'pending',
      },
    });
  }

  async getQuotationById(organizationId: number, id: number) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID ${id} not found in this organization`,
      );
    }

    return quotation;
  }

  async updateQuotation(
    organizationId: number,
    id: number,
    dto: updateQuotationDto,
  ) {
    const existingQuotation = await this.getQuotationById(organizationId, id);

    // If updating customer, verify new customer belongs to organization
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          organizationId,
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer not found in this organization`);
      }
    }

    const updatedData: any = {
      customerId: dto.customerId ?? existingQuotation.customerId,
      items: dto.items ?? existingQuotation.items,
      totalAmount: dto.totalAmount ?? existingQuotation.totalAmount,
      updatedAt: new Date(),
    };

    // Handle sendEmail flag if provided in update
    if (dto.sendEmail !== undefined) {
      updatedData.sendEmail = dto.sendEmail;
    }

    const updatedQuotation = await this.prisma.quotation.update({
      where: {
        id,
        organizationId,
      },
      data: updatedData,
    });

    // If sendEmail is being set to true in the update, send the email
    if (dto.sendEmail === true && existingQuotation.sendEmail !== true) {
      console.log(`Auto-sending updated quotation ${id} via email...`);

      const customer = await this.prisma.customer.findFirst({
        where: {
          id: updatedQuotation.customerId,
          organizationId,
        },
      });

      // Send email in the background without waiting for it
      Promise.resolve().then(async () => {
        try {
          await this.emailsService.sendQuotation(
            organizationId,
            id,
            customer?.email,
          );
          console.log(`Updated quotation ${id} sent via email successfully`);
        } catch (error) {
          console.error(
            `Failed to send updated quotation ${id} via email:`,
            error,
          );
        }
      });
    }

    return updatedQuotation;
  }

  async deleteQuotation(organizationId: number, id: number) {
    await this.getQuotationById(organizationId, id);

    return this.prisma.quotation.delete({
      where: {
        id,
        organizationId,
      },
    });
  }

  async approveQuotation(organizationId: number, id: number) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID ${id} not found in this organization`,
      );
    }

    if (quotation.status === 'approved') {
      throw new Error('Quotation is already approved');
    }

    const updatedQuotation = await this.prisma.quotation.update({
      where: {
        id,
        organizationId,
      },
      data: {
        status: 'approved',
        updatedAt: new Date(),
      },
    });

    // If the quotation has sendEmail flag set to true, send approval notification
    if (quotation.sendEmail === true) {
      console.log(`Auto-sending approved quotation ${id} via email...`);

      const customer = await this.prisma.customer.findFirst({
        where: {
          id: quotation.customerId,
          organizationId,
        },
      });

      // Send email in the background without waiting for it
      Promise.resolve().then(async () => {
        try {
          await this.emailsService.sendQuotation(
            organizationId,
            id,
            customer?.email,
          );
          console.log(`Approved quotation ${id} sent via email successfully`);
        } catch (error) {
          console.error(
            `Failed to send approved quotation ${id} via email:`,
            error,
          );
        }
      });
    }

    return updatedQuotation;
  }

  async getQuotationsByDateRange(
    organizationId: number,
    startDate: Date,
    endDate: Date,
    search?: string,
  ) {
    const whereClause: any = {
      organizationId,
    };

    // Only add date filters if NOT searching
    if (!search) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Add search if provided
    if (search) {
      // Clean up search term - remove # and trim whitespace
      const cleanSearch = search.trim().replace(/^#/, '');

      const searchConditions: any[] = [
        {
          referenceNumber: {
            contains: cleanSearch,
            mode: 'insensitive',
          },
        },
      ];

      // If search term is a number, also search by quotation ID
      const searchNumber = parseInt(cleanSearch, 10);
      if (!isNaN(searchNumber)) {
        searchConditions.push({
          id: searchNumber,
        });
      }

      // Search by customer name through relation
      searchConditions.push({
        customer: {
          fullName: {
            contains: cleanSearch,
            mode: 'insensitive',
          },
        },
      });

      whereClause.OR = searchConditions;
    }

    return this.prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            customerType: true,
            kraPin: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Method to manually trigger email sending for existing quotations
  async sendQuotationEmail(
    organizationId: number,
    quotationId: number,
    customEmail?: string,
  ) {
    const quotation = await this.getQuotationById(organizationId, quotationId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: quotation.customerId,
        organizationId,
      },
    });

    const emailTo = customEmail || customer?.email;

    if (!emailTo) {
      throw new Error('No email address found for customer');
    }

    try {
      await this.emailsService.sendQuotation(
        organizationId,
        quotationId,
        emailTo,
      );

      // Update the quotation to mark that email was sent
      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { sendEmail: true },
      });

      return {
        success: true,
        message: 'Quotation sent via email successfully',
      };
    } catch (error) {
      console.error('Failed to send quotation email:', error);
      throw new Error('Failed to send quotation via email');
    }
  }

  // Updated generateQuotationPDF method with logo and VAT support
  async generateQuotationPDF(
    organizationId: number,
    quotationId: number,
  ): Promise<Buffer> {
    // Get quotation data
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        organizationId,
      },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID ${quotationId} not found in this organization`,
      );
    }

    // Get customer, organization details, and settings
    const [customer, organization, settings] = await Promise.all([
      this.prisma.customer.findFirst({
        where: {
          id: quotation.customerId,
          organizationId,
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
      }),
      this.prisma.organizationSettings.findUnique({
        where: { organizationId },
      }),
    ]);

    // Parse and format items using utility methods
    const parsedItems = this.parseQuotationItems(quotation.items);
    const items = this.formatQuotationItems(parsedItems);

    // Calculate VAT and totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vatRate = 0.16; // 16% VAT (configurable)
    const vatAmount = 0;
    // const vatAmount = subtotal * vatRate;
    const totalWithVat = subtotal + vatAmount;

    // Prepare data for PDF
    const pdfData = {
      quotationNumber: quotation.referenceNumber,
      date: quotation.createdAt,
      status: quotation.status,
      organizationLogoUrl: organization?.logoUrl || null,
      organizationName: organization?.name || '',
      organizationAddress: organization?.address || '',
      organizationContact: organization?.contact || '',
      organizationPaymentDetails: {
        mpesaDetails: this.parsePaymentDetails(organization?.mpesaDetails),
        bankDetails: this.parsePaymentDetails(organization?.bankDetails),
      },
      customer: {
        name: customer?.fullName || 'Unknown Customer',
        phone: customer?.phoneNumber || '',
        email: customer?.email || '',
      },
      items,
      subtotal,
      vatRate,
      vatAmount,
      total: totalWithVat,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      settings, // Pass settings to PDF generator
    };

    return this.generateQuotationPDFDocument(pdfData);
  }

  // Updated getPrintableQuotationData method with VAT calculations
  async getPrintableQuotationData(organizationId: number, quotationId: number) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        organizationId,
      },
    });

    if (!quotation) {
      throw new NotFoundException(
        `Quotation with ID ${quotationId} not found in this organization`,
      );
    }

    const [customer, organization] = await Promise.all([
      this.prisma.customer.findFirst({
        where: {
          id: quotation.customerId,
          organizationId,
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
      }),
    ]);

    // Parse and format items using utility methods
    const parsedItems = this.parseQuotationItems(quotation.items);
    const mappedItems = this.formatQuotationItems(parsedItems);

    // Calculate VAT and totals
    const subtotal = mappedItems.reduce((sum, item) => sum + item.total, 0);
    const vatRate = 0.16;
    // const vatAmount = subtotal * vatRate;
    const vatAmount = 0;
    const totalWithVat = subtotal + vatAmount;

    return {
      quotationNumber: quotation.referenceNumber,
      date: quotation.createdAt,
      status: quotation.status,
      organizationName: organization?.name || 'Your Business',
      organizationAddress: organization?.address || '',
      organizationContact: organization?.contact || '',
      customer: {
        name: customer?.fullName || 'Unknown Customer',
        phone: customer?.phoneNumber || '',
        email: customer?.email || '',
      },
      items: mappedItems,
      subtotal,
      vatRate,
      vatAmount,
      total: totalWithVat,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Download image from URL and return as Buffer
   */
  private async downloadImage(url: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      const client = url.startsWith('https:') ? https : http;

      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.warn(`Failed to download image: ${response.statusCode}`);
          resolve(null);
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', () => resolve(null));
      });

      request.on('error', () => resolve(null));
      request.setTimeout(10000, () => {
        request.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Enhanced PDF generation with logo and VAT support
   */
  private async generateQuotationPDFDocument(data: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Colors and styling
      const primaryColor = '#28a745';
      const darkGray = '#333333';
      const lightGray = '#666666';
      const bgGray = '#f8f9fa';

      let currentY = 50;

      // Header Section with Logo
      if (data.organizationLogoUrl) {
        try {
          const logoBuffer = await this.downloadImage(data.organizationLogoUrl);
          if (logoBuffer) {
            // Add logo (top-left)
            doc.image(logoBuffer, 50, currentY, {
              width: 80,
              height: 60,
              fit: [80, 60],
            });

            // Organization name next to logo
            doc
              .fontSize(18)
              .fillColor(primaryColor)
              .text(data.organizationName, 145, currentY + 10, {
                width: 350,
              });

            doc
              .fontSize(10)
              .fillColor(lightGray)
              .text(data.organizationAddress, 145, currentY + 35, {
                width: 350,
              })
              .text(data.organizationContact, 145, currentY + 50, {
                width: 350,
              });

            currentY += 85;
          } else {
            // Fallback if logo download fails
            this.renderHeaderWithoutLogo(
              doc,
              data,
              currentY,
              primaryColor,
              lightGray,
            );
            currentY += 65;
          }
        } catch (error) {
          console.warn('Error loading logo:', error);
          this.renderHeaderWithoutLogo(
            doc,
            data,
            currentY,
            primaryColor,
            lightGray,
          );
          currentY += 65;
        }
      } else {
        // No logo - center aligned header
        this.renderHeaderWithoutLogo(
          doc,
          data,
          currentY,
          primaryColor,
          lightGray,
        );
        currentY += 65;
      }

      // Quotation Title
      doc
        .fontSize(24)
        .fillColor(primaryColor)
        .text('QUOTATION', 50, currentY, { align: 'center', width: 500 });

      currentY += 35;

      // Horizontal line separator
      doc
        .moveTo(50, currentY)
        .lineTo(550, currentY)
        .strokeColor('#e2e8f0')
        .stroke();
      currentY += 20;

      // Quotation Details and Customer Info
      const detailsBoxHeight = 120;

      // Quotation Details Box (Left)
      doc
        .rect(50, currentY, 240, detailsBoxHeight)
        .fillAndStroke(bgGray, darkGray);
      doc
        .fillColor(darkGray)
        .fontSize(12)
        .text('Quotation Details', 60, currentY + 10);

      doc
        .fontSize(10)
        .text(`Quotation Number: ${data.quotationNumber}`, 60, currentY + 30)
        .text(
          `Date: ${new Date(data.date).toLocaleDateString()}`,
          60,
          currentY + 45,
        )
        .text(`Status: ${data.status.toUpperCase()}`, 60, currentY + 60)
        .text(
          `Valid Until: ${data.validUntil.toLocaleDateString()}`,
          60,
          currentY + 75,
        )
        .text(
          `VAT Rate: ${(data.vatRate * 100).toFixed(0)}%`,
          60,
          currentY + 90,
        );

      // Customer Details Box (Right)
      doc
        .rect(310, currentY, 240, detailsBoxHeight)
        .fillAndStroke(bgGray, darkGray);
      doc
        .fillColor(darkGray)
        .fontSize(12)
        .text('Customer Information', 320, currentY + 10);

      doc
        .fontSize(10)
        .text(`Name: ${data.customer.name}`, 320, currentY + 30)
        .text(`Phone: ${data.customer.phone || 'N/A'}`, 320, currentY + 45)
        .text(`Email: ${data.customer.email || 'N/A'}`, 320, currentY + 60);

      currentY += detailsBoxHeight + 30;

      // Items Table
      const tableLeft = 50;
      const tableWidth = 500;
      const colWidths = [200, 60, 80, 80, 80]; // Description, Qty, Unit Price, VAT, Total

      // Table Header
      doc
        .rect(tableLeft, currentY, tableWidth, 25)
        .fillAndStroke(primaryColor, primaryColor);

      let xPos = tableLeft + 10;
      doc
        .fillColor('white')
        .fontSize(10)
        .text('Description', xPos, currentY + 8);

      xPos += colWidths[0];
      doc.text('Qty', xPos, currentY + 8);

      xPos += colWidths[1];
      doc.text('Unit Price', xPos, currentY + 8);

      // xPos += colWidths[2];
      // doc.text('VAT', xPos, currentY + 8);

      xPos += colWidths[3];
      doc.text('Total', xPos, currentY + 8);

      currentY += 25;

      // Table Rows
      doc.fillColor(darkGray);
      data.items.forEach((item: any, index: number) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : bgGray;
        doc
          .rect(tableLeft, currentY, tableWidth, 25)
          .fillAndStroke(rowBg, '#e9ecef');

        // const itemVat = item.total * data.vatRate;

        let xPos = tableLeft + 10;
        doc
          .fillColor(darkGray)
          .fontSize(9)
          .text(item.description, xPos, currentY + 8, {
            width: colWidths[0] - 10,
          });

        xPos += colWidths[0];
        doc.text(item.quantity.toString(), xPos, currentY + 8);

        xPos += colWidths[1];
        doc.text(`${item.unitPrice.toFixed(2)}`, xPos, currentY + 8);

        // xPos += colWidths[2];
        // doc.text(`${itemVat.toFixed(2)}`, xPos, currentY + 8);

        xPos += colWidths[3];
        doc.text(`${item.total.toFixed(2)}`, xPos, currentY + 8);

        currentY += 25;
      });

      currentY += 20;

      // Enhanced Totals Section
      const totalsX = 300;
      const totalsWidth = 250;

      // Subtotal
      doc
        .rect(totalsX, currentY, totalsWidth, 20)
        .fillAndStroke('#f8f9fa', '#dee2e6');
      doc
        .fillColor(darkGray)
        .fontSize(10)
        .text('Subtotal:', totalsX + 10, currentY + 6)
        .text(`KES ${data.subtotal.toFixed(2)}`, totalsX + 150, currentY + 6);

      currentY += 20;

      // VAT
      doc
        .rect(totalsX, currentY, totalsWidth, 20)
        .fillAndStroke('#f8f9fa', '#dee2e6');
      doc
        .fillColor(darkGray)
        .fontSize(10)
        .text(
          `VAT (${(data.vatRate * 100).toFixed(0)}%):`,
          totalsX + 10,
          currentY + 6,
        )
        .text(`KES ${data.vatAmount.toFixed(2)}`, totalsX + 150, currentY + 6);

      currentY += 20;

      // Total
      doc
        .rect(totalsX, currentY, totalsWidth, 25)
        .fillAndStroke(primaryColor, primaryColor);
      doc
        .fillColor('white')
        .fontSize(12)
        .text('Total Amount:', totalsX + 10, currentY + 7)
        .text(`KES ${data.total.toFixed(2)}`, totalsX + 150, currentY + 7);

      currentY += 45;

      // Payment Information Section
      if (
        data.organizationPaymentDetails &&
        (data.organizationPaymentDetails.mpesaDetails ||
          data.organizationPaymentDetails.bankDetails)
      ) {
        doc
          .fillColor(primaryColor)
          .fontSize(14)
          .text('Payment Information', 50, currentY);

        currentY += 25;

        // M-PESA Payments
        if (data.organizationPaymentDetails.mpesaDetails) {
          const mpesaDetails = data.organizationPaymentDetails.mpesaDetails;

          doc
            .fontSize(11)
            .fillColor(darkGray)
            .text('M-PESA Payments:', 50, currentY);

          currentY += 20;

          if (mpesaDetails.businessNumber) {
            doc
              .fontSize(10)
              .text(`• Paybill: ${mpesaDetails.businessNumber}`, 70, currentY);
            currentY += 15;
          }

          if (mpesaDetails.tillNumber) {
            doc.text(`• Till Number: ${mpesaDetails.tillNumber}`, 70, currentY);
            currentY += 15;
          }

          if (mpesaDetails.accountNumber) {
            doc.text(`• Account: ${mpesaDetails.accountNumber}`, 70, currentY);
            currentY += 15;
          }

          currentY += 10;
        }

        // Bank Details
        if (data.organizationPaymentDetails.bankDetails) {
          const bankDetails = data.organizationPaymentDetails.bankDetails;

          doc
            .fontSize(11)
            .fillColor(darkGray)
            .text('Bank Transfer:', 50, currentY);

          currentY += 20;

          if (bankDetails.bankName) {
            doc
              .fontSize(10)
              .text(`• Bank: ${bankDetails.bankName}`, 70, currentY);
            currentY += 15;
          }

          if (bankDetails.accountNumber) {
            doc.text(
              `• Account Number: ${bankDetails.accountNumber}`,
              70,
              currentY,
            );
            currentY += 15;
          }

          if (bankDetails.accountName) {
            doc.text(
              `• Account Name: ${bankDetails.accountName}`,
              70,
              currentY,
            );
            currentY += 15;
          }
        }

        currentY += 20;
      }

      // Terms & Conditions
      doc
        .fillColor(primaryColor)
        .fontSize(12)
        .text('Terms & Conditions', 50, currentY);

      currentY += 20;

      // Use custom terms or default
      const termsText =
        data.settings?.quotationTerms ||
        '• This quotation is valid for 30 days from the date of issue\n' +
          '• Prices are inclusive of VAT where applicable\n' +
          '• Payment terms to be agreed upon order confirmation\n' +
          '• Delivery terms and conditions apply';

      const termsLines = termsText.split('\n');

      termsLines.forEach((term: string) => {
        const trimmedTerm = term.trim();
        if (trimmedTerm) {
          const displayTerm = trimmedTerm.startsWith('•')
            ? trimmedTerm
            : '• ' + trimmedTerm;
          doc.fontSize(9).fillColor(lightGray).text(displayTerm, 50, currentY);
          currentY += 15;
        }
      });

      // Notes section (if available)
      if (data.settings?.quotationNotes) {
        currentY += 10;
        doc.fillColor(primaryColor).fontSize(12).text('Notes', 50, currentY);

        currentY += 15;
        doc
          .fontSize(9)
          .fillColor(lightGray)
          .text(data.settings.quotationNotes, 50, currentY, { width: 500 });
      }

      // Footer
      const footerY = doc.page.height - 100;

      // Use custom footer or default
      const footerMessage =
        data.settings?.quotationFooterText ||
        'Thank you for choosing our services!';

      doc.fillColor(lightGray).fontSize(10).text(footerMessage, 50, footerY, {
        align: 'center',
        width: 500,
      });

      doc.end();
    });
  }

  /**
   * Render header without logo (fallback)
   */
  private renderHeaderWithoutLogo(
    doc: any,
    data: any,
    currentY: number,
    primaryColor: string,
    lightGray: string,
  ) {
    doc
      .fontSize(20)
      .fillColor(primaryColor)
      .text(data.organizationName, 50, currentY, {
        align: 'center',
        width: 500,
      });

    doc
      .fontSize(10)
      .fillColor(lightGray)
      .text(data.organizationAddress, 50, currentY + 25, {
        align: 'center',
        width: 500,
      })
      .text(data.organizationContact, 50, currentY + 40, {
        align: 'center',
        width: 500,
      });
  }

  /**
   * Safe parser for payment details
   */
  private parsePaymentDetails(paymentDetails: any): any {
    if (!paymentDetails) {
      return null;
    }

    if (typeof paymentDetails === 'object') {
      return paymentDetails;
    }

    if (typeof paymentDetails === 'string') {
      const trimmed = paymentDetails.trim();
      if (!trimmed) {
        return null;
      }

      try {
        return JSON.parse(trimmed);
      } catch (jsonError) {
        try {
          const result: any = {};
          const lines = trimmed.split(/\r?\n/);

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            const colonIndex = cleanLine.indexOf(':');
            if (colonIndex > 0) {
              const key = cleanLine
                .substring(0, colonIndex)
                .trim()
                .toLowerCase();
              const value = cleanLine.substring(colonIndex + 1).trim();

              switch (key) {
                case 'paybill':
                case 'business number':
                case 'businessnumber':
                  result.businessNumber = value;
                  break;
                case 'till number':
                case 'tillnumber':
                case 'till':
                  result.tillNumber = value;
                  break;
                case 'account':
                case 'account number':
                case 'accountnumber':
                  result.accountNumber = value;
                  break;
                case 'business name':
                case 'businessname':
                case 'name':
                  result.businessName = value;
                  break;
                case 'bank':
                case 'bank name':
                case 'bankname':
                  result.bankName = value;
                  break;
                case 'account name':
                case 'accountname':
                  result.accountName = value;
                  break;
                default:
                  const camelKey = key
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .replace(/^\w/, (c) => c.toLowerCase());
                  result[camelKey] = value;
                  break;
              }
            }
          }

          return Object.keys(result).length > 0 ? result : null;
        } catch (parseError) {
          console.warn(
            'Failed to parse payment details:',
            paymentDetails,
            parseError,
          );
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Safely parse quotation items - handles both string and array formats
   */
  private parseQuotationItems(items: any): any[] {
    try {
      if (typeof items === 'string') {
        // If items is a JSON string, parse it
        return JSON.parse(items);
      } else if (Array.isArray(items)) {
        // If items is already an array, use it directly
        return items;
      } else {
        // Fallback to empty array if items is neither string nor array
        console.warn('Quotation items is neither string nor array:', items);
        return [];
      }
    } catch (parseError) {
      console.error('Failed to parse quotation items:', parseError);
      // Fallback to empty array if parsing fails
      return [];
    }
  }

  /**
   * Format parsed items for PDF/display
   */
  private formatQuotationItems(parsedItems: any[]): any[] {
    const items = parsedItems.map((item) => ({
      description: item.name || item.description || 'Item',
      quantity: item.quantity || item.selectedItems || 1,
      unitPrice: item.price || item.unitPrice || 0,
      total:
        (item.quantity || item.selectedItems || 1) *
        (item.price || item.unitPrice || 0),
    }));

    // If no items found, add a placeholder
    if (items.length === 0) {
      items.push({
        description: 'No items found',
        quantity: 0,
        unitPrice: 0,
        total: 0,
      });
    }

    return items;
  }

  /**
   * Convert an approved quotation into a credit sale (invoice)
   */
  async convertQuotationToCreditSale(
    organizationId: number,
    quotationId: number,
    additionalData?: {
      payment_date?: Date;
      payment_terms?: string;
      order_remarks?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get the quotation
      const quotation = await tx.quotation.findFirst({
        where: {
          id: quotationId,
          organizationId,
        },
      });

      if (!quotation) {
        throw new NotFoundException(
          `Quotation with ID ${quotationId} not found in this organization`,
        );
      }

      // Check if quotation is approved
      if (quotation.status !== 'approved') {
        throw new Error(
          'Only approved quotations can be converted to credit sales',
        );
      }

      // Create credit sale from quotation data
      const creditSale = await tx.creditSale.create({
        data: {
          organizationId,
          customer_id: quotation.customerId,
          customer_name: '', // Will be filled from customer data
          items: quotation.items, // Use the same items structure
          credit_amount: quotation.totalAmount,
          order_date: new Date(),
          payment_date:
            additionalData?.payment_date ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          created_by: 'system',
          amount_paid: 0,
          fully_paid: 0,
          vat_amount: quotation.totalTax || 0,
          discount_amount: 0,
          payment_terms: additionalData?.payment_terms || '30 Days',
          order_remarks:
            additionalData?.order_remarks ||
            `Converted from quotation ${quotation.referenceNumber}`,
          sendEmail: quotation.sendEmail,
        },
      });

      // Get customer details and update customer name in credit sale
      const customer = await tx.customer.findFirst({
        where: {
          id: quotation.customerId,
          organizationId,
        },
      });

      if (customer) {
        await tx.creditSale.update({
          where: { id: creditSale.id },
          data: {
            customer_name: customer.fullName,
            phone_number: customer.phoneNumber,
          },
        });

        // Update customer's due credit
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            dueCredit: (customer.dueCredit || 0) + quotation.totalAmount,
          },
        });
      }

      // Update quotation status to converted
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: 'converted',
          updatedAt: new Date(),
        },
      });

      return {
        creditSale,
        quotation,
        message: `Quotation ${quotation.referenceNumber} converted to credit sale successfully`,
      };
    });
  }
}
