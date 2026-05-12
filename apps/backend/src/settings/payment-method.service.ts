import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './payment-method.dto';

@Injectable()
export class PaymentMethodService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment method
   */
  async create(dto: CreatePaymentMethodDto) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: dto.organizationId },
      select: { id: true },
    });

    if (!settings) {
      throw new NotFoundException(
        'Organization settings not found. Please initialize settings first.',
      );
    }

    // Check if code already exists for this settings
    const existing = await this.prisma.paymentMethodConfig.findFirst({
      where: {
        settingsId: settings.id,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Payment method with code '${dto.code}' already exists for this organization`,
      );
    }

    return this.prisma.paymentMethodConfig.create({
      data: {
        organizationId: dto.organizationId,
        settingsId: settings.id,
        name: dto.name,
        code: dto.code,
        displayName: dto.displayName,
        description: dto.description,
        icon: dto.icon,
        enabled: dto.enabled,
        sortOrder: dto.sortOrder,
        requiresReference: dto.requiresReference,
        autoReconcile: dto.autoReconcile,
        accountNumber: dto.accountNumber,
        providerName: dto.providerName,
        providerConfig: dto.providerConfig,
      },
    });
  }

  /**
   * Get all payment methods for an organization
   */
  async findByOrganization(organizationId: number) {
    // Get settings first
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      return [];
    }

    return this.prisma.paymentMethodConfig.findMany({
      where: { settingsId: settings.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get a single payment method by ID
   */
  async findOne(id: number) {
    const paymentMethod = await this.prisma.paymentMethodConfig.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    return paymentMethod;
  }

  /**
   * Update a payment method
   */
  async update(id: number, dto: UpdatePaymentMethodDto) {
    await this.findOne(id); // Ensure it exists

    return this.prisma.paymentMethodConfig.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a payment method
   */
  async remove(id: number) {
    await this.findOne(id); // Ensure it exists

    return this.prisma.paymentMethodConfig.delete({
      where: { id },
    });
  }

  /**
   * Toggle payment method enabled status
   */
  async toggleEnabled(id: number) {
    const paymentMethod = await this.findOne(id);

    return this.prisma.paymentMethodConfig.update({
      where: { id },
      data: { enabled: !paymentMethod.enabled },
    });
  }

  /**
   * Reorder payment methods
   */
  async reorder(organizationId: number, orderedIds: number[]) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    // Update sort order for each payment method
    const updates = orderedIds.map((id, index) =>
      this.prisma.paymentMethodConfig.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.findByOrganization(organizationId);
  }

  /**
   * Get enabled payment methods only
   */
  async findEnabledByOrganization(organizationId: number) {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      return [];
    }

    return this.prisma.paymentMethodConfig.findMany({
      where: {
        settingsId: settings.id,
        enabled: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Initialize default payment methods for new organizations
   */
  async initializeDefaults(settingsId: number, organizationId: number) {
    const defaults = [
      {
        organizationId,
        settingsId,
        name: 'Cash',
        code: 'CASH',
        displayName: 'Cash Payment',
        description: 'Physical cash payment',
        icon: 'payments',
        enabled: true,
        sortOrder: 0,
        requiresReference: false,
      },
      {
        organizationId,
        settingsId,
        name: 'M-PESA',
        code: 'MPESA',
        displayName: 'M-PESA',
        description: 'Mobile money payment via M-PESA',
        icon: 'phone_android',
        enabled: true,
        sortOrder: 1,
        requiresReference: true,
      },
      {
        organizationId,
        settingsId,
        name: 'Bank Transfer',
        code: 'BANK',
        displayName: 'Bank Transfer',
        description: 'Direct bank transfer',
        icon: 'account_balance',
        enabled: true,
        sortOrder: 2,
        requiresReference: true,
      },
      {
        organizationId,
        settingsId,
        name: 'Credit',
        code: 'CREDIT',
        displayName: 'Credit/Invoice',
        description: 'Pay later via invoice',
        icon: 'credit_card',
        enabled: true,
        sortOrder: 3,
        requiresReference: false,
      },
    ];

    // Create all defaults
    await this.prisma.paymentMethodConfig.createMany({
      data: defaults,
      skipDuplicates: true,
    });

    return this.prisma.paymentMethodConfig.findMany({
      where: { settingsId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
