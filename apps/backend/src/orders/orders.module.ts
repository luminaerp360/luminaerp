import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MpesaAuthModule } from 'src/mpesa-auth/mpesa-auth.module';
import { ProductsModule } from 'src/products/products.module';
import { PrintingJobsModule } from 'src/printing-jobs/printing-jobs.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { SettingsModule } from '../settings/settings.module';
import { CommissionModule } from 'src/commission/commission.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    MpesaAuthModule,
    ProductsModule,
    PrintingJobsModule,
    InventoryModule,
    SettingsModule,
    CommissionModule,
  ],
})
export class OrdersModule {}
