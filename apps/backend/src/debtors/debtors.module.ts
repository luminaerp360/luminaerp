import { Module } from '@nestjs/common';
import { DebtorsController } from './debtors.controller';
import { DebtorsService } from './debtors.service';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DebtorsController],
  providers: [DebtorsService, PaymentMethodsService],
  exports: [DebtorsService],
})
export class DebtorsModule {}
