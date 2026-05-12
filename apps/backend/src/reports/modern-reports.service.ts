import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Modern Reports Service
 * Comprehensive business intelligence reporting across all system modules
 */
@Injectable()
export class ModernReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private adjustDates(startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private metadata(start: Date, end: Date) {
    return {
      generatedAt: new Date(),
      reportPeriod: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      currency: 'KES',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. DASHBOARD OVERVIEW
  // ═══════════════════════════════════════════════════════════════

  /**
   * High-level business dashboard with KPIs from all modules
   */
  async getDashboardOverview(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [
      orders,
      creditSales,
      invoices,
      expenses,
      paymentTransactions,
      customerCount,
      productCount,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { organizationId, isVoided: false, createdAt: dateFilter },
        _sum: {
          total: true,
          taxAmount: true,
          discountAmount: true,
          cashPaid: true,
          mpesaPaid: true,
          bankPaid: true,
        },
        _count: true,
      }),
      this.prisma.creditSale.aggregate({
        where: { organizationId, createdAt: dateFilter },
        _sum: { credit_amount: true, amount_paid: true, balance: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { organizationId, createdAt: dateFilter },
        _sum: {
          totalAmount: true,
          amountPaid: true,
          balanceDue: true,
          taxAmount: true,
          discountAmount: true,
        },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { organizationId, expenseDate: dateFilter },
        _sum: { amount: true, paidAmount: true, taxAmount: true },
        _count: true,
      }),
      this.prisma.clientPayment.aggregate({
        where: { organizationId, createdAt: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.customer.count({ where: { organizationId } }),
      this.prisma.product.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prisma.product.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          isService: false,
          quantity: { lte: 5 },
        },
      }),
    ]);

    const totalRevenue =
      (orders._sum.total || 0) + (creditSales._sum.credit_amount || 0);
    const totalExpenses = expenses._sum.amount || 0;
    const invoiceRevenue = invoices._sum.totalAmount || 0;
    const invoiceCollected = invoices._sum.amountPaid || 0;
    const invoiceOutstanding = invoices._sum.balanceDue || 0;

    return {
      kpis: {
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue - totalExpenses,
        profitMargin:
          totalRevenue > 0
            ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
            : 0,
        orderCount: orders._count,
        creditSaleCount: creditSales._count,
        invoiceCount: invoices._count,
        expenseCount: expenses._count,
        averageOrderValue:
          orders._count > 0 ? (orders._sum.total || 0) / orders._count : 0,
        customerCount,
        productCount,
        lowStockProducts,
      },
      revenue: {
        orderSales: orders._sum.total || 0,
        creditSales: creditSales._sum.credit_amount || 0,
        invoiceRevenue,
        totalCollected:
          (orders._sum.cashPaid || 0) +
          (orders._sum.mpesaPaid || 0) +
          (orders._sum.bankPaid || 0) +
          (creditSales._sum.amount_paid || 0) +
          invoiceCollected,
      },
      outstanding: {
        creditSaleBalance: creditSales._sum.balance || 0,
        invoiceOutstanding,
        totalOutstanding: (creditSales._sum.balance || 0) + invoiceOutstanding,
      },
      expenses: {
        totalExpenses,
        totalPaid: expenses._sum.paidAmount || 0,
        taxOnExpenses: expenses._sum.taxAmount || 0,
      },
      tax: {
        orderTax: orders._sum.taxAmount || 0,
        invoiceTax: invoices._sum.taxAmount || 0,
        expenseTax: expenses._sum.taxAmount || 0,
        totalTaxCollected:
          (orders._sum.taxAmount || 0) + (invoices._sum.taxAmount || 0),
      },
      discounts: {
        orderDiscounts: orders._sum.discountAmount || 0,
        invoiceDiscounts: invoices._sum.discountAmount || 0,
        totalDiscounts:
          (orders._sum.discountAmount || 0) +
          (invoices._sum.discountAmount || 0),
      },
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. PAYMENTS REPORT - Unified across all payment sources
  // ═══════════════════════════════════════════════════════════════

  /**
   * Unified payments report combining order payments, invoice payments,
   * credit sale payments, and payment transactions
   */
  async getPaymentsReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [
      orderPayments,
      invoicePayments,
      creditSalePayments,
      paymentTransactions,
    ] = await Promise.all([
      // Order payments (from OrderPayment table)
      this.prisma.orderPayment.findMany({
        where: { organizationId, paymentDate: dateFilter },
        include: {
          order: {
            select: {
              id: true,
              customer_name: true,
              total: true,
              receiptNumber: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      // Invoice payments
      this.prisma.invoicePayment.findMany({
        where: { organizationId, paymentDate: dateFilter },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              customerName: true,
              totalAmount: true,
              invoiceType: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      // Credit sale payments
      this.prisma.creditSalePayment.findMany({
        where: { organizationId, paymentDate: dateFilter },
        include: {
          creditSale: {
            select: { id: true, customer_name: true, credit_amount: true },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      // General payment transactions
      this.prisma.clientPayment.findMany({
        where: { organizationId, createdAt: dateFilter },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Categorize by payment method
    const methodBreakdown = { CASH: 0, MPESA: 0, BANK_TRANSFER: 0, CREDIT: 0 };

    // Process order payments
    const orderPaymentsSummary = { count: 0, total: 0 };
    const normalizedOrderPayments = orderPayments.map((p) => {
      const method = this.normalizePaymentMethod(p.paymentMethodCode);
      methodBreakdown[method] = (methodBreakdown[method] || 0) + p.amount;
      orderPaymentsSummary.count++;
      orderPaymentsSummary.total += p.amount;
      return {
        id: p.id,
        source: 'ORDER' as const,
        sourceId: p.orderId,
        sourceRef: p.order?.receiptNumber || `Order #${p.orderId}`,
        customerName: p.order?.customer_name || 'N/A',
        amount: p.amount,
        paymentMethod: method,
        paymentMethodName: p.paymentMethodName,
        transactionCode: p.transactionCode,
        date: p.paymentDate,
        notes: p.notes,
        recordedBy: p.recordedBy,
      };
    });

    // Process invoice payments
    const invoicePaymentsSummary = {
      count: 0,
      total: 0,
      fromCreditSale: 0,
      fromStandard: 0,
    };
    const normalizedInvoicePayments = invoicePayments.map((p) => {
      const method = this.normalizePaymentMethod(
        p.paymentMethodCode || p.paymentMethod,
      );
      methodBreakdown[method] = (methodBreakdown[method] || 0) + p.amount;
      invoicePaymentsSummary.count++;
      invoicePaymentsSummary.total += p.amount;
      if (p.invoice?.invoiceType === 'CREDIT_SALE') {
        invoicePaymentsSummary.fromCreditSale += p.amount;
      } else {
        invoicePaymentsSummary.fromStandard += p.amount;
      }
      return {
        id: p.id,
        source: 'INVOICE' as const,
        sourceId: p.invoiceId,
        sourceRef: p.invoice?.invoiceNumber || `Invoice #${p.invoiceId}`,
        customerName: p.invoice?.customerName || 'N/A',
        amount: p.amount,
        paymentMethod: method,
        paymentMethodName: p.paymentMethodName || p.paymentMethod,
        transactionCode: p.transactionCode,
        date: p.paymentDate,
        notes: p.notes,
        recordedBy: p.recordedBy,
      };
    });

    // Process credit sale payments
    const creditSalePaymentsSummary = { count: 0, total: 0 };
    const normalizedCreditSalePayments = creditSalePayments.map((p) => {
      const method = p.paymentMethod;
      methodBreakdown[method] = (methodBreakdown[method] || 0) + p.amount;
      creditSalePaymentsSummary.count++;
      creditSalePaymentsSummary.total += p.amount;
      return {
        id: p.id,
        source: 'CREDIT_SALE' as const,
        sourceId: p.creditSaleId,
        sourceRef: `Credit Sale #${p.creditSaleId}`,
        customerName: p.creditSale?.customer_name || 'N/A',
        amount: p.amount,
        paymentMethod: method,
        paymentMethodName: method,
        transactionCode: p.transactionCode,
        date: p.paymentDate,
        notes: null,
        recordedBy: null,
      };
    });

    // Combine and sort all payments
    const allPayments = [
      ...normalizedOrderPayments,
      ...normalizedInvoicePayments,
      ...normalizedCreditSalePayments,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalReceived = allPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      summary: {
        totalReceived,
        paymentCount: allPayments.length,
        averagePayment:
          allPayments.length > 0 ? totalReceived / allPayments.length : 0,
      },
      bySource: {
        orders: orderPaymentsSummary,
        invoices: invoicePaymentsSummary,
        creditSales: creditSalePaymentsSummary,
      },
      byPaymentMethod: {
        cash: methodBreakdown.CASH,
        mpesa: methodBreakdown.MPESA,
        bankTransfer: methodBreakdown.BANK_TRANSFER,
        credit: methodBreakdown.CREDIT,
      },
      paymentMethodPercentage: {
        cash:
          totalReceived > 0 ? (methodBreakdown.CASH / totalReceived) * 100 : 0,
        mpesa:
          totalReceived > 0 ? (methodBreakdown.MPESA / totalReceived) * 100 : 0,
        bankTransfer:
          totalReceived > 0
            ? (methodBreakdown.BANK_TRANSFER / totalReceived) * 100
            : 0,
        credit:
          totalReceived > 0
            ? (methodBreakdown.CREDIT / totalReceived) * 100
            : 0,
      },
      payments: allPayments,
      transactionLog: paymentTransactions,
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. SALES REPORT - Orders + Credit Sales combined
  // ═══════════════════════════════════════════════════════════════

  /**
   * Comprehensive sales report covering orders and credit sales
   */
  async getSalesReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [orders, creditSales, users] = await Promise.all([
      this.prisma.order.findMany({
        where: { organizationId, isVoided: false, createdAt: dateFilter },
        include: {
          user: { select: { id: true, fullName: true } },
          salesPerson: { select: { id: true, fullName: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditSale.findMany({
        where: { organizationId, createdAt: dateFilter },
        include: { CreditSalePayment: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { organizationId },
        select: { id: true, fullName: true, email: true },
      }),
    ]);

    // Aggregate order totals
    const orderTotals = orders.reduce(
      (acc, o) => ({
        revenue: acc.revenue + o.total,
        cash: acc.cash + o.cashPaid,
        mpesa: acc.mpesa + o.mpesaPaid,
        bank: acc.bank + o.bankPaid,
        tax: acc.tax + o.taxAmount,
        discount: acc.discount + o.discountAmount,
      }),
      { revenue: 0, cash: 0, mpesa: 0, bank: 0, tax: 0, discount: 0 },
    );

    // Aggregate credit sale totals
    const creditTotals = creditSales.reduce(
      (acc, cs) => ({
        revenue: acc.revenue + cs.credit_amount,
        collected: acc.collected + (cs.amount_paid || 0),
        outstanding: acc.outstanding + (cs.balance || 0),
        cash: acc.cash + (cs.cash_paid || 0),
        mpesa: acc.mpesa + (cs.mpesa_paid || 0),
        bank: acc.bank + (cs.bank_paid || 0),
        tax: acc.tax + (cs.vat_amount || 0),
        discount: acc.discount + (cs.discount_amount || 0),
      }),
      {
        revenue: 0,
        collected: 0,
        outstanding: 0,
        cash: 0,
        mpesa: 0,
        bank: 0,
        tax: 0,
        discount: 0,
      },
    );

    // Sales by user
    const salesByUser = this.calculateSalesByUser(users, orders, creditSales);

    // Items sold breakdown
    const itemsSold = this.extractItemsSold(orders, creditSales);

    // Hourly breakdown
    const hourlyBreakdown = this.calculateHourlyDistribution(
      orders,
      creditSales,
    );

    // Daily breakdown
    const dailyBreakdown = this.calculateDailyBreakdown(
      orders,
      creditSales,
      start,
      end,
    );

    const totalRevenue = orderTotals.revenue + creditTotals.revenue;

    return {
      summary: {
        totalRevenue,
        orderRevenue: orderTotals.revenue,
        creditSaleRevenue: creditTotals.revenue,
        orderCount: orders.length,
        creditSaleCount: creditSales.length,
        totalTransactions: orders.length + creditSales.length,
        averageTransactionValue:
          orders.length + creditSales.length > 0
            ? totalRevenue / (orders.length + creditSales.length)
            : 0,
        creditSalePercentage:
          totalRevenue > 0 ? (creditTotals.revenue / totalRevenue) * 100 : 0,
      },
      paymentCollection: {
        totalCollected:
          orderTotals.cash +
          orderTotals.mpesa +
          orderTotals.bank +
          creditTotals.collected,
        totalOutstanding: creditTotals.outstanding,
        cash: orderTotals.cash + creditTotals.cash,
        mpesa: orderTotals.mpesa + creditTotals.mpesa,
        bank: orderTotals.bank + creditTotals.bank,
        credit: creditTotals.revenue,
      },
      taxAndDiscounts: {
        totalTax: orderTotals.tax + creditTotals.tax,
        totalDiscount: orderTotals.discount + creditTotals.discount,
        orderTax: orderTotals.tax,
        creditSaleTax: creditTotals.tax,
        orderDiscount: orderTotals.discount,
        creditSaleDiscount: creditTotals.discount,
      },
      salesByUser,
      itemsSold,
      hourlyBreakdown,
      dailyBreakdown,
      recentOrders: orders.slice(0, 20).map((o) => ({
        id: o.id,
        total: o.total,
        customerName: o.customer_name,
        receiptNumber: o.receiptNumber,
        cashPaid: o.cashPaid,
        mpesaPaid: o.mpesaPaid,
        bankPaid: o.bankPaid,
        salesPerson: o.salesPerson?.fullName || o.user?.fullName,
        createdAt: o.createdAt,
      })),
      recentCreditSales: creditSales.slice(0, 20).map((cs) => ({
        id: cs.id,
        creditAmount: cs.credit_amount,
        customerName: cs.customer_name,
        amountPaid: cs.amount_paid,
        balance: cs.balance,
        createdAt: cs.createdAt,
      })),
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. INVOICE REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Detailed invoice analytics and aging report
   */
  async getInvoiceReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [invoices, invoicePayments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { organizationId, createdAt: dateFilter },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
            },
          },
          items: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoicePayment.findMany({
        where: { organizationId, paymentDate: dateFilter },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    // Status breakdown
    const statusBreakdown: Record<
      string,
      {
        count: number;
        totalAmount: number;
        amountPaid: number;
        balanceDue: number;
      }
    > = {};
    invoices.forEach((inv) => {
      if (!statusBreakdown[inv.status]) {
        statusBreakdown[inv.status] = {
          count: 0,
          totalAmount: 0,
          amountPaid: 0,
          balanceDue: 0,
        };
      }
      statusBreakdown[inv.status].count++;
      statusBreakdown[inv.status].totalAmount += inv.totalAmount;
      statusBreakdown[inv.status].amountPaid += inv.amountPaid;
      statusBreakdown[inv.status].balanceDue += inv.balanceDue;
    });

    // Invoice type breakdown
    const typeBreakdown: Record<
      string,
      { count: number; totalAmount: number }
    > = {};
    invoices.forEach((inv) => {
      if (!typeBreakdown[inv.invoiceType]) {
        typeBreakdown[inv.invoiceType] = { count: 0, totalAmount: 0 };
      }
      typeBreakdown[inv.invoiceType].count++;
      typeBreakdown[inv.invoiceType].totalAmount += inv.totalAmount;
    });

    // Payment method breakdown for invoice payments
    const invoicePaymentMethods: Record<string, number> = {
      CASH: 0,
      MPESA: 0,
      BANK_TRANSFER: 0,
      CREDIT: 0,
    };
    invoicePayments.forEach((p) => {
      const method = this.normalizePaymentMethod(
        p.paymentMethodCode || p.paymentMethod,
      );
      invoicePaymentMethods[method] =
        (invoicePaymentMethods[method] || 0) + p.amount;
    });

    // Aging analysis (for unpaid invoices)
    const now = new Date();
    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
    };
    invoices
      .filter((inv) => !inv.fullyPaid && inv.status !== 'CANCELLED')
      .forEach((inv) => {
        const daysOverdue = Math.floor(
          (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysOverdue <= 0) aging.current += inv.balanceDue;
        else if (daysOverdue <= 30) aging.days1to30 += inv.balanceDue;
        else if (daysOverdue <= 60) aging.days31to60 += inv.balanceDue;
        else if (daysOverdue <= 90) aging.days61to90 += inv.balanceDue;
        else aging.over90 += inv.balanceDue;
      });

    // Top customers by invoice amount
    const customerInvoiceMap = new Map<
      number,
      {
        name: string;
        totalInvoiced: number;
        totalPaid: number;
        invoiceCount: number;
      }
    >();
    invoices.forEach((inv) => {
      const existing = customerInvoiceMap.get(inv.customerId) || {
        name: inv.customerName,
        totalInvoiced: 0,
        totalPaid: 0,
        invoiceCount: 0,
      };
      existing.totalInvoiced += inv.totalAmount;
      existing.totalPaid += inv.amountPaid;
      existing.invoiceCount++;
      customerInvoiceMap.set(inv.customerId, existing);
    });
    const topInvoiceCustomers = Array.from(customerInvoiceMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        ...data,
        balance: data.totalInvoiced - data.totalPaid,
      }))
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .slice(0, 10);

    const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const totalOutstanding = invoices.reduce((s, i) => s + i.balanceDue, 0);

    return {
      summary: {
        totalInvoices: invoices.length,
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        collectionRate:
          totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
        averageInvoiceValue:
          invoices.length > 0 ? totalInvoiced / invoices.length : 0,
        totalTax: invoices.reduce((s, i) => s + i.taxAmount, 0),
        totalDiscount: invoices.reduce((s, i) => s + i.discountAmount, 0),
        totalLateFees: invoices.reduce((s, i) => s + i.lateFeeAmount, 0),
      },
      statusBreakdown,
      typeBreakdown,
      paymentMethods: invoicePaymentMethods,
      agingAnalysis: aging,
      topCustomers: topInvoiceCustomers,
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. EXPENSE REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Detailed expense report with category and payment method breakdowns
   */
  async getExpenseReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);

    const expenses = await this.prisma.expense.findMany({
      where: { organizationId, expenseDate: { gte: start, lte: end } },
      include: {
        chartOfAccount: {
          select: {
            id: true,
            accountName: true,
            accountCode: true,
            accountType: true,
          },
        },
      },
      orderBy: { expenseDate: 'desc' },
    });

    // Category breakdown
    const categoryBreakdown: Record<
      string,
      { count: number; total: number; paid: number }
    > = {};
    expenses.forEach((exp) => {
      if (!categoryBreakdown[exp.category]) {
        categoryBreakdown[exp.category] = { count: 0, total: 0, paid: 0 };
      }
      categoryBreakdown[exp.category].count++;
      categoryBreakdown[exp.category].total += exp.amount;
      categoryBreakdown[exp.category].paid += exp.paidAmount;
    });

    // Payment method breakdown
    const methodBreakdown: Record<string, number> = {
      CASH: 0,
      MPESA: 0,
      BANK_TRANSFER: 0,
      CREDIT: 0,
    };
    expenses.forEach((exp) => {
      methodBreakdown[exp.paymentMethod] =
        (methodBreakdown[exp.paymentMethod] || 0) + exp.paidAmount;
    });

    // Status breakdown
    const statusBreakdown: Record<string, { count: number; total: number }> =
      {};
    expenses.forEach((exp) => {
      if (!statusBreakdown[exp.status]) {
        statusBreakdown[exp.status] = { count: 0, total: 0 };
      }
      statusBreakdown[exp.status].count++;
      statusBreakdown[exp.status].total += exp.amount;
    });

    // Vendor breakdown
    const vendorBreakdown: Record<string, { count: number; total: number }> =
      {};
    expenses.forEach((exp) => {
      const vendor = exp.vendor || 'Unspecified';
      if (!vendorBreakdown[vendor]) {
        vendorBreakdown[vendor] = { count: 0, total: 0 };
      }
      vendorBreakdown[vendor].count++;
      vendorBreakdown[vendor].total += exp.amount;
    });
    const topVendors = Object.entries(vendorBreakdown)
      .map(([vendor, data]) => ({ vendor, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Chart of Account breakdown
    const accountBreakdown: Record<
      string,
      { name: string; code: string; count: number; total: number }
    > = {};
    expenses.forEach((exp: any) => {
      if (exp.chartOfAccount) {
        const key = exp.chartOfAccount.id.toString();
        if (!accountBreakdown[key]) {
          accountBreakdown[key] = {
            name: exp.chartOfAccount.accountName,
            code: exp.chartOfAccount.accountCode,
            count: 0,
            total: 0,
          };
        }
        accountBreakdown[key].count++;
        accountBreakdown[key].total += exp.amount;
      }
    });

    // Daily expense trend
    const dailyExpenses = this.calculateDailyExpenses(expenses, start, end);

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const totalPaid = expenses.reduce((s, e) => s + e.paidAmount, 0);

    return {
      summary: {
        totalExpenses: expenses.length,
        totalAmount,
        totalPaid,
        totalOutstanding: totalAmount - totalPaid,
        averageExpense: expenses.length > 0 ? totalAmount / expenses.length : 0,
        totalTax: expenses.reduce((s, e) => s + (e.taxAmount || 0), 0),
      },
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([category, data]) => ({
          category,
          ...data,
          percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
      paymentMethods: methodBreakdown,
      statusBreakdown,
      topVendors,
      accountBreakdown: Object.values(accountBreakdown).sort(
        (a, b) => b.total - a.total,
      ),
      dailyTrend: dailyExpenses,
      recentExpenses: expenses.slice(0, 20).map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        paymentMethod: e.paymentMethod,
        vendor: e.vendor,
        status: e.status,
        expenseDate: e.expenseDate,
        paidBy: e.paidBy,
      })),
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. PRODUCT & INVENTORY REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Product performance, stock levels, and inventory value report
   */
  async getInventoryReport(organizationId: number) {
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId, status: 'ACTIVE' },
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      }),
    ]);

    // Stock value calculation
    let totalStockValue = 0;
    let totalCostValue = 0;
    let totalProducts = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let wellStocked = 0;

    const productDetails = products
      .filter((p) => !p.isService)
      .map((p) => {
        const qty = p.quantity || 0;
        const sellingPrice = p.price || 0;
        const costPrice = p.buyingPrice || 0;
        const stockValue = qty * sellingPrice;
        const costStockValue = qty * costPrice;
        const potentialProfit = stockValue - costStockValue;

        totalStockValue += stockValue;
        totalCostValue += costStockValue;
        totalProducts++;

        if (qty <= 0) outOfStock++;
        else if (p.reorderLevel && qty <= p.reorderLevel) lowStock++;
        else wellStocked++;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || 'Uncategorized',
          quantity: qty,
          reorderLevel: p.reorderLevel,
          sellingPrice,
          costPrice,
          stockValue,
          costStockValue,
          potentialProfit,
          profitMargin:
            sellingPrice > 0
              ? ((sellingPrice - costPrice) / sellingPrice) * 100
              : 0,
          status:
            qty <= 0
              ? 'OUT_OF_STOCK'
              : p.reorderLevel && qty <= p.reorderLevel
                ? 'LOW_STOCK'
                : 'IN_STOCK',
        };
      });

    // Per-category stock
    const categoryStock: Record<
      string,
      { count: number; totalQty: number; stockValue: number; costValue: number }
    > = {};
    productDetails.forEach((p) => {
      if (!categoryStock[p.category]) {
        categoryStock[p.category] = {
          count: 0,
          totalQty: 0,
          stockValue: 0,
          costValue: 0,
        };
      }
      categoryStock[p.category].count++;
      categoryStock[p.category].totalQty += p.quantity;
      categoryStock[p.category].stockValue += p.stockValue;
      categoryStock[p.category].costValue += p.costStockValue;
    });

    // Services summary
    const services = products.filter((p) => p.isService);

    return {
      summary: {
        totalProducts,
        totalServices: services.length,
        outOfStock,
        lowStock,
        wellStocked,
        totalStockValue,
        totalCostValue,
        potentialProfit: totalStockValue - totalCostValue,
        averageProductValue:
          totalProducts > 0 ? totalStockValue / totalProducts : 0,
      },
      stockAlerts: productDetails
        .filter((p) => p.status === 'OUT_OF_STOCK' || p.status === 'LOW_STOCK')
        .sort((a, b) => a.quantity - b.quantity),
      categoryBreakdown: Object.entries(categoryStock)
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.stockValue - a.stockValue),
      topValueProducts: [...productDetails]
        .sort((a, b) => b.stockValue - a.stockValue)
        .slice(0, 20),
      topProfitMarginProducts: [...productDetails]
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.profitMargin - a.profitMargin)
        .slice(0, 20),
      metadata: { generatedAt: new Date(), currency: 'KES' },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. CUSTOMER REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Customer analytics - purchase history, outstanding balances, top customers
   */
  async getCustomerReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [customers, orders, creditSales, invoices] = await Promise.all([
      this.prisma.customer.findMany({
        where: { organizationId },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.order.findMany({
        where: { organizationId, isVoided: false, createdAt: dateFilter },
        select: {
          customerId: true,
          customer_name: true,
          total: true,
          createdAt: true,
        },
      }),
      this.prisma.creditSale.findMany({
        where: { organizationId, createdAt: dateFilter },
        select: {
          customer_id: true,
          customer_name: true,
          credit_amount: true,
          amount_paid: true,
          balance: true,
          createdAt: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId, createdAt: dateFilter },
        select: {
          customerId: true,
          customerName: true,
          totalAmount: true,
          amountPaid: true,
          balanceDue: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Build customer analytics
    const customerMap = new Map<
      number,
      {
        id: number;
        name: string;
        phone: string;
        email: string;
        dueCredit: number;
        orderCount: number;
        orderTotal: number;
        creditSaleCount: number;
        creditSaleTotal: number;
        creditSaleBalance: number;
        invoiceCount: number;
        invoiceTotal: number;
        invoiceBalance: number;
      }
    >();

    customers.forEach((c) => {
      customerMap.set(c.id, {
        id: c.id,
        name: c.fullName,
        phone: c.phoneNumber,
        email: c.email,
        dueCredit: c.dueCredit || 0,
        orderCount: 0,
        orderTotal: 0,
        creditSaleCount: 0,
        creditSaleTotal: 0,
        creditSaleBalance: 0,
        invoiceCount: 0,
        invoiceTotal: 0,
        invoiceBalance: 0,
      });
    });

    orders.forEach((o) => {
      if (o.customerId && customerMap.has(o.customerId)) {
        customerMap.get(o.customerId)!.orderCount++;
        customerMap.get(o.customerId)!.orderTotal += o.total;
      }
    });

    creditSales.forEach((cs) => {
      if (customerMap.has(cs.customer_id)) {
        customerMap.get(cs.customer_id)!.creditSaleCount++;
        customerMap.get(cs.customer_id)!.creditSaleTotal += cs.credit_amount;
        customerMap.get(cs.customer_id)!.creditSaleBalance += cs.balance || 0;
      }
    });

    invoices.forEach((inv) => {
      if (customerMap.has(inv.customerId)) {
        customerMap.get(inv.customerId)!.invoiceCount++;
        customerMap.get(inv.customerId)!.invoiceTotal += inv.totalAmount;
        customerMap.get(inv.customerId)!.invoiceBalance += inv.balanceDue;
      }
    });

    const customerAnalytics = Array.from(customerMap.values()).map((c) => ({
      ...c,
      totalSpent: c.orderTotal + c.creditSaleTotal + c.invoiceTotal,
      totalTransactions: c.orderCount + c.creditSaleCount + c.invoiceCount,
      totalOutstanding: c.dueCredit + c.invoiceBalance,
    }));

    const topByRevenue = [...customerAnalytics]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 15);
    const topDebtors = [...customerAnalytics]
      .filter((c) => c.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 15);

    const totalOutstanding = customerAnalytics.reduce(
      (s, c) => s + c.totalOutstanding,
      0,
    );
    const activeCustomers = customerAnalytics.filter(
      (c) => c.totalTransactions > 0,
    ).length;

    return {
      summary: {
        totalCustomers: customers.length,
        activeCustomers,
        inactiveCustomers: customers.length - activeCustomers,
        totalOutstanding,
        totalRevenue: customerAnalytics.reduce((s, c) => s + c.totalSpent, 0),
        averageCustomerValue:
          activeCustomers > 0
            ? customerAnalytics.reduce((s, c) => s + c.totalSpent, 0) /
              activeCustomers
            : 0,
      },
      topByRevenue,
      topDebtors,
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. PROFIT & LOSS REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Profit & Loss statement for the period
   */
  async getProfitAndLossReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [orders, creditSales, invoices, expenses] = await Promise.all([
      this.prisma.order.aggregate({
        where: { organizationId, isVoided: false, createdAt: dateFilter },
        _sum: { total: true, taxAmount: true, discountAmount: true },
        _count: true,
      }),
      this.prisma.creditSale.aggregate({
        where: { organizationId, createdAt: dateFilter },
        _sum: { credit_amount: true, vat_amount: true, discount_amount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: {
          organizationId,
          createdAt: dateFilter,
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true, taxAmount: true, discountAmount: true },
        _count: true,
      }),
      this.prisma.expense.findMany({
        where: { organizationId, expenseDate: dateFilter },
        select: { amount: true, category: true, taxAmount: true },
      }),
    ]);

    // Revenue
    const orderRevenue = orders._sum.total || 0;
    const creditSaleRevenue = creditSales._sum.credit_amount || 0;
    const totalGrossRevenue = orderRevenue + creditSaleRevenue;

    // Tax collected
    const taxCollected =
      (orders._sum.taxAmount || 0) + (creditSales._sum.vat_amount || 0);

    // Discounts given
    const discountsGiven =
      (orders._sum.discountAmount || 0) +
      (creditSales._sum.discount_amount || 0);

    // Net revenue
    const netRevenue = totalGrossRevenue;

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    let totalExpenses = 0;
    let expenseTax = 0;
    expenses.forEach((e) => {
      expensesByCategory[e.category] =
        (expensesByCategory[e.category] || 0) + e.amount;
      totalExpenses += e.amount;
      expenseTax += e.taxAmount || 0;
    });

    const grossProfit = netRevenue - totalExpenses;
    const netProfit = grossProfit; // Simplified — can add more deductions

    return {
      revenue: {
        orderSales: orderRevenue,
        creditSales: creditSaleRevenue,
        totalGrossRevenue,
        discountsGiven,
        netRevenue,
      },
      expenses: {
        totalExpenses,
        byCategory: Object.entries(expensesByCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
      },
      profitability: {
        grossProfit,
        grossMargin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
        netProfit,
        netMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
      },
      tax: {
        taxCollected,
        taxOnExpenses: expenseTax,
        netTaxLiability: taxCollected - expenseTax,
      },
      transactionCounts: {
        orders: orders._count,
        creditSales: creditSales._count,
        invoices: invoices._count,
        expenses: expenses.length,
      },
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. USER PERFORMANCE REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sales performance by user/salesperson
   */
  async getUserPerformanceReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [users, orders, creditSales, commissions] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId },
        select: { id: true, fullName: true, email: true, role: true },
      }),
      this.prisma.order.findMany({
        where: { organizationId, isVoided: false, createdAt: dateFilter },
        select: {
          userId: true,
          salesPersonId: true,
          total: true,
          cashPaid: true,
          mpesaPaid: true,
          bankPaid: true,
          createdAt: true,
        },
      }),
      this.prisma.creditSale.findMany({
        where: { organizationId, createdAt: dateFilter },
        select: {
          created_by: true,
          credit_amount: true,
          amount_paid: true,
          balance: true,
          createdAt: true,
        },
      }),
      this.prisma.commissionRecord.findMany({
        where: { organizationId, createdAt: dateFilter },
        select: { userId: true, commissionAmount: true, status: true },
      }),
    ]);

    const userPerformance = users.map((user) => {
      const userOrders = orders.filter(
        (o) => o.userId === user.id || o.salesPersonId === user.id,
      );
      const userCreditSales = creditSales.filter(
        (cs) => cs.created_by === user.fullName,
      );
      const userCommissions = commissions.filter((c) => c.userId === user.id);

      const orderRevenue = userOrders.reduce((s, o) => s + o.total, 0);
      const creditSaleRevenue = userCreditSales.reduce(
        (s, cs) => s + cs.credit_amount,
        0,
      );
      const totalRevenue = orderRevenue + creditSaleRevenue;
      const totalCommission = userCommissions.reduce(
        (s, c) => s + c.commissionAmount,
        0,
      );

      return {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        orderCount: userOrders.length,
        creditSaleCount: userCreditSales.length,
        totalTransactions: userOrders.length + userCreditSales.length,
        orderRevenue,
        creditSaleRevenue,
        totalRevenue,
        cashCollected: userOrders.reduce((s, o) => s + o.cashPaid, 0),
        mpesaCollected: userOrders.reduce((s, o) => s + o.mpesaPaid, 0),
        bankCollected: userOrders.reduce((s, o) => s + o.bankPaid, 0),
        creditSaleCollected: userCreditSales.reduce(
          (s, cs) => s + (cs.amount_paid || 0),
          0,
        ),
        creditSaleOutstanding: userCreditSales.reduce(
          (s, cs) => s + (cs.balance || 0),
          0,
        ),
        totalCommission,
        pendingCommission: userCommissions
          .filter((c) => c.status === 'PENDING')
          .reduce((s, c) => s + c.commissionAmount, 0),
        averageOrderValue:
          userOrders.length > 0 ? orderRevenue / userOrders.length : 0,
      };
    });

    return {
      users: userPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue),
      summary: {
        totalUsers: users.length,
        activeUsers: userPerformance.filter((u) => u.totalTransactions > 0)
          .length,
        totalRevenue: userPerformance.reduce((s, u) => s + u.totalRevenue, 0),
        totalCommissions: userPerformance.reduce(
          (s, u) => s + u.totalCommission,
          0,
        ),
        topPerformer:
          userPerformance.length > 0 ? userPerformance[0]?.fullName : 'N/A',
      },
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. DAILY TREND / TIME SERIES REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Day-by-day trend of revenue, expenses, and profit
   */
  async getDailyTrendReport(
    organizationId: number,
    startDate: string,
    endDate: string,
  ) {
    const { start, end } = this.adjustDates(startDate, endDate);
    const dateFilter = { gte: start, lte: end };

    const [orders, creditSales, invoicePayments, expenses] = await Promise.all([
      this.prisma.order.findMany({
        where: { organizationId, isVoided: false, createdAt: dateFilter },
        select: {
          total: true,
          cashPaid: true,
          mpesaPaid: true,
          bankPaid: true,
          taxAmount: true,
          discountAmount: true,
          createdAt: true,
        },
      }),
      this.prisma.creditSale.findMany({
        where: { organizationId, createdAt: dateFilter },
        select: {
          credit_amount: true,
          amount_paid: true,
          vat_amount: true,
          discount_amount: true,
          createdAt: true,
        },
      }),
      this.prisma.invoicePayment.findMany({
        where: { organizationId, paymentDate: dateFilter },
        select: { amount: true, paymentDate: true },
      }),
      this.prisma.expense.findMany({
        where: { organizationId, expenseDate: dateFilter },
        select: { amount: true, expenseDate: true },
      }),
    ]);

    const days =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dailyData: Array<{
      date: string;
      orderRevenue: number;
      creditSaleRevenue: number;
      invoicePayments: number;
      totalRevenue: number;
      expenses: number;
      profit: number;
      orderCount: number;
      creditSaleCount: number;
      cashCollected: number;
      mpesaCollected: number;
      bankCollected: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dateStr = dayStart.toISOString().split('T')[0];

      const dayOrders = orders.filter(
        (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd,
      );
      const dayCreditSales = creditSales.filter(
        (cs) => cs.createdAt >= dayStart && cs.createdAt <= dayEnd,
      );
      const dayInvoicePayments = invoicePayments.filter(
        (p) => p.paymentDate >= dayStart && p.paymentDate <= dayEnd,
      );
      const dayExpenses = expenses.filter(
        (e) => e.expenseDate >= dayStart && e.expenseDate <= dayEnd,
      );

      const orderRev = dayOrders.reduce((s, o) => s + o.total, 0);
      const creditRev = dayCreditSales.reduce(
        (s, cs) => s + cs.credit_amount,
        0,
      );
      const invPayments = dayInvoicePayments.reduce((s, p) => s + p.amount, 0);
      const totalRev = orderRev + creditRev;
      const totalExp = dayExpenses.reduce((s, e) => s + e.amount, 0);

      dailyData.push({
        date: dateStr,
        orderRevenue: orderRev,
        creditSaleRevenue: creditRev,
        invoicePayments: invPayments,
        totalRevenue: totalRev,
        expenses: totalExp,
        profit: totalRev - totalExp,
        orderCount: dayOrders.length,
        creditSaleCount: dayCreditSales.length,
        cashCollected: dayOrders.reduce((s, o) => s + o.cashPaid, 0),
        mpesaCollected: dayOrders.reduce((s, o) => s + o.mpesaPaid, 0),
        bankCollected: dayOrders.reduce((s, o) => s + o.bankPaid, 0),
      });
    }

    const totals = dailyData.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.totalRevenue,
        expenses: acc.expenses + d.expenses,
        profit: acc.profit + d.profit,
        orders: acc.orders + d.orderCount,
        creditSales: acc.creditSales + d.creditSaleCount,
      }),
      { revenue: 0, expenses: 0, profit: 0, orders: 0, creditSales: 0 },
    );

    return {
      summary: {
        totalRevenue: totals.revenue,
        totalExpenses: totals.expenses,
        totalProfit: totals.profit,
        totalOrders: totals.orders,
        totalCreditSales: totals.creditSales,
        averageDailyRevenue: days > 0 ? totals.revenue / days : 0,
        averageDailyExpenses: days > 0 ? totals.expenses / days : 0,
        bestDay:
          dailyData.length > 0
            ? dailyData.reduce(
                (max, d) => (d.totalRevenue > max.totalRevenue ? d : max),
                dailyData[0],
              )
            : null,
        worstDay:
          dailyData.length > 0
            ? dailyData.reduce(
                (min, d) => (d.totalRevenue < min.totalRevenue ? d : min),
                dailyData[0],
              )
            : null,
      },
      dailyData,
      dateRange: { start, end },
      metadata: this.metadata(start, end),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private normalizePaymentMethod(method: string): string {
    const upper = (method || 'CASH').toUpperCase();
    if (upper.includes('MPESA') || upper.includes('M-PESA')) return 'MPESA';
    if (upper.includes('BANK')) return 'BANK_TRANSFER';
    if (upper.includes('CREDIT')) return 'CREDIT';
    return 'CASH';
  }

  private calculateSalesByUser(
    users: any[],
    orders: any[],
    creditSales: any[],
  ) {
    return users
      .map((user) => {
        const userOrders = orders.filter(
          (o: any) => o.userId === user.id || o.salesPersonId === user.id,
        );
        const userCreditSales = creditSales.filter(
          (cs: any) => cs.created_by === user.fullName,
        );

        const orderRevenue = userOrders.reduce(
          (s: number, o: any) => s + o.total,
          0,
        );
        const creditSaleRevenue = userCreditSales.reduce(
          (s: number, cs: any) => s + cs.credit_amount,
          0,
        );

        return {
          userId: user.id,
          fullName: user.fullName,
          orderCount: userOrders.length,
          creditSaleCount: userCreditSales.length,
          orderRevenue,
          creditSaleRevenue,
          totalRevenue: orderRevenue + creditSaleRevenue,
          cashCollected: userOrders.reduce(
            (s: number, o: any) => s + o.cashPaid,
            0,
          ),
          mpesaCollected: userOrders.reduce(
            (s: number, o: any) => s + o.mpesaPaid,
            0,
          ),
          bankCollected: userOrders.reduce(
            (s: number, o: any) => s + o.bankPaid,
            0,
          ),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  private extractItemsSold(orders: any[], creditSales: any[]) {
    const itemMap = new Map<
      number,
      { name: string; quantity: number; revenue: number; isService: boolean }
    >();

    const processItems = (items: any) => {
      let parsed: any[] = [];
      try {
        parsed = typeof items === 'string' ? JSON.parse(items) : items;
      } catch {
        return;
      }
      if (!Array.isArray(parsed)) return;

      parsed.forEach((item: any) => {
        const id = item.id || item.productId;
        if (!id) return;
        const qty = item.selectedItems || item.quantity || 1;
        const price = item.price || item.unitPrice || 0;
        const existing = itemMap.get(id) || {
          name: item.name || 'Unknown',
          quantity: 0,
          revenue: 0,
          isService: !!item.isService,
        };
        existing.quantity += qty;
        existing.revenue += qty * price;
        itemMap.set(id, existing);
      });
    };

    orders.forEach((o: any) => processItems(o.items));
    creditSales.forEach((cs: any) => processItems(cs.items));

    return Array.from(itemMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);
  }

  private calculateHourlyDistribution(orders: any[], creditSales: any[]) {
    const hourly = Array(24)
      .fill(0)
      .map((_, hour) => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        orderCount: 0,
        creditSaleCount: 0,
        revenue: 0,
      }));

    orders.forEach((o: any) => {
      const h = new Date(o.createdAt).getHours();
      hourly[h].orderCount++;
      hourly[h].revenue += o.total;
    });

    creditSales.forEach((cs: any) => {
      const h = new Date(cs.createdAt).getHours();
      hourly[h].creditSaleCount++;
      hourly[h].revenue += cs.credit_amount;
    });

    return hourly;
  }

  private calculateDailyBreakdown(
    orders: any[],
    creditSales: any[],
    start: Date,
    end: Date,
  ) {
    const days =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daily: Array<{
      date: string;
      orderRevenue: number;
      creditSaleRevenue: number;
      totalRevenue: number;
      orderCount: number;
      creditSaleCount: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dateStr = dayStart.toISOString().split('T')[0];
      const dayOrders = orders.filter(
        (o: any) =>
          new Date(o.createdAt) >= dayStart && new Date(o.createdAt) <= dayEnd,
      );
      const dayCS = creditSales.filter(
        (cs: any) =>
          new Date(cs.createdAt) >= dayStart &&
          new Date(cs.createdAt) <= dayEnd,
      );

      const orderRev = dayOrders.reduce((s: number, o: any) => s + o.total, 0);
      const csRev = dayCS.reduce(
        (s: number, cs: any) => s + cs.credit_amount,
        0,
      );

      daily.push({
        date: dateStr,
        orderRevenue: orderRev,
        creditSaleRevenue: csRev,
        totalRevenue: orderRev + csRev,
        orderCount: dayOrders.length,
        creditSaleCount: dayCS.length,
      });
    }

    return daily;
  }

  private calculateDailyExpenses(expenses: any[], start: Date, end: Date) {
    const days =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daily: Array<{ date: string; total: number; count: number }> = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dateStr = dayStart.toISOString().split('T')[0];
      const dayExpenses = expenses.filter(
        (e: any) =>
          new Date(e.expenseDate) >= dayStart &&
          new Date(e.expenseDate) <= dayEnd,
      );

      daily.push({
        date: dateStr,
        total: dayExpenses.reduce((s: number, e: any) => s + e.amount, 0),
        count: dayExpenses.length,
      });
    }

    return daily;
  }
}
