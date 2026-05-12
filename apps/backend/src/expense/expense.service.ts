import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseStatus } from './dto';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyOrganization(organizationId: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }
  }

  async createExpense(organizationId: number, dto: CreateExpenseDto) {
    // Verify organization exists
    await this.verifyOrganization(organizationId);

    const data: any = {
      title: dto.title,
      amount: dto.amount,
      description: dto.description,
      category: dto.category,
      createdBy: dto.createdBy,
      paidBy: dto.paidBy,
      paymentMethod: dto.paymentMethod,
      receiptUrl: dto.receiptUrl,
      expenseDate: dto.expenseDate
        ? new Date(dto.expenseDate as any)
        : new Date(),
      expenseType: dto.expenseType || 'ONE_TIME',
      paymentReference: dto.paymentReference,
      paidAmount: dto.paidAmount || dto.amount,
      transactionCode: dto.transactionCode,
      status: dto.status || ExpenseStatus.APPROVED,

      // Advanced fields
      vendor: dto.vendor,
      invoiceNumber: dto.invoiceNumber,
      dueDate: dto.dueDate ? new Date(dto.dueDate as any) : undefined,
      isRecurring: dto.isRecurring || false,
      recurrenceRule: dto.recurrenceRule
        ? JSON.stringify(dto.recurrenceRule)
        : undefined,
      attachments: dto.attachments
        ? JSON.stringify(dto.attachments)
        : undefined,
      tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
      notes: dto.notes,
      projectId: dto.projectId,
      departmentId: dto.departmentId,
      isBillable: dto.isBillable || false,
      isReimbursable: dto.isReimbursable || false,
      taxRate: dto.taxRate || 0,
      taxAmount: dto.taxAmount || 0,

      organization: {
        connect: {
          id: organizationId,
        },
      },
    };

    if (dto.chartOfAccountId !== undefined && dto.chartOfAccountId !== null) {
      data.chartOfAccount = {
        connect: {
          id: dto.chartOfAccountId,
        },
      };
    }

    return this.prisma.expense.create({
      data,
      include: {
        chartOfAccount: true,
      },
    });
  }

  async getAllExpenses(
    organizationId: number,
    filters?: {
      startDate?: string;
      endDate?: string;
      category?: string;
      paymentMethod?: string;
      status?: string;
      vendor?: string;
      minAmount?: number;
      maxAmount?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const whereClause: any = {
      organizationId,
    };

    // Add date range filter if provided
    if (filters?.startDate && filters?.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

      // Set time to start and end of day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      whereClause.expenseDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Add category filter if provided
    if (filters?.category) {
      whereClause.category = filters.category;
    }

    // Add payment method filter if provided
    if (filters?.paymentMethod) {
      whereClause.paymentMethod = filters.paymentMethod;
    }

    // Add status filter
    if (filters?.status) {
      whereClause.status = filters.status;
    }

    // Add amount range filter
    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      whereClause.amount = {};
      if (filters.minAmount !== undefined) {
        whereClause.amount.gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        whereClause.amount.lte = filters.maxAmount;
      }
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    // Get the expenses with filters
    const [expenses, totalCount] = await Promise.all([
      this.prisma.expense.findMany({
        where: whereClause,
        include: {
          chartOfAccount: true,
        },
        orderBy: {
          expenseDate: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where: whereClause }),
    ]);

    // Calculate totals
    const totals = expenses.reduce(
      (acc, expense) => {
        acc.totalAmount += expense.amount;
        acc.totalPaid += expense.paidAmount || 0;
        acc.categorySums[expense.category] =
          (acc.categorySums[expense.category] || 0) + expense.amount;
        acc.paymentMethodSums[expense.paymentMethod] =
          (acc.paymentMethodSums[expense.paymentMethod] || 0) + expense.amount;
        acc.statusCounts[expense.status] =
          (acc.statusCounts[expense.status] || 0) + 1;
        return acc;
      },
      {
        totalAmount: 0,
        totalPaid: 0,
        categorySums: {},
        paymentMethodSums: {},
        statusCounts: {},
      },
    );

    // Group expenses by chartOfAccountId
    const groupedByAccount: Record<string, any[]> = {};
    const accountTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      const accountId = expense.chartOfAccountId?.toString() || 'unassigned';

      if (!groupedByAccount[accountId]) {
        groupedByAccount[accountId] = [];
        accountTotals[accountId] = 0;
      }

      groupedByAccount[accountId].push(expense);
      accountTotals[accountId] += expense.amount;
    });

    return {
      expenses,
      groupedByAccount,
      accountTotals,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
      summary: {
        totalExpenses: expenses.length,
        totalAmount: totals.totalAmount,
        totalPaid: totals.totalPaid,
        outstanding: totals.totalAmount - totals.totalPaid,
        byCategory: totals.categorySums,
        byPaymentMethod: totals.paymentMethodSums,
        byStatus: totals.statusCounts,
        dateRange:
          filters?.startDate && filters?.endDate
            ? {
                from: filters.startDate,
                to: filters.endDate,
              }
            : null,
      },
    };
  }

  async getExpenseById(organizationId: number, id: number) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        chartOfAccount: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(
        `Expense with ID ${id} not found in this organization`,
      );
    }

    return expense;
  }

  async updateExpense(
    organizationId: number,
    id: number,
    dto: UpdateExpenseDto,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!expense) {
      throw new NotFoundException(
        `Expense with ID ${id} not found in this organization`,
      );
    }

    const data: any = {
      ...(dto.title && { title: dto.title }),
      ...(dto.amount && { amount: dto.amount }),
      ...(dto.description && { description: dto.description }),
      ...(dto.category && { category: dto.category }),
      ...(dto.paidBy && { paidBy: dto.paidBy }),
      ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
      ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
      ...(dto.expenseType && { expenseType: dto.expenseType }),
      ...(dto.paymentReference && { paymentReference: dto.paymentReference }),
      ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount }),
      ...(dto.transactionCode !== undefined && {
        transactionCode: dto.transactionCode,
      }),
      ...(dto.expenseDate && { expenseDate: new Date(dto.expenseDate as any) }),
      ...(dto.status && { status: dto.status }),

      // Advanced fields
      ...(dto.vendor !== undefined && { vendor: dto.vendor }),
      ...(dto.invoiceNumber !== undefined && {
        invoiceNumber: dto.invoiceNumber,
      }),
      ...(dto.dueDate !== undefined && {
        dueDate: dto.dueDate ? new Date(dto.dueDate as any) : null,
      }),
      ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
      ...(dto.recurrenceRule !== undefined && {
        recurrenceRule: dto.recurrenceRule
          ? JSON.stringify(dto.recurrenceRule)
          : null,
      }),
      ...(dto.attachments !== undefined && {
        attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
      }),
      ...(dto.tags !== undefined && {
        tags: dto.tags ? JSON.stringify(dto.tags) : null,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.projectId !== undefined && { projectId: dto.projectId }),
      ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
      ...(dto.isBillable !== undefined && { isBillable: dto.isBillable }),
      ...(dto.isReimbursable !== undefined && {
        isReimbursable: dto.isReimbursable,
      }),
      ...(dto.taxRate !== undefined && { taxRate: dto.taxRate }),
      ...(dto.taxAmount !== undefined && { taxAmount: dto.taxAmount }),

      updatedAt: new Date(),
    };

    if (dto.chartOfAccountId !== undefined && dto.chartOfAccountId !== null) {
      data.chartOfAccount = {
        connect: {
          id: dto.chartOfAccountId,
        },
      };
    }

    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async deleteExpense(organizationId: number, id: number) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!expense) {
      throw new NotFoundException(
        `Expense with ID ${id} not found in this organization`,
      );
    }

    return this.prisma.expense.delete({
      where: { id },
    });
  }

  // Advanced Analytics Methods
  async getExpenseAnalytics(
    organizationId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const expenses = await this.prisma.expense.findMany({
      where: {
        organizationId,
        expenseDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const analytics = {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      totalPaid: expenses.reduce((sum, exp) => sum + (exp.paidAmount || 0), 0),
      averageExpense:
        expenses.length > 0
          ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length
          : 0,

      byCategory: this.groupByField(expenses, 'category'),
      byPaymentMethod: this.groupByField(expenses, 'paymentMethod'),
      byStatus: this.groupByField(expenses, 'status'),
      byMonth: this.groupByMonth(expenses),

      topExpenses: expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((exp) => ({
          id: exp.id,
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          date: exp.expenseDate,
        })),

      statusBreakdown: {
        approved: expenses.filter(
          (e) => e.status === 'APPROVED' || e.status === 'Approved',
        ).length,
        pending: expenses.filter(
          (e) => e.status === 'PENDING_APPROVAL' || e.status === 'Pending',
        ).length,
        rejected: expenses.filter(
          (e) => e.status === 'REJECTED' || e.status === 'Rejected',
        ).length,
        draft: expenses.filter((e) => e.status === 'DRAFT').length,
      },
    };

    return analytics;
  }

  async getExpenseTrends(
    organizationId: number,
    period: string = 'monthly',
    groupBy: string = 'category',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'monthly':
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        break;
    }

    const expenses = await this.prisma.expense.findMany({
      where: {
        organizationId,
        expenseDate: {
          gte: startDate,
        },
      },
      orderBy: {
        expenseDate: 'asc',
      },
    });

    return {
      period,
      trends: this.calculateTrends(expenses, period, groupBy),
    };
  }

  async getExpenseCategories(organizationId: number) {
    const categories = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        organizationId,
      },
      _count: {
        category: true,
      },
      _sum: {
        amount: true,
      },
    });

    return categories.map((cat) => ({
      name: cat.category,
      count: cat._count.category,
      totalAmount: cat._sum.amount || 0,
    }));
  }

  async getCategoryBudgets(
    organizationId: number,
    month?: string,
    year?: string,
  ) {
    const targetMonth = month ? parseInt(month) : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);

    const expenses = await this.prisma.expense.findMany({
      where: {
        organizationId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const categorySpending = expenses.reduce(
      (acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // You can add budget limits from a settings table later
    return Object.entries(categorySpending).map(([category, spent]) => ({
      category,
      spent,
      budgetLimit: 0, // TODO: Fetch from budget settings
      percentage: 0,
    }));
  }

  async approveExpense(
    organizationId: number,
    id: number,
    approvedBy: number,
    notes?: string,
  ) {
    const expense = await this.getExpenseById(organizationId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'Approved',
        updatedAt: new Date(),
      },
    });
  }

  async rejectExpense(
    organizationId: number,
    id: number,
    rejectedBy: number,
    reason: string,
  ) {
    const expense = await this.getExpenseById(organizationId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'Rejected',
        description: expense.description + `\n\nRejection reason: ${reason}`,
        updatedAt: new Date(),
      },
    });
  }

  async bulkDeleteExpenses(organizationId: number, expenseIds: number[]) {
    // Verify all expenses belong to the organization
    const expenses = await this.prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        organizationId,
      },
    });

    if (expenses.length !== expenseIds.length) {
      throw new BadRequestException(
        'Some expenses not found or do not belong to this organization',
      );
    }

    const result = await this.prisma.expense.deleteMany({
      where: {
        id: { in: expenseIds },
        organizationId,
      },
    });

    return {
      deleted: result.count,
      message: `Successfully deleted ${result.count} expenses`,
    };
  }

  async bulkApproveExpenses(
    organizationId: number,
    expenseIds: number[],
    approvedBy: number,
  ) {
    const result = await this.prisma.expense.updateMany({
      where: {
        id: { in: expenseIds },
        organizationId,
      },
      data: {
        status: 'Approved',
        updatedAt: new Date(),
      },
    });

    return {
      approved: result.count,
      message: `Successfully approved ${result.count} expenses`,
    };
  }

  async exportExpenses(organizationId: number, filters: any) {
    const { expenses } = await this.getAllExpenses(organizationId, filters);

    return {
      data: expenses.map((exp) => ({
        'Expense ID': exp.id,
        Title: exp.title,
        Amount: exp.amount,
        'Paid Amount': exp.paidAmount,
        Category: exp.category,
        Status: exp.status,
        'Payment Method': exp.paymentMethod,
        'Paid By': exp.paidBy,
        'Expense Date': exp.expenseDate,
        Description: exp.description,
        'Transaction Code': exp.transactionCode,
        'Chart of Account': exp.chartOfAccount
          ? `${exp.chartOfAccount.accountCode} - ${exp.chartOfAccount.accountName}`
          : '',
        'Created At': exp.createdAt,
      })),
      count: expenses.length,
      exportedAt: new Date().toISOString(),
    };
  }

  // Helper methods
  private groupByField(expenses: any[], field: string) {
    return expenses.reduce((acc, exp) => {
      const key = exp[field];
      if (!acc[key]) {
        acc[key] = { count: 0, total: 0 };
      }
      acc[key].count++;
      acc[key].total += exp.amount;
      return acc;
    }, {});
  }

  private groupByMonth(expenses: any[]) {
    return expenses.reduce((acc, exp) => {
      const month = new Date(exp.expenseDate).toISOString().substring(0, 7);
      if (!acc[month]) {
        acc[month] = { count: 0, total: 0 };
      }
      acc[month].count++;
      acc[month].total += exp.amount;
      return acc;
    }, {});
  }

  private calculateTrends(expenses: any[], period: string, groupBy: string) {
    // Group expenses by time period and specified field
    const trends: Record<string, any> = {};

    expenses.forEach((exp) => {
      let timeKey: string;
      const date = new Date(exp.expenseDate);

      switch (period) {
        case 'daily':
          timeKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekNum = this.getWeekNumber(date);
          timeKey = `${date.getFullYear()}-W${weekNum}`;
          break;
        case 'monthly':
        default:
          timeKey = date.toISOString().substring(0, 7);
          break;
      }

      if (!trends[timeKey]) {
        trends[timeKey] = {};
      }

      const groupKey = exp[groupBy] || 'Other';
      if (!trends[timeKey][groupKey]) {
        trends[timeKey][groupKey] = 0;
      }

      trends[timeKey][groupKey] += exp.amount;
    });

    return trends;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
