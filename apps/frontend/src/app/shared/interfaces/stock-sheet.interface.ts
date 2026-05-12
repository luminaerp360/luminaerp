export interface StockSheetProductItem {
  productId: number;
  productName: string;
  productCode: string;
  category: string;
  openingStock: number;
  purchases: number;
  sales: number;
  closingStock: number;
  buyingPrice: number;
  sellingPrice: number;
  stockValue: number;
  salesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  profitMargin: number;
}

export interface StockSheetSummary {
  date: string;
  totalProducts: number;
  totalOpeningStock: number;
  totalPurchases: number;
  totalSales: number;
  totalClosingStock: number;
  totalStockValue: number;
  totalSalesRevenue: number;
  totalCostOfGoodsSold: number;
  totalGrossProfit: number;
  averageProfitMargin: number;
  items: StockSheetProductItem[];
}

export interface CurrentStockValueItem {
  productId: number;
  productName: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  stockValue: number;
  potentialRevenue: number;
  potentialProfit: number;
}

export interface CurrentStockValue {
  totalProducts: number;
  totalQuantity: number;
  totalStockValue: number;
  totalPotentialRevenue: number;
  totalPotentialProfit: number;
  items: CurrentStockValueItem[];
}
