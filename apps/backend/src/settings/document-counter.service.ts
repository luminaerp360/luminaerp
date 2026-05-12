import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DocumentNumberOptions {
  includeYear?: boolean;
  includeMonth?: boolean;
  separator?: string;
  sequenceLength?: number;
}

@Injectable()
export class DocumentCounterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get next sequential number for a document type within an organization
   * This method uses atomic operations to prevent race conditions
   */
  async getNextNumber(
    organizationId: number,
    documentType: string,
    options: DocumentNumberOptions = {},
  ): Promise<number> {
    const { includeYear = true, includeMonth = false } = options;

    const now = new Date();
    const year = includeYear ? now.getFullYear() : 0;
    const month = includeMonth ? now.getMonth() + 1 : 0;

    // Use upsert with atomic increment to prevent race conditions
    // This ensures each organization gets sequential numbers
    const counter = await this.prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId,
          documentType,
          year,
          month,
        },
      },
      update: {
        currentValue: {
          increment: 1,
        },
        lastIncremented: now,
      },
      create: {
        organizationId,
        documentType,
        year,
        month,
        // Start from the max existing sequence to avoid collisions after counter reset
        currentValue: await this.resolveInitialValue(
          organizationId,
          documentType,
          year,
        ),
        lastIncremented: now,
      },
    });

    return counter.currentValue;
  }

  /**
   * When creating a fresh counter, start from max existing number + 1
   * to avoid collisions if counters were cleared but documents still exist.
   */
  private async resolveInitialValue(
    organizationId: number,
    documentType: string,
    year: number,
  ): Promise<number> {
    const tableMap: Record<string, string> = {
      INVOICE: 'invoice',
      ORDER: 'order',
      QUOTATION: 'quotation',
    };
    const model = tableMap[documentType];
    if (!model) return 1;

    const yearPrefix = year > 0 ? `-${year}-` : null;

    try {
      // Fetch all numbers for this org and extract the sequence part
      const records: {
        invoiceNumber?: string;
        orderNumber?: string;
        referenceNumber?: string;
      }[] = await (this.prisma as any)[model].findMany({
        where: { organizationId },
        select:
          model === 'invoice'
            ? { invoiceNumber: true }
            : model === 'order'
              ? { orderNumber: true }
              : { referenceNumber: true },
      });

      let max = 0;
      for (const rec of records) {
        const num: string | undefined =
          rec.invoiceNumber ?? rec.orderNumber ?? rec.referenceNumber;
        if (!num) continue;
        // If the number contains the year, only count those
        if (yearPrefix && !num.includes(yearPrefix)) continue;
        const lastPart = num.split('-').pop();
        if (lastPart) {
          const seq = parseInt(lastPart, 10);
          if (!isNaN(seq) && seq > max) max = seq;
        }
      }
      return max + 1;
    } catch {
      return 1;
    }
  }

  /**
   * Generate formatted document number with prefix
   * Example: INV-2026-00001
   */
  async generateDocumentNumber(
    organizationId: number,
    documentType: string,
    prefix: string,
    options: DocumentNumberOptions = {},
  ): Promise<string> {
    const {
      includeYear = true,
      includeMonth = false,
      separator = '-',
      sequenceLength = 5,
    } = options;

    // Get the next sequential number atomically
    const sequenceNumber = await this.getNextNumber(
      organizationId,
      documentType,
      {
        includeYear,
        includeMonth,
      },
    );

    // Build the document number
    const parts: string[] = [prefix];

    if (includeYear) {
      parts.push(new Date().getFullYear().toString());
    }

    if (includeMonth) {
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      parts.push(month);
    }

    // Add zero-padded sequence number
    const sequenceStr = sequenceNumber.toString().padStart(sequenceLength, '0');
    parts.push(sequenceStr);

    return parts.join(separator);
  }

  /**
   * Get current counter value without incrementing
   */
  async getCurrentValue(
    organizationId: number,
    documentType: string,
    includeYear = true,
    includeMonth = false,
  ): Promise<number> {
    const now = new Date();
    const year = includeYear ? now.getFullYear() : 0;
    const month = includeMonth ? now.getMonth() + 1 : 0;

    const counter = await this.prisma.documentCounter.findUnique({
      where: {
        organizationId_documentType_year_month: {
          organizationId,
          documentType,
          year,
          month,
        },
      },
    });

    return counter?.currentValue || 0;
  }

  /**
   * Reset counter for a specific document type
   * Useful for testing or manual resets
   */
  async resetCounter(
    organizationId: number,
    documentType: string,
    includeYear = true,
    includeMonth = false,
  ): Promise<void> {
    const now = new Date();
    const year = includeYear ? now.getFullYear() : 0;
    const month = includeMonth ? now.getMonth() + 1 : 0;

    await this.prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId,
          documentType,
          year,
          month,
        },
      },
      update: {
        currentValue: 0,
      },
      create: {
        organizationId,
        documentType,
        year,
        month,
        currentValue: 0,
      },
    });
  }

  /**
   * Get all counters for an organization
   */
  async getOrganizationCounters(organizationId: number) {
    return this.prisma.documentCounter.findMany({
      where: {
        organizationId,
      },
      orderBy: [{ documentType: 'asc' }, { year: 'desc' }, { month: 'desc' }],
    });
  }

  /**
   * Set counter to a specific value
   * Useful for data migration
   */
  async setCounterValue(
    organizationId: number,
    documentType: string,
    value: number,
    includeYear = true,
    includeMonth = false,
  ): Promise<void> {
    const now = new Date();
    const year = includeYear ? now.getFullYear() : 0;
    const month = includeMonth ? now.getMonth() + 1 : 0;

    await this.prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId,
          documentType,
          year,
          month,
        },
      },
      update: {
        currentValue: value,
      },
      create: {
        organizationId,
        documentType,
        year,
        month,
        currentValue: value,
      },
    });
  }
}
