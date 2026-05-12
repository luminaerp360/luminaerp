import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StockTransferController } from './stock-tranfer.controller';
import { StockTransferService } from './stock-tranfer.service';

@Module({
  controllers: [StockTransferController],
  providers: [StockTransferService],
  exports: [StockTransferService],
  imports: [PrismaModule],
})
export class StockTransferModule {}
