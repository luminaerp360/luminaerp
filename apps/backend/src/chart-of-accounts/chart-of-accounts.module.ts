import { Module } from '@nestjs/common';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';

@Module({
  providers: [ChartOfAccountsService],
  controllers: [ChartOfAccountsController],
  exports: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}
