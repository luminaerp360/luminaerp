import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get enabled payment methods for an organization
   */
  async getPaymentMethods(organizationId: number) {
    const paymentMethods = await this.prisma.paymentMethodConfig.findMany({
      where: {
        organizationId,
        enabled: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        code: true,
        displayName: true,
        description: true,
        icon: true,
        requiresReference: true,
      },
    });

    return paymentMethods;
  }
}
