import { Module } from '@nestjs/common';
import { PaymentsService } from './payments-transactions.service';
import { PaymentsController } from './payments-transactions.controller';


@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], // Export for use in other modules
})
export class PaymentsTransactionsModule {}
