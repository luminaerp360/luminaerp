// src/organization/organization.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './create-organization.dto';
import { UpdateOrganizationDto } from './update-organization.dto';
import { AuthService } from 'src/auth/auth.service';
import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  TransactionType,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { CreatePaymentTransactionDto } from './payments.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  private generateLicenseKey(): string {
    return `POS-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private getSubscriptionDefaults(plan: SubscriptionPlan) {
    const defaults = {
      [SubscriptionPlan.BASIC]: {
        maxDevices: 1,
        maxUsers: 2,
        maxLocations: 1,
        price: 1000,
        durationMonths: 1,
      },
      [SubscriptionPlan.STANDARD]: {
        maxDevices: 3,
        maxUsers: 5,
        maxLocations: 2,
        price: 2500,
        durationMonths: 1,
      },
      [SubscriptionPlan.PREMIUM]: {
        maxDevices: 10,
        maxUsers: 15,
        maxLocations: 5,
        price: 5000,
        durationMonths: 1,
      },
      [SubscriptionPlan.ENTERPRISE]: {
        maxDevices: 50,
        maxUsers: 100,
        maxLocations: 20,
        price: 10000,
        durationMonths: 1,
      },
    };
    return defaults[plan];
  }

  // Updated create method in organization.service.ts

  async create(createOrganizationDto: CreateOrganizationDto) {
    console.log('Starting organization creation process...');

    try {
      // Step 1: Validate the DTO
      if (!createOrganizationDto.name) {
        throw new BadRequestException('Organization name is required');
      }

      // Separate organization data from subscription data
      const {
        // Subscription fields
        subscriptionPlan,
        subscriptionStatus,
        startDate,
        endDate,
        maxDevices,
        maxUsers,
        maxLocations,
        autoRenew,
        // Organization fields
        ...organizationData
      } = createOrganizationDto;

      const plan = subscriptionPlan || SubscriptionPlan.BASIC;
      const status = subscriptionStatus || SubscriptionStatus.TRIAL;
      const planDefaults = this.getSubscriptionDefaults(plan);
      const licenseKey = this.generateLicenseKey();

      console.log('Creating organization with subscription plan:', plan);
      console.log('Organization data:', organizationData);

      // Parse dates or use defaults
      const subscriptionStartDate = startDate
        ? new Date(startDate)
        : new Date();
      const subscriptionEndDate = endDate
        ? new Date(endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Step 2: Create organization with subscription
      const organization = await this.prisma.$transaction(async (prisma) => {
        try {
          const org = await prisma.organization.create({
            data: {
              ...organizationData, // Only organization fields
              subscription: {
                create: {
                  plan,
                  status,
                  startDate: subscriptionStartDate,
                  endDate: subscriptionEndDate,
                  maxDevices: maxDevices || planDefaults.maxDevices,
                  maxUsers: maxUsers || planDefaults.maxUsers,
                  maxLocations: maxLocations || planDefaults.maxLocations,
                  licenseKey,
                  price: planDefaults.price,
                  autoRenew: autoRenew ?? true,
                },
              },
            },
            include: {
              subscription: true,
            },
          });

          console.log('Organization created successfully:', org.id);
          return org;
        } catch (prismaError) {
          console.error(
            'Prisma error during organization creation:',
            prismaError,
          );
          throw new InternalServerErrorException({
            message: 'Failed to create organization record',
            error: prismaError.message,
            code: 'ORGANIZATION_CREATION_FAILED',
          });
        }
      });

      // Step 3: Create admin user (keep this part the same)
      try {
        console.log('Creating admin user for organization:', organization.id);

        const adminUser = {
          email: `admin@${organization.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          password: 'Admin@2520',
          fullName: 'Admin User',
          username: 'admin',
          role: 'admin',
          phone: '1234567890',
          status: 'active',
          createdBy: 'system',
          permissions: { manageAll: true },
        };

        await this.authService.signUp(organization.id, adminUser);
        console.log('Admin user created successfully');

        return {
          success: true,
          organization,
          message: 'Organization and admin user created successfully',
        };
      } catch (adminError) {
        console.error('Error creating admin user:', adminError);

        // Attempt to rollback organization creation
        try {
          await this.prisma.organization.delete({
            where: { id: organization.id },
          });
          console.log('Organization rollback successful');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
          throw new InternalServerErrorException({
            message:
              'Critical error: Failed to rollback organization after admin user creation failed',
            error: rollbackError.message,
            code: 'ROLLBACK_FAILED',
          });
        }

        throw new InternalServerErrorException({
          message: 'Failed to create admin user',
          error: adminError.message,
          code: 'ADMIN_CREATION_FAILED',
        });
      }
    } catch (error) {
      console.error('Organization creation process failed:', error);

      // Handle different types of errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException({
        message: 'Unexpected error during organization creation',
        error: error.message,
        code: 'UNEXPECTED_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  private validateSubscriptionValues(
    dto: CreateOrganizationDto,
    planDefaults: any,
  ) {
    if (dto.maxDevices && dto.maxDevices > planDefaults.maxDevices) {
      throw new BadRequestException(
        `Maximum devices cannot exceed ${planDefaults.maxDevices} for ${dto.subscriptionPlan} plan`,
      );
    }
    if (dto.maxUsers && dto.maxUsers > planDefaults.maxUsers) {
      throw new BadRequestException(
        `Maximum users cannot exceed ${planDefaults.maxUsers} for ${dto.subscriptionPlan} plan`,
      );
    }
    if (dto.maxLocations && dto.maxLocations > planDefaults.maxLocations) {
      throw new BadRequestException(
        `Maximum locations cannot exceed ${planDefaults.maxLocations} for ${dto.subscriptionPlan} plan`,
      );
    }
  }

  async getSubscriptionDetails(organizationId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        devices: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async registerDevice(
    organizationId: number,
    deviceName: string,
    deviceId: string,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { devices: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.devices.length >= subscription.maxDevices) {
      throw new Error('Maximum device limit reached');
    }

    return this.prisma.device.create({
      data: {
        subscriptionId: subscription.id,
        deviceName,
        deviceId,
        lastActive: new Date(),
      },
    });
  }

  async checkSubscriptionStatus(organizationId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const isExpired = new Date() > subscription.endDate;
    if (isExpired && subscription.status !== SubscriptionStatus.EXPIRED) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    }

    return {
      isActive: !isExpired && subscription.status === SubscriptionStatus.ACTIVE,
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      ),
      status: isExpired ? SubscriptionStatus.EXPIRED : subscription.status,
      plan: subscription.plan,
    };
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            locations: true,
            users: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: true,
        locations: true,
        _count: {
          select: {
            users: true,
            products: true,
            orders: true,
            customers: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  // Fixed organization.service.ts update method

  async update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
    try {
      console.log('Updating organization ID:', id);
      console.log('Update data received:', updateOrganizationDto);

      // First, check if the organization exists
      const existingOrg = await this.prisma.organization.findUnique({
        where: { id },
        include: { subscription: true },
      });

      if (!existingOrg) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      // Separate organization data from subscription data
      const {
        // Subscription fields (these DON'T belong to Organization model)
        subscriptionPlan,
        subscriptionStatus,
        startDate,
        endDate,
        maxDevices,
        maxUsers,
        maxLocations,
        autoRenew,
        // Organization fields (these DO belong to Organization model)
        ...organizationData
      } = updateOrganizationDto;

      console.log('Organization data to update:', organizationData);
      console.log('Subscription data to update:', {
        subscriptionPlan,
        subscriptionStatus,
        startDate,
        endDate,
        maxDevices,
        maxUsers,
        maxLocations,
        autoRenew,
      });

      // Use transaction to update both organization and subscription
      const result = await this.prisma.$transaction(async (prisma) => {
        // Update organization data
        const updatedOrg = await prisma.organization.update({
          where: { id },
          data: organizationData, // Only organization fields
        });

        // Update subscription data if provided and subscription exists
        if (
          existingOrg.subscription &&
          (subscriptionPlan ||
            subscriptionStatus ||
            startDate ||
            endDate ||
            maxDevices ||
            maxUsers ||
            maxLocations ||
            autoRenew !== undefined)
        ) {
          const subscriptionUpdateData: any = {};

          if (subscriptionPlan) subscriptionUpdateData.plan = subscriptionPlan;
          if (subscriptionStatus)
            subscriptionUpdateData.status = subscriptionStatus;
          if (startDate) subscriptionUpdateData.startDate = new Date(startDate);
          if (endDate) subscriptionUpdateData.endDate = new Date(endDate);
          if (maxDevices) subscriptionUpdateData.maxDevices = maxDevices;
          if (maxUsers) subscriptionUpdateData.maxUsers = maxUsers;
          if (maxLocations) subscriptionUpdateData.maxLocations = maxLocations;
          if (autoRenew !== undefined)
            subscriptionUpdateData.autoRenew = autoRenew;

          console.log('Updating subscription with:', subscriptionUpdateData);

          await prisma.subscription.update({
            where: { organizationId: id },
            data: subscriptionUpdateData,
          });
        }

        // Return the complete updated organization with subscription
        return await prisma.organization.findUnique({
          where: { id },
          include: {
            subscription: true,
            locations: true,
            _count: {
              select: {
                users: true,
                products: true,
                orders: true,
                customers: true,
              },
            },
          },
        });
      });

      console.log('Update completed successfully');
      return result;
    } catch (error) {
      console.error('Organization update error:', error);

      // Handle specific Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new BadRequestException(
              `Organization with this ${error.meta?.target} already exists`,
            );
          case 'P2025':
            throw new NotFoundException(`Organization with ID ${id} not found`);
          case 'P2003':
            throw new BadRequestException(
              'Cannot update organization due to related records',
            );
          default:
            throw new InternalServerErrorException(
              `Database error: ${error.message}`,
            );
        }
      }

      // Handle validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(
          `Invalid data provided: ${error.message}`,
        );
      }

      // Re-throw known NestJS exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the organization',
      );
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.organization.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
  }

  async findSubscriptionByOrgName(orgName: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { name: orgName },
      include: {
        subscription: true,
      },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with name "${orgName}" not found`,
      );
    }

    if (!organization.subscription) {
      throw new NotFoundException(
        `Subscription for organization "${orgName}" not found`,
      );
    }

    return organization.subscription;
  }

  // Additional business logic methods
  async getOrganizationStats(id: number) {
    const [organization, stats] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id },
        select: {
          name: true,
          address: true,
          contact: true,
        },
      }),
      this.prisma.$transaction([
        this.prisma.location.count({ where: { organizationId: id } }),
        this.prisma.user.count({ where: { organizationId: id } }),
        this.prisma.product.count({ where: { organizationId: id } }),
        this.prisma.order.count({ where: { organizationId: id } }),
        this.prisma.customer.count({ where: { organizationId: id } }),
      ]),
    ]);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return {
      ...organization,
      statistics: {
        totalLocations: stats[0],
        totalUsers: stats[1],
        totalProducts: stats[2],
        totalOrders: stats[3],
        totalCustomers: stats[4],
      },
    };
  }

  async getOrganizationByLicenseKey(licenseKey: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { licenseKey },
      select: {
        organizationId: true,
        status: true,
        endDate: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Invalid license key');
    }

    // Check if subscription is expired
    const isExpired = new Date() > subscription.endDate;
    // if (isExpired || subscription.status === SubscriptionStatus.SUSPENDED) {
    //   throw new BadRequestException('Subscription is expired or suspended');
    // }

    return {
      organizationId: subscription.organizationId,
      organizationName: subscription.organization.name,
      subscriptionStatus: subscription.status,
    };
  }

  async getOrganizationRevenue(id: number, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId: id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isVoided: false,
      },
      select: {
        total: true,
        cashPaid: true,
        mpesaPaid: true,
        bankPaid: true,
        createdAt: true,
      },
    });

    return {
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      paymentMethods: {
        cash: orders.reduce((sum, order) => sum + order.cashPaid, 0),
        mpesa: orders.reduce((sum, order) => sum + order.mpesaPaid, 0),
        bank: orders.reduce((sum, order) => sum + order.bankPaid, 0),
      },
      orderCount: orders.length,
    };
  }

  async getAllSubscriptions(status?: SubscriptionStatus) {
    console.log('getAllSubscriptions called with status:', status);
    try {
      const whereClause = status ? { status } : {};

      const subscriptions = await this.prisma.subscription.findMany({
        where: whereClause,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              address: true,
              contact: true,
              _count: {
                select: {
                  users: true,
                  locations: true,
                },
              },
            },
          },
          devices: {
            select: {
              id: true,
              deviceName: true,
              lastActive: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return subscriptions.map((subscription) => ({
        ...subscription,
        daysRemaining: Math.max(
          0,
          Math.ceil(
            (new Date(subscription.endDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        ),
        isExpired: new Date() > new Date(subscription.endDate),
        activeDevices: subscription.devices.length,
      }));
    } catch (error) {
      throw new BadRequestException('Failed to fetch subscriptions');
    }
  }

  async updateOrganizationStatus(
    organizationId: number,
    newStatus: SubscriptionStatus,
    remarks?: string,
  ) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { organizationId },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new NotFoundException(
          `No subscription found for organization ID ${organizationId}`,
        );
      }

      // Validate status transition
      if (
        newStatus === SubscriptionStatus.ACTIVE &&
        subscription.status === SubscriptionStatus.SUSPENDED
      ) {
        // Check if subscription is expired
        // if (new Date() > subscription.endDate) {
        //   throw new BadRequestException('Cannot activate an expired subscription');
        // }
      }

      const updatedSubscription = await this.prisma.subscription.update({
        where: { organizationId },
        data: {
          status: newStatus,
          // If moving to SUSPENDED, update the endDate to current date
          ...(newStatus === SubscriptionStatus.SUSPENDED && {
            endDate: new Date(),
          }),
          updatedAt: new Date(),
        },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        message: `Successfully updated subscription status to ${newStatus}`,
        organizationName: updatedSubscription.organization.name,
        newStatus,
        previousStatus: subscription.status,
        updateTime: updatedSubscription.updatedAt,
        remarks,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update organization status: ${error.message}`,
      );
    }
  }

  async createPaymentTransaction(
    organizationId: number | null,
    createPaymentTransactionDto: CreatePaymentTransactionDto,
  ) {
    try {
      // For subscription payments, verify the organization exists
      if (
        createPaymentTransactionDto.transactionType ===
          TransactionType.SUBSCRIPTION &&
        organizationId
      ) {
        const organization = await this.prisma.organization.findUnique({
          where: { id: organizationId },
          include: { subscription: true },
        });

        if (!organization) {
          throw new NotFoundException('Organization not found');
        }

        if (!organization.subscription) {
          throw new BadRequestException(
            'Organization has no active subscription',
          );
        }
      }

      // Create the payment data object correctly following Prisma's type structure
      const paymentData: Prisma.PaymentTransactionCreateInput = {
        transactionType: createPaymentTransactionDto.transactionType,
        amount: createPaymentTransactionDto.amount,
        method: createPaymentTransactionDto.method,
        status: PaymentStatus.PAID,
        paidBy: createPaymentTransactionDto.paidBy,
        paidTo: createPaymentTransactionDto.paidTo || '',
        description: createPaymentTransactionDto.description,
        organization: organizationId
          ? {
              connect: { id: organizationId },
            }
          : undefined,
        transactionCode: createPaymentTransactionDto.transactionCode,
        remarks: createPaymentTransactionDto.remarks,
        receiptUrl: createPaymentTransactionDto.receiptUrl,
      };

      const payment = await this.prisma.paymentTransaction.create({
        data: paymentData,
        include: {
          organization: {
            select: {
              name: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                  endDate: true,
                },
              },
            },
          },
        },
      });

      // If this is a subscription payment, update the subscription status
      if (
        payment.transactionType === TransactionType.SUBSCRIPTION &&
        organizationId
      ) {
        await this.updateSubscriptionAfterPayment(
          organizationId,
          payment.amount,
        );
      }

      return {
        success: true,
        message: `${payment.transactionType.toLowerCase()} payment recorded successfully`,
        payment,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create payment transaction: ${error.message}`,
      );
    }
  }

  private async updateSubscriptionAfterPayment(
    organizationId: number,
    amount: number,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (subscription) {
      // Update subscription status and extend end date based on your business logic
      const newEndDate = new Date(subscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1); // Example: extend by 1 month

      await this.prisma.subscription.update({
        where: { organizationId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          endDate: newEndDate,
        },
      });
    }
  }

  async getPaymentTransactions(query: {
    organizationId?: number;
    transactionType?: TransactionType;
    startDate?: string;
    endDate?: string;
    method?: PaymentMethod;
  }) {
    const where: any = {};

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.method) {
      where.method = query.method;
    }

    const payments = await this.prisma.paymentTransaction.findMany({
      where,
      include: {
        organization: {
          select: {
            name: true,
            subscription: {
              select: {
                plan: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      payments,
      summary: {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        byType: payments.reduce(
          (acc, p) => {
            acc[p.transactionType] = (acc[p.transactionType] || 0) + p.amount;
            return acc;
          },
          {} as Record<TransactionType, number>,
        ),
        byMethod: payments.reduce(
          (acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + p.amount;
            return acc;
          },
          {} as Record<PaymentMethod, number>,
        ),
      },
    };
  }

  /**
   * Export complete organization data for offline use using license key
   */
  async exportOrganizationDataByLicenseKey(licenseKey: string) {
    try {
      // Find subscription by license key
      const subscription = await this.prisma.subscription.findUnique({
        where: { licenseKey },
        include: {
          organization: true,
        },
      });

      if (!subscription) {
        throw new NotFoundException('Invalid license key');
      }

      const organization = subscription.organization;
      const organizationId = organization.id;

      // Fetch all related data in parallel
      const [
        locations,
        users,
        products,
        categories,
        orders,
        customers,
        suppliers,
        inventory,
        creditSales,
        quotations,
        localPurchaseOrders,
        expenses,
        creditSalePayments,
        stockTransfers,
      ] = await Promise.all([
        this.prisma.location.findMany({
          where: { organizationId },
        }),
        this.prisma.user.findMany({
          where: { organizationId },
          select: {
            id: true,
            email: true,
            fullName: true,
            username: true,
            phone: true,
            status: true,
            role: true,
            createdBy: true,
            photoURL: true,
            permissions: true,
            locationId: true,
            createdAt: true,
            updatedAt: true,
            // Exclude password for security
          },
        }),
        this.prisma.product.findMany({
          where: { organizationId },
        }),
        this.prisma.category.findMany({
          where: { organizationId },
        }),
        this.prisma.order.findMany({
          where: { organizationId },
        }),
        this.prisma.customer.findMany({
          where: { organizationId },
        }),
        this.prisma.supplier.findMany({
          where: { organizationId },
        }),
        this.prisma.inventory.findMany({
          where: { organizationId },
        }),
        this.prisma.creditSale.findMany({
          where: { organizationId },
        }),
        this.prisma.quotation.findMany({
          where: { organizationId },
        }),
        this.prisma.localPurchaseOrder.findMany({
          where: { organizationId },
        }),
        this.prisma.expense.findMany({
          where: { organizationId },
        }),
        this.prisma.creditSalePayment.findMany({
          where: { organizationId },
        }),
        this.prisma.stockTransfer.findMany({
          where: {
            OR: [
              { fromOrganizationId: organizationId },
              { toOrganizationId: organizationId },
            ],
          },
        }),
      ]);

      // Prepare export data
      const exportData = {
        metadata: {
          exportDate: new Date(),
          organizationId: organization.id,
          organizationName: organization.name,
          version: '1.0.0',
        },
        organization: {
          name: organization.name,
          address: organization.address,
          contact: organization.contact,
          logoUrl: organization.logoUrl,
          complementaryMessage: organization.complementaryMessage,
          stations: organization.stations,
          bankDetails: organization.bankDetails,
          mpesaDetails: organization.mpesaDetails,
        },
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          maxDevices: subscription.maxDevices,
          maxUsers: subscription.maxUsers,
          maxLocations: subscription.maxLocations,
          licenseKey: subscription.licenseKey,
        },
        locations,
        users,
        products,
        categories,
        orders,
        customers,
        suppliers,
        inventory,
        creditSales,
        quotations,
        localPurchaseOrders,
        expenses,
        creditSalePayments,
        stockTransfers,
        statistics: {
          totalLocations: locations.length,
          totalUsers: users.length,
          totalProducts: products.length,
          totalCategories: categories.length,
          totalOrders: orders.length,
          totalCustomers: customers.length,
          totalSuppliers: suppliers.length,
          totalInventoryRecords: inventory.length,
          totalCreditSales: creditSales.length,
          totalQuotations: quotations.length,
          totalLPOs: localPurchaseOrders.length,
          totalExpenses: expenses.length,
        },
      };

      return {
        success: true,
        message: 'Organization data exported successfully',
        data: exportData,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to export organization data: ${error.message}`,
      );
    }
  }

  /**
   * Export complete organization data for offline use (by organization ID)
   * @deprecated Use exportOrganizationDataByLicenseKey instead
   */
  async exportOrganizationData(organizationId: number) {
    try {
      // Verify organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${organizationId} not found`,
        );
      }

      if (!organization.subscription) {
        throw new NotFoundException(
          'Organization does not have a subscription with a license key',
        );
      }

      // Use the license key method
      return this.exportOrganizationDataByLicenseKey(
        organization.subscription.licenseKey,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to export organization data: ${error.message}`,
      );
    }
  }

  /**
   * Old implementation - keeping for reference
   */
  private async exportOrganizationDataOld(organizationId: number) {
    try {
      // Verify organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          subscription: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${organizationId} not found`,
        );
      }

      // Fetch all related data in parallel
      const [
        locations,
        users,
        products,
        categories,
        orders,
        customers,
        suppliers,
        inventory,
        creditSales,
        quotations,
        localPurchaseOrders,
        expenses,
        creditSalePayments,
        stockTransfers,
      ] = await Promise.all([
        this.prisma.location.findMany({
          where: { organizationId },
        }),
        this.prisma.user.findMany({
          where: { organizationId },
          select: {
            id: true,
            email: true,
            fullName: true,
            username: true,
            phone: true,
            status: true,
            role: true,
            createdBy: true,
            photoURL: true,
            permissions: true,
            locationId: true,
            createdAt: true,
            updatedAt: true,
            // Exclude password for security
          },
        }),
        this.prisma.product.findMany({
          where: { organizationId },
        }),
        this.prisma.category.findMany({
          where: { organizationId },
        }),
        this.prisma.order.findMany({
          where: { organizationId },
        }),
        this.prisma.customer.findMany({
          where: { organizationId },
        }),
        this.prisma.supplier.findMany({
          where: { organizationId },
        }),
        this.prisma.inventory.findMany({
          where: { organizationId },
        }),
        this.prisma.creditSale.findMany({
          where: { organizationId },
        }),
        this.prisma.quotation.findMany({
          where: { organizationId },
        }),
        this.prisma.localPurchaseOrder.findMany({
          where: { organizationId },
        }),
        this.prisma.expense.findMany({
          where: { organizationId },
        }),
        this.prisma.creditSalePayment.findMany({
          where: { organizationId },
        }),
        this.prisma.stockTransfer.findMany({
          where: {
            OR: [
              { fromOrganizationId: organizationId },
              { toOrganizationId: organizationId },
            ],
          },
        }),
      ]);

      // Prepare export data
      const exportData = {
        metadata: {
          exportDate: new Date(),
          organizationId: organization.id,
          organizationName: organization.name,
          version: '1.0.0',
        },
        organization: {
          name: organization.name,
          address: organization.address,
          contact: organization.contact,
          logoUrl: organization.logoUrl,
          complementaryMessage: organization.complementaryMessage,
          stations: organization.stations,
          bankDetails: organization.bankDetails,
          mpesaDetails: organization.mpesaDetails,
        },
        subscription: organization.subscription
          ? {
              plan: organization.subscription.plan,
              status: organization.subscription.status,
              startDate: organization.subscription.startDate,
              endDate: organization.subscription.endDate,
              maxDevices: organization.subscription.maxDevices,
              maxUsers: organization.subscription.maxUsers,
              maxLocations: organization.subscription.maxLocations,
              licenseKey: organization.subscription.licenseKey,
            }
          : null,
        locations,
        users,
        products,
        categories,
        orders,
        customers,
        suppliers,
        inventory,
        creditSales,
        quotations,
        localPurchaseOrders,
        expenses,
        creditSalePayments,
        stockTransfers,
        statistics: {
          totalLocations: locations.length,
          totalUsers: users.length,
          totalProducts: products.length,
          totalCategories: categories.length,
          totalOrders: orders.length,
          totalCustomers: customers.length,
          totalSuppliers: suppliers.length,
          totalInventoryRecords: inventory.length,
          totalCreditSales: creditSales.length,
          totalQuotations: quotations.length,
          totalLPOs: localPurchaseOrders.length,
          totalExpenses: expenses.length,
        },
      };

      return {
        success: true,
        message: 'Organization data exported successfully',
        data: exportData,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to export organization data: ${error.message}`,
      );
    }
  }
}
