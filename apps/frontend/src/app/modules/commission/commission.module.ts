import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommissionRoutingModule } from './commission-routing.module';
import { CommissionDashboardComponent } from './components/commission-dashboard/commission-dashboard.component';
import { UserCommissionRatesComponent } from './components/user-commission-rates/user-commission-rates.component';
import { CommissionRecordsComponent } from './components/commission-records/commission-records.component';
import { CommissionReportsComponent } from './components/commission-reports/commission-reports.component';

@NgModule({
  declarations: [
    CommissionDashboardComponent,
    UserCommissionRatesComponent,
    CommissionRecordsComponent,
    CommissionReportsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CommissionRoutingModule,
  ],
})
export class CommissionModule {}
