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
import { AccountsReceivableService } from './accounts-receivable.service';
import { CreateReceivableDto, UpdateReceivableDto, CreateReceivablePaymentDto } from './dto';
import { JwtGuard } from '../auth/guard';
import { ReceivableStatus } from '@prisma/client';

@Controller('organizations/:organizationId/accounts-receivable')
@UseGuards(JwtGuard)
export class AccountsReceivableController {
  constructor(private readonly accountsReceivableService: AccountsReceivableService) {}

  // Receivable endpoints
  @Post('receivables')
  async createReceivable(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateReceivableDto,
  ) {
    return this.accountsReceivableService.createReceivable(organizationId, dto);
  }

  @Get('receivables')
  async getAllReceivables(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dueStartDate') dueStartDate?: string,
    @Query('dueEndDate') dueEndDate?: string,
  ) {
    return this.accountsReceivableService.getAllReceivables(organizationId, {
      customerId: customerId ? parseInt(customerId) : undefined,
      status: status as ReceivableStatus,
      startDate,
      endDate,
      dueStartDate,
      dueEndDate,
    });
  }

  @Get('receivables/:id')
  async getReceivableById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsReceivableService.getReceivableById(organizationId, id);
  }

  @Put('receivables/:id')
  async updateReceivable(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReceivableDto,
  ) {
    return this.accountsReceivableService.updateReceivable(organizationId, id, dto);
  }

  @Delete('receivables/:id')
  async deleteReceivable(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsReceivableService.deleteReceivable(organizationId, id);
  }

  @Patch('receivables/:id/approve')
  async approveReceivable(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('approvedBy', ParseIntPipe) approvedBy: number,
  ) {
    return this.accountsReceivableService.approveReceivable(organizationId, id, approvedBy);
  }

  // Receivable Payment endpoints
  @Post('payments')
  async createReceivablePayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateReceivablePaymentDto,
  ) {
    return this.accountsReceivableService.createReceivablePayment(organizationId, dto);
  }

  @Get('payments')
  async getReceivablePayments(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('receivableId') receivableId?: string,
  ) {
    return this.accountsReceivableService.getReceivablePayments(
      organizationId,
      receivableId ? parseInt(receivableId) : undefined,
    );
  }

  // Aging report endpoint
  @Get('aging-report')
  async getAgingReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.accountsReceivableService.getAgingReport(organizationId);
  }
}