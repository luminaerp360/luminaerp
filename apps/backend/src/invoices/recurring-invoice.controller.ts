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
} from '@nestjs/common';
import { RecurringInvoiceService } from './recurring-invoice.service';
import {
  CreateRecurringTemplateDto,
  UpdateRecurringTemplateDto,
  RecurringTemplateFilterDto,
} from './recurring-invoice.dto';

@Controller('recurring-invoices')
export class RecurringInvoiceController {
  constructor(
    private readonly recurringInvoiceService: RecurringInvoiceService,
  ) {}

  /**
   * Create a new recurring invoice template
   * POST /recurring-invoices/:organizationId
   */
  @Post(':organizationId')
  async createTemplate(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateRecurringTemplateDto,
  ) {
    return await this.recurringInvoiceService.createTemplate(
      organizationId,
      dto,
    );
  }

  /**
   * Get all recurring templates
   * GET /recurring-invoices/:organizationId
   */
  @Get(':organizationId')
  async getTemplates(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() filters: RecurringTemplateFilterDto,
  ) {
    return await this.recurringInvoiceService.getTemplates(
      organizationId,
      filters,
    );
  }

  /**
   * Get template by ID
   * GET /recurring-invoices/:organizationId/:templateId
   */
  @Get(':organizationId/:templateId')
  async getTemplateById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return await this.recurringInvoiceService.getTemplateById(
      organizationId,
      templateId,
    );
  }

  /**
   * Update template
   * PUT /recurring-invoices/:organizationId/:templateId
   */
  @Put(':organizationId/:templateId')
  async updateTemplate(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() dto: UpdateRecurringTemplateDto,
  ) {
    return await this.recurringInvoiceService.updateTemplate(
      organizationId,
      templateId,
      dto,
    );
  }

  /**
   * Pause template
   * PUT /recurring-invoices/:organizationId/:templateId/pause
   */
  @Put(':organizationId/:templateId/pause')
  async pauseTemplate(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return await this.recurringInvoiceService.pauseTemplate(
      organizationId,
      templateId,
    );
  }

  /**
   * Resume template
   * PUT /recurring-invoices/:organizationId/:templateId/resume
   */
  @Put(':organizationId/:templateId/resume')
  async resumeTemplate(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return await this.recurringInvoiceService.resumeTemplate(
      organizationId,
      templateId,
    );
  }

  /**
   * Cancel template
   * PUT /recurring-invoices/:organizationId/:templateId/cancel
   */
  @Put(':organizationId/:templateId/cancel')
  async cancelTemplate(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return await this.recurringInvoiceService.cancelTemplate(
      organizationId,
      templateId,
    );
  }

  /**
   * Delete template
   * DELETE /recurring-invoices/:organizationId/:templateId
   */
  @Delete(':organizationId/:templateId')
  async deleteTemplate(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return await this.recurringInvoiceService.deleteTemplate(
      organizationId,
      templateId,
    );
  }

  /**
   * Manually trigger invoice generation (for testing/debugging)
   * POST /recurring-invoices/generate-now
   */
  @Post('generate-now/trigger')
  async generateNow() {
    return await this.recurringInvoiceService.generateDueInvoices();
  }
}
