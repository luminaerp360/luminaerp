import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrganizationSelectionComponent } from './modules/auth/components/organization-selection/organization-selection.component';
import { LoginComponent } from './modules/auth/components/login/login.component';
import { RegisterComponent } from './modules/auth/components/register/register.component';
import { VerifyEmailComponent } from './modules/auth/components/verify-email/verify-email.component';
import { ShowCategoriesComponent } from './modules/categories-products/components/categories/show-categories/show-categories.component';
import { ShowProductsComponent } from './modules/categories-products/components/products/show-products/show-products.component';
import { AddInventoryComponent } from './modules/inventory/components/add-inventory/add-inventory.component';
import { BatchManagementComponent } from './modules/inventory/components/batch-management/batch-management.component';
import { ReorderDashboardComponent } from './modules/inventory/components/reorder-dashboard/reorder-dashboard.component';
import { StockSheetComponent } from './modules/inventory/components/stock-sheet/stock-sheet.component';
import { StockMovementsComponent } from './modules/inventory/components/stock-movements/stock-movements.component';
import { PurchaseListComponent } from './modules/inventory/components/purchase-list/purchase-list.component';
import { StockTakeComponent } from './modules/inventory/components/stock-take/stock-take.component';
import { AuthGuard } from './shared/Guards/auth.guard';
import { MainLayoutComponent } from './modules/layout/components/main-layout/main-layout.component';
import { AuthLayoutComponent } from './modules/layout/components/auth-layout/auth-layout.component';
import { LoginGuard } from './shared/Guards/login.guard';
import { ShowSuplliersComponent } from './modules/surpliers/components/show-suplliers/show-suplliers.component';
import { SalesComponent } from './modules/dashboard/sales/sales.component';
import { CashSalesComponent } from './modules/sales/components/cash-sales/cash-sales.component';
import { ShowCreditSalesComponent } from './modules/sales/components/credit sales/show-credit-sales/show-credit-sales.component';
import { ShowSalesComponent } from './modules/sales/components/show-sales/show-sales.component';
import { SalesReportsComponent } from './modules/reports/components/sales-reports/sales-reports.component';
import { IncomeReportsComponent } from './modules/reports/components/income-reports/income-reports.component';
import { PurchaseReportsComponent } from './modules/reports/components/purchase-reports/purchase-reports.component';
import { CreditReportsComponent } from './modules/reports/components/credit-reports/credit-reports.component';
import { VoidedSalesReportsComponent } from './modules/reports/components/voided-sales-reports/voided-sales-reports.component';
import { ShowCustomerComponent } from './modules/customers/components/show-customer/show-customer.component';
import { StockListComponent } from './modules/inventory/components/stock-list/stock-list.component';
import { TransferFromStoreComponent } from './modules/inventory/components/transfer-from-store/transfer-from-store.component';
import { UserListComponent } from './modules/auth/components/user-list/user-list.component';
import { DashboardMainComponent } from './modules/dashboard/components/dashboard-main/dashboard-main.component';
import { MakeCreditSalesComponent } from './modules/sales/components/credit sales/make-credit-sales/make-credit-sales.component';
import { AddQuatationsComponent } from './modules/quotations/components/add-quatations/add-quatations.component';
import { AddLpoComponent } from './modules/lpo/components/add-lpo/add-lpo.component';
import { LpoListComponent } from './modules/lpo/components/lpo-list/lpo-list.component';
import { ApproveLpoComponent } from './modules/lpo/components/approve-lpo/approve-lpo.component';
import { ShowQuotationsComponent } from './modules/quotations/components/show-quotations/show-quotations.component';
import { UpdateQuotationsComponent } from './modules/quotations/components/update-quotations/update-quotations.component';
import { ApproveQuotationsComponent } from './modules/quotations/components/approve-quotations/approve-quotations.component';
import { PermissionGuard } from './shared/Guards/permision.guard';
import { UserPermissionSettingComponent } from './modules/setting/components/user-permision-setting/user-permision-setting.component';
import { OrgDetailsSettingComponent } from './modules/setting/components/org-details-setting/org-details-setting.component';
import { AppSettingsComponent } from './modules/setting/components/app-settings/app-settings.component';
import { DocumentTemplatesComponent } from './modules/setting/components/document-templates/document-templates.component';
import { VoidedSalesComponent } from './modules/sales/components/voided-sales/voided-sales.component';
import { NotFoundComponent } from './shared/Data/components/not-found/not-found.component';
import { ExpensesListComponent } from './modules/expenses/components/expenses-list/expenses-list.component';
import { CustomersDebtComponent } from './modules/sales/components/credit sales/customers-debt/customers-debt.component';
import { InvoicePaymentsComponent } from './modules/sales/components/credit sales/invoice-payments/invoice-payments.component';
import { PaymentsComponent } from './modules/finance/components/payments/payments.component';
import { PrintTestComponent } from './shared/components/print-test/print-test.component';
import { StockTransferComponent } from './modules/stock-transfer/components/stock-trans/stock-trans.component';
import { CreateStockTransferComponent } from './modules/stock-transfer/components/create-stock-transfer/create-stock-transfer.component';
import { AccountsListComponent } from './modules/chart-of-accounts/components/accounts-list/accounts-list.component';
import { BillsListComponent } from './modules/accounts-payable/components/bills-list/bills-list.component';
import { CreditorsDashboardComponent } from './modules/accounts-payable/components/creditors-dashboard/creditors-dashboard.component';
import { ReceivablesListComponent } from './modules/accounts-receivable/components/receivables-list/receivables-list.component';
import { ShowInvoicesComponent } from './modules/sales/components/invoices/show-invoices/show-invoices.component';
import { ViewInvoiceComponent } from './modules/sales/components/invoices/view-invoice/view-invoice.component';
import { PublicInvoiceComponent } from './modules/sales/components/invoices/public-invoice/public-invoice.component';
import { RecurringInvoicesComponent } from './modules/sales/components/invoices/recurring-invoices/recurring-invoices.component';
import { RecurringInvoiceFormComponent } from './modules/sales/components/invoices/recurring-invoices/recurring-invoice-form/recurring-invoice-form.component';
import { ViewRecurringInvoiceComponent } from './modules/sales/components/invoices/recurring-invoices/view-recurring-invoice/view-recurring-invoice.component';
import { ShowDepartmentsComponent } from './modules/store/components/departments/show-departments/show-departments.component';
import { ShowStoreCategoriesComponent } from './modules/store/components/store-categories/show-store-categories/show-store-categories.component';
import { ShowStoreProductsComponent } from './modules/store/components/store-products/show-store-products/show-store-products.component';
import { ShowStorePurchasesComponent } from './modules/store/components/store-purchases/show-store-purchases/show-store-purchases.component';
import { ShowRequisitionsComponent } from './modules/store/components/requisitions/show-requisitions/show-requisitions.component';
import { ProfileComponent } from './modules/profile/components/profile/profile.component';

