import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountType } from '@prisma/client';

@Injectable()
export class ChartOfAccountsService {
  constructor(private prisma: PrismaService) {}

  async createAccount(organizationId: number, dto: CreateAccountDto) {
    // Verify organization exists
    await this.verifyOrganization(organizationId);

    // Check for duplicate account code
    const existingAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountCode: dto.accountCode,
      },
    });

    if (existingAccount) {
      throw new ConflictException(
        `Account with code ${dto.accountCode} already exists`,
      );
    }

    // If parent account is specified, verify it exists
    if (dto.parentAccountId) {
      const parentAccount = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: dto.parentAccountId,
          organizationId,
        },
      });

      if (!parentAccount) {
        throw new NotFoundException('Parent account not found');
      }

      // Verify parent account is of compatible type
      if (parentAccount.accountType !== dto.accountType) {
        throw new BadRequestException(
          'Parent account must be of the same account type',
        );
      }
    }

    const account = await this.prisma.chartOfAccount.create({
      data: {
        ...dto,
        organizationId,
        isActive: dto.isActive ?? true,
        isSystem: dto.isSystem ?? false,
        currentBalance: 0,
      },
      include: {
        parentAccount: true,
        childAccounts: true,
      },
    });

    return {
      success: true,
      message: 'Account created successfully',
      account,
    };
  }

  async createBulkAccounts(
    organizationId: number,
    accounts: CreateAccountDto[],
  ) {
    await this.verifyOrganization(organizationId);

    const createdAccounts = [];
    const errors = [];

    for (const dto of accounts) {
      try {
        const result = await this.createAccount(organizationId, dto);
        createdAccounts.push(result.account);
      } catch (error) {
        console.error(`Failed to create account ${dto.accountCode}:`, error.message);
        errors.push({
          accountCode: dto.accountCode,
          error: error.message,
        });
      }
    }

    console.log(`Created ${createdAccounts.length} accounts, ${errors.length} errors`);

    return {
      success: true,
      message: `Created ${createdAccounts.length} accounts`,
      createdAccounts,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async getAllAccounts(
    organizationId: number,
    filters?: { type?: AccountType; isActive?: boolean },
  ) {
    await this.verifyOrganization(organizationId);

    const where: any = { organizationId };

    if (filters?.type) {
      where.accountType = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const accounts = await this.prisma.chartOfAccount.findMany({
      where,
      include: {
        parentAccount: {
          select: {
            id: true,
            accountCode: true,
            accountName: true,
          },
        },
        childAccounts: {
          select: {
            id: true,
            accountCode: true,
            accountName: true,
            accountType: true,
          },
        },
        _count: {
          select: {
            journalEntries: true,
          },
        },
      },
      orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    });

    console.log(`Found ${accounts.length} accounts for organization ${organizationId}, first few:`, accounts.slice(0, 3));

    return {
      success: true,
      count: accounts.length,
      accounts,
    };
  }

  async getAccountsTree(organizationId: number) {
    await this.verifyOrganization(organizationId);

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { organizationId },
      include: {
        childAccounts: {
          include: {
            childAccounts: true,
          },
        },
      },
      orderBy: { accountCode: 'asc' },
    });

    // Build hierarchical tree structure
    const rootAccounts = accounts.filter((acc) => !acc.parentAccountId);

    const buildTree = (parentId: number) => {
      return accounts
        .filter((acc) => acc.parentAccountId === parentId)
        .map((acc) => ({
          ...acc,
          children: buildTree(acc.id),
        }));
    };

    const tree = rootAccounts.map((acc) => ({
      ...acc,
      children: buildTree(acc.id),
    }));

    return {
      success: true,
      tree,
    };
  }

  async getAccountsByType(organizationId: number, accountType: AccountType) {
    await this.verifyOrganization(organizationId);

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        accountType,
        isActive: true,
      },
      include: {
        parentAccount: true,
        childAccounts: true,
      },
      orderBy: { accountCode: 'asc' },
    });

    return {
      success: true,
      accountType,
      count: accounts.length,
      accounts,
    };
  }

  async getBalanceSheetAccounts(organizationId: number) {
    await this.verifyOrganization(organizationId);

    const [assets, liabilities, equity] = await Promise.all([
      this.getAccountsByType(organizationId, AccountType.ASSET),
      this.getAccountsByType(organizationId, AccountType.LIABILITY),
      this.getAccountsByType(organizationId, AccountType.EQUITY),
    ]);

    return {
      success: true,
      balanceSheet: {
        assets: assets.accounts,
        liabilities: liabilities.accounts,
        equity: equity.accounts,
      },
    };
  }

  async getIncomeStatementAccounts(organizationId: number) {
    await this.verifyOrganization(organizationId);

    const [revenue, expenses] = await Promise.all([
      this.getAccountsByType(organizationId, AccountType.REVENUE),
      this.getAccountsByType(organizationId, AccountType.EXPENSE),
    ]);

    return {
      success: true,
      incomeStatement: {
        revenue: revenue.accounts,
        expenses: expenses.accounts,
      },
    };
  }

  async searchAccounts(organizationId: number, query: string) {
    await this.verifyOrganization(organizationId);

    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        OR: [
          { accountCode: { contains: query, mode: 'insensitive' } },
          { accountName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        parentAccount: true,
      },
      orderBy: { accountCode: 'asc' },
      take: 50,
    });

    return {
      success: true,
      query,
      count: accounts.length,
      accounts,
    };
  }

  async getAccountById(organizationId: number, id: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        parentAccount: true,
        childAccounts: true,
        _count: {
          select: {
            journalEntries: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      success: true,
      account,
    };
  }

  async getAccountBalance(
    organizationId: number,
    id: number,
    dateRange?: { startDate?: Date; endDate?: Date },
  ) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // TODO: Calculate balance from journal entries when journal module is implemented
    // For now, return the current balance from the account record

    return {
      success: true,
      accountCode: account.accountCode,
      accountName: account.accountName,
      currentBalance: account.currentBalance,
      balanceType: account.balanceType,
      dateRange,
    };
  }

  async getAccountTransactions(
    organizationId: number,
    id: number,
    dateRange?: { startDate?: Date; endDate?: Date },
  ) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const where: any = {
      accountId: id,
    };

    if (dateRange?.startDate || dateRange?.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) {
        where.createdAt.gte = dateRange.startDate;
      }
      if (dateRange.endDate) {
        where.createdAt.lte = dateRange.endDate;
      }
    }

    // TODO: Implement when journal entry module is created
    // const transactions = await this.prisma.journalEntry.findMany({ where });

    return {
      success: true,
      accountCode: account.accountCode,
      accountName: account.accountName,
      transactions: [], // Will be populated when journal module is implemented
      dateRange,
    };
  }

  async updateAccount(
    organizationId: number,
    id: number,
    dto: UpdateAccountDto,
  ) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystem) {
      throw new BadRequestException('Cannot modify system accounts');
    }

    // Check for duplicate account code if being changed
    if ('accountCode' in dto && dto.accountCode && dto.accountCode !== account.accountCode) {
      const existingAccount = await this.prisma.chartOfAccount.findFirst({
        where: {
          organizationId,
          accountCode: dto.accountCode,
          id: { not: id },
        },
      });

      if (existingAccount) {
        throw new ConflictException(
          `Account with code ${dto.accountCode} already exists`,
        );
      }
    }

    // Verify parent account if being changed
    if ('parentAccountId' in dto && dto.parentAccountId !== undefined && dto.parentAccountId !== account.parentAccountId) {
      const parentAccount = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: dto.parentAccountId,
          organizationId,
        },
      });

      if (!parentAccount) {
        throw new NotFoundException('Parent account not found');
      }

      // Prevent circular references
      if (dto.parentAccountId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }
    }

    const updatedAccount = await this.prisma.chartOfAccount.update({
      where: { id },
      data: dto,
      include: {
        parentAccount: true,
        childAccounts: true,
      },
    });

    return {
      success: true,
      message: 'Account updated successfully',
      account: updatedAccount,
    };
  }

  async toggleAccountStatus(
    organizationId: number,
    id: number,
    isActive: boolean,
  ) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystem) {
      throw new BadRequestException('Cannot deactivate system accounts');
    }

    const updatedAccount = await this.prisma.chartOfAccount.update({
      where: { id },
      data: { isActive },
    });

    return {
      success: true,
      message: `Account ${isActive ? 'activated' : 'deactivated'} successfully`,
      account: updatedAccount,
    };
  }

  async deleteAccount(organizationId: number, id: number) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
      include: {
        childAccounts: true,
        _count: {
          select: {
            journalEntries: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystem) {
      throw new BadRequestException('Cannot delete system accounts');
    }

    if (account.childAccounts.length > 0) {
      throw new BadRequestException(
        'Cannot delete account with child accounts. Delete or reassign child accounts first.',
      );
    }

    if (account._count.journalEntries > 0) {
      throw new BadRequestException(
        'Cannot delete account with existing transactions. Deactivate instead.',
      );
    }

    await this.prisma.chartOfAccount.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  async initializeDefaultChartOfAccounts(organizationId: number) {
    await this.verifyOrganization(organizationId);

    // Check if accounts already exist
    const existingAccounts = await this.prisma.chartOfAccount.count({
      where: { organizationId },
    });

    if (existingAccounts > 0) {
      throw new BadRequestException(
        'Chart of accounts already initialized for this organization',
      );
    }

    const defaultAccounts: CreateAccountDto[] = [
      // ASSETS
      {
        accountCode: '1000',
        accountName: 'Current Assets',
        accountType: AccountType.ASSET,
        accountCategory: 'CURRENT_ASSET',
        balanceType: 'DEBIT',
        description: 'Assets expected to be converted to cash within one year',
        isSystem: true,
      },
      {
        accountCode: '1010',
        accountName: 'Cash',
        accountType: AccountType.ASSET,
        accountCategory: 'CURRENT_ASSET',
        balanceType: 'DEBIT',
        description: 'Cash on hand and in bank accounts',
        isSystem: true,
      },
      {
        accountCode: '1020',
        accountName: 'Accounts Receivable',
        accountType: AccountType.ASSET,
        accountCategory: 'CURRENT_ASSET',
        balanceType: 'DEBIT',
        description: 'Money owed by customers',
        isSystem: true,
      },
      {
        accountCode: '1030',
        accountName: 'Inventory',
        accountType: AccountType.ASSET,
        accountCategory: 'CURRENT_ASSET',
        balanceType: 'DEBIT',
        description: 'Goods available for sale',
        isSystem: true,
      },
      {
        accountCode: '1100',
        accountName: 'Fixed Assets',
        accountType: AccountType.ASSET,
        accountCategory: 'FIXED_ASSET',
        balanceType: 'DEBIT',
        description: 'Long-term tangible assets',
        isSystem: true,
      },
      {
        accountCode: '1110',
        accountName: 'Equipment',
        accountType: AccountType.ASSET,
        accountCategory: 'FIXED_ASSET',
        balanceType: 'DEBIT',
        description: 'Machinery and equipment',
        isSystem: true,
      },
      {
        accountCode: '1120',
        accountName: 'Furniture and Fixtures',
        accountType: AccountType.ASSET,
        accountCategory: 'FIXED_ASSET',
        balanceType: 'DEBIT',
        description: 'Office furniture and fixtures',
        isSystem: true,
      },
      {
        accountCode: '1130',
        accountName: 'Vehicles',
        accountType: AccountType.ASSET,
        accountCategory: 'FIXED_ASSET',
        balanceType: 'DEBIT',
        description: 'Company vehicles',
        isSystem: true,
      },

      // LIABILITIES
      {
        accountCode: '2000',
        accountName: 'Current Liabilities',
        accountType: AccountType.LIABILITY,
        accountCategory: 'CURRENT_LIABILITY',
        balanceType: 'CREDIT',
        description: 'Obligations due within one year',
        isSystem: true,
      },
      {
        accountCode: '2010',
        accountName: 'Accounts Payable',
        accountType: AccountType.LIABILITY,
        accountCategory: 'CURRENT_LIABILITY',
        balanceType: 'CREDIT',
        description: 'Money owed to suppliers',
        isSystem: true,
      },
      {
        accountCode: '2020',
        accountName: 'Salaries Payable',
        accountType: AccountType.LIABILITY,
        accountCategory: 'CURRENT_LIABILITY',
        balanceType: 'CREDIT',
        description: 'Unpaid employee salaries',
        isSystem: true,
      },
      {
        accountCode: '2030',
        accountName: 'Tax Payable',
        accountType: AccountType.LIABILITY,
        accountCategory: 'CURRENT_LIABILITY',
        balanceType: 'CREDIT',
        description: 'Taxes owed to government',
        isSystem: true,
      },
      {
        accountCode: '2100',
        accountName: 'Long-term Liabilities',
        accountType: AccountType.LIABILITY,
        accountCategory: 'LONG_TERM_LIABILITY',
        balanceType: 'CREDIT',
        description: 'Obligations due after one year',
        isSystem: true,
      },
      {
        accountCode: '2110',
        accountName: 'Loans Payable',
        accountType: AccountType.LIABILITY,
        accountCategory: 'LONG_TERM_LIABILITY',
        balanceType: 'CREDIT',
        description: 'Long-term loans and notes payable',
        isSystem: true,
      },

      // EQUITY
      {
        accountCode: '3000',
        accountName: 'Owner\'s Equity',
        accountType: AccountType.EQUITY,
        accountCategory: 'EQUITY',
        balanceType: 'CREDIT',
        description: 'Owner\'s investment and retained earnings',
        isSystem: true,
      },
      {
        accountCode: '3010',
        accountName: 'Capital',
        accountType: AccountType.EQUITY,
        accountCategory: 'EQUITY',
        balanceType: 'CREDIT',
        description: 'Owner\'s capital investment',
        isSystem: true,
      },
      {
        accountCode: '3020',
        accountName: 'Retained Earnings',
        accountType: AccountType.EQUITY,
        accountCategory: 'EQUITY',
        balanceType: 'CREDIT',
        description: 'Accumulated profits retained in business',
        isSystem: true,
      },
      {
        accountCode: '3030',
        accountName: 'Drawings',
        accountType: AccountType.EQUITY,
        accountCategory: 'EQUITY',
        balanceType: 'DEBIT',
        description: 'Owner withdrawals',
        isSystem: true,
      },

      // REVENUE
      {
        accountCode: '4000',
        accountName: 'Sales Revenue',
        accountType: AccountType.REVENUE,
        accountCategory: 'OPERATING_REVENUE',
        balanceType: 'CREDIT',
        description: 'Revenue from sales of goods and services',
        isSystem: true,
      },
      {
        accountCode: '4010',
        accountName: 'Product Sales',
        accountType: AccountType.REVENUE,
        accountCategory: 'OPERATING_REVENUE',
        balanceType: 'CREDIT',
        description: 'Revenue from product sales',
        isSystem: true,
      },
      {
        accountCode: '4020',
        accountName: 'Service Revenue',
        accountType: AccountType.REVENUE,
        accountCategory: 'OPERATING_REVENUE',
        balanceType: 'CREDIT',
        description: 'Revenue from services provided',
        isSystem: true,
      },
      {
        accountCode: '4100',
        accountName: 'Other Income',
        accountType: AccountType.REVENUE,
        accountCategory: 'NON_OPERATING_REVENUE',
        balanceType: 'CREDIT',
        description: 'Income from other sources',
        isSystem: true,
      },

      // EXPENSES
      {
        accountCode: '5000',
        accountName: 'Cost of Goods Sold',
        accountType: AccountType.EXPENSE,
        accountCategory: 'COST_OF_SALES',
        balanceType: 'DEBIT',
        description: 'Direct costs of producing goods sold',
        isSystem: true,
      },
      {
        accountCode: '5100',
        accountName: 'Operating Expenses',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Regular business operating expenses',
        isSystem: true,
      },
      {
        accountCode: '5110',
        accountName: 'Salaries and Wages',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Employee compensation',
        isSystem: true,
      },
      {
        accountCode: '5120',
        accountName: 'Rent Expense',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Rental payments for premises',
        isSystem: true,
      },
      {
        accountCode: '5130',
        accountName: 'Utilities Expense',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Electricity, water, internet, etc.',
        isSystem: true,
      },
      {
        accountCode: '5140',
        accountName: 'Office Supplies',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Office supplies and materials',
        isSystem: true,
      },
      {
        accountCode: '5150',
        accountName: 'Marketing and Advertising',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Marketing and promotional expenses',
        isSystem: true,
      },
      {
        accountCode: '5160',
        accountName: 'Insurance Expense',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Insurance premiums',
        isSystem: true,
      },
      {
        accountCode: '5170',
        accountName: 'Depreciation Expense',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Depreciation of fixed assets',
        isSystem: true,
      },
      {
        accountCode: '5180',
        accountName: 'Bad Debt Expense',
        accountType: AccountType.EXPENSE,
        accountCategory: 'OPERATING_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Uncollectible receivables',
        isSystem: true,
      },
      {
        accountCode: '5200',
        accountName: 'Financial Expenses',
        accountType: AccountType.EXPENSE,
        accountCategory: 'FINANCIAL_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Interest and bank charges',
        isSystem: true,
      },
      {
        accountCode: '5210',
        accountName: 'Interest Expense',
        accountType: AccountType.EXPENSE,
        accountCategory: 'FINANCIAL_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Interest on loans and credit',
        isSystem: true,
      },
      {
        accountCode: '5220',
        accountName: 'Bank Charges',
        accountType: AccountType.EXPENSE,
        accountCategory: 'FINANCIAL_EXPENSE',
        balanceType: 'DEBIT',
        description: 'Bank fees and charges',
        isSystem: true,
      },
    ];

    const result = await this.createBulkAccounts(
      organizationId,
      defaultAccounts,
    );

    console.log('Bulk creation result:', result);

    return {
      success: true,
      message: 'Default chart of accounts initialized successfully',
      ...result,
    };
  }

  private async verifyOrganization(organizationId: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }
}
