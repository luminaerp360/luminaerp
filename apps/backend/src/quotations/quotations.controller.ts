import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Patch,
  ParseIntPipe,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotationsService } from './quotations.service';
import { QuotationDto } from './quotation.dto';
import { updateQuotationDto } from './updateQuote.dto';
import { JwtGuard } from 'src/auth/guard';

@Controller('organizations/:organizationId/quotations')
@UseGuards(JwtGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  // ========================================
  // BASIC CRUD OPERATIONS
  // ========================================

  @Post()
  async createQuotation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: QuotationDto,
  ) {
    try {
      const quotation = await this.quotationsService.createQuotation(
        organizationId,
        dto,
      );

      return {
        success: true,
        message: dto.sendEmail
          ? 'Quotation created successfully and email sent in background'
          : 'Quotation created successfully',
        data: quotation,
        emailSent: dto.sendEmail || false,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create quotation',
        error: error.message,
      };
    }
  }

  @Get()
  async getAllQuotations(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    try {
      const quotations =
        await this.quotationsService.getAllQuotations(organizationId);
      return {
        success: true,
        data: quotations,
        count: quotations.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch quotations',
        error: error.message,
      };
    }
  }

  @Get('pending')
  async getPendingQuotations(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    try {
      const quotations =
        await this.quotationsService.getPendingQuotations(organizationId);
      return {
        success: true,
        data: quotations,
        count: quotations.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch pending quotations',
        error: error.message,
      };
    }
  }

  @Get('by-date-range')
  async getQuotationsByDateRange(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('search') search?: string,
  ) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const quotations = await this.quotationsService.getQuotationsByDateRange(
        organizationId,
        start,
        end,
        search,
      );

      return {
        success: true,
        data: quotations,
        count: quotations.length,
        dateRange: {
          startDate: start.toLocaleDateString(),
          endDate: end.toLocaleDateString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch quotations by date range',
        error: error.message,
      };
    }
  }

  @Get(':id')
  async getQuotationById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const quotation = await this.quotationsService.getQuotationById(
        organizationId,
        id,
      );
      return {
        success: true,
        data: quotation,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch quotation',
        error: error.message,
      };
    }
  }

  @Put(':id')
  async updateQuotation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: updateQuotationDto,
  ) {
    try {
      const quotation = await this.quotationsService.updateQuotation(
        organizationId,
        id,
        dto,
      );

      return {
        success: true,
        message: dto.sendEmail
          ? 'Quotation updated successfully and email sent in background'
          : 'Quotation updated successfully',
        data: quotation,
        emailSent: dto.sendEmail || false,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update quotation',
        error: error.message,
      };
    }
  }

  @Delete(':id')
  async deleteQuotation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      await this.quotationsService.deleteQuotation(organizationId, id);
      return {
        success: true,
        message: 'Quotation deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete quotation',
        error: error.message,
      };
    }
  }

  // ========================================
  // STATUS MANAGEMENT
  // ========================================

  @Patch(':id/approve')
  async approveQuotation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const quotation = await this.quotationsService.approveQuotation(
        organizationId,
        id,
      );

      return {
        success: true,
        message: quotation.sendEmail
          ? 'Quotation approved successfully and approval email sent in background'
          : 'Quotation approved successfully',
        data: quotation,
        emailSent: quotation.sendEmail || false,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to approve quotation',
        error: error.message,
      };
    }
  }

  // ========================================
  // EMAIL FUNCTIONALITY
  // ========================================

  // Manual email sending endpoint
  @Post(':id/send-email')
  async sendQuotationEmail(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { emailTo?: string },
  ) {
    try {
      const result = await this.quotationsService.sendQuotationEmail(
        organizationId,
        id,
        body?.emailTo,
      );
      return {
        success: true,
        message: 'Quotation email sent successfully',
        data: result,
        emailTo: body?.emailTo || 'customer email',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send quotation email',
        error: error.message,
      };
    }
  }

  // Resend quotation email (same as send-email but different endpoint for clarity)
  @Post(':id/resend-email')
  async resendQuotationEmail(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { emailTo?: string },
  ) {
    try {
      const result = await this.quotationsService.sendQuotationEmail(
        organizationId,
        id,
        body?.emailTo,
      );
      return {
        success: true,
        message: 'Quotation email resent successfully',
        data: result,
        emailTo: body?.emailTo || 'customer email',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend quotation email',
        error: error.message,
      };
    }
  }

  // ========================================
  // PDF FUNCTIONALITY
  // ========================================

  // Download quotation as PDF
  @Get(':id/download-pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadQuotationPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    try {
      const pdfBuffer = await this.quotationsService.generateQuotationPDF(
        organizationId,
        id,
      );

      const quotation = await this.quotationsService.getQuotationById(
        organizationId,
        id,
      );
      const filename = `quotation-${quotation.referenceNumber}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF',
        error: error.message,
      });
    }
  }

  // Generate PDF and return base64 (for preview in frontend)
  @Get(':id/preview-pdf')
  async previewQuotationPDF(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const pdfBuffer = await this.quotationsService.generateQuotationPDF(
        organizationId,
        id,
      );

      const quotation = await this.quotationsService.getQuotationById(
        organizationId,
        id,
      );

      return {
        success: true,
        data: {
          filename: `quotation-${quotation.referenceNumber}.pdf`,
          data: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate PDF preview',
        error: error.message,
      };
    }
  }

  // Get printable quotation data (for preview)
  @Get(':id/printable-data')
  async getPrintableQuotationData(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const data = await this.quotationsService.getPrintableQuotationData(
        organizationId,
        id,
      );
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get printable data',
        error: error.message,
      };
    }
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  // Bulk approve quotations
  @Patch('bulk/approve')
  async bulkApproveQuotations(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() body: { quotationIds: number[] },
  ) {
    try {
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const quotationId of body.quotationIds) {
        try {
          const result = await this.quotationsService.approveQuotation(
            organizationId,
            quotationId,
          );
          results.push({
            quotationId,
            success: true,
            data: result,
          });
          successCount++;
        } catch (error) {
          results.push({
            quotationId,
            success: false,
            error: error.message,
          });
          failureCount++;
        }
      }

      return {
        success: failureCount === 0,
        message: `Bulk approval completed: ${successCount} successful, ${failureCount} failed`,
        results,
        summary: {
          total: body.quotationIds.length,
          successful: successCount,
          failed: failureCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to process bulk approval',
        error: error.message,
      };
    }
  }

  // Bulk send emails
  @Post('bulk/send-email')
  async bulkSendQuotationEmails(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() body: { quotationIds: number[]; emailTo?: string },
  ) {
    try {
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const quotationId of body.quotationIds) {
        try {
          const result = await this.quotationsService.sendQuotationEmail(
            organizationId,
            quotationId,
            body.emailTo,
          );
          results.push({
            quotationId,
            success: true,
            data: result,
          });
          successCount++;
        } catch (error) {
          results.push({
            quotationId,
            success: false,
            error: error.message,
          });
          failureCount++;
        }
      }

      return {
        success: failureCount === 0,
        message: `Bulk email sending completed: ${successCount} successful, ${failureCount} failed`,
        results,
        summary: {
          total: body.quotationIds.length,
          successful: successCount,
          failed: failureCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to process bulk email sending',
        error: error.message,
      };
    }
  }

  // ========================================
  // STATISTICS AND ANALYTICS
  // ========================================

  // Get quotation statistics
  @Get('stats/overview')
  async getQuotationStatistics(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      let quotations;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        quotations = await this.quotationsService.getQuotationsByDateRange(
          organizationId,
          start,
          end,
        );
      } else {
        quotations =
          await this.quotationsService.getAllQuotations(organizationId);
      }

      const stats = {
        total: quotations.length,
        pending: quotations.filter((q) => q.status === 'pending').length,
        approved: quotations.filter((q) => q.status === 'approved').length,
        rejected: quotations.filter((q) => q.status === 'rejected').length,
        emailsSent: quotations.filter((q) => q.sendEmail === true).length,
        totalValue: quotations.reduce((sum, q) => sum + q.totalAmount, 0),
        averageValue:
          quotations.length > 0
            ? quotations.reduce((sum, q) => sum + q.totalAmount, 0) /
              quotations.length
            : 0,
        pendingValue: quotations
          .filter((q) => q.status === 'pending')
          .reduce((sum, q) => sum + q.totalAmount, 0),
        approvedValue: quotations
          .filter((q) => q.status === 'approved')
          .reduce((sum, q) => sum + q.totalAmount, 0),
      };

      return {
        success: true,
        data: stats,
        period:
          startDate && endDate
            ? {
                startDate: new Date(startDate).toLocaleDateString(),
                endDate: new Date(endDate).toLocaleDateString(),
              }
            : 'All time',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get quotation statistics',
        error: error.message,
      };
    }
  }

  // Get quotations by status
  @Get('status/:status')
  async getQuotationsByStatus(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('status') status: string,
  ) {
    try {
      const quotations =
        await this.quotationsService.getAllQuotations(organizationId);
      const filteredQuotations = quotations.filter(
        (q) => q.status.toLowerCase() === status.toLowerCase(),
      );

      return {
        success: true,
        data: filteredQuotations,
        count: filteredQuotations.length,
        status: status.toLowerCase(),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch quotations with status: ${status}`,
        error: error.message,
      };
    }
  }

  // ========================================
  // CONVERSION TO CREDIT SALE (INVOICE)
  // ========================================

  @Post(':id/convert-to-credit-sale')
  async convertQuotationToCreditSale(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body?: {
      payment_date?: string;
      payment_terms?: string;
      order_remarks?: string;
    },
  ) {
    try {
      const result = await this.quotationsService.convertQuotationToCreditSale(
        organizationId,
        id,
        {
          payment_date: body?.payment_date
            ? new Date(body.payment_date)
            : undefined,
          payment_terms: body?.payment_terms,
          order_remarks: body?.order_remarks,
        },
      );

      return {
        success: true,
        message: result.message,
        data: {
          creditSale: result.creditSale,
          quotation: result.quotation,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to convert quotation to credit sale',
        error: error.message,
      };
    }
  }
}
