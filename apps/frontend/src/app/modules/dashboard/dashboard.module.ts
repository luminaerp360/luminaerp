import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SalesComponent } from './sales/sales.component';
import { FormsModule } from '@angular/forms';
import { DashboardMainComponent } from './components/dashboard-main/dashboard-main.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PieChartComponent } from './components/pie-chart/pie-chart.component';
import { LoaderComponent } from '../../shared/Data/components/loader/loader.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { SalesDashboardComponent } from './components/sales-dashboard/sales-dashboard.component';
import { AccountantDashboardComponent } from './components/accountant-dashboard/accountant-dashboard.component';

@NgModule({
  declarations: [
    SalesComponent,
    DashboardMainComponent,
    PieChartComponent,
    AdminDashboardComponent,
    SalesDashboardComponent,
    AccountantDashboardComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgApexchartsModule,
    LoaderComponent,
  ],
  exports: [
    DashboardMainComponent,
    PieChartComponent,
    AdminDashboardComponent,
    SalesDashboardComponent,
    AccountantDashboardComponent,
  ],
})
export class DashboardModule {}
