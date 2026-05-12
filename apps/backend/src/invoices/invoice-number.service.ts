import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentCounterService } from '../settings/document-counter.service';

@Injectable()
export class InvoiceNumberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly counterService: DocumentCounterService,
  ) {}

  /**
   * Generate next invoice number with format: INV-YYYY-XXXXX
   * Example: INV-2026-00001
   * Uses atomic counter to prevent duplicate numbers across organizations
   */
  async generateInvoiceNumber(
    organizationId: number,
    prefix: string = 'INV',
  ): Promise<string> {
    return this.counterService.generateDocumentNumber(
      organizationId,
      'INVOICE',
      prefix,
      {
        includeYear: true,
        includeMonth: false,
        separator: '-',
        sequenceLength: 5,
      },
    );
  }

  /**
   * Generate invoice number with custom format
   * Uses atomic counter to prevent duplicate numbers
   */
  async generateCustomInvoiceNumber(
    organizationId: number,
    format: {
      prefix?: string;
      includeYear?: boolean;
      includeMonth?: boolean;
      sequenceLength?: number;
      separator?: string;
    },
  ): Promise<string> {
    const {
      prefix = 'INV',
      includeYear = true,
      includeMonth = false,
      sequenceLength = 5,
      separator = '-',
    } = format;

    return this.counterService.generateDocumentNumber(
      organizationId,
      'INVOICE',
      prefix,
      {
        includeYear,
        includeMonth,
        sequenceLength,
        separator,
      },
    );
  }

  /**
   * Validate invoice number format
   */
  validateInvoiceNumber(invoiceNumber: string): boolean {
    // Basic validation: should have at least 3 parts separated by dashes
    const parts = invoiceNumber.split('-');
    return parts.length >= 3 && parts.every((part) => part.length > 0);
  }

  /**
   * Check if invoice number already exists
   */
  async invoiceNumberExists(invoiceNumber: string): Promise<boolean> {
    const count = await this.prisma.invoice.count({
      where: {
        invoiceNumber,
      },
    });

    return count > 0;
  }

  /**
   * Generate unique public token for invoice sharing
   */
  generatePublicToken(): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
  }
}
