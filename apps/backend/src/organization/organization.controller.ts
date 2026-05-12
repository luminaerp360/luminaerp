// src/organization/organization.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './create-organization.dto';
import { UpdateOrganizationDto } from './update-organization.dto';
import {
  PaymentMethod,
  SubscriptionStatus,
  TransactionType,
} from '@prisma/client';
import { CreatePaymentTransactionDto } from './payments.dto';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(createOrganizationDto);
  }

  @Get()
  findAll() {
    return this.organizationService.findAll();
  }

  @Get('subscriptions')
  getAllSubscriptions(@Query('status') status?: SubscriptionStatus) {
    return this.organizationService.getAllSubscriptions(status);
  }
  @Get('subscription/:orgName')
  findSubscriptionByOrgName(@Query('orgName') orgName: string) {
    return this.organizationService.findSubscriptionByOrgName(orgName);
  }
  @Get(':id/subscription-status')
  async getSubscriptionStatus(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.checkSubscriptionStatus(id);
  }

  @Patch(':id/subscription-status')
  updateOrganizationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: { status: SubscriptionStatus; remarks?: string },
  ) {
    return this.organizationService.updateOrganizationStatus(
      id,
      updateData.status,
      updateData.remarks,
    );
  }

  @Post(':id/payments')
  createPayment(
    @Param('id', ParseIntPipe) organizationId: number,
    @Body() createPaymentTransactionDto: CreatePaymentTransactionDto,
  ) {
    return this.organizationService.createPaymentTransaction(
      organizationId,
      createPaymentTransactionDto,
    );
  }

  @Post('expenses')
  createExpensePayment(
    @Body() createPaymentTransactionDto: CreatePaymentTransactionDto,
  ) {
    // For expenses, organizationId is null or your company's org ID
    return this.organizationService.createPaymentTransaction(
      null,
      createPaymentTransactionDto,
    );
  }

  @Get('payments')
  getPayments(
    @Query('organizationId', new ParseIntPipe({ optional: true }))
    organizationId?: number,
    @Query('transactionType') transactionType?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('method') method?: PaymentMethod,
  ) {
    return this.organizationService.getPaymentTransactions({
      organizationId,
      transactionType,
      startDate,
      endDate,
      method,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.findOne(id);
  }

  @Get('license/:licenseKey')
  async getOrganizationByLicenseKey(@Param('licenseKey') licenseKey: string) {
    console.log('licence', licenseKey);
    return this.organizationService.getOrganizationByLicenseKey(licenseKey);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.remove(id);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.getOrganizationStats(id);
  }

  @Get(':id/revenue')
  getRevenue(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.organizationService.getOrganizationRevenue(
      id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id/export')
  exportOrganizationData(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.exportOrganizationData(id);
  }

  @Get('export/license/:licenseKey')
  exportOrganizationDataByLicenseKey(@Param('licenseKey') licenseKey: string) {
    return this.organizationService.exportOrganizationDataByLicenseKey(
      licenseKey,
    );
  }
}
