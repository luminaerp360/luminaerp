import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { TransactionType, PaymentMethod } from '@prisma/client';
import { CreatePaymentDto, PaymentReportQueryDto } from './dto/create-payments-transaction.dto';
import { PaymentsService } from './payments-transactions.service';

@Controller('organizations/:organizationId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(organizationId,dto);
  }

  @Get('reports')
  async getPaymentReport(
    @Param('organizationId', new ParseIntPipe({ errorHttpStatusCode: 400 })) 
    organizationId: number,
    @Query(new ValidationPipe({ 
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })) 
    query: PaymentReportQueryDto
  ) {
    return this.paymentsService.generatePaymentReport(organizationId, query);
  }

 

  @Get(':id')
  async getPayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paymentsService.getPaymentById(organizationId, id);
  }


  @Post('sales/:orderId')
  async recordSalePayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body()
    dto: {
      amount: number;
      method: PaymentMethod;
      paidBy: string;
    },
  ) {
    return this.paymentsService.recordSalePayment(
      organizationId,
      orderId,
      dto.amount,
      dto.method,
      dto.paidBy,
    );
  }

  @Post('credit-sales/:creditSaleId')
  async recordCreditSalePayment(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('creditSaleId', ParseIntPipe) creditSaleId: number,
    @Body()
    dto: {
      amount: number;
      method: PaymentMethod;
      transactionCode?: string;
    },
  ) {
    return this.paymentsService.recordCreditSalePayment(
      organizationId,
      creditSaleId,
      dto.amount,
      dto.method,
      dto.transactionCode,
    );
  }

  
}