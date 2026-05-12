import { Module } from '@nestjs/common';
import { OfflineSubscriptionController } from './offline-subscription.controller';
import { OfflineSubscriptionService } from './offline-subscription.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OfflineSubscriptionController],
  providers: [OfflineSubscriptionService],
  exports: [OfflineSubscriptionService],
  //
})
export class OfflineSubscriptionModule {}
