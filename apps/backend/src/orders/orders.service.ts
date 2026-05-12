import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DocumentCounterService } from '../settings/document-counter.service';
import { OrderDto } from './orders.dto';
import { RefundDto } from './refund.dto';
import * as ThermalPrinter from 'node-thermal-printer';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { ProductService } from 'src/products/products.service';
import { PrintingJobsService } from 'src/printing-jobs/printing-jobs.service';
import { PrintingJobType } from 'src/printing-jobs/dto/create-printing-job.dto';
import { BatchTrackingService } from 'src/inventory/services/batch-tracking.service';
import { CommissionService } from 'src/commission/commission.service';

@Injectable()
export class OrdersService {
  // In-memory cache for organization validation (use Redis in production)
  private organizationCache = new Map<
    number,
    { id: number; valid: boolean; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly counterService: DocumentCounterService,
    private readonly productService: ProductService,
    private readonly printingJobsService: PrintingJobsService,
    private readonly batchTrackingService: BatchTrackingService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Invalidate product cache after stock changes
   */
  private async invalidateProductCache(organizationId: number) {
    try {
      await this.productService.invalidateCache(organizationId);
    } catch (error) {
      console.warn('Failed to invalidate product cache:', error);
    }
  }

  /**
   * Deduct inventory using batch tracking with FIFO allocation
   * Falls back to simple quantity deduction if batch tracking fails
   */
  private async deductInventoryWithBatchTracking(
    tx: any,
    organizationId: number,
    items: any[],
    orderId: number,
    userId: number,
    userName: string,
  ) {
    if (!items || items.length === 0) return;

    for (const item of items) {
      const productId = item.id || item.productId;
      const quantity = item.selectedItems || item.quantity || item.qty || 0;

      if (!productId || quantity <= 0) continue;

      // Check if product exists and is not a service
      const product = await tx.product.findFirst({
        where: {
          id: productId,
          organizationId,
          OR: [{ isService: false }, { isService: null }],
        },
        select: {
          id: true,
          name: true,
          isService: true,
        },
      });

      if (!product) {
        console.warn(
          `Product ${productId} not found or is a service, skipping batch allocation`,
        );
        continue;
      }

      try {
        // Use FIFO batch allocation
        await this.batchTrackingService.deductInventoryFIFO(
          organizationId,
          productId,
          quantity,
          userId,
          userName || 'System',
          'ORDER',
          orderId,
        );

        console.log(
          `Successfully allocated ${quantity} units of product ${productId} from batches using FIFO`,
        );
      } catch (error) {
        console.warn(
          `Batch allocation failed for product ${productId}: ${error.message}. Using fallback.`,
        );

        // Get product current quantity before deduction
        const currentProduct = await tx.product.findUnique({
          where: { id: productId },
          select: { quantity: true, buyingPrice: true },
        });

        const quantityBefore = currentProduct?.quantity || 0;
        const unitCost = currentProduct?.buyingPrice || 0;

        // Fallback: Direct quantity deduction if no batches exist
        await tx.product.update({
          where: { id: productId },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        // Create inventory movement record for audit trail
        await tx.inventoryMovement.create({
          data: {
            organizationId,
            productId,
            batchId: null, // No batch tracking
            movementType: 'SALE',
            quantityBefore,
            quantityChange: -quantity,
            quantityAfter: quantityBefore - quantity,
            referenceType: 'ORDER',
            referenceId: orderId,
            unitCost,
            totalValue: unitCost * quantity,
            performedBy: userId,
            performedByName: userName || 'System',
            reason: 'Sale without batch tracking (fallback)',
            notes: `Order #${orderId}`,
          },
        });

        console.log(
          `Fallback: Deducted ${quantity} units directly from product ${productId} and recorded movement`,
        );
      }
    }
  }

  /**
   * For tracked products (IMEI/REGISTRATION/SERIAL), reserve concrete units and mark them SOLD.
   * If selectedUnitIds are provided from the client, they are validated and used.
   */
  private async allocateTrackedUnitsForOrder(
    tx: any,
    organizationId: number,
    orderId: number,
    items: any[],
  ) {
    if (!items || items.length === 0) return;

    const productIds = items
      .map((item) => item.id || item.productId)
      .filter((id) => id !== undefined && id !== null);

    if (productIds.length === 0) return;

    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        organizationId,
      },
      select: {
        id: true,
        name: true,
        trackingMode: true,
      },
    });

    const trackedProducts = new Map<number, any>(
      products
        .filter((p) => p.trackingMode && p.trackingMode !== 'NONE')
        .map((p) => [p.id, p]),
    );

    if (trackedProducts.size === 0) return;

    for (const item of items) {
      const productId = item.id || item.productId;
      const qty = item.selectedItems || item.quantity || item.qty || 0;

      if (!productId || qty <= 0 || !trackedProducts.has(productId)) {
        continue;
      }

      const product = trackedProducts.get(productId) as any;
      const productName = product?.name || `Product ${productId}`;
      const selectedUnitIds = Array.isArray(item.selectedUnitIds)
        ? item.selectedUnitIds
            .map((value: any) => +value)
            .filter((value: number) => !isNaN(value))
        : [];

      if (selectedUnitIds.length > 0 && selectedUnitIds.length !== qty) {
        throw new BadRequestException(
          `${productName}: selected units (${selectedUnitIds.length}) must match quantity (${qty})`,
        );
      }

      const units = selectedUnitIds.length
        ? await tx.productUnit.findMany({
            where: {
              organizationId,
              productId,
              id: { in: selectedUnitIds },
              status: 'IN_STOCK',
            },
            orderBy: { createdAt: 'asc' },
          })
        : await tx.productUnit.findMany({
            where: {
              organizationId,
              productId,
              status: 'IN_STOCK',
            },
            orderBy: { createdAt: 'asc' },
            take: qty,
          });

      if (units.length < qty) {
        throw new BadRequestException(
          `${productName}: insufficient tracked units in stock. Required ${qty}, available ${units.length}`,
        );
      }

      const chosenUnits = units.slice(0, qty);
      const chosenUnitIds = chosenUnits.map((u) => u.id);

      await tx.productUnit.updateMany({
        where: {
          id: { in: chosenUnitIds },
          organizationId,
          productId,
        },
        data: {
          status: 'SOLD',
          soldAt: new Date(),
          orderId,
        },
      });

      await tx.orderSoldUnit.createMany({
        data: chosenUnitIds.map((productUnitId) => ({
          organizationId,
          orderId,
          productId,
          productUnitId,
        })),
      });
    }
  }

