import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SalesReportsComponent } from './components/sales-reports/sales-reports.component';
import { IncomeReportsComponent } from './components/income-reports/income-reports.component';
import { CreditReportsComponent } from './components/credit-reports/credit-reports.component';
import { PurchaseReportsComponent } from './components/purchase-reports/purchase-reports.component';
import { VoidedSalesReportsComponent } from './components/voided-sales-reports/voided-sales-reports.component';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

// Modern Report Components
import { ReportsHubComponent } from './components/reports-hub/reports-hub.component';
import { ReportDashboardComponent } from './components/report-dashboard/report-dashboard.component';
import { ReportPaymentsComponent } from './components/report-payments/report-payments.component';
import { ReportSalesComponent } from './components/report-sales/report-sales.component';
import { ReportInvoicesComponent } from './components/report-invoices/report-invoices.component';
import { ReportExpensesComponent } from './components/report-expenses/report-expenses.component';
import { ReportInventoryComponent } from './components/report-inventory/report-inventory.component';
import { ReportCustomersComponent } from './components/report-customers/report-customers.component';
import { ReportProfitLossComponent } from './components/report-profit-loss/report-profit-loss.component';
import { ReportUserPerformanceComponent } from './components/report-user-performance/report-user-performance.component';
import { ReportDailyTrendsComponent } from './components/report-daily-trends/report-daily-trends.component';

@NgModule({
  declarations: [
    IncomeReportsComponent,
    CreditReportsComponent,
    PurchaseReportsComponent,
    VoidedSalesReportsComponent,
    ReportsHubComponent,
    ReportDashboardComponent,
    ReportPaymentsComponent,
    ReportSalesComponent,
    ReportInvoicesComponent,
    ReportExpensesComponent,
    ReportInventoryComponent,
    ReportCustomersComponent,
    ReportProfitLossComponent,
    ReportUserPerformanceComponent,
    ReportDailyTrendsComponent,
  ],
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule],
})
export class ReportsModule {}
