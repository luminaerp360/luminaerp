import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { MpesaAuthModule } from './mpesa-auth/mpesa-auth.module';
import { CustomersModule } from './customers/customers.module';
import { SurpliersModule } from './surpliers/surpliers.module';
import { QuotationsModule } from './quotations/quotations.module';
import { LpoModule } from './lpo/lpo.module';
import { CreditSaleModule } from './credit-sale/credit-sale.module';
import { InventoryModule } from './inventory/inventory.module';
import { CreditSalePaymentsModule } from './credit-sale-payments/credit-sale-payments.module';
import { ReportsModule } from './reports/reports.module';
import { PrinterModule } from './printer/printer.module';
import { OrgDetailsModule } from './org-details/org-details.module';
import { EmailsModule } from './emails/emails.module';
import { OrganizationModule } from './organization/organization.module';
import { ExpenseModule } from './expense/expense.module';
import { PaymentsTransactionsModule } from './payments-transactions/payments-transactions.module';
import { PrintingJobsModule } from './printing-jobs/printing-jobs.module';
import { SuperAdminModule } from './auth/superadmin/super-admin/super-admin.module';
import { HttpModule } from '@nestjs/axios';
import { StockTransferModule } from './stock-tranfer/stock-tranfer.module';
import { StockTakeModule } from './stock-take/stock-take.module';
import { RedisModule } from './redis/redis.module';
import { OfflineSubscriptionModule } from './offline-subscription/offline-subscription.module';
import { ChartOfAccountsModule } from './chart-of-accounts/chart-of-accounts.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from './accounts-receivable/accounts-receivable.module';
import { InvoiceModule } from './invoices/invoice.module';
import { SettingsModule } from './settings/settings.module';
import { CommissionModule } from './commission/commission.module';
import { SystemLogsModule } from './system-logs/system-logs.module';
import { LoggingInterceptor } from './system-logs/interceptors/logging.interceptor';
import { TicketsModule } from './tickets/tickets.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DebtorsModule } from './debtors/debtors.module';
import { DepartmentModule } from './store/department/department.module';
import { StoreCategoryModule } from './store/store-category/store-category.module';
import { StoreProductModule } from './store/store-product/store-product.module';
import { StorePurchaseModule } from './store/store-purchase/store-purchase.module';
import { RequisitionModule } from './store/requisition/requisition.module';
import { StoreReportsModule } from './store/store-reports/store-reports.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    AuthModule,
    UserModule,
    PrismaModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    MpesaAuthModule,
    CustomersModule,
    SurpliersModule,
    QuotationsModule,
    LpoModule,
    InventoryModule,
    CreditSalePaymentsModule,
    ReportsModule,
    PrinterModule,
    OrgDetailsModule,
    EmailsModule,
    OrganizationModule,
    ExpenseModule,
    PaymentsTransactionsModule,
    PrintingJobsModule,
    SuperAdminModule,
    HttpModule,
    CreditSaleModule,
    StockTransferModule,
    StockTakeModule,
    OfflineSubscriptionModule,
    ChartOfAccountsModule,
    AccountsPayableModule,
    AccountsReceivableModule,
    InvoiceModule,
    SettingsModule,
    CommissionModule,
    SystemLogsModule,
    TicketsModule,
    NotificationsModule,
    DebtorsModule,
    DepartmentModule,
    StoreCategoryModule,
    StoreProductModule,
    StorePurchaseModule,
    RequisitionModule,
    StoreReportsModule,
    UploadModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
