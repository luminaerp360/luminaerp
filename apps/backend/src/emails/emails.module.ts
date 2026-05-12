import { Module, forwardRef } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditSaleModule } from '../credit-sale/credit-sale.module';
import { QuotationsModule } from '../quotations/quotations.module'; // Import QuotationsModule

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CreditSaleModule), // Use forwardRef to handle circular dependency
    forwardRef(() => QuotationsModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    {
      provide: 'EmailsService',
      useExisting: EmailsService,
    },
  ],
  exports: [EmailsService, 'EmailsService'], // Export both the class and the string token
})
export class EmailsModule {}
