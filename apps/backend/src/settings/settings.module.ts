import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PaymentMethodController } from './payment-method.controller';
import { PaymentMethodService } from './payment-method.service';
import { DocumentCounterService } from './document-counter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController, PaymentMethodController],
  providers: [SettingsService, PaymentMethodService, DocumentCounterService],
  exports: [SettingsService, PaymentMethodService, DocumentCounterService],
})
export class SettingsModule {}
