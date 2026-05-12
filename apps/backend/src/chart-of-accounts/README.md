# Chart of Accounts Module

A comprehensive, modern accounting system for managing the Chart of Accounts in the Lumina ERP system.

## Features

### ✅ Complete Account Management
- Create, read, update, and delete accounts
- Hierarchical account structure (parent-child relationships)
- Five main account types: **Assets**, **Liabilities**, **Equity**, **Revenue**, **Expenses**
- Detailed account categories for better classification
- System accounts protection (cannot be deleted)
- Active/Inactive account status

### ✅ Modern Account Structure
- **Account Code**: Unique identifier (e.g., 1010, 2000, 5120)
- **Account Name**: Descriptive name
- **Account Type**: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- **Account Category**: Detailed sub-classification
- **Balance Type**: DEBIT or CREDIT nature
- **Hierarchical**: Parent-child account relationships
- **Balance Tracking**: Current balance stored per account
- **Multi-tenant**: Isolated per organization

### ✅ Pre-configured Default Accounts
Initialize a complete chart of accounts with one API call:
- **Assets** (Current & Fixed)
  - Cash, Accounts Receivable, Inventory
  - Equipment, Furniture, Vehicles
- **Liabilities** (Current & Long-term)
  - Accounts Payable, Salaries Payable, Tax Payable
  - Loans Payable
- **Equity**
  - Owner's Capital, Retained Earnings, Drawings
- **Revenue**
  - Sales Revenue, Service Revenue, Other Income
- **Expenses**
  - Cost of Goods Sold, Operating Expenses, Financial Expenses
  - Salaries, Rent, Utilities, Marketing, etc.

### ✅ Advanced Features
- **Tree View**: Hierarchical display of accounts
- **Search**: Search by code, name, or description
- **Filtering**: Filter by type, status, category
- **Balance Sheet View**: Assets, Liabilities, Equity accounts
- **Income Statement View**: Revenue and Expense accounts
- **Account Balances**: Track balances with date ranges
- **Transaction History**: View all transactions per account
- **Bulk Operations**: Create multiple accounts at once

## API Endpoints

### Base URL
```
/organizations/:organizationId/chart-of-accounts
```

### Endpoints

#### 1. Initialize Default Chart of Accounts
```http
POST /organizations/:organizationId/chart-of-accounts/initialize-default
```
Creates a complete, professional chart of accounts with ~35 default accounts.

**Response:**
```json
{
  "success": true,
  "message": "Default chart of accounts initialized successfully",
  "createdAccounts": [...],
  "errors": []
}
```

#### 2. Create Account
```http
POST /organizations/:organizationId/chart-of-accounts
```

**Request Body:**
```json
{
  "accountCode": "1040",
  "accountName": "Petty Cash",
  "accountType": "ASSET",
  "accountCategory": "CURRENT_ASSET",
  "balanceType": "DEBIT",
  "description": "Small cash for daily expenses",
  "parentAccountId": null,
  "isActive": true,
  "isSystem": false
}
```

#### 3. Get All Accounts
```http
GET /organizations/:organizationId/chart-of-accounts
GET /organizations/:organizationId/chart-of-accounts?type=ASSET
GET /organizations/:organizationId/chart-of-accounts?isActive=true
```

#### 4. Get Accounts Tree
```http
GET /organizations/:organizationId/chart-of-accounts/tree
```
Returns hierarchical tree structure with parent-child relationships.

#### 5. Get Balance Sheet Accounts
```http
GET /organizations/:organizationId/chart-of-accounts/balance-sheet
```
Returns assets, liabilities, and equity accounts.

#### 6. Get Income Statement Accounts
```http
GET /organizations/:organizationId/chart-of-accounts/income-statement
```
Returns revenue and expense accounts.

#### 7. Search Accounts
```http
GET /organizations/:organizationId/chart-of-accounts/search?query=cash
```

#### 8. Get Account by ID
```http
GET /organizations/:organizationId/chart-of-accounts/:id
```

#### 9. Get Account Balance
```http
GET /organizations/:organizationId/chart-of-accounts/:id/balance
GET /organizations/:organizationId/chart-of-accounts/:id/balance?startDate=2024-01-01&endDate=2024-12-31
```

#### 10. Update Account
```http
PATCH /organizations/:organizationId/chart-of-accounts/:id
```

#### 11. Activate/Deactivate Account
```http
PATCH /organizations/:organizationId/chart-of-accounts/:id/activate
PATCH /organizations/:organizationId/chart-of-accounts/:id/deactivate
```

#### 12. Delete Account
```http
DELETE /organizations/:organizationId/chart-of-accounts/:id
```
Note: Cannot delete system accounts or accounts with transactions/child accounts.

## Account Types & Categories

### Account Types (Enum: AccountType)
- `ASSET` - Resources owned by the business
- `LIABILITY` - Obligations owed by the business
- `EQUITY` - Owner's investment and retained earnings
- `REVENUE` - Income from business operations
- `EXPENSE` - Costs incurred in operations

