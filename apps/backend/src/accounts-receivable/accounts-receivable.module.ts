import { Module } from '@nestjs/common';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';
import { AccountsReceivableCron } from './accounts-receivable.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableService, AccountsReceivableCron],
  exports: [AccountsReceivableService],
})
export class AccountsReceivableModule {}