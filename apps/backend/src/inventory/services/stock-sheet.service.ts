import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StockSheetQueryDto,
  StockSheetSummary,
  StockSheetProductItem,
} from '../dto/stock-sheet.dto';

@Injectable()
export class StockSheetService {
  constructor(private prisma: PrismaService) {}

  async getStockSheet(
    organizationId: number,
    dto: StockSheetQueryDto,
  ): Promise<StockSheetSummary> {
    const targetDate = new Date(dto.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all products (non-service items)
    const productsQuery: any = {
      organizationId,
      OR: [{ isService: false }, { isService: null }],
    };

    if (dto.productId) {
      productsQuery.id = dto.productId;
    }

    if (dto.categoryId) {
      productsQuery.categoryId = dto.categoryId;
    }

    const products = await this.prisma.product.findMany({
      where: productsQuery,
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const items: StockSheetProductItem[] = [];

    for (const product of products) {
      // Get opening stock (stock at start of day)
      const openingStock = await this.getStockAtDate(
        organizationId,
        product.id,
        startOfDay,
      );

      // Get purchases during the day
      const purchases = await this.getPurchasesForDay(
        organizationId,
        product.id,
        startOfDay,
        endOfDay,
      );

      // Get sales during the day
      const sales = await this.getSalesForDay(
        organizationId,
        product.id,
        startOfDay,
        endOfDay,
      );

      // Calculate closing stock
      const closingStock = openingStock + purchases - sales;

      // Calculate financial metrics
      const buyingPrice = product.buyingPrice || 0;
      const sellingPrice = product.price || 0;
      const stockValue = closingStock * buyingPrice;
      const salesRevenue = sales * sellingPrice;
      const costOfGoodsSold = sales * buyingPrice;
      const grossProfit = salesRevenue - costOfGoodsSold;
      const profitMargin =
        salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;

      items.push({
        productId: product.id,
        productName: product.name,
        productCode: product.productIdNumber || '',
        category: product.category?.name || 'Uncategorized',
        openingStock,
        purchases,
        sales,
        closingStock,
        buyingPrice,
        sellingPrice,
        stockValue,
        salesRevenue,
        costOfGoodsSold,
        grossProfit,
        profitMargin,
      });
    }

    // Calculate summary totals
    const summary: StockSheetSummary = {
      date: dto.date,
      totalProducts: items.length,
      totalOpeningStock: items.reduce(
        (sum, item) => sum + item.openingStock,
        0,
      ),
      totalPurchases: items.reduce((sum, item) => sum + item.purchases, 0),
      totalSales: items.reduce((sum, item) => sum + item.sales, 0),
      totalClosingStock: items.reduce(
        (sum, item) => sum + item.closingStock,
        0,
      ),
      totalStockValue: items.reduce((sum, item) => sum + item.stockValue, 0),
      totalSalesRevenue: items.reduce(
        (sum, item) => sum + item.salesRevenue,
        0,
      ),
      totalCostOfGoodsSold: items.reduce(
        (sum, item) => sum + item.costOfGoodsSold,
        0,
      ),
      totalGrossProfit: items.reduce((sum, item) => sum + item.grossProfit, 0),
      averageProfitMargin:
        items.length > 0
          ? items.reduce((sum, item) => sum + item.profitMargin, 0) /
            items.length
          : 0,
      items,
    };

    return summary;
  }

  /**
   * Get stock quantity at a specific date/time
   */
  private async getStockAtDate(
    organizationId: number,
    productId: number,
    date: Date,
  ): Promise<number> {
    // Get all inventory movements up to the specified date
    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        productId,
        timestamp: {
          lt: date,
        },
      },
      select: {
        quantityChange: true,
      },
    });

    // Sum all quantity changes to get stock at that point
    const stockFromMovements = movements.reduce(
      (sum, movement) => sum + movement.quantityChange,
      0,
    );

    // Fallback: if no movements, use current product quantity minus movements after date
    if (movements.length === 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { quantity: true },
      });

      const movementsAfter = await this.prisma.inventoryMovement.findMany({
        where: {
          organizationId,
          productId,
          timestamp: {
            gte: date,
          },
        },
        select: {
          quantityChange: true,
        },
      });

      const changesAfter = movementsAfter.reduce(
        (sum, movement) => sum + movement.quantityChange,
        0,
      );

      return (product?.quantity || 0) - changesAfter;
    }

    return Math.max(0, stockFromMovements);
  }

  /**
   * Get total purchases for a day
   */
  private async getPurchasesForDay(
    organizationId: number,
    productId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const purchases = await this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        productId,
        movementType: 'PURCHASE',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        quantityChange: true,
      },
    });

    return purchases.reduce((sum, p) => sum + Math.abs(p.quantityChange), 0);
  }

  /**
   * Get total sales for a day
   */
  private async getSalesForDay(
    organizationId: number,
    productId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const sales = await this.prisma.inventoryMovement.findMany({
      where: {
        organizationId,
        productId,
        movementType: 'SALE',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        quantityChange: true,
      },
    });

    return sales.reduce((sum, s) => sum + Math.abs(s.quantityChange), 0);
  }

  /**
   * Get stock sheet for a date range
   */
  async getStockSheetRange(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sheets = [];

    // Generate stock sheet for each day in range
    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      const sheet = await this.getStockSheet(organizationId, {
        date: date.toISOString().split('T')[0],
      });
      sheets.push(sheet);
    }

    return sheets;
  }

  /**
   * Get current stock value summary
   */
  async getCurrentStockValue(organizationId: number) {
    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        OR: [{ isService: false }, { isService: null }],
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        buyingPrice: true,
        price: true,
      },
    });

    const items = products.map((product) => ({
      productId: product.id,
      productName: product.name,
      quantity: product.quantity || 0,
      buyingPrice: product.buyingPrice || 0,
      sellingPrice: product.price || 0,
      stockValue: (product.quantity || 0) * (product.buyingPrice || 0),
      potentialRevenue: (product.quantity || 0) * (product.price || 0),
      potentialProfit:
        (product.quantity || 0) * (product.price || 0) -
        (product.quantity || 0) * (product.buyingPrice || 0),
    }));

    return {
      totalProducts: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalStockValue: items.reduce((sum, item) => sum + item.stockValue, 0),
      totalPotentialRevenue: items.reduce(
        (sum, item) => sum + item.potentialRevenue,
        0,
      ),
      totalPotentialProfit: items.reduce(
        (sum, item) => sum + item.potentialProfit,
        0,
      ),
      items,
    };
  }
}
