import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { AccountsPayableService } from './accounts-payable.service';
import { PaymentMethodsService } from './payment-methods.service';
import {
  CreateBillDto,
  UpdateBillDto,
  CreateBillPaymentDto,
  CreateMultipleBillPaymentsDto,
  BulkBillPaymentDto,
  BillPaymentHistoryFilterDto,
  SupplierFilterDto,
} from './dto';
import { JwtGuard } from '../auth/guard';
import { BillStatus } from '@prisma/client';

@Controller('organizations/:organizationId/accounts-payable')
@UseGuards(JwtGuard)
export class AccountsPayableController {
  constructor(
    private readonly accountsPayableService: AccountsPayableService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  // Bill endpoints
  @Post('bills')
  async createBill(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateBillDto,
  ) {
    return this.accountsPayableService.createBill(organizationId, dto);
  }

  @Get('bills')
  async getAllBills(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dueStartDate') dueStartDate?: string,
    @Query('dueEndDate') dueEndDate?: string,
  ) {
    // Parse status - handle comma-separated values
    let parsedStatus: BillStatus | BillStatus[] | undefined;
    if (status) {
      if (status.includes(',')) {
        // Split and cast each value to BillStatus enum
        parsedStatus = status.split(',').map((s) => s.trim() as BillStatus);
      } else {
        parsedStatus = status as BillStatus;
      }
    }

    return this.accountsPayableService.getAllBills(organizationId, {
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      status: parsedStatus,
      startDate,
      endDate,
      dueStartDate,
      dueEndDate,
    });
  }

  @Get('bills/:id')
  async getBillById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsPayableService.getBillById(organizationId, id);
  }

  @Put('bills/:id')
  async updateBill(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBillDto,
  ) {
    return this.accountsPayableService.updateBill(organizationId, id, dto);
  }

  @Delete('bills/:id')
  async deleteBill(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsPayableService.deleteBill(organizationId, id);
  }

  @Patch('bills/:id/approve')
  async approveBill(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('approvedBy', ParseIntPipe) approvedBy: number,
  ) {
    return this.accountsPayableService.approveBill(
      organizationId,
      id,
      approvedBy,
    );
  }

  // Bill Payment endpoints
  @Post('payments')
  async createBillPayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateBillPaymentDto,
  ) {
    return this.accountsPayableService.createBillPayment(organizationId, dto);
  }

  @Get('payments')
  async getBillPayments(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('billId') billId?: string,
  ) {
    return this.accountsPayableService.getBillPayments(
      organizationId,
      billId ? parseInt(billId) : undefined,
    );
  }

  // Reporting endpoints
  @Get('aging-report')
  async getAgingReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.accountsPayableService.getAgingReport(organizationId);
  }

  @Post('update-overdue')
  async updateOverdueBills(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.accountsPayableService.updateOverdueBills(organizationId);
  }

  @Post('bills/from-lpo/:lpoId')
  async createBillFromLPO(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('lpoId', ParseIntPipe) lpoId: number,
    @Body('createdBy', ParseIntPipe) createdBy: number,
  ) {
    return this.accountsPayableService.createBillFromLPO(
      organizationId,
      lpoId,
      createdBy,
    );
  }

  // Bulk payment endpoint
  @Post('payments/multiple')
  async createMultipleBillPayments(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateMultipleBillPaymentsDto,
  ) {
    return this.accountsPayableService.createMultipleBillPayments(
      organizationId,
      dto,
    );
  }

  // Supplier statement endpoints
  @Get('suppliers/:supplierId/statement')
  async getSupplierStatement(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountsPayableService.getSupplierStatement(
      organizationId,
      supplierId,
      startDate,
      endDate,
    );
  }

  @Get('suppliers/summaries')
  async getSupplierSummaries(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountsPayableService.getSupplierSummaries(
      organizationId,
      startDate,
      endDate,
    );
  }

  // New endpoints for creditors module
  @Post('bulk-payment')
  async recordBulkBillPayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: BulkBillPaymentDto,
  ) {
    return this.accountsPayableService.recordBulkBillPayment(
      organizationId,
      dto.billPayments,
      dto.paymentDate,
      dto.paymentMethod,
      dto.createdBy,
      dto.referenceNumber,
      dto.transactionCode,
      dto.notes,
    );
  }

  @Get('suppliers')
  async getAllSuppliers(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('searchQuery') searchQuery?: string,
    @Query('showOnlyWithDebt') showOnlyWithDebt?: string,
  ) {
    return this.accountsPayableService.getAllSuppliers(
      organizationId,
      searchQuery,
      showOnlyWithDebt === 'true',
    );
  }

  @Get('payment-history')
  async getAllBillPaymentHistory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('searchQuery') searchQuery?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('supplierId') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountsPayableService.getAllBillPaymentHistory(
      organizationId,
      searchQuery,
      startDate,
      endDate,
      paymentMethod as any,
      supplierId ? parseInt(supplierId) : undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('aging-analysis')
  async getAgingAnalysis(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.accountsPayableService.getAgingAnalysis(organizationId);
  }

  @Get('payment-methods')
  async getPaymentMethods(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.paymentMethodsService.getPaymentMethods(organizationId);
  }
}
