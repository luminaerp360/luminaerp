import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingsDto, UpdateSettingsDto } from './settings.dto';
import { PaymentMethodService } from './payment-method.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentMethodService))
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  /**
   * Get settings for an organization (create default if doesn't exist)
   */
  async getByOrganization(organizationId: number) {
    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    // Get or create settings
    let settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings for the organization
      settings = await this.create({ organizationId });
    }

    return settings;
  }

  /**
   * Create settings for an organization
   */
  async create(dto: CreateSettingsDto) {
    // Check if settings already exist
    const existingSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: dto.organizationId },
    });

    if (existingSettings) {
      throw new ConflictException(
        `Settings for organization ${dto.organizationId} already exist`,
      );
    }

    // Convert paymentMethods object to JSON
    const data: any = { ...dto };
    if (dto.paymentMethods) {
      data.paymentMethods = dto.paymentMethods;
    }

    const settings = await this.prisma.organizationSettings.create({
      data,
    });

    // Initialize default payment methods
    try {
      await this.paymentMethodService.initializeDefaults(
        settings.id,
        dto.organizationId,
      );
    } catch (error) {
      console.error('Error initializing payment methods:', error);
    }

    return settings;
  }

  /**
   * Update settings for an organization
   */
  async update(organizationId: number, dto: UpdateSettingsDto) {
    // Get existing settings (or create if doesn't exist)
    await this.getByOrganization(organizationId);

    // Convert paymentMethods object to JSON if provided
    const data: any = { ...dto };
    if (dto.paymentMethods) {
      data.paymentMethods = dto.paymentMethods;
    }

    return this.prisma.organizationSettings.update({
      where: { organizationId },
      data,
    });
  }

  /**
   * Update specific setting section
   */
  async updateSection(
    organizationId: number,
    section:
      | 'payment'
      | 'tax'
      | 'general'
      | 'prefixes'
      | 'display'
      | 'reporting'
      | 'recurring'
      | 'inventory'
      | 'notifications'
      | 'receipt'
      | 'business'
      | 'documents',
    data: Partial<UpdateSettingsDto>,
  ) {
    // Get existing settings
    await this.getByOrganization(organizationId);

    // Convert paymentMethods object to JSON if provided
    const updateData: any = { ...data };
    if (data.paymentMethods) {
      updateData.paymentMethods = data.paymentMethods;
    }

    return this.prisma.organizationSettings.update({
      where: { organizationId },
      data: updateData,
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults(organizationId: number) {
    // Delete existing settings
    await this.prisma.organizationSettings.delete({
      where: { organizationId },
    });

    // Create new default settings
    return this.create({ organizationId });
  }

  /**
   * Get payment methods configuration
   */
  async getPaymentMethods(organizationId: number) {
    const settings = await this.getByOrganization(organizationId);
    return settings.paymentMethods;
  }

  /**
   * Update payment methods configuration
   */
  async updatePaymentMethods(
    organizationId: number,
    paymentMethods: {
      cash?: boolean;
      mpesa?: boolean;
      bank?: boolean;
      credit?: boolean;
    },
  ) {
    const settings = await this.getByOrganization(organizationId);
    const currentMethods = settings.paymentMethods as any;

    const updatedMethods = {
      ...currentMethods,
      ...paymentMethods,
    };

    return this.prisma.organizationSettings.update({
      where: { organizationId },
      data: { paymentMethods: updatedMethods },
    });
  }

  /**
   * Get tax settings
   */
  async getTaxSettings(organizationId: number) {
    const settings = await this.getByOrganization(organizationId);
    return {
      enableTax: settings.enableTax,
      defaultTaxRate: settings.defaultTaxRate,
      taxName: settings.taxName,
      taxNumber: settings.taxNumber,
      includeTaxInPrice: settings.includeTaxInPrice,
    };
  }

  /**
   * Get prefix for a specific document type
   */
  async getPrefix(
    organizationId: number,
    type:
      | 'invoice'
      | 'sale'
      | 'quotation'
      | 'lpo'
      | 'payment'
      | 'expense'
      | 'creditSale',
  ): Promise<string> {
    const settings = await this.getByOrganization(organizationId);
    const prefixMap = {
      invoice: settings.invoicePrefix,
      sale: settings.salePrefix,
      quotation: settings.quotationPrefix,
      lpo: settings.lpoPrefix,
      payment: settings.paymentPrefix,
      expense: settings.expensePrefix,
      creditSale: settings.creditSalePrefix,
    };
    return prefixMap[type];
  }

  /**
   * Get currency settings
   */
  async getCurrencySettings(organizationId: number) {
    const settings = await this.getByOrganization(organizationId);
    return {
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      decimalPlaces: settings.decimalPlaces,
    };
  }

  /**
   * Get date/time format settings
   */
  async getDateTimeSettings(organizationId: number) {
    const settings = await this.getByOrganization(organizationId);
    return {
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      timeZone: settings.timeZone,
    };
  }

  /**
   * Get fiscal year settings
   */
  async getFiscalYearSettings(organizationId: number) {
    const settings = await this.getByOrganization(organizationId);
    return {
      fiscalYearStart: settings.fiscalYearStart,
      fiscalYearEnd: settings.fiscalYearEnd,
    };
  }

  /**
   * Get reporting period settings
   */
  async getReportingPeriodSettings(organizationId: number) {
    const settings = await this.getByOrganization(organizationId);
    return {
      reportingPeriodStart: settings.reportingPeriodStart,
      reportingPeriodEnd: settings.reportingPeriodEnd,
    };
  }
}
