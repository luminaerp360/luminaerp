import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStoreProductDto } from './dto/create-store-product.dto';
import { UpdateStoreProductDto } from './dto/update-store-product.dto';

@Injectable()
export class StoreProductService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStoreProductDto, organizationId: number) {
    // Auto-generate SKU if not provided
    let sku = dto.sku;
    if (!sku) {
      const count = await this.prisma.storeProduct.count({
        where: { organizationId },
      });
      sku = `SP-${String(count + 1).padStart(5, '0')}`;
    }

    return this.prisma.storeProduct.create({
      data: {
        ...dto,
        sku,
        organizationId,
      },
      include: {
        storeCategory: true,
        department: true,
      },
    });
  }

  async findAll(
    organizationId: number,
    query?: {
      search?: string;
      categoryId?: number;
      departmentId?: number;
      isActive?: boolean;
      lowStock?: boolean;
    },
  ) {
    const where: any = { organizationId };

    if (query?.search) {
      where.OR = [
        { productName: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.categoryId) where.storeCategoryId = query.categoryId;
    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.isActive !== undefined) where.isActive = query.isActive;
    if (query?.lowStock) {
      where.quantity = {
        lte: this.prisma.storeProduct.fields?.reorderLevel ?? 0,
      };
      // Use raw condition for comparing columns
      where.AND = [
        ...(where.AND || []),
        {
          quantity: { gt: -1 }, // placeholder - we'll filter low stock in-memory or use raw query
        },
      ];
    }

    const products = await this.prisma.storeProduct.findMany({
      where,
      include: {
        storeCategory: true,
        department: true,
        _count: {
          select: {
            purchaseItems: true,
            requisitionItems: true,
          },
        },
      },
      orderBy: { productName: 'asc' },
    });

    // If lowStock filter, only return products where quantity <= reorderLevel
    if (query?.lowStock) {
      return products.filter((p) => p.quantity <= p.reorderLevel);
    }

    return products;
  }

  async findOne(id: number, organizationId: number) {
    const product = await this.prisma.storeProduct.findFirst({
      where: { id, organizationId },
      include: {
        storeCategory: true,
        department: true,
        purchaseItems: {
          include: {
            storePurchase: {
              select: {
                id: true,
                purchaseNumber: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        requisitionItems: {
          include: {
            requisition: {
              select: {
                id: true,
                requisitionNumber: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Store product not found');
    }

    return product;
  }

  async getLowStockProducts(organizationId: number) {
    const products = await this.prisma.storeProduct.findMany({
      where: { organizationId, isActive: true },
      include: {
        storeCategory: true,
        department: true,
      },
    });

    return products.filter(
      (p) => p.quantity <= p.reorderLevel && p.reorderLevel > 0,
    );
  }

  async update(id: number, dto: UpdateStoreProductDto, organizationId: number) {
    const product = await this.prisma.storeProduct.findFirst({
      where: { id, organizationId },
    });
    if (!product) {
      throw new NotFoundException('Store product not found');
    }

    return this.prisma.storeProduct.update({
      where: { id },
      data: dto,
      include: {
        storeCategory: true,
        department: true,
      },
    });
  }

  async remove(id: number, organizationId: number) {
    const product = await this.prisma.storeProduct.findFirst({
      where: { id, organizationId },
    });
    if (!product) {
      throw new NotFoundException('Store product not found');
    }

    return this.prisma.storeProduct.delete({
      where: { id },
    });
  }

  async getStockSummary(organizationId: number) {
    const products = await this.prisma.storeProduct.findMany({
      where: { organizationId, isActive: true },
      include: {
        storeCategory: true,
        department: true,
      },
    });

    const totalProducts = products.length;
    const totalValue = products.reduce(
      (sum, p) => sum + p.quantity * p.buyingPrice,
      0,
    );
    const lowStockCount = products.filter(
      (p) => p.quantity <= p.reorderLevel && p.reorderLevel > 0,
    ).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      products,
    };
  }
}
