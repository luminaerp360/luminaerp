import { Module } from '@nestjs/common';
import { SuppliersService } from './surpliers.service';
import { SuppliersController } from './surpliers.controller';

@Module({
  providers: [SuppliersService],
  controllers: [SuppliersController],
})
export class SurpliersModule {}