### Account Categories (Enum: AccountCategory)
- **Assets**: `CURRENT_ASSET`, `FIXED_ASSET`, `INTANGIBLE_ASSET`
- **Liabilities**: `CURRENT_LIABILITY`, `LONG_TERM_LIABILITY`
- **Equity**: `EQUITY`
- **Revenue**: `OPERATING_REVENUE`, `NON_OPERATING_REVENUE`
- **Expenses**: `COST_OF_SALES`, `OPERATING_EXPENSE`, `FINANCIAL_EXPENSE`, `TAX_EXPENSE`

### Balance Types (Enum: BalanceType)
- `DEBIT` - Natural debit balance (Assets, Expenses)
- `CREDIT` - Natural credit balance (Liabilities, Equity, Revenue)

## Database Schema

### ChartOfAccount Model
```prisma
model ChartOfAccount {
  id              Int
  organizationId  Int
  accountCode     String          // Unique per organization
  accountName     String
  accountType     AccountType
  accountCategory AccountCategory
  balanceType     BalanceType
  description     String?
  parentAccountId Int?
  parentAccount   ChartOfAccount?
  childAccounts   ChartOfAccount[]
  currentBalance  Float
  isActive        Boolean
  isSystem        Boolean         // System accounts protected
  taxCode         String?
  bankDetails     String?
  journalEntries  JournalEntry[]
  createdAt       DateTime
  updatedAt       DateTime
}
```

### JournalEntry Model
```prisma
model JournalEntry {
  id              Int
  organizationId  Int
  accountId       Int
  account         ChartOfAccount
  journalId       String          // Batch reference
  transactionDate DateTime
  description     String
  reference       String?
  debitAmount     Float
  creditAmount    Float
  balance         Float
  createdBy       String
  createdAt       DateTime
  updatedAt       DateTime
}
```

## Usage Examples

### Initialize for New Organization
```typescript
POST /organizations/1/chart-of-accounts/initialize-default
```

### Create Custom Account
```typescript
POST /organizations/1/chart-of-accounts
{
  "accountCode": "1015",
  "accountName": "Mobile Money",
  "accountType": "ASSET",
  "accountCategory": "CURRENT_ASSET",
  "balanceType": "DEBIT",
  "description": "M-Pesa and other mobile money accounts",
  "parentAccountId": 2  // Parent: Cash account
}
```

### Get All Active Revenue Accounts
```typescript
GET /organizations/1/chart-of-accounts?type=REVENUE&isActive=true
```

### Search for Cash Accounts
```typescript
GET /organizations/1/chart-of-accounts/search?query=cash
```

## Business Rules

1. **Unique Account Codes**: Each organization must have unique account codes
2. **Parent-Child Type Matching**: Child accounts must match parent account type
3. **System Account Protection**: System accounts cannot be deleted or deactivated
4. **Transaction Protection**: Accounts with transactions can only be deactivated, not deleted
5. **Hierarchy Protection**: Parent accounts with children cannot be deleted
6. **Balance Integrity**: Balances are maintained and tracked per account

## Integration with Other Modules

### Future Integrations
- **Sales Module**: Automatically post to Revenue accounts
- **Purchases Module**: Post to Expense and Accounts Payable
- **Inventory Module**: Track COGS and Inventory asset accounts
- **Payments Module**: Update Cash and Bank accounts
- **Credit Sales**: Update Accounts Receivable
- **Payroll Module**: Post to Salaries and Wages accounts

## Best Practices

1. **Initialize First**: Always initialize default accounts before manual creation
2. **Use Standard Codes**: Follow accounting conventions (1xxx=Assets, 2xxx=Liabilities, etc.)
3. **Logical Grouping**: Use parent accounts for better organization
4. **Descriptive Names**: Use clear, meaningful account names
5. **System Accounts**: Mark critical accounts as system accounts
6. **Deactivate vs Delete**: Prefer deactivation over deletion for historical records

## Module Structure

```
chart-of-accounts/
├── chart-of-accounts.module.ts
├── chart-of-accounts.controller.ts
├── chart-of-accounts.service.ts
└── dto/
    ├── create-account.dto.ts
    └── update-account.dto.ts
```

## Testing

Test the module with:

```bash
# Initialize default accounts
curl -X POST http://localhost:3000/organizations/1/chart-of-accounts/initialize-default

# Get all accounts
curl http://localhost:3000/organizations/1/chart-of-accounts

# Get balance sheet
curl http://localhost:3000/organizations/1/chart-of-accounts/balance-sheet
```

## Future Enhancements

- [ ] Journal Entry module integration
- [ ] Automatic posting from transactions
- [ ] Trial Balance reports
- [ ] Financial statement generation
- [ ] Account mapping for integrations
- [ ] Budget tracking per account
- [ ] Multi-currency support
- [ ] Account reconciliation
- [ ] Audit trail for account changes
- [ ] Excel import/export for accounts

## Author
Lumina ERP Development Team

## License
UNLICENSED - Private Project
