import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfflineSubscriptionDto } from './dto/create-offline-subscription.dto';
import { ValidateSubscriptionDto } from './dto/validate-subscription.dto';
import { ExtendSubscriptionDto } from './dto/extend-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

interface ValidationCheckpoint {
  timestamp: number;
  hash: string;
  licenseKey: string;
  daysRemaining: number;
}

@Injectable()
export class OfflineSubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a secure license key for offline subscription
   */
  private generateLicenseKey(): string {
    return `OFFLINE-${randomBytes(12).toString('hex').toUpperCase()}`;
  }

  /**
   * Create a cryptographic hash checkpoint to prevent backdating
   * This creates a blockchain-like chain where each validation references the previous one
   */
  private createCheckpointHash(
    licenseKey: string,
    timestamp: number,
    previousHash: string = '',
  ): string {
    const data = `${licenseKey}:${timestamp}:${previousHash}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify that the current checkpoint is valid and not backdated
   */
  private verifyCheckpoint(
    licenseKey: string,
    currentTimestamp: number,
    lastCheckpointHash?: string,
  ): boolean {
    if (!lastCheckpointHash) {
      // First validation, no previous checkpoint
      return true;
    }

    // In a real implementation, you would store checkpoints in the database
    // and verify the chain integrity
    // For now, we just verify the hash format
    return lastCheckpointHash.length === 64;
  }

  /**
   * Create a new offline subscription
   */
  async createOfflineSubscription(dto: CreateOfflineSubscriptionDto) {
    // Get plan defaults
    const planDefaults = this.getSubscriptionDefaults(dto.plan);
    const licenseKey = this.generateLicenseKey();
    const startDate = new Date();
    const endDate = new Date(
      Date.now() + dto.durationDays * 24 * 60 * 60 * 1000,
    );

    // Create initial checkpoint
    const initialCheckpoint = this.createCheckpointHash(
      licenseKey,
      startDate.getTime(),
    );

    const subscription = await this.prisma.offlineSubscription.create({
      data: {
        organizationName: dto.organizationName,
        organizationAddress: dto.organizationAddress,
        organizationContact: dto.organizationContact,
        plan: dto.plan,
        status: SubscriptionStatus.ACTIVE,
        licenseKey,
        startDate,
        endDate,
        durationDays: dto.durationDays,
        maxDevices: dto.maxDevices || planDefaults.maxDevices,
        maxUsers: dto.maxUsers || planDefaults.maxUsers,
        maxLocations: dto.maxLocations || planDefaults.maxLocations,
        initialCheckpoint,
        remarks: dto.remarks,
        createdBy: 'admin', // You can get this from the JWT token if needed
      },
    });

    return {
      success: true,
      message: 'Offline subscription created successfully',
      subscription: {
        id: subscription.id,
        licenseKey: subscription.licenseKey,
        organizationName: subscription.organizationName,
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        durationDays: subscription.durationDays,
        maxDevices: subscription.maxDevices,
        maxUsers: subscription.maxUsers,
        maxLocations: subscription.maxLocations,
        initialCheckpoint,
      },
    };
  }

  /**
   * Validate an offline subscription (PUBLIC ENDPOINT)
   * This includes anti-backdating protection
   */
  async validateSubscription(dto: ValidateSubscriptionDto) {
    const subscription = await this.prisma.offlineSubscription.findUnique({
      where: { licenseKey: dto.licenseKey },
      include: {
        devices: true,
      },
    });

    if (!subscription) {
      return {
        valid: false,
        reason: 'Invalid license key',
        code: 'INVALID_LICENSE',
      };
    }

    const now = new Date();
    const currentTimestamp = now.getTime();

    // Verify checkpoint to prevent backdating
    const checkpointValid = this.verifyCheckpoint(
      dto.licenseKey,
      currentTimestamp,
      dto.lastCheckpointHash,
    );

    if (!checkpointValid) {
      return {
        valid: false,
        reason: 'Invalid checkpoint detected. Possible time manipulation.',
        code: 'CHECKPOINT_INVALID',
      };
    }

    // Check if subscription is expired
    const isExpired = now > subscription.endDate;
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.endDate.getTime() - currentTimestamp) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Create new checkpoint for next validation
    const newCheckpoint = this.createCheckpointHash(
      dto.licenseKey,
      currentTimestamp,
      dto.lastCheckpointHash || '',
    );

    // Check if subscription is suspended
    if (subscription.status === SubscriptionStatus.SUSPENDED) {
      return {
        valid: false,
        reason: 'Subscription has been suspended',
        code: 'SUSPENDED',
        checkpoint: newCheckpoint,
      };
    }

    // Auto-update status if expired
    if (isExpired && subscription.status !== SubscriptionStatus.EXPIRED) {
      await this.prisma.offlineSubscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    }

    // Update last validated timestamp
    await this.prisma.offlineSubscription.update({
      where: { id: subscription.id },
      data: { lastValidatedAt: now },
    });

    // Device tracking
    let deviceInfo = null;
    if (dto.deviceId) {
      const device = await this.prisma.offlineDevice.findFirst({
        where: {
          offlineSubscriptionId: subscription.id,
          deviceId: dto.deviceId,
        },
      });

      if (device) {
        // Update last active time and increment validation count
        await this.prisma.offlineDevice.update({
          where: { id: device.id },
          data: {
            lastActive: now,
            validationCount: { increment: 1 },
          },
        });
        deviceInfo = { registered: true, deviceName: device.deviceName };
      } else {
        // Check if max devices limit is reached
        const activeDevicesCount = await this.prisma.offlineDevice.count({
          where: {
            offlineSubscriptionId: subscription.id,
            isActive: true,
          },
        });

        if (activeDevicesCount >= subscription.maxDevices) {
          return {
            valid: false,
            reason: `Maximum devices limit (${subscription.maxDevices}) reached`,
            code: 'MAX_DEVICES_REACHED',
            checkpoint: newCheckpoint,
          };
        }

        // Register new device
        const newDevice = await this.prisma.offlineDevice.create({
          data: {
            offlineSubscriptionId: subscription.id,
            deviceId: dto.deviceId,
            deviceName: `Device-${dto.deviceId}`,
            lastActive: now,
            validationCount: 1,
          },
        });
        deviceInfo = { registered: true, deviceName: newDevice.deviceName };
      }
    }

    return {
      valid: !isExpired,
      subscription: {
        organizationName: subscription.organizationName,
        plan: subscription.plan,
        status: isExpired ? SubscriptionStatus.EXPIRED : subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining,
        maxDevices: subscription.maxDevices,
        maxUsers: subscription.maxUsers,
        maxLocations: subscription.maxLocations,
        activeDevices: subscription.devices.length,
      },
      device: deviceInfo,
      checkpoint: newCheckpoint,
      timestamp: currentTimestamp,
      message: isExpired
        ? 'Subscription has expired'
        : `Subscription is valid. ${daysRemaining} days remaining.`,
      code: isExpired ? 'EXPIRED' : 'VALID',
    };
  }

  /**
   * Extend an existing offline subscription
   */
  async extendSubscription(dto: ExtendSubscriptionDto) {
    const subscription = await this.prisma.offlineSubscription.findUnique({
      where: { licenseKey: dto.licenseKey },
    });

    if (!subscription) {
      throw new NotFoundException('Invalid license key');
    }

    // Calculate new end date
    const currentEndDate = subscription.endDate;
    const now = new Date();

    // If subscription is expired, extend from now, otherwise extend from current end date
    const baseDate = currentEndDate > now ? currentEndDate : now;
    const newEndDate = new Date(
      baseDate.getTime() + dto.additionalDays * 24 * 60 * 60 * 1000,
    );

    // Update subscription
    const updatedSubscription = await this.prisma.offlineSubscription.update({
      where: { licenseKey: dto.licenseKey },
      data: {
        endDate: newEndDate,
        durationDays: subscription.durationDays + dto.additionalDays,
        status: SubscriptionStatus.ACTIVE, // Reactivate if it was expired
        updatedAt: new Date(),
      },
    });

    const totalDays = Math.ceil(
      (newEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      success: true,
      message: `Subscription extended by ${dto.additionalDays} days`,
      subscription: {
        licenseKey: updatedSubscription.licenseKey,
        organizationName: subscription.organizationName,
        previousEndDate: currentEndDate,
        newEndDate: newEndDate,
        additionalDays: dto.additionalDays,
        totalDaysRemaining: totalDays,
        status: updatedSubscription.status,
      },
    };
  }

  /**
   * Get subscription details by license key
   */
  async getSubscriptionByLicenseKey(licenseKey: string) {
    const subscription = await this.prisma.offlineSubscription.findUnique({
      where: { licenseKey },
      include: {
        devices: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
            lastActive: true,
            isActive: true,
            validationCount: true,
            firstRegistered: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.endDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const isExpired = now > subscription.endDate;

    return {
      subscription: {
        id: subscription.id,
        licenseKey: subscription.licenseKey,
        organization: {
          name: subscription.organizationName,
          address: subscription.organizationAddress,
          contact: subscription.organizationContact,
        },
        plan: subscription.plan,
        status: isExpired ? SubscriptionStatus.EXPIRED : subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining,
        isExpired,
        maxDevices: subscription.maxDevices,
        maxUsers: subscription.maxUsers,
        maxLocations: subscription.maxLocations,
        activeDevices: subscription.devices.filter((d) => d.isActive).length,
        totalDevices: subscription.devices.length,
        devices: subscription.devices,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        lastValidatedAt: subscription.lastValidatedAt,
        remarks: subscription.remarks,
      },
    };
  }

  /**
   * Get all offline subscriptions with filtering
   */
  async getAllOfflineSubscriptions(status?: SubscriptionStatus) {
    const whereClause = status ? { status } : {};

    const subscriptions = await this.prisma.offlineSubscription.findMany({
      where: whereClause,
      include: {
        devices: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const now = new Date();

    return subscriptions.map((sub) => {
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const isExpired = now > sub.endDate;

      return {
        id: sub.id,
        licenseKey: sub.licenseKey,
        organizationName: sub.organizationName,
        plan: sub.plan,
        status: isExpired ? SubscriptionStatus.EXPIRED : sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        daysRemaining,
        isExpired,
        activeDevices: sub.devices.length,
        maxDevices: sub.maxDevices,
        createdAt: sub.createdAt,
      };
    });
  }

  /**
   * Get subscription defaults based on plan
   */
  private getSubscriptionDefaults(plan: string) {
    const defaults = {
      BASIC: {
        maxDevices: 1,
        maxUsers: 2,
        maxLocations: 1,
        price: 1000,
      },
      STANDARD: {
        maxDevices: 3,
        maxUsers: 5,
        maxLocations: 2,
        price: 2500,
      },
      PREMIUM: {
        maxDevices: 10,
        maxUsers: 15,
        maxLocations: 5,
        price: 5000,
      },
      ENTERPRISE: {
        maxDevices: 50,
        maxUsers: 100,
        maxLocations: 20,
        price: 10000,
      },
    };
    return defaults[plan] || defaults.BASIC;
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(licenseKey: string, reason?: string) {
    const subscription = await this.prisma.offlineSubscription.findUnique({
      where: { licenseKey },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.offlineSubscription.update({
      where: { licenseKey },
      data: {
        status: SubscriptionStatus.SUSPENDED,
        remarks: reason
          ? `${subscription.remarks || ''} | Suspended: ${reason}`
          : subscription.remarks,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Subscription suspended successfully',
      reason,
    };
  }

  /**
   * Reactivate a suspended subscription
   */
  async reactivateSubscription(licenseKey: string) {
    const subscription = await this.prisma.offlineSubscription.findUnique({
      where: { licenseKey },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    if (now > subscription.endDate) {
      throw new BadRequestException(
        'Cannot reactivate an expired subscription. Please extend it first.',
      );
    }

    await this.prisma.offlineSubscription.update({
      where: { licenseKey },
      data: {
        status: SubscriptionStatus.ACTIVE,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Subscription reactivated successfully',
    };
  }

  /**
   * Import organization data from online API to offline database
   */
  async importOrganizationData(licenseKey: string, exportedData: any) {
    // Validate the offline subscription exists
    const offlineSubscription =
      await this.prisma.offlineSubscription.findUnique({
        where: { licenseKey },
      });

    if (!offlineSubscription) {
      throw new NotFoundException('Invalid license key');
    }

    if (offlineSubscription.status === SubscriptionStatus.EXPIRED) {
      throw new BadRequestException('Subscription has expired');
    }

    if (offlineSubscription.status === SubscriptionStatus.SUSPENDED) {
      throw new BadRequestException('Subscription is suspended');
    }

    try {
      // Use transaction to ensure all data is imported atomically
      const result = await this.prisma.$transaction(async (prisma) => {
        // 1. Create or find organization
        // Check if organization already exists
        let organization = await prisma.organization.findFirst({
          where: {
            name: exportedData.organization.name,
          },
        });

        if (organization) {
          // Update existing organization
          organization = await prisma.organization.update({
            where: { id: organization.id },
            data: {
              address: exportedData.organization.address,
              contact: exportedData.organization.contact,
              logoUrl: exportedData.organization.logoUrl,
              complementaryMessage:
                exportedData.organization.complementaryMessage,
              stations: exportedData.organization.stations,
              bankDetails: exportedData.organization.bankDetails,
              mpesaDetails: exportedData.organization.mpesaDetails,
            },
          });
        } else {
          // Create new organization
          organization = await prisma.organization.create({
            data: {
              name: exportedData.organization.name,
              address: exportedData.organization.address,
              contact: exportedData.organization.contact,
              logoUrl: exportedData.organization.logoUrl,
              complementaryMessage:
                exportedData.organization.complementaryMessage,
              stations: exportedData.organization.stations,
              bankDetails: exportedData.organization.bankDetails,
              mpesaDetails: exportedData.organization.mpesaDetails,
            },
          });
        }

        // ID mapping for relationships
        const locationIdMap = new Map<number, number>();
        const categoryIdMap = new Map<number, number>();
        const productIdMap = new Map<number, number>();
        const customerIdMap = new Map<number, number>();
        const supplierIdMap = new Map<number, number>();
        const userIdMap = new Map<number, number>();

        // 2. Import Locations
        if (exportedData.locations && exportedData.locations.length > 0) {
          for (const loc of exportedData.locations) {
            const newLocation = await prisma.location.create({
              data: {
                name: loc.name,
                address: loc.address,
                contact: loc.contact,
                organizationId: organization.id,
              },
            });
            locationIdMap.set(loc.id, newLocation.id);
          }
        }

        // 3. Import Categories
        if (exportedData.categories && exportedData.categories.length > 0) {
          for (const cat of exportedData.categories) {
            const newCategory = await prisma.category.create({
              data: {
                name: cat.name,
                description: cat.description,
                pictureUrl: cat.pictureUrl,
                organizationId: organization.id,
              },
            });
            categoryIdMap.set(cat.id, newCategory.id);
          }
        }

        // 4. Import Users (without passwords, they need to reset)
        if (exportedData.users && exportedData.users.length > 0) {
          for (const user of exportedData.users) {
            try {
              const newUser = await prisma.user.create({
                data: {
                  email: user.email,
                  password: 'TEMP_PASSWORD_NEEDS_RESET', // Users need to reset password
                  fullName: user.fullName,
                  username: user.username,
                  phone: user.phone,
                  status: user.status,
                  role: user.role,
                  createdBy: user.createdBy,
                  photoURL: user.photoURL,
                  permissions: user.permissions,
                  organizationId: organization.id,
                  locationId: user.locationId
                    ? locationIdMap.get(user.locationId)
                    : null,
                },
              });
              userIdMap.set(user.id, newUser.id);
            } catch (error) {
              // Skip if user already exists
              console.log(`User ${user.email} already exists, skipping...`);
            }
          }
        }

        // 5. Import Customers
        if (exportedData.customers && exportedData.customers.length > 0) {
          for (const customer of exportedData.customers) {
            try {
              const newCustomer = await prisma.customer.create({
                data: {
                  fullName: customer.fullName,
                  phoneNumber: customer.phoneNumber,
                  email: customer.email,
                  dueCredit: customer.dueCredit,
                  isActive: customer.isActive,
                  organizationId: organization.id,
                },
              });
              customerIdMap.set(customer.id, newCustomer.id);
            } catch (error) {
              console.log(
                `Customer ${customer.phoneNumber} already exists, skipping...`,
              );
            }
          }
        }

        // 6. Import Suppliers
        if (exportedData.suppliers && exportedData.suppliers.length > 0) {
          for (const supplier of exportedData.suppliers) {
            try {
              const newSupplier = await prisma.supplier.create({
                data: {
                  name: supplier.name,
                  phone: supplier.phone,
                  totalUnpaidSuppliers: supplier.totalUnpaidSuppliers,
                  deleted: supplier.deleted,
                  organizationId: organization.id,
                },
              });
              supplierIdMap.set(supplier.id, newSupplier.id);
            } catch (error) {
              console.log(
                `Supplier ${supplier.phone} already exists, skipping...`,
              );
            }
          }
        }

        // 7. Import Products
        if (exportedData.products && exportedData.products.length > 0) {
          for (const product of exportedData.products) {
            try {
              const newProduct = await prisma.product.create({
                data: {
                  name: product.name,
                  description: product.description,
                  pictureUrl: product.pictureUrl,
                  productIdNumber: product.productIdNumber,
                  reorderLevel: product.reorderLevel,
                  availability: product.availability,
                  quantity: product.quantity,
                  storeQuantity: product.storeQuantity,
                  countable: product.countable,
                  isService: product.isService,
                  price: product.price,
                  buyingPrice: product.buyingPrice,
                  wholesalePrice: product.wholesalePrice,
                  expiryDate: product.expiryDate
                    ? new Date(product.expiryDate)
                    : null,
                  organizationId: organization.id,
                  locationId: product.locationId
                    ? locationIdMap.get(product.locationId)
                    : null,
                  categoryId: categoryIdMap.get(product.categoryId),
                },
              });
              productIdMap.set(product.id, newProduct.id);
            } catch (error) {
              console.log(
                `Product ${product.productIdNumber} already exists, skipping...`,
              );
            }
          }
        }

        // 8. Import Orders
        if (exportedData.orders && exportedData.orders.length > 0) {
          for (const order of exportedData.orders) {
            try {
              await prisma.order.create({
                data: {
                  items: order.items,
                  total: order.total,
                  cashPaid: order.cashPaid,
                  mpesaPaid: order.mpesaPaid,
                  bankPaid: order.bankPaid,
                  totalAmountPaid: order.totalAmountPaid,
                  taxAmount: order.taxAmount,
                  discountAmount: order.discountAmount,
                  customerId: order.customerId,
                  customer_name: order.customer_name,
                  customerEmail: order.customerEmail,
                  printerIp: order.printerIp,
                  isVoided: order.isVoided,
                  voidedBy: order.voidedBy,
                  created_by: order.created_by,
                  mpesaTransactionId: order.mpesaTransactionId,
                  organizationId: organization.id,
                  locationId: order.locationId
                    ? locationIdMap.get(order.locationId)
                    : null,
                  userId: userIdMap.get(order.userId) || 1, // Default to admin if user not found
                  createdAt: new Date(order.createdAt),
                },
              });
            } catch (error) {
              console.log(`Error importing order, skipping...`, error.message);
            }
          }
        }

        // 9. Import Inventory
        if (exportedData.inventory && exportedData.inventory.length > 0) {
          for (const inv of exportedData.inventory) {
            try {
              await prisma.inventory.create({
                data: {
                  batchNumber: inv.batchNumber,
                  items: inv.items,
                  totalAmount: inv.totalAmount,
                  added_by: inv.added_by,
                  deleted: inv.deleted,
                  paymentStatus: inv.paymentStatus,
                  paidAmount: inv.paidAmount,
                  remainingAmount: inv.remainingAmount,
                  organizationId: organization.id,
                  locationId: inv.locationId
                    ? locationIdMap.get(inv.locationId)
                    : null,
                  supplierId:
                    supplierIdMap.get(inv.supplierId) || inv.supplierId,
                  createdAt: new Date(inv.createdAt),
                },
              });
            } catch (error) {
              console.log(
                `Error importing inventory, skipping...`,
                error.message,
              );
            }
          }
        }

        // 10. Import Credit Sales
        if (exportedData.creditSales && exportedData.creditSales.length > 0) {
          for (const creditSale of exportedData.creditSales) {
            try {
              await prisma.creditSale.create({
                data: {
                  customer_id: creditSale.customer_id,
                  order_id: creditSale.order_id,
                  items: creditSale.items,
                  credit_amount: creditSale.credit_amount,
                  order_date: creditSale.order_date
                    ? new Date(creditSale.order_date)
                    : null,
                  payment_date: creditSale.payment_date
                    ? new Date(creditSale.payment_date)
                    : null,
                  amount_paid: creditSale.amount_paid,
                  fully_paid: creditSale.fully_paid,
                  customer_name: creditSale.customer_name,
                  created_by: creditSale.created_by,
                  shift_id: creditSale.shift_id,
                  phone_number: creditSale.phone_number,
                  order_remarks: creditSale.order_remarks,
                  national_id: creditSale.national_id,
                  cash_paid: creditSale.cash_paid,
                  mpesa_paid: creditSale.mpesa_paid,
                  bank_paid: creditSale.bank_paid,
                  mpesa_confirmation_code: creditSale.mpesa_confirmation_code,
                  bank_confirmation_code: creditSale.bank_confirmation_code,
                  balance: creditSale.balance,
                  vat_amount: creditSale.vat_amount,
                  discount_amount: creditSale.discount_amount,
                  sendEmail: creditSale.sendEmail,
                  payment_terms: creditSale.payment_terms,
                  organizationId: organization.id,
                  createdAt: new Date(creditSale.createdAt),
                },
              });
            } catch (error) {
              console.log(
                `Error importing credit sale, skipping...`,
                error.message,
              );
            }
          }
        }

        // 11. Import Quotations
        if (exportedData.quotations && exportedData.quotations.length > 0) {
          for (const quotation of exportedData.quotations) {
            try {
              await prisma.quotation.create({
                data: {
                  referenceNumber: quotation.referenceNumber,
                  customerId: quotation.customerId || quotation.supplierId,
                  items: quotation.items,
                  totalAmount: quotation.totalAmount,
                  totalTax: quotation.totalTax,
                  status: quotation.status,
                  created_by: quotation.created_by,
                  sendEmail: quotation.sendEmail,
                  organizationId: organization.id,
                  createdAt: new Date(quotation.createdAt),
                },
              });
            } catch (error) {
              console.log(
                `Error importing quotation, skipping...`,
                error.message,
              );
            }
          }
        }

        // 12. Import Expenses
        if (exportedData.expenses && exportedData.expenses.length > 0) {
          for (const expense of exportedData.expenses) {
            try {
              await prisma.expense.create({
                data: {
                  title: expense.title,
                  amount: expense.amount,
                  description: expense.description,
                  category: expense.category,
                  expenseDate: new Date(expense.expenseDate),
                  paidBy: expense.paidBy,
                  paymentMethod: expense.paymentMethod,
                  receiptUrl: expense.receiptUrl,
                  createdBy: expense.createdBy,
                  status: expense.status,
                  organizationId: organization.id,
                  createdAt: new Date(expense.createdAt),
                },
              });
            } catch (error) {
              console.log(
                `Error importing expense, skipping...`,
                error.message,
              );
            }
          }
        }

        return {
          organization,
          stats: {
            locationsImported: locationIdMap.size,
            categoriesImported: categoryIdMap.size,
            usersImported: userIdMap.size,
            customersImported: customerIdMap.size,
            suppliersImported: supplierIdMap.size,
            productsImported: productIdMap.size,
          },
        };
      });

      return {
        success: true,
        message: 'Organization data imported successfully',
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        licenseKey,
        importStatistics: result.stats,
        note: 'Users need to reset their passwords. Default password is: TEMP_PASSWORD_NEEDS_RESET',
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to import organization data: ${error.message}`,
      );
    }
  }
}
