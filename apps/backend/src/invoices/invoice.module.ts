import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import {
  InvoiceController,
  PublicInvoiceController,
} from './invoice.controller';
import { RecurringInvoiceController } from './recurring-invoice.controller';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePDFService } from './invoice-pdf.service';
import { InvoiceMigrationService } from './migration.service';
import { RecurringInvoiceService } from './recurring-invoice.service';
import { RecurringInvoiceCron } from './recurring-invoice.cron';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsModule } from '../settings/settings.module';
import { CommissionModule } from '../commission/commission.module';
import { PaymentsTransactionsModule } from '../payments-transactions/payments-transactions.module';

@Module({
  imports: [SettingsModule, CommissionModule, PaymentsTransactionsModule],
  controllers: [
    PublicInvoiceController,
    InvoiceController,
    RecurringInvoiceController,
  ],
  providers: [
    InvoiceService,
    InvoiceNumberService,
    InvoicePDFService,
    InvoiceMigrationService,
    RecurringInvoiceService,
    RecurringInvoiceCron,
    PrismaService,
  ],
  exports: [
    InvoiceService,
    InvoiceNumberService,
    InvoicePDFService,
    InvoiceMigrationService,
  ],
})
export class InvoiceModule {}
