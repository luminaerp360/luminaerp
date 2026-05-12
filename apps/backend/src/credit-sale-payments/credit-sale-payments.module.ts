import { Module, forwardRef } from '@nestjs/common';
import { CreditSalePaymentService } from './credit-sale-payments.service';
import { CreditSalePaymentController } from './credit-sale-payments.controller';
import { PaymentsTransactionsModule } from 'src/payments-transactions/payments-transactions.module';

@Module({
  imports: [forwardRef(() => PaymentsTransactionsModule)],
  providers: [CreditSalePaymentService],
  controllers: [CreditSalePaymentController],
})
export class CreditSalePaymentsModule {}
