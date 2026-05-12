import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ParseIntPipe,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { CreditSaleDto } from './credit.dto';
import { CreditService } from './credit-sale.service';

@Controller('organizations/:organizationId/credit-sales')
export class CreditSaleController {
  constructor(private readonly creditService: CreditService) {}

  @Post()
  async createCreditSale(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreditSaleDto,
  ) {
    return this.creditService.createCreditSale(organizationId, dto);
  }

  @Get()
  async getAllCreditSales(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.creditService.getAllCreditSales(organizationId);
  }

  @Get('customer-statement/:customerId')
  async getCustomerCreditStatement(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.creditService.getCustomerCreditStatement(
      organizationId,
      customerId,
      startDate,
      endDate,
    );
  }

  @Get('unpaid-report')
  async getUnpaidCreditSalesReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('customerId') customerId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.creditService.getUnpaidCreditSalesReport(organizationId, {
      customerId,
      startDate,
      endDate,
    });
  }

  // NEW PDF ENDPOINTS

  // Download single credit sale invoice as PDF
  @Get(':id/download-pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadCreditSaleInvoicePDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('format') format: 'invoice' | 'receipt' = 'invoice',
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.creditService.generateCreditSaleInvoicePDF(
      organizationId,
      id,
      format,
    );

    const filename = `credit-sale-${format}-${id}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // Download customer statement as PDF
  @Get('customer-statement/:customerId/download-pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadCustomerStatementPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('includePaymentHistory') includePaymentHistory: boolean = false,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.creditService.generateCustomerStatementPDF(
      organizationId,
      customerId,
      startDate,
      endDate,
      { includePaymentHistory },
    );

    const filename = `customer-statement-${customerId}-${startDate}-to-${endDate}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // Download unpaid credit sales report as PDF
  @Get('unpaid-report/download-pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadUnpaidReportPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Res() res: Response,

    @Query('customerId') customerId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pdfBuffer = await this.creditService.generateUnpaidReportPDF(
      organizationId,
      { customerId, startDate, endDate },
    );

    const filename = `unpaid-credit-sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // Bulk download multiple credit sale invoices as ZIP
  @Post('bulk-download-pdf')
  @Header('Content-Type', 'application/zip')
  async bulkDownloadCreditSalesPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body()
    bulkDownloadDto: {
      creditSaleIds: number[];
      format?: 'invoice' | 'receipt';
    },
    @Res() res: Response,
  ) {
    const zipBuffer = await this.creditService.generateBulkCreditSalesPDF(
      organizationId,
      bulkDownloadDto.creditSaleIds,
      bulkDownloadDto.format || 'invoice',
    );

    const filename = `credit-sales-bulk-${new Date().toISOString().split('T')[0]}.zip`;
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': zipBuffer.length,
    });

    res.send(zipBuffer);
  }

  // Generate PDF and return base64 (for preview in frontend)
  @Get(':id/preview-pdf')
  async previewCreditSaleInvoicePDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('format') format: 'invoice' | 'receipt' = 'invoice',
  ) {
    const pdfBuffer = await this.creditService.generateCreditSaleInvoicePDF(
      organizationId,
      id,
      format,
    );

    return {
      filename: `credit-sale-${format}-${id}.pdf`,
      data: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    };
  }

  @Get(':id')
  async getCreditSaleById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.creditService.getCreditSaleById(organizationId, id);
  }

  @Put(':id')
  async updateCreditSale(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreditSaleDto>,
  ) {
    return this.creditService.updateCreditSale(organizationId, id, dto);
  }

  @Delete(':id')
  async deleteCreditSale(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.creditService.deleteCreditSale(organizationId, id);
  }

  @Get('reports/shift/:shiftId')
  async getCreditSaleReportByShift(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('shiftId', ParseIntPipe) shiftId: number,
  ) {
    return this.creditService.getCreditSaleReportByShift(
      organizationId,
      shiftId,
    );
  }

  @Get('reports/date-range')
  async getCreditSaleReportByDateRange(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.creditService.getCreditSaleReportByDateRange(
      organizationId,
      startDate,
      endDate,
    );
  }
}
