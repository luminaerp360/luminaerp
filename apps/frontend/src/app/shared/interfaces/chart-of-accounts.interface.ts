export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum AccountCategory {
  CURRENT_ASSET = 'CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  INTANGIBLE_ASSET = 'INTANGIBLE_ASSET',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  EQUITY = 'EQUITY',
  OPERATING_REVENUE = 'OPERATING_REVENUE',
  NON_OPERATING_REVENUE = 'NON_OPERATING_REVENUE',
  COST_OF_SALES = 'COST_OF_SALES',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  FINANCIAL_EXPENSE = 'FINANCIAL_EXPENSE',
  TAX_EXPENSE = 'TAX_EXPENSE',
}

export enum BalanceType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export interface ChartOfAccount {
  id: number;
  organizationId: number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  balanceType: BalanceType;
  description?: string;
  parentAccountId?: number;
  parentAccount?: {
    id: number;
    accountCode: string;
    accountName: string;
  };
  childAccounts?: ChartOfAccount[];
  currentBalance: number;
  isActive: boolean;
  isSystem: boolean;
  taxCode?: string;
  bankDetails?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    journalEntries: number;
  };
}

export interface CreateAccountDto {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  balanceType: BalanceType;
  description?: string;
  parentAccountId?: number;
  isActive?: boolean;
  isSystem?: boolean;
  taxCode?: string;
  bankDetails?: string;
}

export interface UpdateAccountDto {
  accountCode?: string;
  accountName?: string;
  accountType?: AccountType;
  accountCategory?: AccountCategory;
  balanceType?: BalanceType;
  description?: string;
  parentAccountId?: number;
  isActive?: boolean;
  taxCode?: string;
  bankDetails?: string;
}

export interface AccountWithChildren extends ChartOfAccount {
  children?: AccountWithChildren[];
}

export interface BalanceSheetAccounts {
  assets: ChartOfAccount[];
  liabilities: ChartOfAccount[];
  equity: ChartOfAccount[];
}

export interface IncomeStatementAccounts {
  revenue: ChartOfAccount[];
  expenses: ChartOfAccount[];
}
