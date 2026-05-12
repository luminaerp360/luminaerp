import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockTakeDto,
  CompleteStockTakeDto,
  StockTakeQueryDto,
} from './dto/stock-take.dto';

@Injectable()
export class StockTakeService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateStockTakeNumber(
    organizationId: number,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await this.prisma.stockTake.count({
      where: { organizationId },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `ST-${year}${month}${day}-${seq}`;
  }

  async create(
    organizationId: number,
    dto: CreateStockTakeDto,
    userId: number,
    userName: string,
  ) {
    const stockTakeNumber = await this.generateStockTakeNumber(organizationId);

    // Calculate variances for each item
    const itemsWithVariance = dto.items.map((item) => {
      const varianceQty = item.countedQuantity - item.systemQuantity;
      const unitCost = item.unitCost || 0;
      const varianceValue = varianceQty * unitCost;

      return {
        productId: item.productId,
        productName: item.productName,
        systemQuantity: item.systemQuantity,
        countedQuantity: item.countedQuantity,
        varianceQty,
        varianceValue,
        unitCost,
        reason: item.reason || null,
        notes: item.notes || null,
      };
    });

    const totalVarianceQty = itemsWithVariance.reduce(
      (sum, i) => sum + Math.abs(i.varianceQty),
      0,
    );
    const totalVarianceValue = itemsWithVariance.reduce(
      (sum, i) => sum + i.varianceValue,
      0,
    );

    return this.prisma.stockTake.create({
      data: {
        organizationId,
        stockTakeNumber,
        type: (dto.type as any) || 'PHYSICAL_COUNT',
        status: 'DRAFT',
        notes: dto.notes || null,
        totalItems: dto.items.length,
        totalVarianceQty,
        totalVarianceValue,
        createdBy: userId,
        createdByName: userName,
        items: {
          create: itemsWithVariance,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async findAll(organizationId: number, query: StockTakeQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { stockTakeNumber: { contains: query.search, mode: 'insensitive' } },
        { createdByName: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lt = endDate;
      }
    }

    const [stockTakes, total] = await Promise.all([
      this.prisma.stockTake.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  buyingPrice: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.stockTake.count({ where }),
    ]);

    return {
      stockTakes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: number, id: number) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                quantity: true,
                buyingPrice: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!stockTake) {
      throw new NotFoundException(`Stock take #${id} not found`);
    }

    return stockTake;
  }

  async complete(
    organizationId: number,
    id: number,
    dto: CompleteStockTakeDto,
    userId: number,
    userName: string,
  ) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!stockTake) {
      throw new NotFoundException(`Stock take #${id} not found`);
    }

    if (stockTake.status === 'COMPLETED') {
      throw new BadRequestException('Stock take is already completed');
    }

    if (stockTake.status === 'CANCELLED') {
      throw new BadRequestException('Cannot complete a cancelled stock take');
    }

    return this.prisma.$transaction(async (tx) => {
      // Use existing items from the stock take
      const updatedItems = [];

      for (const item of stockTake.items) {
        const varianceQty = item.countedQuantity - item.systemQuantity;
        const unitCost = item.unitCost || 0;
        const varianceValue = varianceQty * unitCost;

        updatedItems.push({
          productId: item.productId,
          varianceQty,
          varianceValue,
          countedQuantity: item.countedQuantity,
        });

        // Update the product quantity to match the counted quantity
        if (varianceQty !== 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: item.countedQuantity },
          });

          // Log inventory movement for the adjustment
          await tx.inventoryMovement.create({
            data: {
              organizationId,
              productId: item.productId,
              movementType:
                varianceQty >= 0
                  ? 'ADJUSTMENT_INCREASE'
                  : 'ADJUSTMENT_DECREASE',
              quantityBefore: item.systemQuantity,
              quantityChange: varianceQty,
              quantityAfter: item.countedQuantity,
              referenceType: 'STOCK_TAKE',
              referenceId: id,
              unitCost,
              totalValue: varianceValue,
              performedBy: userId,
              performedByName: userName,
              reason: item.reason || 'Stock take adjustment',
              notes: `Stock Take ${stockTake.stockTakeNumber}`,
            },
          });
        }
      }

      const totalVarianceQty = updatedItems.reduce(
        (sum, i) => sum + Math.abs(i.varianceQty),
        0,
      );
      const totalVarianceValue = updatedItems.reduce(
        (sum, i) => sum + i.varianceValue,
        0,
      );

      // Update the stock take status
      const updated = await tx.stockTake.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          totalItems: updatedItems.length,
          totalVarianceQty,
          totalVarianceValue,
          completedBy: userId,
          completedByName: userName,
          completedAt: new Date(),
          notes: dto.notes || stockTake.notes,
        },
        include: {
          items: true,
        },
      });

      return updated;
    });
  }

  async cancel(organizationId: number, id: number) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organizationId },
    });

    if (!stockTake) {
      throw new NotFoundException(`Stock take #${id} not found`);
    }

    if (stockTake.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed stock take');
    }

    return this.prisma.stockTake.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async delete(organizationId: number, id: number) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organizationId },
    });

    if (!stockTake) {
      throw new NotFoundException(`Stock take #${id} not found`);
    }

    if (stockTake.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete a completed stock take');
    }

    return this.prisma.stockTake.delete({ where: { id } });
  }

  async getSummary(organizationId: number) {
    const [total, completed, inProgress, draft] = await Promise.all([
      this.prisma.stockTake.count({ where: { organizationId } }),
      this.prisma.stockTake.count({
        where: { organizationId, status: 'COMPLETED' },
      }),
      this.prisma.stockTake.count({
        where: { organizationId, status: 'IN_PROGRESS' },
      }),
      this.prisma.stockTake.count({
        where: { organizationId, status: 'DRAFT' },
      }),
    ]);

    const latestCompleted = await this.prisma.stockTake.findFirst({
      where: { organizationId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: {
        stockTakeNumber: true,
        completedAt: true,
        totalVarianceQty: true,
        totalVarianceValue: true,
      },
    });

    // Total variance value from all completed stock takes
    const aggregated = await this.prisma.stockTake.aggregate({
      where: { organizationId, status: 'COMPLETED' },
      _sum: { totalVarianceValue: true, totalVarianceQty: true },
    });

    return {
      total,
      completed,
      inProgress,
      draft,
      latestCompleted,
      allTimeVarianceValue: aggregated._sum.totalVarianceValue || 0,
      allTimeVarianceQty: aggregated._sum.totalVarianceQty || 0,
    };
  }
}
