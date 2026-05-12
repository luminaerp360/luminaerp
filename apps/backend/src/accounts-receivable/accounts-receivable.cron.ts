import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ReceivableStatus } from '@prisma/client';

@Injectable()
export class AccountsReceivableCron {
  constructor(private prisma: PrismaService) {}

  // Run daily at midnight to update overdue receivables
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateOverdueReceivables() {
    const now = new Date();

    // Find all approved or partially paid receivables that are past due
    const overdueReceivables = await this.prisma.receivable.findMany({
      where: {
        status: {
          in: [ReceivableStatus.APPROVED, ReceivableStatus.PARTIALLY_PAID],
        },
        dueDate: {
          lt: now,
        },
      },
    });

    // Update their status to OVERDUE
    if (overdueReceivables.length > 0) {
      await this.prisma.receivable.updateMany({
        where: {
          id: {
            in: overdueReceivables.map(r => r.id),
          },
        },
        data: {
          status: ReceivableStatus.OVERDUE,
        },
      });

      console.log(`Updated ${overdueReceivables.length} receivables to OVERDUE status`);
    }
  }

  // Run weekly on Monday at 9 AM to send collection reminders
  @Cron('0 9 * * 1')
  async sendCollectionReminders() {
    // This would integrate with email service to send reminders
    // For now, just log the action
    const overdueReceivables = await this.prisma.receivable.findMany({
      where: {
        status: ReceivableStatus.OVERDUE,
        balanceAmount: {
          gt: 0,
        },
      },
      include: {
        customer: true,
        organization: true,
      },
    });

    if (overdueReceivables.length > 0) {
      console.log(`Found ${overdueReceivables.length} overdue receivables for collection reminders`);
      // TODO: Integrate with email service to send reminders
    }
  }
}