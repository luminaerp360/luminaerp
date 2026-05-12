import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CashSalesComponent } from './components/cash-sales/cash-sales.component';
import { ShowCreditSalesComponent } from './components/credit sales/show-credit-sales/show-credit-sales.component';
import { MakeCreditSalesComponent } from './components/credit sales/make-credit-sales/make-credit-sales.component';
import { MakeCreditSalesPayentsComponent } from './components/credit sales/make-credit-sales-payents/make-credit-sales-payents.component';
import { ShowSalesComponent } from './components/show-sales/show-sales.component';
import { LoaderComponent } from '../../shared/Data/components/loader/loader.component';
import { BtnLOderComponent } from '../../shared/Data/components/btn-loder/btn-loder.component';
import { RouterModule } from '@angular/router';
import { RefundComponent } from './components/refund/refund.component';
import { CreditPaymentsComponent } from './components/credit sales/credit-payments/credit-payments.component';
import { VoidedSalesComponent } from './components/voided-sales/voided-sales.component';
import { ViewOrderDetailsComponent } from './components/view-order-details/view-order-details.component';
import { ViewCreditSaleDetailsComponent } from './components/view-credit-sale-details/view-credit-sale-details.component';
import { CustomersDebtComponent } from './components/credit sales/customers-debt/customers-debt.component';
import { MulticreditSalePaymentsComponent } from './components/credit sales/multicredit-sale-payments/multicredit-sale-payments.component';
import { CustomerFullCreditStatementComponent } from './components/credit sales/customer-full-credit-statement/customer-full-credit-statement.component';
import { InvoicePaymentsComponent } from './components/credit sales/invoice-payments/invoice-payments.component';
import { PaymentHistoryComponent } from './components/credit sales/payment-history/payment-history.component';
import { ShowInvoicesComponent } from './components/invoices/show-invoices/show-invoices.component';
import { ViewInvoiceComponent } from './components/invoices/view-invoice/view-invoice.component';
import { PublicInvoiceComponent } from './components/invoices/public-invoice/public-invoice.component';
import { RecurringInvoicesComponent } from './components/invoices/recurring-invoices/recurring-invoices.component';
import { RecurringInvoiceFormComponent } from './components/invoices/recurring-invoices/recurring-invoice-form/recurring-invoice-form.component';
import { ViewRecurringInvoiceComponent } from './components/invoices/recurring-invoices/view-recurring-invoice/view-recurring-invoice.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    CashSalesComponent,
    ShowCreditSalesComponent,
    MakeCreditSalesComponent,
    MakeCreditSalesPayentsComponent,
    ShowSalesComponent,
    RefundComponent,
    CreditPaymentsComponent,
    VoidedSalesComponent,
    ViewOrderDetailsComponent,
    ViewCreditSaleDetailsComponent,
    CustomersDebtComponent,
    MulticreditSalePaymentsComponent,
    CustomerFullCreditStatementComponent,
    InvoicePaymentsComponent,
    PaymentHistoryComponent,
    ShowInvoicesComponent,
    ViewInvoiceComponent,
    PublicInvoiceComponent,
    RecurringInvoicesComponent,
    RecurringInvoiceFormComponent,
    ViewRecurringInvoiceComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    BtnLOderComponent,
    RouterModule,
    SharedModule,
  ],
})
export class SalesModule {}
