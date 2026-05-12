// emails.controller.ts - Complete version with all email functionality
import {
  Controller,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Get,
} from '@nestjs/common';
import { EmailOptions } from './email-options.interface';
import { EmailsService, InvoiceData } from './emails.service';

interface SendCreditInvoiceDto {
  organizationId: number;
  creditSaleId: number;
  format?: 'invoice' | 'receipt';
}

interface SendQuotationDto {
  organizationId: number;
  quotationId: number;
  emailTo?: string;
}

interface SendCustomerStatementDto {
  organizationId: number;
  customerId: number;
  startDate: string;
  endDate: string;
  includePaymentHistory?: boolean;
  emailTo?: string;
}

@Controller('email')
export class EmailsController {
  constructor(private readonly emailService: EmailsService) {}

  // ========================================
  // TESTING ENDPOINTS
  // ========================================

  // Test endpoint to verify email configuration
  @Get('test')
  async testEmail(@Query('to') to?: string) {
    try {
      const success = await this.emailService.sendTestEmail(to);
      return {
        success,
        message: success
          ? 'Test email sent successfully'
          : 'Failed to send test email',
        recipient: to || 'shaphankirui@gmail.com',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending test email',
        error: error.message,
      };
    }
  }

  // Test endpoint with complete PDF attachment (includes payment details)
  @Get('test-pdf/:organizationId/:creditSaleId')
  async testEmailWithPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('creditSaleId', ParseIntPipe) creditSaleId: number,
    @Query('to') to?: string,
  ) {
    try {
      const success = await this.emailService.sendTestEmailWithPDF(
        organizationId,
        creditSaleId,
        to,
      );
      return {
        success,
        message: success
          ? 'Test email with complete PDF (including payment details) sent successfully'
          : 'Failed to send test email with complete PDF',
        recipient: to || 'shaphankirui@gmail.com',
        organizationId,
        creditSaleId,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending test email with complete PDF',
        error: error.message,
      };
    }
  }

  // Test endpoint with quotation PDF attachment
  @Get('test-quotation-pdf/:organizationId/:quotationId')
  async testEmailWithQuotationPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('quotationId', ParseIntPipe) quotationId: number,
    @Query('to') to?: string,
  ) {
    try {
      const success = await this.emailService.sendTestQuotationEmail(
        organizationId,
        quotationId,
        to,
      );
      return {
        success,
        message: success
          ? 'Test quotation email with PDF sent successfully'
          : 'Failed to send test quotation email with PDF',
        recipient: to || 'shaphankirui@gmail.com',
        organizationId,
        quotationId,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending test quotation email with PDF',
        error: error.message,
      };
    }
  }

  // ========================================
  // CREDIT SALE INVOICE EMAILS
  // ========================================

  // Endpoint for sending credit sale invoices with complete payment details
  @Post('send-credit-invoice')
  async sendCreditInvoice(@Body() dto: SendCreditInvoiceDto) {
    try {
      const { organizationId, creditSaleId, format = 'invoice' } = dto;
      console.log(
        `Attempting to send complete credit invoice: Org ${organizationId}, Sale ${creditSaleId}, Format ${format}`,
      );

      const success = await this.emailService.sendCreditSaleInvoice(
        organizationId,
        creditSaleId,
        format,
      );

      return {
        success,
        message: success
          ? 'Invoice with complete payment details sent successfully'
          : 'Failed to send invoice with payment details',
        organizationId,
        creditSaleId,
        format,
        note: 'PDF includes payment methods and banking details',
      };
    } catch (error) {
      console.error('Error in sendCreditInvoice controller:', error);
      return {
        success: false,
        message: 'Error sending invoice with payment details',
        error: error.message,
      };
    }
  }

  // Alternative endpoint structure for credit sale invoices
  @Post('organization/:organizationId/credit-sale/:creditSaleId/send-invoice')
  async sendCreditSaleInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('creditSaleId', ParseIntPipe) creditSaleId: number,
    @Query('format') format?: 'invoice' | 'receipt',
  ) {
    try {
      console.log(
        `Sending credit sale invoice with payment details: ${organizationId}/${creditSaleId}`,
      );

      const success = await this.emailService.sendCreditSaleInvoice(
        organizationId,
        creditSaleId,
        format || 'invoice',
      );

      return {
        success,
        message: success
          ? 'Invoice with complete payment details sent successfully'
          : 'Failed to send invoice with payment details',
        organizationId,
        creditSaleId,
        format: format || 'invoice',
        note: 'PDF includes payment methods and banking details',
      };
    } catch (error) {
      console.error('Error in sendCreditSaleInvoice controller:', error);
      return {
        success: false,
        message: 'Error sending invoice with payment details',
        error: error.message,
      };
    }
  }

  // ========================================
  // QUOTATION EMAILS
  // ========================================

  // Endpoint for sending quotations with complete payment details
  @Post('send-quotation')
  async sendQuotation(@Body() dto: SendQuotationDto) {
    try {
      const { organizationId, quotationId, emailTo } = dto;
      console.log(
        `Attempting to send quotation: Org ${organizationId}, Quotation ${quotationId}`,
      );

      const success = await this.emailService.sendQuotation(
        organizationId,
        quotationId,
        emailTo,
      );

      return {
        success,
        message: success
          ? 'Quotation with complete payment details sent successfully'
          : 'Failed to send quotation with payment details',
        organizationId,
        quotationId,
        note: 'PDF includes payment methods and banking details',
      };
    } catch (error) {
      console.error('Error in sendQuotation controller:', error);
      return {
        success: false,
        message: 'Error sending quotation with payment details',
        error: error.message,
      };
    }
  }

  // Alternative endpoint structure for quotations
  @Post('organization/:organizationId/quotation/:quotationId/send')
  async sendQuotationByParams(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('quotationId', ParseIntPipe) quotationId: number,
    @Query('emailTo') emailTo?: string,
  ) {
    try {
      console.log(
        `Sending quotation with payment details: ${organizationId}/${quotationId}`,
      );

      const success = await this.emailService.sendQuotation(
        organizationId,
        quotationId,
        emailTo,
      );

      return {
        success,
        message: success
          ? 'Quotation with complete payment details sent successfully'
          : 'Failed to send quotation with payment details',
        organizationId,
        quotationId,
        note: 'PDF includes payment methods and banking details',
      };
    } catch (error) {
      console.error('Error in sendQuotationByParams controller:', error);
      return {
        success: false,
        message: 'Error sending quotation with payment details',
        error: error.message,
      };
    }
  }

  // ========================================
  // CUSTOMER STATEMENT EMAILS
  // ========================================

  // Endpoint for sending customer statements
  @Post('send-customer-statement')
  async sendCustomerStatement(@Body() dto: SendCustomerStatementDto) {
    try {
      const {
        organizationId,
        customerId,
        startDate,
        endDate,
        includePaymentHistory = false,
        emailTo,
      } = dto;

      console.log(
        `Sending customer statement: Org ${organizationId}, Customer ${customerId}, Period ${startDate} to ${endDate}`,
      );

      const success = await this.emailService.sendCustomerStatement(
        organizationId,
        customerId,
        startDate,
        endDate,
        { includePaymentHistory },
        emailTo,
      );

      return {
        success,
        message: success
          ? 'Customer statement sent successfully'
          : 'Failed to send customer statement',
        organizationId,
        customerId,
        period: `${startDate} to ${endDate}`,
        includePaymentHistory,
      };
    } catch (error) {
      console.error('Error sending customer statement:', error);
      return {
        success: false,
        message: 'Error sending customer statement',
        error: error.message,
      };
    }
  }

  // Alternative endpoint structure for customer statements
  @Post('organization/:organizationId/customer/:customerId/send-statement')
  async sendCustomerStatementByParams(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('includePaymentHistory') includePaymentHistory?: boolean,
    @Query('emailTo') emailTo?: string,
  ) {
    try {
      const success = await this.emailService.sendCustomerStatement(
        organizationId,
        customerId,
        startDate,
        endDate,
        { includePaymentHistory: includePaymentHistory === true },
        emailTo,
      );

      return {
        success,
        message: success
          ? 'Customer statement sent successfully'
          : 'Failed to send customer statement',
        organizationId,
        customerId,
        period: `${startDate} to ${endDate}`,
        includePaymentHistory,
      };
    } catch (error) {
      console.error('Error sending customer statement:', error);
      return {
        success: false,
        message: 'Error sending customer statement',
        error: error.message,
      };
    }
  }

  // ========================================
  // LEGACY AND UTILITY ENDPOINTS
  // ========================================

  @Post('send')
  async sendEmail(@Body() emailOptions: string) {
    return await this.emailService.sendWelcomeEmail(
      'shaphankirui@gmail.com',
      'SHAPHAN',
    );
  }

  // Keep old endpoint for backward compatibility
  @Post('send-invoice')
  async sendInvoice(@Body() invoiceData: InvoiceData) {
    try {
      // Now actually try to send the email instead of just returning error
      const success = await this.emailService.sendInvoiceEmail(invoiceData);
      return {
        success,
        message: success
          ? 'Invoice sent successfully (legacy method)'
          : 'Failed to send invoice',
        note: 'Consider using send-credit-invoice for complete PDF with payment details',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending invoice',
        error: error.message,
      };
    }
  }

  // ========================================
  // WELCOME AND PASSWORD RESET EMAILS
  // ========================================

  @Post('send-welcome')
  async sendWelcomeEmail(@Body() body: { email: string; username: string }) {
    try {
      const success = await this.emailService.sendWelcomeEmail(
        body.email,
        body.username,
      );
      return {
        success,
        message: success
          ? 'Welcome email sent successfully'
          : 'Failed to send welcome email',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending welcome email',
        error: error.message,
      };
    }
  }

  @Post('send-password-reset')
  async sendPasswordResetEmail(
    @Body() body: { email: string; resetToken: string },
  ) {
    try {
      const success = await this.emailService.sendPasswordResetEmail(
        body.email,
        body.resetToken,
      );
      return {
        success,
        message: success
          ? 'Password reset email sent successfully'
          : 'Failed to send password reset email',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sending password reset email',
        error: error.message,
      };
    }
  }
}
