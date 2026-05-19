import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { InvoicePDFService } from './invoice-pdf.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  SendInvoiceDto,
  InvoiceFilterDto,
  FinalizeInvoiceDto,
  MarkAsSentDto,
  SendReminderDto,
} from './invoice.dto';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

@Controller('invoices')
// @UseGuards(AuthGuard) // Add your auth guard
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoicePDFService: InvoicePDFService,
  ) {}

  /**
   * Create a new invoice
   * POST /invoices/:organizationId
   */
  @Post(':organizationId')
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.INVOICES,
    description: 'Created a new invoice',
    entityType: 'Invoice',
  })
  async createInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateInvoiceDto,
  ) {
    return await this.invoiceService.createInvoice(organizationId, dto);
  }

  /**
   * Get all invoices with filters
   * GET /invoices/:organizationId
   */
  @Get(':organizationId')
  async getAllInvoices(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() filters: InvoiceFilterDto,
  ) {
    return await this.invoiceService.getAllInvoices(organizationId, filters);
  }

  /**
   * Get invoice statistics
   * GET /invoices/:organizationId/stats
   */
  @Get(':organizationId/stats')
  async getInvoiceStats(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() filters: InvoiceFilterDto,
  ) {
    return await this.invoiceService.getInvoiceStats(organizationId, filters);
  }

  /**
   * Get invoice by ID
   * GET /invoices/:organizationId/:id
   */
  @Get(':organizationId/:id')
  async getInvoiceById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.invoiceService.getInvoiceById(organizationId, id);
  }

  /**
   * Update invoice
   * PUT /invoices/:organizationId/:id
   */
  @Put(':organizationId/:id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.INVOICES,
    description: 'Updated invoice details',
    entityType: 'Invoice',
  })
  async updateInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return await this.invoiceService.updateInvoice(organizationId, id, dto);
  }

  /**
   * Record a payment for an invoice
   * POST /invoices/:organizationId/:id/payments
   */
  @Post(':organizationId/:id/payments')
  @LogActivity({
    action: LogAction.PAYMENT,
    module: LogModule.INVOICES,
    description: 'Recorded payment for invoice',
    entityType: 'Invoice',
  })
  async recordPayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordPaymentDto,
  ) {
    return await this.invoiceService.recordPayment(organizationId, id, dto);
  }

  /**
   * Send invoice via email/SMS
   * POST /invoices/:organizationId/:id/send
   */
  @Post(':organizationId/:id/send')
  async sendInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendInvoiceDto,
  ) {
    // TODO: Implement send logic
    return { message: 'Invoice sent successfully' };
  }

  /**
   * Cancel invoice
   * POST /invoices/:organizationId/:id/cancel
   */
  @Post(':organizationId/:id/cancel')
  async cancelInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.invoiceService.cancelInvoice(organizationId, id);
  }

  /**
   * Delete invoice
   * DELETE /invoices/:organizationId/:id
   */
  @Delete(':organizationId/:id')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.INVOICES,
    description: 'Deleted an invoice',
    entityType: 'Invoice',
  })
  async deleteInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.invoiceService.deleteInvoice(organizationId, id);
  }

  /**
   * Update overdue invoices
   * POST /invoices/:organizationId/update-overdue
   */
  @Post(':organizationId/update-overdue')
  async updateOverdueInvoices(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return await this.invoiceService.updateOverdueInvoices(organizationId);
  }

  /**
   * Calculate late fees for an invoice
   * POST /invoices/:organizationId/:id/late-fees
   */
  @Post(':organizationId/:id/late-fees')
  async calculateLateFees(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.invoiceService.calculateLateFees(organizationId, id);
  }

  /**
   * Download invoice PDF (authenticated)
   * GET /invoices/:organizationId/:id/pdf
   */
  @Get(':organizationId/:id/pdf')
  async downloadInvoicePDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @Query('theme') theme?: string,
  ) {
    // Verify invoice belongs to organization
    const invoice = await this.invoiceService.getInvoiceById(
      organizationId,
      id,
    );

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Generate PDF
    const pdfBuffer = await this.invoicePDFService.generateInvoicePDF(id, {
      theme: (theme as any) || 'professional',
      includeQRCode: true,
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  }
}

/**
 * Public invoice controller (no auth required)
 */
@Controller('invoices/public')
export class PublicInvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoicePDFService: InvoicePDFService,
  ) {}

  /**
   * Get public invoice by token
   * GET /invoices/public/:token
   */
  @Get(':token')
  async getPublicInvoice(@Param('token') token: string) {
    return await this.invoiceService.getInvoiceByPublicToken(token);
  }

  /**
   * Download invoice PDF by public token
   * GET /invoices/public/:token/download
   */
  @Get(':token/download')
  async downloadInvoicePDF(
    @Param('token') token: string,
    @Res() res: Response,
    @Query('theme') theme?: string,
  ) {
    // Get invoice by public token
    const invoice = await this.invoiceService.getInvoiceByPublicToken(token);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Generate PDF
    const pdfBuffer = await this.invoicePDFService.generateInvoicePDF(
      invoice.id,
      {
        theme: (theme as any) || 'professional',
        includeQRCode: true,
      },
    );

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  }

  /**
   * View invoice PDF in browser (for printing)
   * GET /invoices/public/:token/view
   */
  @Get(':token/view')
  async viewInvoicePDF(
    @Param('token') token: string,
    @Res() res: Response,
    @Query('theme') theme?: string,
  ) {
    // Get invoice by public token
    const invoice = await this.invoiceService.getInvoiceByPublicToken(token);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Generate PDF
    const pdfBuffer = await this.invoicePDFService.generateInvoicePDF(
      invoice.id,
      {
        theme: (theme as any) || 'professional',
        includeQRCode: true,
      },
    );

    // Set response headers for inline PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  }

  /**
   * Finalize draft invoice (DRAFT → PENDING)
   * PUT /invoices/:organizationId/:id/finalize
   */
  @Put(':organizationId/:id/finalize')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.INVOICES,
    description: 'Finalized draft invoice',
    entityType: 'Invoice',
  })
  async finalizeInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizeInvoiceDto,
  ) {
    return await this.invoiceService.finalizeInvoice(
      organizationId,
      id,
      dto,
    );
  }

  /**
   * Mark invoice as sent (PENDING → SENT)
   * PUT /invoices/:organizationId/:id/mark-sent
   */
  @Put(':organizationId/:id/mark-sent')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.INVOICES,
    description: 'Marked invoice as sent',
    entityType: 'Invoice',
  })
  async markAsSent(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkAsSentDto,
  ) {
    return await this.invoiceService.markAsSent(organizationId, id, dto);
  }

  /**
   * Duplicate invoice (creates new DRAFT)
   * POST /invoices/:organizationId/:id/duplicate
   */
  @Post(':organizationId/:id/duplicate')
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.INVOICES,
    description: 'Duplicated invoice',
    entityType: 'Invoice',
  })
  async duplicateInvoice(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.invoiceService.duplicateInvoice(organizationId, id);
  }

  /**
   * Send payment reminder
   * POST /invoices/:organizationId/:id/send-reminder
   */
  @Post(':organizationId/:id/send-reminder')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.INVOICES,
    description: 'Sent payment reminder',
    entityType: 'Invoice',
  })
  async sendReminder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendReminderDto,
  ) {
    return await this.invoiceService.sendReminder(organizationId, id, dto);
  }
}
