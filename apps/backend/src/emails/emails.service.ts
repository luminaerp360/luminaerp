// emails.service.ts - Updated to use CreditService for PDF generation
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailOptions } from './email-options.interface';
import { PrismaService } from '../prisma/prisma.service';

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => 'CreditService'))
    private creditService: any, // Use forwardRef to avoid circular dependency
    @Inject(forwardRef(() => 'QuotationsService'))
    private quotationsService: any, // Inject QuotationsService
  ) {
    this.createTransporter();
  }

  // Send quotation via email with PDF attachment
  async sendQuotation(
    organizationId: number,
    quotationId: number,
    to?: string,
  ): Promise<boolean> {
    try {
      console.log(`Generating quotation PDF for quotation ${quotationId}...`);

      // Generate PDF using QuotationsService
      const pdfBuffer = await this.quotationsService.generateQuotationPDF(
        organizationId,
        quotationId,
      );

      console.log(
        `Quotation PDF generated successfully, size: ${pdfBuffer.length} bytes`,
      );

      // Get the quotation details
      const quotation = await this.prisma.quotation.findFirst({
        where: {
          id: quotationId,
          organizationId,
        },
      });

      if (!quotation) {
        console.error(`Quotation ${quotationId} not found`);
        return false;
      }

      // Get customer email
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: quotation.customerId,
          organizationId,
        },
      });

      const customerEmail = to || customer?.email || 'shaphankirui@gmail.com';
      console.log(`Sending quotation with PDF attachment to: ${customerEmail}`);

      // Create email content with PDF attachment
      const emailOptions: EmailOptions = {
        to: customerEmail,
        subject: `Quotation ${quotation.referenceNumber} from DASA DOVE ENTERPRISES`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px; background-color: #f8f9fa; padding: 20px;">
              <h2 style="color: #28a745; margin: 0;">DASA DOVE ENTERPRISES</h2>
              <p style="margin: 5px 0; color: #666;">P.O BOX 3818-30200, KITALE</p>
              <p style="margin: 5px 0; color: #666;">Phone: 0726738023</p>
            </div>
            
            <div style="padding: 20px;">
              <h1 style="color: #333;">Quotation ${quotation.referenceNumber}</h1>
              <p>Dear ${customer?.fullName || 'Valued Customer'},</p>
              <p>Please find attached our quotation dated ${new Date(quotation.createdAt).toLocaleDateString()}.</p>
              
              <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="margin: 0; color: #155724;">Quotation Summary</h3>
                <p style="margin: 10px 0;"><strong>Total Amount: KES ${quotation.totalAmount.toFixed(2)}</strong></p>
                <p style="margin: 5px 0;">Status: ${quotation.status.toUpperCase()}</p>
                <p style="margin: 5px 0;">Valid Until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0;"><strong>📎 Complete Quotation PDF Attached</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">Your detailed quotation with payment methods and instructions is attached as a PDF file.</p>
              </div>
              
              <div style="background-color: #cce5ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h4 style="margin: 0 0 10px 0; color: #004085;">Payment Methods</h4>
                <p style="margin: 5px 0; font-size: 14px;"><strong>M-PESA:</strong> Check attached PDF for payment details</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Bank Transfer:</strong> Complete banking details in attached PDF</p>
                <p style="margin: 5px 0; font-size: 14px; font-style: italic;">All payment instructions are included in the attached quotation.</p>
              </div>
              
              <p>We look forward to doing business with you!</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
                <p><strong>For any queries, please contact us at:</strong></p>
                <p>Email: dasadoveenterprises@gmail.com</p>
                <p>Phone: 0726738023</p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Quotation-${quotation.referenceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await this.sendEmail(emailOptions);
      console.log(
        `Quotation email with PDF attachment sending result for quotation ${quotationId}:`,
        result,
      );
      return result;
    } catch (error) {
      console.error('Failed to send quotation with PDF:', error);
      return false;
    }
  }

  // Test email with quotation PDF attachment
  async sendTestQuotationEmail(
    organizationId: number,
    quotationId: number,
    to: string = 'shaphankirui@gmail.com',
  ): Promise<boolean> {
    try {
      // Generate a test quotation PDF
      const pdfBuffer = await this.quotationsService.generateQuotationPDF(
        organizationId,
        quotationId,
      );

      const quotation = await this.prisma.quotation.findFirst({
        where: {
          id: quotationId,
          organizationId,
        },
      });

      const options: EmailOptions = {
        to,
        subject:
          'Test Quotation Email with PDF Attachment - DASA DOVE ENTERPRISES',
        html: `
          <h1>Test Quotation Email with PDF</h1>
          <p>This is a test email with quotation PDF attachment.</p>
          <p>Quotation Number: ${quotation?.referenceNumber || 'N/A'}</p>
          <p>PDF should be attached to this email with all quotation details and payment information.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `,
        attachments: [
          {
            filename: `Test-Quotation-${quotation?.referenceNumber || quotationId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      return this.sendEmail(options);
    } catch (error) {
      console.error('Failed to send test quotation email with PDF:', error);
      return false;
    }
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT') || '587'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');

      const result = await this.transporter.sendMail({
        from: {
          name: 'Lumina 360',
          address: options.from || this.configService.get('SMTP_FROM_EMAIL'),
        },
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      console.error('SMTP Config:', {
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT'),
        secure: this.configService.get('SMTP_SECURE'),
        user: this.configService.get('SMTP_USER'),
      });
      return false;
    }
  }

  // Updated method to send credit sale invoice WITH full PDF attachment including payment details
  async sendCreditSaleInvoice(
    organizationId: number,
    creditSaleId: number,
    format: 'invoice' | 'receipt' = 'invoice',
  ): Promise<boolean> {
    try {
      console.log(
        `Generating PDF with payment details for credit sale ${creditSaleId}...`,
      );

      // Use CreditService's PDF generation method which includes all payment details
      const pdfBuffer = await this.creditService.generateCreditSaleInvoicePDF(
        organizationId,
        creditSaleId,
        format,
      );

      console.log(
        `PDF generated successfully with payment details, size: ${pdfBuffer.length} bytes`,
      );

      // Get the credit sale details
      const creditSale = await this.prisma.creditSale.findFirst({
        where: {
          id: creditSaleId,
          organizationId,
        },
      });

      if (!creditSale) {
        console.error(`Credit sale ${creditSaleId} not found`);
        return false;
      }

      // Get customer email
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: creditSale.customer_id,
          organizationId,
        },
      });

      const customerEmail = customer?.email || 'shaphankirui@gmail.com';
      console.log(
        `Sending invoice with full PDF attachment (including payment details) to: ${customerEmail}`,
      );

      // Create email content with PDF attachment
      const emailOptions: EmailOptions = {
        to: customerEmail,
        subject: `Invoice #CR-${creditSaleId} from DASA DOVE ENTERPRISES`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px; background-color: #f8f9fa; padding: 20px;">
              <h2 style="color: #2E5984; margin: 0;">DASA DOVE ENTERPRISES</h2>
              <p style="margin: 5px 0; color: #666;">P.O BOX 3818-30200, KITALE</p>
              <p style="margin: 5px 0; color: #666;">Phone: 0726738023</p>
            </div>
            
            <div style="padding: 20px;">
              <h1 style="color: #333;">Invoice #CR-${creditSaleId}</h1>
              <p>Dear ${creditSale.customer_name},</p>
              <p>Please find attached your detailed invoice dated ${new Date(creditSale.createdAt).toLocaleDateString()}.</p>
              
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0; color: #1976d2;">Invoice Summary</h3>
                <p style="margin: 10px 0;"><strong>Total Amount: KES ${creditSale.credit_amount.toFixed(2)}</strong></p>
                <p style="margin: 5px 0;">Order Date: ${creditSale.order_date ? new Date(creditSale.order_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0;"><strong>📎 Complete Invoice PDF Attached</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">Your detailed invoice with payment methods and instructions is attached as a PDF file.</p>
              </div>
              
              <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h4 style="margin: 0 0 10px 0; color: #155724;">Payment Methods</h4>
                <p style="margin: 5px 0; font-size: 14px;"><strong>M-PESA:</strong> Check attached PDF for payment details</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Bank Transfer:</strong> Complete banking details in attached PDF</p>
                <p style="margin: 5px 0; font-size: 14px; font-style: italic;">All payment instructions are included in the attached invoice.</p>
              </div>
              
              <p>Thank you for your business!</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
                <p><strong>For any queries, please contact us at:</strong></p>
                <p>Email: dasadoveenterprises@gmail.com</p>
                <p>Phone: 0726738023</p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Invoice-CR-${creditSaleId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await this.sendEmail(emailOptions);
      console.log(
        `Email with complete PDF attachment (including payment details) sending result for credit sale ${creditSaleId}:`,
        result,
      );
      return result;
    } catch (error) {
      console.error(
        'Failed to send credit sale invoice with complete PDF:',
        error,
      );
      return false;
    }
  }

  // Send email with custom PDF attachment
  async sendEmailWithPDFAttachment(
    to: string,
    subject: string,
    htmlContent: string,
    pdfBuffer: Buffer,
    pdfFilename: string,
  ): Promise<boolean> {
    const emailOptions: EmailOptions = {
      to,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    return this.sendEmail(emailOptions);
  }

  // Keep the deprecated method for backward compatibility
  async sendInvoiceEmail(invoice: InvoiceData): Promise<boolean> {
    console.log('Using legacy sendInvoiceEmail method');

    const emailOptions: EmailOptions = {
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h1>Invoice ${invoice.invoiceNumber}</h1>
          <p>Date: ${invoice.date.toLocaleDateString()}</p>
          <p>Customer: ${invoice.customerName}</p>
          <p>Total: ${invoice.total.toFixed(2)}</p>
          ${invoice.notes ? `<p>Notes: ${invoice.notes}</p>` : ''}
        </div>
      `,
    };

    return this.sendEmail(emailOptions);
  }

  // Test email method
  async sendTestEmail(to: string = 'shaphankirui@gmail.com'): Promise<boolean> {
    const options: EmailOptions = {
      to,
      subject: 'Test Email from DASA DOVE ENTERPRISES',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify SMTP configuration.</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `,
    };
    return this.sendEmail(options);
  }

  // Test email with PDF attachment using CreditService
  async sendTestEmailWithPDF(
    organizationId: number,
    creditSaleId: number,
    to: string = 'shaphankirui@gmail.com',
  ): Promise<boolean> {
    try {
      // Generate a test PDF using CreditService (includes payment details)
      const pdfBuffer = await this.creditService.generateCreditSaleInvoicePDF(
        organizationId,
        creditSaleId,
        'invoice',
      );

      const options: EmailOptions = {
        to,
        subject:
          'Test Email with Complete PDF Attachment - DASA DOVE ENTERPRISES',
        html: `
          <h1>Test Email with Complete PDF</h1>
          <p>This is a test email with complete PDF attachment including payment details.</p>
          <p>PDF should be attached to this email with all payment information.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `,
        attachments: [
          {
            filename: `Test-Complete-Invoice-CR-${creditSaleId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      return this.sendEmail(options);
    } catch (error) {
      console.error('Failed to send test email with complete PDF:', error);
      return false;
    }
  }

  // Send customer statement via email
  async sendCustomerStatement(
    organizationId: number,
    customerId: number,
    startDateStr: string,
    endDateStr: string,
    options: { includePaymentHistory?: boolean } = {},
    to?: string,
  ): Promise<boolean> {
    try {
      console.log(
        `Generating customer statement PDF for customer ${customerId}...`,
      );

      // Use CreditService's statement PDF generation
      const pdfBuffer = await this.creditService.generateCustomerStatementPDF(
        organizationId,
        customerId,
        startDateStr,
        endDateStr,
        options,
      );

      // Get customer details for email
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: customerId,
          organizationId,
        },
      });

      const customerEmail = to || customer?.email || 'shaphankirui@gmail.com';

      const emailOptions: EmailOptions = {
        to: customerEmail,
        subject: `Credit Statement - ${customer?.fullName || 'Customer'} - DASA DOVE ENTERPRISES`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px; background-color: #f8f9fa; padding: 20px;">
              <h2 style="color: #2E5984; margin: 0;">DASA DOVE ENTERPRISES</h2>
              <p style="margin: 5px 0; color: #666;">P.O BOX 3818-30200, KITALE</p>
              <p style="margin: 5px 0; color: #666;">Phone: 0726738023</p>
            </div>
            
            <div style="padding: 20px;">
              <h1 style="color: #333;">Customer Credit Statement</h1>
              <p>Dear ${customer?.fullName || 'Valued Customer'},</p>
              <p>Please find attached your credit statement for the period ${startDateStr} to ${endDateStr}.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 0;"><strong>📊 Complete Statement PDF Attached</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">Your detailed credit statement with payment history is attached.</p>
              </div>
              
              <p>Thank you for your continued business!</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
                <p><strong>For any queries, please contact us at:</strong></p>
                <p>Email: dasadoveenterprises@gmail.com</p>
                <p>Phone: 0726738023</p>
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Statement-${customer?.fullName || 'Customer'}-${startDateStr}-to-${endDateStr}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await this.sendEmail(emailOptions);
      console.log(`Customer statement email sending result:`, result);
      return result;
    } catch (error) {
      console.error('Failed to send customer statement:', error);
      return false;
    }
  }

  // Utility methods
  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    const options: EmailOptions = {
      to,
      subject: 'Welcome to Our Platform!',
      html: `
        <h1>Welcome ${username}!</h1>
        <p>We're excited to have you on board.</p>
        <p>Get started by exploring our platform...</p>
      `,
    };
    return this.sendEmail(options);
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    const options: EmailOptions = {
      to,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };
    return this.sendEmail(options);
  }
}
