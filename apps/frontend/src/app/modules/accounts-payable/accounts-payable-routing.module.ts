import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../shared/Guards/permision.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'bills',
    pathMatch: 'full',
  },
  {
    path: 'bills',
    loadComponent: () =>
      import('./components/bills-list/bills-list.component').then(
        (m) => m.BillsListComponent,
      ),
  },
  {
    path: 'bills/create',
    loadComponent: () =>
      import('./components/create-bill/create-bill.component').then(
        (m) => m.CreateBillComponent,
      ),
  },
  {
    path: 'bills/edit/:id',
    loadComponent: () =>
      import('./components/create-bill/create-bill.component').then(
        (m) => m.CreateBillComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/creditors-dashboard/creditors-dashboard.component').then(
        (m) => m.CreditorsDashboardComponent,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountsPayableRoutingModule {}
