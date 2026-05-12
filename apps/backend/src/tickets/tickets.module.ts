import { Module } from '@nestjs/common';
import {
  TicketsController,
  AdminTicketsController,
} from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, AdminTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
