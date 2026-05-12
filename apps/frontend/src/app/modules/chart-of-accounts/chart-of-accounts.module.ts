import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AccountsListComponent } from './components/accounts-list/accounts-list.component';
import { AccountFormComponent } from './components/account-form/account-form.component';
import { BalanceSheetComponent } from './components/balance-sheet/balance-sheet.component';
import { IncomeStatementComponent } from './components/income-statement/income-statement.component';
import { AccountsTreeComponent } from './components/accounts-tree/accounts-tree.component';

@NgModule({
  declarations: [
    AccountsListComponent,
    AccountFormComponent,
    BalanceSheetComponent,
    IncomeStatementComponent,
    AccountsTreeComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  exports: [
    AccountsListComponent,
    AccountFormComponent,
    BalanceSheetComponent,
    IncomeStatementComponent,
    AccountsTreeComponent,
  ],
})
export class ChartOfAccountsModule {}
