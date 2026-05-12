import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  Patch,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { JwtGuard } from 'src/auth/guard';

@Controller('organizations/:organizationId/expenses')
@UseGuards(JwtGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  async createExpense(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.createExpense(organizationId, dto);
  }

  @Get()
  async getAllExpenses(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
    @Query('vendor') vendor?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expenseService.getAllExpenses(organizationId, {
      startDate,
      endDate,
      category,
      paymentMethod,
      status,
      vendor,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('analytics/dashboard')
  async getExpenseAnalytics(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.getExpenseAnalytics(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get('analytics/trends')
  async getExpenseTrends(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('period') period?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.expenseService.getExpenseTrends(
      organizationId,
      period,
      groupBy,
    );
  }

  @Get('categories/list')
  async getExpenseCategories(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.expenseService.getExpenseCategories(organizationId);
  }

  @Get('categories/budget')
  async getCategoryBudgets(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.expenseService.getCategoryBudgets(organizationId, month, year);
  }

  @Get(':id')
  async getExpenseById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.expenseService.getExpenseById(organizationId, id);
  }

  @Put(':id')
  async updateExpense(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.updateExpense(organizationId, id, dto);
  }

  @Patch(':id/approve')
  async approveExpense(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('approvedBy') approvedBy: number,
    @Body('notes') notes?: string,
  ) {
    return this.expenseService.approveExpense(
      organizationId,
      id,
      approvedBy,
      notes,
    );
  }

  @Patch(':id/reject')
  async rejectExpense(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('rejectedBy') rejectedBy: number,
    @Body('reason') reason: string,
  ) {
    return this.expenseService.rejectExpense(
      organizationId,
      id,
      rejectedBy,
      reason,
    );
  }

  @Post('bulk-delete')
  async bulkDeleteExpenses(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body('expenseIds') expenseIds: number[],
  ) {
    return this.expenseService.bulkDeleteExpenses(organizationId, expenseIds);
  }

  @Post('bulk-approve')
  async bulkApproveExpenses(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body('expenseIds') expenseIds: number[],
    @Body('approvedBy') approvedBy: number,
  ) {
    return this.expenseService.bulkApproveExpenses(
      organizationId,
      expenseIds,
      approvedBy,
    );
  }

  @Post('export')
  async exportExpenses(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() filters: any,
  ) {
    return this.expenseService.exportExpenses(organizationId, filters);
  }

  @Delete(':id')
  async deleteExpense(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.expenseService.deleteExpense(organizationId, id);
  }
}
