import { Module } from '@nestjs/common';
import { RequisitionService } from './requisition.service';
import { RequisitionController } from './requisition.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RequisitionController],
  providers: [RequisitionService],
  exports: [RequisitionService],
})
export class RequisitionModule {}
