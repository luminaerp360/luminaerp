// quotations.module.ts - Simplified module for quotations
import { Module, forwardRef } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailsModule } from '../emails/emails.module'; // Import EmailsModule
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    forwardRef(() => EmailsModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [QuotationsController],
  providers: [
    QuotationsService,
    {
      provide: 'QuotationsService',
      useExisting: QuotationsService,
    },
  ],
  exports: [QuotationsService, 'QuotationsService'], // Export both the class and the string token
})
export class QuotationsModule {}
