import { Module } from '@nestjs/common';
import { StoreCategoryService } from './store-category.service';
import { StoreCategoryController } from './store-category.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [StoreCategoryController],
  providers: [StoreCategoryService],
  imports: [PrismaModule],
})
export class StoreCategoryModule {}