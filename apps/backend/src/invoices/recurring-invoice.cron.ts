import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringInvoiceService } from './recurring-invoice.service';

@Injectable()
export class RecurringInvoiceCron {
  private readonly logger = new Logger(RecurringInvoiceCron.name);

  constructor(
    private readonly recurringInvoiceService: RecurringInvoiceService,
  ) {}

  /**
   * Run every day at 1:00 AM to generate due invoices
   * Cron format: second minute hour day month dayOfWeek
   */
  @Cron('0 1 * * *', {
    name: 'generate-recurring-invoices',
    timeZone: 'Africa/Nairobi',
  })
  async handleRecurringInvoices() {
    this.logger.log('Starting recurring invoice generation...');

    try {
      const results = await this.recurringInvoiceService.generateDueInvoices();

      this.logger.log(
        `Generated ${results.success.length} invoices successfully`,
      );

      if (results.failed.length > 0) {
        this.logger.error(
          `Failed to generate ${results.failed.length} invoices`,
          results.failed,
        );
      }

      return results;
    } catch (error) {
      this.logger.error('Error in recurring invoice cron job', error);
      throw error;
    }
  }

  /**
   * For development/testing - runs every hour
   * Comment out in production
   */
  // @Cron('0 * * * *', {
  //   name: 'generate-recurring-invoices-hourly',
  //   timeZone: 'Africa/Nairobi',
  // })
  // async handleRecurringInvoicesHourly() {
  //   this.logger.log('Running hourly recurring invoice check...');
  //   return await this.handleRecurringInvoices();
  // }
}
