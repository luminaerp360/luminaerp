import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovementDto, MovementQueryDto } from '../dto/movement.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryMovementService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a manual inventory movement record
   */
  async createMovement(
    organizationId: number,
    dto: CreateMovementDto,
    performedBy: number,
    performedByName: string,
  ) {
    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        organizationId,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    const currentQuantity = product.quantity || 0;
    const quantityAfter = currentQuantity + dto.quantityChange;

    // Validate that quantity won't go negative
    if (quantityAfter < 0) {
      throw new Error(
        `Insufficient stock. Current quantity: ${currentQuantity}, attempted change: ${dto.quantityChange}`,
      );
    }

    // Update product quantity and create movement in a transaction
    const [movement] = await this.prisma.$transaction([
      // Create movement record
      this.prisma.inventoryMovement.create({
        data: {
          organizationId,
          productId: dto.productId,
          batchId: dto.batchId,
          movementType: dto.movementType,
          quantityBefore: currentQuantity,
          quantityChange: dto.quantityChange,
          quantityAfter,
          fromLocation: dto.fromLocation,
          toLocation: dto.toLocation,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          unitCost: dto.unitCost,
          totalValue: dto.unitCost
            ? Math.abs(dto.quantityChange) * dto.unitCost
            : undefined,
          performedBy,
          performedByName,
          reason: dto.reason,
          notes: dto.notes,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              productIdNumber: true,
            },
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
            },
          },
        },
      }),
      // Update product quantity
      this.prisma.product.update({
        where: {
          id: dto.productId,
        },
        data: {
          quantity: quantityAfter,
        },
      }),
    ]);

    return movement;
  }

  /**
   * Get all inventory movements with filtering
   */
  async getAllMovements(organizationId: number, query?: MovementQueryDto) {
    const where: any = { organizationId };

    if (query?.productId) {
      where.productId = query.productId;
    }

    if (query?.batchId) {
      where.batchId = query.batchId;
    }

    if (query?.movementType) {
      where.movementType = query.movementType;
    }

    if (query?.startDate && query?.endDate) {
      where.timestamp = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    } else if (query?.startDate) {
      where.timestamp = {
        gte: new Date(query.startDate),
      };
    } else if (query?.endDate) {
      where.timestamp = {
        lte: new Date(query.endDate),
      };
    }

    if (query?.location) {
      where.OR = [
        {
          fromLocation: {
            contains: query.location,
            mode: 'insensitive',
          },
        },
        {
          toLocation: {
            contains: query.location,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (query?.referenceType) {
      where.referenceType = query.referenceType;
    }

    if (query?.referenceId) {
      where.referenceId = query.referenceId;
    }

    return this.prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Get movement by ID
   */
  async getMovementById(organizationId: number, movementId: number) {
    const movement = await this.prisma.inventoryMovement.findFirst({
      where: {
        id: movementId,
        organizationId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            lotNumber: true,
            expiryDate: true,
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException(`Movement with ID ${movementId} not found`);
    }

    return movement;
  }

  /**
   * Get movements for a specific product
   */
  async getProductMovements(
    organizationId: number,
    productId: number,
    limit: number = 50,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        productId,
      },
      include: {
        batch: {
          select: {
            batchNumber: true,
            expiryDate: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get movements for a specific batch
   */
  async getBatchMovements(organizationId: number, batchId: number) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        batchId,
      },
      include: {
        product: {
          select: {
            name: true,
            productIdNumber: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  /**
   * Get movement analytics
   */
  async getMovementAnalytics(
    organizationId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { organizationId };

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const movements = await this.prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const analytics = {
      totalMovements: movements.length,
      byType: {} as Record<MovementType, number>,
      totalValueIn: 0,
      totalValueOut: 0,
      totalQuantityIn: 0,
      totalQuantityOut: 0,
      topProducts: [] as Array<{
        productName: string;
        movements: number;
      }>,
      byLocation: {} as Record<string, number>,
    };

    // Count by movement type
    Object.values(MovementType).forEach((type) => {
      analytics.byType[type] = 0;
    });

    const productMovementCount: Record<string, number> = {};
    const locationCount: Record<string, number> = {};

    movements.forEach((movement) => {
      // Count by type
      analytics.byType[movement.movementType]++;

      // Calculate totals
      if (movement.quantityChange > 0) {
        analytics.totalQuantityIn += movement.quantityChange;
        if (movement.totalValue) {
          analytics.totalValueIn += movement.totalValue;
        }
      } else {
        analytics.totalQuantityOut += Math.abs(movement.quantityChange);
        if (movement.totalValue) {
          analytics.totalValueOut += movement.totalValue;
        }
      }

      // Count by product
      const productName = movement.product.name;
      productMovementCount[productName] =
        (productMovementCount[productName] || 0) + 1;

      // Count by location
      if (movement.fromLocation) {
        locationCount[movement.fromLocation] =
          (locationCount[movement.fromLocation] || 0) + 1;
      }
      if (movement.toLocation) {
        locationCount[movement.toLocation] =
          (locationCount[movement.toLocation] || 0) + 1;
      }
    });

    // Get top 10 products by movement count
    analytics.topProducts = Object.entries(productMovementCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([productName, movements]) => ({
        productName,
        movements,
      }));

    analytics.byLocation = locationCount;

    return analytics;
  }

  /**
   * Get daily movement summary
   */
  async getDailyMovementSummary(organizationId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    const summary = {
      date: date.toISOString().split('T')[0],
      totalMovements: movements.length,
      quantityIn: 0,
      quantityOut: 0,
      valueIn: 0,
      valueOut: 0,
      movements: movements.map((m) => ({
        id: m.id,
        product: m.product.name,
        type: m.movementType,
        quantity: m.quantityChange,
        value: m.totalValue,
        time: m.timestamp,
        performedBy: m.performedByName,
      })),
    };

    movements.forEach((movement) => {
      if (movement.quantityChange > 0) {
        summary.quantityIn += movement.quantityChange;
        if (movement.totalValue) summary.valueIn += movement.totalValue;
      } else {
        summary.quantityOut += Math.abs(movement.quantityChange);
        if (movement.totalValue) summary.valueOut += movement.totalValue;
      }
    });

    return summary;
  }

  /**
   * Get movement trends
   */
  async getMovementTrends(organizationId: number, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Group by date
    const dailyData: Record<
      string,
      {
        date: string;
        totalMovements: number;
        quantityIn: number;
        quantityOut: number;
        valueIn: number;
        valueOut: number;
      }
    > = {};

    movements.forEach((movement) => {
      const dateKey = movement.timestamp.toISOString().split('T')[0];

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          totalMovements: 0,
          quantityIn: 0,
          quantityOut: 0,
          valueIn: 0,
          valueOut: 0,
        };
      }

      dailyData[dateKey].totalMovements++;

      if (movement.quantityChange > 0) {
        dailyData[dateKey].quantityIn += movement.quantityChange;
        if (movement.totalValue) {
          dailyData[dateKey].valueIn += movement.totalValue;
        }
      } else {
        dailyData[dateKey].quantityOut += Math.abs(movement.quantityChange);
        if (movement.totalValue) {
          dailyData[dateKey].valueOut += movement.totalValue;
        }
      }
    });

    return Object.values(dailyData).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
