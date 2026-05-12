import { Module } from '@nestjs/common';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';
import { AccountsPayableCron } from './accounts-payable.cron';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsPayableController],
  providers: [
    AccountsPayableService,
    AccountsPayableCron,
    PaymentMethodsService,
  ],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
