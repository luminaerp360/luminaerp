import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  Patch,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtGuard } from '../auth/guard';
import { AccountType } from '@prisma/client';

@Controller('organizations/:organizationId/chart-of-accounts')
@UseGuards(JwtGuard)
export class ChartOfAccountsController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
  ) {}

  @Post()
  async createAccount(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateAccountDto,
  ) {
    return this.chartOfAccountsService.createAccount(organizationId, dto);
  }

  @Post('bulk')
  async createBulkAccounts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: { accounts: CreateAccountDto[] },
  ) {
    return this.chartOfAccountsService.createBulkAccounts(
      organizationId,
      dto.accounts,
    );
  }

  @Get()
  async getAllAccounts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('type') type?: AccountType,
    @Query('isActive') isActive?: string,
  ) {
    const filters: { type?: AccountType; isActive?: boolean } = {};
    if (type) filters.type = type;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    return this.chartOfAccountsService.getAllAccounts(organizationId, filters);
  }

  @Get('tree')
  async getAccountsTree(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.chartOfAccountsService.getAccountsTree(organizationId);
  }

  @Get('by-type/:accountType')
  async getAccountsByType(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('accountType') accountType: AccountType,
  ) {
    return this.chartOfAccountsService.getAccountsByType(
      organizationId,
      accountType,
    );
  }

  @Get('balance-sheet')
  async getBalanceSheetAccounts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.chartOfAccountsService.getBalanceSheetAccounts(organizationId);
  }

  @Get('income-statement')
  async getIncomeStatementAccounts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.chartOfAccountsService.getIncomeStatementAccounts(
      organizationId,
    );
  }

  @Get('search')
  async searchAccounts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('query') query: string,
  ) {
    return this.chartOfAccountsService.searchAccounts(organizationId, query);
  }

  @Get(':id')
  async getAccountById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chartOfAccountsService.getAccountById(organizationId, id);
  }

  @Get(':id/balance')
  async getAccountBalance(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.chartOfAccountsService.getAccountBalance(organizationId, id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id/transactions')
  async getAccountTransactions(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.chartOfAccountsService.getAccountTransactions(
      organizationId,
      id,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    );
  }

  @Patch(':id')
  async updateAccount(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.chartOfAccountsService.updateAccount(organizationId, id, dto);
  }

  @Patch(':id/activate')
  async activateAccount(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chartOfAccountsService.toggleAccountStatus(
      organizationId,
      id,
      true,
    );
  }

  @Patch(':id/deactivate')
  async deactivateAccount(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chartOfAccountsService.toggleAccountStatus(
      organizationId,
      id,
      false,
    );
  }

  @Delete(':id')
  async deleteAccount(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chartOfAccountsService.deleteAccount(organizationId, id);
  }

  @Post('initialize-default')
  async initializeDefaultAccounts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.chartOfAccountsService.initializeDefaultChartOfAccounts(
      organizationId,
    );
  }
}
