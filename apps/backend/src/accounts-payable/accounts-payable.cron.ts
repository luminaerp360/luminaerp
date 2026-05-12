import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountsPayableService } from './accounts-payable.service';

@Injectable()
export class AccountsPayableCron {
  private readonly logger = new Logger(AccountsPayableCron.name);

  constructor(
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  /**
   * Run every day at 2:00 AM to update overdue bills
   * Cron format: second minute hour day month dayOfWeek
   */
  @Cron('0 2 * * *', {
    name: 'update-overdue-bills',
    timeZone: 'Africa/Nairobi',
  })
  async handleOverdueBills() {
    this.logger.log('Starting overdue bills update...');

    try {
      const result = await this.accountsPayableService.updateOverdueBills();

      this.logger.log(
        `Updated ${result.updatedCount} bills to overdue status`,
      );

      return result;
    } catch (error) {
      this.logger.error('Error in overdue bills cron job', error);
      throw error;
    }
  }

  /**
   * For development/testing - runs every hour
   * Comment out in production
   */
  // @Cron('0 * * * *', {
  //   name: 'update-overdue-bills-hourly',
  //   timeZone: 'Africa/Nairobi',
  // })
  // async handleOverdueBillsHourly() {
  //   this.logger.log('Starting overdue bills update (hourly)...');
  //   return this.handleOverdueBills();
  // }
}