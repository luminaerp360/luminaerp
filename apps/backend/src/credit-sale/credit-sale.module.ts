// credit-sale.module.ts - Updated to handle circular dependency with EmailsService
import { Module, forwardRef } from '@nestjs/common';
import { CreditService } from './credit-sale.service';
import { CreditSaleController } from './credit-sale.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { PrintingJobsModule } from '../printing-jobs/printing-jobs.module';
import { EmailsModule } from '../emails/emails.module'; // Import EmailsModule

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    PrintingJobsModule,
    forwardRef(() => EmailsModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [CreditSaleController],
  providers: [
    CreditService,
    {
      provide: 'CreditService',
      useExisting: CreditService,
    },
  ],
  exports: [CreditService, 'CreditService'], // Export both the class and the string token
})
export class CreditSaleModule {}
