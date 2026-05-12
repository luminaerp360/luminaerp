# Chart of Accounts - Testing Guide

## Prerequisites
1. Backend server must be running: `pnpm dev:backend`
2. Database must be up and running
3. Organization must exist (e.g., Techlit Solutions with ID 1)

## Quick Start Testing

### 1. Initialize Default Chart of Accounts
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/initialize-default" -Method POST -ContentType "application/json"
```

```bash
# cURL (Git Bash)
curl -X POST http://localhost:3000/organizations/1/chart-of-accounts/initialize-default
```

### 2. Get All Accounts
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts" -Method GET
```

```bash
# cURL
curl http://localhost:3000/organizations/1/chart-of-accounts
```

### 3. Get Balance Sheet Accounts
```bash
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/balance-sheet" -Method GET
```

### 4. Get Income Statement Accounts
```bash
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/income-statement" -Method GET
```

### 5. Get Accounts Tree (Hierarchical View)
```bash
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/tree" -Method GET
```

### 6. Search for Accounts
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/search?query=cash" -Method GET

# cURL
curl "http://localhost:3000/organizations/1/chart-of-accounts/search?query=cash"
```

### 7. Filter by Account Type
```bash
# Get only Revenue accounts
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts?type=REVENUE" -Method GET

# Get only Asset accounts
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts?type=ASSET" -Method GET
```

### 8. Create Custom Account
```bash
# PowerShell
$body = @{
    accountCode = "1015"
    accountName = "Mobile Money (M-Pesa)"
    accountType = "ASSET"
    accountCategory = "CURRENT_ASSET"
    balanceType = "DEBIT"
    description = "M-Pesa and other mobile money accounts"
    isActive = $true
    isSystem = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts" -Method POST -Body $body -ContentType "application/json"
```

```bash
# cURL
curl -X POST http://localhost:3000/organizations/1/chart-of-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountCode": "1015",
    "accountName": "Mobile Money (M-Pesa)",
    "accountType": "ASSET",
    "accountCategory": "CURRENT_ASSET",
    "balanceType": "DEBIT",
    "description": "M-Pesa and other mobile money accounts",
    "isActive": true,
    "isSystem": false
  }'
```

### 9. Update an Account
```bash
# PowerShell
$body = @{
    accountName = "Mobile Money - Updated"
    description = "Updated description"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/1" -Method PATCH -Body $body -ContentType "application/json"
```

### 10. Get Account Details
```bash
Invoke-WebRequest -Uri "http://localhost:3000/organizations/1/chart-of-accounts/1" -Method GET
```

## Expected Results

### After Initialization
You should get ~35 accounts created including:
- **Assets**: Cash (1010), Accounts Receivable (1020), Inventory (1030), Equipment (1110), etc.
- **Liabilities**: Accounts Payable (2010), Salaries Payable (2020), Loans Payable (2110)
- **Equity**: Capital (3010), Retained Earnings (3020)
- **Revenue**: Sales Revenue (4000), Product Sales (4010), Service Revenue (4020)
- **Expenses**: COGS (5000), Salaries (5110), Rent (5120), Utilities (5130), etc.

### Balance Sheet View
Returns three sections:
- **Assets**: All asset accounts
- **Liabilities**: All liability accounts
- **Equity**: All equity accounts

### Income Statement View
Returns two sections:
- **Revenue**: All revenue accounts
- **Expenses**: All expense accounts

### Tree View
Returns hierarchical structure showing parent-child relationships

## Testing Workflow

1. ✅ **Initialize** - Create default accounts
2. ✅ **View All** - Get all accounts
3. ✅ **View Tree** - See hierarchical structure
4. ✅ **Filter** - Get accounts by type
5. ✅ **Search** - Search for specific accounts
6. ✅ **Create** - Add custom accounts
7. ✅ **Update** - Modify account details
8. ✅ **Deactivate** - Deactivate unused accounts
9. ✅ **Balance Sheet** - View balance sheet accounts
10. ✅ **Income Statement** - View P&L accounts

## Troubleshooting

### 404 Error
- Ensure backend server is running
- Check if the module is properly imported in `app.module.ts`
- Restart the backend: `pnpm dev:backend`

### 401 Unauthorized
- JWT guard is enabled
- You may need to provide authentication token
- Check if guards are properly configured

### Database Connection Error
- Ensure PostgreSQL is running
- Check `.env` file for correct DATABASE_URL
- Run: `pnpm docker:up`

### Already Initialized Error
- You can only initialize once per organization
- Use individual account creation for additional accounts

## Next Steps

After testing the Chart of Accounts module:
1. Integrate with Sales module for automatic revenue posting
2. Integrate with Expenses module for automatic expense posting
3. Create Journal Entry module for manual accounting entries
4. Build financial reports (Balance Sheet, Income Statement, Trial Balance)
5. Implement account reconciliation features

## Notes

- All accounts are organization-specific (multi-tenant)
- System accounts cannot be deleted
- Accounts with transactions can only be deactivated
- Parent-child relationships enforce type matching
- Account codes must be unique per organization
