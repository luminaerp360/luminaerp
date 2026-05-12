import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateCreditSalePaymentDto } from './credit-sale-payment.dto';
import { CreateMultipleCreditSalePaymentDto } from './multiple-credit-sale-payment.dto';
import { CreditSalePayment, PaymentMethod } from '@prisma/client';
import { CreditSalePaymentService } from './credit-sale-payments.service';

@Controller('organizations/:organizationId/credit-sale-payments')
export class CreditSalePaymentController {
  constructor(private readonly paymentService: CreditSalePaymentService) {}

  @Post()
  async createPayment(
    @Body() dto: CreateCreditSalePaymentDto,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<CreditSalePayment> {
    return this.paymentService.createPayment(organizationId, dto);
  }

  @Post('multiple')
  async createMultiplePayments(
    @Body() dto: CreateMultipleCreditSalePaymentDto,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.paymentService.createMultiplePayments(organizationId, dto);
  }

  @Get('credit-sale/:id')
  async getPaymentsByCreditSaleId(
    @Param('id') id: string,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<CreditSalePayment[]> {
    return this.paymentService.getPaymentsByCreditSaleId(organizationId, +id);
  }

  @Get('method/:method')
  async getPaymentsByMethod(
    @Param('method', new ParseEnumPipe(PaymentMethod)) method: PaymentMethod,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<CreditSalePayment[]> {
    return this.paymentService.getPaymentsByMethod(organizationId, method);
  }

  @Get('total/method/:method')
  async getTotalPaymentsByMethod(
    @Param('method', new ParseEnumPipe(PaymentMethod)) method: PaymentMethod,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<{ method: PaymentMethod; total: number }> {
    const total = await this.paymentService.getTotalPaymentsByMethod(
      organizationId,
      method,
    );
    return { method, total };
  }
}
