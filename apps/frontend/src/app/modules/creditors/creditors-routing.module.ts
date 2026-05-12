import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./creditors-dashboard/creditors-dashboard.component').then(
        (m) => m.CreditorsDashboardComponent,
      ),
  },
  {
    path: 'suppliers',
    loadComponent: () =>
      import('./supplier-list/supplier-list.component').then(
        (m) => m.SupplierListComponent,
      ),
  },
  {
    path: 'outstanding-bills/:supplierId',
    loadComponent: () =>
      import('./outstanding-bills/outstanding-bills.component').then(
        (m) => m.OutstandingBillsComponent,
      ),
  },
  {
    path: 'payment-history',
    loadComponent: () =>
      import('./bill-payment-history/bill-payment-history.component').then(
        (m) => m.BillPaymentHistoryComponent,
      ),
  },
  {
    path: 'supplier-statement/:supplierId',
    loadComponent: () =>
      import('./supplier-statement/supplier-statement.component').then(
        (m) => m.SupplierStatementComponent,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreditorsRoutingModule {}
