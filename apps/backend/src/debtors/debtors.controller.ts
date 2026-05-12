import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { DebtorsService } from './debtors.service';
import { PaymentMethodsService } from './payment-methods.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import {
  DebtorFilterDto,
  RecordBulkPaymentDto,
  CustomerStatementFilterDto,
  PaymentHistoryFilterDto,
  RecordCustomerDepositDto,
  ApplyWalletToInvoicesDto,
  WalletTransactionFilterDto,
  RecordBulkPaymentWithWalletDto,
} from './debtors.dto';

@Controller('debtors')
@UseGuards(JwtGuard)
export class DebtorsController {
  constructor(
    private readonly debtorsService: DebtorsService,
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  /**
   * Get all debtors with outstanding invoices
   * GET /debtors
   */
  @Get()
  async getAllDebtors(@Request() req, @Query() filters: DebtorFilterDto) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getAllDebtors(organizationId, filters);
  }

  /**
   * Get aging analysis report
   * GET /debtors/aging-analysis
   */
  @Get('aging-analysis')
  async getAgingAnalysis(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getAgingAnalysis(organizationId);
  }

  /**
   * Get customer statement
   * GET /debtors/customer/:customerId/statement
   */
  @Get('customer/:customerId/statement')
  async getCustomerStatement(
    @Request() req,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() filters: CustomerStatementFilterDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getCustomerStatement(
      organizationId,
      customerId,
      filters,
    );
  }

  /**
   * Get payment history for a customer
   * GET /debtors/customer/:customerId/payments
   */
  @Get('customer/:customerId/payments')
  async getCustomerPaymentHistory(
    @Request() req,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getCustomerPaymentHistory(
      organizationId,
      customerId,
      startDate,
      endDate,
    );
  }

  /**
   * Get outstanding invoices for a customer
   * GET /debtors/customer/:customerId/outstanding
   */
  @Get('customer/:customerId/outstanding')
  async getCustomerOutstandingInvoices(
    @Request() req,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getCustomerOutstandingInvoices(
      organizationId,
      customerId,
    );
  }

  /**
   * Record bulk payment for multiple invoices
   * POST /debtors/bulk-payment
   */
  @Post('bulk-payment')
  async recordBulkPayment(@Request() req, @Body() dto: RecordBulkPaymentDto) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.recordBulkPayment(organizationId, dto);
  }

  /**
   * Get enabled payment methods for the organization
   * GET /debtors/payment-methods
   */
  @Get('payment-methods')
  async getPaymentMethods(@Request() req) {
    const organizationId = req.user.organizationId;
    return this.paymentMethodsService.getPaymentMethods(organizationId);
  }

  /**
   * Get all customers (with or without debt)
   * GET /debtors/customers
   */
  @Get('customers')
  async getAllCustomers(
    @Request() req,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getAllCustomers(
      organizationId,
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * Get all payment history with filters
   * GET /debtors/payment-history
   */
  @Get('payment-history')
  async getAllPaymentHistory(
    @Request() req,
    @Query() filters: PaymentHistoryFilterDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getAllPaymentHistory(organizationId, filters);
  }

  // ============================
  // CUSTOMER WALLET ENDPOINTS
  // ============================

  /**
   * Get customer wallet balance and summary
   * GET /debtors/customer/:customerId/wallet
   */
  @Get('customer/:customerId/wallet')
  async getCustomerWallet(
    @Request() req,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getCustomerWallet(organizationId, customerId);
  }

  /**
   * Get customer wallet transactions
   * GET /debtors/customer/:customerId/wallet-transactions
   */
  @Get('customer/:customerId/wallet-transactions')
  async getCustomerWalletTransactions(
    @Request() req,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query() filters: WalletTransactionFilterDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.getCustomerWalletTransactions(
      organizationId,
      customerId,
      filters,
    );
  }

  /**
   * Record a customer deposit (advance payment)
   * POST /debtors/customer-deposit
   */
  @Post('customer-deposit')
  async recordCustomerDeposit(
    @Request() req,
    @Body() dto: RecordCustomerDepositDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.recordCustomerDeposit(organizationId, dto);
  }

  /**
   * Apply wallet balance to invoices
   * POST /debtors/apply-wallet
   */
  @Post('apply-wallet')
  async applyWalletToInvoices(
    @Request() req,
    @Body() dto: ApplyWalletToInvoicesDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.applyWalletToInvoices(organizationId, dto);
  }

  /**
   * Record bulk payment with overpayment/wallet support
   * POST /debtors/bulk-payment-wallet
   */
  @Post('bulk-payment-wallet')
  async recordBulkPaymentWithWallet(
    @Request() req,
    @Body() dto: RecordBulkPaymentWithWalletDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.debtorsService.recordBulkPaymentWithWallet(
      organizationId,
      dto,
    );
  }
}
