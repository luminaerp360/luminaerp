import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWarehouseLocationDto,
  UpdateWarehouseLocationDto,
  CreateReorderRuleDto,
  UpdateReorderRuleDto,
} from '../dto/warehouse-reorder.dto';

@Injectable()
export class WarehouseLocationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a warehouse location
   */
  async createLocation(
    organizationId: number,
    dto: CreateWarehouseLocationDto,
  ) {
    // Check if code already exists
    const existing = await this.prisma.warehouseLocation.findFirst({
      where: {
        organizationId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Location with code ${dto.code} already exists`,
      );
    }

    return this.prisma.warehouseLocation.create({
      data: {
        organizationId,
        locationId: dto.locationId,
        code: dto.code,
        name: dto.name,
        zone: dto.zone,
        aisle: dto.aisle,
        rack: dto.rack,
        shelf: dto.shelf,
        bin: dto.bin,
        capacity: dto.capacity,
        notes: dto.notes,
      },
      include: {
        location: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all warehouse locations
   */
  async getAllLocations(organizationId: number, zone?: string) {
    const where: any = { organizationId };

    if (zone) {
      where.zone = zone;
    }

    return this.prisma.warehouseLocation.findMany({
      where,
      include: {
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ zone: 'asc' }, { code: 'asc' }],
    });
  }

  /**
   * Get location by ID
   */
  async getLocationById(organizationId: number, locationId: number) {
    const location = await this.prisma.warehouseLocation.findFirst({
      where: {
        id: locationId,
        organizationId,
      },
      include: {
        location: {
          select: {
            name: true,
            address: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    return location;
  }

  /**
   * Update warehouse location
   */
  async updateLocation(
    organizationId: number,
    locationId: number,
    dto: UpdateWarehouseLocationDto,
  ) {
    const location = await this.prisma.warehouseLocation.findFirst({
      where: {
        id: locationId,
        organizationId,
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    return this.prisma.warehouseLocation.update({
      where: { id: locationId },
      data: dto,
    });
  }

  /**
   * Delete warehouse location
   */
  async deleteLocation(organizationId: number, locationId: number) {
    const location = await this.prisma.warehouseLocation.findFirst({
      where: {
        id: locationId,
        organizationId,
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    return this.prisma.warehouseLocation.delete({
      where: { id: locationId },
    });
  }

  /**
   * Get location utilization
   */
  async getLocationUtilization(organizationId: number) {
    const locations = await this.prisma.warehouseLocation.findMany({
      where: { organizationId },
    });

    return locations.map((location) => ({
      ...location,
      utilizationPercent: location.capacity
        ? (location.currentOccupancy / location.capacity) * 100
        : null,
      availableCapacity: location.capacity
        ? location.capacity - location.currentOccupancy
        : null,
    }));
  }
}

@Injectable()
export class ReorderRuleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create reorder rule
   */
  async createRule(organizationId: number, dto: CreateReorderRuleDto) {
    // Check if rule already exists for this product
    const existing = await this.prisma.reorderRule.findFirst({
      where: {
        organizationId,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Reorder rule already exists for this product`,
      );
    }

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

    // Validate rule
    if (dto.minStock >= dto.maxStock) {
      throw new BadRequestException('Min stock must be less than max stock');
    }

    return this.prisma.reorderRule.create({
      data: {
        organizationId,
        productId: dto.productId,
        minStock: dto.minStock,
        maxStock: dto.maxStock,
        reorderQuantity: dto.reorderQuantity,
        leadTimeDays: dto.leadTimeDays || 0,
        safetyStock: dto.safetyStock || 0,
        supplierId: dto.supplierId,
        enabled: dto.enabled !== undefined ? dto.enabled : true,
      },
      include: {
        product: {
          select: {
            name: true,
            productIdNumber: true,
            quantity: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all reorder rules
   */
  async getAllRules(organizationId: number, enabled?: boolean) {
    const where: any = { organizationId };

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    return this.prisma.reorderRule.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
            quantity: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get rule by ID
   */
  async getRuleById(organizationId: number, ruleId: number) {
    const rule = await this.prisma.reorderRule.findFirst({
      where: {
        id: ruleId,
        organizationId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
            quantity: true,
            reorderLevel: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException(`Reorder rule with ID ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * Update reorder rule
   */
  async updateRule(
    organizationId: number,
    ruleId: number,
    dto: UpdateReorderRuleDto,
  ) {
    const rule = await this.prisma.reorderRule.findFirst({
      where: {
        id: ruleId,
        organizationId,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Reorder rule with ID ${ruleId} not found`);
    }

    // Validate if both min and max are provided
    const newMinStock =
      dto.minStock !== undefined ? dto.minStock : rule.minStock;
    const newMaxStock =
      dto.maxStock !== undefined ? dto.maxStock : rule.maxStock;

    if (newMinStock >= newMaxStock) {
      throw new BadRequestException('Min stock must be less than max stock');
    }

    return this.prisma.reorderRule.update({
      where: { id: ruleId },
      data: dto,
      include: {
        product: {
          select: {
            name: true,
            quantity: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete reorder rule
   */
  async deleteRule(organizationId: number, ruleId: number) {
    const rule = await this.prisma.reorderRule.findFirst({
      where: {
        id: ruleId,
        organizationId,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Reorder rule with ID ${ruleId} not found`);
    }

    return this.prisma.reorderRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Get products that need reordering
   */
  async getProductsNeedingReorder(organizationId: number) {
    const rules = await this.prisma.reorderRule.findMany({
      where: {
        organizationId,
        enabled: true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productIdNumber: true,
            quantity: true,
            buyingPrice: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Filter products that are at or below reorder point
    const needsReorder = rules.filter((rule) => {
      const currentStock = rule.product.quantity || 0;
      return currentStock <= rule.minStock;
    });

    return needsReorder.map((rule) => {
      const currentStock = rule.product.quantity || 0;
      const suggestedOrderQty = rule.maxStock - currentStock;

      return {
        ...rule,
        currentStock,
        stockShortfall: rule.minStock - currentStock,
        suggestedOrderQuantity: Math.max(
          rule.reorderQuantity,
          suggestedOrderQty,
        ),
        priority:
          currentStock === 0
            ? 'CRITICAL'
            : currentStock < rule.safetyStock
              ? 'HIGH'
              : 'MEDIUM',
      };
    });
  }

  /**
   * Check if a product needs reordering
   */
  async checkProductReorder(organizationId: number, productId: number) {
    const rule = await this.prisma.reorderRule.findFirst({
      where: {
        organizationId,
        productId,
        enabled: true,
      },
      include: {
        product: {
          select: {
            quantity: true,
          },
        },
      },
    });

    if (!rule) {
      return {
        hasRule: false,
        needsReorder: false,
      };
    }

    const currentStock = rule.product.quantity || 0;
    const needsReorder = currentStock <= rule.minStock;

    return {
      hasRule: true,
      needsReorder,
      currentStock,
      minStock: rule.minStock,
      maxStock: rule.maxStock,
      reorderQuantity: rule.reorderQuantity,
      suggestedOrderQuantity: needsReorder
        ? Math.max(rule.reorderQuantity, rule.maxStock - currentStock)
        : 0,
    };
  }

  /**
   * Trigger reorder notification (can be extended with email/SMS)
   */
  async triggerReorderNotification(organizationId: number) {
    const productsNeedingReorder =
      await this.getProductsNeedingReorder(organizationId);

    // Update last triggered timestamp
    for (const item of productsNeedingReorder) {
      await this.prisma.reorderRule.update({
        where: { id: item.id },
        data: {
          lastTriggered: new Date(),
        },
      });
    }

    return {
      productsCount: productsNeedingReorder.length,
      products: productsNeedingReorder,
      timestamp: new Date(),
    };
  }

  /**
   * Get all reorder alerts for products that need reordering
   */
  async getReorderAlerts(organizationId: number) {
    const productsNeedingReorder =
      await this.getProductsNeedingReorder(organizationId);

    return productsNeedingReorder.map((rule) => ({
      id: rule.id,
      product_id: rule.productId,
      product_name: rule.product?.name || 'Unknown Product',
      current_stock: rule.product?.quantity || 0,
      min_stock: rule.minStock,
      max_stock: rule.maxStock,
      reorder_quantity: rule.reorderQuantity,
      supplier_id: rule.supplierId,
      urgency: this.calculateUrgency(
        rule.product?.quantity || 0,
        rule.minStock,
      ),
      estimated_cost: rule.reorderQuantity * (rule.product?.buyingPrice || 0),
      last_triggered: rule.lastTriggered,
    }));
  }

  /**
   * Trigger reorder check for all active rules
   */
  async triggerReorderCheck(organizationId: number) {
    const alerts = await this.getReorderAlerts(organizationId);

    // Update last triggered for all rules that generated alerts
    for (const alert of alerts) {
      await this.prisma.reorderRule.update({
        where: { id: alert.id },
        data: {
          lastTriggered: new Date(),
        },
      });
    }

    return {
      triggered_rules: alerts.length,
      alerts,
    };
  }

  /**
   * Calculate urgency level based on current vs min stock
   */
  private calculateUrgency(
    currentStock: number,
    minStock: number,
  ): 'critical' | 'warning' | 'info' {
    const percentage = (currentStock / minStock) * 100;

    if (percentage <= 25) return 'critical';
    if (percentage <= 50) return 'warning';
    return 'info';
  }
}
