import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

interface OrderItem {
  id: number;
  name: string;
  price: number;
  category_id: number;
  selectedItems: number;
  oneTimeService?: boolean; // Added for one-time products
  discountValue?: number; // Added for discounts
  hasVat?: boolean; // Added for VAT tracking
}

export interface SalesBreakdown {
  cash: number;
  mpesa: number;
  bank: number;
  credit: number;
}

export interface VatAndDiscountBreakdown {
  totalVat: number;
  totalDiscount: number;
  vatByCashSales: number;
  vatByCreditSales: number;
  discountByCashSales: number;
  discountByCreditSales: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getComprehensiveReport(
    organizationId: number,
    startDate: Date,
    endDate: Date,
  ) {
    // Adjust dates to cover full days
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setHours(0, 0, 0, 0);

    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999);

    const [orders, creditSales, users] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          organizationId,
          isVoided: false,
          createdAt: {
            gte: adjustedStartDate,
            lte: adjustedEndDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.creditSale.findMany({
        where: {
          organizationId,
          createdAt: {
            gte: adjustedStartDate,
            lte: adjustedEndDate,
          },
        },
        include: {
          CreditSalePayment: true,
        },
      }),
      // Get all users in the organization
      this.prisma.user.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      }),
    ]);

    const [itemsSold, categoryBreakdown, oneTimeProductsAnalysis] =
      await Promise.all([
        this.calculateItemsSold(organizationId, orders, creditSales),
        this.calculateCategoryBreakdown(organizationId, orders, creditSales),
        this.calculateOneTimeProductsAnalysis(orders, creditSales),
      ]);

    const totalSales = this.calculateTotalSales(orders, creditSales);
    const paymentBreakdown = this.calculatePaymentBreakdown(
      orders,
      creditSales,
    );
    const userSalesBreakdown = this.calculateUserSalesBreakdown(
      users,
      orders,
      creditSales,
    );
    const hourlyBreakdown = this.calculateHourlyBreakdown(orders, creditSales);
    const vatAndDiscountBreakdown = this.calculateVatAndDiscountBreakdown(
      orders,
      creditSales,
    );

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        address: true,
        contact: true,
      },
    });

    // Calculate performance metrics
    const averageTransactionValue =
      orders.length + creditSales.length > 0
        ? totalSales / (orders.length + creditSales.length)
        : 0.0;

    const creditSalesPercentage =
      totalSales > 0 ? (paymentBreakdown.credit / totalSales) * 100 : 0;

    // Calculate daily trends
    const dailyTrends = this.calculateDailyTrends(
      orders,
      creditSales,
      adjustedStartDate,
      adjustedEndDate,
    );

    return {
      organization,
      summary: {
        totalSales,
        orderCount: orders.length,
        creditSaleCount: creditSales.length,
        averageTransactionValue,
        creditSalesPercentage,
        totalVat: vatAndDiscountBreakdown.totalVat,
        totalDiscount: vatAndDiscountBreakdown.totalDiscount,
        oneTimeProductsSales: oneTimeProductsAnalysis.totalSales,
        oneTimeProductsCount: oneTimeProductsAnalysis.totalCount,
      },
      paymentBreakdown,
      userSalesBreakdown,
      itemsSold,
      categoryBreakdown,
      hourlyBreakdown,
      vatAndDiscountBreakdown,
      oneTimeProductsAnalysis,
      dailyTrends,
      dateRange: {
        start: adjustedStartDate,
        end: adjustedEndDate,
      },
      metadata: {
        generatedAt: new Date(),
        reportPeriod: `${adjustedStartDate.toLocaleDateString()} to ${adjustedEndDate.toLocaleDateString()}`,
      },
    };
  }

  private calculateUserSalesBreakdown(
    users: any[],
    orders: any[],
    creditSales: any[],
  ) {
    const userSalesMap = new Map();

    // Initialize sales data for each user
    users.forEach((user) => {
      userSalesMap.set(user.id, {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        cashSales: {
          total: 0,
          count: 0,
          cashAmount: 0,
          mpesaAmount: 0,
          bankAmount: 0,
          vatAmount: 0,
          discountAmount: 0,
          oneTimeProductSales: 0,
        },
        creditSales: {
          total: 0,
          count: 0,
          paidAmount: 0,
          pendingAmount: 0,
          vatAmount: 0,
          discountAmount: 0,
          oneTimeProductSales: 0,
        },
      });
    });

    // Process cash sales
    orders.forEach((order) => {
      const userData = userSalesMap.get(order.userId);
      if (userData) {
        userData.cashSales.total += order.total;
        userData.cashSales.count += 1;
        userData.cashSales.cashAmount += order.cashPaid || 0;
        userData.cashSales.mpesaAmount += order.mpesaPaid || 0;
        userData.cashSales.bankAmount += order.bankPaid || 0;
        userData.cashSales.vatAmount += order.taxAmount || 0;
        userData.cashSales.discountAmount += order.discountAmount || 0;

        // Count one-time products sales
        let oneTimeTotal = 0;
        try {
          const items =
            typeof order.items === 'string'
              ? JSON.parse(order.items)
              : order.items;
          items.forEach((item) => {
            if (item.oneTimeService) {
              oneTimeTotal += item.price * (item.selectedItems || 1);
            }
          });
        } catch (e) {
          console.error('Error parsing items:', e);
        }
        userData.cashSales.oneTimeProductSales += oneTimeTotal;
      }
    });

    // Process credit sales
    creditSales.forEach((sale) => {
      const userId =
        typeof sale.created_by === 'string'
          ? parseInt(sale.created_by)
          : sale.created_by;

      const userData = userSalesMap.get(userId);
      if (userData) {
        userData.creditSales.total += sale.credit_amount;
        userData.creditSales.count += 1;

        const paidAmount = sale.CreditSalePayment.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        userData.creditSales.paidAmount += paidAmount;
        userData.creditSales.pendingAmount += sale.credit_amount - paidAmount;
        userData.creditSales.vatAmount += sale.vat_amount || 0;
        userData.creditSales.discountAmount += sale.discount_amount || 0;

        // Count one-time products sales
        let oneTimeTotal = 0;
        try {
          const items =
            typeof sale.items === 'string'
              ? JSON.parse(sale.items)
              : sale.items;
          items.forEach((item) => {
            if (item.oneTimeService) {
              oneTimeTotal += item.price * (item.selectedItems || 1);
            }
          });
        } catch (e) {
          console.error('Error parsing items:', e);
        }
        userData.creditSales.oneTimeProductSales += oneTimeTotal;
      }
    });

    // Convert map to array and calculate totals
    const userSalesBreakdown = Array.from(userSalesMap.values()).map(
      (userData) => ({
        ...userData,
        totalSales: userData.cashSales.total + userData.creditSales.total,
        totalTransactions:
          userData.cashSales.count + userData.creditSales.count,
        totalCollected:
          userData.cashSales.cashAmount +
          userData.cashSales.mpesaAmount +
          userData.cashSales.bankAmount +
          userData.creditSales.paidAmount,
        totalPending: userData.creditSales.pendingAmount,
        totalVat: userData.cashSales.vatAmount + userData.creditSales.vatAmount,
        totalDiscount:
          userData.cashSales.discountAmount +
          userData.creditSales.discountAmount,
        totalOneTimeProductSales:
          userData.cashSales.oneTimeProductSales +
          userData.creditSales.oneTimeProductSales,
      }),
    );

    return userSalesBreakdown.sort((a, b) => b.totalSales - a.totalSales);
  }

  private async calculateItemsSold(
    organizationId: number,
    orders: any[],
    creditSales: any[],
  ) {
    const itemMap = new Map<
      number,
      {
        quantity: number;
        name: string;
        categoryName?: string;
        revenue: number;
        cashSales: number;
        creditSales: number;
        isOneTimeProduct: boolean;
        vatAmount: number;
        discountAmount: number;
        profit: number; // If buying price is available
        cost: number;
      }
    >();

    const processItems = async (
      items: string | OrderItem[],
      isCredit: boolean = false,
      vatTotal: number = 0,
      discountTotal: number = 0,
    ) => {
      let parsedItems: OrderItem[];
      if (typeof items === 'string') {
        try {
          parsedItems = JSON.parse(items);
        } catch (error) {
          console.error('Error parsing items:', error);
          return;
        }
      } else {
        parsedItems = items;
      }

      if (!Array.isArray(parsedItems)) {
        console.error('Items is not an array:', parsedItems);
        return;
      }

      // Calculate total value of items to use for proportional VAT/discount distribution
      const totalValue = parsedItems.reduce((sum, item) => {
        return sum + (item.price || 0) * (item.selectedItems || 1);
      }, 0);

      for (const item of parsedItems) {
        const id = item.id;
        if (!id) continue;

        const product = await this.prisma.product.findFirst({
          where: {
            id,
            organizationId,
          },
          include: {
            category: true,
          },
        });

        const itemValue = (item.price || 0) * (item.selectedItems || 1);
        // Calculate proportional VAT and discount for this item
        const itemVat =
          totalValue > 0 ? (itemValue / totalValue) * vatTotal : 0;
        const itemDiscount =
          item.discountValue ||
          (totalValue > 0 ? (itemValue / totalValue) * discountTotal : 0);

        const revenue = itemValue - itemDiscount;
        const cost = product?.buyingPrice
          ? product.buyingPrice * (item.selectedItems || 1)
          : 0;
        const profit = revenue - cost;

        const isOneTime = item.oneTimeService || false;

        const existing = itemMap.get(id) || {
          quantity: 0,
          name: item.name,
          categoryName: product?.category?.name,
          revenue: 0,
          cashSales: 0,
          creditSales: 0,
          isOneTimeProduct: isOneTime,
          vatAmount: 0,
          discountAmount: 0,
          profit: 0,
          cost: 0,
        };

        existing.quantity += item.selectedItems || 1;
        existing.revenue += revenue;
        existing.vatAmount += itemVat;
        existing.discountAmount += itemDiscount;
        existing.profit += profit;
        existing.cost += cost;

        if (isCredit) {
          existing.creditSales += revenue;
        } else {
          existing.cashSales += revenue;
        }

        itemMap.set(id, existing);
      }
    };

    // Process all items
    for (const order of orders) {
      await processItems(
        order.items,
        false,
        order.taxAmount || 0,
        order.discountAmount || 0,
      );
    }
    for (const sale of creditSales) {
      await processItems(
        sale.items,
        true,
        sale.vat_amount || 0,
        sale.discount_amount || 0,
      );
    }

    return Array.from(itemMap.entries())
      .map(([productId, data]) => ({
        productId,
        ...data,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  private async calculateCategoryBreakdown(
    organizationId: number,
    orders: any[],
    creditSales: any[],
  ) {
    const categoryMap = new Map<
      number,
      {
        name: string;
        totalSales: number;
        itemCount: number;
        cashSales: number;
        creditSales: number;
        oneTimeProductSales: number;
        vatAmount: number;
        discountAmount: number;
        profitMargin: number;
        // Add missing properties to fix TypeScript errors
        totalCost: number;
        totalRevenue: number;
        totalProfit: number;
      }
    >();

    const processItems = async (
      items: string | OrderItem[],
      isCredit: boolean = false,
      vatTotal: number = 0,
      discountTotal: number = 0,
    ) => {
      let parsedItems: OrderItem[];
      if (typeof items === 'string') {
        try {
          parsedItems = JSON.parse(items);
        } catch (error) {
          return;
        }
      } else {
        parsedItems = items;
      }

      // Calculate total item value for proportional distribution
      const totalValue = parsedItems.reduce((sum, item) => {
        return sum + (item.price || 0) * (item.selectedItems || 1);
      }, 0);

      for (const item of parsedItems) {
        const product = await this.prisma.product.findFirst({
          where: {
            id: item.id,
            organizationId,
          },
          include: {
            category: true,
          },
        });

        if (!product?.category) continue;

        const itemValue = (item.price || 0) * (item.selectedItems || 1);
        const itemDiscount =
          item.discountValue ||
          (totalValue > 0 ? (itemValue / totalValue) * discountTotal : 0);
        const itemVat =
          totalValue > 0 ? (itemValue / totalValue) * vatTotal : 0;

        const revenue = itemValue - itemDiscount;
        const cost = product.buyingPrice
          ? product.buyingPrice * (item.selectedItems || 1)
          : 0;
        const profit = revenue - cost;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

        const isOneTime = item.oneTimeService || false;

        const existing = categoryMap.get(product.category.id) || {
          name: product.category.name,
          totalSales: 0,
          itemCount: 0,
          cashSales: 0,
          creditSales: 0,
          oneTimeProductSales: 0,
          vatAmount: 0,
          discountAmount: 0,
          profitMargin: 0,
          totalCost: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };

        existing.totalSales += revenue;
        existing.itemCount += item.selectedItems || 1;
        existing.vatAmount += itemVat;
        existing.discountAmount += itemDiscount;
        existing.totalCost += cost;
        existing.totalRevenue += revenue;
        existing.totalProfit += profit;

        if (isOneTime) {
          existing.oneTimeProductSales += revenue;
        }

        if (isCredit) {
          existing.creditSales += revenue;
        } else {
          existing.cashSales += revenue;
        }

        categoryMap.set(product.category.id, existing);
      }
    };

    // Process all items
    for (const order of orders) {
      await processItems(
        order.items,
        false,
        order.taxAmount || 0,
        order.discountAmount || 0,
      );
    }
    for (const sale of creditSales) {
      await processItems(
        sale.items,
        true,
        sale.vat_amount || 0,
        sale.discount_amount || 0,
      );
    }

    // Calculate profit margins
    const result = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => {
        // Calculate the overall profit margin for the category
        if (data.totalRevenue > 0) {
          data.profitMargin = (data.totalProfit / data.totalRevenue) * 100;
        }

        return {
          categoryId,
          ...data,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    return result;
  }

  private calculateHourlyBreakdown(orders: any[], creditSales: any[]) {
    const hourlyData = Array(24)
      .fill(0)
      .map((_, hour) => ({
        hour,
        totalSales: 0,
        transactionCount: 0,
        cashSales: 0,
        creditSales: 0,
        oneTimeProductSales: 0,
        vatAmount: 0,
        discountAmount: 0,
      }));

    // Process orders
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourlyData[hour].totalSales += order.total;
      hourlyData[hour].transactionCount += 1;
      hourlyData[hour].cashSales += order.total;
      hourlyData[hour].vatAmount += order.taxAmount || 0;
      hourlyData[hour].discountAmount += order.discountAmount || 0;

      // Count one-time product sales
      try {
        const items =
          typeof order.items === 'string'
            ? JSON.parse(order.items)
            : order.items;
        let oneTimeTotal = 0;

        items.forEach((item) => {
          if (item.oneTimeService) {
            oneTimeTotal += item.price * (item.selectedItems || 1);
          }
        });

        hourlyData[hour].oneTimeProductSales += oneTimeTotal;
      } catch (e) {
        console.error('Error parsing order items:', e);
      }
    });

    // Process credit sales
    creditSales.forEach((sale) => {
      const hour = new Date(sale.createdAt).getHours();
      hourlyData[hour].totalSales += sale.credit_amount;
      hourlyData[hour].transactionCount += 1;
      hourlyData[hour].creditSales += sale.credit_amount;
      hourlyData[hour].vatAmount += sale.vat_amount || 0;
      hourlyData[hour].discountAmount += sale.discount_amount || 0;

      // Count one-time product sales
      try {
        const items =
          typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        let oneTimeTotal = 0;

        items.forEach((item) => {
          if (item.oneTimeService) {
            oneTimeTotal += item.price * (item.selectedItems || 1);
          }
        });

        hourlyData[hour].oneTimeProductSales += oneTimeTotal;
      } catch (e) {
        console.error('Error parsing credit sale items:', e);
      }
    });

    return hourlyData;
  }

  private calculateDailyTrends(
    orders: any[],
    creditSales: any[],
    startDate: Date,
    endDate: Date,
  ) {
    // Create an array of days between start and end dates
    const days =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    const dailyData = Array(days)
      .fill(0)
      .map((_, index) => {
        const day = new Date(startDate);
        day.setDate(day.getDate() + index);

        return {
          date: new Date(day.setHours(0, 0, 0, 0)),
          formattedDate: day.toISOString().split('T')[0], // YYYY-MM-DD format
          totalSales: 0,
          transactionCount: 0,
          cashSales: 0,
          creditSales: 0,
          oneTimeProductSales: 0,
          regularProductSales: 0,
          vatAmount: 0,
          discountAmount: 0,
        };
      });

    // Helper function to get day index
    const getDayIndex = (date) => {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      return Math.floor(
        (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    };

    // Process orders
    orders.forEach((order) => {
      const dayIndex = getDayIndex(order.createdAt);
      if (dayIndex >= 0 && dayIndex < days) {
        dailyData[dayIndex].totalSales += order.total;
        dailyData[dayIndex].transactionCount += 1;
        dailyData[dayIndex].cashSales += order.total;
        dailyData[dayIndex].vatAmount += order.taxAmount || 0;
        dailyData[dayIndex].discountAmount += order.discountAmount || 0;

        // Count one-time vs regular product sales
        try {
          const items =
            typeof order.items === 'string'
              ? JSON.parse(order.items)
              : order.items;
          let oneTimeTotal = 0;
          let regularTotal = 0;

          items.forEach((item) => {
            const itemTotal = item.price * (item.selectedItems || 1);
            if (item.oneTimeService) {
              oneTimeTotal += itemTotal;
            } else {
              regularTotal += itemTotal;
            }
          });

          dailyData[dayIndex].oneTimeProductSales += oneTimeTotal;
          dailyData[dayIndex].regularProductSales += regularTotal;
        } catch (e) {
          console.error('Error parsing order items for daily trends:', e);
        }
      }
    });

    // Process credit sales
    creditSales.forEach((sale) => {
      const dayIndex = getDayIndex(sale.createdAt);
      if (dayIndex >= 0 && dayIndex < days) {
        dailyData[dayIndex].totalSales += sale.credit_amount;
        dailyData[dayIndex].transactionCount += 1;
        dailyData[dayIndex].creditSales += sale.credit_amount;
        dailyData[dayIndex].vatAmount += sale.vat_amount || 0;
        dailyData[dayIndex].discountAmount += sale.discount_amount || 0;

        // Count one-time vs regular product sales
        try {
          const items =
            typeof sale.items === 'string'
              ? JSON.parse(sale.items)
              : sale.items;
          let oneTimeTotal = 0;
          let regularTotal = 0;

          items.forEach((item) => {
            const itemTotal = item.price * (item.selectedItems || 1);
            if (item.oneTimeService) {
              oneTimeTotal += itemTotal;
            } else {
              regularTotal += itemTotal;
            }
          });

          dailyData[dayIndex].oneTimeProductSales += oneTimeTotal;
          dailyData[dayIndex].regularProductSales += regularTotal;
        } catch (e) {
          console.error('Error parsing credit sale items for daily trends:', e);
        }
      }
    });

    return dailyData;
  }

  private calculateTotalSales(orders: any[], creditSales: any[]): number {
    const orderTotal = orders.reduce((sum, order) => sum + order.total, 0);
    const creditSaleTotal = creditSales.reduce(
      (sum, sale) => sum + sale.credit_amount,
      0,
    );
    return orderTotal + creditSaleTotal;
  }

  private calculatePaymentBreakdown(
    orders: any[],
    creditSales: any[],
  ): SalesBreakdown {
    const breakdown: SalesBreakdown = {
      cash: 0,
      mpesa: 0,
      bank: 0,
      credit: 0,
    };

    orders.forEach((order) => {
      breakdown.cash += order.cashPaid || 0;
      breakdown.mpesa += order.mpesaPaid || 0;
      breakdown.bank += order.bankPaid || 0;
    });

    creditSales.forEach((sale) => {
      breakdown.credit += sale.credit_amount || 0;
    });

    return breakdown;
  }

  private calculateVatAndDiscountBreakdown(
    orders: any[],
    creditSales: any[],
  ): VatAndDiscountBreakdown {
    const breakdown: VatAndDiscountBreakdown = {
      totalVat: 0,
      totalDiscount: 0,
      vatByCashSales: 0,
      vatByCreditSales: 0,
      discountByCashSales: 0,
      discountByCreditSales: 0,
    };

    // Process orders
    orders.forEach((order) => {
      const vatAmount = order.taxAmount || 0;
      const discountAmount = order.discountAmount || 0;

      breakdown.totalVat += vatAmount;
      breakdown.totalDiscount += discountAmount;
      breakdown.vatByCashSales += vatAmount;
      breakdown.discountByCashSales += discountAmount;
    });

    // Process credit sales
    creditSales.forEach((sale) => {
      const vatAmount = sale.vat_amount || 0;
      const discountAmount = sale.discount_amount || 0;

      breakdown.totalVat += vatAmount;
      breakdown.totalDiscount += discountAmount;
      breakdown.vatByCreditSales += vatAmount;
      breakdown.discountByCreditSales += discountAmount;
    });

    return breakdown;
  }

  private calculateOneTimeProductsAnalysis(orders: any[], creditSales: any[]) {
    const analysis = {
      totalSales: 0,
      totalCount: 0,
      byCashSales: 0,
      byCreditSales: 0,
      percentageOfTotalSales: 0,
      topOneTimeProducts: [],
      vatAmount: 0,
      discountAmount: 0,
    };

    // Helper to extract one-time products from items
    const processItems = (
      items,
      isCredit = false,
      vatTotal = 0,
      discountTotal = 0,
    ) => {
      try {
        const parsedItems =
          typeof items === 'string' ? JSON.parse(items) : items;

        if (!Array.isArray(parsedItems))
          return { total: 0, count: 0, items: [] };

        // Get total sale value to calculate proportional VAT/discount
        const saleTotal = parsedItems.reduce(
          (sum, item) => sum + (item.price || 0) * (item.selectedItems || 1),
          0,
        );

        // Extract one-time products
        const oneTimeItems = parsedItems.filter((item) => item.oneTimeService);

        if (oneTimeItems.length === 0) return { total: 0, count: 0, items: [] };

        // Calculate totals
        const oneTimeTotal = oneTimeItems.reduce((sum, item) => {
          const itemTotal = (item.price || 0) * (item.selectedItems || 1);
          return sum + itemTotal;
        }, 0);

        const oneTimeCount = oneTimeItems.reduce(
          (sum, item) => sum + (item.selectedItems || 1),
          0,
        );

        // Calculate proportional VAT and discount
        const oneTimeVat =
          saleTotal > 0 ? (oneTimeTotal / saleTotal) * vatTotal : 0;
        const oneTimeDiscount =
          saleTotal > 0 ? (oneTimeTotal / saleTotal) * discountTotal : 0;

        return {
          total: oneTimeTotal,
          count: oneTimeCount,
          items: oneTimeItems,
          vat: oneTimeVat,
          discount: oneTimeDiscount,
        };
      } catch (e) {
        console.error('Error processing one-time products:', e);
        return { total: 0, count: 0, items: [], vat: 0, discount: 0 };
      }
    };

    // Process one-time products from orders
    orders.forEach((order) => {
      const result = processItems(
        order.items,
        false,
        order.taxAmount || 0,
        order.discountAmount || 0,
      );
      analysis.totalSales += result.total;
      analysis.totalCount += result.count;
      analysis.byCashSales += result.total;
      analysis.vatAmount += result.vat;
      analysis.discountAmount += result.discount;
    });

    // Process one-time products from credit sales
    creditSales.forEach((sale) => {
      const result = processItems(
        sale.items,
        true,
        sale.vat_amount || 0,
        sale.discount_amount || 0,
      );
      analysis.totalSales += result.total;
      analysis.totalCount += result.count;
      analysis.byCreditSales += result.total;
      analysis.vatAmount += result.vat;
      analysis.discountAmount += result.discount;
    });

    // Calculate percentage of total sales
    const totalSales = this.calculateTotalSales(orders, creditSales);
    if (totalSales > 0) {
      analysis.percentageOfTotalSales =
        (analysis.totalSales / totalSales) * 100;
    }

    // Get top one-time products (combining items from both order types)
    const oneTimeProductsMap = new Map();

    // Add one-time products from orders
    orders.forEach((order) => {
      try {
        const items =
          typeof order.items === 'string'
            ? JSON.parse(order.items)
            : order.items;

        if (!Array.isArray(items)) return;

        items
          .filter((item) => item.oneTimeService)
          .forEach((item) => {
            const existing = oneTimeProductsMap.get(item.name) || {
              name: item.name,
              sales: 0,
              count: 0,
            };

            existing.sales += (item.price || 0) * (item.selectedItems || 1);
            existing.count += item.selectedItems || 1;

            oneTimeProductsMap.set(item.name, existing);
          });
      } catch (e) {
        console.error('Error extracting top one-time products from orders:', e);
      }
    });

    // Add one-time products from credit sales
    creditSales.forEach((sale) => {
      try {
        const items =
          typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;

        if (!Array.isArray(items)) return;

        items
          .filter((item) => item.oneTimeService)
          .forEach((item) => {
            const existing = oneTimeProductsMap.get(item.name) || {
              name: item.name,
              sales: 0,
              count: 0,
            };

            existing.sales += (item.price || 0) * (item.selectedItems || 1);
            existing.count += item.selectedItems || 1;

            oneTimeProductsMap.set(item.name, existing);
          });
      } catch (e) {
        console.error(
          'Error extracting top one-time products from credit sales:',
          e,
        );
      }
    });

    // Convert map to array and sort by sales amount
    analysis.topOneTimeProducts = Array.from(oneTimeProductsMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Get top 10

    return analysis;
  }
}
