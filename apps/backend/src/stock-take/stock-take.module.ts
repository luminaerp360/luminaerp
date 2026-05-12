import { Module } from '@nestjs/common';
import { StockTakeController } from './stock-take.controller';
import { StockTakeService } from './stock-take.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockTakeController],
  providers: [StockTakeService],
  exports: [StockTakeService],
})
export class StockTakeModule {}
