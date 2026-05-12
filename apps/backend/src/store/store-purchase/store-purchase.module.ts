import { Module } from '@nestjs/common';
import { StorePurchaseService } from './store-purchase.service';
import { StorePurchaseController } from './store-purchase.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StorePurchaseController],
  providers: [StorePurchaseService],
  exports: [StorePurchaseService],
})
export class StorePurchaseModule {}
