import { Module } from '@nestjs/common';
import { StoreProductService } from './store-product.service';
import { StoreProductController } from './store-product.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [StoreProductController],
  providers: [StoreProductService],
  imports: [PrismaModule],
})
export class StoreProductModule {}