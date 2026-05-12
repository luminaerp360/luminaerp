import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { BillFormComponent } from './components/bill-form/bill-form.component';
import { BillPaymentFormComponent } from './components/bill-payment-form/bill-payment-form.component';
import { SupplierStatementComponent } from './components/supplier-statement/supplier-statement.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    BillFormComponent,
    BillPaymentFormComponent,
    SupplierStatementComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedModule],
  exports: [],
})
export class AccountsPayableModule {}