// Modern Report Componentss
import { ReportsHubComponent } from './modules/reports/components/reports-hub/reports-hub.component';
import { ReportDashboardComponent } from './modules/reports/components/report-dashboard/report-dashboard.component';
import { ReportPaymentsComponent } from './modules/reports/components/report-payments/report-payments.component';
import { ReportSalesComponent } from './modules/reports/components/report-sales/report-sales.component';
import { ReportInvoicesComponent } from './modules/reports/components/report-invoices/report-invoices.component';
import { ReportExpensesComponent } from './modules/reports/components/report-expenses/report-expenses.component';
import { ReportInventoryComponent } from './modules/reports/components/report-inventory/report-inventory.component';
import { ReportCustomersComponent } from './modules/reports/components/report-customers/report-customers.component';
import { ReportProfitLossComponent } from './modules/reports/components/report-profit-loss/report-profit-loss.component';
import { ReportUserPerformanceComponent } from './modules/reports/components/report-user-performance/report-user-performance.component';
import { ReportDailyTrendsComponent } from './modules/reports/components/report-daily-trends/report-daily-trends.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    // canActivate: [AuthGuard],
    children: [
      {
        path: 'products',
        component: ShowProductsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'products' },
      },
      {
        path: 'print-test',
        component: PrintTestComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'products' },
      },
      {
        path: '',
        component: DashboardMainComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'dashboard' },
      },
      {
        path: 'categories',
        component: ShowCategoriesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'categories' },
      },
      {
        path: 'dashboard',
        component: DashboardMainComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'dashboard' },
      },

      {
        path: 'inventory',
        component: AddInventoryComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'inventory/edit/:id',
        component: AddInventoryComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'purchases',
        component: PurchaseListComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'stock-take',
        component: StockTakeComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'stock-transfer',
        component: StockTransferComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'stock-transfer/create',
        component: CreateStockTransferComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'batch-management',
        component: BatchManagementComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'reorder-dashboard',
        component: ReorderDashboardComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'stock-sheet',
        component: StockSheetComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'stock-movements',
        component: StockMovementsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'inventory',
        component: AddInventoryComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'suppliers',
        component: ShowSuplliersComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'suppliers' },
      },
      {
        path: 'sales',
        component: CashSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'updateSale/:id',
        component: CashSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'cash-sales',
        component: ShowSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'customer-invoices',
        component: CustomersDebtComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'invoice-payments',
        component: InvoicePaymentsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'credit_sales' },
      },
      {
        path: 'void-sales',
        component: VoidedSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'credit_sales',
        component: ShowCreditSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'credit_sales' },
      },
      {
        path: 'invoices',
        component: ShowInvoicesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'invoices/:id',
        component: ViewInvoiceComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'recurring-invoices',
        component: RecurringInvoicesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'recurring-invoices/create',
        component: RecurringInvoiceFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'recurring-invoices/edit/:id',
        component: RecurringInvoiceFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'recurring-invoices/:id',
        component: ViewRecurringInvoiceComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'make-credit-sale',
        component: MakeCreditSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'credit_sales' },
      },
      {
        path: 'update-credit/:id',
        component: MakeCreditSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'credit_sales' },
      },
      {
        path: 'sale-reports',
        component: SalesReportsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'income-reports',
        component: IncomeReportsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'purchase-reports',
        component: PurchaseReportsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'credit-reports',
        component: CreditReportsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'voids-reports',
        component: VoidedSalesReportsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      // Modern Reports
      {
        path: 'reports-hub',
        component: ReportsHubComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-dashboard',
        component: ReportDashboardComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-payments',
        component: ReportPaymentsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-sales',
        component: ReportSalesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-invoices',
        component: ReportInvoicesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-expenses',
        component: ReportExpensesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-inventory',
        component: ReportInventoryComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-customers',
        component: ReportCustomersComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-profit-loss',
        component: ReportProfitLossComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-user-performance',
        component: ReportUserPerformanceComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'report-daily-trends',
        component: ReportDailyTrendsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'customers',
        component: ShowCustomerComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'customers' },
      },
      {
        path: 'stock',
        component: StockListComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'stock' },
      },
      {
        path: 'transfer-stock',
        component: TransferFromStoreComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'stock' },
      },
      {
        path: 'store/departments',
        component: ShowDepartmentsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'store/categories',
        component: ShowStoreCategoriesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'store/products',
        component: ShowStoreProductsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'store/purchases',
        component: ShowStorePurchasesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'store/requisitions',
        component: ShowRequisitionsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'inventory' },
      },
      {
        path: 'users',
        component: UserListComponent,
        // canActivate: [PermissionGuard],
        // data: { requiredPermission: 'users' },
      },
      {
        path: 'add-quotation',
        component: AddQuatationsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'quotations' },
      },
      {
        path: 'quotations',
        component: ShowQuotationsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'quotations' },
      },
      {
        path: 'update-quotation/:id',
        component: AddQuatationsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'quotations' },
      },
      {
        path: 'approve-quotation/:id',
        component: ApproveQuotationsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'quotations' },
      },
      {
        path: 'expenses',
        component: ExpensesListComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'quotations' },
      },
      {
        path: 'bills',
        loadChildren: () =>
          import('./modules/accounts-payable/accounts-payable-routing.module').then(
            (m) => m.AccountsPayableRoutingModule,
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'accounts-payable',
        loadChildren: () =>
          import('./modules/accounts-payable/accounts-payable-routing.module').then(
            (m) => m.AccountsPayableRoutingModule,
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'creditors',
        loadChildren: () =>
          import('./modules/creditors/creditors-routing.module').then(
            (m) => m.CreditorsRoutingModule,
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'accounts-receivable',
        component: ReceivablesListComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'chart-of-accounts',
        component: AccountsListComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'payments',
        component: PaymentsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'add-lpo',
        component: AddLpoComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'lpo' },
      },
      {
        path: 'org-details-setting',
        component: OrgDetailsSettingComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'setting' },
      },
      {
        path: 'app-settings',
        component: AppSettingsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'setting' },
      },
      {
        path: 'document-templates',
        component: DocumentTemplatesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'setting' },
      },
      {
        path: 'user-permissions',
        component: UserPermissionSettingComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'setting' },
      },
      {
        path: 'user-permissions/:userId',
        component: UserPermissionSettingComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'setting' },
      },
      {
        path: 'commission',
        loadChildren: () =>
          import('./modules/commission/commission.module').then(
            (m) => m.CommissionModule,
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'sales' },
      },
      {
        path: 'system-logs',
        loadChildren: () =>
          import('./modules/system-logs/system-logs.module').then(
            (m) => m.SystemLogsModule,
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'tickets',
        loadChildren: () =>
          import('./modules/tickets/tickets.module').then(
            (m) => m.TicketsModule,
          ),
      },
      {
        path: 'training',
        loadComponent: () =>
          import('./modules/training/training.component').then(
            (m) => m.TrainingComponent,
          ),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./modules/notifications/notifications.module').then(
            (m) => m.NotificationsModule,
          ),
      },
      {
        path: 'debtors',
        loadChildren: () =>
          import('./modules/debtors/debtors-routing.module').then(
            (m) => m.DebtorsRoutingModule,
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'reports' },
      },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      {
        path: 'lpo',
        component: LpoListComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'lpo' },
      },
      {
        path: 'approve-lpo/:id',
        component: ApproveLpoComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'lpo' },
      },
    ],
  },

  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [LoginGuard],
    children: [
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'organization-selection',
        component: OrganizationSelectionComponent,
      },
      { path: 'register', component: RegisterComponent },
      { path: 'verify-email', component: VerifyEmailComponent },
    ],
  },
  {
    path: 'invoices/public/:token',
    component: PublicInvoiceComponent,
  },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
