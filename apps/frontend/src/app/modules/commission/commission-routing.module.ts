import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommissionDashboardComponent } from './components/commission-dashboard/commission-dashboard.component';
import { UserCommissionRatesComponent } from './components/user-commission-rates/user-commission-rates.component';
import { CommissionRecordsComponent } from './components/commission-records/commission-records.component';
import { CommissionReportsComponent } from './components/commission-reports/commission-reports.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: CommissionDashboardComponent,
  },
  {
    path: 'user-rates',
    component: UserCommissionRatesComponent,
  },
  {
    path: 'records',
    component: CommissionRecordsComponent,
  },
  {
    path: 'reports',
    component: CommissionReportsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommissionRoutingModule {}
