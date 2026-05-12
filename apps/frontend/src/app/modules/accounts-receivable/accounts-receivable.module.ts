import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ReceivablesListComponent } from './components/receivables-list/receivables-list.component';
import { ReceivableFormComponent } from './components/receivable-form/receivable-form.component';
import { ReceivablePaymentFormComponent } from './components/receivable-payment-form/receivable-payment-form.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    ReceivablesListComponent,
    ReceivableFormComponent,
    ReceivablePaymentFormComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
  ],
  exports: [
    ReceivablesListComponent,
    ReceivableFormComponent,
    ReceivablePaymentFormComponent,
  ],
})
export class AccountsReceivableModule { }