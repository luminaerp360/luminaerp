import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseStatus, RequisitionStatus } from '@prisma/client';

@Injectable()
export class StoreReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Stock valuation report - all products with quantities and values
   */
  async getStockValuation(organizationId: number) {
    const products = await this.prisma.storeProduct.findMany({
      where: { organizationId, isActive: true },
      include: {
        storeCategory: true,
        department: true,
      },
      orderBy: { productName: 'asc' },
    });

    const items = products.map((p) => ({
      id: p.id,
      productName: p.productName,
      sku: p.sku,
      category: p.storeCategory?.name,
      department: p.department?.name,
      unitOfMeasurement: p.unitOfMeasurement,
      quantity: p.quantity,
      buyingPrice: p.buyingPrice,
      totalValue: p.quantity * p.buyingPrice,
      reorderLevel: p.reorderLevel,
      maxStock: p.maxStock,
      location: p.location,
      isLowStock: p.reorderLevel > 0 && p.quantity <= p.reorderLevel,
      isOutOfStock: p.quantity === 0,
    }));

    const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);
    const totalProducts = items.length;
    const lowStockCount = items.filter((i) => i.isLowStock).length;
    const outOfStockCount = items.filter((i) => i.isOutOfStock).length;

    return {
      summary: { totalProducts, totalValue, lowStockCount, outOfStockCount },
      items,
    };
  }

  /**
   * Low stock alert report
   */
  async getLowStockReport(organizationId: number) {
    const products = await this.prisma.storeProduct.findMany({
      where: { organizationId, isActive: true },
      include: {
        storeCategory: true,
        department: true,
      },
      orderBy: { quantity: 'asc' },
    });

    return products
      .filter((p) => p.reorderLevel > 0 && p.quantity <= p.reorderLevel)
      .map((p) => ({
        id: p.id,
        productName: p.productName,
        sku: p.sku,
        category: p.storeCategory?.name,
        department: p.department?.name,
        currentQuantity: p.quantity,
        reorderLevel: p.reorderLevel,
        maxStock: p.maxStock,
        shortage: p.reorderLevel - p.quantity,
        suggestedOrder: (p.maxStock || p.reorderLevel * 3) - p.quantity,
        location: p.location,
      }));
  }

  /**
   * Purchase history report with date filtering
   */
  async getPurchaseReport(
    organizationId: number,
    startDate?: string,
    endDate?: string,
    status?: PurchaseStatus,
  ) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const purchases = await this.prisma.storePurchase.findMany({
      where,
      include: {
        items: {
          include: {
            storeProduct: { select: { productName: true, sku: true } },
          },
        },
        supplier: { select: { name: true } },
        creator: { select: { fullName: true } },
        approver: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPurchases = purchases.length;
    const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    const byStatus = {
      pending: purchases.filter((p) => p.status === 'PENDING').length,
      approved: purchases.filter((p) => p.status === 'APPROVED').length,
      rejected: purchases.filter((p) => p.status === 'REJECTED').length,
      received: purchases.filter((p) => p.status === 'RECEIVED').length,
      cancelled: purchases.filter((p) => p.status === 'CANCELLED').length,
    };

    return {
      summary: { totalPurchases, totalAmount, byStatus },
      purchases,
    };
  }

  /**
   * Requisition history report with date filtering
   */
  async getRequisitionReport(
    organizationId: number,
    startDate?: string,
    endDate?: string,
    status?: RequisitionStatus,
    departmentId?: number,
  ) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        items: {
          include: {
            storeProduct: {
              select: { productName: true, sku: true, buyingPrice: true },
            },
          },
        },
        department: { select: { name: true } },
        requester: { select: { fullName: true } },
        approver: { select: { fullName: true } },
        issuer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRequisitions = requisitions.length;
    const totalItemsRequested = requisitions.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.quantityRequested, 0),
      0,
    );
    const totalItemsIssued = requisitions.reduce(
      (sum, r) =>
        sum + r.items.reduce((s, i) => s + (i.quantityIssued || 0), 0),
      0,
    );

    // Estimate value of issued items
    const totalIssuedValue = requisitions.reduce(
      (sum, r) =>
        sum +
        r.items.reduce(
          (s, i) =>
            s + (i.quantityIssued || 0) * (i.storeProduct?.buyingPrice || 0),
          0,
        ),
      0,
    );

    const byStatus = {
      pending: requisitions.filter((r) => r.status === 'PENDING').length,
      approved: requisitions.filter((r) => r.status === 'APPROVED').length,
      rejected: requisitions.filter((r) => r.status === 'REJECTED').length,
      partiallyIssued: requisitions.filter(
        (r) => r.status === 'PARTIALLY_ISSUED',
      ).length,
      issued: requisitions.filter((r) => r.status === 'ISSUED').length,
      cancelled: requisitions.filter((r) => r.status === 'CANCELLED').length,
    };

    return {
      summary: {
        totalRequisitions,
        totalItemsRequested,
        totalItemsIssued,
        totalIssuedValue,
        byStatus,
      },
      requisitions,
    };
  }

  /**
   * Department usage report - how much each department consumes
   */
  async getDepartmentUsageReport(
    organizationId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      organizationId,
      status: {
        in: [RequisitionStatus.ISSUED, RequisitionStatus.PARTIALLY_ISSUED],
      },
    };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const requisitions = await this.prisma.requisition.findMany({
      where,
      include: {
        items: {
          include: {
            storeProduct: { select: { productName: true, buyingPrice: true } },
          },
        },
        department: { select: { id: true, name: true } },
      },
    });

    // Group by department
    const departmentMap = new Map<
      string,
      {
        departmentId: number | null;
        departmentName: string;
        totalRequisitions: number;
        totalItemsIssued: number;
        totalValue: number;
        products: Map<
          string,
          { productName: string; quantityIssued: number; value: number }
        >;
      }
    >();

    for (const req of requisitions) {
      const deptName = req.department?.name || 'Unassigned';
      const deptId = req.departmentId;

      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          departmentId: deptId,
          departmentName: deptName,
          totalRequisitions: 0,
          totalItemsIssued: 0,
          totalValue: 0,
          products: new Map(),
        });
      }

      const dept = departmentMap.get(deptName)!;
      dept.totalRequisitions++;

      for (const item of req.items) {
        const issuedQty = item.quantityIssued || 0;
        const itemValue = issuedQty * (item.storeProduct?.buyingPrice || 0);
        dept.totalItemsIssued += issuedQty;
        dept.totalValue += itemValue;

        const productName = item.storeProduct?.productName || 'Unknown';
        if (!dept.products.has(productName)) {
          dept.products.set(productName, {
            productName,
            quantityIssued: 0,
            value: 0,
          });
        }
        const prod = dept.products.get(productName)!;
        prod.quantityIssued += issuedQty;
        prod.value += itemValue;
      }
    }

    const departments = Array.from(departmentMap.values()).map((d) => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      totalRequisitions: d.totalRequisitions,
      totalItemsIssued: d.totalItemsIssued,
      totalValue: d.totalValue,
      topProducts: Array.from(d.products.values())
        .sort((a, b) => b.quantityIssued - a.quantityIssued)
        .slice(0, 10),
    }));

    return {
      departments: departments.sort((a, b) => b.totalValue - a.totalValue),
      totalValueAllDepartments: departments.reduce(
        (sum, d) => sum + d.totalValue,
        0,
      ),
    };
  }

  /**
   * Category summary report - stock grouped by category
   */
  async getCategorySummary(organizationId: number) {
    const products = await this.prisma.storeProduct.findMany({
      where: { organizationId, isActive: true },
      include: { storeCategory: true },
    });

    const categoryMap = new Map<
      string,
      {
        categoryId: number;
        categoryName: string;
        totalProducts: number;
        totalQuantity: number;
        totalValue: number;
        lowStockCount: number;
        outOfStockCount: number;
      }
    >();

    for (const product of products) {
      const catName = product.storeCategory?.name || 'Uncategorized';
      const catId = product.storeCategoryId;

      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, {
          categoryId: catId,
          categoryName: catName,
          totalProducts: 0,
          totalQuantity: 0,
          totalValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        });
      }

      const cat = categoryMap.get(catName)!;
      cat.totalProducts++;
      cat.totalQuantity += product.quantity;
      cat.totalValue += product.quantity * product.buyingPrice;
      if (product.reorderLevel > 0 && product.quantity <= product.reorderLevel)
        cat.lowStockCount++;
      if (product.quantity === 0) cat.outOfStockCount++;
    }

    return Array.from(categoryMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue,
    );
  }

  /**
   * Product movement report - tracks ins (purchases) and outs (requisitions) for a product
   */
  async getProductMovementReport(
    organizationId: number,
    productId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const product = await this.prisma.storeProduct.findFirst({
      where: { id: productId, organizationId },
      include: { storeCategory: true, department: true },
    });

    if (!product) return null;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Purchases (stock in)
    const purchaseItems = await this.prisma.storePurchaseItem.findMany({
      where: {
        storeProductId: productId,
        storePurchase: {
          organizationId,
          status: PurchaseStatus.RECEIVED,
          ...(hasDateFilter && { createdAt: dateFilter }),
        },
      },
      include: {
        storePurchase: {
          select: { purchaseNumber: true, createdAt: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Requisitions (stock out)
    const requisitionItems = await this.prisma.requisitionItem.findMany({
      where: {
        storeProductId: productId,
        requisition: {
          organizationId,
          status: {
            in: [RequisitionStatus.ISSUED, RequisitionStatus.PARTIALLY_ISSUED],
          },
          ...(hasDateFilter && { createdAt: dateFilter }),
        },
      },
      include: {
        requisition: {
          select: {
            requisitionNumber: true,
            createdAt: true,
            status: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalIn = purchaseItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalOut = requisitionItems.reduce(
      (sum, i) => sum + (i.quantityIssued || 0),
      0,
    );

    // Build movements timeline
    const movements = [
      ...purchaseItems.map((i) => ({
        type: 'IN' as const,
        date: i.storePurchase.createdAt,
        reference: i.storePurchase.purchaseNumber,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      ...requisitionItems.map((i) => ({
        type: 'OUT' as const,
        date: i.requisition.createdAt,
        reference: i.requisition.requisitionNumber,
        quantity: i.quantityIssued || 0,
        department: i.requisition.department?.name,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      product: {
        id: product.id,
        productName: product.productName,
        sku: product.sku,
        category: product.storeCategory?.name,
        department: product.department?.name,
        currentQuantity: product.quantity,
        buyingPrice: product.buyingPrice,
      },
      summary: { totalIn, totalOut, netChange: totalIn - totalOut },
      movements,
    };
  }

  /**
   * Store dashboard summary - overview metrics
   */
  async getDashboardSummary(organizationId: number) {
    const [products, purchases, requisitions] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where: { organizationId, isActive: true },
      }),
      this.prisma.storePurchase.findMany({
        where: { organizationId },
        select: { status: true, totalAmount: true, createdAt: true },
      }),
      this.prisma.requisition.findMany({
        where: { organizationId },
        select: { status: true, createdAt: true },
      }),
    ]);

    // Stock metrics
    const totalProducts = products.length;
    const totalStockValue = products.reduce(
      (sum, p) => sum + p.quantity * p.buyingPrice,
      0,
    );
    const lowStockCount = products.filter(
      (p) => p.reorderLevel > 0 && p.quantity <= p.reorderLevel,
    ).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;

    // Purchase metrics
    const pendingPurchases = purchases.filter(
      (p) => p.status === 'PENDING',
    ).length;
    const totalPurchaseValue = purchases
      .filter((p) => p.status === 'RECEIVED')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    // Requisition metrics
    const pendingRequisitions = requisitions.filter(
      (r) => r.status === 'PENDING',
    ).length;
    const approvedRequisitions = requisitions.filter(
      (r) => r.status === 'APPROVED',
    ).length;

    // This month's activity
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPurchases = purchases.filter(
      (p) => new Date(p.createdAt) >= startOfMonth,
    ).length;
    const monthlyRequisitions = requisitions.filter(
      (r) => new Date(r.createdAt) >= startOfMonth,
    ).length;

    return {
      stock: { totalProducts, totalStockValue, lowStockCount, outOfStockCount },
      purchases: { pendingPurchases, totalPurchaseValue, monthlyPurchases },
      requisitions: {
        pendingRequisitions,
        approvedRequisitions,
        monthlyRequisitions,
      },
    };
  }
}
