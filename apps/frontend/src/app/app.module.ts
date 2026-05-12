import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesProductsModule } from './modules/categories-products/categories-products.module';
import { LayoutModule } from './modules/layout/layout.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MainLayoutComponent } from './modules/layout/components/main-layout/main-layout.component';
import { SurpliersModule } from './modules/surpliers/surpliers.module';
import { AuthLayoutComponent } from './modules/layout/components/auth-layout/auth-layout.component';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LoaderComponent } from './shared/Data/components/loader/loader.component';
import { provideNgVibeDialog } from '@ng-vibe/dialog';
import { AuthComponent } from './shared/Data/components/auth/auth.component';
import { ModalComponent } from './shared/Data/components/modal/modal.component';
import { BtnLOderComponent } from './shared/Data/components/btn-loder/btn-loder.component';
import { CustomersModule } from './modules/customers/customers.module';
import { LpoModule } from './modules/lpo/lpo.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CreditAuthComponent } from './shared/Data/components/credit-auth/credit-auth.component';
import { SalesModule } from './modules/sales/sales.module';
import { SettingModule } from './modules/setting/components/setting.module';
import { NotFoundComponent } from './shared/Data/components/not-found/not-found.component';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { RouterModule } from '@angular/router';
import { BaseComponent } from './shared/components/base/base.component';
import { SalesReportsComponent } from './modules/reports/components/sales-reports/sales-reports.component';
import { FinanceModule } from './modules/finance/finance.module';
import { Printer } from '@awesome-cordova-plugins/printer/ngx';
import { PrintTestComponent } from './shared/components/print-test/print-test.component';
import { StockTransferComponent } from './modules/stock-transfer/components/stock-trans/stock-trans.component';
import { StockTransferFormComponent } from './modules/stock-transfer/components/stock-transfer-form/stock-transfer-form.component';
import { CreateStockTransferComponent } from './modules/stock-transfer/components/create-stock-transfer/create-stock-transfer.component';
import { ViewTranferDetailsComponent } from './modules/stock-transfer/components/view-tranfer-details/view-tranfer-details.component';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { AccountsPayableModule } from './modules/accounts-payable/accounts-payable.module';
import { AuthInterceptor } from './shared/interceptors/auth.interceptor';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';
import { TrainingComponent } from './modules/training/training.component';
import { StoreModule } from './modules/store/store.module';

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    ModalComponent,
    CreditAuthComponent,
    NotFoundComponent,
    SalesReportsComponent,
    PrintTestComponent,
    StockTransferComponent,
    StockTransferFormComponent,
    ViewTranferDetailsComponent,
    CreateStockTransferComponent,
  ],

  imports: [
    BrowserModule,
    AppRoutingModule,
    AuthModule,
    CategoriesProductsModule,
    LayoutModule,
    InventoryModule,
    DashboardModule,
    CustomersModule,
    LpoModule,
    QuotationsModule,
    SurpliersModule,
    SalesModule,
    ReportsModule,
    SettingModule,
    ExpensesModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    BtnLOderComponent,
    NgApexchartsModule,
    LoaderComponent,
    RouterModule,
    FinanceModule,
    ChartOfAccountsModule,
    AccountsPayableModule,
    AccountsReceivableModule,
    StoreModule,
  ],
  providers: [
    provideNgVibeDialog(),
    Printer,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
