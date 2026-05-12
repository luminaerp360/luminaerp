import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./aging-analysis/aging-analysis.component').then(
        (m) => m.AgingAnalysisComponent,
      ),
  },
  {
    path: 'customers',
    loadComponent: () =>
      import('./customer-list/customer-list.component').then(
        (m) => m.CustomerListComponent,
      ),
  },
  {
    path: 'outstanding-invoices/:customerId',
    loadComponent: () =>
      import('./outstanding-invoices/outstanding-invoices.component').then(
        (m) => m.OutstandingInvoicesComponent,
      ),
  },
  {
    path: 'customer-statement/:customerId',
    loadComponent: () =>
      import('./customer-statement/customer-statement.component').then(
        (m) => m.CustomerStatementComponent,
      ),
  },
  {
    path: 'customer-wallet/:customerId',
    loadComponent: () =>
      import('./customer-wallet/customer-wallet.component').then(
        (m) => m.CustomerWalletComponent,
      ),
  },
  {
    path: 'wallets',
    loadComponent: () =>
      import('./wallet-overview/wallet-overview.component').then(
        (m) => m.WalletOverviewComponent,
      ),
  },
  {
    path: 'payment-history',
    loadComponent: () =>
      import('./payment-history/payment-history.component').then(
        (m) => m.PaymentHistoryComponent,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DebtorsRoutingModule {}
