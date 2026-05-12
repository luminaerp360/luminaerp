import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService],
  imports: [PrismaModule],
})
export class DepartmentModule {}