  private async restoreTrackedUnitsForOrder(
    tx: any,
    organizationId: number,
    orderId: number,
  ) {
    const soldUnitLinks = await tx.orderSoldUnit.findMany({
      where: {
        organizationId,
        orderId,
      },
      select: {
        productUnitId: true,
      },
    });

    if (soldUnitLinks.length === 0) return;

    const unitIds = soldUnitLinks.map((link) => link.productUnitId);

    await tx.productUnit.updateMany({
      where: {
        id: { in: unitIds },
        organizationId,
      },
      data: {
        status: 'IN_STOCK',
        soldAt: null,
        orderId: null,
      },
    });

    await tx.orderSoldUnit.deleteMany({
      where: {
        organizationId,
        orderId,
      },
    });
  }

  private async restoreTrackedUnitsForRefundItems(
    tx: any,
    organizationId: number,
    orderId: number,
    refundItems: Array<{ id: number; quantity: number }>,
  ) {
    for (const refundItem of refundItems) {
      const links = await tx.orderSoldUnit.findMany({
        where: {
          organizationId,
          orderId,
          productId: refundItem.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: refundItem.quantity,
      });

      if (links.length === 0) continue;

      const productUnitIds = links.map((link) => link.productUnitId);

      await tx.productUnit.updateMany({
        where: {
          id: { in: productUnitIds },
          organizationId,
        },
        data: {
          status: 'IN_STOCK',
          soldAt: null,
          orderId: null,
        },
      });

      await tx.orderSoldUnit.deleteMany({
        where: {
          id: {
            in: links.map((link) => link.id),
          },
        },
      });
    }
  }

  async createOrder(organizationId: number, dto: OrderDto, userId: number) {
    const startTime = Date.now();

    try {
      // Pre-validate data before transaction
      this.validateOrderData(dto);

      // Generate receipt number before transaction
      const receiptNumber = await this.counterService.generateDocumentNumber(
        organizationId,
        'SALE',
        'SALE',
        {
          includeYear: true,
          includeMonth: false,
          separator: '-',
          sequenceLength: 5,
        },
      );

      // Use optimized transaction with better isolation level
      const order = await this.prisma.$transaction(
        async (tx) => {
          // Create the order
          const createdOrder = await tx.order.create({
            data: {
              organization: { connect: { id: organizationId } },
              receiptNumber,
              items: dto.items as any,
              total: dto.total,
              cashPaid: dto.cashPaid || 0,
              mpesaPaid: dto.mpesaPaid || 0,
              bankPaid: dto.bankPaid || 0,
              totalAmountPaid: dto.totalAmountPaid,
              taxAmount: dto.taxAmount || 0,
              discountAmount: dto.discountAmount || 0,
              customerId: dto.customerId ?? 0,
              printerIp: dto.printerIp,
              isVoided: dto.isVoided || false,
              voidedBy: dto.voidedBy,
              mpesaTransactionId: dto.mpesaTransactionId,
              user: { connect: { id: userId } },
              created_by: dto.created_by,
              customer_name: dto.customer_name,
              ...(dto.salesPersonId || userId
                ? {
                    salesPerson: {
                      connect: { id: dto.salesPersonId || userId },
                    },
                  }
                : {}),
            } as any,
          });

          // Create payment records if payments array is provided
          if (dto.payments && dto.payments.length > 0) {
            const paymentPromises = dto.payments.map((payment) =>
              tx.orderPayment.create({
                data: {
                  orderId: createdOrder.id,
                  organizationId,
                  paymentMethodId: payment.paymentMethodId,
                  paymentMethodCode: payment.paymentMethodCode,
                  paymentMethodName: payment.paymentMethodName,
                  amount: payment.amount,
                  transactionCode: payment.transactionCode,
                  notes: payment.notes,
                  recordedBy: payment.recordedBy,
                  paymentDate: payment.paymentDate || new Date(),
                },
              }),
            );

            await Promise.all(paymentPromises);

            await this.allocateTrackedUnitsForOrder(
              tx,
              organizationId,
              createdOrder.id,
              dto.items,
            );

            // Deduct inventory with batch tracking
            await this.deductInventoryWithBatchTracking(
              tx,
              organizationId,
              dto.items,
              createdOrder.id,
              userId,
              dto.created_by,
            );
          } else {
            await this.allocateTrackedUnitsForOrder(
              tx,
              organizationId,
              createdOrder.id,
              dto.items,
            );

            // Deduct inventory with batch tracking
            await this.deductInventoryWithBatchTracking(
              tx,
              organizationId,
              dto.items,
              createdOrder.id,
              userId,
              dto.created_by,
            );
          }

          return createdOrder;
        },
        {
          timeout: 10000, // 10 second timeout
          isolationLevel: 'ReadCommitted', // Faster than default Serializable
        },
      );

      // Invalidate product cache immediately after transaction commits
      await this.invalidateProductCache(organizationId);

      // Check for low stock and send notifications for affected products
      const productIds = dto.items
        .map((item: any) => item.id || item.productId)
        .filter((id) => id !== undefined && id !== null);

      if (productIds.length > 0) {
        await this.productService.batchCheckAndNotifyLowStock(
          organizationId,
          productIds,
        );
      }

      // Create commission records (async, don't block order creation)
      // Use salesPersonId if provided, otherwise use userId (creator)
      const commissionUserId = dto.salesPersonId || userId;
      console.log(`📋 [ORDER SERVICE] Commission setup:`, {
        orderId: order.id,
        createdBy: userId,
        salesPersonId: dto.salesPersonId,
        commissionUserId,
        itemsCount: dto.items?.length,
        hasOverrides:
          dto.commissionOverrides && dto.commissionOverrides.length > 0,
        overridesCount: dto.commissionOverrides?.length || 0,
      });
      this.createCommissionRecords(
        organizationId,
        order.id,
        commissionUserId,
        dto.items,
        dto.commissionOverrides,
      );

      // Schedule async operations after transaction commits (fire and forget)
      this.scheduleAsyncOperations(organizationId, order);

      console.log(`Order ${order.id} created in ${Date.now() - startTime}ms`);
      return order;
    } catch (error) {
      console.error(
        `Order creation failed in ${Date.now() - startTime}ms:`,
        error,
      );
      throw error;
    }
  }

  private validateOrderData(dto: OrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    if (dto.total <= 0) {
      throw new BadRequestException('Order total must be greater than 0');
    }

    // Validate item quantities
    for (const item of dto.items) {
      if (!item.selectedItems || item.selectedItems <= 0) {
        throw new BadRequestException(
          `Invalid quantity for item ${item.id} - selectedItems: ${item.selectedItems}`,
        );
      }
    }
  }

  /**
   * Create commission records for an order (fire and forget)
   */
  private async createCommissionRecords(
    organizationId: number,
    orderId: number,
    userId: number,
    items: any[],
    commissionOverrides?: Array<{
      productId: number;
      enabled: boolean;
      commissionType?: string;
      commissionRate?: number;
      commissionAmount?: number;
    }>,
  ) {
    try {
      console.log(`🚀 [ORDER SERVICE] Calling createOrderCommissions:`, {
        organizationId,
        orderId,
        userId,
        itemsCount: items?.length,
        overridesCount: commissionOverrides?.length || 0,
      });

      const commissions = await this.commissionService.createOrderCommissions(
        organizationId,
        orderId,
        userId,
        items,
        commissionOverrides,
      );

      console.log(
        `✅ [ORDER SERVICE] Commission records created for order ${orderId}:`,
        {
          recordsCreated: commissions?.length || 0,
          totalAmount:
            commissions?.reduce(
              (sum, c) => sum + (c.commissionAmount || 0),
              0,
            ) || 0,
        },
      );
    } catch (error) {
      console.error(
        `❌ [ORDER SERVICE] Failed to create commission records for order ${orderId}:`,
        error,
      );
      // Don't throw - this is a background operation
    }
  }

  private async bulkUpdateProductQuantities(
    tx: any,
    organizationId: number,
    items: any[],
  ) {
    if (!items || items.length === 0) return;

    // Extract product IDs
    const productIds = items
      .map((item) => item.id || item.productId)
      .filter(Boolean);

    if (productIds.length === 0) return;

    // Get non-service products in a single query
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        organizationId,
        OR: [{ isService: false }, { isService: null }],
      },
      select: { id: true },
    });

    const validProductIds = new Set(products.map((p) => p.id));
    const quantityUpdates = items
      .filter((item) => validProductIds.has(item.id || item.productId))
      .map((item) => ({
        id: item.id || item.productId,
        quantity: item.selectedItems || item.quantity || item.qty || 0,
      }));

    if (quantityUpdates.length === 0) return;

    // Use raw SQL for bulk update - much faster than individual Prisma operations
    try {
      const updatePromises = quantityUpdates.map((update) => {
        if (update.quantity <= 0) {
          return Promise.resolve();
        }

        return tx.product.updateMany({
          where: {
            id: update.id,
            organizationId,
            OR: [{ isService: false }, { isService: null }],
          },
          data: {
            quantity: { decrement: update.quantity },
          },
        });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating product quantities:', error);
      throw new BadRequestException('Failed to update product quantities');
    }
  }

  private scheduleAsyncOperations(organizationId: number, order: any) {
    // Fire and forget - don't await these operations
    Promise.allSettled([
      this.createPrintingJob(organizationId, order),
      this.printDataAsync(organizationId, order.id.toString(), order),
    ]).catch((error) => {
      console.error('Error in async operations:', error);
    });
  }

  private async createPrintingJob(organizationId: number, order: any) {
    try {
      await this.printingJobsService.createPrintingJob(organizationId, {
        type: PrintingJobType.ORDER,
        referenceId: order.id,
        printerIp: order.printerIp || '192.168.1.100',
      });
    } catch (error) {
      console.error('Failed to create printing job:', error);
    }
  }

  async getAllOrders(organizationId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          organizationId,
          isVoided: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          total: true,
          createdAt: true,
          customer_name: true,
          cashPaid: true,
          mpesaPaid: true,
          bankPaid: true,
          items: true,
          salesPersonId: true,
          salesPerson: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentMethodCode: true,
              paymentMethodName: true,
              transactionCode: true,
              paymentDate: true,
            },
          },
        },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          isVoided: false,
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getVoidedOrders(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);

    return this.prisma.order.findMany({
      where: {
        organizationId,
        isVoided: true,
        createdAt: {
          gte: new Date(startDate),
          lt: endDateTime,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(organizationId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethodCode: true,
            paymentMethodName: true,
            transactionCode: true,
            paymentDate: true,
            recordedBy: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID ${id} not found in this organization`,
      );
    }

    return order;
  }

  async getReportForDay(organizationId: number, date: string) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        isVoided: false,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethodCode: true,
            paymentMethodName: true,
            transactionCode: true,
            paymentDate: true,
          },
        },
      },
    });

    return this.calculateReportData(orders);
  }

  async getReportForMonth(organizationId: number, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        isVoided: false,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethodCode: true,
            paymentMethodName: true,
            transactionCode: true,
            paymentDate: true,
          },
        },
      },
    });

    return this.calculateReportData(orders);
  }

  async getReportForDateRange(
    organizationId: number,
    startDate: string,
    endDate: string,
    search?: string,
  ) {
    const whereClause: any = {
      organizationId,
      isVoided: false,
    };

    // Only add date filters if NOT searching
    // When searching, we want to search all orders regardless of date
    if (!search) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);

      whereClause.createdAt = {
        gte: new Date(startDate),
        lt: endDateTime,
      };
    }

    // Add search if provided
    if (search) {
      const searchConditions: any[] = [
        {
          receiptNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          customer_name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      // If search term is a number, also search by order ID
      const searchNumber = parseInt(search, 10);
      if (!isNaN(searchNumber)) {
        searchConditions.push({
          id: searchNumber,
        });
      }

      whereClause.OR = searchConditions;
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethodCode: true,
            paymentMethodName: true,
            transactionCode: true,
            paymentDate: true,
          },
        },
      },
    });

    return this.calculateReportData(orders);
  }

  async refundOrder(organizationId: number, dto: RefundDto) {
    return this.prisma
      .$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: dto.orderId,
            organizationId,
          },
        });

        if (!order) {
          throw new NotFoundException(
            `Order with ID ${dto.orderId} not found in this organization`,
          );
        }

        let orderItems;
        try {
          orderItems =
            typeof order.items === 'string'
              ? JSON.parse(order.items)
              : order.items;
        } catch (error) {
          throw new BadRequestException('Invalid order items format');
        }

        // Process refund items and update quantities in parallel
        const updatePromises = [];

        for (const refundItem of dto.refundItems) {
          const originalItem = orderItems.find(
            (item) => item.id === refundItem.id,
          );

          if (!originalItem) {
            throw new BadRequestException(
              `Item with ID ${refundItem.id} not found in the original order`,
            );
          }

          if (refundItem.quantity > originalItem.quantity) {
            throw new BadRequestException(
              `Cannot refund more items than originally ordered for product ${refundItem.id}`,
            );
          }

          originalItem.quantity -= refundItem.quantity;

          // Add product quantity update to promises
          updatePromises.push(
            tx.product.updateMany({
              where: {
                id: refundItem.id,
                organizationId,
              },
              data: {
                quantity: { increment: refundItem.quantity },
              },
            }),
          );
        }

        // Execute all product updates in parallel
        await Promise.all(updatePromises);

        await this.restoreTrackedUnitsForRefundItems(
          tx,
          organizationId,
          dto.orderId,
          dto.refundItems,
        );

        const updateData: any = {
          total: { decrement: dto.totalRefund },
          updatedAt: new Date(),
          items: JSON.stringify(orderItems),
        };

        switch (dto.refundPaymentMethod) {
          case 'Cash':
            updateData.cashPaid = { decrement: dto.totalRefund };
            break;
          case 'Mpesa':
            updateData.mpesaPaid = { decrement: dto.totalRefund };
            break;
          case 'Bank':
            updateData.bankPaid = { decrement: dto.totalRefund };
            break;
        }

        const [updatedOrder, refund] = await Promise.all([
          tx.order.update({
            where: { id: dto.orderId },
            data: updateData,
          }),
          tx.refund.create({
            data: {
              orderId: dto.orderId,
              refundItems: JSON.stringify(dto.refundItems),
              totalRefund: dto.totalRefund,
              refundPaymentMethod: dto.refundPaymentMethod,
              refundedBy: dto.refundedBy,
            },
          }),
        ]);

        return { updatedOrder, refund };
      })
      .then(async (result) => {
        // Invalidate cache after refund (products were returned to stock)
        await this.invalidateProductCache(organizationId);
        return result;
      });
  }

  async updateOrder(organizationId: number, id: number, dto: OrderDto) {
    return this.prisma
      .$transaction(async (tx) => {
        // Get the existing order
        const existingOrder = await tx.order.findFirst({
          where: {
            id,
            organizationId,
          },
        });

        if (!existingOrder) {
          throw new NotFoundException(
            `Order with ID ${id} not found in this organization`,
          );
        }

        // Parse existing and new order items
        const existingItems =
          typeof existingOrder.items === 'string'
            ? JSON.parse(existingOrder.items)
            : existingOrder.items;

        // Restore quantities for existing items and reduce for new items in parallel
        await Promise.all([
          this.restoreProductQuantitiesBulk(tx, organizationId, existingItems),
          this.bulkUpdateProductQuantities(tx, organizationId, dto.items),
        ]);

        await this.restoreTrackedUnitsForOrder(tx, organizationId, id);
        await this.allocateTrackedUnitsForOrder(
          tx,
          organizationId,
          id,
          dto.items,
        );

        // Update the order
        return tx.order.update({
          where: { id },
          data: {
            items: dto.items as any,
            total: dto.total,
            cashPaid: dto.cashPaid || 0,
            mpesaPaid: dto.mpesaPaid || 0,
            bankPaid: dto.bankPaid || 0,
            totalAmountPaid: dto.totalAmountPaid,
            taxAmount: dto.taxAmount || 0,
            discountAmount: dto.discountAmount || 0,
            customerId: dto.customerId,
            printerIp: dto.printerIp,
            mpesaTransactionId: dto.mpesaTransactionId,
            customer_name: dto.customer_name,
            updatedAt: new Date(),
          } as any,
        });
      })
      .then(async (result) => {
        // Invalidate cache after updating order (quantities changed)
        await this.invalidateProductCache(organizationId);
        return result;
      });
  }

  private async restoreProductQuantitiesBulk(
    tx: any,
    organizationId: number,
    items: any[],
  ) {
    if (!items || items.length === 0) return;

    const productIds = items
      .map((item) => item.id || item.productId)
      .filter(Boolean);

    if (productIds.length === 0) return;

    // Get non-service products
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        organizationId,
        OR: [{ isService: false }, { isService: null }],
      },
      select: { id: true },
    });

    const validProductIds = new Set(products.map((p) => p.id));
    const restorePromises = items
      .filter((item) => validProductIds.has(item.id || item.productId))
      .map((item) =>
        tx.product.updateMany({
          where: {
            id: item.id || item.productId,
            organizationId,
          },
          data: {
            quantity: { increment: item.selectedItems },
          },
        }),
      );

    await Promise.all(restorePromises);
  }

  async softDeleteOrder(organizationId: number, id: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID ${id} not found in this organization`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        isVoided: true,
        voidedBy: userId,
        updatedAt: new Date(),
      },
    });
  }

  async deleteOrder(organizationId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with ID ${id} not found in this organization`,
      );
    }

    return this.prisma.order.delete({
      where: { id },
    });
  }

  private calculateReportData(orders: any[]) {
    // Calculate payment totals from payments array
    let totalCashPaid = 0;
    let totalMpesaPaid = 0;
    let totalBankPaid = 0;
    let totalCreditPaid = 0;

    orders.forEach((order) => {
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment) => {
          const amount = payment.amount || 0;
          const code = payment.paymentMethodCode?.toUpperCase();

          if (code === 'CASH') {
            totalCashPaid += amount;
          } else if (code === 'MPESA') {
            totalMpesaPaid += amount;
          } else if (code === 'BANK' || code === 'BANK_TRANSFER') {
            totalBankPaid += amount;
          } else if (code === 'CREDIT') {
            totalCreditPaid += amount;
          }
        });
      } else {
        // Fallback to old fields if no payments array
        totalCashPaid += order.cashPaid || 0;
        totalMpesaPaid += order.mpesaPaid || 0;
        totalBankPaid += order.bankPaid || 0;
      }
    });

    return {
      orders,
      totalSales: orders.length,
      totalEarnings: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      totalCashPaid,
      totalMpesaPaid,
      totalBankPaid,
      totalCreditPaid,
    };
  }

  private async printDataAsync(
    organizationId: number,
    orderId: string,
    orderData: any,
  ) {
    try {
      // Pre-process logo asynchronously if needed
      const logoPath = path.join(process.cwd(), `logos/${organizationId}.png`);
      const resizedLogoPath = path.join(
        process.cwd(),
        `logos/resized_${organizationId}.png`,
      );

      // Only resize if the resized logo doesn't exist already
      if (fs.existsSync(logoPath) && !fs.existsSync(resizedLogoPath)) {
        await sharp(logoPath).resize({ width: 100 }).toFile(resizedLogoPath);
      }

      // Fetch organization info with timeout
      const organization = (await Promise.race([
        this.prisma.organization.findUnique({
          where: { id: organizationId },
          include: {
            locations: true,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Organization fetch timeout')),
            5000,
          ),
        ),
      ])) as any;

      if (!organization) {
        throw new Error('Organization details not found');
      }

      // Setup printer with timeout
      const printer = new ThermalPrinter.printer({
        type: ThermalPrinter.types.EPSON,
        interface: `tcp://${orderData.printerIp || '192.168.1.100'}:9100`,
      });

      // Check connection with timeout
      const isPrinterConnected = await Promise.race([
        printer.isPrinterConnected(),
        new Promise((resolve) => setTimeout(() => resolve(false), 3000)),
      ]);

      if (!isPrinterConnected) {
        console.warn('Printer connection failed or timed out');
        return false;
      }

      // Get location details
      const location = organization.locations?.find(
        (loc) => loc.id === orderData.locationId,
      );

      // Store information
      const storeName = organization.name || 'Store';
      const storeAddress = organization.address || '';
      const storeBranch = location?.name || '';
      const storeContact = organization.contact || '';
      const mpesaDetails = organization.mpesaDetails
        ? JSON.parse(organization.mpesaDetails as string)
        : {};

      // Print header
      printer.alignCenter();
      printer.setTextSize(1, 1);
      printer.bold(true);
      printer.println(storeName);
      printer.bold(false);
      printer.setTextNormal();

      if (storeAddress) {
        printer.println(storeAddress);
      }
      if (storeContact) {
        printer.println(storeContact);
      }

      printer.drawLine();

      // Order information
      printer.bold(true);
      printer.println(`Receipt #${orderId}`);
      printer.println(
        `Date: ${new Date(orderData.createdAt).toLocaleDateString()}`,
      );
      printer.println(
        `Time: ${new Date(orderData.createdAt).toLocaleTimeString()}`,
      );
      if (storeBranch) {
        printer.println(`Branch: ${storeBranch}`);
      }
      printer.bold(false);
      printer.drawLine();

      // Print items
      const items =
        typeof orderData.items === 'string'
          ? JSON.parse(orderData.items)
          : orderData.items;

      items.forEach((item: any) => {
        printer.leftRight(
          `${item.selectedItems} x ${item.name}`,
          `${this.formatCurrency((item.price || 0) * (item.selectedItems || 0))}`,
        );
      });

      printer.drawLine();

      // Print payment details
      if (orderData.cashPaid > 0) {
        printer.leftRight('Cash:', this.formatCurrency(orderData.cashPaid));
      }
      if (orderData.mpesaPaid > 0) {
        printer.leftRight('M-Pesa:', this.formatCurrency(orderData.mpesaPaid));
        if (mpesaDetails.tillNumber) {
          printer.println(`Till Number: ${mpesaDetails.tillNumber}`);
        }
      }
      if (orderData.bankPaid > 0) {
        printer.leftRight(
          'Bank Transfer:',
          this.formatCurrency(orderData.bankPaid),
        );
      }

      printer.drawLine();

      // Print totals
      const subtotal = (orderData.total || 0) / 1.16; // Assuming 16% VAT
      const tax = (orderData.total || 0) - subtotal;

      printer.leftRight('Subtotal:', this.formatCurrency(subtotal));
      printer.leftRight('VAT (16%):', this.formatCurrency(tax));

      if (orderData.discountAmount > 0) {
        printer.leftRight(
          'Discount:',
          this.formatCurrency(orderData.discountAmount),
        );
      }

      printer.bold(true);
      printer.leftRight('Total:', this.formatCurrency(orderData.total || 0));
      printer.bold(false);

      // Print footer
      printer.drawLine();
      if (orderData.user?.fullName) {
        printer.println(`Served By: ${orderData.user.fullName}`);
      }
      printer.println('Thank you for your business!');
      printer.println('');

      // Print complementary message if exists
      if (organization.complementaryMessage) {
        printer.println(organization.complementaryMessage);
        printer.println('');
      }

      // Print tax info
      printer.drawLine();
      printer.println('TAX INVOICE');
      printer.println(new Date().toLocaleString());
      printer.println('');

      // Cut the paper
      printer.cut();

      await printer.execute();
      return true;
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  }

  private formatCurrency(amount: number): string {
    return `Ksh ${(amount || 0).toFixed(2)}`;
  }
}
